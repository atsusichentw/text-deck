'use strict';

// ===== 卡片與牌組規則（管理牌組、對戰共用）=====
// 需先載入 i18n.js。
// 種類、顏色、觸發在資料中一律存成與語言無關的代碼，畫面上再用 t('type.character') 等翻譯。
const TYPES = ['character', 'event', 'climax'];
const COLORS = ['yellow', 'green', 'red', 'blue'];
const TRIGGERS = ['none', 'soul+1', 'soul+2', 'pool', 'comeback', 'return', 'draw', 'treasure', 'shot', 'gate', 'choice', 'standby', 'discovery', 'chance', 'focus'];
const STATS = ['level', 'cost', 'power', 'soul'];
// 各種類可填寫的數值欄位
const STATS_BY_TYPE = {
  character: ['level', 'cost', 'power', 'soul'],
  event: ['level', 'cost'],
  climax: [],
};
const DECK_SIZE = 50;
const MAX_CLIMAX = 8;

const typeLabel = (code) => t(`type.${code}`);
const colorLabel = (code) => t(`color.${code}`);
const triggerLabel = (code) => t(`trigger.${code}`);
const statLabel = (key) => t(`stat.${key}`);

// 把代碼或任一語言的名稱（例如舊資料的「角色」「魂+1」）轉成代碼，找不到回傳 null
function toCode(codes, prefix, value) {
  const v = String(value ?? '').trim();
  if (codes.includes(v)) return v;
  const lower = v.toLowerCase();
  for (const lang of LANGS) {
    const found = codes.find((c) => MESSAGES[lang.value][`${prefix}.${c}`]?.toLowerCase() === lower);
    if (found) return found;
  }
  return null;
}

// ===== 資料驗證 =====
function parseNonNegative(value, label) {
  const s = String(value ?? '').trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) throw new Error(t('error.nonNegative', { label }));
  return Number(s);
}

function normalizeCard(raw) {
  const name = String(raw?.name ?? '').trim();
  if (!name) throw new Error(t('error.name'));
  const type = toCode(TYPES, 'type', raw.type);
  if (!type) throw new Error(t('error.type'));
  const color = toCode(COLORS, 'color', raw.color);
  if (!color) throw new Error(t('error.color'));
  const trigger = raw.trigger ? toCode(TRIGGERS, 'trigger', raw.trigger) : 'none';
  if (!trigger) throw new Error(t('error.trigger', { name: raw.trigger }));

  const card = { name, type, color };
  for (const key of STATS) {
    card[key] = STATS_BY_TYPE[type].includes(key) ? parseNonNegative(raw[key], statLabel(key)) : null;
  }
  card.trigger = trigger;
  card.effect = String(raw.effect ?? '').trim();

  const count = parseNonNegative(raw.count ?? 1, t('field.count'));
  if (!count) throw new Error(t('error.count'));
  card.count = count;
  return card;
}

// 沒有填牌組名稱時，以當下時間命名，例如 20261002_105300
function timestampName(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

function deckName(value) {
  return String(value ?? '').trim().slice(0, 100) || timestampName();
}

function parseDeck(d) {
  if (!d || !Array.isArray(d.cards)) throw new Error(t('error.noCards'));
  const name = deckName(d.name);
  return {
    name,
    cards: d.cards.map((c, j) => {
      try { return normalizeCard(c); } catch (e) { throw new Error(t('error.cardAt', { deck: name, n: j + 1, msg: e.message })); }
    }),
  };
}

function parseState(data) {
  if (!data || !Array.isArray(data.decks)) throw new Error(t('error.noDecks'));
  return { decks: data.decks.map(parseDeck) };
}

function sameCard(a, b) {
  return ['name', 'type', 'color', 'level', 'cost', 'power', 'soul', 'trigger', 'effect'].every((k) => a[k] === b[k]);
}

// 統計牌組張數，並列出不符合規則的地方（problems 為空表示可用來對戰）
function deckSummary(d) {
  const byType = Object.fromEntries(TYPES.map((x) => [x, 0]));
  const byColor = Object.fromEntries(COLORS.map((x) => [x, 0]));
  let total = 0;
  for (const c of d.cards) {
    total += c.count;
    byType[c.type] += c.count;
    byColor[c.color] += c.count;
  }
  const problems = [];
  if (total < DECK_SIZE) problems.push(t('problem.short', { n: DECK_SIZE - total }));
  if (total > DECK_SIZE) problems.push(t('problem.over', { n: total - DECK_SIZE }));
  if (byType.climax > MAX_CLIMAX) problems.push(t('problem.climax', { n: byType.climax - MAX_CLIMAX }));
  return { total, byType, byColor, problems };
}

function cardMeta(c) {
  const parts = STATS_BY_TYPE[c.type].map((k) => `${statLabel(k)} ${c[k] ?? '—'}`);
  if (c.trigger !== 'none') parts.push(t('card.triggerMeta', { name: triggerLabel(c.trigger) }));
  return parts.join(' · ');
}
