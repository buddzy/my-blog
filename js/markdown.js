// 마크다운 → HTML 변환기. DOM에 의존하지 않는 순수 함수만 둔다.

const LIST_RE = /^( *)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const HR_RE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)/;
const QUOTE_RE = /^ {0,3}>/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 이미 이스케이프된 URL을 받는다. 스크립트 실행이 가능한 스킴은 막는다.
function safeUrl(url) {
  const compact = url.replace(/[\s\u0000-\u001f]/g, '').toLowerCase();
  if (/^(javascript|vbscript|data):/.test(compact)) return '#';
  return url;
}

function emphasis(text) {
  return text
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)([\s\S]*?\S)__/g, '<strong>$1</strong>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
    .replace(/\*(?=\S)([\s\S]*?\S)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, '$1<em>$2</em>');
}

export function parseInline(text) {
  // 생성한 태그는 자리표시자로 빼 두어 이후 치환(강조 등)이 URL·코드를 건드리지 않게 한다.
  const tokens = [];
  const stash = (html) => `\u0000${tokens.push(html) - 1}\u0000`;

  let s = String(text).replace(/\u0000/g, '');
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => stash(`<code>${escapeHtml(code.trim())}</code>`));
  s = escapeHtml(s);

  s = s.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g, (_, alt, src, title) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return stash(`<img src="${safeUrl(src)}" alt="${alt}"${titleAttr} loading="lazy">`);
  });

  s = s.replace(/\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g, (_, label, href, title) => {
    const url = safeUrl(href);
    const external = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    const titleAttr = title ? ` title="${title}"` : '';
    return stash(`<a href="${url}"${titleAttr}${external}>${emphasis(label)}</a>`);
  });

  s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (_, url) =>
    stash(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`));

  s = emphasis(s);
  s = s.replace(/(?: {2,}|\\)\n/g, '<br>\n');

  while (s.includes('\u0000')) {
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
  }
  return s;
}

const indentOf = (line) => line.match(/^ */)[0].length;

function isBlockStart(line) {
  return HEADING_RE.test(line) || HR_RE.test(line) || FENCE_RE.test(line) ||
    QUOTE_RE.test(line) || LIST_RE.test(line);
}

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function parseTable(lines, start) {
  const header = splitRow(lines[start]);
  const aligns = splitRow(lines[start + 1]).map((cell) => {
    if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
    if (cell.endsWith(':')) return 'right';
    if (cell.startsWith(':')) return 'left';
    return '';
  });
  const alignAttr = (i) => (aligns[i] ? ` style="text-align:${aligns[i]}"` : '');

  let i = start + 2;
  const rows = [];
  while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
    rows.push(splitRow(lines[i]));
    i++;
  }

  const head = header.map((cell, c) => `<th${alignAttr(c)}>${parseInline(cell)}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${header.map((_, c) => `<td${alignAttr(c)}>${parseInline(row[c] ?? '')}</td>`).join('')}</tr>`)
    .join('\n');

  const html = `<div class="table-wrap"><table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table></div>`;
  return { html, next: i };
}

function parseList(lines, start) {
  const first = lines[start].match(LIST_RE);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const startNumber = ordered ? parseInt(first[2], 10) : 1;
  const isSibling = (line) => {
    const m = line.match(LIST_RE);
    return m && m[1].length === baseIndent && /\d/.test(m[2]) === ordered;
  };

  const items = [];
  let loose = false;
  let i = start;

  while (i < lines.length && isSibling(lines[i])) {
    const m = lines[i].match(LIST_RE);
    const contentIndent = m[1].length + m[2].length + 1;
    const itemLines = [m[3]];
    i++;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        const next = lines[i + 1];
        if (next !== undefined && next.trim() && indentOf(next) > baseIndent) {
          itemLines.push('');
          loose = true;
          i++;
          continue;
        }
        break;
      }
      if (indentOf(line) > baseIndent) {
        itemLines.push(line.slice(Math.min(indentOf(line), contentIndent)));
      } else if (!isBlockStart(line)) {
        itemLines.push(line.trim()); // 들여쓰지 않은 문단 이어쓰기
      } else {
        break;
      }
      i++;
    }

    items.push(itemLines);

    // 항목 사이의 빈 줄 하나는 같은 목록으로 이어 본다.
    if (i + 1 < lines.length && !lines[i].trim() && isSibling(lines[i + 1])) {
      loose = true;
      i++;
    }
  }

  const renderItem = (itemLines) => {
    let task = '';
    const checkbox = itemLines[0].match(/^\[( |x|X)\]\s+(.*)$/);
    if (checkbox) {
      task = `<input type="checkbox" disabled${checkbox[1] === ' ' ? '' : ' checked'}> `;
      itemLines = [checkbox[2], ...itemLines.slice(1)];
    }
    let blocks = parseBlocks(itemLines);
    if (!loose) {
      blocks = blocks.map((b) => (b.startsWith('<p>') && b.endsWith('</p>') ? b.slice(3, -4) : b));
    }
    const cls = task ? ' class="task-item"' : '';
    return `<li${cls}>${task}${blocks.join('\n')}</li>`;
  };

  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : '';
  return { html: `<${tag}${startAttr}>\n${items.map(renderItem).join('\n')}\n</${tag}>`, next: i };
}

function parseBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(FENCE_RE);
    if (fence) {
      const close = new RegExp(`^ {0,3}${fence[1][0] === '`' ? '`' : '~'}{${fence[1].length},}\\s*$`);
      const body = [];
      i++;
      while (i < lines.length && !close.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++;
      const cls = fence[2] ? ` class="language-${escapeHtml(fence[2])}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${parseInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (HR_RE.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const quoted = [];
      while (i < lines.length && lines[i].trim()) {
        quoted.push(lines[i].replace(/^ {0,3}> ?/, ''));
        i++;
      }
      out.push(`<blockquote>\n${parseBlocks(quoted).join('\n')}\n</blockquote>`);
      continue;
    }

    if (LIST_RE.test(line)) {
      const { html, next } = parseList(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const { html, next } = parseTable(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && (para.length === 0 || !isBlockStart(lines[i]))) {
      para.push(lines[i].replace(/^\s+/, ''));
      i++;
    }
    out.push(`<p>${parseInline(para.join('\n'))}</p>`);
  }

  return out;
}

export function parse(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  return parseBlocks(lines).join('\n');
}
