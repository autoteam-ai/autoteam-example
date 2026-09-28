import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countByStatus, loadBooks, sortBooks, validateBooks } from '../src/books.mjs';

const book = (over = {}) => ({
  id: 'a', title: '书', author: '作者', year: 2020, status: 'done', added: '2026-01-01', ...over,
});

test('仓库里的书单能通过校验', async () => {
  const books = await loadBooks(new URL('../data/books.json', import.meta.url));
  assert.ok(books.length > 0);
});

test('缺字段、id 重复、状态不对、日期格式不对都报错', () => {
  assert.throws(() => validateBooks({}), /必须是数组/);
  assert.throws(() => validateBooks([book({ title: ' ' })]), /缺少 title/);
  assert.throws(() => validateBooks([book(), book()]), /id 重复/);
  assert.throws(() => validateBooks([book({ id: 'Bad_ID' })]), /id 只能用/);
  assert.throws(() => validateBooks([book({ status: 'lost' })]), /status 只能是/);
  assert.throws(() => validateBooks([book({ year: '2020' })]), /year 必须是整数/);
  assert.throws(() => validateBooks([book({ added: '2026/1/1' })]), /YYYY-MM-DD/);
});

test('排序：在读、想读、读完；同一状态新加入的在前', () => {
  const sorted = sortBooks([
    book({ id: 'done-old', status: 'done', added: '2026-01-01' }),
    book({ id: 'want', status: 'want' }),
    book({ id: 'done-new', status: 'done', added: '2026-02-01' }),
    book({ id: 'reading', status: 'reading' }),
  ]);
  assert.deepEqual(sorted.map((b) => b.id), ['reading', 'want', 'done-new', 'done-old']);
});

test('按状态计数，没有的状态记 0', () => {
  assert.deepEqual(countByStatus([book(), book({ id: 'b', status: 'reading' })]), { reading: 1, want: 0, done: 1 });
});
