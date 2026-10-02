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
    'title.simulate': '模擬 · TDeck',

    'nav.menu': '主選單',
    'nav.simulate': '模擬',
    'nav.deck': '管理牌組',
    'simulate.chooseTitle': '選擇牌組',
    'simulate.chooseHint': '選一副符合規則的牌組，再按「開始模擬」。',
    'simulate.start': '開始模擬',
    'simulate.noDecks': '還沒有可以用的牌組，請先建立並加入卡片。',
    'simulate.goDeck': '前往管理牌組',
    'simulate.invalid': '不符合規則：{problems}',
    'simulate.change': '重新選擇牌組',
    'simulate.shuffle': '洗牌',
    'simulate.draw': '抽牌',
    'simulate.deckCount': '牌堆剩 {n} 張',
    'simulate.deckMenu': '開啟牌堆選單',
    'log.shuffled': '洗牌完成，牌堆共 {n} 張。',
    'log.drew': '從牌堆最上方抽出 1 張牌加入手牌（牌堆剩 {n} 張，手牌 {hand} 張）。',
    'log.deckEmpty': '牌堆已經沒有牌了。',
    'zone.deck': '牌堆',
    'zone.hand': '手牌',
    'zone.waitingRoom': '休息室',
    'zone.front': '前排',
    'zone.back': '後排',
    'zone.clock': '時計',
    'zone.stock': '能量',
    'zone.memory': '回憶',
    'zone.level': '等級',
    'zone.climax': '名場面',
    'zone.resolution': '處理',
    'simulate.revealTop': '公開牌庫頂',
    'simulate.revealBottom': '公開牌庫底',
    'simulate.topToClock': '牌庫頂放入時計',
    'simulate.bottomToClock': '牌庫底放入時計',
    'simulate.viewDeck': '查看牌庫',
    'simulate.clearZone': '清空{zone}區',
    'log.clearZone': '清空{zone}區：將 {n} 張牌送入休息室。',
    'simulate.filterAll': '全部',
    'simulate.noLevel': '無等級',
    'simulate.searchCount': '顯示 {shown} / {total} 張',
    'simulate.noMatch': '找不到符合的卡片。',
    'simulate.cardActions': '操作',
    'simulate.resetDeck': '重置牌庫',
    'log.resetDeck': '重置牌庫：將休息室的 {moved} 張牌放入牌堆並洗牌（牌堆共 {n} 張）。',
    'log.revealTop': '公開牌堆最上方的 1 張牌，放到處理區（牌堆剩 {n} 張）。',
    'log.revealBottom': '公開牌堆最下方的 1 張牌，放到處理區（牌堆剩 {n} 張）。',
    'log.topToClock': '將牌堆最上方的 1 張牌放入時計（時計 {n} / {max}）。',
    'log.bottomToClock': '將牌堆最下方的 1 張牌放入時計（時計 {n} / {max}）。',
    'simulate.zones': '場上區域',
    'simulate.zoneEmpty': '沒有卡片',
    'simulate.zoneFull': '已滿',
    'simulate.typeOnly': '僅限{type}',
    'simulate.zoneTop': '{zone}最上方',
    'simulate.zoneBottom': '{zone}最下方',
    'simulate.zoneDialogEmpty': '{zone}區沒有卡片。',
    'simulate.peekTitle': '{zone}區的牌不公開，點擊查看內容',
    'simulate.peekHint': '這區的牌不公開，點擊卡片才會顯示（由最上方開始）：',
    'simulate.tapToReveal': '點擊查看',
    'simulate.peekCard': '第 {n} 張，點擊查看',
    'log.toZoneHidden': '將 1 張牌從手牌放入{zone}（不公開）。',
    'log.moveZoneHidden': '將 1 張牌從{from}放入{to}（不公開）。',
    'log.moveZoneTopHidden': '將 1 張牌從{from}放到{to}最上方（不公開）。',
    'log.moveZoneBottomHidden': '將 1 張牌從{from}放到{to}最下方（不公開）。',
    'log.moveZone': '將「{name}」從{from}放入{to}。',
    'log.moveZoneTop': '將「{name}」從{from}放到{to}最上方。',
    'log.moveZoneBottom': '將「{name}」從{from}放到{to}最下方。',
    'simulate.deckTop': '牌堆最上方',
    'simulate.deckBottom': '牌堆最下方',
    'log.toZone': '將「{name}」從手牌放入{zone}。',
    'log.toDeckTop': '將「{name}」從手牌放到牌堆最上方（牌堆共 {n} 張）。',
    'log.toDeckBottom': '將「{name}」從手牌放到牌堆最下方（牌堆共 {n} 張）。',
    'simulate.viewEffect': '查看效果',
    'simulate.cardLocation': '目前在：{zone}',
    'simulate.noEffect': '這張卡沒有效果。',
    'simulate.handEmpty': '還沒有手牌，按「抽牌」從牌堆抽一張。',
    'simulate.welcome': '已載入牌組「{name}」，共 {total} 張。',
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
    'deck.pasteJson': '輸入 JSON',
    'deck.pasteTitle': '輸入 JSON 建立牌組',
    'deck.pasteHint': '貼上牌組的 JSON（格式與匯出的 .json 相同，可以是一副或多副牌組）。',
    'deck.pasteSubmit': '建立牌組',
    'deck.pasteEmpty': '請先貼上 JSON',
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

  },

  en: {
    'title.home': 'TDeck',
    'title.deck': 'Decks · TDeck',
    'title.simulate': 'Simulate · TDeck',

    'nav.menu': 'Main menu',
    'nav.simulate': 'Simulate',
    'nav.deck': 'Decks',
    'simulate.chooseTitle': 'Choose a deck',
    'simulate.chooseHint': 'Choose a valid deck, then press "Start simulation".',
    'simulate.start': 'Start simulation',
    'simulate.noDecks': 'You don\'t have any decks with cards yet. Create one and add cards first.',
    'simulate.goDeck': 'Go to Decks',
    'simulate.invalid': 'Not valid: {problems}',
    'simulate.change': 'Choose another deck',
    'simulate.shuffle': 'Shuffle',
    'simulate.draw': 'Draw',
    'simulate.deckCount': '{n} cards left in the deck',
    'simulate.deckMenu': 'open deck menu',
    'log.shuffled': 'Shuffled the deck ({n} cards).',
    'log.drew': 'Drew 1 card from the top of the deck into your hand ({n} left in the deck, {hand} in hand).',
    'log.deckEmpty': 'The deck is empty.',
    'zone.deck': 'Deck',
    'zone.hand': 'Hand',
    'zone.waitingRoom': 'Waiting Room',
    'zone.front': 'Front',
    'zone.back': 'Back',
    'zone.clock': 'Clock',
    'zone.stock': 'Stock',
    'zone.memory': 'Memory',
    'zone.level': 'Level',
    'zone.climax': 'Climax',
    'zone.resolution': 'Resolution',
    'simulate.revealTop': 'Reveal top',
    'simulate.revealBottom': 'Reveal bottom',
    'simulate.topToClock': 'Top card to Clock',
    'simulate.bottomToClock': 'Bottom card to Clock',
    'simulate.viewDeck': 'View deck',
    'simulate.clearZone': 'Clear {zone}',
    'log.clearZone': 'Cleared {zone}: sent {n} cards to the Waiting Room.',
    'simulate.filterAll': 'All',
    'simulate.noLevel': 'No level',
    'simulate.searchCount': 'Showing {shown} of {total}',
    'simulate.noMatch': 'No matching cards.',
    'simulate.cardActions': 'Actions',
    'simulate.resetDeck': 'Reset deck',
    'log.resetDeck': 'Reset deck: put {moved} cards from the Waiting Room into the deck and shuffled ({n} cards in the deck).',
    'log.revealTop': 'Revealed the top card of the deck and put it in the Resolution zone ({n} left in the deck).',
    'log.revealBottom': 'Revealed the bottom card of the deck and put it in the Resolution zone ({n} left in the deck).',
    'log.topToClock': 'Put the top card of the deck into Clock (Clock {n} / {max}).',
    'log.bottomToClock': 'Put the bottom card of the deck into Clock (Clock {n} / {max}).',
    'simulate.zones': 'Zones',
    'simulate.zoneEmpty': 'No cards',
    'simulate.zoneFull': 'Full',
    'simulate.typeOnly': '{type} only',
    'simulate.zoneTop': 'Top of {zone}',
    'simulate.zoneBottom': 'Bottom of {zone}',
    'simulate.zoneDialogEmpty': 'There are no cards in {zone}.',
    'simulate.peekTitle': '{zone} cards are face down. Click to look at them.',
    'simulate.peekHint': 'These cards are face down. Click a card to reveal it (from the top):',
    'simulate.tapToReveal': 'Click to reveal',
    'simulate.peekCard': 'Card {n}, click to reveal',
    'log.toZoneHidden': 'Put 1 card from hand into {zone} (face down).',
    'log.moveZoneHidden': 'Put 1 card from {from} into {to} (face down).',
    'log.moveZoneTopHidden': 'Put 1 card from {from} on top of {to} (face down).',
    'log.moveZoneBottomHidden': 'Put 1 card from {from} at the bottom of {to} (face down).',
    'log.moveZone': 'Moved "{name}" from {from} to {to}.',
    'log.moveZoneTop': 'Put "{name}" from {from} on top of {to}.',
    'log.moveZoneBottom': 'Put "{name}" from {from} at the bottom of {to}.',
    'simulate.deckTop': 'Top of deck',
    'simulate.deckBottom': 'Bottom of deck',
    'log.toZone': 'Moved "{name}" from hand to {zone}.',
    'log.toDeckTop': 'Put "{name}" from hand on top of the deck ({n} cards in the deck).',
    'log.toDeckBottom': 'Put "{name}" from hand at the bottom of the deck ({n} cards in the deck).',
    'simulate.viewEffect': 'View effect',
    'simulate.cardLocation': 'Now in: {zone}',
    'simulate.noEffect': 'This card has no effect.',
    'simulate.handEmpty': 'No cards in hand yet. Press "Draw" to draw one from the deck.',
    'simulate.welcome': 'Loaded deck "{name}" ({total} cards).',
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
    'deck.pasteJson': 'Paste JSON',
    'deck.pasteTitle': 'Create a deck from JSON',
    'deck.pasteHint': 'Paste deck JSON (the same format as an exported .json file; one deck or several).',
    'deck.pasteSubmit': 'Create deck',
    'deck.pasteEmpty': 'Paste some JSON first',
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
