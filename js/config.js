/* 網站設定
   所有須由營運及開發團隊核實的資料集中於此。值為 null 的欄位，頁面會顯示「待核實」標記，
   不會以估計資料代替。上線前請對照 docs/launch-checklist.md 逐項填入。 */
window.SME_CONFIG = {
  siteName: "SME Clinic",
  siteUrl: "https://www.analyst.sme-clinic-ai.com",

  /* 官方 Logo 圖檔路徑（例如 "assets/logo.png"）。為 null 時使用 js/site.js 內依 Logo 重繪的 SVG。 */
  logoImage: "assets/logo.png",

  /* 官網完整分析入口：目前使用用戶指定的官網網址。
     日後如官網提供專用上載頁，改為經確認的實際連結；不自行猜測路徑。 */
  officialSiteUrl: "https://www.sme-clinic-ai.com",
  fullAnalysisUrl: "https://www.sme-clinic-ai.com",

  /* 營運公司資料（須核實） */
  company: {
    legalName: null,        // 經確認的營運公司全名
    contactEmail: null,     // 真實聯絡電郵
    contactPhone: "9805 8577（WhatsApp）", // 用戶提供的 WhatsApp 電話
    address: null,          // 營業地址（如需顯示）
    businessHours: null     // 服務時間（如需顯示）
  },

  /* 顧問 WhatsApp 號碼，格式為國際區號加號碼、不含加號及空格（例如 852 開頭）。
     未確認前為 null；此時「搵顧問」視窗只提供複製訊息，不接駁號碼。 */
  whatsappNumber: "85298058577",

  /* 文件使用說明及私隱政策所需資料（須核實） */
  processing: {
    processors: null,       // 實際使用的外部 AI／雲端處理服務名稱及用途，陣列
    retentionOriginal: null,  // 原始文件保留期限與刪除方法
    retentionExtracted: null, // 抽取資料保留期限與刪除方法
    retentionReport: null,    // 報告保留期限與刪除方法
    advisorAccessDefault: null, // 顧問是否預設可查看本次報告（例如「預設不可查看」）
    advisorAuthorizeMethod: null // 用戶要求跟進時如何授權
  },

  /* 上載限制（由開發團隊按系統實際設定填入） */
  upload: {
    maxSizeMB: 20,
    acceptedTypes: ["application/pdf"]
  },

  /* 功能標籤：只有在產品確實支援並實測後才設為 true */
  claims: {
    free: false,
    noSignup: false
  },

  /* 追蹤事件：只送事件名稱及安全的位置參數，不含檔名、帳號、交易或金額 */
  analytics: {
    enabled: true
  }
};
