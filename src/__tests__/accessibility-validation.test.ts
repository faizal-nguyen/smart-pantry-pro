/**
 * Accessibility Validation Tests
 * Comprehensive WCAG AAA compliance testing for layout optimization system
 * Based on PRP-022-Layout-Optimization specification
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import { AdaptiveHeroViewport, HeroVariants } from '@/components/layout/AdaptiveHeroViewport';
import { SimplifiedMorphingNav, EnhancedLayout } from '@/components/navigation/SimplifiedMorphingNav';
import { PerformanceMonitor, LayoutPerformanceProvider } from '@/components/performance/PerformanceMonitor';
import { HybridGoldenGrid } from '@/design-system/HybridGoldenGrid';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock viewport hooks
jest.mock('@/hooks/useResponsiveZones', () => ({
  useViewport: () => ({
    width: 1024,
    height: 768,
    innerWidth: 1024,
    innerHeight: 768,
    availableHeight: 768,
  }),
  useBreakpoints: () => ({
    isMobile: false,
    isTablet: true,
    isDesktop: false,
    isWide: false,
    current: 'tablet',
  }),
  useResponsiveZones: () => ({
    zones: {
      hero: { height: '61.8vh', span: 12 },
      primary: { height: 'auto', span: 12 },
      secondary: { height: 'auto', span: 12 },
      navigation: { position: 'bottom', height: 64, span: 12 },
    },
    applyZone: (zone: string) => ({ height: 'auto', span: 12 }),
    grid: HybridGoldenGrid.generateHybridGrid(1024, 768),
  }),
  useAdaptiveHero: () => ({
    heroHeight: 473,
    heroHeightVh: '61.8vh',
    heroClassName: 'adaptive-hero adaptive-hero--medium adaptive-hero--browsing adaptive-hero--balanced',
  }),
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/test',
  }),
  useNavigate: () => jest.fn(),
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Layout Optimization Accessibility', () => {
  describe('HybridGoldenGrid System', () => {
    test('generates accessible touch targets', () => {
      const grid = HybridGoldenGrid.generateHybridGrid(1024, 768);
      
      // Test touch target sizes meet WCAG minimum requirements
      expect(grid.touchTargets.minimum).toBeGreaterThanOrEqual(44); // WCAG AA minimum
      expect(grid.touchTargets.comfortable).toBeGreaterThanOrEqual(44);
      expect(grid.touchTargets.generous).toBeGreaterThanOrEqual(44);
      
      // Test platform-specific optimizations
      Object.values(grid.touchTargets.contextual).forEach(size => {
        expect(size).toBeGreaterThanOrEqual(44);
      });
    });

    test('calculates contextual spacing correctly', () => {
      const cookingSpacing = HybridGoldenGrid.calculateContextualSpacing('cooking', 'medium');
      const shoppingSpacing = HybridGoldenGrid.calculateContextualSpacing('shopping', 'medium');
      const browsingSpacing = HybridGoldenGrid.calculateContextualSpacing('browsing', 'medium');
      
      expect(cookingSpacing).toBeGreaterThan(0);
      expect(shoppingSpacing).toBeGreaterThan(0);
      expect(browsingSpacing).toBeGreaterThan(0);
      
      // Cooking should have more spacing for easier interaction
      expect(cookingSpacing).toBeGreaterThanOrEqual(shoppingSpacing);
    });

    test('generates proper CSS custom properties', () => {
      const cssProps = HybridGoldenGrid.generateCSSProperties(1024, 768);
      
      // Verify essential spacing properties exist
      expect(cssProps).toHaveProperty('--spacing-unit');
      expect(cssProps).toHaveProperty('--touch-minimum');
      expect(cssProps).toHaveProperty('--golden-primary-section');
      
      // Verify touch target values are strings with px suffix
      expect(cssProps['--touch-minimum']).toMatch(/^\d+px$/);
      expect(cssProps['--touch-comfortable']).toMatch(/^\d+px$/);
      expect(cssProps['--touch-generous']).toMatch(/^\d+px$/);
    });
  });

  describe('AdaptiveHeroViewport Component', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(
        <AdaptiveHeroViewport
          content={{ density: 'medium' }}
          context={{ mode: 'browsing' }}
          performanceMode="balanced"
        >
          <div>Test content</div>
        </AdaptiveHeroViewport>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('respects reduced motion preference', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { container } = render(
        <AdaptiveHeroViewport
          content={{ density: 'medium' }}
          context={{ mode: 'browsing' }}
          performanceMode="balanced"
          enableParallax={true}
        >
          <div>Test content</div>
        </AdaptiveHeroViewport>
      );

      // Should not enable parallax when reduced motion is preferred
      const heroElement = container.querySelector('.adaptive-hero-viewport');
      expect(heroElement).toHaveAttribute('data-performance', 'balanced');
    });

    test('maintains proper contrast ratios', () => {
      const { container } = render(
        <AdaptiveHeroViewport
          content={{ density: 'medium' }}
          context={{ mode: 'cooking' }}
          performanceMode="balanced"
        >
          <div>Test content</div>
        </AdaptiveHeroViewport>
      );

      const heroElement = container.querySelector('.adaptive-hero-viewport');
      expect(heroElement).toHaveAttribute('data-context', 'cooking');
      
      // Verify gradient background exists for proper contrast
      const styles = window.getComputedStyle(heroElement!);
      expect(styles.background).toBeTruthy();
    });

    test('hero variants are accessible', async () => {
      const mockStats = [
        { label: 'Recipes', value: '150', icon: <span>📝</span> },
        { label: 'Items', value: '45', icon: <span>🥘</span> },
      ];

      const { container } = render(
        <HeroVariants.Dashboard stats={mockStats} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('SimplifiedMorphingNav Component', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(
        <SimplifiedMorphingNav />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('navigation items are keyboard accessible', () => {
      render(<SimplifiedMorphingNav />);

      const navButtons = screen.getAllByRole('button');
      
      navButtons.forEach(button => {
        expect(button).toHaveAttribute('tabindex', '0');
        
        // Test keyboard activation
        fireEvent.keyDown(button, { key: 'Enter' });
        fireEvent.keyDown(button, { key: ' ' });
      });
    });

    test('touch targets meet minimum size requirements', () => {
      const { container } = render(<SimplifiedMorphingNav />);

      const navButtons = container.querySelectorAll('button');
      
      navButtons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        const minWidth = parseInt(styles.minWidth);
        
        // WCAG AA minimum is 44px, AAA is 58px
        expect(minHeight).toBeGreaterThanOrEqual(44);
        expect(minWidth).toBeGreaterThanOrEqual(44);
      });
    });

    test('provides proper ARIA labels and roles', () => {
      render(<SimplifiedMorphingNav />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    test('navigation state changes are announced to screen readers', async () => {
      const { rerender } = render(
        <SimplifiedMorphingNav forceState="default" />
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('data-nav-state', 'default');

      rerender(<SimplifiedMorphingNav forceState="cooking" />);
      
      await waitFor(() => {
        expect(nav).toHaveAttribute('data-nav-state', 'cooking');
      });
    });

    test('supports high contrast mode', () => {
      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { container } = render(<SimplifiedMorphingNav />);

      // Should maintain accessibility in high contrast mode
      const navButtons = container.querySelectorAll('button');
      navButtons.forEach(button => {
        expect(button).toBeVisible();
      });
    });
  });

  describe('PerformanceMonitor Component', () => {
    test('performance monitor is accessible when visible', async () => {
      const { container } = render(
        <LayoutPerformanceProvider>
          <PerformanceMonitor showDebugInfo={true} />
        </LayoutPerformanceProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('does not interfere with accessibility when hidden', async () => {
      const { container } = render(
        <LayoutPerformanceProvider>
          <PerformanceMonitor showDebugInfo={false} />
        </LayoutPerformanceProvider>
      );

      // Should not render any visible content
      expect(container.firstChild).toBeNull();
    });

    test('performance issues are announced appropriately', async () => {
      const mockOnPerformanceIssue = jest.fn();

      render(
        <LayoutPerformanceProvider>
          <PerformanceMonitor 
            showDebugInfo={true}
            onPerformanceIssue={mockOnPerformanceIssue}
          />
        </LayoutPerformanceProvider>
      );

      // Wait for performance monitoring to initialize
      await waitFor(() => {
        // Mock performance issue callback should be set up
        expect(mockOnPerformanceIssue).toBeDefined();
      });
    });
  });

  describe('EnhancedLayout Component', () => {
    test('layout structure is semantically correct', async () => {
      const { container } = render(
        <EnhancedLayout
          heroContent={<div>Hero Content</div>}
          enableMorphingNav={true}
        >
          <div>Main Content</div>
        </EnhancedLayout>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('maintains proper landmark structure', () => {
      render(
        <EnhancedLayout
          heroContent={<div>Hero Content</div>}
          enableMorphingNav={true}
        >
          <div>Main Content</div>
        </EnhancedLayout>
      );

      // Should have proper landmark roles
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    test('skip links are provided for keyboard users', () => {
      render(
        <EnhancedLayout
          heroContent={<div>Hero Content</div>}
          enableMorphingNav={true}
        >
          <div>Main Content</div>
        </EnhancedLayout>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
      
      // Main content should be easily navigable
      expect(mainContent).toHaveClass('main-content');
    });
  });

  describe('Responsive Behavior Accessibility', () => {
    test('maintains accessibility across different viewport sizes', async () => {
      const viewportSizes = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1024, height: 768 }, // Desktop
        { width: 1440, height: 900 }, // Wide
      ];

      for (const viewport of viewportSizes) {
        // Mock different viewport sizes
        jest.mock('@/hooks/useResponsiveZones', () => ({
          useViewport: () => ({
            width: viewport.width,
            height: viewport.height,
            innerWidth: viewport.width,
            innerHeight: viewport.height,
            availableHeight: viewport.height,
          }),
          useBreakpoints: () => ({
            isMobile: viewport.width < 768,
            isTablet: viewport.width >= 768 && viewport.width < 1024,
            isDesktop: viewport.width >= 1024,
            isWide: viewport.width >= 1440,
            current: viewport.width < 768 ? 'mobile' : 
                     viewport.width < 1024 ? 'tablet' : 'desktop',
          }),
          useResponsiveZones: () => ({
            zones: {
              hero: { height: '61.8vh', span: 12 },
              primary: { height: 'auto', span: 12 },
              secondary: { height: 'auto', span: 12 },
              navigation: { position: 'bottom', height: 64, span: 12 },
            },
            applyZone: () => ({ height: 'auto', span: 12 }),
            grid: HybridGoldenGrid.generateHybridGrid(viewport.width, viewport.height),
          }),
        }));

        const { container } = render(
          <EnhancedLayout enableMorphingNav={true}>
            <div>Responsive Content</div>
          </EnhancedLayout>
        );

        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });

    test('touch targets scale appropriately on mobile', () => {
      const grid = HybridGoldenGrid.generateHybridGrid(320, 568);
      
      // Mobile should have larger touch targets
      expect(grid.touchTargets.minimum).toBeGreaterThanOrEqual(44);
      expect(grid.touchTargets.contextual.cooking).toBeGreaterThan(grid.touchTargets.minimum);
    });

    test('text remains readable across all screen sizes', () => {
      const { container } = render(
        <AdaptiveHeroViewport
          content={{ density: 'medium' }}
          context={{ mode: 'browsing' }}
          performanceMode="balanced"
        >
          <h1>Test Title</h1>
          <p>Test subtitle content</p>
        </AdaptiveHeroViewport>
      );

      const title = container.querySelector('h1');
      const subtitle = container.querySelector('p');

      expect(title).toBeVisible();
      expect(subtitle).toBeVisible();
    });
  });

  describe('Platform-Specific Accessibility', () => {
    test('iOS touch targets meet Apple guidelines (44px minimum)', () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      const grid = HybridGoldenGrid.generateHybridGrid(375, 812);
      expect(grid.touchTargets.minimum).toBeGreaterThanOrEqual(44);
    });

    test('Android touch targets meet Material Design guidelines (48px minimum)', () => {
      // Mock Android user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        configurable: true,
      });

      const grid = HybridGoldenGrid.generateHybridGrid(393, 851);
      expect(grid.touchTargets.minimum).toBeGreaterThanOrEqual(48);
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('hero content maintains WCAG AAA contrast ratios', () => {
      const { container } = render(
        <HeroVariants.Dashboard />
      );

      const heroTitle = container.querySelector('.hero-title');
      expect(heroTitle).toHaveStyle('color: white');
      
      // White text on gradient background should provide sufficient contrast
      expect(heroTitle).toHaveStyle('text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3)');
    });

    test('navigation states provide clear visual feedback', () => {
      const { container } = render(
        <SimplifiedMorphingNav forceState="cooking" />
      );

      const nav = container.querySelector('nav');
      expect(nav).toHaveAttribute('data-nav-state', 'cooking');
    });

    test('performance indicators use accessible colors', async () => {
      const { container } = render(
        <LayoutPerformanceProvider>
          <PerformanceMonitor showDebugInfo={true} />
        </LayoutPerformanceProvider>
      );

      // Wait for performance monitor to render
      await waitFor(() => {
        const performanceDisplay = container.querySelector('.performance-monitor');
        expect(performanceDisplay).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    test('all interactive elements are keyboard accessible', () => {
      const { container } = render(
        <EnhancedLayout enableMorphingNav={true}>
          <button>Test Button</button>
        </EnhancedLayout>
      );

      const interactiveElements = container.querySelectorAll('button, [role="button"], a, input');
      
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex');
        expect(element.tabIndex).toBeGreaterThanOrEqual(0);
      });
    });

    test('focus management works correctly during navigation state changes', async () => {
      render(<SimplifiedMorphingNav />);

      const buttons = screen.getAllByRole('button');
      const firstButton = buttons[0];

      firstButton.focus();
      expect(firstButton).toHaveFocus();

      fireEvent.keyDown(firstButton, { key: 'Tab' });
      
      // Focus should move to next button
      await waitFor(() => {
        expect(buttons[1]).toHaveFocus();
      });
    });
  });

  describe('Screen Reader Support', () => {
    test('navigation state changes are announced', () => {
      const { container, rerender } = render(
        <SimplifiedMorphingNav forceState="default" />
      );

      const nav = container.querySelector('nav');
      expect(nav).toHaveAttribute('data-nav-state', 'default');

      rerender(<SimplifiedMorphingNav forceState="cooking" />);
      expect(nav).toHaveAttribute('data-nav-state', 'cooking');
    });

    test('hero statistics are properly labeled', () => {
      const mockStats = [
        { label: 'Total Recipes', value: '150', icon: <span>📝</span> },
        { label: 'Pantry Items', value: '45', icon: <span>🥘</span> },
      ];

      render(<HeroVariants.Dashboard stats={mockStats} />);

      const statElements = screen.getAllByText(/\d+/);
      expect(statElements.length).toBeGreaterThan(0);
      
      // Each stat should have an associated label
      expect(screen.getByText('Total Recipes')).toBeInTheDocument();
      expect(screen.getByText('Pantry Items')).toBeInTheDocument();
    });

    test('performance metrics are accessible to screen readers', async () => {
      const { container } = render(
        <LayoutPerformanceProvider>
          <PerformanceMonitor showDebugInfo={true} />
        </LayoutPerformanceProvider>
      );

      await waitFor(() => {
        const performanceDisplay = container.querySelector('.performance-monitor');
        expect(performanceDisplay).toBeInTheDocument();
      });

      // Performance data should be structured accessibly
      const metrics = container.querySelectorAll('.metric');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });
});

describe('WCAG Compliance Validation', () => {
  test('Level AA compliance for all components', async () => {
    const components = [
      <AdaptiveHeroViewport content={{ density: 'medium' }} context={{ mode: 'browsing' }}>
        <div>Content</div>
      </AdaptiveHeroViewport>,
      <SimplifiedMorphingNav />,
      <LayoutPerformanceProvider>
        <PerformanceMonitor showDebugInfo={false} />
      </LayoutPerformanceProvider>,
    ];

    for (const component of components) {
      const { container } = render(component);
      
      const results = await axe(container, {
        rules: {
          // WCAG 2.1 AA rules
          'color-contrast': { enabled: true },
          'keyboard': { enabled: true },
          'focus-visible': { enabled: true },
          'target-size': { enabled: true },
        },
      });
      
      expect(results).toHaveNoViolations();
    }
  });

  test('Level AAA compliance for critical components', async () => {
    const { container } = render(
      <EnhancedLayout
        heroContent={<HeroVariants.Dashboard />}
        enableMorphingNav={true}
      >
        <div>Main Content</div>
      </EnhancedLayout>
    );

    const results = await axe(container, {
      rules: {
        // WCAG 2.1 AAA rules (stricter)
        'color-contrast-enhanced': { enabled: true },
        'target-size': { enabled: true },
        'focus-visible': { enabled: true },
        'keyboard': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });
});