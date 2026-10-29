'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const normalizeTodoTitle = require('./normalize-todo-title');

test('普通字符串原样返回', () => {
  assert.equal(normalizeTodoTitle('买牛奶'), '买牛奶');
});

test('去除首尾空白', () => {
  assert.equal(normalizeTodoTitle('  买牛奶  '), '买牛奶');
});

test('保留中间空白', () => {
  assert.equal(normalizeTodoTitle('a  b'), 'a  b');
  assert.equal(normalizeTodoTitle('  a  b  '), 'a  b');
});

test('空字符串返回 null', () => {
  assert.equal(normalizeTodoTitle(''), null);
});

test('纯空格返回 null', () => {
  assert.equal(normalizeTodoTitle('   '), null);
});

test('纯制表符与换行返回 null', () => {
  assert.equal(normalizeTodoTitle('\t\n'), null);
  assert.equal(normalizeTodoTitle(' \t\r\n '), null);
});

test('null 返回 null', () => {
  assert.equal(normalizeTodoTitle(null), null);
});

test('undefined 返回 null', () => {
  assert.equal(normalizeTodoTitle(undefined), null);
});

test('数字返回 null', () => {
  assert.equal(normalizeTodoTitle(123), null);
  assert.equal(normalizeTodoTitle(0), null);
  assert.equal(normalizeTodoTitle(NaN), null);
});

test('布尔值返回 null', () => {
  assert.equal(normalizeTodoTitle(true), null);
  assert.equal(normalizeTodoTitle(false), null);
});

test('对象返回 null', () => {
  assert.equal(normalizeTodoTitle({ title: '买牛奶' }), null);
});

test('数组返回 null', () => {
  assert.equal(normalizeTodoTitle(['买牛奶']), null);
  assert.equal(normalizeTodoTitle([]), null);
});
