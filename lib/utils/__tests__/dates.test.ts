import {
  formatDuration,
  formatDurationCompact,
  getTimeColorClass
} from '../dates';

describe('Time Duration Functions', () => {
  describe('formatDuration', () => {
    it('should return dash for null or undefined', () => {
      expect(formatDuration(null)).toBe('—');
      expect(formatDuration(undefined)).toBe('—');
      expect(formatDuration(0)).toBe('—');
      expect(formatDuration(-1)).toBe('—');
    });

    it('should format seconds correctly', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(90)).toBe('2m');
      expect(formatDuration(1800)).toBe('30m');
      expect(formatDuration(3540)).toBe('59m');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(5400)).toBe('1h 30m');
      expect(formatDuration(7200)).toBe('2h');
      expect(formatDuration(7380)).toBe('2h 3m');
    });

    it('should format days and hours correctly', () => {
      expect(formatDuration(86400)).toBe('1d');
      expect(formatDuration(90000)).toBe('1d 1h');
      expect(formatDuration(172800)).toBe('2d');
      expect(formatDuration(180000)).toBe('2d 2h');
    });
  });

  describe('formatDurationCompact', () => {
    it('should return dash for null or undefined', () => {
      expect(formatDurationCompact(null)).toBe('—');
      expect(formatDurationCompact(undefined)).toBe('—');
      expect(formatDurationCompact(0)).toBe('—');
    });

    it('should format seconds correctly', () => {
      expect(formatDurationCompact(30)).toBe('30s');
      expect(formatDurationCompact(59)).toBe('59s');
    });

    it('should format minutes correctly', () => {
      expect(formatDurationCompact(60)).toBe('1m');
      expect(formatDurationCompact(1800)).toBe('30m');
    });

    it('should format hours with decimal for < 10h', () => {
      expect(formatDurationCompact(3600)).toBe('1h');
      expect(formatDurationCompact(5400)).toBe('1.5h');
      expect(formatDurationCompact(7200)).toBe('2h');
      expect(formatDurationCompact(9000)).toBe('2.5h');
    });

    it('should format hours without decimal for >= 10h', () => {
      expect(formatDurationCompact(36000)).toBe('10h');
      expect(formatDurationCompact(39600)).toBe('11h');
      expect(formatDurationCompact(43200)).toBe('12h');
    });
  });

  describe('getTimeColorClass', () => {
    it('should return gray for null or zero', () => {
      expect(getTimeColorClass(null)).toBe('text-gray-500');
      expect(getTimeColorClass(undefined)).toBe('text-gray-500');
      expect(getTimeColorClass(0)).toBe('text-gray-500');
      expect(getTimeColorClass(-1)).toBe('text-gray-500');
    });

    it('should return green for < 30 minutes', () => {
      const greenClass = 'text-green-600 dark:text-green-400';
      expect(getTimeColorClass(1800 - 1)).toBe(greenClass); // 29:59
      expect(getTimeColorClass(900)).toBe(greenClass); // 15 min
      expect(getTimeColorClass(60)).toBe(greenClass); // 1 min
    });

    it('should return yellow for 30 min - 2 hours', () => {
      const yellowClass = 'text-yellow-600 dark:text-yellow-400';
      expect(getTimeColorClass(1800)).toBe(yellowClass); // 30 min
      expect(getTimeColorClass(3600)).toBe(yellowClass); // 1 hour
      expect(getTimeColorClass(7200 - 1)).toBe(yellowClass); // 1:59:59
    });

    it('should return red for > 2 hours', () => {
      const redClass = 'text-red-600 dark:text-red-400';
      expect(getTimeColorClass(7200)).toBe(redClass); // 2 hours
      expect(getTimeColorClass(10800)).toBe(redClass); // 3 hours
      expect(getTimeColorClass(86400)).toBe(redClass); // 24 hours
    });
  });
});