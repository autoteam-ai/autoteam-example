// 书单数据：读取、校验、排序、统计。不碰文件系统以外的 IO，方便单元测试。
import { readFile } from 'node:fs/promises';

// 页面上的展示顺序：在读、想读、读完
export const STATUSES = ['reading', 'want', 'done'];
export const STATUS_LABELS = { reading: '在读', want: '想读', done: '读完' };

export async function loadBooks(file, tags) {
  const books = JSON.parse(await readFile(file, 'utf8'));
  validateBooks(books, tags);
  return books;
}

export async function loadTags(file) {
  const tags = JSON.parse(await readFile(file, 'utf8'));
  validateTags(tags);
  return tags;
}

export function validateTags(tags) {
  if (!Array.isArray(tags)) throw new Error('标签必须是数组');
  const ids = new Set();
  tags.forEach((tag, i) => {
    const where = `第 ${i + 1} 个标签（${tag?.id ?? '没有 id'}）`;
    for (const key of ['id', 'name']) {
      if (typeof tag?.[key] !== 'string' || tag[key].trim() === '') throw new Error(`${where}：缺少 ${key}`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tag.id)) throw new Error(`${where}：id 只能用小写字母、数字和连字符`);
    if (ids.has(tag.id)) throw new Error(`${where}：id 重复`);
    ids.add(tag.id);
  });
}

// 作者名生成 id：小写，标点去掉，空白变连字符，例如 David R. O'Hallaron → david-r-ohallaron
export function authorId(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

// author 按英文逗号拆成多位作者，返回 [{id, name}]；空作者、空 id 直接报错
export function parseAuthors(author) {
  return author.split(',').map((part) => {
    const name = part.trim();
    const id = authorId(name);
    if (name === '' || id === '') throw new Error(`作者名无效：${JSON.stringify(part)}`);
    return { id, name };
  });
}

// 数据有错就在构建时失败，而不是生成一个缺字段的页面
export function validateBooks(books, tags) {
  if (!Array.isArray(books)) throw new Error('书单必须是数组');
  const tagIds = new Set(tags.map((tag) => tag.id));
  const ids = new Set();
  const authorNames = new Map();
  books.forEach((b, i) => {
    const where = `第 ${i + 1} 本书（${b?.id ?? '没有 id'}）`;
    for (const key of ['id', 'title', 'author']) {
      if (typeof b?.[key] !== 'string' || b[key].trim() === '') throw new Error(`${where}：缺少 ${key}`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.id)) throw new Error(`${where}：id 只能用小写字母、数字和连字符`);
    if (ids.has(b.id)) throw new Error(`${where}：id 重复`);
    ids.add(b.id);
    if (!STATUSES.includes(b.status)) throw new Error(`${where}：status 只能是 ${STATUSES.join(' / ')}`);
    if (!Number.isInteger(b.year)) throw new Error(`${where}：year 必须是整数`);
    // 日期一律是 YYYY-MM-DD 字符串，按字符串比较，不用 Date 解析（时区会让边界差一天）
    if (typeof b.added !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.added)) {
      throw new Error(`${where}：added 必须是 YYYY-MM-DD`);
    }
    try {
      const seen = new Set();
      for (const { id, name } of parseAuthors(b.author)) {
        if (seen.has(id)) throw new Error(`作者 ${name} 重复`);
        seen.add(id);
        if (authorNames.has(id) && authorNames.get(id) !== name) {
          throw new Error(`作者 ${name} 与 ${authorNames.get(id)} 生成了同一个 id ${id}`);
        }
        authorNames.set(id, name);
      }
    } catch (err) {
      throw new Error(`${where}：${err.message}`);
    }
    if (!Array.isArray(b.tags)) throw new Error(`${where}：tags 必须是数组`);
    if (b.tags.length < 1 || b.tags.length > 3) throw new Error(`${where}：tags 必须有 1～3 个`);
    const used = new Set();
    for (const tagId of b.tags) {
      if (used.has(tagId)) throw new Error(`${where}：标签 ${tagId} 重复`);
      if (!tagIds.has(tagId)) throw new Error(`${where}：引用了不存在的标签 ${tagId}`);
      used.add(tagId);
    }
  });
}

export function countByTag(books, tags) {
  const counts = new Map(tags.map((tag) => [tag.id, 0]));
  for (const book of books) {
    for (const tagId of book.tags) counts.set(tagId, counts.get(tagId) + 1);
  }
  return tags.map(({ id, name }) => ({ id, name, count: counts.get(id) }));
}

// 每位作者参与的书数，从多到少，书数相同按名字排序
export function countByAuthor(books) {
  const authors = new Map();
  for (const book of books) {
    for (const { id, name } of parseAuthors(book.author)) {
      authors.set(id, { id, name, count: (authors.get(id)?.count ?? 0) + 1 });
    }
  }
  return [...authors.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// 先按状态（在读 → 想读 → 读完），同一状态里新加入的在前，最后按 id 保证顺序稳定
export function sortBooks(books) {
  return [...books].sort((a, b) =>
    STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)
    || b.added.localeCompare(a.added)
    || a.id.localeCompare(b.id));
}

export function countByStatus(books) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const b of books) counts[b.status] += 1;
  return counts;
}
