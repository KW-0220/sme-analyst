/* Google Gemini API 抽取（REST，無需 SDK）。回傳 { ok:true, extracted } 或 { ok:false, code, message } */
import { Extraction, SYSTEM_PROMPT, GEMINI_SCHEMA } from "./schema.js";

export async function extractWithGemini(buf, { apiKey, model }) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [
      { inlineData: { mimeType: "application/pdf", data: buf.toString("base64") } },
      { text: "請抽取這份文件的資料，並以指定的 JSON 結構輸出。" }
    ] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: GEMINI_SCHEMA, temperature: 0, maxOutputTokens: 32768 }
  };
  /* 429（配額或每分鐘上限）及 503（需求高峰）屬暫時性，等候後自動重試一次 */
  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(body) });
    } catch (e) {
      return { ok: false, code: "api", message: "未能連接 AI 服務，請稍後重試。" };
    }
    if ((res.status === 429 || res.status === 503) && attempt === 0) { await new Promise(r => setTimeout(r, 4000)); continue; }
    break;
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    const t = await res.text().catch(() => "");
    if (/API key|API_KEY|PERMISSION_DENIED|UNAUTHENTICATED/i.test(t)) return { ok: false, code: "auth", message: "AI 服務金鑰無效或沒有權限，請聯絡網站管理員。" };
    return { ok: false, code: "bad_request", message: "未能處理此文件，請確認是完整、未加密的 PDF。" };
  }
  if (res.status === 429) return { ok: false, code: "rate_limit", message: "系統目前繁忙，請稍後重試。" };
  if (!res.ok) return { ok: false, code: "api", message: "AI 服務暫時未能回應（" + res.status + "），請稍後重試。" };

  const data = await res.json();
  const cand = data.candidates && data.candidates[0];
  if (!cand) {
    const reason = data.promptFeedback && data.promptFeedback.blockReason;
    return { ok: false, code: "refusal", message: "AI 服務未有回應此文件" + (reason ? "（" + reason + "）" : "") + "。請確認文件為公司銀行月結單。" };
  }
  if (cand.finishReason === "MAX_TOKENS") return { ok: false, code: "too_long", message: "文件內容過長，未能一次處理完成。請改用單一戶口、單一月份的月結單。" };
  if (cand.finishReason && cand.finishReason !== "STOP") return { ok: false, code: "refusal", message: "AI 服務中止處理此文件（" + cand.finishReason + "）。請確認文件為公司銀行月結單。" };
  const text = (cand.content && cand.content.parts || []).map(p => p.text || "").join("");
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { return { ok: false, code: "parse", message: "AI 服務回應格式不完整，請重試。" }; }
  const v = Extraction.safeParse(parsed);
  if (!v.success) return { ok: false, code: "parse", message: "AI 服務回應的資料結構不符（" + v.error.issues[0].path.join(".") + "），請重試。" };
  return { ok: true, extracted: v.data, usage: data.usageMetadata || null };
}
