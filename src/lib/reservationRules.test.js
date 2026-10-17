const test = require('node:test');
const assert = require('node:assert/strict');
const { getMinimumCheckInDate, isCheckInDateAllowed } = require('./reservationRules');

// Em outubro Portugal está em UTC+1 (hora de verão)
test('same-day check-in is allowed until 22:00 in Portugal', () => {
  assert.equal(getMinimumCheckInDate(new Date('2026-10-15T12:00:00Z')), '2026-10-15'); // 13:00
  assert.equal(getMinimumCheckInDate(new Date('2026-10-15T20:59:59Z')), '2026-10-15'); // 21:59:59
});

test('from 22:00 in Portugal the minimum check-in moves to tomorrow', () => {
  assert.equal(getMinimumCheckInDate(new Date('2026-10-15T21:00:00Z')), '2026-10-16'); // 22:00
  assert.equal(getMinimumCheckInDate(new Date('2026-10-15T22:59:59Z')), '2026-10-16'); // 23:59:59
});

test('cutoff follows Portugal time in winter (UTC+0)', () => {
  assert.equal(getMinimumCheckInDate(new Date('2026-12-15T21:59:00Z')), '2026-12-15');
  assert.equal(getMinimumCheckInDate(new Date('2026-12-15T22:00:00Z')), '2026-12-16');
});

test('check-in today is allowed before 22:00, past dates never', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  assert.equal(isCheckInDateAllowed('2026-10-15', now), true);
  assert.equal(isCheckInDateAllowed('2026-10-16', now), true);
  assert.equal(isCheckInDateAllowed('2026-10-14', now), false);
  assert.equal(isCheckInDateAllowed('2026-10-15', new Date('2026-10-15T21:30:00Z')), false);
});
