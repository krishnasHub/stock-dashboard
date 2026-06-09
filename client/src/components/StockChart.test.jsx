import { render, screen } from '@testing-library/react';
import StockChart, { formatDate, mergeToPercentChange } from './StockChart';

// Recharts uses browser layout APIs; replace with simple test stubs
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart:     () => <div data-testid="area-chart" />,
  LineChart:     () => <div data-testid="line-chart" />,
  Area:          () => null,
  Line:          () => null,
  XAxis:         () => null,
  YAxis:         () => null,
  Tooltip:       () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
}));

// ── formatDate ─────────────────────────────────────────────────
describe('formatDate', () => {
  const dateStr = '2024-06-15T14:30:00.000Z';

  it('formats 1d as a time string', () => {
    const result = formatDate(dateStr, '1d');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats 1w with weekday', () => {
    const result = formatDate(dateStr, '1w');
    // should contain a weekday abbreviation
    expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
  });

  it('formats other periods as month and day', () => {
    const result = formatDate(dateStr, '1m');
    expect(result).toMatch(/Jun|6/);
    expect(result).toMatch(/15/);
  });
});

// ── mergeToPercentChange ───────────────────────────────────────
describe('mergeToPercentChange', () => {
  const makeQuotes = (closes, baseDate = '2024-01-01') =>
    closes.map((close, i) => ({
      date: new Date(new Date(baseDate).getTime() + i * 3600000).toISOString(),
      close,
    }));

  it('returns empty array for empty seriesMap', () => {
    expect(mergeToPercentChange({}, [])).toEqual([]);
  });

  it('returns empty array when all series have no valid close values', () => {
    const result = mergeToPercentChange({ AAPL: [{ date: '2024-01-01', close: null }] }, ['AAPL']);
    expect(result).toEqual([]);
  });

  it('normalises a single series to percent change from first point', () => {
    const result = mergeToPercentChange({ AAPL: makeQuotes([100, 110, 90]) }, ['AAPL']);
    expect(result[0].AAPL).toBe(0);
    expect(result[1].AAPL).toBeCloseTo(10);
    expect(result[2].AAPL).toBeCloseTo(-10);
  });

  it('first data point is always 0%', () => {
    const result = mergeToPercentChange({ AAPL: makeQuotes([250, 260]) }, ['AAPL']);
    expect(result[0].AAPL).toBe(0);
  });

  it('merges two series and uses the longer one as the scaffold', () => {
    const seriesMap = {
      AAPL: makeQuotes([100, 110, 120, 130]),
      MSFT: makeQuotes([200, 220, 240]),        // shorter
    };
    const result = mergeToPercentChange(seriesMap, ['AAPL', 'MSFT']);
    expect(result).toHaveLength(4); // scaffold is AAPL (4 points)
    expect(result[0]).toMatchObject({ AAPL: 0, MSFT: 0 });
  });

  it('skips symbols with empty or missing quotes', () => {
    const seriesMap = { AAPL: makeQuotes([100, 105]), MSFT: [] };
    const result = mergeToPercentChange(seriesMap, ['AAPL', 'MSFT']);
    expect(result).toHaveLength(2);
    expect(result[0]).not.toHaveProperty('MSFT');
  });
});

// ── StockChart component ───────────────────────────────────────
describe('StockChart', () => {
  const singleData = [
    { date: '2024-01-01T00:00:00Z', close: 150 },
    { date: '2024-01-02T00:00:00Z', close: 155 },
  ];

  it('renders AreaChart in single mode (no seriesData)', () => {
    render(<StockChart data={singleData} isUp={true} period="1w" />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('shows "No data available" for empty single data', () => {
    render(<StockChart data={[]} isUp={true} period="1w" />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('shows "No data available" when data is null', () => {
    render(<StockChart data={null} isUp={false} period="1d" />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders LineChart when seriesData is provided', () => {
    const seriesData = { AAPL: singleData, MSFT: singleData };
    render(<StockChart seriesData={seriesData} stockSymbols={['AAPL', 'MSFT']} stockColors={['#3b82f6', '#f59e0b']} indexSymbol={null} period="1w" />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows prompt when seriesData provided but no stock symbols', () => {
    render(<StockChart seriesData={{}} stockSymbols={[]} stockColors={[]} indexSymbol={null} period="1w" />);
    expect(screen.getByText('Click stock cards below to compare (up to 5)')).toBeInTheDocument();
  });

  it('shows loading message when symbols given but data not yet fetched', () => {
    render(<StockChart seriesData={{}} stockSymbols={['AAPL']} stockColors={['#3b82f6']} indexSymbol={null} period="1w" />);
    expect(screen.getByText('Loading comparison data…')).toBeInTheDocument();
  });
});
