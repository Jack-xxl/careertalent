/**
 * 结果页统一：导出 PDF / 生成专属链接（180 天有效）
 */
(function (global) {
  const API_BASE =
    global.TALENTAI_API_BASE ||
    (global.location && global.location.hostname &&
    (global.location.hostname === 'localhost' ||
      global.location.hostname === '127.0.0.1')
      ? global.location.origin
      : 'https://careertalent-1.onrender.com');

  let mountedConfig = null;

  function toast(msg) {
    let el = document.getElementById('report-share-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'report-share-toast';
      el.className = 'report-share-toast';
      el.hidden = true;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.hidden = true;
    }, 3200);
  }

  function collectTalentaiStorage() {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('talentai_')) out[k] = localStorage.getItem(k);
        if (k && k.startsWith('t_career_')) out[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return out;
  }

  function getCaptureElement() {
    const sel = mountedConfig?.captureSelector || '#main-content';
    const el = document.querySelector(sel);
    if (el) return el;
    return document.querySelector('.shell') || document.querySelector('.wrap') || document.body;
  }

  function captureHtmlSnapshot() {
    const el = getCaptureElement();
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.report-share-bar, .no-print').forEach((n) => n.remove());
    return clone.outerHTML;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensurePdfLibs() {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }

  async function exportPdf() {
    const el = getCaptureElement();
    if (!el) {
      toast('未找到可导出的报告内容');
      return;
    }
    toast('正在生成 PDF，请稍候…');
    try {
      await ensurePdfLibs();
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: getComputedStyle(document.body).backgroundColor || '#0d1117'
      });
      const img = canvas.toDataURL('image/jpeg', 0.92);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgW = pw - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = margin;

      pdf.addImage(img, 'JPEG', margin, position, imgW, imgH);
      heightLeft -= ph - margin * 2;

      while (heightLeft > 0) {
        position = heightLeft - imgH + margin;
        pdf.addPage();
        pdf.addImage(img, 'JPEG', margin, position, imgW, imgH);
        heightLeft -= ph - margin * 2;
      }

      const name =
        (mountedConfig?.reportTitle || 'TalentAI报告') +
        '-' +
        new Date().toISOString().slice(0, 10) +
        '.pdf';
      pdf.save(name);
      toast('PDF 已下载');
    } catch (e) {
      console.error(e);
      toast('PDF 生成失败，请稍后重试');
    }
  }

  function capturePageStyles() {
    const styleLinks = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      if (link.href) styleLinks.push(link.href);
    });
    if (mountedConfig.stylesheetUrls) {
      mountedConfig.stylesheetUrls.forEach((u) => {
        const abs = new URL(u, global.location.href).href;
        if (!styleLinks.includes(abs)) styleLinks.push(abs);
      });
    }
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent)
      .join('\n');
    return { styleLinks, inlineStyles };
  }

  async function createShareRecord() {
    const styles = capturePageStyles();
    const body = {
      reportType: mountedConfig.reportType,
      pagePath: mountedConfig.pagePath || global.location.pathname.split('/').pop(),
      pageTitle: mountedConfig.reportTitle || document.title,
      htmlSnapshot: captureHtmlSnapshot(),
      storagePayload: collectTalentaiStorage(),
      styleLinks: styles.styleLinks,
      inlineStyles: styles.inlineStyles
    };
    const r = await fetch(`${API_BASE}/api/report/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!data || !data.success) {
      throw new Error(data?.error || '创建分享链接失败');
    }
    return data;
  }

  async function generateShareLink() {
    try {
      toast('正在生成专属链接…');
      const data = await createShareRecord();
      const url = data.shareUrl;
      try {
        await navigator.clipboard.writeText(url);
        toast('链接已复制（180 天内有效）');
      } catch (e) {
        prompt('请复制以下专属链接（180 天内有效）：', url);
      }
    } catch (e) {
      console.error(e);
      toast(e.message || '生成链接失败');
    }
  }

  function injectBar() {
    if (document.getElementById('report-share-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'report-share-bar';
    bar.className = 'report-share-bar';
    bar.innerHTML = `
      <h3>保存与分享</h3>
      <div class="report-share-actions">
        <button type="button" class="report-share-btn report-share-btn--pdf" data-action="pdf">导出 PDF</button>
        <button type="button" class="report-share-btn report-share-btn--link" data-action="link">生成专属链接</button>
      </div>
      <p class="report-share-hint">专属链接有效期 180 天，打开后内容与当前报告一致。PDF 可保存或通过微信转发给好友。</p>
    `;

    const mountTarget = mountedConfig.mountTarget
      ? document.querySelector(mountedConfig.mountTarget)
      : null;
    if (mountTarget) {
      mountTarget.appendChild(bar);
    } else {
      const anchor = mountedConfig.insertBefore
        ? document.querySelector(mountedConfig.insertBefore)
        : null;
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(bar, anchor);
      } else {
        const root = getCaptureElement();
        if (root && root.parentNode) {
          root.parentNode.appendChild(bar);
        } else {
          document.body.appendChild(bar);
        }
      }
    }

    bar.querySelector('[data-action="pdf"]').addEventListener('click', exportPdf);
    bar.querySelector('[data-action="link"]').addEventListener('click', generateShareLink);
  }

  function mount(config) {
    mountedConfig = config || {};
    if (!document.getElementById('report-share-styles')) {
      const link = document.createElement('link');
      link.id = 'report-share-styles';
      link.rel = 'stylesheet';
      link.href = 'css/report-share.css';
      document.head.appendChild(link);
    }
    const run = () => injectBar();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      setTimeout(run, mountedConfig.delayMs != null ? mountedConfig.delayMs : 300);
    }
  }

  global.ReportShare = { mount, exportPdf, generateShareLink };
})(typeof window !== 'undefined' ? window : global);
