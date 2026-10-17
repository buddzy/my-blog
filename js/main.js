import { parse, escapeHtml } from './markdown.js';
import { parseFrontmatter } from './frontmatter.js';
import { buildSearchText, collectTags, filterPosts } from './filter.js';
import { initThemeToggle } from './theme.js';

const SITE_TITLE = 'My Blog';
const POSTS_DIR = 'posts';
const SLUG_RE = /^[\p{L}\p{N}_-]+$/u;
const SEARCH_DEBOUNCE_MS = 150;

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} 요청 실패 (${res.status})`);
  return res.text();
}

async function loadPost(slug) {
  const raw = await fetchText(`${POSTS_DIR}/${encodeURIComponent(slug)}.md`);
  const { data, body } = parseFrontmatter(raw);
  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [];
  const post = {
    slug,
    title: data.title || slug,
    date: data.date || '',
    description: data.description || '',
    tags,
    body,
  };
  post.searchText = buildSearchText(post);
  return post;
}

async function loadAllPosts() {
  const slugs = JSON.parse(await fetchText(`${POSTS_DIR}/posts.json`));
  const results = await Promise.allSettled(slugs.filter((s) => SLUG_RE.test(s)).map(loadPost));
  const posts = [];
  for (const result of results) {
    if (result.status === 'fulfilled') posts.push(result.value);
    else console.warn(result.reason);
  }
  return posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

const timeTag = (value) => (value ? `<time datetime="${escapeHtml(value)}">${formatDate(value)}</time>` : '');

function loadErrorMessage() {
  if (location.protocol === 'file:') {
    return '파일을 직접 열면 글을 불러올 수 없습니다. 로컬 웹 서버(예: python -m http.server 8000)로 열어 주세요.';
  }
  return '글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function postCard(post) {
  const tags = post.tags
    .map((tag) => `<li><button type="button" class="tag" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button></li>`)
    .join('');
  return `
    <li class="post-card">
      <a class="post-card__link" href="post.html?slug=${encodeURIComponent(post.slug)}">
        <h2 class="post-card__title">${escapeHtml(post.title)}</h2>
      </a>
      <div class="post-card__meta">${timeTag(post.date)}</div>
      ${post.description ? `<p class="post-card__desc">${escapeHtml(post.description)}</p>` : ''}
      ${tags ? `<ul class="tag-row" aria-label="태그">${tags}</ul>` : ''}
    </li>`;
}

async function initListPage() {
  const searchEl = document.getElementById('search');
  const tagListEl = document.getElementById('tag-list');
  const countEl = document.getElementById('result-count');
  const listEl = document.getElementById('post-list');
  const emptyEl = document.getElementById('empty');
  const resetEl = document.getElementById('reset');

  let posts;
  try {
    posts = await loadAllPosts();
  } catch (err) {
    console.error(err);
    countEl.textContent = loadErrorMessage();
    return;
  }

  const params = new URLSearchParams(location.search);
  const state = { tag: params.get('tag') || '', query: params.get('q') || '' };
  searchEl.value = state.query;

  tagListEl.innerHTML = collectTags(posts)
    .map(({ tag, count }) => `
      <button type="button" class="tag-chip" data-tag="${escapeHtml(tag)}" aria-pressed="false">
        #${escapeHtml(tag)} <span class="tag-chip__count">${count}</span>
      </button>`)
    .join('');

  const syncUrl = () => {
    const next = new URLSearchParams();
    if (state.tag) next.set('tag', state.tag);
    if (state.query.trim()) next.set('q', state.query.trim());
    const qs = next.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  };

  const render = () => {
    for (const chip of tagListEl.querySelectorAll('.tag-chip')) {
      chip.setAttribute('aria-pressed', String(chip.dataset.tag === state.tag));
    }
    const visible = filterPosts(posts, state);
    listEl.innerHTML = visible.map(postCard).join('');
    emptyEl.hidden = visible.length > 0;
    const filtered = state.tag || state.query.trim();
    countEl.textContent = filtered ? `${visible.length}개의 글을 찾았습니다` : `전체 ${posts.length}개의 글`;
    syncUrl();
  };

  const toggleTag = (tag) => {
    state.tag = state.tag === tag ? '' : tag;
    render();
  };

  tagListEl.addEventListener('click', (event) => {
    const chip = event.target.closest('.tag-chip');
    if (chip) toggleTag(chip.dataset.tag);
  });

  listEl.addEventListener('click', (event) => {
    const tag = event.target.closest('.tag');
    if (!tag) return;
    state.tag = tag.dataset.tag;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  let timer;
  searchEl.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.query = searchEl.value;
      render();
    }, SEARCH_DEBOUNCE_MS);
  });

  resetEl.addEventListener('click', () => {
    state.tag = '';
    state.query = '';
    searchEl.value = '';
    render();
    searchEl.focus();
  });

  render();
}

async function initPostPage() {
  const articleEl = document.getElementById('post');
  const slug = new URLSearchParams(location.search).get('slug');

  const showMessage = (message) => {
    articleEl.innerHTML = `<p class="status">${escapeHtml(message)}</p>`;
  };

  try {
    if (!slug || !SLUG_RE.test(slug)) {
      showMessage('글을 찾을 수 없습니다.');
      return;
    }

    const post = await loadPost(slug);
    document.title = `${post.title} · ${SITE_TITLE}`;
    if (post.description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', post.description);
    }

    const tags = post.tags
      .map((tag) => `<li><a class="tag" href="index.html?tag=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a></li>`)
      .join('');

    articleEl.innerHTML = `
      <header class="post__header">
        <h1 class="post__title">${escapeHtml(post.title)}</h1>
        <div class="post__meta">${timeTag(post.date)}</div>
        ${tags ? `<ul class="tag-row" aria-label="태그">${tags}</ul>` : ''}
      </header>
      <div class="prose">${parse(post.body)}</div>`;
  } catch (err) {
    console.error(err);
    showMessage(location.protocol === 'file:' ? loadErrorMessage() : '글을 찾을 수 없거나 불러오지 못했습니다.');
  } finally {
    articleEl.removeAttribute('aria-busy');
  }
}

initThemeToggle(document.querySelector('.theme-toggle'));

if (document.body.dataset.page === 'list') initListPage();
if (document.body.dataset.page === 'post') initPostPage();
