'use strict';

// ===== 各頁共用的小工具 =====
const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// ===== 確認對話框（Bootstrap modal，取代瀏覽器的 confirm）=====
// 需先載入 lib/bootstrap/bootstrap.bundle.min.js 與 i18n.js。
// 用法：if (!(await confirmDialog({ title, message, okText, danger: true }))) return;
// 回傳 Promise<boolean>：按確定為 true；按取消、×、Esc 或點背景為 false。
let dialogEl = null;

function getDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = document.createElement('div');
  dialogEl.className = 'modal fade';
  dialogEl.id = 'confirm-dialog';
  dialogEl.tabIndex = -1;
  dialogEl.setAttribute('aria-labelledby', 'confirm-dialog-title');
  dialogEl.setAttribute('aria-describedby', 'confirm-dialog-message');
  dialogEl.setAttribute('aria-hidden', 'true');
  dialogEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title" id="confirm-dialog-title"></h2>
          <button type="button" class="modal-close" data-bs-dismiss="modal"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
        </div>
        <div class="modal-body"><p id="confirm-dialog-message"></p></div>
        <div class="modal-footer">
          <button type="button" class="btn" data-bs-dismiss="modal" data-role="cancel"></button>
          <button type="button" class="btn primary" data-role="ok"></button>
        </div>
      </div>
    </div>`;
  document.body.append(dialogEl);
  return dialogEl;
}

function confirmDialog({ title, message, okText, cancelText, danger = false }) {
  if (typeof bootstrap === 'undefined') return Promise.resolve(window.confirm(message)); // 元件載入失敗時的備案

  const el = getDialog();
  const ok = el.querySelector('[data-role="ok"]');
  const cancel = el.querySelector('[data-role="cancel"]');
  el.querySelector('.modal-title').textContent = title;
  el.querySelector('#confirm-dialog-message').textContent = message;
  el.querySelector('.modal-close').setAttribute('aria-label', t('dialog.close'));
  ok.textContent = okText || t('dialog.ok');
  ok.className = `btn ${danger ? 'danger-solid' : 'primary'}`;
  cancel.textContent = cancelText || t('dialog.cancel');

  const modal = bootstrap.Modal.getOrCreateInstance(el);
  return new Promise((resolve) => {
    let result = false;
    const onOk = () => { result = true; modal.hide(); };
    // 危險操作預設停在「取消」，避免按 Enter 誤刪
    const onShown = () => (danger ? cancel : ok).focus();
    const onHidden = () => {
      ok.removeEventListener('click', onOk);
      el.removeEventListener('shown.bs.modal', onShown);
      resolve(result);
    };
    ok.addEventListener('click', onOk);
    el.addEventListener('shown.bs.modal', onShown);
    el.addEventListener('hidden.bs.modal', onHidden, { once: true });
    modal.show();
  });
}

// 畫面下方的提示訊息
let toastTimer;
function toast(msg, isError = false) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = msg;
  el.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, isError ? 5000 : 2200);
}
