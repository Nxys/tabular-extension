// 临时调试脚本
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

const { detectFixedColumns, detectHTMLTable } = require('./src/content/detector.ts');

const table = document.createElement('table');
const headerRow = document.createElement('tr');

const th1 = document.createElement('th');
th1.className = 'ant-table-cell-fix-left';
th1.textContent = '姓名';
headerRow.appendChild(th1);

const th2 = document.createElement('th');
th2.textContent = '年龄';
headerRow.appendChild(th2);

table.appendChild(headerRow);
document.body.appendChild(table);

console.log('Table HTML:', table.outerHTML);
console.log('First cell className:', th1.className);
console.log('detectFixedColumns result:', detectFixedColumns(table, 'ant-design'));
console.log('detectHTMLTable result:', detectHTMLTable(table));
