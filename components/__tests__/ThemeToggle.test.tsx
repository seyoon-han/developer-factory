/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { ThemeToggle, ThemeIndicator } from '../ui/ThemeToggle';
import { useTheme } from '../providers/ThemeProvider';

// Mock the useTheme hook
jest.mock('../providers/ThemeProvider', () => ({
  useTheme: jest.fn(),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Sun: ({ className, ...props }: any) => <div data-testid="sun-icon" className={className} {...props} />,
  Moon: ({ className, ...props }: any) => <div data-testid="moon-icon" className={className} {...props} />,
  Monitor: ({ className, ...props }: any) => <div data-testid="monitor-icon" className={className} {...props} />,
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeToggle', () => {
  const mockSetTheme = jest.fn();
  const mockGetResolvedTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTheme.mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: mockSetTheme,
      getResolvedTheme: mockGetResolvedTheme,
      isDark: false,
      isLight: true,
      isSystem: false,
    });
  });

  describe('Compact Variant', () => {
    test('should render compact toggle with light theme icon', () => {
      const { getByTestId, getByRole } = render(
        <ThemeToggle variant="compact" />
      );

      expect(getByTestId('sun-icon')).toBeInTheDocument();
      expect(getByRole('button')).toHaveAttribute('aria-label', 'Toggle theme. Current: Light');
    });

    test('should render compact toggle with dark theme icon', () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        resolvedTheme: 'dark',
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        isDark: true,
        isLight: false,
        isSystem: false,
      });

      const { getByTestId } = render(
        <ThemeToggle variant="compact" />
      );

      expect(getByTestId('moon-icon')).toBeInTheDocument();
    });

    test('should render compact toggle with system theme icon', () => {
      mockUseTheme.mockReturnValue({
        theme: 'system',
        resolvedTheme: 'light',
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        isDark: false,
        isLight: true,
        isSystem: true,
      });

      const { getByTestId, getByRole } = render(
        <ThemeToggle variant="compact" />
      );

      expect(getByTestId('monitor-icon')).toBeInTheDocument();
      expect(getByRole('button')).toHaveAttribute('aria-label', 'Toggle theme. Current: System (light)');
    });

    test('should call setTheme with next theme when clicked', async () => {
      const { getByRole } = render(
        <ThemeToggle variant="compact" />
      );

      const button = getByRole('button');
      fireEvent.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    test('should cycle through themes correctly', async () => {
      // Test light -> dark
      mockUseTheme.mockReturnValue({
        theme: 'light',
        resolvedTheme: 'light',
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        isDark: false,
        isLight: true,
        isSystem: false,
      });

      const { getByRole, rerender } = render(
        <ThemeToggle variant="compact" />
      );

      fireEvent.click(getByRole('button'));
      expect(mockSetTheme).toHaveBeenCalledWith('dark');

      // Test dark -> system
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        resolvedTheme: 'dark',
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        isDark: true,
        isLight: false,
        isSystem: false,
      });

      rerender(<ThemeToggle variant="compact" />);
      fireEvent.click(getByRole('button'));
      expect(mockSetTheme).toHaveBeenCalledWith('system');

      // Test system -> light
      mockUseTheme.mockReturnValue({
        theme: 'system',
        resolvedTheme: 'light',
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        isDark: false,
        isLight: true,
        isSystem: true,
      });

      rerender(<ThemeToggle variant="compact" />);
      fireEvent.click(getByRole('button'));
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    test('should be disabled during transition', async () => {
      const { getByRole } = render(
        <ThemeToggle variant="compact" />
      );

      const button = getByRole('button');
      fireEvent.click(button);

      // Button should be disabled temporarily
      expect(button).toHaveAttribute('disabled');

      // Wait for transition to complete
      await waitFor(() => {
        expect(button).not.toHaveAttribute('disabled');
      }, { timeout: 200 });
    });
  });

  describe('Button Variant', () => {
    test('should render button with icon only', () => {
      const { getByTestId, getByRole } = render(
        <ThemeToggle variant="button" />
      );

      expect(getByTestId('sun-icon')).toBeInTheDocument();
      expect(getByRole('button')).toBeInTheDocument();
    });

    test('should render button with labels when showLabels is true', () => {
      const { getByText } = render(
        <ThemeToggle variant="button" showLabels={true} />
      );

      expect(getByText('Light')).toBeInTheDocument();
    });

    test('should show resolved theme for system mode with labels', () => {
      mockUseTheme.mockReturnValue({
        theme: 'system',
        resolvedTheme: 'dark',
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        isDark: true,
        isLight: false,
        isSystem: true,
      });

      const { getByText } = render(
        <ThemeToggle variant="button" showLabels={true} />
      );

      expect(getByText('System')).toBeInTheDocument();
      expect(getByText('(dark)')).toBeInTheDocument();
    });
  });

  describe('Dropdown Variant', () => {
    test('should render dropdown toggle', () => {
      const { getByRole } = render(
        <ThemeToggle variant="dropdown" />
      );

      const button = getByRole('button', { expanded: false });
      expect(button).toBeInTheDocument();
    });

    test('should open dropdown when clicked', () => {
      const { getByRole } = render(
        <ThemeToggle variant="dropdown" />
      );

      const button = getByRole('button');
      fireEvent.click(button);

      expect(getByRole('button', { expanded: true })).toBeInTheDocument();
      expect(getByRole('menu')).toBeInTheDocument();
    });

    test('should display all theme options in dropdown', () => {
      const { getByRole, getByText } = render(
        <ThemeToggle variant="dropdown" />
      );

      const button = getByRole('button');
      fireEvent.click(button);

      expect(getByText('Light')).toBeInTheDocument();
      expect(getByText('Dark')).toBeInTheDocument();
      expect(getByText('System')).toBeInTheDocument();
    });

    test('should close dropdown when theme is selected', () => {
      const { getByRole, getByText } = render(
        <ThemeToggle variant="dropdown" />
      );

      const button = getByRole('button');
      fireEvent.click(button);

      const darkOption = getByText('Dark');
      fireEvent.click(darkOption);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(getByRole('button', { expanded: false })).toBeInTheDocument();
    });

    test('should close dropdown when backdrop is clicked', () => {
      const { getByRole, container } = render(
        <ThemeToggle variant="dropdown" />
      );

      const button = getByRole('button');
      fireEvent.click(button);

      // Find and click the backdrop
      const backdrop = container.querySelector('div[aria-hidden="true"]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(getByRole('button', { expanded: false })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      const { getByRole } = render(
        <ThemeToggle variant="compact" />
      );

      const button = getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('title');
    });

    test('should have proper keyboard navigation for dropdown', () => {
      const { getByRole } = render(
        <ThemeToggle variant="dropdown" />
      );

      const button = getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });

    test('should update aria-label based on current theme', () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        resolvedTheme: 'dark',
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        isDark: true,
        isLight: false,
        isSystem: false,
      });

      const { getByRole } = render(
        <ThemeToggle variant="compact" />
      );

      const button = getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Toggle theme. Current: Dark');
    });
  });

  describe('Custom Styling', () => {
    test('should apply custom className', () => {
      const { getByRole } = render(
        <ThemeToggle variant="compact" className="custom-class" />
      );

      const button = getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    test('should apply size classes correctly', () => {
      const { getByRole } = render(
        <ThemeToggle variant="compact" size="lg" />
      );

      const button = getByRole('button');
      expect(button).toHaveClass('h-12', 'w-12');
    });
  });
});

describe('ThemeIndicator', () => {
  const mockSetTheme2 = jest.fn();
  const mockGetResolvedTheme2 = jest.fn();

  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: mockSetTheme2,
      getResolvedTheme: mockGetResolvedTheme2,
      isDark: false,
      isLight: true,
      isSystem: false,
    });
  });

  test('should render theme indicator with icon', () => {
    const { getByTestId } = render(
      <ThemeIndicator />
    );

    expect(getByTestId('sun-icon')).toBeInTheDocument();
  });

  test('should render theme indicator with label', () => {
    const { getByText } = render(
      <ThemeIndicator showLabel={true} />
    );

    expect(getByText('Light')).toBeInTheDocument();
  });

  test('should show resolved theme for system mode', () => {
    mockUseTheme.mockReturnValue({
      theme: 'system',
      resolvedTheme: 'dark',
      setTheme: mockSetTheme2,
      getResolvedTheme: mockGetResolvedTheme2,
      isDark: true,
      isLight: false,
      isSystem: true,
    });

    const { getByText } = render(
      <ThemeIndicator showLabel={true} />
    );

    expect(getByText('System')).toBeInTheDocument();
    expect(getByText('(dark)')).toBeInTheDocument();
  });

  test('should apply custom className and size', () => {
    const { container } = render(
      <ThemeIndicator size="lg" className="custom-indicator" />
    );

    const indicator = container.firstChild as HTMLElement;
    expect(indicator).toHaveClass('custom-indicator');
  });
});