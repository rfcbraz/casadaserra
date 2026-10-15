const test = require('node:test');
const assert = require('node:assert/strict');
const { getMinimumCheckInDate, isCheckInDateAllowed } = require('./reservationRules');

test('minimum check-in date is tomorrow in Portugal', () => {
  assert.equal(getMinimumCheckInDate(new Date('2026-10-15T12:00:00Z')), '2026-10-16');
});

test('minimum check-in date follows Portugal midnight across UTC dates', () => {
  assert.equal(getMinimumCheckInDate(new Date('2026-10-15T22:59:59Z')), '2026-10-16');
  assert.equal(getMinimumCheckInDate(new Date('2026-10-15T23:00:00Z')), '2026-10-17');
});

test('check-in is allowed starting tomorrow, but not today or earlier', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  assert.equal(isCheckInDateAllowed('2026-10-16', now), true);
  assert.equal(isCheckInDateAllowed('2026-10-15', now), false);
  assert.equal(isCheckInDateAllowed('2026-10-14', now), false);
});
