import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart:     () => <div data-testid="area-chart" />,
  LineChart:     () => <div data-testid="line-chart" />,
  Area: () => null, Line: () => null, XAxis: () => null, YAxis: () => null,
  Tooltip: () => null, CartesianGrid: () => null, ReferenceLine: () => null,
}));

const mockQuotes = [
  { symbol: 'AAPL', shortName: 'Apple Inc.',  regularMarketPrice: 150, regularMarketChangePercent: 1.5  },
  { symbol: 'MSFT', shortName: 'Microsoft',   regularMarketPrice: 300, regularMarketChangePercent: -0.5 },
];
const mockHistory  = { quotes: [{ date: '2024-01-01T00:00:00Z', close: 150 }, { date: '2024-01-02T00:00:00Z', close: 155 }] };
const mockNews     = [{ title: 'Big market move', link: 'https://example.com', publisher: 'Reuters', thumbnail: null, publishedAt: 1700000000, relatedTickers: ['AAPL'] }];
const mockSearch   = [{ symbol: 'NVDA', name: 'Nvidia Corp', exchange: 'NASDAQ' }];

beforeEach(() => {
  vi.mocked(axios.get).mockImplementation((url) => {
    if (url.includes('/api/quotes'))  return Promise.resolve({ data: mockQuotes });
    if (url.includes('/api/history')) return Promise.resolve({ data: mockHistory });
    if (url.includes('/api/news'))    return Promise.resolve({ data: mockNews });
    if (url.includes('/api/search'))  return Promise.resolve({ data: mockSearch });
    return Promise.resolve({ data: [] });
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('App', () => {
  it('renders the header title', () => {
    render(<App />);
    expect(screen.getByText('Stock Dashboard')).toBeInTheDocument();
  });

  it('shows loading state before quotes arrive', () => {
    render(<App />);
    expect(screen.getByText('Loading quotes…')).toBeInTheDocument();
  });

  it('renders stock cards after quotes load', async () => {
    render(<App />);
    // 'Apple Inc.' appears in the chart subtitle AND the stock card
    await waitFor(() => expect(screen.getAllByText('Apple Inc.').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Microsoft').length).toBeGreaterThan(0);
  });

  it('renders the area chart on initial load', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('area-chart')).toBeInTheDocument());
  });

  it('shows Single and Compare mode buttons', async () => {
    render(<App />);
    await waitFor(() => screen.getAllByText('Apple Inc.'));
    expect(screen.getByText('Single')).toBeInTheDocument();
    expect(screen.getByText('Compare')).toBeInTheDocument();
  });

  it('switches to compare mode and shows line chart', async () => {
    render(<App />);
    await waitFor(() => screen.getAllByText('Apple Inc.'));
    fireEvent.click(screen.getByText('Compare'));
    // AAPL is auto-added to compare, triggering compare chart
    await waitFor(() => expect(screen.getByTestId('line-chart')).toBeInTheDocument());
  });

  it('shows vs Index button and index options when toggled', async () => {
    render(<App />);
    await waitFor(() => screen.getAllByText('Apple Inc.'));
    fireEvent.click(screen.getByText('vs Index'));
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('NASDAQ')).toBeInTheDocument();
    expect(screen.getByText('Dow Jones')).toBeInTheDocument();
    expect(screen.getByText('Russell 2000')).toBeInTheDocument();
    expect(screen.getByText('NASDAQ 100')).toBeInTheDocument();
  });

  it('adds a stock via the ticker input', async () => {
    render(<App />);
    await waitFor(() => screen.getAllByText('Apple Inc.'));
    const input = screen.getByPlaceholderText('Ticker or company name…');
    fireEvent.change(input, { target: { value: 'TSLA' } });
    fireEvent.submit(input.closest('form'));
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('TSLA'));
  });

  it('expands a news article when sidebar item is clicked', async () => {
    render(<App />);
    await waitFor(() => screen.getByText('Big market move'));
    fireEvent.click(screen.getByText('Big market move'));
    expect(screen.getByText('← Back to chart')).toBeInTheDocument();
    expect(screen.getByText('Read full article ↗')).toBeInTheDocument();
  });

  it('returns to chart when Back to chart is clicked', async () => {
    render(<App />);
    await waitFor(() => screen.getByText('Big market move'));
    fireEvent.click(screen.getByText('Big market move'));
    fireEvent.click(screen.getByText('← Back to chart'));
    await waitFor(() => expect(screen.getByTestId('area-chart')).toBeInTheDocument());
  });

  it('removes a stock when × is clicked on a card', async () => {
    render(<App />);
    await waitFor(() => screen.getAllByText('Apple Inc.'));
    // Each card has a × remove button; click the first one
    const removeButtons = screen.getAllByTitle('Remove');
    fireEvent.click(removeButtons[0]);
    await waitFor(() => expect(screen.queryByText('Apple Inc.')).not.toBeInTheDocument());
  });
});
