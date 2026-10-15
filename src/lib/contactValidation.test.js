const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEmail, normalizePhoneNumber } = require('./contactValidation');

test('validateEmail accepts a valid email and trims surrounding whitespace', () => {
  assert.equal(validateEmail(' guest@example.com ').success, true);
});

test('validateEmail rejects malformed and overlong email addresses', () => {
  assert.equal(validateEmail('guest@invalid').success, false);
  assert.equal(validateEmail('guest example@example.com').success, false);
  assert.equal(validateEmail(`${'a'.repeat(250)}@example.com`).success, false);
});

test('normalizePhoneNumber accepts international numbers and common separators', () => {
  assert.equal(normalizePhoneNumber('+351 912 345 678'), '+351912345678');
  assert.equal(normalizePhoneNumber('+1 (202) 555-0123'), '+12025550123');
});

test('normalizePhoneNumber accepts legacy local phone values with valid length', () => {
  assert.equal(normalizePhoneNumber('912 345 678'), '912345678');
  assert.equal(normalizePhoneNumber(''), null);
});

test('normalizePhoneNumber rejects invalid characters and E.164 length', () => {
  assert.equal(normalizePhoneNumber('+351 abc 123'), null);
  assert.equal(normalizePhoneNumber('+35112'), null);
  assert.equal(normalizePhoneNumber(`+${'1'.repeat(16)}`), null);
});
