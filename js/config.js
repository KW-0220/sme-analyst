/* 網站設定
   所有須由營運及開發團隊核實的資料集中於此。值為 null 的欄位，頁面會顯示「待核實」標記，
   不會以估計資料代替。上線前請對照 docs/launch-checklist.md 逐項填入。 */
window.SME_CONFIG = {
  siteName: "SME Clinic",
  siteUrl: "https://analyst.sme-clinic-ai.com",

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
    /* 以下三項按現行實作填寫；如日後加入資料庫或改變流程，須同步更新 */
    processors: [
      "Google Gemini API：讀取月結單影像及文字，抽取交易資料",
      "Vercel：網站及分析函數的主機，文件只在處理請求期間存在於記憶體"
    ],
    retentionOriginal: "只在分析請求期間存在於伺服器記憶體，分析完成即不保留；瀏覽器內的暫存副本在分析完成或按「刪除」後清除",
    retentionExtracted: "伺服器不儲存抽取資料；Google 按其 Gemini API 服務條款處理請求內容",
    retentionReport: "只保存在你的瀏覽器本次工作階段，關閉分頁或按「刪除本次文件及分析資料」即清除；伺服器不保留報告，亦沒有備份",
    advisorAccessDefault: null, // 顧問是否預設可查看本次報告（例如「預設不可查看」）
    advisorAuthorizeMethod: null // 用戶要求跟進時如何授權
  },

  /* 上載限制（由開發團隊按系統實際設定填入） */
  upload: {
    maxSizeMB: 4, // Vercel 函數請求上限為 4.5 MB
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
