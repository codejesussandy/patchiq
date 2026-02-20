import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { OSIcon } from '@/components/patches/OSIcon';

describe('OSIcon', () => {
  it('renders Windows icon and label', () => {
    const { container } = render(<OSIcon os="Windows" />);
    expect(screen.getByText('Windows')).toBeInTheDocument();
    expect(container.querySelector('.anticon-windows')).toBeInTheDocument();
  });

  it('renders MacOS icon and label', () => {
    const { container } = render(<OSIcon os="MacOS" />);
    expect(screen.getByText('MacOS')).toBeInTheDocument();
    expect(container.querySelector('.anticon-apple')).toBeInTheDocument();
  });

  it('renders Ubuntu icon and label', () => {
    render(<OSIcon os="Ubuntu" />);
    expect(screen.getByText('Ubuntu')).toBeInTheDocument();
  });

  it('renders Linux icon and label', () => {
    render(<OSIcon os="Linux" />);
    expect(screen.getByText('Linux')).toBeInTheDocument();
  });

  it('renders fallback text for unknown OS', () => {
    render(<OSIcon os="FreeBSD" />);
    expect(screen.getByText('FreeBSD')).toBeInTheDocument();
  });

  it('renders Windows icon with correct color', () => {
    const { container } = render(<OSIcon os="Windows" />);
    const icon = container.querySelector('.anticon-windows');
    expect(icon).toHaveStyle({ color: '#0078d4' });
  });

  it('renders MacOS icon with correct color', () => {
    const { container } = render(<OSIcon os="MacOS" />);
    const icon = container.querySelector('.anticon-apple');
    expect(icon).toHaveStyle({ color: '#000' });
  });

  it('renders Ubuntu indicator with correct color', () => {
    render(<OSIcon os="Ubuntu" />);
    // Ubuntu has a colored dot indicator
    const dotEl = screen.getByText((content, element) => {
      return content === '\u25CF' && element?.tagName === 'SPAN';
    });
    expect(dotEl).toHaveStyle({ color: '#E95420' });
  });
});
