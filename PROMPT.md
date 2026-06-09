# Stock Dashboard — Build Prompt

Build a single-page stock dashboard using Node.js (Express backend) and React (Vite frontend). The app must be launchable with platform-specific start scripts that open the browser automatically. No external API keys are required.

---

## Features

1. **Stock Cards Grid** — Display the top 20 US stocks as clickable cards. Each card shows: ticker symbol, company name (truncated), current price, and percentage change (green ▲ if up, red ▼ if down). Cards have a subtle hover lift and a coloured border when selected.

2. **Interactive Price Chart** — Clicking a stock card loads its price history as an area chart. The line and gradient fill are green (`#22c55e`) if the stock is up for the period, red (`#ef4444`) if down. Height: 420px.

3. **Timeline Selector** — Buttons to switch between 1D, 1W (default), 1M, 3M, 1Y. The chart re-fetches on change.

4. **Smart Ticker Search** — The add field in the header accepts both raw tickers (`NVDA`) and company names (`Nvidia`, `Apple Inc`). A 300ms-debounced live search calls `/api/search` and shows a dropdown with symbol, company name, and exchange. Pure ticker patterns (`/^[A-Z0-9]{1,5}(-[A-Z]{1,2})?$/`) bypass search and add directly. Use `onMouseDown` (not `onClick`) on dropdown items so the input blur event doesn't close the menu before the click fires. Clicking outside the dropdown closes it via a `mousedown` listener on `document`.

5. **Add/Remove Stocks** — Input in the header adds a stock; each card has a small × button to remove it.

6. **Compare Mode** — A toolbar below the chart header has **Single / Compare** mode pills. In Compare mode, clicking stock cards toggles them in/out of the comparison set (max 5). Each selected stock gets a distinct colour from the palette `['#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6']`. The chart switches to a normalised % change LineChart so stocks at different price levels can be compared. Selected chips appear in the chart header; clicking × on a chip deselects. A coloured dot appears on the card matching its line colour.

7. **Index Overlay** — A **vs Index** toggle button is always visible in the toolbar. When active, a dashed gray (`#94a3b8`) reference line is added for the selected index. Five indices are available: S&P 500 (`^GSPC`), NASDAQ (`^IXIC`), Dow Jones (`^DJI`), Russell 2000 (`^RUT`), NASDAQ 100 (`^NDX`). Works in both Single and Compare modes. In Single+Index mode, the chart also switches to % change so the stock and index share a scale.

8. **Market News Sidebar** — Fixed 340px right sidebar showing the latest 10 headlines. Clicking a headline expands it in the main panel (replaces the chart). Expanded view: smaller image on the left (200×200px), publisher badge + date, large title, related ticker chips, "Read full article ↗" button. A `← Back to chart` button and `◀ ▶` arrows are in the nav bar. Articles auto-cycle every 5 minutes when the expanded view is active; the cycle resets on manual navigation. Dot indicators at the bottom let users jump to any article.

9. **Auto-refresh** — Quotes refresh every 60 seconds via `setInterval`.

### Default Stock List
```
AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, BRK-B, JPM, V,
UNH, XOM, JNJ, WMT, MA, PG, HD, COST, ABBV, CRM
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Express.js | Port 3001 |
| Data source | `yahoo-finance2` v3 | Free, no API key |
| Frontend | React 19 + Vite 6 | Port 5173 |
| Charts | Recharts | AreaChart (single), LineChart (compare) |
| HTTP client | Axios | Frontend → backend |
| Styling | Plain CSS | Dark theme, no framework |

---

## File Structure

```
project-root/
├── server.js
├── package.json           # express, cors, yahoo-finance2
├── package-lock.json
├── .gitignore             # node_modules/, dist/, .claude/
├── start.sh               # macOS / Linux launcher
├── start.ps1              # Windows PowerShell launcher
├── start.bat              # Windows Command Prompt launcher
└── client/
    ├── package.json       # react, recharts, axios, vite, @vitejs/plugin-react
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        ├── index.css
        └── components/
            ├── StockChart.jsx
            ├── StockCard.jsx
            └── NewsFeed.jsx
```

---

## Backend API Endpoints

### `GET /api/quotes?symbols=AAPL,MSFT,...`
Returns `[{ symbol, shortName, regularMarketPrice, regularMarketChangePercent }]`.  
Use `Promise.allSettled()` so one bad ticker doesn't kill the whole batch.

### `GET /api/history/:symbol?period=1w`
Returns `{ symbol, quotes: [{ date, open, high, low, close, volume }] }`.

Period mapping:
| period | lookback | interval |
|--------|----------|----------|
| `1d` | 1 day | `5m` |
| `1w` | 7 days | `1h` |
| `1m` | 30 days | `1d` |
| `3m` | 90 days | `1d` |
| `1y` | 365 days | `1wk` |

### `GET /api/search?q=Apple`
Returns up to 6 matches: `[{ symbol, name, exchange }]`.  
Filter to `quoteType === 'EQUITY' || 'ETF'` only.

```javascript
const result = await yahooFinance.search(q, { quotesCount: 8, newsCount: 0 });
const matches = (result.quotes || [])
  .filter(item => item.quoteType === 'EQUITY' || item.quoteType === 'ETF')
  .slice(0, 6)
  .map(item => ({
    symbol: item.symbol,
    name: item.shortname || item.longname || item.symbol,
    exchange: item.exchDisp || item.exchange || '',
  }));
```

### `GET /api/news`
Returns up to 10 items: `[{ title, link, publisher, thumbnail, publishedAt, relatedTickers }]`.

```javascript
const result = await yahooFinance.search('stock market', { newsCount: 10 });
const news = (result.news || []).map(item => ({
  title: item.title,
  link: item.link,
  publisher: item.publisher,
  thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
  publishedAt: item.providerPublishTime || null,
  relatedTickers: item.relatedTickers || [],
}));
```

---

## Critical Implementation Details

### ⚠️ yahoo-finance2 v3 Instantiation (MOST COMMON FAILURE POINT)

```javascript
// ❌ WRONG — throws "Call `const yahooFinance = new YahooFinance()` first"
const yahooFinance = require('yahoo-finance2').default;

// ✅ CORRECT
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
```

### ⚠️ Use `chart()` not `historical()` for price history

```javascript
const result = await yahooFinance.chart(symbol, { period1, period2, interval });
// result.quotes[n] has: date, open, high, low, close, volume
```

### ⚠️ URL-encode all symbol path params

Index symbols contain `^` (e.g. `^GSPC`). Always encode:

```javascript
// Frontend
axios.get(`http://localhost:3001/api/history/${encodeURIComponent(symbol)}?period=${p}`)

// Express automatically decodes req.params.symbol, so server code needs no changes
```

### ⚠️ Node.js Version Compatibility

| Concern | Node 18/19 | Node 20+ |
|---------|-----------|----------|
| `concurrently` v10 | ❌ needs Node 20 | ✅ fine |
| `create-vite@latest` / Vite 5+ | ❌ needs Node 20 | ✅ fine |
| yahoo-finance2 v3 | ✅ works (cosmetic warning only) | ✅ fine |

On Node 18, use `npx create-vite@4 client --template react` and a bash background-process script instead of `concurrently`.  
On Node 20+, use latest versions of everything.

### ⚠️ Stale node processes during development

When testing new backend routes, always kill all running `node` processes first. A stale process bound to port 3001 will serve the old code and make new routes appear broken even though `server.js` is correct.

---

## Start Scripts

### `start.sh` (macOS / Linux)

```bash
#!/bin/bash
cleanup() { kill $SERVER_PID 2>/dev/null; exit; }
trap cleanup SIGINT SIGTERM

node server.js &
SERVER_PID=$!

# Open browser after Vite is ready
(sleep 3 && \
  if command -v xdg-open &>/dev/null; then xdg-open http://localhost:5173; \
  elif command -v open &>/dev/null; then open http://localhost:5173; \
  fi) &

cd client && npm run dev
cleanup
```

### `start.ps1` (Windows PowerShell)

```powershell
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$server = Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory $root -PassThru -WindowStyle Hidden

Start-Job -ScriptBlock { Start-Sleep 3; Start-Process "http://localhost:5173" } | Out-Null

try {
  Push-Location "$root\client"   # Push-Location, NOT Set-Location
  npm run dev                    # Set-Location leaks to the calling shell after the script exits
} finally {
  Pop-Location
  Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
}
```

> Use `Push-Location` / `Pop-Location` instead of `Set-Location`. `Set-Location` inside a `.ps1` permanently changes the calling shell's working directory after the script exits.

### `start.bat` (Windows Command Prompt)

```bat
@echo off
cd /d "%~dp0"
start /b node server.js
ping -n 4 127.0.0.1 >nul
start http://localhost:5173
cd client && npm run dev
```

---

## Frontend Component Details

### `App.jsx` — main orchestrator

State:
- `stocks[]` — tracked symbols
- `quotes[]` — live quote objects
- `selectedStock` — active symbol for single-stock chart
- `period` — active timeframe (`'1w'` default)
- `chartData[]` — quotes for single-stock chart
- `chartMode` — `'single'` | `'compare'`
- `compareStocks[]` — up to 5 symbols selected for comparison
- `compareData{}` — `{ symbol: quotes[] }` for all compare series
- `showIndex` — bool, whether index overlay is active
- `selectedIdx` — index symbol string (default `'^GSPC'`)
- `indexData[]` — quotes for the index (single+index mode only)
- `news[]`, `newsIndex`, `activeView` — news panel state
- `addInput`, `suggestions[]`, `showSugg`, `searching` — ticker search state

Key logic:
- `fetchCompareData(symbols, withIndex, indexSym, period)` — parallel `Promise.allSettled` fetch for all compare series + optional index
- When switching to Compare mode, auto-populate `compareStocks` with the currently selected stock
- Chart props are computed from a `chartProps` derived object that switches between single/compare/index-overlay prop shapes
- `commitSymbol(symbol)` — adds to stock list if new, then either selects (single mode) or toggles compare (compare mode)

### `StockChart.jsx`

Two internal rendering paths selected by props:
- If `seriesData` prop is present → `CompareChart` (normalised % change `LineChart`)
- Otherwise → `SingleChart` (absolute price `AreaChart`)

**`CompareChart`** — `mergeToPercentChange(seriesMap, orderedSymbols)`:
1. Normalise each series to % change from its first valid close: `(close - first) / first * 100`
2. Use the series with the most data points as the date scaffold
3. For each scaffold timestamp, find the nearest matching timestamp in other series (handles minor clock misalignment between stocks)
4. Return `[{ date, SYM1: pct, SYM2: pct, ... }]` for Recharts
5. Stock lines: solid, 2px, colour from palette. Index line: dashed (`strokeDasharray="5 3"`), 1.5px, `#94a3b8`
6. Add `<ReferenceLine y={0} />` as the zero baseline
7. Use `connectNulls` on all `Line` components to handle data gaps
8. Y-axis formatted as `+X.XX%` / `-X.XX%`

**Public API:**
```jsx
// Single mode
<StockChart data={quotes} isUp={bool} period="1w" />

// Compare / index-overlay mode
<StockChart
  seriesData={{ AAPL: quotes, MSFT: quotes, '^GSPC': quotes }}
  stockSymbols={['AAPL', 'MSFT']}
  stockColors={['#3b82f6', '#f59e0b']}
  indexSymbol="^GSPC"      // or null
  period="1w"
/>
```

### `StockCard.jsx`

Props: `symbol`, `quote`, `selected`, `compareColor`, `onSelect`, `onRemove`.  
When `compareColor` is set (compare mode, stock is in the comparison set):
- Card border uses that colour
- Box-shadow glow uses `${compareColor}40`
- A small filled dot (8px circle) appears at top-left in the same colour

### `NewsFeed.jsx`

Props: `news[]`, `activeIndex`, `onSelect(index)`.  
Items are `<div>` elements (not `<a>` tags) — clicking calls `onSelect(i)` to expand in the main panel. The item at `activeIndex` gets a blue outline and highlighted text. Use `onMouseEnter` / `onMouseLeave` for hover background rather than CSS `:hover` so the selected state takes priority.

---

## Styling (Dark Theme)

| Token | Value |
|-------|-------|
| Page background | `#0f172a` (slate-900) |
| Card / panel background | `#1e293b` (slate-800) |
| Deeper background | `#0f172a` (used inside panels) |
| Primary text | `#f1f5f9` (slate-100) |
| Muted text | `#64748b` (slate-500) |
| Secondary text | `#94a3b8` (slate-400) |
| Border | `#334155` (slate-700) |
| Accent / selected | `#3b82f6` (blue-500) |
| Up / positive | `#22c55e` (green-500) |
| Down / negative | `#ef4444` (red-500) |
| Index line | `#94a3b8` |
| Compare colours | `#3b82f6` `#f59e0b` `#a855f7` `#ec4899` `#14b8a6` |
| Font | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |

Layout:
- `#root`: `max-width: 1400px`, centred, `padding: 24px 16px`
- Main grid: `grid-template-columns: 1fr 340px`, news sidebar spans both rows (`grid-row: 1 / 3`)
- Stock cards: `repeat(auto-fill, minmax(175px, 1fr))`
- Single column on `≤ 900px`

---

## Setup Commands

```bash
# 1. Root
npm init -y
npm install express cors yahoo-finance2

# 2. Frontend (Node 20+ — use latest Vite)
npx create-vite@latest client --template react
cd client && npm install && npm install recharts axios && cd ..

# 3. Write server.js, start.sh, start.ps1, start.bat
# 4. chmod +x start.sh
```

---

## Testing Checklist

1. `node -c server.js` — no syntax errors
2. `node server.js &` then:
   - `curl "http://localhost:3001/api/quotes?symbols=AAPL"` → JSON array with price
   - `curl "http://localhost:3001/api/history/AAPL?period=1w"` → `{ quotes: [...] }` with 80+ data points
   - `curl "http://localhost:3001/api/search?q=Apple"` → array with `{ symbol: 'AAPL', name: 'Apple Inc.', ... }`
   - `curl "http://localhost:3001/api/news"` → array of 10 news items
   - `curl "http://localhost:3001/api/history/%5EGSPC?period=1w"` → index history (tests `^` encoding)
3. `cd client && npx vite build` — no errors
4. `./start.sh` (or `.\start.ps1`) — browser opens at localhost:5173
5. Stock cards render with live prices and green/red change indicators
6. Clicking a card updates the area chart
7. Period buttons change the chart timeframe
8. Add field: type `Apple` → dropdown shows AAPL; type `TSLA` → adds directly
9. Add field: company name resolves to correct ticker and adds to grid
10. News sidebar shows headlines; clicking one expands in main panel; ← Back returns to chart
11. Articles auto-cycle after 5 minutes; ◀ ▶ and dots navigate manually
12. **Compare**: click Compare → click 3 stock cards → 3 coloured lines appear on % change chart
13. **vs Index**: click vs Index → S&P 500 dashed gray line appears alongside stocks
14. Switching index (e.g. NASDAQ 100) updates the reference line
15. Compare + Index together: multiple stock lines + dashed index line
16. `start.ps1`: after closing, terminal returns to project root (not `client/` subfolder)

---

## Common Pitfalls

| Issue | Cause | Fix |
|-------|-------|-----|
| "Call new YahooFinance() first" | Using default export as instance | `new YahooFinance({ suppressNotices: [...] })` |
| Chart shows flat line | Using `historical()` instead of `chart()` | Use `yahooFinance.chart()` |
| Index history returns 404 | `^GSPC` not encoded in URL | `encodeURIComponent(symbol)` on every history fetch |
| New route returns "Cannot GET" | Old node process still running on port 3001 | Kill all node processes, then restart |
| Dropdown closes before click fires | Using `onClick` on dropdown items | Use `onMouseDown` + `e.preventDefault()` |
| PowerShell script leaves terminal in `client/` | `Set-Location` leaks to calling shell | `Push-Location` before, `Pop-Location` in `finally` |
| CORS errors in browser | Missing cors middleware | `app.use(cors())` before all routes |
| Compare chart shows wrong scale | Mixing absolute prices across stocks | Normalise all series to % change from first data point |
| Compare chart has gaps | Data series have different lengths | Use longest series as scaffold; `connectNulls` on Line |
| yargs-parser Node version error | `concurrently` v10 needs Node 20+ | Use bash background process instead |

---

## Lessons Learned

### 1. `Promise.allSettled` over `Promise.all` for batch fetches
When fetching quotes or compare data for N symbols, one bad ticker should not crash the whole response. `allSettled` lets you collect the successful results and silently drop failures.

### 2. Normalise to % change for any multi-series chart
Plotting NVDA ($800) and V ($270) on the same absolute-price axis makes one line look flat. Always normalise to `(close - firstClose) / firstClose * 100` when comparing two or more series. This also applies to single-stock vs index.

### 3. Use the longest series as the merge scaffold
When merging time series from different stocks (slightly different timestamps due to data gaps), use the series with the most data points as the date axis. For each scaffold timestamp, find the nearest point in other series. Do not assume all series are perfectly aligned.

### 4. Always `encodeURIComponent` path params that may contain special characters
Index symbols contain `^`. Forgetting to encode causes a 404. Express automatically decodes `req.params`, so the server side needs no changes — only the client-side URL construction.

### 5. `onMouseDown` for dropdown item clicks
If you use `onClick` on a dropdown item, the input's `blur` event fires first and closes the dropdown before the click registers. Use `onMouseDown` with `e.preventDefault()` to prevent the blur entirely.

### 6. `Push-Location` / `Pop-Location` in PowerShell scripts
`Set-Location` inside a `.ps1` changes the working directory of the calling shell session permanently. Use `Push-Location` to save the current location and `Pop-Location` in the `finally` block to restore it after the script exits.

### 7. Kill stale node processes before testing new routes
A process already bound to port 3001 will serve old code. When a new route seems to return 404 despite being in `server.js`, the almost certain cause is a stale process. Verify with a curl to a known good route and check if it returns the old response.

### 8. Separate `useEffect` hooks per concern
One large `useEffect` with many dependencies causes hard-to-debug re-render loops. Keep separate effects for: initial load, 60s quote refresh, single-stock chart fetch, index data fetch, compare data fetch, news auto-cycle, and dropdown click-outside. Each effect is then easy to reason about independently.

### 9. `connectNulls` on Recharts `Line` for real-world data
Yahoo Finance data has gaps (weekends, holidays, pre/post-market missing points). Without `connectNulls`, the chart renders disconnected segments. Always set it on multi-series comparison lines.

### 10. `suppressNotices: ['yahooSurvey']` in the constructor
Without this option, yahoo-finance2 v3 prints a survey notice to stdout on every startup which pollutes server logs. Suppress it at instantiation time.
