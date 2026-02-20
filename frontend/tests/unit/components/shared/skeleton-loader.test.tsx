import { describe, it, expect } from 'vitest';
import { render } from '../../test-utils';
import {
  TableSkeleton,
  CardSkeleton,
  ListSkeleton,
  DetailSkeleton,
  DashboardSkeleton,
} from '@/components/shared/SkeletonLoader';

describe('TableSkeleton', () => {
  it('renders default 5 skeleton rows', () => {
    const { container } = render(<TableSkeleton />);
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBe(5);
  });

  it('renders custom number of skeleton rows', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBe(3);
  });

  it('renders skeleton cards', () => {
    const { container } = render(<TableSkeleton />);
    const cards = container.querySelectorAll('.ant-card');
    expect(cards.length).toBe(5);
  });
});

describe('CardSkeleton', () => {
  it('renders default 1 skeleton card', () => {
    const { container } = render(<CardSkeleton />);
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBe(1);
  });

  it('renders custom number of skeleton cards', () => {
    const { container } = render(<CardSkeleton count={3} />);
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBe(3);
  });
});

describe('ListSkeleton', () => {
  it('renders default 5 skeleton items', () => {
    const { container } = render(<ListSkeleton />);
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBe(5);
  });

  it('renders custom number of skeleton items', () => {
    const { container } = render(<ListSkeleton items={2} />);
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBe(2);
  });

  it('renders skeleton with avatars', () => {
    const { container } = render(<ListSkeleton />);
    const avatars = container.querySelectorAll('.ant-skeleton-avatar');
    expect(avatars.length).toBe(5);
  });
});

describe('DetailSkeleton', () => {
  it('renders skeleton placeholders', () => {
    const { container } = render(<DetailSkeleton />);
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders cards for detail sections', () => {
    const { container } = render(<DetailSkeleton />);
    const cards = container.querySelectorAll('.ant-card');
    expect(cards.length).toBe(2);
  });
});

describe('DashboardSkeleton', () => {
  it('renders skeleton placeholders', () => {
    const { container } = render(<DashboardSkeleton />);
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders 4 stat cards and 1 main card', () => {
    const { container } = render(<DashboardSkeleton />);
    const cards = container.querySelectorAll('.ant-card');
    expect(cards.length).toBe(5);
  });
});
