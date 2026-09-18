/* 共用：頁首、頁尾、待核實標記、追蹤事件、手機固定按鈕、搵顧問視窗 */
(function () {
  const C = window.SME_CONFIG;
  /* Logo：依橫額圖以 SVG 重繪（十字、上升折線、柱狀）。如有官方 Logo 檔，請以 <img> 取代。 */
  const LOGO = '<svg class="logo__mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M13 3h14v10h10v14H27v10H13V27H3V13h10z" fill="none" stroke="#1b3a66" stroke-width="2.6" stroke-linejoin="round"/><rect x="14" y="24" width="3.5" height="7" fill="#1a9e93"/><rect x="19" y="20" width="3.5" height="11" fill="#1a9e93"/><rect x="24" y="16" width="3.5" height="15" fill="#1a9e93"/><path d="M12 22l7-7 5 4 8-8" fill="none" stroke="#1a9e93" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 11h5v5" fill="none" stroke="#1a9e93" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="logo__text"><span class="logo__name">SME Clinic</span><span class="logo__tag">企業妙手診所</span></span>';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  /* 待核實標記：值為 null 時顯示明確標記，不編造資料 */
  function pendingOr(value, label) {
    if (value === null || value === undefined || value === "") {
      return '<span class="pending" title="此資料須由營運團隊核實後填入設定檔">［待核實：' + esc(label) + '］</span>';
    }
    return esc(value);
  }

  function track(event, props) {
    if (!C.analytics || !C.analytics.enabled) return;
    const payload = Object.assign({ event: event }, props || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    if (window.console && window.location.search.indexOf("debug=1") > -1) console.log("[track]", payload);
  }

  function renderHeader(active) {
    const el = document.querySelector("[data-component='site-header']");
    if (!el) return;
    const item = (href, key, label) =>
      '<a href="' + href + '"' + (active === key ? ' aria-current="page"' : "") + ">" + label + "</a>";
    el.className = "site-header";
    el.innerHTML =
      '<div class="container">' +
        '<a class="logo" href="index.html" aria-label="SME Clinic 企業妙手診所 首頁">' + LOGO + '</a>' +
        '<div class="header-actions">' +
          '<a class="btn btn--primary btn--sm btn--mobile-upload" href="index.html#upload" data-track="cta_upload_header">上載月結單</a>' +
          '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="開啟選單">☰</button>' +
        "</div>" +
        '<nav class="nav" id="main-nav" aria-label="主導覽">' +
          item("demo-report.html", "demo", "示範報告") +
          item("about.html", "about", "關於我們") +
          item("privacy.html#handling", "handling", "資料處理說明") +
          '<a class="btn btn--primary btn--sm" href="index.html#upload" data-track="cta_upload_nav">上載月結單</a>' +
        "</nav>" +
      "</div>";
    const toggle = el.querySelector(".nav-toggle");
    const nav = el.querySelector(".nav");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "關閉選單" : "開啟選單");
    });
  }

  function renderFooter() {
    const el = document.querySelector("[data-component='site-footer']");
    if (!el) return;
    el.className = "site-footer";
    el.innerHTML =
      '<div class="container">' +
        '<div class="footer-grid">' +
          "<div>" +
            '<a class="logo" href="index.html">' + LOGO + '</a>' +
            '<p style="margin-top:12px">營運公司：' + pendingOr(C.company.legalName, "營運公司全名") + "</p>" +
            "<p>聯絡電郵：" + pendingOr(C.company.contactEmail, "聯絡電郵") + "<br>聯絡電話：" + pendingOr(C.company.contactPhone, "聯絡電話") + "</p>" +
          "</div>" +
          "<div><strong>了解我們</strong><ul class=\"footer-links\" style=\"margin-top:8px\">" +
            '<li><a href="about.html">關於我們</a></li>' +
            '<li><a href="demo-report.html">示範報告</a></li>' +
            '<li><a href="privacy.html#handling">文件使用說明</a></li>' +
          "</ul></div>" +
          "<div><strong>條款</strong><ul class=\"footer-links\" style=\"margin-top:8px\">" +
            '<li><a href="privacy.html">私隱政策</a></li>' +
            '<li><a href="terms.html">使用條款</a></li>' +
          "</ul></div>" +
        "</div>" +
        '<div class="footer-scope">AI 摘要只供初步了解所提交戶口的現金流，不代表完整公司財務評估或任何融資審批結果。</div>' +
      "</div>";
  }

  /* 手機底部固定「上載月結單」按鈕：上載區出現或用戶閱讀同意內容時收起 */
  function initStickyCta() {
    const cta = document.querySelector(".sticky-cta");
    if (!cta) return;
    document.body.classList.add("has-sticky");
    const upload = document.getElementById("upload");
    if (!upload || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => cta.classList.toggle("is-hidden", e.isIntersecting));
    }, { threshold: 0.05 });
    io.observe(upload);
    const consent = document.getElementById("consent");
    if (consent) {
      consent.addEventListener("focus", () => cta.classList.add("is-hidden"));
    }
  }

  /* 追蹤：data-track 屬性的點擊 */
  function initTrackClicks() {
    document.addEventListener("click", e => {
      const t = e.target.closest("[data-track]");
      if (!t) return;
      track(t.getAttribute("data-track"), t.dataset.trackPlacement ? { placement: t.dataset.trackPlacement } : undefined);
    });
  }

  /* 查看公司及資料處理說明：進入視窗時記錄一次 */
  function initTrustViews() {
    const targets = document.querySelectorAll("[data-trust-view]");
    if (!targets.length || !("IntersectionObserver" in window)) return;
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !seen.has(e.target)) {
          seen.add(e.target);
          track("trust_info_view", { section: e.target.getAttribute("data-trust-view") });
        }
      });
    }, { threshold: 0.4 });
    targets.forEach(t => io.observe(t));
  }

  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add("is-open");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("is-open"), 2600);
  }

  /* 簡單視窗管理 */
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    const first = m.querySelector("textarea, input, button, [href]");
    if (first) first.focus();
    m._prev = document.activeElement;
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove("is-open");
    m.setAttribute("aria-hidden", "true");
    if (m._prev && m._prev.focus) m._prev.focus();
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelectorAll(".modal.is-open").forEach(m => closeModal(m.id));
  });
  document.addEventListener("click", e => {
    if (e.target.classList && e.target.classList.contains("modal")) closeModal(e.target.id);
    const c = e.target.closest("[data-close-modal]");
    if (c) closeModal(c.getAttribute("data-close-modal"));
  });

  /* 「搵顧問」視窗：只帶用戶確認的問題類別與查詢句，不夾附公司名稱、金額、帳號、文件或報告連結 */
  function ensureAdvisorModal() {
    if (document.getElementById("advisor-modal")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="modal" id="advisor-modal" role="dialog" aria-modal="true" aria-labelledby="advisor-modal-title" aria-hidden="true">' +
        '<div class="modal__box">' +
          '<h2 id="advisor-modal-title">向顧問查詢這項問題</h2>' +
          '<span class="modal__cat" id="advisor-modal-cat"></span>' +
          '<label for="advisor-modal-text" class="small ink2" style="display:block;margin-bottom:6px">查詢內容（可編輯）</label>' +
          '<textarea id="advisor-modal-text"></textarea>' +
          '<p class="modal__note">開啟 WhatsApp 只會帶上你確認的問題類別與查詢句。不會自動夾附公司名稱、金額、帳號、文件、交易明細或報告連結。按「搵顧問」不代表同意分享報告。</p>' +
          '<div id="advisor-modal-unconfigured" class="notice notice--warn hidden" style="margin-top:12px"><span class="notice__icon" aria-hidden="true">!</span><p>顧問 WhatsApp 號碼待營運團隊確認後才會接駁。你可以先複製訊息，稍後透過關於我們頁面的聯絡方法查詢。</p></div>' +
          '<div class="modal__foot">' +
            '<button type="button" class="btn btn--secondary" data-close-modal="advisor-modal">返回報告</button>' +
            '<button type="button" class="btn btn--secondary hidden" id="advisor-modal-copy">複製訊息</button>' +
            '<button type="button" class="btn btn--primary" id="advisor-modal-go">前往 WhatsApp</button>' +
          "</div>" +
        "</div>" +
      "</div>";
    document.body.appendChild(wrap.firstChild);

    document.getElementById("advisor-modal-go").addEventListener("click", () => {
      const text = document.getElementById("advisor-modal-text").value.trim();
      track("whatsapp_open", { placement: wrap._placement || "unknown" });
      if (!C.whatsappNumber) { toast("WhatsApp 號碼未確認，暫未能接駁。"); return; }
      const url = "https://wa.me/" + encodeURIComponent(C.whatsappNumber) + "?text=" + encodeURIComponent(text);
      window.open(url, "_blank", "noopener");
    });
    document.getElementById("advisor-modal-copy").addEventListener("click", async () => {
      const text = document.getElementById("advisor-modal-text").value;
      try { await navigator.clipboard.writeText(text); toast("已複製訊息。"); }
      catch (e) { toast("未能自動複製，請手動選取文字。"); }
    });
  }

  /* opts: { category, reportKind: 'prelim' | 'full', general: bool, placement: 'card' | 'footer' } */
  function openAdvisor(opts) {
    ensureAdvisorModal();
    const kind = opts.reportKind === "full" ? "full" : "prelim";
    let text;
    if (opts.general) {
      text = kind === "full"
        ? "你好，我睇完 SME Clinic 完整財務分析，想搵顧問了解報告內容。"
        : "你好，我睇完 SME Clinic 月結單初步分析，想搵顧問了解報告內容。";
    } else {
      text = kind === "full"
        ? "你好，我睇完 SME Clinic 完整財務分析，想就報告內『" + opts.category + "』呢項結果搵顧問了解。"
        : "你好，我睇完 SME Clinic 月結單初步分析，想就『" + opts.category + "』呢項結果搵顧問了解。";
    }
    const modal = document.getElementById("advisor-modal");
    document.getElementById("advisor-modal-title").textContent = opts.general ? "向顧問查詢" : "向顧問查詢這項問題";
    document.getElementById("advisor-modal-cat").textContent = opts.general ? "一般查詢" : "問題類別：" + opts.category;
    document.getElementById("advisor-modal-text").value = text;
    const unconfigured = !C.whatsappNumber;
    document.getElementById("advisor-modal-unconfigured").classList.toggle("hidden", !unconfigured);
    document.getElementById("advisor-modal-copy").classList.toggle("hidden", !unconfigured);
    modal.parentNode._placement = opts.placement || "card";
    track("advisor_click", { placement: opts.placement || "card", report: kind });
    openModal("advisor-modal");
  }

  /* 問題卡片：問題標題 → 報告觀察 → 需要確認的事項 → 相關交易或頁碼 → 搵顧問 */
  function questionCard(q, reportKind) {
    const ev = (q.evidence || []).map(e =>
      "<li>" +
        (e.date ? "<span>" + esc(e.date) + "</span>" : "") +
        (e.desc ? "<span>" + esc(e.desc) + "</span>" : "") +
        (e.amount ? '<span class="amt">' + esc(e.amount) + "</span>" : "") +
        (e.page ? '<span class="page">文件第 ' + esc(e.page) + " 頁</span>" : "") +
      "</li>").join("");
    return (
      '<article class="qcard" data-category="' + esc(q.category) + '">' +
        '<div class="qcard__cat">' + esc(q.kind || "留意事項") + "</div>" +
        "<h3>" + esc(q.title) + "</h3>" +
        '<div class="qcard__block"><div class="qcard__label">報告觀察</div><p>' + esc(q.observation) + "</p></div>" +
        '<div class="qcard__block"><div class="qcard__label">需要確認</div><p>' + esc(q.confirm) + "</p></div>" +
        (ev ? '<div class="qcard__block"><div class="qcard__label">相關交易或文件頁碼</div><ul class="qcard__evidence">' + ev + "</ul></div>" : "") +
        (q.impact ? '<div class="qcard__block"><div class="qcard__label">可能影響</div><p>' + esc(q.impact) + "</p></div>" : "") +
        '<div class="qcard__cta">' +
          "<p>想了解這項結果？可以搵顧問協助釐清。</p>" +
          '<button type="button" class="btn btn--primary btn--sm" data-advisor-category="' + esc(q.category) + '" data-advisor-kind="' + esc(reportKind) + '">搵顧問</button>' +
        "</div>" +
      "</article>"
    );
  }

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-advisor-category]");
    if (b) openAdvisor({ category: b.getAttribute("data-advisor-category"), reportKind: b.getAttribute("data-advisor-kind"), placement: "card" });
    const g = e.target.closest("[data-advisor-general]");
    if (g) openAdvisor({ general: true, reportKind: g.getAttribute("data-advisor-general"), placement: "footer" });
  });

  function fmtHKD(n) {
    const sign = n < 0 ? "−" : "";
    return sign + "HK$" + Math.abs(n).toLocaleString("en-HK");
  }
  function fmtSize(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  window.SME = { esc, pendingOr, track, toast, openModal, closeModal, openAdvisor, questionCard, fmtHKD, fmtSize };

  document.addEventListener("DOMContentLoaded", () => {
    renderHeader(document.body.getAttribute("data-page"));
    renderFooter();
    initStickyCta();
    initTrackClicks();
    initTrustViews();
    document.querySelectorAll("[data-fill]").forEach(el => {
      const key = el.getAttribute("data-fill");
      const label = el.getAttribute("data-label") || key;
      const value = key.split(".").reduce((o, k) => (o ? o[k] : undefined), C);
      el.innerHTML = pendingOr(value, label);
    });
    document.querySelectorAll("[data-href='official']").forEach(a => a.href = C.officialSiteUrl);
    document.querySelectorAll("[data-href='full-analysis']").forEach(a => a.href = C.fullAnalysisUrl);
    document.querySelectorAll("[data-claim]").forEach(el => {
      if (!C.claims[el.getAttribute("data-claim")]) el.remove();
    });
  });
})();
