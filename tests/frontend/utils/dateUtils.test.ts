import { formatDate, formatTransactionDate } from '../../src/utils/dateUtils';
import { renderHook } from '@testing-library/react-hooks'; // If using hooks later

test('formats date correctly', () => {
  expect(formatDate('2023-10-01T12:00:00Z', 'PPP')).toBe('Oct 1st, 2023');
});

test('formats transaction date for today', () => {
  const today = new Date().toISOString();
  expect(formatTransactionDate(today)).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
});
