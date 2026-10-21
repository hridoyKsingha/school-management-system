import assert from 'node:assert/strict';
import test from 'node:test';
import { requireRole } from '../src/middleware/requireAdmin.js';

function authorize(role, ...allowedRoles) {
  let nextCalled = false;
  let statusCode = 200;
  let body;
  const response = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  requireRole(...allowedRoles)({ admin: role ? { role } : {} }, response, () => { nextCalled = true; });
  return { nextCalled, statusCode, body };
}

test('admin-only policy permits admin and legacy accounts without a role', () => {
  assert.equal(authorize('admin', 'admin').nextCalled, true);
  assert.equal(authorize(undefined, 'admin').nextCalled, true);
});

test('staff roles are denied admin-only operations', () => {
  for (const role of ['teacher', 'student', 'guardian']) {
    const result = authorize(role, 'admin');
    assert.equal(result.nextCalled, false, `${role} should not pass the admin policy`);
    assert.equal(result.statusCode, 403);
    assert.match(result.body.message, /permission/i);
  }
});

test('a role policy can grant a specific staff capability without granting admin access', () => {
  assert.equal(authorize('teacher', 'teacher').nextCalled, true);
  assert.equal(authorize('student', 'teacher').statusCode, 403);
});
