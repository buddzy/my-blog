# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code에게 프로젝트 맥락과 규칙을 알려줍니다.

## 프로젝트 개요

마크다운(`.md`) 파일로 작성한 글을 읽어서 블로그 웹사이트로 보여주는 정적 사이트입니다.

- **프레임워크·빌드 도구 없음**: 순수 HTML, CSS, JavaScript(ES 모듈)만 사용합니다. React, Vue, Tailwind, Bootstrap, jQuery, 번들러(webpack/Vite 등), npm 의존성을 추가하지 않습니다.
- **마크다운 파서도 직접 구현**: 외부 라이브러리(marked, markdown-it 등) 대신 `js/markdown.js`에 자체 파서를 둡니다.
- **브라우저에서 렌더링**: 페이지가 `fetch()`로 `.md` 파일을 불러와 HTML로 변환해 표시합니다.

## 디렉터리 구조 (목표)

```
my-blog/
├── index.html          # 글 목록 페이지
├── post.html           # 글 상세 페이지 (?slug=파일명)
├── css/
│   └── style.css       # 전체 스타일 (테마 변수, 레이아웃, 본문 타이포그래피)
├── js/
│   ├── main.js         # 진입점: 페이지 판별, 목록/상세 렌더링
│   ├── markdown.js     # 마크다운 → HTML 변환기
│   ├── frontmatter.js  # 글 상단 메타데이터 파싱
│   ├── filter.js       # 태그 필터·검색 로직 (DOM 없는 순수 함수)
│   └── theme.js        # 다크 모드 토글
└── posts/
    ├── posts.json      # 글 목록 매니페스트
    └── *.md            # 블로그 글
```

## 글 작성 규칙

각 글은 `posts/` 아래의 `.md` 파일이며, 파일명이 곧 slug입니다(예: `posts/hello-world.md` → `post.html?slug=hello-world`). 파일 맨 위에 frontmatter를 둡니다.

```markdown
---
title: 첫 번째 글
date: 2026-10-17
tags: [일상, 블로그]
description: 목록에 보일 짧은 요약
---

본문은 여기부터...
```

브라우저는 디렉터리 목록을 읽을 수 없으므로, 새 글을 추가하면 **반드시 `posts/posts.json`에도 slug를 등록**해야 합니다.

```json
["hello-world", "second-post"]
```

목록 페이지는 각 파일의 frontmatter를 읽어 제목·날짜·요약을 만들고 날짜 내림차순으로 정렬합니다.

## 마크다운 파서 지원 범위

`js/markdown.js`는 최소한 다음을 지원해야 합니다.

- 제목 `#`~`######`, 문단, 줄바꿈
- 강조 `**굵게**`, `*기울임*`, `~~취소선~~`, 인라인 코드 `` `code` ``
- 링크 `[텍스트](url)`, 이미지 `![alt](src)`
- 순서 있는/없는 목록(중첩 포함), 인용문 `>`, 수평선 `---`
- 펜스 코드 블록 ` ``` `(언어명은 `class="language-xxx"`로 전달)
- 표(GFM 테이블)

규칙:

- **보안**: 본문의 원시 HTML은 이스케이프합니다(`<`, `>`, `&`, `"`). 링크의 `javascript:` URL은 허용하지 않습니다. 렌더링 결과는 `innerHTML`에 넣기 전에 이 처리가 끝나 있어야 합니다.
- 코드 블록 내부는 다른 마크다운 규칙을 적용하지 않고 이스케이프만 합니다.
- 파서는 DOM에 의존하지 않는 순수 함수(`parse(markdown) → html 문자열`)로 유지해 테스트하기 쉽게 합니다.

## 태그 필터와 검색

목록 페이지(`index.html`)에서 동작하며, 서버나 빌드 단계 없이 클라이언트에서 처리합니다. 필터링 로직은 `js/filter.js`에 DOM과 분리된 순수 함수로 둡니다.

- **데이터**: 목록을 만들 때 이미 모든 `.md`를 불러오므로, frontmatter와 함께 본문 텍스트를 메모리에 보관해 재사용합니다. 검색을 위한 추가 요청은 하지 않습니다.
- **태그 필터**
  - 모든 글의 `tags`를 모아 목록 위에 태그 칩으로 보여주고, 칩마다 글 개수를 표시합니다.
  - 태그는 한 번에 하나만 선택하며, 선택된 칩을 다시 누르면 해제됩니다.
  - 상세 페이지의 태그를 누르면 `index.html?tag=태그`로 이동합니다.
- **검색**
  - 목록 상단에 `<input type="search">`를 둡니다.
  - 제목, 요약(`description`), 태그, 본문을 대상으로 대소문자를 구분하지 않는 부분 문자열 검색을 합니다.
  - 검색어를 공백으로 나눴을 때 모든 단어가 포함되어야 일치로 봅니다(AND).
  - 입력은 약 150ms 디바운스합니다.
  - 검색 대상 본문은 마크다운 기호(`#`, `*`, `` ` ``, 링크 문법 등)를 대략 제거한 일반 텍스트로 만듭니다.
- **조합**: 태그 필터와 검색어는 동시에 적용합니다(AND).
- **상태 유지**: 선택한 태그와 검색어를 URL 쿼리(`?tag=…&q=…`)에 `history.replaceState`로 반영해, 새로고침해도 유지되고 링크로 공유할 수 있게 합니다. 쿼리 값은 `URLSearchParams`로 읽고 쓰며, 화면에 그대로 출력할 때는 이스케이프합니다.
- **결과 없음**: "일치하는 글이 없습니다" 메시지와 필터 초기화 버튼을 보여줍니다.
- **접근성**: 검색창에는 `<label>`을 붙입니다(시각적으로 숨겨도 됩니다). 결과 개수는 `aria-live="polite"` 영역으로 알립니다. 태그 칩은 `<button aria-pressed="true|false">`로 만듭니다.
- **모바일**: 태그 칩은 `flex-wrap`으로 줄바꿈되게 하고, 터치 대상 44px 규칙을 따릅니다.

## 디자인 원칙

깔끔하고 읽기 좋은 것이 최우선입니다. 장식보다 본문 가독성을 우선합니다.

- **본문 폭**: 글 영역은 `max-width: 68ch` 정도로 제한합니다.
- **타이포그래피**: 본문 `font-size` 약 1.0625–1.125rem, `line-height` 1.7–1.8. 한글 가독성을 위해 시스템 폰트 스택을 사용합니다:
  `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif`
  코드는 `ui-monospace, "SFMono-Regular", Consolas, monospace`.
- **여백**: 제목·문단·목록 사이 세로 간격을 넉넉하고 일관되게 둡니다.
- **색**: 중립적인 배경/텍스트에 강조색 하나만 씁니다. 텍스트 대비는 WCAG AA(4.5:1) 이상.
- **코드 블록**: 배경색으로 구분하고, 넘칠 때는 가로 스크롤(`overflow-x: auto`)되게 합니다.
- **이미지·표**: 컨테이너 폭을 넘지 않도록 `max-width: 100%`, 표는 감싸는 요소에서 가로 스크롤.

## 다크 모드

- 모든 색은 `:root`의 CSS 사용자 정의 속성(`--bg`, `--text`, `--muted`, `--accent`, `--code-bg`, `--border` 등)으로 정의하고, 컴포넌트에서는 변수만 참조합니다. 색상값을 직접 하드코딩하지 않습니다.
- 기본값은 OS 설정을 따릅니다(`@media (prefers-color-scheme: dark)`).
- 헤더의 토글 버튼으로 사용자가 직접 바꿀 수 있고, 선택은 `localStorage`에 저장합니다. 수동 선택은 `<html data-theme="light|dark">`로 적용하며 미디어 쿼리보다 우선합니다.
- 페이지 로드 시 깜빡임(FOUC)을 막기 위해, 저장된 테마를 적용하는 작은 인라인 스크립트를 `<head>`에 둡니다.
- `localStorage` 접근은 `try/catch`로 감쌉니다(사파리 사생활 보호 모드 등).

## 반응형 / 모바일

- 모바일 우선(mobile-first)으로 작성하고, 넓은 화면은 `min-width` 미디어 쿼리로 확장합니다.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 필수.
- 좌우 여백은 최소 16px, 어떤 화면에서도 페이지 전체 가로 스크롤이 생기지 않아야 합니다.
- 터치 대상(버튼, 링크)은 최소 44×44px.
- 긴 URL이나 단어는 `overflow-wrap: anywhere`로 줄바꿈합니다.

## 코딩 컨벤션

- JavaScript: ES 모듈(`<script type="module">`), `const`/`let`, 세미콜론 사용, 들여쓰기 2칸. 전역 변수 금지.
- CSS: 클래스 기반 선택자, 단순한 BEM 스타일 이름(`.post-card`, `.post-card__title`). `!important` 지양.
- HTML: 시맨틱 태그(`header`, `main`, `article`, `nav`, `footer`, `time`) 사용, 이미지에는 `alt` 제공, `<html lang="ko">`.
- 접근성: 테마 토글 버튼에 `aria-label`, 키보드 포커스 표시(`:focus-visible`) 유지.
- 에러 처리: 글을 찾지 못하거나 `fetch`가 실패하면 빈 화면 대신 안내 메시지를 보여줍니다.

## 로컬 실행

`fetch()`는 `file://`에서 동작하지 않으므로 반드시 로컬 웹 서버로 엽니다. 아래 중 하나를 사용합니다.

```bash
python -m http.server 8000
```

```bash
npx serve .
```

그다음 브라우저에서 `http://localhost:8000`을 엽니다.

## 작업 시 확인 사항

변경 후에는 다음을 확인합니다.

1. 목록 페이지와 상세 페이지가 콘솔 에러 없이 렌더링되는가
2. 라이트/다크 모드 전환과 새로고침 후 유지가 되는가
3. 375px 폭(모바일)에서 가로 스크롤 없이 읽기 좋은가
4. 새 마크다운 문법을 다룰 때 이스케이프·XSS 처리가 깨지지 않았는가
5. 태그 선택과 검색어 조합이 올바르게 걸러지고, 같은 URL로 다시 열어도 같은 결과가 나오는가
