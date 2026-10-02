'use strict';

// ===== 對戰頁：手動交換連線碼，兩個瀏覽器以 WebRTC 直接連線 =====
// 需先載入 lib/bootstrap/bootstrap.bundle.min.js、i18n.js、common.js
// 不經過任何配對伺服器：
//   房主產生「連線碼」(offer) → 自行傳給對手 → 對手貼上後產生「回覆碼」(answer) → 傳回給房主貼上 → 連線
// 連線碼內含 WebRTC 的連線資訊（SDP），壓縮後以 base64url 表示，方便複製貼上。
// STUN 只用來讓瀏覽器查出自己的對外網路位址，連線碼與對戰資料都不會經過它；
// 少了它就只有同一個區域網路內的裝置能互連。

const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const ICE_GATHER_TIMEOUT_MS = 4000;   // 收集連線位址最多等多久，逾時就用已收集到的
const CONNECT_TIMEOUT_MS = 20000;     // 房主貼上回覆碼後，多久沒連上就視為失敗
const CODE_PREFIX_DEFLATE = 'TD1';    // 壓縮過的代碼
const CODE_PREFIX_PLAIN = 'TD0';      // 瀏覽器不支援壓縮時的代碼

let pc = null;          // RTCPeerConnection
let channel = null;     // 與對手之間的資料通道
let role = null;        // 'host' | 'guest'
let session = 0;        // 每次開始或結束都 +1，讓舊的非同步結果失效
let connectTimer = null;

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

// ===== 連線碼編碼 =====
function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// 資料損毀時，錯誤會由讀取端拋出；寫入端的同一個錯誤在這裡吃掉，避免出現未處理的 Promise 錯誤
async function transform(bytes, stream) {
  const writer = stream.writable.getWriter();
  writer.write(bytes).catch(() => {});
  writer.close().catch(() => {});
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

// kind：'offer'（房主的連線碼）或 'answer'（對手的回覆碼）
async function encodeSignal(kind, sdp) {
  const bytes = new TextEncoder().encode(JSON.stringify({ k: kind, s: sdp }));
  if (typeof CompressionStream === 'undefined') return `${CODE_PREFIX_PLAIN}.${toBase64Url(bytes)}`;
  return `${CODE_PREFIX_DEFLATE}.${toBase64Url(await transform(bytes, new CompressionStream('deflate-raw')))}`;
}

// 解析貼上的代碼；格式不對時丟出以翻譯 key 為訊息的錯誤
async function decodeSignal(text) {
  const code = text.replace(/\s+/g, ''); // 通訊軟體可能自動換行，先去掉空白
  const match = /^(TD[01])\.([A-Za-z0-9_-]+)$/.exec(code);
  if (!match) throw new Error('duel.badCode');
  try {
    let bytes = fromBase64Url(match[2]);
    if (match[1] === CODE_PREFIX_DEFLATE) bytes = await transform(bytes, new DecompressionStream('deflate-raw'));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if ((data.k !== 'offer' && data.k !== 'answer') || typeof data.s !== 'string') throw new Error();
    return { kind: data.k, sdp: data.s };
  } catch {
    throw new Error('duel.badCode');
  }
}

// ===== 連線診斷 =====
// 連不上時，把雙方的網路位址類型、NAT 類型與各階段時間顯示出來，方便判斷原因。
// 公網 IP 只顯示前兩段，避免把完整位址貼給別人。
let diag = null;

function maskIp(addr) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(addr)) return addr.split('.').slice(0, 2).join('.') + '.x.x';
  if (addr.includes(':')) return addr.split(':').slice(0, 2).join(':') + ':…';
  return addr.endsWith('.local') ? 'mDNS' : addr;
}

// 解析 SDP 中的 UDP 連線位址；同一個公網 IP 對不同 STUN 伺服器出現不同 port，表示是對稱式 NAT
function analyzeCandidates(sdp) {
  const list = [...(sdp || '').matchAll(/a=candidate:\S+ \d+ (\S+) \d+ (\S+) (\d+) typ (\S+)/g)]
    .map(([, proto, addr, port, type]) => ({ proto: proto.toLowerCase(), addr, port, type }))
    .filter((c) => c.proto === 'udp');
  const counts = {};
  for (const c of list) counts[c.type] = (counts[c.type] || 0) + 1;
  const srflx = list.filter((c) => c.type === 'srflx');
  const portsByIp = {};
  for (const c of srflx) (portsByIp[c.addr] ||= new Set()).add(c.port);
  let nat = 'diag.natUnknown';
  if (!srflx.length) nat = 'diag.natNone';
  else if (Object.values(portsByIp).some((s) => s.size > 1)) nat = 'diag.natSymmetric';
  else if (srflx.length > 1) nat = 'diag.natCone';
  return {
    summary: Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(', ') || '—',
    nat,
    srflx: srflx.map((c) => `${maskIp(c.addr)}:${c.port}`).join(' '),
  };
}

function clock() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

function diagStart(p) {
  diag = { p, start: performance.now(), log: [] };
  p.addEventListener('icegatheringstatechange', () => diagLog(`ICE gathering: ${p.iceGatheringState}`));
  p.addEventListener('iceconnectionstatechange', () => diagLog(`ICE: ${p.iceConnectionState}`));
  p.addEventListener('connectionstatechange', () => {
    diagLog(`connection: ${p.connectionState}`);
    if (p.connectionState === 'connected') diagSelectedPair(p);
  });
  diagLog('start');
}

function diagLog(msg) {
  if (!diag) return;
  diag.log.push(`${clock()} (+${((performance.now() - diag.start) / 1000).toFixed(1)}s) ${msg}`);
  renderDiag();
}

// 連上時記錄實際使用的位址類型（host = 區網、srflx = 透過 NAT 打洞、prflx = 連線中才發現的位址）
async function diagSelectedPair(p) {
  try {
    const stats = [...(await p.getStats()).values()];
    const pair = stats.find((s) => s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated);
    if (!pair) return;
    const type = (id) => stats.find((s) => s.id === id)?.candidateType || '?';
    diagLog(`pair: ${type(pair.localCandidateId)} ↔ ${type(pair.remoteCandidateId)}`);
  } catch { /* 取不到統計資料就略過 */ }
}

function renderDiag() {
  if (!diag) return;
  const p = diag.p;
  const local = analyzeCandidates(p.localDescription?.sdp);
  const remote = analyzeCandidates(p.remoteDescription?.sdp);
  const line = (label, a) => `${t(label)}: ${a.summary} | ${t(a.nat)}${a.srflx ? ` | ${a.srflx}` : ''}`;
  $('#diag-text').textContent = [
    `${t('diag.role')}: ${t(role === 'host' ? 'diag.host' : 'diag.guest')} | ${navigator.userAgent.match(/(Edg|Chrome|Firefox|Safari)\/[\d.]+/g)?.pop() || '?'}`,
    line('diag.local', local),
    p.remoteDescription ? line('diag.remote', remote) : `${t('diag.remote')}: —`,
    '',
    ...diag.log,
  ].join('\n');
  $('#diag').hidden = false;
}

window.addEventListener('langchange', renderDiag);

// ===== WebRTC =====
// 等待瀏覽器收集完連線位址（ICE candidates），才把完整資訊放進代碼
function waitIceGathering(p) {
  if (p.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      p.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => { if (p.iceGatheringState === 'complete') done(); };
    p.addEventListener('icegatheringstatechange', check);
    const timer = setTimeout(done, ICE_GATHER_TIMEOUT_MS);
  });
}

function closeAll() {
  session += 1;
  clearTimeout(connectTimer);
  const ch = channel;
  const p = pc;
  channel = null;
  pc = null;
  ch?.close();
  p?.close();
}

function backToLobby() {
  closeAll();
  diag = null;
  $('#diag').hidden = true;
  $('#diag').open = false;
  showView('lobby');
}

function newPeer() {
  const p = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  diagStart(p);
  p.addEventListener('connectionstatechange', () => {
    if (pc === p && p.connectionState === 'failed') onConnectFailed();
  });
  return p;
}

function statusSelector() {
  if (!$('#view-room').hidden) return '#room-status';
  return role === 'host' ? '#host-status' : '#join-status';
}

function onConnectFailed() {
  clearTimeout(connectTimer);
  setStatus(statusSelector(), 'duel.failed', 'bad');
  if (role === 'host') $('#btn-connect').disabled = false;
  $('#diag').open = true; // 連不上時直接展開診斷資訊
}

// 雙方共用的資料通道事件
function attachChannel(ch) {
  channel = ch;
  ch.addEventListener('open', () => {
    if (channel !== ch) return;
    clearTimeout(connectTimer);
    setStatus('#room-status', role === 'host' ? 'duel.opponentJoined' : 'duel.joined', 'ok');
    showView('room');
  });
  ch.addEventListener('close', () => {
    if (channel !== ch) return; // 自己主動關閉的不處理
    channel = null;
    setStatus('#room-status', 'duel.peerLeft', 'bad');
  });
  // 對戰資料之後由這裡接收
  ch.addEventListener('message', () => {});
}

function supportsWebRTC() {
  if (typeof RTCPeerConnection !== 'undefined') return true;
  toast(t('duel.errBrowser'), true);
  return false;
}

// ===== 建立房間（房主）=====
async function createRoom() {
  closeAll();
  const my = session;
  role = 'host';
  $('#offer-code').value = '';
  $('#answer-input').value = '';
  $('#btn-copy-offer').disabled = true;
  $('#btn-connect').disabled = true;
  setStatus('#host-status', 'duel.preparing', 'busy');
  showView('host');

  try {
    const p = newPeer();
    pc = p;
    attachChannel(p.createDataChannel('tdeck', { ordered: true }));
    await p.setLocalDescription(await p.createOffer());
    await waitIceGathering(p);
    if (my !== session) return;
    $('#offer-code').value = await encodeSignal('offer', p.localDescription.sdp);
    diagLog('offer code ready');
    $('#btn-copy-offer').disabled = false;
    $('#btn-connect').disabled = false;
    setStatus('#host-status', 'duel.waitingAnswer', 'busy');
  } catch (err) {
    console.warn(err);
    if (my === session) setStatus('#host-status', 'duel.errBrowser', 'bad');
  }
}

// 房主貼上對手的回覆碼
async function acceptAnswer(text) {
  const my = session;
  if (!text.trim()) { setStatus('#host-status', 'duel.pasteFirst', 'bad'); return; }
  let signal;
  try {
    signal = await decodeSignal(text);
  } catch (err) {
    setStatus('#host-status', err.message, 'bad');
    return;
  }
  if (my !== session) return;
  if (signal.kind !== 'answer') { setStatus('#host-status', 'duel.notAnswer', 'bad'); return; }
  if (pc?.signalingState !== 'have-local-offer') { setStatus('#host-status', 'duel.codeUsed', 'bad'); return; }

  $('#btn-connect').disabled = true;
  setStatus('#host-status', 'duel.connecting', 'busy');
  try {
    await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
    diagLog('answer applied');
    connectTimer = setTimeout(() => { if (my === session && channel?.readyState !== 'open') onConnectFailed(); }, CONNECT_TIMEOUT_MS);
  } catch (err) {
    console.warn(err);
    if (my !== session) return;
    setStatus('#host-status', 'duel.badCode', 'bad');
    $('#btn-connect').disabled = false;
  }
}

// ===== 加入房間（對手）=====
function openJoin() {
  closeAll();
  role = 'guest';
  $('#offer-input').value = '';
  $('#offer-input').readOnly = false;
  $('#btn-make-answer').disabled = false;
  $('#answer-code').value = '';
  $('#answer-step').hidden = true;
  setStatus('#join-status', null);
  showView('join');
  $('#offer-input').focus();
}

// 對手貼上房主的連線碼，產生回覆碼
async function makeAnswer(text) {
  closeAll();
  const my = session;
  role = 'guest';
  if (!text.trim()) { setStatus('#join-status', 'duel.pasteFirst', 'bad'); return; }
  let signal;
  try {
    signal = await decodeSignal(text);
  } catch (err) {
    setStatus('#join-status', err.message, 'bad');
    return;
  }
  if (my !== session) return;
  if (signal.kind !== 'offer') { setStatus('#join-status', 'duel.notOffer', 'bad'); return; }

  $('#btn-make-answer').disabled = true;
  setStatus('#join-status', 'duel.preparing', 'busy');
  try {
    const p = newPeer();
    pc = p;
    p.addEventListener('datachannel', (e) => { if (pc === p) attachChannel(e.channel); });
    await p.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
    diagLog('offer applied');
    await p.setLocalDescription(await p.createAnswer());
    await waitIceGathering(p);
    if (my !== session) return;
    $('#answer-code').value = await encodeSignal('answer', p.localDescription.sdp);
    diagLog('answer code ready');
    $('#offer-input').readOnly = true;
    $('#answer-step').hidden = false;
    setStatus('#join-status', 'duel.waitingHost', 'busy');
  } catch (err) {
    console.warn(err);
    if (my !== session) return;
    closeAll();
    setStatus('#join-status', 'duel.badCode', 'bad');
    $('#btn-make-answer').disabled = false;
  }
}

// ===== 複製 =====
async function copyCode(sel) {
  const box = $(sel);
  try {
    await navigator.clipboard.writeText(box.value);
    toast(t('duel.copied'));
  } catch {
    box.select(); // 無法自動複製時先幫忙選取，讓使用者自己按複製
    toast(t('duel.copyFailed'), true);
  }
}

// ===== 事件 =====
$('#btn-create-room').addEventListener('click', () => { if (supportsWebRTC()) createRoom(); });
$('#btn-join-room').addEventListener('click', () => { if (supportsWebRTC()) openJoin(); });
$('#btn-copy-offer').addEventListener('click', () => copyCode('#offer-code'));
$('#btn-copy-answer').addEventListener('click', () => copyCode('#answer-code'));
$('#btn-copy-diag').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#diag-text').textContent);
    toast(t('duel.copied'));
  } catch {
    toast(t('duel.copyFailed'), true);
  }
});

$('#answer-form').addEventListener('submit', (e) => {
  e.preventDefault();
  acceptAnswer($('#answer-input').value);
});

$('#offer-form').addEventListener('submit', (e) => {
  e.preventDefault();
  makeAnswer($('#offer-input').value);
});

$('#btn-cancel-host').addEventListener('click', backToLobby);
$('#btn-cancel-join').addEventListener('click', backToLobby);
$('#btn-leave').addEventListener('click', async () => {
  // 對手已經離開時直接回大廳，不用再確認
  if (channel) {
    const ok = await confirmDialog({
      title: t('duel.leave'),
      message: t('duel.confirmLeave'),
      okText: t('duel.leave'),
      danger: true,
    });
    if (!ok) return;
  }
  backToLobby();
});

window.addEventListener('pagehide', closeAll);
