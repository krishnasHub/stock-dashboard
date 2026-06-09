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
const NEWS_CYCLE_MS = 5 * 60 * 1000;

const COMPARE_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6'];

const INDICES = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^DJI',  name: 'Dow Jones' },
  { symbol: '^RUT',  name: 'Russell 2000' },
  { symbol: '^NDX',  name: 'NASDAQ 100' },
];

function formatPublishDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function App() {
  // ── Stock list & quotes ──────────────────────────────────────
  const [stocks, setStocks]           = useState(DEFAULT_STOCKS);
  const [quotes, setQuotes]           = useState([]);
  const [quotesLoading, setQL]        = useState(true);
  const [quotesError, setQE]          = useState(null);

  // ── Single-stock chart ───────────────────────────────────────
  const [selectedStock, setSelected]  = useState('AAPL');
  const [period, setPeriod]           = useState('1w');
  const [chartData, setChartData]     = useState([]);
  const [chartLoading, setCL]         = useState(false);

  // ── Compare mode ─────────────────────────────────────────────
  const [chartMode, setChartMode]     = useState('single');   // 'single' | 'compare'
  const [compareStocks, setCmpStocks] = useState([]);         // up to 5 symbols
  const [compareData, setCmpData]     = useState({});         // { sym: quotes[] }

  // ── Index overlay ────────────────────────────────────────────
  const [showIndex, setShowIndex]     = useState(false);
  const [selectedIdx, setSelectedIdx] = useState('^GSPC');
  const [indexData, setIndexData]     = useState([]);         // for single+index mode

  // ── News ──────────────────────────────────────────────────────
  const [news, setNews]               = useState([]);
  const [newsIndex, setNewsIndex]     = useState(0);
  const [activeView, setActiveView]   = useState('chart');

  // ── Add-ticker search ────────────────────────────────────────
  const [addInput, setAddInput]       = useState('');
  const [suggestions, setSugg]        = useState([]);
  const [showSugg, setShowSugg]       = useState(false);
  const [searching, setSearching]     = useState(false);

  const intervalRef   = useRef(null);
  const newsCycleRef  = useRef(null);
  const searchTimer   = useRef(null);
  const dropdownRef   = useRef(null);

  // ── Data fetchers ────────────────────────────────────────────
  const fetchQuotes = useCallback(async (syms) => {
    try {
      const r = await axios.get(`http://localhost:3001/api/quotes?symbols=${syms.join(',')}`);
      setQuotes(r.data); setQE(null);
    } catch { setQE('Failed to load quotes'); }
    finally  { setQL(false); }
  }, []);

  const fetchChart = useCallback(async (sym, p) => {
    setCL(true);
    try {
      const r = await axios.get(`http://localhost:3001/api/history/${encodeURIComponent(sym)}?period=${p}`);
      setChartData(r.data.quotes || []);
    } catch { setChartData([]); }
    finally { setCL(false); }
  }, []);

  const fetchIndexData = useCallback(async (sym, p) => {
    try {
      const r = await axios.get(`http://localhost:3001/api/history/${encodeURIComponent(sym)}?period=${p}`);
      setIndexData(r.data.quotes || []);
    } catch { setIndexData([]); }
  }, []);

  const fetchCompareData = useCallback(async (syms, withIdx, idxSym, p) => {
    const toFetch = withIdx ? [...syms, idxSym] : [...syms];
    setCL(true);
    try {
      const results = await Promise.allSettled(
        toFetch.map(s => axios.get(`http://localhost:3001/api/history/${encodeURIComponent(s)}?period=${p}`))
      );
      const data = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') data[toFetch[i]] = r.value.data.quotes || [];
      });
      setCmpData(data);
    } finally { setCL(false); }
  }, []);

  const fetchNews = useCallback(async () => {
    try { const r = await axios.get('http://localhost:3001/api/news'); setNews(r.data); }
    catch {}
  }, []);

  // ── Effects ───────────────────────────────────────────────────
  useEffect(() => { fetchQuotes(stocks); fetchNews(); }, []);

  useEffect(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchQuotes(stocks), 60000);
    return () => clearInterval(intervalRef.current);
  }, [stocks, fetchQuotes]);

  // Single-stock chart
  useEffect(() => {
    if (chartMode === 'single' && selectedStock) fetchChart(selectedStock, period);
  }, [selectedStock, period, chartMode, fetchChart]);

  // Index data for single+index mode
  useEffect(() => {
    if (showIndex && chartMode === 'single') fetchIndexData(selectedIdx, period);
    else setIndexData([]);
  }, [showIndex, selectedIdx, period, chartMode, fetchIndexData]);

  // Compare data
  useEffect(() => {
    if (chartMode === 'compare' && compareStocks.length > 0) {
      fetchCompareData(compareStocks, showIndex, selectedIdx, period);
    } else if (chartMode === 'compare') {
      setCmpData({});
    }
  }, [chartMode, compareStocks, showIndex, selectedIdx, period, fetchCompareData]);

  // News auto-cycle
  useEffect(() => {
    clearInterval(newsCycleRef.current);
    if (activeView === 'news' && news.length > 0) {
      newsCycleRef.current = setInterval(() => setNewsIndex(i => (i + 1) % news.length), NEWS_CYCLE_MS);
    }
    return () => clearInterval(newsCycleRef.current);
  }, [activeView, news]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Mode switching ────────────────────────────────────────────
  function switchMode(m) {
    setChartMode(m);
    setActiveView('chart');
    if (m === 'compare' && compareStocks.length === 0 && selectedStock) {
      setCmpStocks([selectedStock]);
    }
  }

  function toggleCompareStock(sym) {
    setCmpStocks(prev => {
      if (prev.includes(sym)) return prev.filter(s => s !== sym);
      if (prev.length >= 5) return prev;
      return [...prev, sym];
    });
  }

  // ── Stock management ──────────────────────────────────────────
  function selectStock(sym) {
    setSelected(sym);
    setActiveView('chart');
    if (chartMode === 'compare') toggleCompareStock(sym);
  }

  function commitSymbol(symbol) {
    setAddInput(''); setSugg([]); setShowSugg(false);
    if (!symbol) return;
    if (!stocks.includes(symbol)) {
      const next = [...stocks, symbol];
      setStocks(next);
      fetchQuotes(next);
    }
    if (chartMode === 'single') {
      setSelected(symbol); setActiveView('chart');
    } else {
      setCmpStocks(prev => prev.includes(symbol) || prev.length >= 5 ? prev : [...prev, symbol]);
    }
  }

  function removeStock(sym) {
    const next = stocks.filter(s => s !== sym);
    setStocks(next);
    setQuotes(q => q.filter(q => q.symbol !== sym));
    setCmpStocks(p => p.filter(s => s !== sym));
    if (selectedStock === sym) { setSelected(next[0] || null); setActiveView('chart'); }
  }

  // ── Add ticker input ──────────────────────────────────────────
  function handleAddInput(e) {
    const val = e.target.value;
    setAddInput(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSugg([]); setShowSugg(false); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await axios.get(`http://localhost:3001/api/search?q=${encodeURIComponent(val.trim())}`);
        setSugg(r.data); setShowSugg(r.data.length > 0);
      } catch { setSugg([]); }
      finally { setSearching(false); }
    }, 300);
  }

  function addStock(e) {
    e.preventDefault();
    const raw = addInput.trim();
    if (!raw) return;
    if (/^[A-Z0-9]{1,5}(-[A-Z]{1,2})?$/.test(raw.toUpperCase())) { commitSymbol(raw.toUpperCase()); return; }
    if (suggestions.length > 0) { commitSymbol(suggestions[0].symbol); return; }
    setShowSugg(true);
  }

  // ── News helpers ──────────────────────────────────────────────
  function selectNewsIndex(idx) {
    setNewsIndex(idx); setActiveView('news');
    clearInterval(newsCycleRef.current);
    if (news.length > 0) {
      newsCycleRef.current = setInterval(() => setNewsIndex(i => (i + 1) % news.length), NEWS_CYCLE_MS);
    }
  }
  function stepNews(d) { selectNewsIndex((newsIndex + d + news.length) % news.length); }

  // ── Derived values ────────────────────────────────────────────
  const selectedQuote = quotes.find(q => q.symbol === selectedStock);
  const isUp          = selectedQuote ? selectedQuote.regularMarketChangePercent >= 0 : true;
  const currentNews   = news[newsIndex] || null;

  // What to pass to StockChart
  const chartProps = (() => {
    if (chartMode === 'compare') {
      return {
        seriesData:    compareData,
        stockSymbols:  compareStocks,
        stockColors:   compareStocks.map((_, i) => COMPARE_COLORS[i]),
        indexSymbol:   showIndex ? selectedIdx : null,
        period,
      };
    }
    if (showIndex) {
      return {
        seriesData:   { [selectedStock]: chartData, [selectedIdx]: indexData },
        stockSymbols: [selectedStock],
        stockColors:  [isUp ? '#22c55e' : '#ef4444'],
        indexSymbol:  selectedIdx,
        period,
      };
    }
    return { data: chartData, isUp, period };
  })();

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <header className="header">
        <h1>Stock Dashboard</h1>
        <form className="add-stock-form" onSubmit={addStock}>
          <div className="ticker-input-wrap" ref={dropdownRef}>
            <input
              value={addInput}
              onChange={handleAddInput}
              onFocus={() => suggestions.length > 0 && setShowSugg(true)}
              placeholder="Ticker or company name…"
              maxLength={60}
              autoComplete="off"
            />
            {searching && <span className="ticker-searching">⟳</span>}
            {showSugg && suggestions.length > 0 && (
              <div className="ticker-dropdown">
                {suggestions.map(s => (
                  <div key={s.symbol} className="ticker-suggestion" onMouseDown={e => { e.preventDefault(); commitSymbol(s.symbol); }}>
                    <span className="suggestion-symbol">{s.symbol}</span>
                    <span className="suggestion-name">{s.name}</span>
                    {s.exchange && <span className="suggestion-exchange">{s.exchange}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="btn-add">Add</button>
        </form>
      </header>

      <div className="main-content">
        {/* ── Main panel ── */}
        <section className="main-panel">
          {activeView === 'news' && currentNews ? (
            /* ── News expanded ── */
            <div className="news-expanded">
              <div className="news-nav">
                <button className="back-btn" onClick={() => setActiveView('chart')}>← Back to chart</button>
                <div className="news-nav-right">
                  <span className="news-counter">{newsIndex + 1} / {news.length}</span>
                  <button className="nav-arrow" onClick={() => stepNews(-1)}>◀</button>
                  <button className="nav-arrow" onClick={() => stepNews(1)}>▶</button>
                </div>
              </div>
              <div className="news-card">
                {currentNews.thumbnail && (
                  <img src={currentNews.thumbnail} alt="" className="news-card-img" onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div className="news-card-body">
                  <div className="news-card-meta">
                    <span className="news-card-publisher">{currentNews.publisher}</span>
                    {currentNews.publishedAt && <span className="news-card-date">{formatPublishDate(currentNews.publishedAt)}</span>}
                  </div>
                  <h2 className="news-card-title">{currentNews.title}</h2>
                  {currentNews.relatedTickers?.length > 0 && (
                    <div className="news-card-tickers">
                      {currentNews.relatedTickers.slice(0, 6).map(t => <span key={t} className="ticker-chip">{t}</span>)}
                    </div>
                  )}
                  <a href={currentNews.link} target="_blank" rel="noreferrer" className="news-read-btn">Read full article ↗</a>
                </div>
              </div>
              <div className="news-dots">
                {news.map((_, i) => (
                  <button key={i} className={`news-dot${i === newsIndex ? ' active' : ''}`} onClick={() => selectNewsIndex(i)} />
                ))}
              </div>
            </div>
          ) : (
            /* ── Chart view ── */
            <>
              {/* Row 1: title / compare chips + period buttons */}
              <div className="chart-header">
                {chartMode === 'compare' ? (
                  <div className="compare-chips">
                    {compareStocks.length === 0
                      ? <span className="compare-hint">Click cards below to compare (up to 5)</span>
                      : compareStocks.map((sym, i) => (
                          <button
                            key={sym}
                            className="compare-chip"
                            style={{ borderColor: COMPARE_COLORS[i], color: COMPARE_COLORS[i], background: `${COMPARE_COLORS[i]}18` }}
                            onClick={() => setCmpStocks(p => p.filter(s => s !== sym))}
                          >
                            {sym} ×
                          </button>
                        ))
                    }
                  </div>
                ) : (
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
                )}
                <div className="period-buttons">
                  {PERIODS.map(p => (
                    <button key={p} className={`period-btn${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: mode toggle + index controls */}
              <div className="chart-toolbar">
                <div className="mode-toggle">
                  <button className={`mode-btn${chartMode === 'single' ? ' active' : ''}`} onClick={() => switchMode('single')}>Single</button>
                  <button className={`mode-btn${chartMode === 'compare' ? ' active' : ''}`} onClick={() => switchMode('compare')}>Compare</button>
                </div>
                <div className="index-controls">
                  <button
                    className={`index-toggle-btn${showIndex ? ' active' : ''}`}
                    onClick={() => setShowIndex(v => !v)}
                  >
                    vs Index
                  </button>
                  {showIndex && (
                    <div className="index-buttons">
                      {INDICES.map(idx => (
                        <button
                          key={idx.symbol}
                          className={`index-btn${selectedIdx === idx.symbol ? ' active' : ''}`}
                          onClick={() => setSelectedIdx(idx.symbol)}
                        >
                          {idx.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart */}
              {chartLoading
                ? <div className="chart-placeholder">Loading chart…</div>
                : <StockChart {...chartProps} />
              }
            </>
          )}
        </section>

        {/* ── News sidebar ── */}
        <aside className="news-sidebar">
          <h2>Market News</h2>
          <NewsFeed news={news} activeIndex={activeView === 'news' ? newsIndex : -1} onSelect={i => selectNewsIndex(i)} />
        </aside>

        {/* ── Stock cards ── */}
        <section className="stocks-section">
          {quotesLoading && <div className="loading-msg">Loading quotes…</div>}
          {quotesError   && <div className="error-msg">{quotesError}</div>}
          {chartMode === 'compare' && compareStocks.length >= 5 && (
            <div className="compare-max-msg">Max 5 stocks selected — remove one to add another</div>
          )}
          <div className="stocks-grid">
            {stocks.map(sym => {
              const quote       = quotes.find(q => q.symbol === sym);
              const cmpIdx      = compareStocks.indexOf(sym);
              const compareColor = chartMode === 'compare' && cmpIdx >= 0 ? COMPARE_COLORS[cmpIdx] : null;
              return (
                <StockCard
                  key={sym}
                  symbol={sym}
                  quote={quote}
                  selected={chartMode === 'single' && selectedStock === sym && activeView === 'chart'}
                  compareColor={compareColor}
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
