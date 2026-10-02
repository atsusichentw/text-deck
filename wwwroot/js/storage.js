'use strict';

// ===== 牌組資料存取（localStorage）=====
// 資料以 JSON 字串存在 localStorage（每個網站約 5MB，不會隨請求送到伺服器）
const STORAGE_KEY = 'textdeck';

function readStoredJson() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? migrateFromCookies();
  } catch {
    return null;
  }
}

function writeStoredJson(json) {
  try {
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch {
    return false; // 空間不足，或瀏覽器封鎖了網站資料
  }
}

// 舊版把資料分段存在 cookie（textdeck_n 記錄段數、textdeck_0、textdeck_1…）。
// 第一次開啟時搬到 localStorage，並刪除舊 cookie，避免它們繼續隨每次請求送出。
function migrateFromCookies() {
  const cookies = {};
  for (const part of document.cookie.split('; ')) {
    const i = part.indexOf('=');
    if (i > 0) cookies[part.slice(0, i)] = part.slice(i + 1);
  }
  const n = Number(cookies.textdeck_n);
  if (!Number.isInteger(n) || n <= 0) return null;

  let json = null;
  try {
    let encoded = '';
    for (let i = 0; i < n; i++) encoded += cookies[`textdeck_${i}`] ?? '';
    json = decodeURIComponent(encoded);
    JSON.parse(json);
  } catch {
    return null; // 舊資料損毀就不搬，保留 cookie 以免遺失
  }
  if (!writeStoredJson(json)) return json;

  // 舊 cookie 可能存在任一上層路徑（例如 /text-deck/），逐層刪除
  const dirs = location.pathname.split('/').slice(0, -1);
  const paths = dirs.map((_, i) => dirs.slice(0, i + 1).join('/') + '/');
  for (const name of Object.keys(cookies)) {
    if (!/^textdeck_(n|\d+)$/.test(name)) continue;
    for (const path of paths) document.cookie = `${name}=; path=${path}; max-age=0`;
  }
  return json;
}

function ensureDeck(s) {
  if (s.decks.length === 0) s.decks.push({ name: timestampName(), cards: [] });
  return s;
}

// 讀出所有牌組 { decks: [...] }，至少會有一副
function loadDecks() {
  try {
    const json = readStoredJson();
    if (json) return ensureDeck(parseState(JSON.parse(json)));
  } catch (e) {
    console.warn('讀取儲存資料失敗', e);
  }
  return ensureDeck({ decks: [] });
}

// 寫入所有牌組，失敗時回傳 false
function saveDecks(state) {
  return writeStoredJson(JSON.stringify(state));
}
