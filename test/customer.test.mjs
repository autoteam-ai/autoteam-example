import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { customerOrders, summarizeOrders } from '../src/orders.mjs';

const CLI = fileURLToPath(new URL('../bin/orders.mjs', import.meta.url));
const orders = [
  { id: 'SO-3', date: '2026-09-03', customer: 'Acme, Inc.', amount: 20.25, status: 'paid' },
  { id: 'SO-2', date: '2026-09-02', customer: 'Acme, Inc. Extra', amount: 500, status: 'paid' },
  { id: 'SO-1', date: '2026-09-01', customer: 'ACME, INC.', amount: 10.5, status: 'pending' },
];
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

test('customerOrders 忽略大小写完整匹配并按订单号升序，不修改输入', () => {
  const before = structuredClone(orders);
  assert.deepEqual(customerOrders(orders, 'acme, inc.').map((o) => o.id), ['SO-1', 'SO-3']);
  assert.deepEqual(orders, before);
  assert.deepEqual(customerOrders(orders, 'Acme'), []);
  assert.deepEqual(customerOrders(orders, 'Nope'), []);
  assert.deepEqual(customerOrders([], 'Acme'), []);
});

test('summarizeOrders 汇总匹配订单及空集合', () => {
  assert.deepEqual(summarizeOrders(customerOrders(orders, 'Acme, Inc.')), { count: 2, amount: 30.75 });
  assert.deepEqual(summarizeOrders([]), { count: 0, amount: 0 });
});

test('customer 查询全部匹配订单，排序、三列输出和合计正确', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'orders-customer-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'orders.json');
  writeFileSync(file, JSON.stringify(orders));
  const result = run('customer', 'Acme, Inc.', '--file', file);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const lines = result.stdout.trim().split('\n');
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^id\s+date\s+amount$/);
  assert.match(lines[1], /^SO-1\s+2026-09-01\s+10\.50$/);
  assert.match(lines[2], /^SO-3\s+2026-09-03\s+20\.25$/);
  assert.equal(lines[3], '合计：2 笔订单，总金额 30.75');
});

for (const [name, id, amount] of [
  ['Northwind', 'SO-1001', '120.50'],
  ['Acme, Inc.', 'SO-1002', '89.00'],
  ['Bob "The Builder"', 'SO-1005', '15.99'],
]) {
  test(`customer 正常匹配 ${name}，大小写不同结果一致`, () => {
    const result = run('customer', name);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.ok(result.stdout.includes(id));
    assert.ok(result.stdout.endsWith(`合计：1 笔订单，总金额 ${amount}\n`));
    const lowercase = run('customer', name.toLowerCase());
    assert.equal(lowercase.status, 0);
    assert.equal(lowercase.stdout, result.stdout);
  });
}

for (const name of ['Nope', 'Acme', 'Builder']) {
  test(`customer ${name} 不匹配时返回非 0 并在 stderr 提示`, () => {
    const result = run('customer', name);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.ok(result.stderr.includes(`未找到客户 "${name}" 的订单`));
  });
}

for (const args of [[], [''], ['Acme,', 'Inc.']]) {
  test(`customer 参数错误 ${JSON.stringify(args)}`, () => {
    const result = run('customer', ...args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /需要一个客户名参数/);
  });
}

test('--help 包含 customer 命令说明', () => {
  const result = run('--help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /customer <名字>/);
});
