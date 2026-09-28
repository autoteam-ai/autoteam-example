// 书单数据：读取、校验、排序、统计。不碰文件系统以外的 IO，方便单元测试。
import { readFile } from 'node:fs/promises';

// 页面上的展示顺序：在读、想读、读完
export const STATUSES = ['reading', 'want', 'done'];
export const STATUS_LABELS = { reading: '在读', want: '想读', done: '读完' };

export async function loadBooks(file) {
  const books = JSON.parse(await readFile(file, 'utf8'));
  validateBooks(books);
  return books;
}

// 数据有错就在构建时失败，而不是生成一个缺字段的页面
export function validateBooks(books) {
  if (!Array.isArray(books)) throw new Error('书单必须是数组');
  const ids = new Set();
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
  });
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
