// 把书单生成成静态站点：页面、JSON 接口、版本文件。
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { countByTag, loadBooks, loadTags, sortBooks } from './books.mjs';
import { renderIndex, renderTag } from './html.mjs';

export async function build({ dataFile, tagsFile, outDir, sha = 'dev', builtAt = new Date().toISOString() }) {
  const tags = await loadTags(tagsFile);
  const books = sortBooks(await loadBooks(dataFile, tags));
  const tagCounts = countByTag(books, tags);
  const tagsById = new Map(tags.map(({ id, name }) => [id, name]));
  const version = { sha, built_at: builtAt };
  const files = {
    'index.html': renderIndex(books, tagCounts, { version }),
    'api/books.json': json({ count: books.length, books }),
    'api/tags.json': json({ count: tags.length, tags: tagCounts }),
    // 部署后用它确认线上跑的是哪个提交
    'version.json': json(version),
    // 关掉 GitHub Pages 的 Jekyll 处理，文件原样发布
    '.nojekyll': '',
  };
  for (const tag of tags) {
    files[`tags/${tag.id}.html`] = renderTag(tag, books.filter((book) => book.tags.includes(tag.id)), tagsById, { version });
  }
  await rm(outDir, { recursive: true, force: true });
  for (const [rel, content] of Object.entries(files)) {
    const path = join(outDir, rel);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  return Object.keys(files);
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
