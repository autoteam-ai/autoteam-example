import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { build } from '../src/build.mjs';
import { escapeHtml } from '../src/html.mjs';

const dir = await mkdtemp(join(tmpdir(), 'bookshelf-'));
after(() => rm(dir, { recursive: true, force: true }));

const books = [
  { id: 'x', title: '<script>alert(1)</script>', author: "O'Hallaron & Co", year: 2015, status: 'want', added: '2026-01-02' },
  { id: 'y', title: '正常的书', author: '作者', year: 2020, status: 'reading', added: '2026-01-01', note: '一句话' },
];

async function buildFixture() {
  const dataFile = join(dir, 'books.json');
  await writeFile(dataFile, JSON.stringify(books));
  const outDir = join(dir, 'dist');
  const files = await build({ dataFile, outDir, sha: 'abc1234def', builtAt: '2026-09-29T00:00:00.000Z' });
  return { outDir, files };
}

test('生成页面、接口和版本文件', async () => {
  const { outDir, files } = await buildFixture();
  assert.deepEqual(files.sort(), ['.nojekyll', 'api/books.json', 'index.html', 'version.json']);

  const api = JSON.parse(await readFile(join(outDir, 'api/books.json'), 'utf8'));
  assert.equal(api.count, 2);
  assert.deepEqual(api.books.map((b) => b.id), ['y', 'x']);

  const version = JSON.parse(await readFile(join(outDir, 'version.json'), 'utf8'));
  assert.deepEqual(version, { sha: 'abc1234def', built_at: '2026-09-29T00:00:00.000Z' });
});

test('页面里的数据都经过转义，页脚显示短 sha', async () => {
  const { outDir } = await buildFixture();
  const html = await readFile(join(outDir, 'index.html'), 'utf8');
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('O&#39;Hallaron &amp; Co'));
  assert.ok(html.includes('在读 1'));
  assert.ok(html.includes('<code>abc1234</code>'));
});

test('链接都是相对路径：站点部署在子路径下', async () => {
  const { outDir } = await buildFixture();
  const html = await readFile(join(outDir, 'index.html'), 'utf8');
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 0);
  for (const href of hrefs) assert.ok(!href.startsWith('/'), `不能用绝对路径：${href}`);
});

test('escapeHtml 转义五个特殊字符', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});
