'use strict';

// ===== 管理牌組頁 =====
// 需先載入 lib/bootstrap/bootstrap.bundle.min.js、i18n.js、common.js、rules.js、storage.js

// ===== 狀態 =====
let state = loadDecks();
let current = 0;          // 目前牌組的索引
let editingIndex = null;  // 正在編輯的卡片索引

function saveState() {
  if (!saveDecks(state)) toast(t('storage.saveFailed'), true);
}

const deck = () => state.decks[current];

// ===== 畫面 =====
const form = $('#card-form');
const field = (name) => form.elements.namedItem(name);

// 選項的值是代碼、文字是目前語言的名稱；重新填入時保留原本的選擇
function fillSelect(el, codes, labelOf, placeholderKey) {
  const value = el.value;
  el.innerHTML = (placeholderKey ? `<option value="">${esc(t(placeholderKey))}</option>` : '')
    + codes.map((c) => `<option value="${esc(c)}">${esc(labelOf(c))}</option>`).join('');
  el.value = codes.includes(value) ? value : el.options[0].value;
}

function fillFormSelects() {
  fillSelect(field('type'), TYPES, typeLabel, 'form.select');
  fillSelect(field('color'), COLORS, colorLabel, 'form.select');
  fillSelect(field('trigger'), TRIGGERS, triggerLabel);
}

function updateStatFields() {
  const allowed = STATS_BY_TYPE[field('type').value] ?? [];
  for (const el of form.querySelectorAll('.stat-field')) {
    el.hidden = !allowed.includes(el.dataset.key);
  }
}

function renderDeckSelect() {
  $('#deck-select').innerHTML = state.decks
    .map((d, i) => `<option value="${i}"${i === current ? ' selected' : ''}>${esc(t('deck.option', { name: d.name, n: deckSummary(d).total }))}</option>`)
    .join('');
  $('#deck-name').value = deck().name;
}

function renderStatus() {
  const { total, byType, byColor, problems } = deckSummary(deck());
  const ok = problems.length === 0;
  $('#deck-status').innerHTML = `
    <div class="status-main ${ok ? 'ok' : 'bad'}">
      <strong>${ok ? esc(t('status.ok')) : '✗ ' + esc(problems.join(t('list.sep')))}</strong>
    </div>
    <div class="meters">
      <div class="meter"><span>${esc(t('status.total'))}</span><b class="${total === DECK_SIZE ? 'ok' : 'bad'}">${total} / ${DECK_SIZE}</b></div>
      <div class="meter"><span>${esc(typeLabel('climax'))}</span><b class="${byType.climax <= MAX_CLIMAX ? '' : 'bad'}">${byType.climax} / ${MAX_CLIMAX}</b></div>
      ${TYPES.filter((x) => x !== 'climax').map((x) => `<div class="meter"><span>${esc(typeLabel(x))}</span><b>${byType[x]}</b></div>`).join('')}
      ${COLORS.map((c) => `<div class="meter"><span><i class="dot ${c}"></i>${esc(colorLabel(c))}</span><b>${byColor[c]}</b></div>`).join('')}
    </div>`;
}

function renderDeckList() {
  const d = deck();
  const { total } = deckSummary(d);
  $('#deck-count').textContent = t('list.count', { total, kinds: d.cards.length });

  if (d.cards.length === 0) {
    $('#deck-list').innerHTML = `<p class="empty">${esc(t('list.empty'))}</p>`;
    return;
  }

  const indexed = d.cards.map((c, i) => ({ c, i }));
  indexed.sort((a, b) =>
    TYPES.indexOf(a.c.type) - TYPES.indexOf(b.c.type)
    || (a.c.level ?? -1) - (b.c.level ?? -1)
    || COLORS.indexOf(a.c.color) - COLORS.indexOf(b.c.color)
    || a.c.name.localeCompare(b.c.name, getLang()));

  $('#deck-list').innerHTML = TYPES.map((type) => {
    const rows = indexed.filter(({ c }) => c.type === type);
    if (rows.length === 0) return '';
    const count = rows.reduce((n, { c }) => n + c.count, 0);
    return `
      <h3 class="group-title">${esc(typeLabel(type))}<span class="muted">${esc(t('list.groupCount', { n: count }))}</span></h3>
      ${rows.map(({ c, i }) => `
        <article class="card-row${i === editingIndex ? ' editing' : ''}">
          <i class="dot ${c.color}" title="${esc(colorLabel(c.color))}"></i>
          <div class="card-info">
            <div class="card-name">${esc(c.name)}</div>
            ${cardMeta(c) ? `<div class="card-meta">${esc(cardMeta(c))}</div>` : ''}
            ${c.effect ? `<div class="card-effect">${esc(c.effect)}</div>` : ''}
          </div>
          <div class="card-controls">
            <div class="stepper">
              <button type="button" class="btn icon" data-action="dec" data-i="${i}" aria-label="${esc(t('card.dec'))}">−</button>
              <span class="qty">${c.count}</span>
              <button type="button" class="btn icon" data-action="inc" data-i="${i}" aria-label="${esc(t('card.inc'))}">+</button>
            </div>
            <div class="row-actions">
              <button type="button" class="link" data-action="edit" data-i="${i}">${esc(t('card.edit'))}</button>
              <button type="button" class="link danger" data-action="remove" data-i="${i}">${esc(t('card.remove'))}</button>
            </div>
          </div>
        </article>`).join('')}`;
  }).join('');
}

function render() {
  renderDeckSelect();
  renderStatus();
  renderDeckList();
}

function commit() {
  saveState();
  render();
}

// ===== 表單 =====
function setFormError(msg) {
  $('#form-error').textContent = msg;
}

function resetForm() {
  form.reset();
  editingIndex = null;
  setI18nText($('#form-title'), 'form.addTitle');
  setI18nText($('#btn-submit'), 'form.submitAdd');
  $('#btn-cancel').hidden = true;
  setFormError('');
  updateStatFields();
}

function startEdit(i) {
  const c = deck().cards[i];
  editingIndex = i;
  for (const key of ['name', 'type', 'color', 'level', 'cost', 'power', 'soul', 'trigger', 'effect', 'count']) {
    field(key).value = c[key] ?? '';
  }
  updateStatFields();
  setFormError('');
  setI18nText($('#form-title'), 'form.editTitle');
  setI18nText($('#btn-submit'), 'form.submitUpdate');
  $('#btn-cancel').hidden = false;
  render();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  field('name').focus({ preventScroll: true });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let card;
  try {
    card = normalizeCard(Object.fromEntries(new FormData(form)));
  } catch (err) {
    setFormError(err.message);
    return;
  }
  const d = deck();
  if (editingIndex !== null) {
    d.cards[editingIndex] = card;
    toast(t('toast.updated', { name: card.name }));
  } else {
    const same = d.cards.find((c) => sameCard(c, card));
    if (same) same.count += card.count;
    else d.cards.push(card);
    toast(t('toast.added', { name: card.name, n: card.count }));
  }
  resetForm();
  commit();
});

field('type').addEventListener('change', updateStatFields);

// data-digits 欄位只允許輸入數字（輸入法組字中先不處理，組字結束再過濾）
function keepDigits(e) {
  const el = e.target;
  if (!el.matches('[data-digits]') || e.isComposing) return;
  const digits = el.value
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // 全形數字轉半形
    .replace(/\D/g, '');
  if (digits !== el.value) el.value = digits;
}
form.addEventListener('input', keepDigits);
form.addEventListener('compositionend', keepDigits);
$('#btn-cancel').addEventListener('click', () => { resetForm(); render(); });

// ===== 牌組內容操作 =====
$('#deck-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  const cards = deck().cards;
  const card = cards[i];
  if (!card) return;

  switch (btn.dataset.action) {
    case 'inc':
      card.count += 1;
      break;
    case 'dec':
      if (card.count > 1) { card.count -= 1; break; }
      // 剩 1 張時再減就移除
      // falls through
    case 'remove':
      if (btn.dataset.action === 'remove') {
        const ok = await confirmDialog({
          title: t('confirm.removeCardTitle'),
          message: t('confirm.removeCard', { name: card.name }),
          okText: t('card.remove'),
          danger: true,
        });
        if (!ok || cards[i] !== card) return; // 對話框開著時資料可能已變動
      }
      cards.splice(i, 1);
      if (editingIndex === i) resetForm();
      else if (editingIndex !== null && editingIndex > i) editingIndex -= 1;
      break;
    case 'edit':
      startEdit(i);
      return;
  }
  commit();
});

// ===== 牌組管理 =====
$('#deck-select').addEventListener('change', (e) => {
  current = Number(e.target.value);
  resetForm();
  render();
});

$('#btn-new-deck').addEventListener('click', () => {
  state.decks.push({ name: timestampName(), cards: [] });
  current = state.decks.length - 1;
  resetForm();
  commit();
  $('#deck-name').focus();
  $('#deck-name').select();
});

// 牌組名稱留空時自動以當下時間命名
$('#deck-name').addEventListener('change', (e) => {
  deck().name = deckName(e.target.value);
  commit();
});

$('#btn-delete-deck').addEventListener('click', async () => {
  const ok = await confirmDialog({
    title: t('deck.delete'),
    message: t('confirm.deleteDeck', { name: deck().name }),
    okText: t('confirm.deleteOk'),
    danger: true,
  });
  if (!ok) return;
  state.decks.splice(current, 1);
  ensureDeck(state);
  current = Math.min(current, state.decks.length - 1);
  resetForm();
  commit();
});

// ===== 匯出 / 匯入（僅限 .json）=====
// 匯出目前的牌組，檔名為牌組名稱；種類、顏色、觸發以代碼存放，任何語言都能匯入
$('#btn-export').addEventListener('click', () => {
  const d = deck();
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${d.name.replace(/[\\/:*?"<>|]/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// 匯入的牌組會新增在現有牌組之後，不會覆蓋
$('#file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!/\.json$/i.test(file.name)) {
    toast(t('import.onlyJson'), true);
    return;
  }
  try {
    addDecksFromJson(await file.text());
  } catch (err) {
    toast(t('import.failed', { msg: err.message }), true);
  }
});

// 解析 JSON 文字（一副牌組 { name, cards } 或多副 { decks: [...] }），新增在現有牌組之後；格式錯誤時丟出錯誤
function addDecksFromJson(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(t('import.invalidJson')); }
  const decks = Array.isArray(data?.decks) ? parseState(data).decks : [parseDeck(data)];
  state.decks.push(...decks);
  current = state.decks.length - decks.length;
  resetForm();
  commit();
  toast(t('import.done', { n: decks.length }));
  return decks.length;
}

// ===== 輸入 JSON：在視窗中直接貼上 JSON 建立牌組 =====
const pasteDialog = $('#paste-dialog');

$('#btn-paste-json').addEventListener('click', () => {
  $('#paste-json').value = '';
  $('#paste-error').textContent = '';
  bootstrap.Modal.getOrCreateInstance(pasteDialog).show();
});
pasteDialog.addEventListener('shown.bs.modal', () => $('#paste-json').focus());

// 格式錯誤時把訊息顯示在視窗裡，不關閉，方便修改後再送出
$('#paste-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('#paste-json').value.trim();
  if (!text) {
    $('#paste-error').textContent = t('deck.pasteEmpty');
    return;
  }
  try {
    addDecksFromJson(text);
    bootstrap.Modal.getOrCreateInstance(pasteDialog).hide();
  } catch (err) {
    $('#paste-error').textContent = err.message;
  }
});

// ===== 切換語言 =====
// 固定文字由 i18n.js 處理；這裡重畫選項與牌組內容。驗證訊息是舊語言，直接清掉。
window.addEventListener('langchange', () => {
  fillFormSelects();
  setFormError('');
  render();
});

// ===== 初始化 =====
// 舊資料（中文的種類、顏色、觸發）在讀取時就會轉成代碼，下次儲存時一併更新
fillFormSelects();
updateStatFields();
render();
