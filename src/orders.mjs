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

/** 把订单格式化成按列对齐的文本表格。 */
export function formatTable(orders) {
  const header = ['id', 'date', 'customer', 'amount', 'status'];
  const rows = orders.map((o) => [o.id, o.date, o.customer, o.amount.toFixed(2), o.status]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ').trimEnd();
  return [line(header), ...rows.map(line)].join('\n');
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 校验字符串是否为 YYYY-MM-DD 且是一个真实存在的日期。 */
export function isValidDate(str) {
  if (typeof str !== 'string' || !DATE_RE.test(str)) {
    return false;
  }
  const [year, month, day] = str.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** 按 date（闭区间）和可选 status 过滤订单。 */
export function filterOrders(orders, { from, to, status }) {
  return orders.filter((o) => {
    if (o.date < from || o.date > to) {
      return false;
    }
    if (status !== undefined && o.status !== status) {
      return false;
    }
    return true;
  });
}

/** 按 RFC 4180 规则转义单个 CSV 字段。 */
function csvEscape(value) {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** 把订单数组序列化成 CSV 文本（含表头，不含结尾换行）。 */
export function toCsv(orders) {
  const header = ['id', 'date', 'customer', 'amount', 'status'];
  const rows = orders.map((o) => [o.id, o.date, o.customer, o.amount.toFixed(2), o.status]);
  return [header, ...rows].map((cells) => cells.map(csvEscape).join(',')).join('\n');
}
