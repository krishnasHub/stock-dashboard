import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import StockCard from './components/StockCard';
import StockChart from './components/StockChart';
import NewsFeed from './components/NewsFeed';
import './App.css';

const DEFAULT_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'JPM', 'V',
  'UNH', 'XOM', 'JNJ', 'WMT', 'MA', 'PG', 'HD', 'COST', 'ABBV', 'CRM',
];

const PERIODS = ['1d', '1w', '1m', '3m', '1y'];
const NEWS_CYCLE_MS = 5 * 60 * 1000; // 5 minutes

function formatPublishDate(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function App() {
  const [stocks, setStocks] = useState(DEFAULT_STOCKS);
  const [quotes, setQuotes] = useState([]);
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [period, setPeriod] = useState('1w');
  const [chartData, setChartData] = useState([]);
  const [news, setNews] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [quotesError, setQuotesError] = useState(null);
  const [addInput, setAddInput] = useState('');
  const [activeView, setActiveView] = useState('chart');
  const [newsIndex, setNewsIndex] = useState(0);
  const intervalRef = useRef(null);
  const newsCycleRef = useRef(null);

  const fetchQuotes = useCallback(async (symbolList) => {
    try {
      const res = await axios.get(`http://localhost:3001/api/quotes?symbols=${symbolList.join(',')}`);
      setQuotes(res.data);
      setQuotesError(null);
    } catch {
      setQuotesError('Failed to load quotes');
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  const fetchChart = useCallback(async (symbol, p) => {
    setChartLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/history/${symbol}?period=${p}`);
      setChartData(res.data.quotes || []);
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/news');
      setNews(res.data);
    } catch {
      // news is best-effort
    }
  }, []);

  useEffect(() => {
    fetchQuotes(stocks);
    fetchNews();
  }, []);

  useEffect(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchQuotes(stocks), 60000);
    return () => clearInterval(intervalRef.current);
  }, [stocks, fetchQuotes]);

  useEffect(() => {
    if (selectedStock) fetchChart(selectedStock, period);
  }, [selectedStock, period, fetchChart]);

  // Auto-cycle news every 5 minutes when in news view
  useEffect(() => {
    clearInterval(newsCycleRef.current);
    if (activeView === 'news' && news.length > 0) {
      newsCycleRef.current = setInterval(() => {
        setNewsIndex(i => (i + 1) % news.length);
      }, NEWS_CYCLE_MS);
    }
    return () => clearInterval(newsCycleRef.current);
  }, [activeView, news]);

  function selectStock(sym) {
    setSelectedStock(sym);
    setActiveView('chart');
  }

  function selectNewsIndex(idx) {
    setNewsIndex(idx);
    setActiveView('news');
    // reset cycle timer on manual navigation
    clearInterval(newsCycleRef.current);
    if (news.length > 0) {
      newsCycleRef.current = setInterval(() => {
        setNewsIndex(i => (i + 1) % news.length);
      }, NEWS_CYCLE_MS);
    }
  }

  function stepNews(delta) {
    selectNewsIndex((newsIndex + delta + news.length) % news.length);
  }

  function addStock(e) {
    e.preventDefault();
    const sym = addInput.trim().toUpperCase();
    if (!sym || stocks.includes(sym)) { setAddInput(''); return; }
    const next = [...stocks, sym];
    setStocks(next);
    fetchQuotes(next);
    selectStock(sym);
    setAddInput('');
  }

  function removeStock(sym) {
    const next = stocks.filter(s => s !== sym);
    setStocks(next);
    setQuotes(q => q.filter(q => q.symbol !== sym));
    if (selectedStock === sym) selectStock(next[0] || null);
  }

  const selectedQuote = quotes.find(q => q.symbol === selectedStock);
  const isUp = selectedQuote ? selectedQuote.regularMarketChangePercent >= 0 : true;
  const currentNews = news[newsIndex] || null;

  return (
    <>
      <header className="header">
        <h1>Stock Dashboard</h1>
        <form className="add-stock-form" onSubmit={addStock}>
          <input
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            placeholder="Add ticker…"
            maxLength={10}
          />
          <button type="submit" className="btn-add">Add</button>
        </form>
      </header>

      <div className="main-content">
        {/* ── Main panel ── */}
        <section className="main-panel">
          {activeView === 'news' && currentNews ? (
            <div className="news-expanded">
              {/* Nav bar */}
              <div className="news-nav">
                <button className="back-btn" onClick={() => setActiveView('chart')}>
                  ← Back to chart
                </button>
                <div className="news-nav-right">
                  <span className="news-counter">{newsIndex + 1} / {news.length}</span>
                  <button className="nav-arrow" onClick={() => stepNews(-1)} title="Previous">◀</button>
                  <button className="nav-arrow" onClick={() => stepNews(1)} title="Next">▶</button>
                </div>
              </div>

              {/* Article card */}
              <div className="news-card">
                {currentNews.thumbnail && (
                  <img
                    src={currentNews.thumbnail}
                    alt=""
                    className="news-card-img"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="news-card-body">
                  <div className="news-card-meta">
                    <span className="news-card-publisher">{currentNews.publisher}</span>
                    {currentNews.publishedAt && (
                      <span className="news-card-date">
                        {formatPublishDate(currentNews.publishedAt)}
                      </span>
                    )}
                  </div>
                  <h2 className="news-card-title">{currentNews.title}</h2>
                  {currentNews.relatedTickers?.length > 0 && (
                    <div className="news-card-tickers">
                      {currentNews.relatedTickers.slice(0, 6).map(t => (
                        <span key={t} className="ticker-chip">{t}</span>
                      ))}
                    </div>
                  )}
                  <a
                    href={currentNews.link}
                    target="_blank"
                    rel="noreferrer"
                    className="news-read-btn"
                  >
                    Read full article ↗
                  </a>
                </div>
              </div>

              {/* Dot indicators */}
              <div className="news-dots">
                {news.map((_, i) => (
                  <button
                    key={i}
                    className={`news-dot${i === newsIndex ? ' active' : ''}`}
                    onClick={() => selectNewsIndex(i)}
                    title={`Article ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="chart-header">
                <div>
                  <div className="chart-title">
                    {selectedStock || 'Select a stock'}
                    {selectedQuote && (
                      <span style={{ color: isUp ? '#22c55e' : '#ef4444', marginLeft: 12, fontSize: 15 }}>
                        {isUp ? '▲' : '▼'} {Math.abs(selectedQuote.regularMarketChangePercent).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  {selectedQuote && (
                    <div className="chart-subtitle">
                      {selectedQuote.shortName}
                      {selectedQuote.regularMarketPrice != null && (
                        <span style={{ marginLeft: 12, color: '#f1f5f9', fontWeight: 600, fontSize: 15 }}>
                          ${selectedQuote.regularMarketPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="period-buttons">
                  {PERIODS.map(p => (
                    <button
                      key={p}
                      className={`period-btn${period === p ? ' active' : ''}`}
                      onClick={() => setPeriod(p)}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {chartLoading ? (
                <div className="chart-placeholder">Loading chart…</div>
              ) : (
                <StockChart data={chartData} isUp={isUp} period={period} />
              )}
            </>
          )}
        </section>

        {/* ── News sidebar ── */}
        <aside className="news-sidebar">
          <h2>Market News</h2>
          <NewsFeed
            news={news}
            activeIndex={activeView === 'news' ? newsIndex : -1}
            onSelect={i => selectNewsIndex(i)}
          />
        </aside>

        {/* ── Stock cards grid ── */}
        <section className="stocks-section">
          {quotesLoading && <div className="loading-msg">Loading quotes…</div>}
          {quotesError && <div className="error-msg">{quotesError}</div>}
          <div className="stocks-grid">
            {stocks.map(sym => {
              const quote = quotes.find(q => q.symbol === sym);
              return (
                <StockCard
                  key={sym}
                  symbol={sym}
                  quote={quote}
                  selected={selectedStock === sym && activeView === 'chart'}
                  onSelect={() => selectStock(sym)}
                  onRemove={() => removeStock(sym)}
                />
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
