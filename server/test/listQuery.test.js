import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPageMetadata,
  createTextSearch,
  escapeSearchTerm,
  parseListPage,
} from '../src/utils/listQuery.js';

test('list pagination uses safe defaults and clamps unreasonable limits', () => {
  assert.deepEqual(parseListPage({}), { page: 1, limit: 15, skip: 0 });
  assert.deepEqual(parseListPage({ page: '-4', limit: '500' }), { page: 1, limit: 50, skip: 0 });
  assert.deepEqual(parseListPage({ page: '3', limit: '10' }), { page: 3, limit: 10, skip: 20 });
});

test('search terms are literal text and cannot add a regular-expression query', () => {
  assert.equal(escapeSearchTerm('(a).*'), '\\(a\\)\\.\\*');
  const search = createTextSearch(['name', 'studentId'], 'A.*');
  assert.equal(search.$or.length, 2);
  assert.equal(search.$or[0].name.test('A.*'), true);
  assert.equal(search.$or[0].name.test('Anything'), false);
  assert.equal(createTextSearch(['name'], '   '), null);
});

test('pagination metadata reports navigation availability', () => {
  assert.deepEqual(createPageMetadata(2, 10, 25), {
    page: 2, limit: 10, total: 25, pages: 3, hasPreviousPage: true, hasNextPage: true,
  });
  assert.deepEqual(createPageMetadata(1, 10, 0), {
    page: 1, limit: 10, total: 0, pages: 0, hasPreviousPage: false, hasNextPage: false,
  });
});
