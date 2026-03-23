require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const WxPay = require('wechatpay-node-v3');

const CERT_PATH = path.join(__dirname, 'apiclient_cert.pem');
const KEY_PATH = path.join(__dirname, 'apiclient_key.pem');

if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) {
  console.error(
    '[TalentAI] 缺少证书：请将 apiclient_cert.pem 与 apiclient_key.pem 放在项目根目录（与 server.js 同级）。'
  );
  process.exit(1);
}

const pay = new WxPay({
  appid: process.env.WECHAT_APPID,
  mchid: process.env.WECHAT_MCHID,
  serial_no: process.env.WECHAT_SERIAL_NO,
  publicKey: fs.readFileSync(CERT_PATH),
  privateKey: fs.readFileSync(KEY_PATH),
  key: process.env.WECHAT_API_V3_KEY,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});

const app = express();
app.disable('x-powered-by');

/** 与 listen 端口一致，供 notify_url 本地回退使用 */
const LISTEN_PORT = Number(process.env.PORT) || 10000;

/** Render 部署时会自动注入；本地未设置则走 BASE_URL 或 localhost */
function isWechatNotifyProduction() {
  return Boolean(String(process.env.RENDER_EXTERNAL_URL || '').trim());
}

function getBaseUrl() {
  const base =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.BASE_URL ||
    `http://localhost:${LISTEN_PORT}`;
  return String(base).replace(/\/$/, '');
}

// 内存：手机号 -> { 49?: true, 150?: true }（服务重启会丢失，生产可再接入 Redis/DB）
const paidUsers = new Map();
// 待支付：商户订单号 -> { phone, packageType }
const pendingOrders = new Map();

app.use(
  express.json({
    limit: '2mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || '').trim());
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip || '';
}

/** 套餐：名称或金额代号 -> 支付金额（分） */
const PACKAGE_MAP = {
  pathfinder: 4900, // ¥49 寻路者
  navigator: 15000, // ¥150 领航者
  '49': 4900,
  49: 4900,
  '150': 15000,
  150: 15000,
};

/** 归一化为付费档位 49 | 150（用于 pending / check-payment） */
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

/** 兼容 wechatpay-node-v3 不同版本返回结构 */
function pickNativeResult(result) {
  const data = result && result.data ? result.data : result;
  const code_url = data?.code_url || result?.code_url;
  const status = result?.status ?? data?.status;
  return { code_url, status, raw: result };
}

app.post('/api/create-order', async (req, res) => {
  const { phone, packageType } = req.body || {};
  const ph = String(phone || '').trim();
  const pkgRaw = packageType;
  const amount = resolvePackageAmount(pkgRaw);

  if (!isValidPhone(ph)) {
    return res.status(400).json({ ok: false, message: '手机号无效' });
  }
  if (!amount) {
    return res.status(400).json({
      ok: false,
      error: '套餐类型不正确',
      message: '套餐类型不正确',
    });
  }

  const tier = packageToTier(pkgRaw);
  if (!tier) {
    return res.status(400).json({
      ok: false,
      error: '套餐类型不正确',
      message: '套餐类型不正确',
    });
  }

  const rawStr = String(pkgRaw).trim();
  const rawLower = rawStr.toLowerCase();
  const description =
    rawLower === 'pathfinder' || rawStr === '49' || pkgRaw === 49 || tier === 49
      ? 'TalentAI寻路者套餐·T层完整解锁'
      : 'TalentAI领航者套餐·五层完整报告';

  const base = getBaseUrl();

  const out_trade_no = `TALENT${Date.now()}${ph.slice(-4)}`;

  try {
    const result = await pay.transactions_native({
      description,
      out_trade_no,
      notify_url: `${base}/api/payment-notify`,
      amount: {
        total: amount,
        currency: 'CNY',
      },
      attach: ph,
      scene_info: {
        payer_client_ip: getClientIp(req),
      },
    });

    const { code_url, status } = pickNativeResult(result);
    const okStatus = status === 200 || status === undefined;

    if (okStatus && code_url) {
      pendingOrders.set(out_trade_no, { phone: ph, packageType: tier });
      return res.json({
        ok: true,
        qrCodeUrl: code_url,
        orderId: out_trade_no,
      });
    }

    console.error('create-order unexpected result:', result);
    return res.status(500).json({ ok: false, error: '创建订单失败', detail: result });
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

      if (!verified) {
        return res.status(401).json({ code: 'FAIL', message: '验签失败' });
      }
    } else {
      console.warn(
        '[TalentAI] 本地/非 Render 环境：跳过微信支付回调验签（微信通常无法访问 localhost）'
      );
    }

    const resource = req.body?.resource;
    if (!resource) {
      return res.status(400).json({ code: 'FAIL', message: '无 resource' });
    }

    const decrypted = pay.decipher_gcm(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce,
      apiV3Key
    );

    if (decrypted.trade_state === 'SUCCESS') {
      const phone = decrypted.attach;
      const outNo = decrypted.out_trade_no;
      const pending = outNo ? pendingOrders.get(outNo) : null;

      if (phone && pending && pending.phone === phone) {
        if (!paidUsers.has(phone)) paidUsers.set(phone, {});
        paidUsers.get(phone)[pending.packageType] = true;
        pendingOrders.delete(outNo);
        console.log(`用户 ${phone} 套餐 ${pending.packageType} 付款成功`);
      } else if (phone) {
        // 兜底：只有 attach，没有 pending（极少见）
        if (!paidUsers.has(phone)) paidUsers.set(phone, {});
        paidUsers.get(phone)._any = true;
        console.log(`用户 ${phone} 付款成功（未匹配 pending 订单，已标记 _any）`);
      }
    }

    return res.json({ code: 'SUCCESS', message: '成功' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 'FAIL', message: e.message || String(e) });
  }
});

/**
 * 前端用于区分：是否启用微信异步通知（Render 上 RENDER_EXTERNAL_URL 有值）
 */
app.get('/api/payment-config', (req, res) => {
  const production = isWechatNotifyProduction();
  res.json({
    ok: true,
    wechatNotifyEnabled: production,
    baseUrl: getBaseUrl(),
  });
});

/**
 * 仅本地开发：微信无法回调 localhost，用户扫码付款后点「我已付款」时，
 * 先调用此接口写入内存态，再用 /api/check-payment 校验。
 * 生产环境（RENDER_EXTERNAL_URL 已设置）下禁用。
 */
app.post('/api/local-mark-paid', (req, res) => {
  if (isWechatNotifyProduction()) {
    return res.status(403).json({ ok: false, message: '生产环境请依赖微信回调，勿使用本地模拟接口' });
  }
  const { phone, packageType } = req.body || {};
  const ph = String(phone || '').trim();
  const tier = packageToTier(packageType);

  if (!isValidPhone(ph) || !tier) {
    return res.status(400).json({ ok: false, message: '手机号或套餐无效' });
  }

  if (!paidUsers.has(ph)) paidUsers.set(ph, {});
  paidUsers.get(ph)[tier] = true;

  for (const [oid, o] of pendingOrders.entries()) {
    if (o.phone === ph && o.packageType === tier) pendingOrders.delete(oid);
  }

  console.log(`[TalentAI] 本地模拟：用户 ${ph} 套餐 ${tier} 已标记为已付款`);
  return res.json({ ok: true });
});

app.get('/api/check-payment', (req, res) => {
  const phone = String(req.query.phone || '').trim();
  const qPkg = req.query.packageType;
  const tier = packageToTier(qPkg);

  if (!isValidPhone(phone)) {
    return res.status(400).json({ ok: false, message: 'Invalid phone' });
  }

  const row = paidUsers.get(phone) || {};

  if (!tier) {
    const paid = Object.keys(row).some((k) => row[k] === true);
    return res.json({ ok: true, paid, packageType: null });
  }

  const paid = row[tier] === true || row._any === true;
  return res.json({ ok: true, paid, packageType: tier });
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(LISTEN_PORT, () => {
  console.log(`[TalentAI] server listening on port ${LISTEN_PORT}`);
  console.log(`[TalentAI] 支付 notify_url 基址: ${getBaseUrl()}`);
  if (!isWechatNotifyProduction()) {
    console.log(
      '[TalentAI] 当前为本地模式：微信无法回调 localhost，请用页面「我已完成支付」+ /api/check-payment 联调'
    );
  }
});
