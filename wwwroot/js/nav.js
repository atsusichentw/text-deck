'use strict';

// ===== 導覽列 =====
// 各頁放一個 <header id="navbar"></header>，由這裡統一產生內容，新增頁面只要改 NAV_ITEMS。
// 路徑以網站根目錄為準；根目錄由本檔位置（wwwroot/js/nav.js）推算，
// 所以放在 GitHub Pages 的 /text-deck/ 底下或本機根目錄都能正確連結。
// 右上角的語言、主題切換需要先在 <head> 載入 theme.js、i18n.js 與 lib/bootstrap-icons。
const NAV_ITEMS = [
  { path: 'pages/simulate/', key: 'nav.simulate' },
  { path: 'pages/deck/', key: 'nav.deck' },
];
const SITE_ROOT = new URL('../../', document.querySelector('script[src$="wwwroot/js/nav.js"]').src);

// 圓形 icon 按鈕＋下拉選單（語言、顯示模式共用）
// options: { id, labelKey, currentKey, items: [{ value, label(), icon? }], getValue(), iconOf(value), onSelect(value) }
function createDropdown(options) {
  const wrap = document.createElement('div');
  wrap.className = 'nav-dropdown';
  wrap.innerHTML = `
    <button type="button" class="nav-toggle" aria-haspopup="true" aria-expanded="false" aria-controls="${options.id}">
      <i class="bi" aria-hidden="true"></i>
      <span class="visually-hidden"></span>
    </button>
    <ul class="nav-menu" id="${options.id}" role="menu" hidden>
      ${options.items.map(({ value, icon }) => `
        <li role="none">
          <button type="button" role="menuitemradio" data-value="${value}">
            ${icon ? `<i class="bi ${icon}" aria-hidden="true"></i>` : ''}<span class="label"></span><i class="bi bi-check2 check" aria-hidden="true"></i>
          </button>
        </li>`).join('')}
    </ul>`;

  const toggle = wrap.querySelector('.nav-toggle');
  const menu = wrap.querySelector('.nav-menu');
  const buttons = [...menu.querySelectorAll('[data-value]')];

  // 依目前語言與選擇更新文字、icon、打勾
  function refresh() {
    const value = options.getValue();
    const item = options.items.find((x) => x.value === value);
    toggle.querySelector('.bi').className = `bi ${options.iconOf(value)}`;
    const text = t(options.currentKey, { name: item.label() });
    toggle.querySelector('.visually-hidden').textContent = text;
    toggle.title = text;
    menu.setAttribute('aria-label', t(options.labelKey));
    for (const b of buttons) {
      b.querySelector('.label').textContent = options.items.find((x) => x.value === b.dataset.value).label();
      b.setAttribute('aria-checked', String(b.dataset.value === value));
    }
  }

  function open(focusIndex) {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    if (focusIndex !== undefined) buttons[(focusIndex + buttons.length) % buttons.length].focus();
  }

  function close(returnFocus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    if (menu.hidden) open(buttons.findIndex((b) => b.getAttribute('aria-checked') === 'true'));
    else close();
  });
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); open(0); }
    if (e.key === 'ArrowUp') { e.preventDefault(); open(-1); }
  });
  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-value]');
    if (!btn) return;
    close(true);
    options.onSelect(btn.dataset.value);
    refresh();
  });
  // 選單中以上下鍵移動、Esc 關閉
  menu.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length].focus(); }
    if (e.key === 'Home') { e.preventDefault(); buttons[0].focus(); }
    if (e.key === 'End') { e.preventDefault(); buttons[buttons.length - 1].focus(); }
    if (e.key === 'Tab') close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) close(true); });
  // 點選單以外的地方就關閉
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
  window.addEventListener('langchange', refresh);

  refresh();
  return wrap;
}

(function renderNavbar() {
  const header = document.getElementById('navbar');
  if (!header) return;
  const here = location.pathname.replace(/index\.html$/, '');
  header.className = 'navbar';
  header.innerHTML = `
    <a class="brand" href="${SITE_ROOT.href}"><span class="brand-mark">T</span>Deck</a>
    <nav data-i18n-aria-label="nav.menu" aria-label="${esc(t('nav.menu'))}">
      ${NAV_ITEMS.map(({ path, key }) => {
        const url = new URL(path, SITE_ROOT);
        return `<a href="${url.href}" data-i18n="${key}"${url.pathname === here ? ' aria-current="page"' : ''}>${esc(t(key))}</a>`;
      }).join('')}
    </nav>
    <div class="nav-tools"></div>`;

  header.querySelector('.nav-tools').append(
    createDropdown({
      id: 'lang-menu',
      labelKey: 'lang.label',
      currentKey: 'lang.current',
      items: LANGS.map((l) => ({ value: l.value, label: () => l.label })),
      getValue: getLang,
      iconOf: () => 'bi-globe2',
      onSelect: setLang,
    }),
    createDropdown({
      id: 'theme-menu',
      labelKey: 'theme.label',
      currentKey: 'theme.current',
      items: THEMES.map((x) => ({ value: x.value, icon: x.icon, label: () => t(`theme.${x.value}`) })),
      getValue: getTheme,
      iconOf: (v) => THEMES.find((x) => x.value === v).icon,
      onSelect: setTheme,
    }),
  );
})();
