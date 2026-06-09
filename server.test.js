'use strict';

// ── Mock yahoo-finance2 before server.js loads ────────────────
jest.mock('yahoo-finance2', () => {
  const instance = {
    quote:  jest.fn(),
    chart:  jest.fn(),
    search: jest.fn(),
  };
  const Ctor = jest.fn(() => instance);
  Ctor._inst = instance;
  return { default: Ctor };
});

const request = require('supertest');
const app     = require('./server');
const { default: MockYF } = require('yahoo-finance2');
const yf = MockYF._inst;

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────
// GET /api/quotes
// ─────────────────────────────────────────────────────────────
describe('GET /api/quotes', () => {
  it('returns formatted quotes for given symbols', async () => {
    yf.quote
      .mockResolvedValueOnce({ symbol: 'AAPL', shortName: 'Apple Inc.', regularMarketPrice: 150, regularMarketChangePercent: 1.5 })
      .mockResolvedValueOnce({ symbol: 'MSFT', shortName: 'Microsoft', regularMarketPrice: 300, regularMarketChangePercent: -0.5 });

    const res = await request(app).get('/api/quotes?symbols=AAPL,MSFT');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual({ symbol: 'AAPL', shortName: 'Apple Inc.', regularMarketPrice: 150, regularMarketChangePercent: 1.5 });
    expect(res.body[1].symbol).toBe('MSFT');
  });

  it('returns empty array when no symbols provided', async () => {
    const res = await request(app).get('/api/quotes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('falls back to longName when shortName is missing', async () => {
    yf.quote.mockResolvedValueOnce({ symbol: 'XYZ', shortName: null, longName: 'XYZ Corp', regularMarketPrice: 10, regularMarketChangePercent: 0 });
    const res = await request(app).get('/api/quotes?symbols=XYZ');
    expect(res.body[0].shortName).toBe('XYZ Corp');
  });

  it('falls back to symbol when both names are missing', async () => {
    yf.quote.mockResolvedValueOnce({ symbol: 'XYZ', shortName: null, longName: null, regularMarketPrice: 10, regularMarketChangePercent: 0 });
    const res = await request(app).get('/api/quotes?symbols=XYZ');
    expect(res.body[0].shortName).toBe('XYZ');
  });

  it('skips symbols that fail and returns the rest', async () => {
    yf.quote
      .mockResolvedValueOnce({ symbol: 'AAPL', shortName: 'Apple Inc.', regularMarketPrice: 150, regularMarketChangePercent: 1 })
      .mockRejectedValueOnce(new Error('Not found'));

    const res = await request(app).get('/api/quotes?symbols=AAPL,BADTICKER');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].symbol).toBe('AAPL');
  });

  it('returns 500 when yahoo-finance throws synchronously', async () => {
    // A synchronous throw inside the map callback bubbles past allSettled
    yf.quote.mockImplementation(() => { throw new Error('sync error'); });
    const res = await request(app).get('/api/quotes?symbols=AAPL');
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/history/:symbol
// ─────────────────────────────────────────────────────────────
describe('GET /api/history/:symbol', () => {
  const mockQuotes = [
    { date: new Date('2024-01-01'), open: 148, high: 152, low: 147, close: 150, volume: 1000 },
    { date: new Date('2024-01-02'), open: 150, high: 155, low: 149, close: 153, volume: 1200 },
  ];

  beforeEach(() => {
    yf.chart.mockResolvedValue({ quotes: mockQuotes });
  });

  it('returns history with default period 1w', async () => {
    const res = await request(app).get('/api/history/AAPL');
    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe('AAPL');
    expect(res.body.quotes).toHaveLength(2);
    expect(res.body.quotes[0]).toMatchObject({ open: 148, close: 150, volume: 1000 });
  });

  it.each(['1d', '1w', '1m', '3m', '1y'])('accepts period=%s', async (period) => {
    const res = await request(app).get(`/api/history/AAPL?period=${period}`);
    expect(res.status).toBe(200);
    expect(yf.chart).toHaveBeenCalledWith('AAPL', expect.objectContaining({ interval: expect.any(String) }));
  });

  it('falls back to 1w for unknown period', async () => {
    const res = await request(app).get('/api/history/AAPL?period=bad');
    expect(res.status).toBe(200);
    // 1w uses interval 1h
    expect(yf.chart).toHaveBeenCalledWith('AAPL', expect.objectContaining({ interval: '1h' }));
  });

  it('handles URL-encoded symbols like ^GSPC', async () => {
    const res = await request(app).get('/api/history/%5EGSPC');
    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe('^GSPC');
  });

  it('returns 500 on error', async () => {
    yf.chart.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/history/AAPL');
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/search
// ─────────────────────────────────────────────────────────────
describe('GET /api/search', () => {
  it('returns filtered equity results', async () => {
    yf.search.mockResolvedValue({
      quotes: [
        { symbol: 'AAPL', shortname: 'Apple Inc.', quoteType: 'EQUITY', exchDisp: 'NASDAQ' },
        { symbol: 'AAPLX', shortname: 'Some Fund', quoteType: 'MUTUALFUND', exchDisp: 'NYSE' },
        { symbol: 'AAPL.ETF', shortname: 'Apple ETF', quoteType: 'ETF', exchDisp: 'NYSE' },
      ],
    });
    const res = await request(app).get('/api/search?q=Apple');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2); // EQUITY + ETF only
    expect(res.body[0]).toEqual({ symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' });
  });

  it('returns empty array for empty query', async () => {
    const res = await request(app).get('/api/search?q=');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('falls back to longname when shortname is missing', async () => {
    yf.search.mockResolvedValue({
      quotes: [{ symbol: 'XYZ', shortname: null, longname: 'XYZ Corp', quoteType: 'EQUITY', exchDisp: 'NYSE' }],
    });
    const res = await request(app).get('/api/search?q=xyz');
    expect(res.body[0].name).toBe('XYZ Corp');
  });

  it('limits results to 6', async () => {
    yf.search.mockResolvedValue({
      quotes: Array.from({ length: 10 }, (_, i) => ({
        symbol: `SYM${i}`, shortname: `Co ${i}`, quoteType: 'EQUITY', exchDisp: 'NYSE',
      })),
    });
    const res = await request(app).get('/api/search?q=test');
    expect(res.body).toHaveLength(6);
  });

  it('returns 500 on error', async () => {
    yf.search.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/search?q=Apple');
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/news
// ─────────────────────────────────────────────────────────────
describe('GET /api/news', () => {
  it('returns formatted news items', async () => {
    yf.search.mockResolvedValue({
      news: [
        {
          title: 'Market up today',
          link: 'https://example.com/1',
          publisher: 'Reuters',
          thumbnail: { resolutions: [{ url: 'https://img.example.com/1.jpg' }] },
          providerPublishTime: new Date('2024-01-01'),
          relatedTickers: ['AAPL', 'MSFT'],
        },
      ],
    });
    const res = await request(app).get('/api/news');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      title: 'Market up today',
      publisher: 'Reuters',
      thumbnail: 'https://img.example.com/1.jpg',
      relatedTickers: ['AAPL', 'MSFT'],
    });
    expect(res.body[0].publishedAt).toBeTruthy();
  });

  it('sets thumbnail to null when missing', async () => {
    yf.search.mockResolvedValue({
      news: [{ title: 'No thumb', link: 'https://x.com', publisher: 'AP', thumbnail: null, providerPublishTime: null, relatedTickers: [] }],
    });
    const res = await request(app).get('/api/news');
    expect(res.body[0].thumbnail).toBeNull();
    expect(res.body[0].relatedTickers).toEqual([]);
  });

  it('returns 500 on error', async () => {
    yf.search.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/news');
    expect(res.status).toBe(500);
  });
});
