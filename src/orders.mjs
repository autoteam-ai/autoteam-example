// 订单数据的读取和展示。
import { readFile } from 'node:fs/promises';

/** 读取订单 JSON 文件，返回订单数组。 */
export async function loadOrders(path) {
  const orders = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(orders)) {
    throw new Error(`${path} 应该是订单数组`);
  }
  return orders;
}

/** 按金额从高到低取前 n 个订单；金额相同时按订单号升序排列。 */
export function topOrders(orders, n) {
  return [...orders]
    .sort((a, b) => b.amount - a.amount || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, n);
}

/** 按客户名过滤订单（大小写不敏感、完整匹配），按订单号升序排列。 */
export function ordersByCustomer(orders, customer) {
  const needle = customer.toLowerCase();
  return orders
    .filter((o) => o.customer.toLowerCase() === needle)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** 计算订单数和总金额。 */
export function summarizeOrders(orders) {
  return {
    count: orders.length,
    total: orders.reduce((sum, o) => sum + o.amount, 0),
  };
}

/** 把订单格式化成按列对齐的文本表格。 */
export function formatTable(orders) {
  const header = ['id', 'date', 'customer', 'amount', 'status'];
  const rows = orders.map((o) => [o.id, o.date, o.customer, o.amount.toFixed(2), o.status]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ').trimEnd();
  return [line(header), ...rows.map(line)].join('\n');
}
