import { render, screen, fireEvent } from '@testing-library/react';
import StockCard from './StockCard';

const baseQuote = {
  shortName: 'Apple Inc.',
  regularMarketPrice: 150.25,
  regularMarketChangePercent: 1.5,
};

describe('StockCard', () => {
  it('renders symbol and dashes when no quote provided', () => {
    render(<StockCard symbol="AAPL" quote={null} selected={false} onSelect={() => {}} onRemove={() => {}} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3); // name, price, change
  });

  it('renders price and company name from quote', () => {
    render(<StockCard symbol="AAPL" quote={baseQuote} selected={false} onSelect={() => {}} onRemove={() => {}} />);
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('$150.25')).toBeInTheDocument();
  });

  it('shows ▲ and green text for positive change', () => {
    render(<StockCard symbol="AAPL" quote={baseQuote} selected={false} onSelect={() => {}} onRemove={() => {}} />);
    const change = screen.getByText('▲ 1.50%');
    expect(change).toHaveStyle({ color: '#22c55e' });
  });

  it('shows ▼ and red text for negative change', () => {
    const downQuote = { ...baseQuote, regularMarketChangePercent: -2.3 };
    render(<StockCard symbol="MSFT" quote={downQuote} selected={false} onSelect={() => {}} onRemove={() => {}} />);
    const change = screen.getByText('▼ 2.30%');
    expect(change).toHaveStyle({ color: '#ef4444' });
  });

  it('calls onSelect when the card is clicked', () => {
    const onSelect = vi.fn();
    render(<StockCard symbol="AAPL" quote={baseQuote} selected={false} onSelect={onSelect} onRemove={() => {}} />);
    fireEvent.click(screen.getByText('AAPL'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove when × is clicked and does not bubble to onSelect', () => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(<StockCard symbol="AAPL" quote={baseQuote} selected={false} onSelect={onSelect} onRemove={onRemove} />);
    fireEvent.click(screen.getByTitle('Remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('applies blue border when selected', () => {
    const { container } = render(
      <StockCard symbol="AAPL" quote={baseQuote} selected={true} onSelect={() => {}} onRemove={() => {}} />
    );
    expect(container.firstChild).toHaveStyle({ border: '1px solid #3b82f6' });
  });

  it('applies lift transform on mouse enter and clears on mouse leave', () => {
    const { container } = render(
      <StockCard symbol="AAPL" quote={baseQuote} selected={false} onSelect={() => {}} onRemove={() => {}} />
    );
    const card = container.firstChild;
    fireEvent.mouseEnter(card);
    expect(card.style.transform).toBe('translateY(-2px)');
    fireEvent.mouseLeave(card);
    expect(card.style.transform).toBe('');
  });

  it('shows coloured dot and border when compareColor is set', () => {
    const { container } = render(
      <StockCard symbol="AAPL" quote={baseQuote} selected={false} compareColor="#f59e0b" onSelect={() => {}} onRemove={() => {}} />
    );
    expect(container.firstChild).toHaveStyle({ border: '1px solid #f59e0b' });
    // the coloured dot div
    const dot = container.querySelector('div > div[style*="border-radius: 50%"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ background: '#f59e0b' });
  });
});
