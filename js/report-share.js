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
    const explicitKeys = [
      'talentai_answers',
      'talentai_timings',
      'talentai_completed_at',
      'talentai_t_scores',
      'talentai_careers',
      'talentai_careers_full',
      'talentai_t_careers_raw',
      'talentai_p_dims',
      'talentai_p_result',
      'talentai_p_energy',
      'talentai_p_completed',
      'talentai_p_paid',
      'talentai_paid',
      'talentai_premium',
      'talentai_navigator_paid',
      'talentai_wma_answers',
      'talentai_wma_scores',
      'talentai_wma_completed_at',
      'talentai_wma_timings',
      'talentai_five_layer_cache',
      'talentai_wma_prerequisite_snapshot',
      'talentai_user_nickname',
      'talentai_user_age',
      't_career_snapshot',
      't_career_top1',
      't_career_top3'
    ];
    try {
      explicitKeys.forEach((k) => {
        const v = localStorage.getItem(k);
        if (v != null) out[k] = v;
      });
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith('talentai_') || k.startsWith('t_career_')) {
          out[k] = localStorage.getItem(k);
        }
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
    clone.querySelectorAll('canvas').forEach((canvas) => {
      try {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.className = canvas.className || '';
        img.style.cssText = canvas.style.cssText;
        if (canvas.width) img.width = canvas.width;
        if (canvas.height) img.height = canvas.height;
        img.alt = canvas.getAttribute('aria-label') || '图表快照';
        canvas.parentNode.replaceChild(img, canvas);
      } catch (e) {
        /* 跨域 canvas 等场景忽略 */
      }
    });
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

  const PDF_BG = '#0b1020';

  /** 将 Chart.js 等 canvas 转为静态图，避免 PDF 中图表空白或错位 */
  function rasterizeCanvases(container) {
    if (!container) return;
    container.querySelectorAll('canvas').forEach((canvas) => {
      if (canvas.dataset.pdfRasterized === '1') return;
      try {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.className = canvas.className || '';
        const rect = canvas.getBoundingClientRect();
        if (rect.width) img.style.width = rect.width + 'px';
        if (rect.height) img.style.height = rect.height + 'px';
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        img.alt = canvas.getAttribute('aria-label') || '图表';
        img.dataset.pdfRasterized = '1';
        canvas.parentNode.replaceChild(img, canvas);
      } catch (e) {
        /* 跨域 canvas 等场景忽略 */
      }
    });
  }

  /** 导出前冻结动画、进度条宽度，避免截图为空白 */
  function prepareDomForPdf(root) {
    if (!root) return;
    root.querySelectorAll('.dim-bar-fill').forEach((el) => {
      const pct = el.getAttribute('data-pct');
      if (pct != null) el.style.width = pct + '%';
      el.style.transition = 'none';
    });
    root.querySelectorAll('.talent-card, .career-card, section, .welcome-section').forEach((el) => {
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    root.querySelectorAll('.locked-career-card .unlock-mosaic').forEach((el) => {
      el.style.opacity = '1';
    });
  }

  function patchCloneForPdf(clonedDoc, selector) {
    const clonedRoot =
      clonedDoc.querySelector(selector) ||
      clonedDoc.querySelector('#main-content') ||
      clonedDoc.body;
    if (!clonedRoot) return;

    clonedRoot.querySelectorAll('.dim-bar-fill').forEach((el) => {
      const pct = el.getAttribute('data-pct');
      if (pct != null) el.style.width = pct + '%';
      el.style.transition = 'none';
    });
    clonedRoot.querySelectorAll('*').forEach((el) => {
      el.style.animation = 'none';
      el.style.transition = 'none';
      if (el.style.opacity === '0') el.style.opacity = '1';
    });
    clonedRoot.querySelectorAll('.talent-card, .career-card').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    clonedRoot.querySelectorAll('section, .welcome-section').forEach((el) => {
      el.style.backdropFilter = 'none';
      el.style.webkitBackdropFilter = 'none';
    });
    clonedRoot.querySelectorAll('.report-share-bar, .no-print').forEach((el) => {
      el.remove();
    });
  }

  const PDF_SCALE = 2;
  const PDF_BLOCK_GAP_MM = 5;

  function isVisibleEl(el) {
    if (!el || el.offsetHeight < 4) return false;
    const st = global.getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0';
  }

  function unionRect(elements, rootRect, scale, padding) {
    const pad = padding || 6;
    const rects = elements.filter(isVisibleEl).map((el) => el.getBoundingClientRect());
    if (!rects.length) return null;
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    return {
      top: Math.max(0, Math.round((top - rootRect.top) * scale) - pad),
      left: Math.max(0, Math.round((left - rootRect.left) * scale) - pad),
      width: Math.round((right - left) * scale) + pad * 2,
      height: Math.round((bottom - top) * scale) + pad * 2
    };
  }

  function pushBlock(blocks, rootRect, scale, elements, padding) {
    const rect = unionRect(elements, rootRect, scale, padding);
    if (rect && rect.width > 0 && rect.height > 8) blocks.push(rect);
  }

  /** 按「不可分割」的内容块收集区域（相对整页截图的像素坐标） */
  function collectBlockRects(root, scale) {
    const blocks = [];
    const rootRect = root.getBoundingClientRect();
    const sections = root.querySelectorAll(':scope > section, :scope > .welcome-section');

    sections.forEach((section) => {
      if (!isVisibleEl(section)) return;

      if (section.classList.contains('top3-section')) {
        pushBlock(blocks, rootRect, scale, [
          section.querySelector('h2'),
          section.querySelector('.section-desc')
        ]);
        section.querySelectorAll('.talents-grid > *').forEach((card) => {
          pushBlock(blocks, rootRect, scale, [card]);
        });
        pushBlock(blocks, rootRect, scale, [section.querySelector('.combination-card')]);
        const conflict = section.querySelector('#conflict-warnings, .conflict-card');
        if (conflict && conflict.style.display !== 'none') {
          pushBlock(blocks, rootRect, scale, [conflict]);
        }
        return;
      }

      if (section.classList.contains('radar-section')) {
        pushBlock(blocks, rootRect, scale, [
          section.querySelector('h2'),
          section.querySelector('.section-desc'),
          section.querySelector('.radar-container')
        ]);
        pushBlock(blocks, rootRect, scale, [section.querySelector('.radar-tips')]);
        return;
      }

      if (section.classList.contains('careers-section')) {
        pushBlock(blocks, rootRect, scale, [
          section.querySelector('h2'),
          section.querySelector('.section-desc'),
          section.querySelector('.warning-box')
        ]);
        section.querySelectorAll('#career-list > *, .careers-grid > *').forEach((card) => {
          pushBlock(blocks, rootRect, scale, [card]);
        });
        section.querySelectorAll(':scope > .why-full-test, :scope > .result-disclaimer').forEach((el) => {
          pushBlock(blocks, rootRect, scale, [el]);
        });
        return;
      }

      if (section.classList.contains('t-scores-section')) {
        pushBlock(blocks, rootRect, scale, [
          section.querySelector('.wma-badge'),
          section.querySelector('h2'),
          section.querySelector('.section-desc')
        ]);
        pushBlock(blocks, rootRect, scale, [section.querySelector('#t-bars')]);
        pushBlock(blocks, rootRect, scale, [
          section.querySelector('#t-profile'),
          section.querySelector('.soft-card')
        ]);
        return;
      }

      if (section.classList.contains('talent-structure-section')) {
        pushBlock(blocks, rootRect, scale, [
          section.querySelector('h2'),
          section.querySelector('.section-desc')
        ]);
        pushBlock(blocks, rootRect, scale, [section.querySelector('#talent-bars')]);
        pushBlock(blocks, rootRect, scale, [
          section.querySelector('#talent-profile'),
          section.querySelector('.soft-card')
        ]);
        return;
      }

      // 五层报告等：含多张卡片的区块逐卡分页
      const cards = section.querySelectorAll(
        '.top3-career-card, .career-card, .soft-card, .score-card, .conflict-item'
      );
      if (cards.length >= 2) {
        pushBlock(blocks, rootRect, scale, [
          section.querySelector('h2'),
          section.querySelector('.section-desc'),
          section.querySelector('.wma-badge')
        ]);
        cards.forEach((card) => pushBlock(blocks, rootRect, scale, [card]));
        section.querySelectorAll(':scope > .insight-box, :scope > .parent-box').forEach((el) => {
          pushBlock(blocks, rootRect, scale, [el]);
        });
        return;
      }

      pushBlock(blocks, rootRect, scale, [section]);
    });

    blocks.sort((a, b) => a.top - b.top);
    return blocks;
  }

  function extractBlockCanvas(master, block) {
    const left = Math.max(0, Math.min(block.left, master.width - 1));
    const top = Math.max(0, Math.min(block.top, master.height - 1));
    const width = Math.min(block.width, master.width - left);
    const height = Math.min(block.height, master.height - top);
    if (width < 2 || height < 2) return null;

    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = PDF_BG;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(master, left, top, width, height, 0, 0, width, height);
    return out;
  }

  function isCanvasMostlyBlank(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    if (h < 8) return true;
    const stepX = Math.max(4, Math.floor(w / 60));
    const stepY = Math.max(4, Math.floor(h / 60));
    let samples = 0;
    let uniform = 0;
    let prev = null;
    for (let y = 0; y < h; y += stepY) {
      for (let x = 0; x < w; x += stepX) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        const key = d[0] + ',' + d[1] + ',' + d[2];
        if (prev === key) uniform++;
        prev = key;
        samples++;
      }
    }
    return samples > 0 && uniform / samples > 0.985;
  }

  /** 将完整内容块排版到 PDF：块内不截断，放不下则换新页；单块过高则等比缩小 */
  function layoutBlocksToPdf(pdf, blockCanvases, opts) {
    const { margin, contentW, contentH, pageH } = opts;
    let cursorY = margin;
    let hasContent = false;

    blockCanvases.forEach((canvas) => {
      if (!canvas || isCanvasMostlyBlank(canvas)) return;

      let drawW = contentW;
      let drawH = (canvas.height * drawW) / canvas.width;

      if (drawH > contentH) {
        const shrink = contentH / drawH;
        drawH = contentH;
        drawW = drawW * shrink;
      }

      if (hasContent && cursorY + drawH > pageH - margin) {
        pdf.addPage();
        cursorY = margin;
      }

      const offsetX = margin + (contentW - drawW) / 2;
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.92),
        'JPEG',
        offsetX,
        cursorY,
        drawW,
        drawH
      );
      cursorY += drawH + PDF_BLOCK_GAP_MM;
      hasContent = true;
    });

    return hasContent;
  }

  async function exportPdf() {
    const root = getCaptureElement();
    if (!root) {
      toast('未找到可导出的报告内容');
      return;
    }
    toast('正在生成 PDF，请稍候…');
    const shareBar = document.getElementById('report-share-bar');
    const prevBarDisplay = shareBar ? shareBar.style.display : '';
    const captureSelector = mountedConfig?.captureSelector || '#main-content';
    document.body.classList.add('pdf-exporting');
    if (shareBar) shareBar.style.display = 'none';

    const prevScroll = window.scrollY;
    window.scrollTo(0, 0);

    try {
      await ensurePdfLibs();
      rasterizeCanvases(root);
      prepareDomForPdf(root);
      await new Promise((r) => setTimeout(r, 350));

      const masterCanvas = await html2canvas(root, {
        scale: PDF_SCALE,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: PDF_BG,
        width: root.scrollWidth,
        height: root.scrollHeight,
        windowWidth: root.scrollWidth,
        windowHeight: root.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => patchCloneForPdf(clonedDoc, captureSelector)
      });

      if (!masterCanvas.width || !masterCanvas.height) {
        throw new Error('截图尺寸为 0');
      }

      const blockRects = collectBlockRects(root, PDF_SCALE);
      const blockCanvases = blockRects
        .map((rect) => extractBlockCanvas(masterCanvas, rect))
        .filter(Boolean);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentW = pw - margin * 2;
      const contentH = ph - margin * 2;

      const ok = layoutBlocksToPdf(pdf, blockCanvases, {
        margin,
        contentW,
        contentH,
        pageH: ph
      });

      if (!ok) {
        throw new Error('未生成有效页面');
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
    } finally {
      window.scrollTo(0, prevScroll);
      document.body.classList.remove('pdf-exporting');
      if (shareBar) shareBar.style.display = prevBarDisplay;
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
