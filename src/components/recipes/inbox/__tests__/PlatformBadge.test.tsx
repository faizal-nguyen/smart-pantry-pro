import { render, screen } from '@testing-library/react';

import { PlatformBadge } from '../PlatformBadge';

describe('PlatformBadge', () => {
  it.each([
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['youtube', 'YouTube'],
    ['pinterest', 'Pinterest'],
    ['web', 'Web'],
    ['manual', 'Manuel'],
    ['unknown', 'Source'],
  ] as const)('renders the %s label', (platform, label) => {
    render(<PlatformBadge platform={platform} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('hides the label when iconOnly is set', () => {
    render(<PlatformBadge platform="instagram" iconOnly />);
    expect(screen.queryByText('Instagram')).not.toBeInTheDocument();
  });
});
