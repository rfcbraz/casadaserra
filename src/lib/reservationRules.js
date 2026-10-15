const MINIMUM_STAY_NIGHTS = 2;

function getMinimumCheckInDate(now = new Date()) {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const parts = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  const tomorrow = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1));
  return tomorrow.toISOString().slice(0, 10);
}

function isCheckInDateAllowed(checkIn, now = new Date()) {
  const checkInDate = new Date(checkIn);
  return !Number.isNaN(checkInDate.getTime())
    && checkInDate.toISOString().slice(0, 10) >= getMinimumCheckInDate(now);
}

module.exports = { MINIMUM_STAY_NIGHTS, getMinimumCheckInDate, isCheckInDateAllowed };