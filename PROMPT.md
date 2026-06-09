# Stock Dashboard — Build Prompt

Build a single-page stock dashboard using Node.js (Express backend) and React (Vite frontend). The app should be launchable with a single `./start.sh` script that starts both the backend and frontend together.

---

## Requirements

### Features
1. **Stock Cards Grid** — Display the top 20 US stocks as clickable cards showing: ticker symbol, company name, current price, and percentage change (green with ▲ if up, red with ▼ if down).
2. **Interactive Price Chart** — Clicking a stock card shows its price history as an area chart. The chart line and fill should be green if the stock is up overall, red if down.
3. **Timeline Selector** — Buttons to switch between 1D, 1W (default), 1M, 3M, 1Y timeframes. The chart re-fetches data when the period changes.
4. **Add/Remove Stocks** — A text input in the header lets users type a ticker symbol and add it. Each stock card has an × button to remove it.
5. **Market News Sidebar** — A sidebar showing the latest 10 stock market news headlines with thumbnails, titles, and publisher names. Each headline links to the full article.
6. **Auto-refresh** — Quotes refresh every 60 seconds automatically.

### Default Stock List
```
AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, BRK-B, JPM, V,
UNH, XOM, JNJ, WMT, MA, PG, HD, COST, ABBV, CRM
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Express.js | Serves REST API on port 3001 |
| Data Source | `yahoo-finance2` npm package | Free, no API key needed |
| Frontend | React (via Vite) | Runs on port 5173 |
| Charts | Recharts (`AreaChart`) | Area chart with gradient fill |
| HTTP Client | Axios (frontend → backend) | |
| Styling | Plain CSS (dark theme) | No CSS framework needed |

---

## Architecture

```
project-root/
├── server.js              # Express backend
├── package.json           # Root: express, cors, yahoo-finance2
├── start.sh               # Single launch script
└── client/                # React frontend (Vite)
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
Returns an array of quote objects for the requested symbols. Each object includes `symbol`, `shortName`, `regularMarketPrice`, `regularMarketChangePercent`.

### `GET /api/history/:symbol?period=1w`
Returns `{ symbol, quotes: [...] }` where each quote has `date`, `open`, `high`, `low`, `close`, `volume`.

Period mapping:
- `1d` → 1 day back, interval `5m`
- `1w` → 7 days back, interval `1h`
- `1m` → 30 days back, interval `1d`
- `3m` → 90 days back, interval `1d`
- `1y` → 365 days back, interval `1wk`

### `GET /api/news`
Returns an array of news objects with `title`, `link`, `publisher`, `thumbnail`.

---

## Critical Implementation Details

### ⚠️ yahoo-finance2 v3 Instantiation (MOST COMMON FAILURE POINT)

The `yahoo-finance2` package v3 changed its API. You MUST instantiate it — the old pattern of using the default export directly will throw:

```javascript
// ❌ WRONG — throws "Call `const yahooFinance = new YahooFinance()` first"
const yahooFinance = require('yahoo-finance2').default;
yahooFinance.quote('AAPL'); // ERROR

// ✅ CORRECT — v3 requires instantiation
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
yahooFinance.quote('AAPL'); // Works
```

The default export is a **class** (function), not a ready-to-use instance. You must call `new` on it.

### ⚠️ yahoo-finance2 v3 `chart()` method

Use `yahooFinance.chart(symbol, { period1, period2, interval })` — NOT `historical()`. The response shape is `{ quotes: [...] }` where each quote has `date`, `open`, `high`, `low`, `close`, `volume`.

### ⚠️ yahoo-finance2 v3 `search()` for news

```javascript
const result = await yahooFinance.search('stock market', { newsCount: 10 });
const news = result.news || [];
```

### ⚠️ Node.js Version Compatibility

If targeting Node 18 or 19:

1. **Do NOT use `concurrently` npm package** — v10 depends on `yargs-parser` which requires Node ≥ 20. Use a bash script with background processes instead.

2. **Do NOT use `create-vite@latest` or Vite 5+/6+** — they require Node ≥ 20. Use `create-vite@4` (Vite 4.x) which supports Node 18:
   ```bash
   npx create-vite@4 client --template react
   ```

3. **yahoo-finance2 v3** prints a warning about Node ≥ 22 but actually works on Node 18. The warning is cosmetic; suppress it via the constructor option.

If targeting Node 20+, all of the above are non-issues and you can use latest versions of everything.

### Start Script Pattern (No External Dependencies)

Instead of `concurrently`, use a bash script that backgrounds the server:

```bash
#!/bin/bash
cleanup() {
  kill $SERVER_PID 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM

node server.js &
SERVER_PID=$!

cd client && npm run dev

cleanup
```

This ensures Ctrl+C kills both processes cleanly.

### Vite Proxy Configuration

Configure Vite to proxy `/api` requests to the backend so the frontend can also use relative paths in production:

```javascript
// client/vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
```

The frontend code uses the full URL (`http://localhost:3001/api/...`) for development clarity, but the proxy is available if you prefer relative paths.

---

## Frontend Component Details

### App.jsx (main orchestrator)
- Manages state: `stocks[]`, `quotes[]`, `selectedStock`, `period`, `chartData[]`, `news[]`
- `fetchQuotes()` — calls `/api/quotes?symbols=...` with all tracked symbols
- `fetchChart()` — calls `/api/history/:symbol?period=...` for the selected stock
- `fetchNews()` — calls `/api/news` once on mount
- Auto-refreshes quotes every 60s via `setInterval`
- `addStock(symbol)` — appends to stocks list (prevents duplicates, uppercases input)
- `removeStock(symbol)` — removes from list, switches selection if the removed stock was selected

### StockChart.jsx
- Uses Recharts `AreaChart` with `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`
- Color (stroke + gradient fill) is green (`#22c55e`) if stock is up, red (`#ef4444`) if down
- Height: 300px via `ResponsiveContainer`
- Formats X-axis dates, Y-axis as `$XXX`
- Shows "No data available" if empty

### StockCard.jsx
- Displays: symbol, company name (truncated), price, % change with arrow
- Entire card is clickable (selects stock for chart)
- Has a small × button (top-right) to remove
- Border highlight when selected (blue `#3b82f6`)
- Subtle hover lift effect

### NewsFeed.jsx
- Renders a scrollable list of news items
- Each item: thumbnail image (48x48), title (line-clamped to 3 lines), publisher name
- Items are anchor tags linking to the full article (`target="_blank"`)

---

## Styling (Dark Theme)

- Background: `#0f172a` (slate-900)
- Card/section background: `#1e293b` (slate-800)
- Text: `#f1f5f9` (slate-100)
- Muted text: `#64748b` (slate-500) or `#9ca3af` (gray-400)
- Accent (selected/buttons): `#3b82f6` (blue-500)
- Up/positive: `#22c55e` (green-500)
- Down/negative: `#ef4444` (red-500)
- Border: `#334155` (slate-700)
- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)

Layout:
- Main grid: 2 columns on desktop (chart + news sidebar), single column on mobile (≤900px)
- Stock cards: auto-fill grid with `minmax(180px, 1fr)` spanning full width below the chart
- News sidebar: fixed 300px width, max-height 420px with overflow scroll
- Max container width: 1400px, centered

---

## Setup Commands (in order)

```bash
# 1. Initialize root
mkdir stock-dashboard && cd stock-dashboard
npm init -y
npm install express cors yahoo-finance2

# 2. Create React client (use create-vite@4 for Node 18 compat)
npx create-vite@4 client --template react
cd client
npm install
npm install recharts axios
cd ..

# 3. Create server.js, start.sh, update package.json scripts
# 4. chmod +x start.sh
# 5. ./start.sh → opens at http://localhost:5173
```

---

## Testing Checklist

Before considering the build complete, verify:

1. `node -c server.js` — no syntax errors
2. Run server and test: `curl http://localhost:3001/api/quotes?symbols=AAPL` — returns JSON with price data
3. `cd client && npx vite build` — compiles without errors
4. `./start.sh` — both processes start, frontend accessible at localhost:5173
5. Stock cards render with prices and green/red indicators
6. Clicking a card updates the chart
7. Period buttons change the chart timeframe
8. Add/remove stocks works
9. News section shows headlines

---

## Common Pitfalls Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| "Call new YahooFinance() first" | Using default export as instance | `new YahooFinance()` |
| yargs-parser Node version error | `concurrently` v10 needs Node 20+ | Use bash background process |
| Vite "styleText not exported" | Latest Vite needs Node 20+ | Use `create-vite@4` |
| "No data available" in chart | API errors silently failing | Check server console for errors |
| CORS errors in browser | Backend missing cors middleware | `app.use(cors())` before routes |
| Chart shows flat line | Using `historical()` instead of `chart()` | Use `yahooFinance.chart()` |
