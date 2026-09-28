// 页面渲染：纯函数，输入数据，输出 HTML 字符串。
import { STATUSES, STATUS_LABELS, countByStatus } from './books.mjs';

// 所有来自数据的文本都要经过它，书名、作者里可能有 < & ' 这类字符
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const STYLE = `
  :root { --ink: #1f2328; --muted: #59636e; --line: #d1d9e0; --bg: #f6f8fa; --card: #fff;
    --reading: #0969da; --want: #9a6700; --done: #1a7f37; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif;
    color: var(--ink); background: var(--bg); }
  main { max-width: 760px; margin: 0 auto; padding: 32px 16px 48px; }
  h1 { margin: 0 0 4px; font-size: 28px; }
  .lead { margin: 0 0 20px; color: var(--muted); }
  .summary { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 24px; padding: 0; list-style: none; }
  .summary li { padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); }
  .books { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
  .book { padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); }
  .book h2 { margin: 0; font-size: 17px; }
  .meta { margin: 2px 0 0; color: var(--muted); font-size: 14px; }
  .note { margin: 8px 0 0; }
  .status { display: inline-block; margin-left: 8px; padding: 0 8px; border-radius: 999px; font-size: 12px;
    font-weight: 600; vertical-align: 2px; color: #fff; }
  .status-reading { background: var(--reading); }
  .status-want { background: var(--want); }
  .status-done { background: var(--done); }
  footer { margin-top: 32px; color: var(--muted); font-size: 13px; }
  a { color: #0969da; }
`;

export function layout({ title, body, version }) {
  const short = version?.sha ? version.sha.slice(0, 7) : 'dev';
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
<footer>
  由 <a href="https://github.com/autoteam-ai/autoteam">autoteam</a> 示例团队维护 ·
  版本 <code>${escapeHtml(short)}</code> · 数据接口 <a href="api/books.json">api/books.json</a>
</footer>
</main>
</body>
</html>
`;
}

export function renderBook(book) {
  return `<li class="book" id="${escapeHtml(book.id)}">
  <h2>${escapeHtml(book.title)}<span class="status status-${book.status}">${STATUS_LABELS[book.status]}</span></h2>
  <p class="meta">${escapeHtml(book.author)} · ${book.year}</p>
  ${book.note ? `<p class="note">${escapeHtml(book.note)}</p>` : ''}
</li>`;
}

// books 已经排好序
export function renderIndex(books, { version } = {}) {
  const counts = countByStatus(books);
  const summary = STATUSES.map((s) => `<li>${STATUS_LABELS[s]} ${counts[s]}</li>`).join('');
  const body = `<h1>团队书架</h1>
<p class="lead">团队在读、想读和读完的书，共 ${books.length} 本。</p>
<ul class="summary">${summary}</ul>
<ul class="books">
${books.map(renderBook).join('\n')}
</ul>`;
  return layout({ title: '团队书架', body, version });
}
