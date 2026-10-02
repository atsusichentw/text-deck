'use strict';

// ===== 深色 / 淺色 / 自動 =====
// 放在 <head> 裡同步載入，在畫面繪製前套用設定，避免閃一下錯的顏色。
// 自動：不設 data-theme，交給 CSS 的 prefers-color-scheme 依系統設定決定。
const THEME_KEY = 'textdeck-theme';
// icon 為 Bootstrap Icons 的類別名稱；顯示名稱在 i18n.js 的 theme.light 等
const THEMES = [
  { value: 'light', icon: 'bi-sun-fill' },
  { value: 'dark', icon: 'bi-moon-stars-fill' },
  { value: 'auto', icon: 'bi-circle-half' },
];

function getTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return THEMES.some((x) => x.value === t) ? t : 'auto';
  } catch {
    return 'auto';
  }
}

function applyTheme(theme) {
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = theme;
}

function setTheme(theme) {
  applyTheme(theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* 無法儲存時只在本頁生效 */ }
}

applyTheme(getTheme());
