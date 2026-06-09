const express = require('express');
const cors = require('cors');
const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const app = express();
app.use(cors());
app.use(express.json());

const PERIOD_CONFIG = {
  '1d': { days: 1, interval: '5m' },
  '1w': { days: 7, interval: '1h' },
  '1m': { days: 30, interval: '1d' },
  '3m': { days: 90, interval: '1d' },
  '1y': { days: 365, interval: '1wk' },
};

app.get('/api/quotes', async (req, res) => {
  try {
    const symbols = (req.query.symbols || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!symbols.length) return res.json([]);

    const results = await Promise.allSettled(
      symbols.map(sym => yahooFinance.quote(sym))
    );

    const quotes = results
      .map((r, i) => {
        if (r.status === 'rejected') return null;
        const q = r.value;
        return {
          symbol: q.symbol,
          shortName: q.shortName || q.longName || q.symbol,
          regularMarketPrice: q.regularMarketPrice,
          regularMarketChangePercent: q.regularMarketChangePercent,
        };
      })
      .filter(Boolean);

    res.json(quotes);
  } catch (err) {
    console.error('quotes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const period = req.query.period || '1w';
    const config = PERIOD_CONFIG[period] || PERIOD_CONFIG['1w'];

    const period2 = new Date();
    const period1 = new Date(period2.getTime() - config.days * 24 * 60 * 60 * 1000);

    const result = await yahooFinance.chart(symbol, {
      period1,
      period2,
      interval: config.interval,
    });

    const quotes = (result.quotes || []).map(q => ({
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }));

    res.json({ symbol, quotes });
  } catch (err) {
    console.error('history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const result = await yahooFinance.search(q, { quotesCount: 8, newsCount: 0 });
    const matches = (result.quotes || [])
      .filter(item => item.quoteType === 'EQUITY' || item.quoteType === 'ETF')
      .slice(0, 6)
      .map(item => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchDisp || item.exchange || '',
      }));

    res.json(matches);
  } catch (err) {
    console.error('search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const result = await yahooFinance.search('stock market', { newsCount: 10 });
    const news = (result.news || []).map(item => ({
      title: item.title,
      link: item.link,
      publisher: item.publisher,
      thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
      publishedAt: item.providerPublishTime || null,
      relatedTickers: item.relatedTickers || [],
    }));
    res.json(news);
  } catch (err) {
    console.error('news error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
