/**
 * 专属链接查看：从服务端恢复完整 localStorage 快照，在原结果页重新渲染（含 Chart.js 雷达图）
 */
(function (global) {
  const API_BASE =
    global.TALENTAI_API_BASE ||
    (global.location && global.location.hostname &&
    (global.location.hostname === 'localhost' ||
      global.location.hostname === '127.0.0.1')
      ? global.location.origin
      : 'https://careertalent-1.onrender.com');

  let sharePayload = null;
  let shareMeta = null;
  let bootstrapPromise = null;
  let storagePatched = false;
  const memoryStore = {};

  function getShareIdFromUrl() {
    const p = new URLSearchParams(global.location.search);
    return p.get('share') || p.get('shareId') || null;
  }

  function patchStorageForShareMode() {
    if (storagePatched) return;
    storagePatched = true;

    const origGet = Storage.prototype.getItem;
    const origSet = Storage.prototype.setItem;
    const origRemove = Storage.prototype.removeItem;

    Storage.prototype.getItem = function (key) {
      if (global.__TALENTAI_SHARE_MODE__ && sharePayload && Object.prototype.hasOwnProperty.call(sharePayload, key)) {
        return sharePayload[key];
      }
      if (global.__TALENTAI_SHARE_MODE__ && Object.prototype.hasOwnProperty.call(memoryStore, key)) {
        return memoryStore[key];
      }
      return origGet.call(this, key);
    };

    Storage.prototype.setItem = function (key, value) {
      if (global.__TALENTAI_SHARE_MODE__) {
        memoryStore[key] = String(value);
        return;
      }
      return origSet.call(this, key, value);
    };

    Storage.prototype.removeItem = function (key) {
      if (global.__TALENTAI_SHARE_MODE__) {
        delete memoryStore[key];
        return;
      }
      return origRemove.call(this, key);
    };
  }

  function renderShareBanner() {
    if (document.getElementById('talentai-share-view-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'talentai-share-view-banner';
    banner.style.cssText =
      'position:sticky;top:0;z-index:9999;text-align:center;padding:10px 16px;font-size:12px;color:#6ee7b7;' +
      'background:rgba(6,78,59,0.92);border-bottom:1px solid rgba(52,211,153,0.35);backdrop-filter:blur(6px);';
    const exp =
      shareMeta && shareMeta.expiresAt
        ? ' · 有效期至 ' + new Date(shareMeta.expiresAt).toLocaleDateString('zh-CN')
        : '';
    banner.textContent = '专属报告链接 · 数据与生成时一致' + exp;
    document.body.prepend(banner);
  }

  function hideShareOnlyChrome() {
    const paywall = document.getElementById('navigatorPaywallWrap');
    if (paywall) paywall.style.display = 'none';
    const tPaywall = document.getElementById('paywall');
    if (tPaywall) tPaywall.style.display = 'none';
  }

  async function bootstrap() {
    if (bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = (async () => {
      const shareId = getShareIdFromUrl();
      if (!shareId) return false;

      global.__TALENTAI_SHARE_MODE__ = true;
      patchStorageForShareMode();

      try {
        const r = await fetch(`${API_BASE}/api/report/share/${encodeURIComponent(shareId)}`);
        const data = await r.json();
        if (!data.success) {
          throw new Error(data.error || '专属链接无效或已过期');
        }

        sharePayload = data.storagePayload || {};
        shareMeta = {
          shareId,
          reportType: data.reportType,
          pagePath: data.pagePath,
          pageTitle: data.pageTitle,
          expiresAt: data.expiresAt
        };
        global.__TALENTAI_SHARE_META__ = shareMeta;

        renderShareBanner();
        hideShareOnlyChrome();
        return true;
      } catch (e) {
        console.error('[ReportShareRestore]', e);
        global.__TALENTAI_SHARE_ERROR__ = e.message || String(e);
        return false;
      }
    })();

    return bootstrapPromise;
  }

  function isShareMode() {
    return !!global.__TALENTAI_SHARE_MODE__;
  }

  function getSharePayload() {
    return sharePayload;
  }

  global.ReportShareRestore = {
    bootstrap,
    isShareMode,
    getShareIdFromUrl,
    getSharePayload
  };
})(typeof window !== 'undefined' ? window : global);
