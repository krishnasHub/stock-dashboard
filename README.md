# Stock Dashboard

A real-time stock dashboard with live price charts, multi-stock comparison, index overlays, and market news. Built with an Express backend and a React frontend — no API keys required.

---

## What it does

**Stock Cards** — Tracks the top 20 US stocks by default (AAPL, MSFT, NVDA, TSLA, and more). Each card shows the ticker, company name, current price, and percentage change with a green ▲ or red ▼ indicator. You can add any ticker and remove ones you don't need.

**Smart Ticker Search** — The add field accepts both ticker symbols (`NVDA`) and plain company names (`Nvidia`, `Apple Inc`). A live dropdown resolves company names to tickers as you type, showing the symbol, company name, and exchange.

**Interactive Price Chart** — Click any stock card to load its price history as an area chart. The chart line and gradient fill are green when the stock is up overall, red when down.

**Timeline Selector** — Switch between 1D, 1W, 1M, 3M, and 1Y timeframes. The chart re-fetches data instantly when the period changes.

**Compare Mode** — Switch to Compare in the chart toolbar, then click up to 5 stock cards to plot them together. Each stock gets a distinct coloured line (blue, amber, purple, pink, teal) and a matching dot on its card. All series are normalised to percentage change from the start of the period so stocks at different price levels are directly comparable. Click a chip in the chart header to deselect.

**Index Overlay** — Click **vs Index** in the toolbar to add a dashed reference line for any of the five major indices. Works in both Single and Compare modes.

| Index | Symbol |
|-------|--------|
| S&P 500 | `^GSPC` |
| NASDAQ Composite | `^IXIC` |
| Dow Jones Industrial | `^DJI` |
| Russell 2000 | `^RUT` |
| NASDAQ 100 | `^NDX` |

**Market News Sidebar** — Shows the latest 10 stock market headlines. Click any headline to expand it in the main panel — you get the thumbnail, publisher, publish date, related tickers, and a "Read full article" button. Articles auto-cycle every 5 minutes, and you can step through them with ◀ ▶ arrows or the dot indicators. Click any stock card or "← Back to chart" to return to the chart.

**Auto-refresh** — Live quotes refresh automatically every 60 seconds.

---

## Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | [Node.js](https://nodejs.org) | 18+ |
| Backend | [Express](https://expressjs.com) | 4.x |
| Market data | [yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2) | 3.x |
| Frontend | [React](https://react.dev) + [Vite](https://vitejs.dev) | 19 / 6 |
| Charts | [Recharts](https://recharts.org) | 2.x |
| HTTP client | [Axios](https://axios-http.com) | 1.x |
| Styling | Plain CSS (dark theme) | — |

---

## Prerequisites

- **[Node.js](https://nodejs.org/en/download) v18 or higher** (v20+ recommended)  
  Verify: `node --version`
- **npm** (comes bundled with Node)  
  Verify: `npm --version`

---

## Installation

```bash
git clone https://github.com/krishnasHub/stock-dashboard.git
cd stock-dashboard

# Backend dependencies
npm install

# Frontend dependencies
cd client && npm install && cd ..
```

---

## Starting the app

Both the backend (port 3001) and frontend (port 5173) start together, and your default browser opens automatically.

### macOS / Linux

```bash
chmod +x start.sh   # only needed the first time
./start.sh
```

### Windows — PowerShell

```powershell
.\start.ps1
```

> If you see an execution policy error, run:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### Windows — Command Prompt

```cmd
start.bat
```

Open **http://localhost:5173** if the browser doesn't launch automatically. Press **Ctrl+C** to stop.

---

## Manual start

```bash
# Terminal 1 — backend
node server.js

# Terminal 2 — frontend
cd client
npm run dev
```

---

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/quotes?symbols=AAPL,MSFT` | Live quote data for one or more tickers |
| `GET /api/history/:symbol?period=1w` | OHLCV price history (`1d` `1w` `1m` `3m` `1y`) |
| `GET /api/news` | Latest 10 market news headlines |
| `GET /api/search?q=Apple` | Resolve company name or partial name to ticker symbols |

---

## Default stock list

```
AAPL  MSFT  GOOGL  AMZN  NVDA
META  TSLA  BRK-B  JPM   V
UNH   XOM   JNJ    WMT   MA
PG    HD    COST   ABBV  CRM
```

---

## License

[MIT](LICENSE)
