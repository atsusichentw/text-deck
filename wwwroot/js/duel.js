'use strict';

// ===== 對戰頁：建立 / 加入房間 =====
// 需先載入 lib/peerjs/peerjs.min.js、lib/bootstrap/bootstrap.bundle.min.js、i18n.js、common.js
// GitHub Pages 沒有伺服器，雙方以 WebRTC 點對點連線；PeerJS 的公用配對伺服器只負責牽線。
// 房間代碼就是房主的連線 ID（加上前綴），對方輸入代碼即可直接連到房主。

const ROOM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ROOM_CODE_LENGTH = 6;
const PEER_PREFIX = 'textdeck-room-';
const JOIN_TIMEOUT_MS = 15000;

let peer = null;     // 自己的 PeerJS 連線
let conn = null;     // 與對手之間的資料通道
let roomCode = null;
let isHost = false;
let joinTimer = null;

// ===== 畫面切換 =====
const VIEWS = ['lobby', 'host', 'join', 'room'];
function showView(name) {
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== name;
}

// 狀態文字記住翻譯 key，切換語言時會自動更新
function setStatus(sel, key, kind = '', params) {
  const el = $(sel);
  setI18nText(el, key, params);
  el.className = `room-status${kind ? ' ' + kind : ''}`;
}

// ===== 房間代碼 =====
// 以 crypto 亂數產生 6 位英數字（大寫 A–Z、0–9），捨棄會造成分布不均的值
function randomRoomCode() {
  const limit = 256 - (256 % ROOM_CHARS.length);
  let code = '';
  while (code.length < ROOM_CODE_LENGTH) {
    for (const b of crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))) {
      if (b < limit && code.length < ROOM_CODE_LENGTH) code += ROOM_CHARS[b % ROOM_CHARS.length];
    }
  }
  return code;
}

// 全形轉半形、轉大寫，只留英數字
function normalizeRoomCode(value) {
  return value.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

// 回傳 [翻譯 key, 參數]
function errorMessage(err) {
  switch (err?.type) {
    case 'browser-incompatible': return ['duel.errBrowser'];
    case 'peer-unavailable': return ['duel.errNotFound'];
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed': return ['duel.errServer'];
    default: return ['duel.errOther', { type: err?.type || err?.message || '?' }];
  }
}

// ===== 連線管理 =====
function closeAll() {
  clearTimeout(joinTimer);
  const c = conn;
  conn = null;
  c?.close();
  peer?.destroy();
  peer = null;
  roomCode = null;
}

function backToLobby() {
  closeAll();
  showView('lobby');
}

function enterRoom() {
  clearTimeout(joinTimer);
  $('#room-code-connected').textContent = roomCode;
  setStatus('#room-status', isHost ? 'duel.opponentJoined' : 'duel.joined', 'ok');
  showView('room');
}

function send(msg) {
  if (conn?.open) conn.send(msg);
}

// 雙方共用的資料通道事件
function attachConnection(c) {
  conn = c;
  c.on('open', () => {
    if (conn !== c) return;
    if (isHost) {
      send({ type: 'welcome' });
      enterRoom();
    }
  });
  c.on('data', (msg) => {
    if (conn !== c) return;
    if (msg?.type === 'welcome') enterRoom();
    if (msg?.type === 'full') {
      closeAll();
      setStatus('#join-status', 'duel.full', 'bad');
      $('#btn-join-submit').disabled = false;
    }
  });
  c.on('close', () => {
    if (conn !== c) return; // 自己主動關閉的不處理
    conn = null;
    if (isHost) {
      // 房間保留，繼續等下一位對手
      toast(t('duel.opponentLeft'));
      showView('host');
      setStatus('#host-status', 'duel.waiting', 'busy');
    } else {
      setStatus('#room-status', 'duel.hostClosed', 'bad');
    }
  });
}

// ===== 建立房間 =====
function createRoom(retries = 3) {
  closeAll();
  isHost = true;
  roomCode = randomRoomCode();
  $('#room-code').textContent = roomCode;
  setStatus('#host-status', 'duel.creating', 'busy');
  showView('host');

  const p = new Peer(PEER_PREFIX + roomCode);
  peer = p;
  p.on('open', () => setStatus('#host-status', 'duel.waiting', 'busy'));
  p.on('connection', (c) => {
    if (conn) {
      // 已有對手，拒絕其他人
      c.on('open', () => { c.send({ type: 'full' }); setTimeout(() => c.close(), 500); });
      return;
    }
    attachConnection(c);
  });
  // 等待中與配對伺服器斷線時自動重連（不影響已建立的對戰連線）
  p.on('disconnected', () => { if (peer === p && !p.destroyed) p.reconnect(); });
  p.on('error', (err) => {
    if (peer !== p) return;
    if (err.type === 'unavailable-id' && retries > 0) {
      createRoom(retries - 1); // 代碼剛好被用走，換一組
      return;
    }
    const [key, params] = errorMessage(err);
    setStatus('#host-status', key, 'bad', params);
  });
}

// ===== 加入房間 =====
function joinRoom(code) {
  closeAll();
  isHost = false;
  roomCode = code;
  setStatus('#join-status', 'duel.connecting', 'busy');
  $('#btn-join-submit').disabled = true;

  const p = new Peer();
  peer = p;
  const fail = (key, params) => {
    if (peer !== p) return;
    closeAll();
    setStatus('#join-status', key, 'bad', params);
    $('#btn-join-submit').disabled = false;
  };
  p.on('open', () => attachConnection(p.connect(PEER_PREFIX + code, { reliable: true })));
  p.on('error', (err) => fail(...errorMessage(err)));
  joinTimer = setTimeout(() => fail('duel.timeout'), JOIN_TIMEOUT_MS);
}

// ===== 事件 =====
$('#btn-create-room').addEventListener('click', () => {
  if (typeof Peer === 'undefined') { toast(t('duel.libFailed'), true); return; }
  createRoom();
});

$('#btn-join-room').addEventListener('click', () => {
  if (typeof Peer === 'undefined') { toast(t('duel.libFailed'), true); return; }
  $('#join-code').value = '';
  setStatus('#join-status', null);
  $('#btn-join-submit').disabled = false;
  showView('join');
  $('#join-code').focus();
});

$('#btn-copy-code').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#room-code').textContent);
    toast(t('duel.copied'));
  } catch {
    toast(t('duel.copyFailed'), true);
  }
});

// 代碼輸入框只保留英數字（輸入法組字中先不處理）
function keepRoomCode(e) {
  if (e.isComposing) return;
  const el = $('#join-code');
  const code = normalizeRoomCode(el.value);
  if (code !== el.value) el.value = code;
}
$('#join-code').addEventListener('input', keepRoomCode);
$('#join-code').addEventListener('compositionend', keepRoomCode);

$('#view-join').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = normalizeRoomCode($('#join-code').value);
  if (code.length !== ROOM_CODE_LENGTH) {
    setStatus('#join-status', 'duel.codeLength', 'bad', { n: ROOM_CODE_LENGTH });
    return;
  }
  joinRoom(code);
});

$('#btn-cancel-host').addEventListener('click', backToLobby);
$('#btn-cancel-join').addEventListener('click', backToLobby);
$('#btn-leave').addEventListener('click', async () => {
  const ok = await confirmDialog({
    title: t('duel.leave'),
    message: t('duel.confirmLeave'),
    okText: t('duel.leave'),
    danger: true,
  });
  if (!ok) return;
  backToLobby();
});

window.addEventListener('pagehide', closeAll);
