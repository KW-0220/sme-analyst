# 上線前核實清單

以下項目在網站中以「待核實」標記顯示，或以設定值控制。核實後填入 `js/config.js` 或對應頁面，標記會自動消失。未核實前，網站不作出相關承諾。

## 營運資料（`js/config.js` → `company`）

- [ ] 營運公司全名
- [ ] 聯絡電郵
- [ ] 聯絡電話
- [ ] 營業地址
- [ ] 服務時間

## 顧問接駁

- [ ] `whatsappNumber`：顧問 WhatsApp 號碼。未填時「搵顧問」視窗只提供複製訊息，不接駁。
- [ ] `processing.advisorAccessDefault`：顧問是否預設可查看報告
- [ ] `processing.advisorAuthorizeMethod`：用戶要求跟進時如何授權、如何撤回

## 文件使用說明及私隱政策（`js/config.js` → `processing`）

- [ ] `processors`：實際使用的外部 AI／雲端處理服務名稱及用途
- [ ] `retentionOriginal`：原始文件保留期限與刪除方法
- [ ] `retentionExtracted`：抽取資料保留期限與刪除方法
- [ ] `retentionReport`：報告保留期限與刪除方法，以及備份處理方式
- [ ] `privacy.html`：報告存取控制方式、政策生效日期
- [ ] `terms.html`：顧問收費及服務身份、佣金披露（須與實際營運一致）、管轄法律、生效日期

## 系統限制（`js/config.js` → `upload`）

- [ ] `maxSizeMB`：系統實際檔案大小上限
- [ ] 如產品支援遮蓋帳號，先完成辨識測試；未確認前不承諾遮蓋後仍可分析

## 標籤（`js/config.js` → `claims`）

- [ ] `free`：只有確實免費才設為 `true`
- [ ] `noSignup`：只有確實免註冊才設為 `true`
- [ ] 「3 分鐘完成」類說法：未實測前不加入

## 官網承接

- [ ] `fullAnalysisUrl`：官網如提供專用上載頁，改為經確認的實際連結
- [ ] `full-analysis-intake.html`：正式文件清單、所需月數、官網帳戶或聯絡欄位要求、官網處理服務及保留安排
- [ ] 兩個入口如支援資料沿用，先列明可沿用項目讓用戶確認；未建立安全銜接前不自動帶入

## 視覺

- [ ] `assets/hero-banner.jpg`：放入用戶提供的橫額相片
- [ ] 官方 Logo 圖檔放入 `assets/`，並在 `js/config.js` 的 `logoImage` 填入路徑（目前為依 Logo 重繪的 SVG）
- [ ] 如品牌檔另有準確色值，更新 `css/styles.css` 的 `--brand`、`--navy`

## 關於我們

- [ ] 如有可核實的團隊資料，加入真實姓名、職責及照片
- [ ] 沒有可核實的客戶案例或資格時，不加入徽章、見證或數量

## 私隱與系統驗收

- [ ] 報告網址設有存取控制，不可由公開網址隨意存取
- [ ] 分析頁、報告頁及授權頁保持 `noindex`，`robots.txt` 已排除
- [ ] 刪除按鈕實際刪除文件、抽取資料及報告；備份處理與政策一致
- [ ] 追蹤事件不含文件名、帳號、交易摘要、金額
