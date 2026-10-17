// 태그 필터·검색 로직. DOM에 의존하지 않는 순수 함수만 둔다.

// 검색용으로 마크다운 기호를 대략 걷어낸 일반 텍스트를 만든다.
export function stripMarkdown(markdown) {
  return String(markdown)
    .replace(/^\s*(```|~~~).*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/[*_~`|#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchText(post) {
  return [post.title, post.description, post.tags.join(' '), stripMarkdown(post.body)]
    .join(' ')
    .toLowerCase();
}

// [{ tag, count }]를 글 수 내림차순, 같으면 이름순으로 돌려준다.
export function collectTags(posts) {
  const counts = new Map();
  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ko'));
}

// 태그와 검색어(공백으로 나눈 모든 단어)를 모두 만족하는 글만 남긴다.
export function filterPosts(posts, { tag = '', query = '' } = {}) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return posts.filter((post) =>
    (!tag || post.tags.includes(tag)) &&
    terms.every((term) => post.searchText.includes(term)));
}
