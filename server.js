require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// 其余初始化不能阻塞启动
let pool = null;
let pay = null;
let wxPrivateKeyPem = null;
let wxMchid = null;
let wxSerialNo = null;

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
    WECHAT_PRIVATE_KEY_LEN: process.env.WECHAT_PRIVATE_KEY ? process.env.WECHAT_PRIVATE_KEY.length : 0,
    WECHAT_CERT_LEN: process.env.WECHAT_CERT ? process.env.WECHAT_CERT.length : 0,
    WECHAT_KEY_LEN: process.env.WECHAT_KEY ? process.env.WECHAT_KEY.length : 0,
  });
} catch (e) {
  console.error('[INIT ERROR]', e && e.message ? e.message : String(e));
}

// 支付初始化（缺证书不允许退出进程）
try {
  // 启动时强校验（避免 TLS / AggregateError 隐性失败）
  const hasWeChatConfig =
    Boolean(String(process.env.WECHAT_APPID || '').trim()) &&
    Boolean(String(process.env.WECHAT_MCHID || '').trim()) &&
    Boolean(String(process.env.WECHAT_SERIAL_NO || '').trim()) &&
    Boolean(String(process.env.WECHAT_API_V3_KEY || '').trim()) &&
    Boolean(String(process.env.WECHAT_PRIVATE_KEY || process.env.WECHAT_KEY || '').trim());

  if (!hasWeChatConfig) {
    console.error('❌ Missing WeChat config');
    process.exit(1);
  }

  const CERT_PATH = path.join(__dirname, 'apiclient_cert.pem');
  const KEY_PATH = path.join(__dirname, 'apiclient_key.pem');

  let publicKey = null;
  let privateKey = null;

  const certFromEnv = pemFromEnv(process.env.WECHAT_CERT);
  const keyFromEnv = pemFromEnv(process.env.WECHAT_PRIVATE_KEY || process.env.WECHAT_KEY);

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
    wxPrivateKeyPem = privateKey.toString('utf8');
    wxMchid = String(process.env.WECHAT_MCHID || '').trim();
    wxSerialNo = String(process.env.WECHAT_SERIAL_NO || '').trim();

    pay = new WxPay({
      appid: process.env.WECHAT_APPID,
      mchid: process.env.WECHAT_MCHID,
      serial_no: process.env.WECHAT_SERIAL_NO,
      publicKey,
      privateKey,
      key: process.env.WECHAT_API_V3_KEY,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    console.log('[WX INIT] WxPay initialized');
  } else {
    console.warn('[WX INIT] WxPay not initialized');
  }
} catch (e) {
  console.error('[WX INIT]', e && e.message ? e.message : String(e));
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
        console.warn('[DB INIT] DATABASE_URL missing, skip DB init');
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
          order_id VARCHAR(64) PRIMARY KEY,
          phone VARCHAR(20),
          package_type VARCHAR(64) NOT NULL,
          amount INTEGER,
          status VARCHAR(32) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS paid_orders (
          order_id VARCHAR(64) PRIMARY KEY,
          session_token VARCHAR(128) NOT NULL,
          phone VARCHAR(20),
          package_type VARCHAR(64) NOT NULL,
          amount INTEGER,
          paid_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await pool.query(`ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS amount INTEGER;`);
      await pool.query(`ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'pending';`);
      await pool.query(`ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS session_token VARCHAR(128);`);
      await pool.query(`ALTER TABLE pending_orders ALTER COLUMN phone DROP NOT NULL;`);
      await pool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'pending_orders'
              AND column_name = 'package_type' AND data_type = 'integer'
          ) THEN
            ALTER TABLE pending_orders
              ALTER COLUMN package_type TYPE VARCHAR(64) USING package_type::text;
          END IF;
        END $$;
      `);
      await pool.query(`ALTER TABLE paid_orders ADD COLUMN IF NOT EXISTS session_token VARCHAR(128);`);
      await pool.query(`ALTER TABLE paid_orders ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`);
      await pool.query(`ALTER TABLE paid_orders ADD COLUMN IF NOT EXISTS package_type VARCHAR(64);`);
      await pool.query(`ALTER TABLE paid_orders ADD COLUMN IF NOT EXISTS amount INTEGER;`);
      await pool.query(`ALTER TABLE paid_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP DEFAULT NOW();`);
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'paid_users' AND column_name = 'id'
          ) THEN
            IF EXISTS (
              SELECT 1 FROM information_schema.table_constraints
              WHERE table_schema = 'public' AND table_name = 'paid_users'
                AND constraint_type = 'PRIMARY KEY'
            ) THEN
              ALTER TABLE paid_users DROP CONSTRAINT paid_users_pkey;
            END IF;
            ALTER TABLE paid_users ADD COLUMN id BIGSERIAL PRIMARY KEY;
          END IF;
        END $$;
      `);
      await pool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'paid_users'
              AND column_name = 'id'
          ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'paid_users'::regclass AND contype = 'p'
          ) THEN
            ALTER TABLE paid_users ADD PRIMARY KEY (id);
          END IF;
        END $$;
      `);
      await pool.query(`ALTER TABLE paid_users ADD COLUMN IF NOT EXISTS session_token VARCHAR(128);`);
      await pool.query(`ALTER TABLE paid_users ALTER COLUMN phone DROP NOT NULL;`);
      await pool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'paid_users'
              AND column_name = 'package_type' AND data_type = 'integer'
          ) THEN
            ALTER TABLE paid_users
              ALTER COLUMN package_type TYPE VARCHAR(64) USING package_type::text;
          END IF;
        END $$;
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS paid_users_session_uq
        ON paid_users (session_token) WHERE session_token IS NOT NULL;
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS paid_users_phone_pkg_uq
        ON paid_users (phone, package_type) WHERE phone IS NOT NULL AND phone <> '';
      `);
      console.log('[DB INIT] schema ready');
    } catch (e) {
      console.error('[DB INIT]', e && e.message ? e.message : String(e));
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

function newSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

function buildWechatV3Authorization(method, pathWithQuery, requestBody) {
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyText = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody || {});
  const message = `${method}\n${pathWithQuery}\n${timestamp}\n${nonceStr}\n${bodyText}\n`;

  const signature = crypto
    .createSign('RSA-SHA256')
    .update(message)
    .sign(wxPrivateKeyPem, 'base64');

  const token =
    `mchid="${wxMchid}",` +
    `nonce_str="${nonceStr}",` +
    `timestamp="${timestamp}",` +
    `serial_no="${wxSerialNo}",` +
    `signature="${signature}"`;

  return `WECHATPAY2-SHA256-RSA2048 ${token}`;
}

app.use(express.json({ limit: '2mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

app.post('/api/pay/create-order', async (req, res) => {
  const body = req.body || {};
  const packageType = body.packageType;
  const amountYuan = body.amount;
  const description = body.description;

  if (!pay || !wxPrivateKeyPem || !wxMchid || !wxSerialNo) {
    return res.status(503).json({ success: false, error: 'WxPay not initialized' });
  }
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not configured' });
  }
  const BASE_URL = String(process.env.BASE_URL || 'https://careertalent-1.onrender.com').replace(/\/$/, '');
  if (packageType == null || String(packageType).trim() === '') {
    return res.status(400).json({ success: false, error: 'Missing packageType' });
  }
  if (description == null || String(description).trim() === '') {
    return res.status(400).json({ success: false, error: 'Missing description' });
  }

  const totalFen = Math.round(Number(amountYuan) * 100);
  if (!Number.isFinite(totalFen) || totalFen <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid amount' });
  }

  const orderId = `PAY${Date.now()}${Math.random().toString(36).slice(2, 8)}`.toUpperCase().slice(0, 32);
  const sessionToken = newSessionToken();
  const notify_url = `${BASE_URL}/api/pay/notify`;

  console.log('[PAY CREATE REQUEST BODY]', JSON.stringify(req.body));
  console.log('[FINAL NOTIFY URL]', notify_url);

  try {
    await pool.query(
      `INSERT INTO pending_orders (order_id, phone, package_type, amount, status, session_token)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, null, String(packageType).trim(), totalFen, 'pending', sessionToken]
    );

    console.log('[PAY CREATE DB INSERT OK]', {
      orderId,
      packageType: String(packageType).trim(),
      totalFen,
    });

    console.log('[PAY CREATE WX PARAM FULL]', {
      description: String(description).trim(),
      out_trade_no: orderId,
      notify_url,
      totalFen,
    });
    console.log(
      '[PAY CREATE WX PARAM]',
      JSON.stringify({
        description: String(description).trim(),
        out_trade_no: orderId,
        notify_url,
        amount: { total: totalFen, currency: 'CNY' },
        scene_info: { payer_client_ip: getClientIp(req) },
      })
    );

    const wxRequestBody = {
      description: String(description).trim(),
      out_trade_no: orderId,
      notify_url,
      amount: { total: totalFen, currency: 'CNY' },
    };
    console.log('[WX NATIVE REQUEST BODY]', JSON.stringify(wxRequestBody));

    const wxPath = '/v3/pay/transactions/native';
    const authorization = buildWechatV3Authorization('POST', wxPath, wxRequestBody);

    const wxResp = await fetch(`https://api.mch.weixin.qq.com${wxPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(wxRequestBody),
    });

    const status = wxResp.status;
    const rawText = await wxResp.text();
    console.log('[WX NATIVE RESPONSE STATUS]', status);
    console.log('[WX NATIVE RESPONSE TEXT]', rawText);

    let parsed = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch (_) {
      parsed = null;
    }
    if (parsed) {
      console.log('[WX NATIVE RESPONSE JSON]', parsed);
    }
    console.log('[PAY CREATE WX RAW RESULT]', parsed || rawText);

    const code_url = parsed && parsed.code_url ? parsed.code_url : undefined;
    const okStatus = status >= 200 && status < 300;

    console.log('[PAY CREATE] orderId', orderId);
    console.log('[PAY CREATE] sessionToken', sessionToken);
    console.log('[PAY CREATE] notify_url', notify_url);
    console.log('[PAY CREATE] codeUrl exists:', !!(okStatus && code_url));

    if (okStatus && code_url) {
      return res.json({ success: true, orderId, sessionToken, codeUrl: code_url });
    }

    try {
      await pool.query('DELETE FROM pending_orders WHERE order_id = $1', [orderId]);
    } catch (delErr) {
      console.error('[PAY CREATE]', delErr && delErr.message ? delErr.message : String(delErr));
    }
    return res.status(500).json({
      success: false,
      error: rawText || (parsed && parsed.message) || 'create order failed',
    });
  } catch (err) {
    console.error('[PAY CREATE ERROR]', err);
    console.error('[PAY CREATE ERROR FULL]', err);
    console.error('[PAY CREATE ERROR NAME]', err && err.name);
    console.error('[PAY CREATE ERROR MESSAGE]', err && err.message);
    console.error('[PAY CREATE ERROR STRING]', String(err));
    if (err && err.errors) {
      console.error(
        '[PAY CREATE SUB ERRORS]',
        err.errors.map((e) => ({
          name: e && e.name,
          message: e && e.message,
          stack: e && e.stack,
        }))
      );
    }
    if (err && err.response) {
      console.error('[WX ERROR RESPONSE]', err.response);
    }
    if (err && err.response && err.response.data) {
      console.error('[WX ERROR RESPONSE DATA]', err.response.data);
    }
    if (err && err.stack) {
      console.error('[STACK]', err.stack);
    }
    try {
      await pool.query('DELETE FROM pending_orders WHERE order_id = $1', [orderId]);
    } catch (delErr) {
      console.error('[PAY CREATE]', delErr && delErr.message ? delErr.message : String(delErr));
    }
    return res.status(500).json({
      success: false,
      error: err && err.message ? err.message : 'create order failed',
    });
  }
});

app.get('/api/order-status', async (req, res) => {
  const orderId = String(req.query.orderId || '').trim();
  const sessionToken = String(req.query.sessionToken || '').trim();

  console.log('[ORDER STATUS] orderId', orderId);
  console.log('[ORDER STATUS] sessionToken exists:', sessionToken.length > 0);

  if (!orderId || !sessionToken) {
    console.log('[ORDER STATUS] status: not_found');
    return res.json({ success: false, status: 'not_found' });
  }

  if (!pool) {
    console.error('[ORDER STATUS] pool unavailable');
    return res.status(503).json({ success: false, status: 'not_found', error: 'Database not configured' });
  }

  try {
    const paid = await pool.query(
      'SELECT 1 FROM paid_orders WHERE order_id = $1 AND session_token = $2 LIMIT 1',
      [orderId, sessionToken]
    );
    if (paid.rows.length > 0) {
      console.log('[ORDER STATUS] status: paid');
      return res.json({ success: true, status: 'paid' });
    }

    const pend = await pool.query(
      'SELECT 1 FROM pending_orders WHERE order_id = $1 AND session_token = $2 LIMIT 1',
      [orderId, sessionToken]
    );
    if (pend.rows.length > 0) {
      console.log('[ORDER STATUS] status: pending');
      return res.json({ success: true, status: 'pending' });
    }

    console.log('[ORDER STATUS] status: not_found');
    return res.json({ success: false, status: 'not_found' });
  } catch (e) {
    console.error('[ORDER STATUS]', e && e.message ? e.message : String(e));
    return res.status(500).json({ success: false, status: 'not_found', error: e.message || String(e) });
  }
});

app.post('/api/create-order', async (req, res) => {
  const { phone, packageType } = req.body || {};
  const ph = String(phone || '').trim();
  const amount = resolvePackageAmount(packageType);
  const tier = packageToTier(packageType);

  if (!pay) {
    return res.status(503).json({ ok: false, message: 'WxPay not initialized', error: 'WxPay not initialized' });
  }
  if (!pool) {
    return res.status(503).json({ ok: false, message: 'Database not configured', error: 'Database not configured' });
  }

  if (!isValidPhone(ph)) return res.status(400).json({ ok: false, message: '手机号无效' });
  if (!amount || !tier) return res.status(400).json({ ok: false, message: '套餐类型不正确' });

  const rawStr = String(packageType).trim().toLowerCase();
  const description = (rawStr === 'pathfinder' || rawStr === '49' || tier === 49)
    ? 'TalentAI寻路者套餐·T层完整解锁'
    : 'TalentAI领航者套餐·五层完整报告';

  const out_trade_no = `TALENT${Date.now()}${ph.slice(-4)}`;
  const sessionToken = newSessionToken();

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
        `INSERT INTO pending_orders (order_id, phone, package_type, amount, status, session_token)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [out_trade_no, ph, String(tier), amount, 'pending', sessionToken]
      );
      return res.json({
        ok: true,
        qrCodeUrl: code_url,
        orderId: out_trade_no,
        sessionToken,
      });
    }

    return res.status(500).json({ ok: false, error: '创建订单失败' });
  } catch (e) {
    console.error('[PAY CREATE]', e && e.message ? e.message : String(e));
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

app.post('/api/pay/notify', async (req, res) => {
  const headers = req.headers || {};
  const apiV3Key = process.env.WECHAT_API_V3_KEY;

  try {
    if (!pay) {
      console.error('[PAY NOTIFY] WxPay not initialized');
      return res.status(503).json({ code: 'FAIL', message: 'WxPay not initialized' });
    }
    if (!pool) {
      console.error('[PAY NOTIFY] Database not configured');
      return res.status(503).json({ code: 'FAIL', message: 'Database not configured' });
    }

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

    let decrypted;
    try {
      decrypted = pay.decipher_gcm(resource.ciphertext, resource.associated_data, resource.nonce, apiV3Key);
    } catch (decErr) {
      console.error('[PAY NOTIFY] decrypt failed', decErr && decErr.message ? decErr.message : String(decErr));
      return res.status(400).json({ code: 'FAIL', message: '解密失败' });
    }

    const orderId = decrypted.out_trade_no;
    const tradeState = decrypted.trade_state;
    console.log('[PAY NOTIFY] orderId', orderId);
    console.log('[PAY NOTIFY] trade_state', tradeState);

    if (tradeState !== 'SUCCESS') {
      console.log('[PAY NOTIFY] already processed: false');
      return res.json({ code: 'SUCCESS', message: '成功' });
    }

    const pendingResult = await pool.query('SELECT * FROM pending_orders WHERE order_id = $1', [orderId]);
    const pending = pendingResult.rows[0];
    if (!pending) {
      console.warn('[PAY NOTIFY] pending_orders not found for orderId:', orderId);
      console.log('[PAY NOTIFY] already processed: false');
      return res.json({ code: 'SUCCESS', message: '成功' });
    }

    const sessionToken = pending.session_token;
    if (!sessionToken) {
      console.warn('[PAY NOTIFY] pending order missing session_token:', orderId);
      console.log('[PAY NOTIFY] already processed: false');
      return res.json({ code: 'SUCCESS', message: '成功' });
    }

    const pkg = String(pending.package_type);
    const wxAmt = Number(
      decrypted.amount?.total ?? decrypted.amount?.payer_total ?? 0
    );
    const amt = pending.amount != null ? pending.amount : Math.round(wxAmt) || 0;
    const phoneVal = pending.phone || null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insPo = await client.query(
        `INSERT INTO paid_orders (order_id, session_token, phone, package_type, amount, paid_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (order_id) DO NOTHING
         RETURNING order_id`,
        [orderId, sessionToken, phoneVal, pkg, amt]
      );
      const inserted = insPo.rows.length > 0;
      console.log('[PAY NOTIFY] already processed:', inserted ? false : true);

      if (!inserted) {
        await client.query('COMMIT');
        return res.json({ code: 'SUCCESS', message: '成功' });
      }

      const existsPu = await client.query(
        'SELECT 1 FROM paid_users WHERE session_token = $1 LIMIT 1',
        [sessionToken]
      );
      if (existsPu.rows.length === 0) {
        await client.query(
          `INSERT INTO paid_users (phone, session_token, package_type)
           VALUES ($1, $2, $3)`,
          [phoneVal, sessionToken, pkg]
        );
      }

      await client.query(
        `UPDATE pending_orders SET status = $2 WHERE order_id = $1`,
        [orderId, 'paid']
      );
      await client.query('COMMIT');
      console.log('[PAY NOTIFY] success migrated to paid_orders');
    } catch (txErr) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('[PAY NOTIFY]', rbErr && rbErr.message ? rbErr.message : String(rbErr));
      }
      console.error('[PAY NOTIFY]', txErr && txErr.message ? txErr.message : String(txErr));
      return res.status(500).json({ code: 'FAIL', message: txErr.message || String(txErr) });
    } finally {
      client.release();
    }

    return res.json({ code: 'SUCCESS', message: '成功' });
  } catch (e) {
    console.error('[PAY NOTIFY]', e && e.message ? e.message : String(e));
    return res.status(500).json({ code: 'FAIL', message: e.message || String(e) });
  }
});

app.post('/api/payment-notify', async (req, res) => {
  try {
    if (!pay) {
      console.error('[PAY NOTIFY] legacy: WxPay not initialized');
      return res.status(503).json({ code: 'FAIL', message: 'WxPay not initialized' });
    }
    if (!pool) {
      console.error('[PAY NOTIFY] legacy: Database not configured');
      return res.status(503).json({ code: 'FAIL', message: 'Database not configured' });
    }

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

    let decrypted;
    try {
      decrypted = pay.decipher_gcm(resource.ciphertext, resource.associated_data, resource.nonce, apiV3Key);
    } catch (decErr) {
      console.error('[PAY NOTIFY] legacy decrypt failed', decErr && decErr.message ? decErr.message : String(decErr));
      return res.status(400).json({ code: 'FAIL', message: '解密失败' });
    }

    if (decrypted.trade_state === 'SUCCESS') {
      const phone = decrypted.attach;
      const outNo = decrypted.out_trade_no;
      const pendingResult = await pool.query('SELECT * FROM pending_orders WHERE order_id = $1', [outNo]);
      const pending = pendingResult.rows[0];

      if (phone && pending) {
        const pkg = String(pending.package_type);
        const exists = await pool.query(
          'SELECT 1 FROM paid_users WHERE phone = $1 AND package_type = $2 LIMIT 1',
          [phone, pkg]
        );
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO paid_users (phone, package_type, session_token) VALUES ($1, $2, NULL)',
            [phone, pkg]
          );
        }
        await pool.query('DELETE FROM pending_orders WHERE order_id = $1', [outNo]);
        console.log(`用户 ${phone} 套餐 ${pkg} 付款成功`);
      }
    }

    return res.json({ code: 'SUCCESS', message: '成功' });
  } catch (e) {
    console.error('[PAY NOTIFY] legacy', e && e.message ? e.message : String(e));
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
      [phone, String(tier)]
    );
    return res.json({ ok: true, paid: result.rows.length > 0, packageType: tier });
  } catch (e) {
    console.error('[INIT ERROR]', e && e.message ? e.message : String(e));
    return res.json({ ok: true, paid: false, packageType: tier });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
