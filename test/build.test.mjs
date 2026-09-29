import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { build } from '../src/build.mjs';
import { escapeHtml } from '../src/html.mjs';

const dir = await mkdtemp(join(tmpdir(), 'bookshelf-'));
after(() => rm(dir, { recursive: true, force: true }));

const books = [
  { id: 'x', title: '<script>alert(1)</script>', author: "O'Hallaron & Co", year: 2015, status: 'want', added: '2026-01-02', tags: ['design'] },
  { id: 'y', title: '正常的书', author: '作者', year: 2020, status: 'reading', added: '2026-01-01', note: '一句话', tags: ['design', 'engineering'] },
];
const tags = [{ id: 'engineering', name: '软件工程 & <实践>' }, { id: 'design', name: '设计' }, { id: 'unused', name: '未使用' }];

async function buildFixture() {
  const dataFile = join(dir, 'books.json');
  const tagsFile = join(dir, 'tags.json');
  await writeFile(dataFile, JSON.stringify(books));
  await writeFile(tagsFile, JSON.stringify(tags));
  const outDir = join(dir, 'dist');
  const files = await build({ dataFile, tagsFile, outDir, sha: 'abc1234def', builtAt: '2026-09-29T00:00:00.000Z' });
  return { outDir, files };
}

test('生成页面、接口和版本文件', async () => {
  const { outDir, files } = await buildFixture();
  assert.deepEqual(files.sort(), ['.nojekyll', 'api/books.json', 'api/tags.json', 'index.html', 'tags/design.html', 'tags/engineering.html', 'tags/unused.html', 'version.json']);

  const api = JSON.parse(await readFile(join(outDir, 'api/books.json'), 'utf8'));
  assert.equal(api.count, 2);
  assert.deepEqual(api.books.map((b) => b.id), ['y', 'x']);
  assert.deepEqual(api.books.map((b) => b.tags), [['design', 'engineering'], ['design']]);

  const tagsApi = JSON.parse(await readFile(join(outDir, 'api/tags.json'), 'utf8'));
  assert.deepEqual(tagsApi, { count: 3, tags: [
    { id: 'engineering', name: '软件工程 & <实践>', count: 1 },
    { id: 'design', name: '设计', count: 2 },
    { id: 'unused', name: '未使用', count: 0 },
  ] });

  const version = JSON.parse(await readFile(join(outDir, 'version.json'), 'utf8'));
  assert.deepEqual(version, { sha: 'abc1234def', built_at: '2026-09-29T00:00:00.000Z' });
});

test('缺少标签文件时构建失败', async () => {
  await assert.rejects(build({ dataFile: join(dir, 'books.json'), tagsFile: join(dir, 'missing-tags.json'), outDir: join(dir, 'missing-dist') }), /ENOENT.*missing-tags\.json/);
});

test('页面里的数据都经过转义，页脚显示短 sha', async () => {
  const { outDir } = await buildFixture();
  const html = await readFile(join(outDir, 'index.html'), 'utf8');
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('O&#39;Hallaron &amp; Co'));
  assert.ok(html.includes('在读 1'));
  assert.ok(html.includes('<code>abc1234</code>'));
  assert.ok(html.includes('软件工程 &amp; &lt;实践&gt;'));
  assert.ok(!html.includes('软件工程 & <实践>'));
});

test('首页列出全部标签、书数和每本书的标签链接', async () => {
  const { outDir } = await buildFixture();
  const html = await readFile(join(outDir, 'index.html'), 'utf8');
  for (const [id, label, count] of [
    ['engineering', '软件工程 &amp; &lt;实践&gt;', 1],
    ['design', '设计', 2],
    ['unused', '未使用', 0],
  ]) {
    assert.ok(html.includes(`<a href="tags/${id}.html">${label} ${count}</a>`));
  }
  assert.match(html, /id="y"[\s\S]*?href="tags\/design.html"[\s\S]*?href="tags\/engineering.html"/);
  assert.match(html, /id="x"[\s\S]*?href="tags\/design.html"/);
});

test('标签页使用标签名作标题，只含对应书且保持首页顺序', async () => {
  const { outDir } = await buildFixture();
  for (const [id, title, bookIds] of [
    ['engineering', '软件工程 &amp; &lt;实践&gt;', ['y']],
    ['design', '设计', ['y', 'x']],
    ['unused', '未使用', []],
  ]) {
    const html = await readFile(join(outDir, `tags/${id}.html`), 'utf8');
    assert.ok(html.includes(`<title>${title}</title>`));
    assert.ok(html.includes(`<h1>${title}</h1>`));
    assert.deepEqual([...html.matchAll(/<li class="book" id="([^"]+)"/g)].map((m) => m[1]), bookIds);
    assert.ok(html.includes('href="../index.html"'));
  }
});

test('首页和标签页链接都用相对路径，站内链接解析到生成文件', async () => {
  const { outDir, files } = await buildFixture();
  for (const file of files.filter((name) => name.endsWith('.html'))) {
    const html = await readFile(join(outDir, file), 'utf8');
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(hrefs.length > 0);
    for (const href of hrefs) {
      assert.ok(!href.startsWith('/'), `${file}: 不能用绝对路径：${href}`);
      if (href.startsWith('https://')) continue;
      const resolved = new URL(href, `https://example.test/subpath/${file}`);
      assert.ok(resolved.pathname.startsWith('/subpath/'), `${file}: 链接离开站点：${href}`);
      await access(join(outDir, resolved.pathname.slice('/subpath/'.length)));
    }
  }
});

test('escapeHtml 转义五个特殊字符', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});
