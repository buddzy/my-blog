// 글 맨 위의 --- 블록을 읽어 { data, body }로 나눈다.
// 지원 형식: `key: value`, `key: [a, b]`, 그리고 `- item` 줄로 이어지는 목록.

const unquote = (value) => (/^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value);

function parseValue(raw) {
  const value = raw.trim();
  if (/^\[.*\]$/.test(value)) {
    return value.slice(1, -1).split(',').map((item) => unquote(item.trim())).filter(Boolean);
  }
  return unquote(value);
}

export function parseFrontmatter(text) {
  const source = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const match = source.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) return { data: {}, body: source };

  const data = {};
  let lastKey = null;

  for (const line of match[1].split('\n')) {
    const item = line.match(/^\s+-\s+(.*)$/) || line.match(/^-\s+(.*)$/);
    if (item && lastKey) {
      if (!Array.isArray(data[lastKey])) data[lastKey] = [];
      data[lastKey].push(unquote(item[1].trim()));
      continue;
    }
    const pair = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!pair) continue;
    lastKey = pair[1];
    data[lastKey] = pair[2].trim() === '' ? [] : parseValue(pair[2]);
  }

  return { data, body: source.slice(match[0].length) };
}
