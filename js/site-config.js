/**
 * 本地开发：页面用相对路径跳转，API 走当前 origin（如 localhost:3000）
 * 线上：API 默认 Render
 */
(function (g) {
  const loc = g.location || {};
  const host = loc.hostname || '';
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    loc.protocol === 'file:';

  g.TALENTAI_IS_LOCAL = isLocal;

  g.TALENTAI_API_BASE = isLocal
    ? loc.origin
    : 'https://careertalent-1.onrender.com';

  /** 同目录 HTML 跳转，避免付完款跳到线上旧站 */
  g.talentaiGo = function (path) {
    const p = String(path || '').replace(/^\//, '');
    loc.href = p;
  };
})(typeof window !== 'undefined' ? window : global);
