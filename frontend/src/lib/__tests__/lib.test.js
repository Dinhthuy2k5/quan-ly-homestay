import test from 'node:test';
import assert from 'node:assert/strict';
import { formatVnd, formatDate, nightsBetween } from '../format.js';
import { getStatusInfo } from '../status.js';
import { getErrorMessage, ERROR_MESSAGES } from '../errors.js';

test('formatVnd formats money integers correctly to Vietnamese Dong', () => {
  assert.equal(formatVnd(0), '0 ₫');
  assert.equal(formatVnd(500000), '500.000 ₫');
  assert.equal(formatVnd(1800000), '1.800.000 ₫');
  assert.equal(formatVnd(null), 'Liên hệ');
  assert.equal(formatVnd(undefined), 'Liên hệ');
});

test('formatDate formats YYYY-MM-DD strings without timezone shift', () => {
  assert.equal(formatDate('2026-10-17'), '17/10/2026');
  assert.equal(formatDate('2026-01-05'), '05/01/2026');
  assert.equal(formatDate(''), '');
  assert.equal(formatDate(null), '');
});

test('nightsBetween calculates days accurately', () => {
  assert.equal(nightsBetween('2026-10-10', '2026-10-12'), 2);
  assert.equal(nightsBetween('2026-10-10', '2026-10-11'), 1);
  assert.equal(nightsBetween('2026-10-10', '2026-10-10'), 0);
});

test('getStatusInfo maps room status to label and color', () => {
  const active = getStatusInfo('room', 'ACTIVE');
  assert.equal(active.label, 'Đang nhận đặt');
  assert.equal(active.color, 'success');

  const locked = getStatusInfo('room', 'LOCKED');
  assert.equal(locked.label, 'Tạm khóa');
  assert.equal(locked.color, 'warning');
});

test('getErrorMessage returns friendly Vietnamese message from error code', () => {
  const errWithCode = { response: { data: { error: { code: 'ROOM_NOT_AVAILABLE' } } } };
  assert.equal(getErrorMessage(errWithCode), ERROR_MESSAGES.ROOM_NOT_AVAILABLE);

  const errNotFound = { response: { status: 404 } };
  assert.equal(getErrorMessage(errNotFound), 'Không tìm thấy dữ liệu yêu cầu.');
});
