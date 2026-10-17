---
title: 오늘 배운 것
date: 2026-10-17
tags: [회고, 웹개발, HTML, CSS, JavaScript]
description: 클로드 코드와 함께 블로그를 만들면서 배운 HTML, CSS, JavaScript의 역할을 정리했습니다.
---

오늘은 클로드 코드와 함께 프레임워크 없이 이 블로그를 만들었습니다. 직접 만들어 보니 웹 페이지를 이루는 세 가지 언어가 각각 무슨 일을 하는지 또렷하게 보였습니다.

## 한 줄 요약

| 언어 | 역할 | 비유 |
| --- | --- | --- |
| HTML | 무엇이 있는지 (구조) | 집의 뼈대 |
| CSS | 어떻게 보이는지 (모양) | 인테리어 |
| JavaScript | 어떻게 움직이는지 (동작) | 전기와 배선 |

## HTML: 구조

HTML은 페이지에 **무엇이 있는지** 정합니다. 이 블로그의 `index.html`에는 헤더, 검색창, 태그 목록, 글 목록이 들어갈 자리가 있습니다.

```html
<header class="site-header">…</header>
<main>
  <input id="search" type="search">
  <ul id="post-list"></ul>
</main>
```

배운 점:

- `div`만 쓰기보다 `header`, `main`, `article`, `time` 같은 **시맨틱 태그**를 쓰면 의미가 분명해지고, 화면 낭독기 사용자에게도 도움이 됩니다.
- 글 내용은 HTML에 직접 쓰지 않고 *빈 자리*만 만들어 둡니다. 내용은 JavaScript가 채웁니다.

## CSS: 모양

CSS는 같은 구조를 **어떻게 보여줄지** 정합니다. 글자 크기, 여백, 색, 레이아웃이 모두 CSS의 몫입니다.

```css
:root {
  --bg: #ffffff;
  --text: #1f2328;
}

:root[data-theme="dark"] {
  --bg: #111418;
  --text: #e4e7eb;
}
```

배운 점:

- 색을 **CSS 변수**로 모아 두면, 변수 값만 바꿔서 다크 모드를 만들 수 있습니다.
- 본문 폭을 `68ch` 정도로 제한하면 한 줄이 너무 길어지지 않아 읽기 편합니다.
- **모바일 우선**으로 작성하고 `@media (min-width: …)`로 넓은 화면을 보완하면 휴대폰에서도 잘 보입니다.

## JavaScript: 동작

JavaScript는 페이지를 **살아 움직이게** 합니다. 이 블로그에서는 이런 일을 합니다.

1. `fetch()`로 `posts/` 폴더의 마크다운 파일을 불러온다
2. 직접 만든 파서로 마크다운을 HTML로 바꾼다
3. 검색어와 태그에 맞는 글만 걸러서 보여준다
4. 다크 모드 버튼을 누르면 테마를 바꾸고 `localStorage`에 기억한다

```js
const res = await fetch('posts/hello-world.md');
const markdown = await res.text();
article.innerHTML = parse(markdown);
```

배운 점:

- 사용자가 쓴 글을 `innerHTML`에 넣을 때는 반드시 **이스케이프**해야 합니다. 그러지 않으면 글 속의 `<script>`가 실행될 수 있습니다.
- 브라우저는 `file://`로 연 페이지에서 `fetch()`를 막기 때문에, `python -m http.server` 같은 **로컬 웹 서버**로 열어야 합니다.
- 서버는 명령을 실행한 **현재 폴더**를 사이트의 최상위로 삼습니다.

## 마치며

> HTML은 뼈대, CSS는 옷, JavaScript는 움직임.

세 언어의 역할을 나눠서 생각하니, 어디를 고쳐야 할지 훨씬 쉽게 판단할 수 있었습니다. 다음에는 글 목록을 자동으로 만드는 방법도 공부해 보고 싶습니다.
