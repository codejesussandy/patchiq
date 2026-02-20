import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { RiskScoreDisplay } from '@/components/shared/RiskScoreDisplay';

describe('RiskScoreDisplay', () => {
  it('renders score value', () => {
    render(<RiskScoreDisplay score={75} />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders dash for null score', () => {
    render(<RiskScoreDisplay score={null} />);
    // The em-dash character
    const dashEl = screen.getByText((content) => content.includes('\u2014') || content === '\u2014');
    expect(dashEl).toBeInTheDocument();
  });

  it('renders dash for undefined score', () => {
    render(<RiskScoreDisplay score={undefined} />);
    const dashEl = screen.getByText((content) => content.includes('\u2014') || content === '\u2014');
    expect(dashEl).toBeInTheDocument();
  });

  it('renders Critical label for score >= 80 when showLabel is true', () => {
    render(<RiskScoreDisplay score={85} showLabel />);
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('(Critical)')).toBeInTheDocument();
  });

  it('renders High label for score >= 60 when showLabel is true', () => {
    render(<RiskScoreDisplay score={65} showLabel />);
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('(High)')).toBeInTheDocument();
  });

  it('renders Medium label for score >= 40 when showLabel is true', () => {
    render(<RiskScoreDisplay score={45} showLabel />);
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('(Medium)')).toBeInTheDocument();
  });

  it('renders Low label for score < 40 when showLabel is true', () => {
    render(<RiskScoreDisplay score={20} showLabel />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('(Low)')).toBeInTheDocument();
  });

  it('does not show label when showLabel is false', () => {
    render(<RiskScoreDisplay score={85} />);
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.queryByText('(Critical)')).not.toBeInTheDocument();
  });

  it('applies red color for critical score', () => {
    render(<RiskScoreDisplay score={90} />);
    const scoreEl = screen.getByText('90');
    expect(scoreEl).toHaveStyle({ color: '#ff4d4f' });
  });

  it('applies orange color for high score', () => {
    render(<RiskScoreDisplay score={70} />);
    const scoreEl = screen.getByText('70');
    expect(scoreEl).toHaveStyle({ color: '#fa8c16' });
  });

  it('applies yellow color for medium score', () => {
    render(<RiskScoreDisplay score={50} />);
    const scoreEl = screen.getByText('50');
    expect(scoreEl).toHaveStyle({ color: '#faad14' });
  });

  it('applies green color for low score', () => {
    render(<RiskScoreDisplay score={30} />);
    const scoreEl = screen.getByText('30');
    expect(scoreEl).toHaveStyle({ color: '#52c41a' });
  });

  it('renders score at boundary value 80 as Critical', () => {
    render(<RiskScoreDisplay score={80} showLabel />);
    expect(screen.getByText('(Critical)')).toBeInTheDocument();
  });

  it('renders score at boundary value 60 as High', () => {
    render(<RiskScoreDisplay score={60} showLabel />);
    expect(screen.getByText('(High)')).toBeInTheDocument();
  });

  it('renders score at boundary value 40 as Medium', () => {
    render(<RiskScoreDisplay score={40} showLabel />);
    expect(screen.getByText('(Medium)')).toBeInTheDocument();
  });

  it('renders score 0 as Low', () => {
    render(<RiskScoreDisplay score={0} showLabel />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('(Low)')).toBeInTheDocument();
  });
});
