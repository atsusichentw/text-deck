'use strict';

// ===== 多國語言 =====
// 放在 <head> 裡同步載入（在 theme.js 之後），先設定 <html lang>，避免畫面閃一下錯的語言。
// HTML 中的固定文字用 data-i18n="key" 標示；其他屬性用 data-i18n-placeholder / -aria-label / -title；
// 需要帶參數時另外寫 data-i18n-args='{"n":6}'。程式中的文字用 t('key', { 參數 })。
// 只會出現在某個語言的整段內容（例如首頁說明）用 data-lang="en" 標示，由 CSS 依 <html lang> 顯示或隱藏。
// 新增語言：在 LANGS 加一筆，並在 MESSAGES 補上同樣的 key。
const LANG_KEY = 'textdeck-lang';
const LANGS = [
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'en', label: 'English' },
];

const MESSAGES = {
  'zh-Hant': {
    'title.home': 'TDeck',
    'title.deck': '管理牌組 · TDeck',
    'title.duel': '對戰 · TDeck',

    'nav.menu': '主選單',
    'nav.duel': '對戰',
    'nav.deck': '管理牌組',
    'nav.home': '首頁',
    'theme.label': '顯示模式',
    'theme.current': '顯示模式：{name}',
    'theme.light': '淺色',
    'theme.dark': '深色',
    'theme.auto': '自動',
    'lang.label': '語言',
    'lang.current': '語言：{name}',

    // 卡片欄位與選項
    'field.name': '名稱',
    'field.type': '種類',
    'field.color': '顏色',
    'field.trigger': '觸發',
    'field.count': '張數',
    'field.effect': '效果',
    'stat.level': '等級',
    'stat.cost': '消耗',
    'stat.power': '戰力',
    'stat.soul': '魂點',
    'type.character': '角色',
    'type.event': '事件',
    'type.climax': '名場面',
    'color.yellow': '黃',
    'color.green': '綠',
    'color.red': '紅',
    'color.blue': '藍',
    'trigger.none': '無',
    'trigger.soul+1': '魂+1',
    'trigger.soul+2': '魂+2',
    'trigger.pool': '寶袋',
    'trigger.comeback': '木門',
    'trigger.return': '風',
    'trigger.draw': '書',
    'trigger.treasure': '金磚',
    'trigger.shot': '燒',
    'trigger.gate': '凱旋門',
    'trigger.choice': '箭頭',
    'trigger.standby': '開機',
    'trigger.discovery': '望遠鏡',
    'trigger.chance': '機會',
    'trigger.focus': '專注',

    // 資料驗證
    'error.name': '請填寫名稱',
    'error.type': '請選擇種類',
    'error.color': '請選擇顏色',
    'error.trigger': '沒有「{name}」這種觸發',
    'error.nonNegative': '{label}必須是 0 以上的整數',
    'error.count': '張數至少要 1 張',
    'error.noCards': 'JSON 格式不正確，找不到 cards',
    'error.noDecks': 'JSON 格式不正確，找不到 decks',
    'error.cardAt': '「{deck}」第 {n} 張卡片：{msg}',

    // 管理牌組
    'deck.select': '切換牌組',
    'deck.option': '{name}（{n}）',
    'deck.new': '新增牌組',
    'deck.delete': '刪除牌組',
    'deck.export': '匯出 .json',
    'deck.import': '匯入 .json',
    'deck.name': '牌組名稱',
    'deck.namePlaceholder': '留空則以當下時間命名',
    'form.addTitle': '加入卡片',
    'form.editTitle': '編輯卡片',
    'form.submitAdd': '加入牌組',
    'form.submitUpdate': '更新卡片',
    'form.cancelEdit': '取消編輯',
    'form.select': '請選擇',
    'list.title': '牌組內容',
    'list.count': '{total} 張 · {kinds} 種',
    'list.groupCount': '{n} 張',
    'list.empty': '牌組還是空的，用表單加入卡片。',
    'list.sep': '、',
    'card.dec': '減少一張',
    'card.inc': '增加一張',
    'card.edit': '編輯',
    'card.remove': '移除',
    'card.triggerMeta': '觸發 {name}',
    'status.ok': '✓ 牌組符合規則',
    'status.total': '總張數',
    'problem.short': '還差 {n} 張',
    'problem.over': '多了 {n} 張',
    'problem.climax': '名場面超過上限 {n} 張',
    'toast.updated': '已更新「{name}」',
    'toast.added': '已加入「{name}」× {n}',
    'dialog.ok': '確定',
    'dialog.cancel': '取消',
    'dialog.close': '關閉',
    'confirm.removeCardTitle': '移除卡片',
    'confirm.removeCard': '確定要從牌組移除「{name}」？',
    'confirm.deleteOk': '刪除',
    'confirm.deleteDeck': '確定要刪除牌組「{name}」？刪除後無法復原。',
    'import.onlyJson': '匯入失敗：只能匯入 .json 檔案',
    'import.invalidJson': '檔案不是有效的 JSON',
    'import.failed': '匯入失敗：{msg}',
    'import.done': '已匯入 {n} 副牌組',
    'storage.saveFailed': '無法儲存到瀏覽器（空間不足或網站資料被封鎖），請先匯出 .json 備份。',

    // 對戰
    'duel.create': '建立房間',
    'duel.join': '加入房間',
    'duel.cancel': '取消',
    'duel.wip': '對戰功能開發中',
    'duel.leave': '離開房間',
    'duel.hostStep1': '① 把連線碼傳給對手',
    'duel.hostStep2': '② 貼上對手傳回的回覆碼',
    'duel.guestStep1': '① 貼上房主傳來的連線碼',
    'duel.guestStep2': '② 把回覆碼傳回給房主',
    'duel.copyOffer': '複製連線碼',
    'duel.copyAnswer': '複製回覆碼',
    'duel.connect': '連線',
    'duel.makeAnswer': '產生回覆碼',
    'duel.preparing': '正在產生代碼…',
    'duel.waitingAnswer': '等待對手傳回回覆碼…',
    'duel.waitingHost': '等待房主貼上回覆碼…請盡快把回覆碼傳給房主',
    'duel.connecting': '連線中…',
    'duel.opponentJoined': '對手已加入',
    'duel.joined': '已加入房間',
    'duel.peerLeft': '對方已離開房間',
    'duel.pasteFirst': '請先貼上代碼',
    'duel.badCode': '代碼不正確，請確認有完整複製',
    'duel.notAnswer': '這是房主的連線碼，請貼上對手產生的回覆碼',
    'duel.notOffer': '這是回覆碼，請貼上房主產生的連線碼',
    'duel.codeUsed': '這個連線碼已經用過了，請重新建立房間',
    'duel.failed': '無法直接連線，可能是網路環境阻擋了點對點連線',
    'duel.copied': '已複製',
    'duel.copyFailed': '無法自動複製，已幫你選取，請手動複製',
    'duel.confirmLeave': '離開後連線會中斷，需要重新交換連線碼。',
    'duel.errBrowser': '這個瀏覽器不支援連線對戰',
    'duel.diag': '連線診斷',
    'duel.copyDiag': '複製診斷資訊',
    'diag.role': '角色',
    'diag.host': '房主',
    'diag.guest': '對手',
    'diag.local': '本機',
    'diag.remote': '對方',
    'diag.natNone': '沒有公網位址（STUN 連不上或 UDP 被擋）',
    'diag.natSymmetric': '對稱式 NAT（很可能無法直連）',
    'diag.natCone': '一般 NAT（可以直連）',
    'diag.natUnknown': 'NAT 類型無法判斷',
  },

  en: {
    'title.home': 'TDeck',
    'title.deck': 'Decks · TDeck',
    'title.duel': 'Duel · TDeck',

    'nav.menu': 'Main menu',
    'nav.duel': 'Duel',
    'nav.deck': 'Decks',
    'nav.home': 'Home',
    'theme.label': 'Theme',
    'theme.current': 'Theme: {name}',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.auto': 'Auto',
    'lang.label': 'Language',
    'lang.current': 'Language: {name}',

    'field.name': 'Name',
    'field.type': 'Type',
    'field.color': 'Color',
    'field.trigger': 'Trigger',
    'field.count': 'Copies',
    'field.effect': 'Effect',
    'stat.level': 'Level',
    'stat.cost': 'Cost',
    'stat.power': 'Power',
    'stat.soul': 'Soul',
    'type.character': 'Character',
    'type.event': 'Event',
    'type.climax': 'Climax',
    'color.yellow': 'Yellow',
    'color.green': 'Green',
    'color.red': 'Red',
    'color.blue': 'Blue',
    'trigger.none': 'none',
    'trigger.soul+1': 'soul+1',
    'trigger.soul+2': 'soul+2',
    'trigger.pool': 'pool',
    'trigger.comeback': 'comeback',
    'trigger.return': 'return',
    'trigger.draw': 'draw',
    'trigger.treasure': 'treasure',
    'trigger.shot': 'shot',
    'trigger.gate': 'gate',
    'trigger.choice': 'choice',
    'trigger.standby': 'standby',
    'trigger.discovery': 'discovery',
    'trigger.chance': 'chance',
    'trigger.focus': 'focus',

    'error.name': 'Name is required',
    'error.type': 'Select a type',
    'error.color': 'Select a color',
    'error.trigger': 'Unknown trigger "{name}"',
    'error.nonNegative': '{label} must be a whole number, 0 or more',
    'error.count': 'At least 1 copy is required',
    'error.noCards': 'Invalid JSON: "cards" is missing',
    'error.noDecks': 'Invalid JSON: "decks" is missing',
    'error.cardAt': '"{deck}", card {n}: {msg}',

    'deck.select': 'Switch deck',
    'deck.option': '{name} ({n})',
    'deck.new': 'New deck',
    'deck.delete': 'Delete deck',
    'deck.export': 'Export .json',
    'deck.import': 'Import .json',
    'deck.name': 'Deck name',
    'deck.namePlaceholder': 'Leave blank to use the current date and time',
    'form.addTitle': 'Add card',
    'form.editTitle': 'Edit card',
    'form.submitAdd': 'Add to deck',
    'form.submitUpdate': 'Update card',
    'form.cancelEdit': 'Cancel',
    'form.select': 'Select…',
    'list.title': 'Deck contents',
    'list.count': '{total} cards · {kinds} unique',
    'list.groupCount': '{n} cards',
    'list.empty': 'This deck is empty. Add cards with the form.',
    'list.sep': ', ',
    'card.dec': 'Remove one copy',
    'card.inc': 'Add one copy',
    'card.edit': 'Edit',
    'card.remove': 'Remove',
    'card.triggerMeta': 'Trigger: {name}',
    'status.ok': '✓ Deck is valid',
    'status.total': 'Total',
    'problem.short': '{n} more cards needed',
    'problem.over': '{n} cards over the limit',
    'problem.climax': '{n} too many Climax cards',
    'toast.updated': 'Updated "{name}"',
    'toast.added': 'Added "{name}" × {n}',
    'dialog.ok': 'OK',
    'dialog.cancel': 'Cancel',
    'dialog.close': 'Close',
    'confirm.removeCardTitle': 'Remove card',
    'confirm.removeCard': 'Remove "{name}" from this deck?',
    'confirm.deleteOk': 'Delete',
    'confirm.deleteDeck': 'Delete deck "{name}"? This can\'t be undone.',
    'import.onlyJson': 'Import failed: only .json files are supported',
    'import.invalidJson': 'The file isn\'t valid JSON',
    'import.failed': 'Import failed: {msg}',
    'import.done': 'Imported {n} deck(s)',
    'storage.saveFailed': 'Couldn\'t save in this browser (storage is full or blocked). Export a .json backup first.',

    'duel.create': 'Create room',
    'duel.join': 'Join room',
    'duel.cancel': 'Cancel',
    'duel.wip': 'Duel features are in development',
    'duel.leave': 'Leave room',
    'duel.hostStep1': '① Send this connection code to your opponent',
    'duel.hostStep2': '② Paste the reply code from your opponent',
    'duel.guestStep1': '① Paste the connection code from the host',
    'duel.guestStep2': '② Send this reply code back to the host',
    'duel.copyOffer': 'Copy connection code',
    'duel.copyAnswer': 'Copy reply code',
    'duel.connect': 'Connect',
    'duel.makeAnswer': 'Generate reply code',
    'duel.preparing': 'Generating code…',
    'duel.waitingAnswer': 'Waiting for your opponent\'s reply code…',
    'duel.waitingHost': 'Waiting for the host to paste your reply code… Send it to the host right away.',
    'duel.connecting': 'Connecting…',
    'duel.opponentJoined': 'Opponent joined',
    'duel.joined': 'Joined the room',
    'duel.peerLeft': 'The other player left the room',
    'duel.pasteFirst': 'Paste a code first',
    'duel.badCode': 'This code isn\'t valid. Make sure you copied all of it.',
    'duel.notAnswer': 'This is the host\'s connection code. Paste the reply code from your opponent.',
    'duel.notOffer': 'This is a reply code. Paste the connection code from the host.',
    'duel.codeUsed': 'This connection code was already used. Create a new room.',
    'duel.failed': 'Couldn\'t connect directly. The network may be blocking peer-to-peer connections.',
    'duel.copied': 'Copied',
    'duel.copyFailed': 'Couldn\'t copy automatically. The code is selected so you can copy it yourself.',
    'duel.confirmLeave': 'You\'ll be disconnected and will need to exchange codes again.',
    'duel.errBrowser': 'This browser doesn\'t support online duels',
    'duel.diag': 'Connection diagnostics',
    'duel.copyDiag': 'Copy diagnostics',
    'diag.role': 'Role',
    'diag.host': 'Host',
    'diag.guest': 'Guest',
    'diag.local': 'This device',
    'diag.remote': 'Other side',
    'diag.natNone': 'No public address (STUN unreachable or UDP blocked)',
    'diag.natSymmetric': 'Symmetric NAT (direct connection unlikely)',
    'diag.natCone': 'Regular NAT (direct connection possible)',
    'diag.natUnknown': 'NAT type unknown',
  },
};

function detectLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.some((l) => l.value === saved)) return saved;
  } catch { /* 讀不到就依瀏覽器語言 */ }
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh-Hant' : 'en';
}

let currentLang = detectLang();
document.documentElement.lang = currentLang;

function getLang() {
  return currentLang;
}

// 取得目前語言的文字；找不到時退回中文，再找不到就顯示 key 方便發現遺漏
function t(key, params = {}) {
  const text = MESSAGES[currentLang][key] ?? MESSAGES['zh-Hant'][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

// 套用 data-i18n 系列屬性
function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    let args = {};
    try { args = el.dataset.i18nArgs ? JSON.parse(el.dataset.i18nArgs) : {}; } catch { /* 參數格式錯誤時不帶參數 */ }
    el.textContent = t(el.dataset.i18n, args);
  }
  for (const [attr, name] of [['i18nPlaceholder', 'placeholder'], ['i18nAriaLabel', 'aria-label'], ['i18nTitle', 'title']]) {
    const sel = `[data-${attr.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}]`;
    for (const el of root.querySelectorAll(sel)) el.setAttribute(name, t(el.dataset[attr]));
  }
}

// 設定元素文字並記住 key，切換語言時會自動重新翻譯
function setI18nText(el, key, params) {
  if (!key) {
    delete el.dataset.i18n;
    delete el.dataset.i18nArgs;
    el.textContent = '';
    return;
  }
  el.dataset.i18n = key;
  if (params) el.dataset.i18nArgs = JSON.stringify(params);
  else delete el.dataset.i18nArgs;
  el.textContent = t(key, params);
}

// 切換語言：重新套用固定文字，並通知各頁重新繪製動態內容
function setLang(lang) {
  if (!LANGS.some((l) => l.value === lang)) return;
  currentLang = lang;
  document.documentElement.lang = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* 無法儲存時只在本頁生效 */ }
  applyI18n();
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

document.addEventListener('DOMContentLoaded', () => applyI18n());
