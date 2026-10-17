---
title: CSS 변수로 다크 모드 만들기
date: 2026-10-17
tags: [CSS, 웹개발, 다크모드]
description: OS 설정을 따르면서 사용자가 직접 바꿀 수도 있는 다크 모드를 CSS 변수로 구현하는 방법입니다.
---

다크 모드를 깔끔하게 구현하는 핵심은 **색을 모두 변수로 관리하는 것**입니다. 컴포넌트는 변수만 참조하고, 테마가 바뀌면 변수 값만 바꿉니다.

## 1. 색을 변수로 정의하기

```css
:root {
  --bg: #ffffff;
  --text: #1f2328;
  --accent: #2457c5;
}

body {
  background: var(--bg);
  color: var(--text);
}
```

## 2. OS 설정 따르기

`prefers-color-scheme` 미디어 쿼리로 시스템 설정을 따릅니다. 사용자가 라이트 모드를 직접 골랐다면 덮어쓰지 않도록 `:not([data-theme="light"])`를 붙입니다.

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #111418;
    --text: #e4e7eb;
  }
}

:root[data-theme="dark"] {
  --bg: #111418;
  --text: #e4e7eb;
}
```

## 3. 선택 저장하고 깜빡임 막기

토글 버튼을 누르면 `<html>`에 `data-theme`을 넣고 `localStorage`에 저장합니다. 페이지를 열 때는 CSS가 그려지기 **전에** 저장된 값을 적용해야 화면이 번쩍이지 않습니다.

```html
<script>
  try {
    const theme = localStorage.getItem('theme');
    if (theme) document.documentElement.dataset.theme = theme;
  } catch (e) {}
</script>
```

`try/catch`로 감싸는 이유는 사생활 보호 모드 등에서 `localStorage` 접근이 막힐 수 있기 때문입니다.

## 정리

| 단계 | 역할 |
| --- | --- |
| CSS 변수 | 색을 한곳에서 관리 |
| 미디어 쿼리 | OS 설정 반영 |
| `data-theme` | 사용자 선택 우선 |
| 인라인 스크립트 | 첫 화면 깜빡임 방지 |
