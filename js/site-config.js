/**
 * 本地开发：页面用相对路径跳转；支付等 API 走 Render（真实微信商户）
 * 线上 Render：API 与页面同域
 */
(function (g) {
  const loc = g.location || {};
  const host = loc.hostname || '';
  const RENDER_API = 'https://careertalent-1.onrender.com';

  const isFile = loc.protocol === 'file:';
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]';

  g.TALENTAI_IS_LOCAL = isFile || isLocalHost;

  const params = new URLSearchParams(loc.search || '');
  const forceLocalApi = params.get('api') === 'local';

  if (forceLocalApi && isLocalHost) {
    g.TALENTAI_API_BASE = loc.origin;
  } else if (g.TALENTAI_IS_LOCAL || isFile) {
    // file:// 或本地打开 HTML：origin 无效，必须走线上 API 才能拿到微信二维码
    g.TALENTAI_API_BASE = RENDER_API;
  } else if (host.includes('onrender.com')) {
    g.TALENTAI_API_BASE = loc.origin;
  } else {
    g.TALENTAI_API_BASE = RENDER_API;
  }

  /** 同目录 HTML 跳转，避免付完款跳到线上旧站 */
  g.talentaiGo = function (path) {
    const p = String(path || '').replace(/^\//, '');
    loc.href = p;
  };
})(typeof window !== 'undefined' ? window : global);
