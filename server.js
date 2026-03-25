node-v3');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDB() {
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
}

initDB().catch(console.error);

const CERT_PATH = path.join(__dirname, 'apiclient_cert.pem');
const KEY_PATH = path.join(__dirname, 'apiclient_key.pem');

function pemFromEnv(val) {
  if (val == null || String(val).trim() === '') return null;
  const normalized = String(val).replace(/\\n/g, '\n').trim();
  return Buffer.from(normalized, 'utf8');
}

let publicKey;
let privateKey;

const certFromEnv = pemFromEnv(process.env.WECHAT_CERT);
const keyFromEnv = pemFromEnv(process.env.WECHAT_KEY);

if (certFromEnv && certFromEnv.length && keyFromEnv && keyFromEnv.length) {
  publicKey = certFromEnv;
  privateKey = keyFromEnv;
  console.log('[TalentAI] 从环境变量加载证书');
} else if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
  publicKey = fs.readFileSync(CERT_PATH);
  privateKey = fs.readFileSync(KEY_PATH);
  console.log('[TalentAI] 从文件加载证书');
} else {
  console.error('[TalentAI] 缺少证书');
  process.exit(1);
}

const pay = new WxPay({
  appid: process.env.WECHAT_APPID,
  mchid: process.env.WECHAT_MCHID,
  serial_no: process.env.WECHAT_SERIAL_NO,
  publicKey,
  privateKey,
  key: process.env.WECHAT_API_V3_KEY,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
});

const app = express();
app.disable('x-powered-by');

const LISTEN_PORT = Number(process.env.PORT) || 10000;

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

  const result = await pool.query(
    'SELECT * FROM paid_users WHERE phone = $1 AND package_type = $2',
    [phone, tier]
  );

  return res.json({ ok: true, paid: result.rows.length > 0, packageType: tier });
});

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(LISTEN_PORT, () => {
  console.log(`[TalentAI] server listening on port ${LISTEN_PORT}`);
});
