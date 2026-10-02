'use strict';

// ===== 模擬頁 =====
// 需先載入 i18n.js、common.js、rules.js、storage.js
// 第一步：從已儲存的牌組中選一副符合規則的牌組。
// 第二步：進入聊天室畫面，標題為牌組名稱。

let decks = loadDecks().decks.filter((d) => d.cards.length > 0); // 空牌組不列出
let selectedIndex = null;
let pickedIndex = null; // 選擇牌組畫面中選取（尚未開始）的牌組

// 聊天訊息：系統訊息存翻譯 key，切換語言時會重新翻譯；使用者訊息存原文
let messages = [];

function deckMeta(d) {
  const { total, byType } = deckSummary(d);
  return [t('list.count', { total, kinds: d.cards.length }), ...TYPES.map((x) => `${typeLabel(x)} ${byType[x]}`)].join(' · ');
}

function colorDots(d) {
  const { byColor } = deckSummary(d);
  return COLORS.filter((c) => byColor[c] > 0)
    .map((c) => `<span class="color-count"><i class="dot ${c}" aria-hidden="true"></i>${esc(colorLabel(c))} ${byColor[c]}</span>`)
    .join('');
}

// ===== 第一步：選擇牌組 =====
function renderChoices() {
  const box = $('#deck-choices');
  $('#start-bar').hidden = decks.length === 0;
  $('#btn-start').disabled = pickedIndex === null;
  if (decks.length === 0) {
    box.innerHTML = `
      <div class="empty-choices">
        <p class="muted">${esc(t('simulate.noDecks'))}</p>
        <a class="btn primary" href="../deck/">${esc(t('simulate.goDeck'))}</a>
      </div>`;
    return;
  }
  // 只有符合規則的牌組可以選；不符合的顯示原因
  box.innerHTML = decks.map((d, i) => {
    const { problems } = deckSummary(d);
    const ok = problems.length === 0;
    const picked = i === pickedIndex;
    return `
      <button type="button" class="deck-choice${picked ? ' selected' : ''}" data-i="${i}" aria-pressed="${picked}"${ok ? '' : ' disabled'}>
        ${picked ? '<i class="bi bi-check-circle-fill choice-check" aria-hidden="true"></i>' : ''}
        <span class="choice-name">${esc(d.name)}</span>
        <span class="choice-meta">${esc(deckMeta(d))}</span>
        <span class="choice-colors">${colorDots(d)}</span>
        <span class="choice-status ${ok ? 'ok' : 'bad'}">${ok ? esc(t('status.ok')) : '✗ ' + esc(t('simulate.invalid', { problems: problems.join(t('list.sep')) }))}</span>
      </button>`;
  }).join('');
}

// ===== 第二步：聊天室（以按鈕操作牌堆，訊息區顯示 log）=====
// 牌堆（Deck）：每張卡依張數展開成一個元素，索引 0 為最上方
let pile = [];
// 手牌（Hand）：抽到的牌依抽牌順序排列
let hand = [];
// 其他區域：手牌可以放入的地方；有上限的區域滿了就不能再放
const ZONES = ['waitingRoom', 'front', 'back', 'clock', 'stock', 'memory', 'level', 'climax'];
const ZONE_LIMITS = { front: 3, back: 2, clock: 7 };
// 限定種類的區域：前排、後排只能放角色，名場面區只能放名場面卡
const ZONE_TYPES = { front: ['character'], back: ['character'], climax: ['climax'] };
let zones = {};
// 點開視窗後可以把卡移到哪裡（場上區域的每一區，以及牌堆選單的「查看牌庫」）
const ZONE_ACTIONS = {
  clock: ['hand', 'waitingRoom', 'level', 'stockTop', 'stockBottom', 'deckTop', 'deckBottom'],
  resolution: ['stockTop', 'stockBottom', 'deckTop', 'deckBottom', 'clockTop', 'clockBottom', 'waitingRoom', 'hand', 'memory'],
  deck: ['stockTop', 'stockBottom', 'resolution', 'clockTop', 'clockBottom', 'waitingRoom', 'hand', 'memory'], // 牌堆選單的「查看牌庫」
  waitingRoom: ['stockTop', 'stockBottom', 'deckTop', 'deckBottom', 'clockTop', 'clockBottom', 'resolution', 'hand', 'memory', 'level'],
  memory: ['stockTop', 'stockBottom', 'deckTop', 'deckBottom', 'clockTop', 'clockBottom', 'resolution', 'hand', 'waitingRoom'],
  front: ['back', 'stockTop', 'stockBottom', 'deckTop', 'deckBottom', 'clockTop', 'clockBottom', 'resolution', 'hand', 'memory', 'waitingRoom'],
  back: ['front', 'stockTop', 'stockBottom', 'deckTop', 'deckBottom', 'clockTop', 'clockBottom', 'resolution', 'hand', 'memory', 'waitingRoom'],
  level: ['stockTop', 'stockBottom', 'deckTop', 'deckBottom', 'clockTop', 'clockBottom', 'resolution', 'hand', 'memory', 'waitingRoom'],
  climax: ['hand', 'waitingRoom'],
};

// 區域視窗底部有「清空」按鈕的區域（全部送入休息室）
const CLEARABLE_ZONES = ['clock', 'stock'];

// 不公開的區域：場上區域只顯示張數，玩家主動點開才在視窗中看內容；
// 放進這些區域時，log 也不顯示是哪張牌
const HIDDEN_ZONES = ['stock'];

// 能量（Stock）、時計（Clock）和牌堆一樣有順序：索引 0 為最上方，放入時預設放在最上方
const STACKED_ZONES = ['stock', 'clock'];

// 處理區（Resolution）：從牌堆公開的卡放這裡；目前只能從牌堆放入，不在手牌的移動選項中
const LIST_ZONES = [...ZONES, 'resolution'];

function emptyZones() {
  return Object.fromEntries(LIST_ZONES.map((z) => [z, []]));
}

const zoneFull = (z) => ZONE_LIMITS[z] !== undefined && zones[z].length >= ZONE_LIMITS[z];
const zoneAccepts = (z, card) => !ZONE_TYPES[z] || ZONE_TYPES[z].includes(card.type);
const canPlace = (z, card) => ZONES.includes(z) && zoneAccepts(z, card) && !zoneFull(z);

function buildPile(d) {
  pile = d.cards.flatMap(({ count, ...card }) => Array.from({ length: count }, () => ({ ...card })));
  hand = [];
  zones = emptyZones();
}

// 0 ≤ 結果 < n 的均勻亂數（捨棄會造成分布不均的值）
function randomInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % n;
}

// Fisher–Yates 洗牌
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function timeText(date) {
  return date.toLocaleTimeString(getLang(), { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
}

function cardLine(c) {
  return [typeLabel(c.type), colorLabel(c.color), cardMeta(c)].filter(Boolean).join(' · ');
}

// 卡片顯示：名稱、種類、顏色、數值與觸發（不顯示效果）
// ref 標示卡片來源（例如 hand-0、log-3、zone-front-1），放大鏡按鈕依此找到卡片並顯示效果；
// menu 為額外的漢堡選單（手牌）
// note 為卡片資訊下方的補充說明（log 中顯示「目前在：某區」）
function cardHtml(c, ref, menu = '', note = '') {
  const label = (key) => `title="${esc(t(key))}" aria-label="${esc(t(key))}：${esc(c.name)}"`;
  const zoom = `
      <div class="card-actions">
        <button type="button" class="card-btn card-zoom" data-card="${ref}" ${label('simulate.viewEffect')}>
          <i class="bi bi-search" aria-hidden="true"></i>
        </button>${menu}
      </div>`;
  return `
    <div class="sim-card">
      <i class="dot ${c.color}" aria-hidden="true"></i>
      <div class="sim-card-body">
        <div class="sim-card-name">${esc(c.name)}</div>
        <div class="sim-card-meta">${esc(cardLine(c))}</div>
        ${note ? `<div class="sim-card-loc">${esc(note)}</div>` : ''}
      </div>${zoom}
    </div>`;
}

// log 參數中的區域代碼（zone、zones.from / zones.to）換成目前語言的名稱
function logParams(m) {
  const params = { ...m.params };
  if (m.zone) params.zone = t(`zone.${m.zone}`);
  for (const [k, z] of Object.entries(m.zones || {})) params[k] = t(`zone.${z}`);
  return params;
}

// 訊息：role 為 system（置中說明）或 log（操作紀錄）；文字存翻譯 key，切換語言時重新翻譯
// 找出卡片目前所在的區域（手牌 hand、牌堆 deck，或場上區域代碼）
function locateCard(card) {
  if (hand.includes(card)) return 'hand';
  if (pile.includes(card)) return 'deck';
  return LIST_ZONES.find((z) => zones[z]?.includes(card)) ?? null;
}

// log 中的卡片：顯示目前所在的區域，並可用 ☰ 直接操作（選項依所在區域而定）；不公開的區域（能量）不顯示位置也不能操作
function logCardHtml(card, i) {
  const loc = locateCard(card);
  if (!loc || HIDDEN_ZONES.includes(loc)) return cardHtml(card, `log-${i}`);
  const items = loc === 'hand' ? handMenuItems(card) : ZONE_ACTIONS[loc] ? zoneMenuItems(ZONE_ACTIONS[loc]) : [];
  return cardHtml(card, `log-${i}`, items.length ? rowMenuHtml(i, items) : '', t('simulate.cardLocation', { zone: t(`zone.${loc}`) }));
}

function renderMessages() {
  const box = $('#chat-messages');
  box.innerHTML = messages.map((m, i) => `
    <div class="msg ${m.role}">
      <div class="msg-bubble">
        <div>${esc(t(m.key, logParams(m)))}</div>
        ${m.card ? logCardHtml(m.card, i) : ''}
      </div>
      <time class="msg-time" datetime="${m.time.toISOString()}">${esc(timeText(m.time))}</time>
    </div>`).join('');
  box.scrollTop = box.scrollHeight;
}

function addMessage(message) {
  messages.push({ ...message, time: new Date() });
  renderMessages();
}

function renderZones() {
  const chip = $('#deck-count');
  chip.querySelector('span').textContent = pile.length;
  chip.setAttribute('aria-label', [t('simulate.deckCount', { n: pile.length }), t('simulate.deckMenu')].join(t('list.sep')));
  const empty = pile.length === 0;
  for (const id of ['#btn-draw', '#btn-shuffle', '#btn-reveal-top', '#btn-reveal-bottom', '#btn-view-deck']) $(id).disabled = empty;
  for (const id of ['#btn-clock-top', '#btn-clock-bottom']) $(id).disabled = empty || zoneFull('clock');
  $('#btn-reset-deck').disabled = zones.waitingRoom.length === 0;
}

// 手牌自動依等級排序（小到大）；名場面沒有等級，排在最後；沒填等級的其他卡排在名場面之前
// Array.prototype.sort 是穩定排序，同等級維持進入手牌的先後順序
function handOrder(c) {
  if (c.type === 'climax') return Number.MAX_SAFE_INTEGER;
  return c.level ?? Number.MAX_SAFE_INTEGER - 1;
}

function addToHand(card) {
  hand.push(card);
  hand.sort((a, b) => handOrder(a) - handOrder(b));
}

// 右側手牌
function renderHand() {
  $('#hand-total').textContent = t('list.groupCount', { n: hand.length });
  $('#tab-hand-count').textContent = hand.length; // 小螢幕手牌書籤上的張數
  $('#hand-list').innerHTML = hand.length
    ? hand.map((c, i) => cardHtml(c, `hand-${i}`, rowMenuHtml(i, handMenuItems(c)))).join('')
    : `<p class="muted hand-empty">${esc(t('simulate.handEmpty'))}</p>`;
}

// 右側場上區域：各區張數，可展開查看卡片；記住展開狀態，重畫後維持
function renderZoneList() {
  const open = new Set([...document.querySelectorAll('#zone-list details[open]')].map((el) => el.dataset.zone));
  $('#zone-list').innerHTML = LIST_ZONES.map((z) => {
    const cards = zones[z];
    const limit = ZONE_LIMITS[z];
    const count = limit === undefined ? cards.length : `${cards.length} / ${limit}`;
    if (HIDDEN_ZONES.includes(z)) {
      return `
      <button type="button" class="zone-item zone-open zone-hidden" data-zone="${z}" data-open-zone="${z}" title="${esc(t('simulate.peekTitle', { zone: t(`zone.${z}`) }))}">
        <span>${esc(t(`zone.${z}`))}</span><b>${count}</b><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
      </button>`;
    }
    if (ZONE_ACTIONS[z]) {
      return `
      <button type="button" class="zone-item zone-open" data-zone="${z}" data-open-zone="${z}">
        <span>${esc(t(`zone.${z}`))}</span><b>${count}</b><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
      </button>`;
    }
    return `
      <details class="zone-item" data-zone="${z}"${open.has(z) ? ' open' : ''}>
        <summary><span>${esc(t(`zone.${z}`))}</span><b>${count}</b></summary>
        <div class="zone-cards">
          ${cards.length ? cards.map((c, i) => cardHtml(c, `zone-${z}-${i}`)).join('') : `<p class="muted zone-empty">${esc(t('simulate.zoneEmpty'))}</p>`}
        </div>
      </details>`;
  }).join('');
}

function renderChat() {
  $('#chat-title').textContent = decks[selectedIndex].name;
  renderZones();
  renderHand();
  renderZoneList();
  renderMessages();
}

function render() {
  const chosen = selectedIndex !== null;
  $('#step-choose').hidden = chosen;
  $('#table').hidden = !chosen;
  document.body.classList.toggle('in-chat', chosen);
  if (chosen) renderChat();
  else renderChoices();
}

function enterChat(i) {
  selectedIndex = i;
  const d = decks[i];
  buildPile(d);
  messages = [];
  render();
  addMessage({ role: 'system', key: 'simulate.welcome', params: { name: d.name, total: pile.length } });
}

// 點牌組只選取，按「開始模擬」才進入聊天室
$('#deck-choices').addEventListener('click', (e) => {
  const btn = e.target.closest('.deck-choice');
  if (!btn || btn.disabled) return;
  pickedIndex = Number(btn.dataset.i);
  renderChoices();
});
$('#btn-start').addEventListener('click', () => {
  if (pickedIndex === null || !decks[pickedIndex]) return;
  enterChat(pickedIndex);
});

$('#btn-change-deck').addEventListener('click', () => {
  closeDeckMenu();
  // 小螢幕上開著的場上區域 / 手牌 offcanvas 一併收起
  for (const id of ['#zone-offcanvas', '#hand-offcanvas']) bootstrap.Offcanvas.getInstance($(id))?.hide();
  selectedIndex = null;
  messages = [];
  pile = [];
  hand = [];
  zones = emptyZones();
  decks = loadDecks().decks.filter((d) => d.cards.length > 0); // 重新讀取，反映其他分頁的修改
  pickedIndex = null; // 牌組清單可能已改變，重新選擇
  render();
});

// ===== 牌堆操作 =====
$('#btn-shuffle').addEventListener('click', () => {
  shuffle(pile);
  addMessage({ role: 'log', key: 'log.shuffled', params: { n: pile.length } });
  renderZones();
});

// 從牌堆最上方抽出一張，加入手牌
$('#btn-draw').addEventListener('click', () => {
  if (pile.length === 0) {
    addMessage({ role: 'log', key: 'log.deckEmpty' });
    return;
  }
  const card = pile.shift();
  addToHand(card);
  addMessage({ role: 'log', key: 'log.drew', params: { n: pile.length, hand: hand.length }, card });
  if (pile.length === 0) addMessage({ role: 'log', key: 'log.deckEmpty' });
  renderZones();
  renderHand();
  $('#hand-list').children[hand.indexOf(card)]?.scrollIntoView({ block: 'nearest' }); // 捲到剛抽到的牌
});

// 從牌堆最上方 / 最下方拿一張牌
function takeFromPile(fromTop) {
  return fromTop ? pile.shift() : pile.pop();
}

function afterPileChange() {
  if (pile.length === 0) addMessage({ role: 'log', key: 'log.deckEmpty' });
  renderZones();
  renderZoneList();
}

// 公開：從牌庫頂 / 牌庫底拿一張放到處理區
function reveal(fromTop) {
  if (pile.length === 0) return;
  const card = takeFromPile(fromTop);
  zones.resolution.push(card);
  addMessage({ role: 'log', key: fromTop ? 'log.revealTop' : 'log.revealBottom', params: { n: pile.length }, card });
  afterPileChange();
}

// 從牌庫頂 / 牌庫底直接放一張到時計（時計滿了不能放）
function pileToClock(fromTop) {
  if (pile.length === 0 || zoneFull('clock')) return;
  const card = takeFromPile(fromTop);
  zones.clock.unshift(card);
  addMessage({ role: 'log', key: fromTop ? 'log.topToClock' : 'log.bottomToClock', params: { n: zones.clock.length, max: ZONE_LIMITS.clock }, card });
  afterPileChange();
}

// ===== 牌堆下拉選單（標題列的牌堆張數按鈕）=====
const deckToggle = $('#deck-count');
const deckMenu = $('#deck-menu');
const deckItems = () => [...deckMenu.querySelectorAll('button:not(:disabled)')];

function openDeckMenu(focusLast = false) {
  deckMenu.hidden = false;
  deckToggle.setAttribute('aria-expanded', 'true');
  const items = deckItems();
  (focusLast ? items.at(-1) : items[0])?.focus();
}

function closeDeckMenu(returnFocus = false) {
  if (deckMenu.hidden) return;
  deckMenu.hidden = true;
  deckToggle.setAttribute('aria-expanded', 'false');
  if (returnFocus) deckToggle.focus();
}

deckToggle.addEventListener('click', () => (deckMenu.hidden ? openDeckMenu() : closeDeckMenu()));
deckToggle.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); openDeckMenu(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); openDeckMenu(true); }
});
deckMenu.addEventListener('keydown', (e) => {
  const items = deckItems();
  const i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  if (e.key === 'Escape') { e.preventDefault(); closeDeckMenu(true); }
  if (e.key === 'Tab') closeDeckMenu();
});
// 選了項目後選單保持開啟，方便連續操作（例如連抽好幾張）；點選單以外的地方才關閉
document.addEventListener('click', (e) => { if (!e.target.closest('.deck-menu')) closeDeckMenu(); });

// 重置牌庫：休息室的牌全部放回牌堆，再把整個牌堆洗一次
function resetDeck() {
  const moved = zones.waitingRoom.splice(0);
  if (moved.length === 0) return;
  pile.push(...moved);
  shuffle(pile);
  addMessage({ role: 'log', key: 'log.resetDeck', params: { moved: moved.length, n: pile.length } });
  renderZones();
  renderZoneList();
}

$('#btn-reset-deck').addEventListener('click', resetDeck);
// 查看牌庫：打開視窗（由最上方開始列出），可以把牌移到其他區域
$('#btn-view-deck').addEventListener('click', () => {
  if (pile.length === 0) return;
  closeDeckMenu();
  openZoneDialog('deck');
});
$('#btn-reveal-top').addEventListener('click', () => reveal(true));
$('#btn-reveal-bottom').addEventListener('click', () => reveal(false));
$('#btn-clock-top').addEventListener('click', () => pileToClock(true));
$('#btn-clock-bottom').addEventListener('click', () => pileToClock(false));

// ===== 放大鏡（手牌、log 共用）：以 Bootstrap modal 顯示效果 =====
let viewingCard = null;

function renderCardDialog() {
  if (!viewingCard) return;
  const c = viewingCard;
  $('#card-dialog-title').textContent = c.name;
  $('#card-dialog-meta').textContent = cardLine(c);
  const effect = $('#card-dialog-effect');
  effect.textContent = c.effect || t('simulate.noEffect');
  effect.classList.toggle('muted', !c.effect);
}

function findCard(ref) {
  const parts = ref.split('-');
  if (parts[0] === 'hand') return hand[Number(parts[1])];
  if (parts[0] === 'zone') return zones[parts[1]]?.[Number(parts[2])];
  return messages[Number(parts[1])]?.card;
}

function onZoomClick(e) {
  const btn = e.target.closest('.card-zoom');
  if (!btn) return;
  viewingCard = findCard(btn.dataset.card);
  if (!viewingCard) return;
  renderCardDialog();
  bootstrap.Modal.getOrCreateInstance($('#card-dialog')).show();
}
$('#hand-list').addEventListener('click', onZoomClick);
$('#chat-messages').addEventListener('click', onZoomClick);
$('#zone-list').addEventListener('click', onZoomClick);
$('#zone-dialog-cards').addEventListener('click', onZoomClick); // 區域視窗中的放大鏡：效果視窗疊在上面，關閉後回到原視窗
// 不公開的卡：點一下顯示、再點一下遮回去
$('#zone-dialog-cards').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-peek]');
  if (!btn || !dialogZone) return;
  const card = zoneCards(dialogZone)[Number(btn.dataset.peek)];
  if (!card) return;
  if (peeked.has(card)) peeked.delete(card);
  else peeked.add(card);
  renderZoneDialog();
  $(`#zone-dialog-cards [data-peek="${btn.dataset.peek}"]`)?.focus({ preventScroll: true });
});
$('#card-dialog').addEventListener('hidden.bs.modal', () => { viewingCard = null; });

// ===== 移動手牌：每張手牌的漢堡選單，放入其他區域或放回牌堆最上方 / 最下方 =====
const HAND_DESTS = [...ZONES, 'deckTop', 'deckBottom'];

// 手牌選單的項目：不能放的區域停用並說明原因（僅限某種類、已滿），有上限的顯示目前張數
function handMenuItems(card) {
  return HAND_DESTS.map((dest) => {
    if (dest === 'deckTop' || dest === 'deckBottom') return { dest, label: destLabel(dest), icon: destIcon(dest) };
    const limit = ZONE_LIMITS[dest];
    let note = '';
    if (!zoneAccepts(dest, card)) note = t('simulate.typeOnly', { type: ZONE_TYPES[dest].map(typeLabel).join(t('list.sep')) });
    else if (zoneFull(dest)) note = t('simulate.zoneFull');
    else if (limit !== undefined) note = `${zones[dest].length} / ${limit}`;
    return { dest, label: t(`zone.${dest}`), icon: DEST_ICONS[dest] || 'bi-box-arrow-in-right', note, disabled: !canPlace(dest, card) };
  });
}

function moveFromHand(card, dest) {
  const i = hand.indexOf(card);
  if (i === -1) return;
  if (dest === 'deckTop' || dest === 'deckBottom') {
    hand.splice(i, 1);
    if (dest === 'deckTop') pile.unshift(card);
    else pile.push(card);
    addMessage({ role: 'log', key: dest === 'deckTop' ? 'log.toDeckTop' : 'log.toDeckBottom', params: { name: card.name, n: pile.length }, card });
  } else {
    if (!canPlace(dest, card)) return;
    hand.splice(i, 1);
    if (STACKED_ZONES.includes(dest)) zones[dest].unshift(card); // 放在最上方
    else zones[dest].push(card);
    if (HIDDEN_ZONES.includes(dest)) addMessage({ role: 'log', key: 'log.toZoneHidden', zone: dest });
    else addMessage({ role: 'log', key: 'log.toZone', params: { name: card.name }, zone: dest, card });
  }
  renderZones();
  renderHand();
  renderZoneList();
}

// ===== 區域視窗：點左側的區域（時計、處理）打開，選一張卡再選要放到哪裡 =====
// 去處寫法：區域代碼（hand、waitingRoom…），或「區域 + Top / Bottom」（deckTop、clockBottom…）
// 視窗保持開啟，可以連續處理
const DEST_ICONS = { hand: 'bi-hand-index-thumb', waitingRoom: 'bi-box-arrow-in-down', level: 'bi-star', memory: 'bi-bookmark', front: 'bi-arrow-up-square', back: 'bi-arrow-down-square' };
let dialogZone = null;     // 目前打開的區域

function parseDest(dest) {
  const m = /^(\w+?)(Top|Bottom)$/.exec(dest);
  return m ? { zone: m[1], pos: m[2].toLowerCase() } : { zone: dest, pos: null };
}

function zoneCards(zone) {
  return zone === 'deck' ? pile : zone === 'hand' ? hand : zones[zone];
}

function destLabel(dest) {
  const { zone, pos } = parseDest(dest);
  const name = t(`zone.${zone}`);
  if (pos === 'top') return t('simulate.zoneTop', { zone: name });
  if (pos === 'bottom') return t('simulate.zoneBottom', { zone: name });
  return name;
}

function destIcon(dest) {
  const { zone, pos } = parseDest(dest);
  if (pos) return pos === 'top' ? 'bi-arrow-bar-up' : 'bi-arrow-bar-down';
  return DEST_ICONS[zone] || 'bi-box-arrow-in-right';
}

// 去處是否能放（有上限的區域滿了就不能放）
const destAvailable = (dest) => !zoneFull(parseDest(dest).zone);

function zoneTitle(zone) {
  const n = zoneCards(zone).length;
  const limit = ZONE_LIMITS[zone];
  return `${t(`zone.${zone}`)} ${limit === undefined ? n : `${n} / ${limit}`}`;
}

// 查看牌庫的篩選：等級 / 顏色 / 種類；空字串代表全部，等級 'none' 代表沒有等級（名場面或沒填）
const NO_LEVEL = 'none';
const levelKey = (c) => (c.type === 'climax' || c.level === null || c.level === undefined ? NO_LEVEL : String(c.level));

function currentFilters() {
  return { level: $('#filter-level').value, color: $('#filter-color').value, type: $('#filter-type').value };
}

function cardMatches(c, f) {
  return (!f.level || levelKey(c) === f.level) && (!f.color || c.color === f.color) && (!f.type || c.type === f.type);
}

// 重新產生選項並保留原本的選擇；等級只列出目前牌堆中有的
function fillFilter(select, options) {
  const value = select.value;
  select.innerHTML = [['', t('simulate.filterAll')], ...options]
    .map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join('');
  select.value = options.some(([v]) => v === value) ? value : '';
}

function renderFilters(cards) {
  const levels = [...new Set(cards.map(levelKey))].sort((a, b) => (a === NO_LEVEL) - (b === NO_LEVEL) || Number(a) - Number(b));
  fillFilter($('#filter-level'), levels.map((l) => [l, l === NO_LEVEL ? t('simulate.noLevel') : l]));
  fillFilter($('#filter-color'), COLORS.map((c) => [c, colorLabel(c)]));
  fillFilter($('#filter-type'), TYPES.map((x) => [x, typeLabel(x)]));
}

// 牌堆的區域視窗另外有篩選
const FILTER_ZONES = ['deck'];

// 每張卡右上角的漢堡選單
// items：[{ dest, label, icon, note?, disabled? }]
function rowMenuHtml(i, items) {
  const list = items.map(({ dest, label, icon, note, disabled }) => `<li role="none"><button type="button" role="menuitem" data-zone-dest="${dest}" data-i="${i}"${disabled ? ' disabled' : ''}>
      <i class="bi ${icon}" aria-hidden="true"></i><span>${esc(label)}</span>${note ? `<small>${esc(note)}</small>` : ''}
    </button></li>`).join('');
  return `
    <div class="row-menu">
      <button type="button" class="card-btn row-menu-toggle" data-i="${i}" aria-haspopup="true" aria-expanded="false" title="${esc(t('simulate.cardActions'))}" aria-label="${esc(t('simulate.cardActions'))}">
        <i class="bi bi-list" aria-hidden="true"></i>
      </button>
      <ul class="nav-menu row-menu-list" role="menu" hidden>${list}</ul>
    </div>`;
}

// 區域視窗中有放大鏡（查看效果）的區域
const ZOOM_ZONES = ['resolution', 'clock', 'front', 'back', 'waitingRoom'];

function zoomButtonHtml(c, ref) {
  const label = esc(t('simulate.viewEffect'));
  return `<button type="button" class="card-btn card-zoom" data-card="${ref}" title="${label}" aria-label="${label}：${esc(c.name)}"><i class="bi bi-search" aria-hidden="true"></i></button>`;
}

// 區域視窗選單的項目：有上限的區域滿了就停用
function zoneMenuItems(actions) {
  return actions.map((dest) => {
    const available = destAvailable(dest);
    return { dest, label: destLabel(dest), icon: destIcon(dest), disabled: !available, note: available ? '' : t('simulate.zoneFull') };
  });
}

// 可操作的區域視窗（查看牌庫、時計、處理）：每張卡標示位置（第 1 張為最上方），功能放在漢堡選單；
// 牌堆另外可以依等級 / 顏色 / 種類篩選
function renderRowView(cards, actions, withFilters) {
  let shown = cards.map((c, i) => ({ c, i }));
  if (withFilters) {
    renderFilters(cards);
    const filters = currentFilters();
    shown = shown.filter(({ c }) => cardMatches(c, filters));
    $('#zone-filter-count').textContent = t('simulate.searchCount', { shown: shown.length, total: cards.length });
  }
  $('#zone-dialog-hint').textContent = '';
  $('#zone-dialog-cards').innerHTML = cards.length === 0
    ? `<p class="muted">${esc(t('simulate.zoneDialogEmpty', { zone: t(`zone.${dialogZone}`) }))}</p>`
    : shown.length === 0
      ? `<p class="muted">${esc(t('simulate.noMatch'))}</p>`
      : shown.map(({ c, i }) => `
      <div class="pick-card deck-row">
        <span class="row-pos">${i + 1}</span>
        <i class="dot ${c.color}" aria-hidden="true"></i>
        <span class="sim-card-body">
          <span class="sim-card-name">${esc(c.name)}</span>
          <span class="sim-card-meta">${esc(cardLine(c))}</span>
        </span>
        <div class="card-actions">
          ${ZOOM_ZONES.includes(dialogZone) ? zoomButtonHtml(c, `zone-${dialogZone}-${i}`) : ''}
          ${rowMenuHtml(i, zoneMenuItems(actions))}
        </div>
      </div>`).join('');
}

function closeRowMenus(except) {
  for (const menu of document.querySelectorAll('.row-menu-list')) {
    if (menu === except) continue;
    menu.hidden = true;
    menu.parentElement.querySelector('.row-menu-toggle').setAttribute('aria-expanded', 'false');
  }
}

function renderZoneDialog() {
  if (!dialogZone) return;
  const cards = zoneCards(dialogZone);
  const actions = ZONE_ACTIONS[dialogZone] || [];
  const withFilters = FILTER_ZONES.includes(dialogZone);
  $('#zone-dialog-title').textContent = zoneTitle(dialogZone);
  $('#zone-filters').hidden = !withFilters;
  // 時計、能量視窗底部：清空這一區
  const clearable = CLEARABLE_ZONES.includes(dialogZone);
  $('#zone-dialog-footer').hidden = !clearable;
  $('#btn-clear-zone').disabled = !clearable || cards.length === 0;
  $('#btn-clear-zone span').textContent = t('simulate.clearZone', { zone: t(`zone.${dialogZone}`) });
  if (actions.length > 0) {
    renderRowView(cards, actions, withFilters);
    return;
  }
  {
    // 不公開的區域（能量）：依順序列出（由最上方開始），每張卡先用模糊遮住，點了才顯示，再點一次遮回去
    $('#zone-dialog-hint').textContent = cards.length ? t('simulate.peekHint') : '';
    $('#zone-dialog-cards').innerHTML = cards.length
      ? cards.map((c, i) => {
        const shown = peeked.has(c);
        return `
      <button type="button" class="pick-card view-only spoiler${shown ? ' revealed' : ''}" data-peek="${i}" aria-pressed="${shown}" aria-label="${esc(shown ? c.name : t('simulate.peekCard', { n: i + 1 }))}">
        <span class="row-pos">${i + 1}</span>
        <span class="spoiler-content"${shown ? '' : ' aria-hidden="true"'}>
          <i class="dot ${c.color}" aria-hidden="true"></i>
          <span class="sim-card-body">
            <span class="sim-card-name">${esc(c.name)}</span>
            <span class="sim-card-meta">${esc(cardLine(c))}</span>
          </span>
        </span>
        <span class="spoiler-mask" aria-hidden="true"><span>${esc(t('simulate.tapToReveal'))}</span></span>
      </button>`;
      }).join('')
      : `<p class="muted">${esc(t('simulate.zoneDialogEmpty', { zone: t(`zone.${dialogZone}`) }))}</p>`;
  }
}

// 不公開區域中已點開的卡；每次打開視窗都重新遮住
const peeked = new Set();

function openZoneDialog(zone) {
  dialogZone = zone;
  peeked.clear();
  for (const id of ['#filter-level', '#filter-color', '#filter-type']) $(id).value = ''; // 每次打開都從「全部」開始
  renderZoneDialog();
  bootstrap.Modal.getOrCreateInstance($('#zone-dialog')).show();
}

// from：卡片所在的區域（預設為目前打開的區域視窗）
function moveFromZone(card, dest, from = dialogZone) {
  const source = zoneCards(from);
  const i = source.indexOf(card);
  if (i === -1 || !ZONE_ACTIONS[from].includes(dest) || !destAvailable(dest)) return;
  source.splice(i, 1);
  const { zone: to, pos } = parseDest(dest);
  if (to === 'hand') addToHand(card);
  else if (pos === 'top') zoneCards(to).unshift(card);
  else zoneCards(to).push(card);
  const key = pos === 'top' ? 'log.moveZoneTop' : pos === 'bottom' ? 'log.moveZoneBottom' : 'log.moveZone';
  if (HIDDEN_ZONES.includes(to)) addMessage({ role: 'log', key: `${key}Hidden`, zones: { from, to } });
  else addMessage({ role: 'log', key, params: { name: card.name }, zones: { from, to }, card });
  renderZones();
  renderHand();
  renderZoneList();
  renderZoneDialog();
}

$('#zone-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-open-zone]');
  if (btn) openZoneDialog(btn.dataset.openZone);
});
// 漢堡選單（手牌、區域視窗共用）：開關、選擇去處；一次只開一個，點其他地方收起，Esc 只收起選單
function setupRowMenus(container, onSelect) {
  container.addEventListener('click', (e) => {
    const toggle = e.target.closest('.row-menu-toggle');
    if (toggle) {
      const menu = toggle.parentElement.querySelector('.row-menu-list');
      const open = menu.hidden;
      closeRowMenus(menu);
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        placeRowMenu(toggle, menu);
        menu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
      }
      return;
    }
    const item = e.target.closest('.row-menu-list [data-zone-dest]');
    if (item && !item.disabled) onSelect(Number(item.dataset.i), item.dataset.zoneDest);
  });
  container.addEventListener('keydown', onRowMenuKeydown);
}

// 選單以 position: fixed 浮在最上層，不會被手牌列表、視窗等可捲動區塊裁掉；
// 依按鈕在畫面上的位置對齊右緣，下方空間不夠就往上開
function placeRowMenu(toggle, menu) {
  menu.classList.add('floating');
  const r = toggle.getBoundingClientRect();
  const height = menu.offsetHeight;
  const below = window.innerHeight - r.bottom;
  const up = below < height + 8 && r.top > below;
  menu.style.top = `${up ? Math.max(8, r.top - height - 2) : r.bottom + 2}px`;
  menu.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
}

function onRowMenuKeydown(e) {
  const menu = e.target.closest('.row-menu-list');
  if (!menu) return;
  const items = [...menu.querySelectorAll('button:not(:disabled)')];
  const i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation(); // 不讓 Bootstrap 關掉整個視窗
    menu.hidden = true;
    const toggle = menu.parentElement.querySelector('.row-menu-toggle');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
}

setupRowMenus($('#zone-dialog-cards'), (i, dest) => moveFromZone(zoneCards(dialogZone)[i], dest));
setupRowMenus($('#hand-list'), (i, dest) => moveFromHand(hand[i], dest));
// log 中的卡片：依目前所在的區域操作
setupRowMenus($('#chat-messages'), (i, dest) => {
  const card = messages[i]?.card;
  const loc = card && locateCard(card);
  if (loc === 'hand') moveFromHand(card, dest);
  else if (loc && ZONE_ACTIONS[loc] && !HIDDEN_ZONES.includes(loc)) moveFromZone(card, dest, loc);
});
document.addEventListener('click', (e) => { if (!e.target.closest('.row-menu')) closeRowMenus(); });
// 浮動選單不會跟著捲動，所以捲動列表或改變視窗大小時直接收起（捲動選單本身除外）
document.addEventListener('scroll', (e) => { if (!e.target.closest?.('.row-menu-list')) closeRowMenus(); }, true);
window.addEventListener('resize', () => closeRowMenus());
for (const id of ['#filter-level', '#filter-color', '#filter-type']) $(id).addEventListener('change', () => renderZoneDialog());

$('#zone-dialog').addEventListener('hidden.bs.modal', () => { dialogZone = null; });

// 清空區域（時計、能量）：牌依序全部送入休息室，視窗保持開啟
$('#btn-clear-zone').addEventListener('click', () => {
  const zone = dialogZone;
  if (!CLEARABLE_ZONES.includes(zone)) return;
  const moved = zones[zone].splice(0);
  if (moved.length === 0) return;
  zones.waitingRoom.push(...moved);
  addMessage({ role: 'log', key: 'log.clearZone', params: { n: moved.length }, zone });
  renderZones();
  renderZoneList();
  renderZoneDialog();
});

window.addEventListener('langchange', () => {
  render();
  renderCardDialog();
  renderZoneDialog();
});

render();
