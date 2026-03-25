require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const WxPay = require('wechatpay-node-v3');
const { Pool } = require('pg');

// 先保证服务启动监听端口（Render 需要探测 open port）
const app = express();
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;
console.log('ENV PORT =', process.env.PORT);
console.log('Using PORT =', PORT);

app.get('/', (req, res) => {
  res.send('TalentAI server is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// 其余初始化不能阻塞启动
let pool = null;
let pay = null;

function pemFromEnv(val) {
  if (val == null || String(val).trim() === '') return null;
  const normalized = String(val).replace(/\\n/g, '\n').trim();
  return Buffer.from(normalized, 'utf8');
}

// 微信配置调试（不打印敏感内容）
try {
  console.log('[WX CHECK]', {
    WECHAT_APPID: !!process.env.WECHAT_APPID,
    WECHAT_MCHID: !!process.env.WECHAT_MCHID,
    WECHAT_SERIAL_NO: !!process.env.WECHAT_SERIAL_NO,
    WECHAT_API_V3_KEY: !!process.env.WECHAT_API_V3_KEY,
    WECHAT_CERT_LEN: process.env.WECHAT_CERT ? process.env.WECHAT_CERT.length : 0,
    WECHAT_KEY_LEN: process.env.WECHAT_KEY ? process.env.WECHAT_KEY.length : 0,
  });
} catch (e) {
  console.error('[INIT ERROR]', e && e.message ? e.message : String(e));
}

// 支付初始化（缺证书不允许退出进程）
try {
  const CERT_PATH = path.join(__dirname, 'apiclient_cert.pem');
  const KEY_PATH = path.join(__dirname, 'apiclient_key.pem');

  let publicKey = null;
  let privateKey = null;

  const certFromEnv = pemFromEnv(process.env.WECHAT_CERT);
  const keyFromEnv = pemFromEnv(process.env.WECHAT_KEY);

  if (certFromEnv && keyFromEnv) {
    publicKey = certFromEnv;
    privateKey = keyFromEnv;
    console.log('[TalentAI] 从环境变量加载证书');
  } else if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    publicKey = fs.readFileSync(CERT_PATH);
    privateKey = fs.readFileSync(KEY_PATH);
    console.log('[TalentAI] 从文件加载证书');
  } else {
    console.warn('[WARN] WeChat cert missing, skip payment init');
  }

  if (publicKey && privateKey) {
    pay = new WxPay({
      appid: process.env.WECHAT_APPID,
      mchid: process.env.WECHAT_MCHID,
      serial_no: process.env.WECHAT_SERIAL_NO,
      publicKey,
      privateKey,
      key: process.env.WECHAT_API_V3_KEY,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
  }
} catch (e) {
  console.error('[INIT ERROR]', e && e.message ? e.message : String(e));
}

// 数据库初始化（无 DATABASE_URL 不允许阻塞启动）
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  });

  (async () => {
    try {
      if (!process.env.DATABASE_URL) {
        console.warn('[WARN] DATABASE_URL missing, skip DB init');
        return;
      }
      await pool.query(`
        CREATE TABLE IF NOT EXISTS paid_users (
          phone VARCHAR(20) NOT NULL,
          package_type INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (phone, package_type)
        );
        CREATE TABLE IF NOT EXISTS pending_orders (
          order_id VARCHAR(50) PRIMARY KEY,
          phone VARCHAR(20) NOT NULL,
          package_type INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('[TalentAI] 数据库初始化完成');
    } catch (e) {
      console.error('[INIT ERROR]', e && e.message ? e.message : String(e));
    }
  })();
} catch (e) {
  console.error('[INIT ERROR]', e && e.message ? e.message : String(e));
}

const LISTEN_PORT = PORT;

function isWechatNotifyProduction() {
  return Boolean(String(process.env.RENDER_EXTERNAL_URL || '').trim());
}

function getBaseUrl() {
  const base = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || `http://localhost:${LISTEN_PORT}`;
  return String(base).replace(/\/$/, '');
}

const PACKAGE_MAP = {
  pathfinder: 4900, navigator: 15000,
  '49': 4900, 49: 4900, '150': 15000, 150: 15000,
};

function packageToTier(packageType) {
  if (packageType === 49 || packageType === '49') return 49;
  if (packageType === 150 || packageType === '150') return 150;
  const k = String(packageType ?? '').trim().toLowerCase();
  if (k === 'pathfinder') return 49;
  if (k === 'navigator') return 150;
  return null;
}

function resolvePackageAmount(packageType) {
  const raw = String(packageType ?? '').trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (PACKAGE_MAP[lower] != null) return PACKAGE_MAP[lower];
  if (PACKAGE_MAP[raw] != null) return PACKAGE_MAP[raw];
  const n = Number(raw);
  if (!Number.isNaN(n) && PACKAGE_MAP[n] != null) return PACKAGE_MAP[n];
  return undefined;
}

function pickNativeResult(result) {
  const data = result && result.data ? result.data : result;
  const code_url = data?.code_url || result?.code_url;
  const status = result?.status ?? data?.status;
  return { code_url, status };
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || '').trim());
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  return req.ip || '';
}

app.use(express.json({ limit: '2mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

app.post('/api/create-order', async (req, res) => {
  const { phone, packageType } = req.body || {};
  const ph = String(phone || '').trim();
  const amount = resolvePackageAmount(packageType);
  const tier = packageToTier(packageType);

  if (!isValidPhone(ph)) return res.status(400).json({ ok: false, message: '手机号无效' });
  if (!amount || !tier) return res.status(400).json({ ok: false, message: '套餐类型不正确' });

  const rawStr = String(packageType).trim().toLowerCase();
  const description = (rawStr === 'pathfinder' || rawStr === '49' || tier === 49)
    ? 'TalentAI寻路者套餐·T层完整解锁'
    : 'TalentAI领航者套餐·五层完整报告';

  const out_trade_no = `TALENT${Date.now()}${ph.slice(-4)}`;

  try {
    const result = await pay.transactions_native({
      description,
      out_trade_no,
      notify_url: `${getBaseUrl()}/api/payment-notify`,
      amount: { total: amount, currency: 'CNY' },
      attach: ph,
      scene_info: { payer_client_ip: getClientIp(req) },
    });

    const { code_url, status } = pickNativeResult(result);
    const okStatus = status === 200 || status === undefined;

    if (okStatus && code_url) {
      await pool.query(
        'INSERT INTO pending_orders (order_id, phone, package_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [out_trade_no, ph, tier]
      );
      return res.json({ ok: true, qrCodeUrl: code_url, orderId: out_trade_no });
    }

    return res.status(500).json({ ok: false, error: '创建订单失败' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

app.post('/api/payment-notify', async (req, res) => {
  try {
    const headers = req.headers || {};
    const apiV3Key = process.env.WECHAT_API_V3_KEY;

    if (isWechatNotifyProduction()) {
      const verified = await pay.verifySign({
        apiSecret: apiV3Key,
        body: req.body,
        signature: headers['wechatpay-signature'],
        serial: headers['wechatpay-serial'],
        nonce: headers['wechatpay-nonce'],
        timestamp: headers['wechatpay-timestamp'],
      });
      if (!verified) return res.status(401).json({ code: 'FAIL', message: '验签失败' });
    }

    const resource = req.body?.resource;
    if (!resource) return res.status(400).json({ code: 'FAIL', message: '无 resource' });

    const decrypted = pay.decipher_gcm(resource.ciphertext, resource.associated_data, resource.nonce, apiV3Key);

    if (decrypted.trade_state === 'SUCCESS') {
      const phone = decrypted.attach;
      const outNo = decrypted.out_trade_no;
      const pendingResult = await pool.query('SELECT * FROM pending_orders WHERE order_id = $1', [outNo]);
      const pending = pendingResult.rows[0];

      if (phone && pending) {
        await pool.query(
          'INSERT INTO paid_users (phone, package_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [phone, pending.package_type]
        );
        await pool.query('DELETE FROM pending_orders WHERE order_id = $1', [outNo]);
        console.log(`用户 ${phone} 套餐 ${pending.package_type} 付款成功`);
      }
    }

    return res.json({ code: 'SUCCESS', message: '成功' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 'FAIL', message: e.message || String(e) });
  }
});

app.get('/api/payment-config', (req, res) => {
  res.json({ ok: true, wechatNotifyEnabled: isWechatNotifyProduction(), baseUrl: getBaseUrl() });
});

app.get('/api/check-payment', async (req, res) => {
  const phone = String(req.query.phone || '').trim();
  const tier = packageToTier(req.query.packageType);

  if (!isValidPhone(phone)) return res.status(400).json({ ok: false, message: 'Invalid phone' });

  try {
    if (!pool) return res.json({ ok: true, paid: false, packageType: tier });
    const result = await pool.query(
      'SELECT * FROM paid_users WHERE phone = $1 AND package_type = $2',
      [phone, tier]
    );
    return res.json({ ok: true, paid: result.rows.length > 0, packageType: tier });
  } catch (e) {
    console.error('[INIT ERROR]', e && e.message ? e.message : String(e));
    return res.json({ ok: true, paid: false, packageType: tier });
  }
});

app.use(express.static(__dirname));
