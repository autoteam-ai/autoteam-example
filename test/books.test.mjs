import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countByStatus, countByTag, loadBooks, loadTags, sortBooks, validateBooks, validateTags } from '../src/books.mjs';

const tags = [{ id: 'design', name: '设计' }, { id: 'unused', name: '未使用' }];

const book = (over = {}) => ({
  id: 'a', title: '书', author: '作者', year: 2020, status: 'done', added: '2026-01-01', tags: ['design'], ...over,
});

test('仓库里的书单能通过校验', async () => {
  const repositoryTags = await loadTags(new URL('../data/tags.json', import.meta.url));
  const books = await loadBooks(new URL('../data/books.json', import.meta.url), repositoryTags);
  assert.ok(books.length > 0);
  assert.equal(books.length, 12);
});

test('缺字段、id 重复、状态不对、日期格式不对都报错', () => {
  assert.throws(() => validateBooks({}, tags), /必须是数组/);
  assert.throws(() => validateBooks([book({ title: ' ' })], tags), /缺少 title/);
  assert.throws(() => validateBooks([book(), book()], tags), /id 重复/);
  assert.throws(() => validateBooks([book({ id: 'Bad_ID' })], tags), /id 只能用/);
  assert.throws(() => validateBooks([book({ status: 'lost' })], tags), /status 只能是/);
  assert.throws(() => validateBooks([book({ year: '2020' })], tags), /year 必须是整数/);
  assert.throws(() => validateBooks([book({ added: '2026/1/1' })], tags), /YYYY-MM-DD/);
});

test('标签定义指出缺字段、非法 id 和重复 id', () => {
  assert.throws(() => validateTags({}), /标签必须是数组/);
  assert.throws(() => validateTags([{}]), /第 1 个标签（没有 id）：缺少 id/);
  assert.throws(() => validateTags([{ id: 'design' }]), /第 1 个标签（design）：缺少 name/);
  assert.throws(() => validateTags([{ id: 'Bad_ID', name: '设计' }]), /第 1 个标签（Bad_ID）：id 只能用/);
  assert.throws(() => validateTags([tags[0], tags[0]]), /第 2 个标签（design）：id 重复/);
  assert.doesNotThrow(() => validateTags([]));
});

test('书的标签必须是 1～3 个存在且不重复的 id', () => {
  for (const invalid of [undefined, 'design']) {
    assert.throws(() => validateBooks([book({ tags: invalid })], tags), /第 1 本书（a）：tags 必须是数组/);
  }
  for (const invalid of [[], ['design', 'design', 'design', 'design']]) {
    assert.throws(() => validateBooks([book({ tags: invalid })], tags), /第 1 本书（a）：tags 必须有 1～3 个/);
  }
  assert.throws(() => validateBooks([book({ tags: ['design', 'design'] })], tags), /第 1 本书（a）：标签 design 重复/);
  assert.throws(() => validateBooks([book({ tags: ['missing'] })], tags), /第 1 本书（a）：引用了不存在的标签 missing/);
});

test('按标签计数保留定义顺序和零本书的标签', () => {
  assert.deepEqual(countByTag([book(), book({ id: 'b' })], tags), [
    { id: 'design', name: '设计', count: 2 },
    { id: 'unused', name: '未使用', count: 0 },
  ]);
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
