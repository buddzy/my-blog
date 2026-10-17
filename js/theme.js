// 다크 모드 토글. 저장된 테마는 <head>의 인라인 스크립트가 먼저 적용해 깜빡임을 막는다.

const STORAGE_KEY = 'theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
  return document.documentElement.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 저장소를 쓸 수 없으면 이번 방문 동안만 적용한다.
  }
}

export function initThemeToggle(button) {
  if (!button) return;

  const update = () => {
    const theme = currentTheme();
    button.dataset.current = theme;
    button.setAttribute('aria-label', theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
  };

  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    saveTheme(next);
    update();
  });

  darkQuery.addEventListener('change', update);
  update();
}
