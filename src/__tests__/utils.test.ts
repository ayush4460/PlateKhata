import { format } from 'date-fns';

// Simple unit test for a utility or logic
describe('Frontend Utilities', () => {
  it('should format date correctly', () => {
    const date = new Date(2025, 0, 1); // Jan 1 2025
    const formatted = format(date, 'yyyy-MM-dd');
    expect(formatted).toBe('2025-01-01');
  });
});
