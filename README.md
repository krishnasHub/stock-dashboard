# Stock Dashboard

A real-time stock dashboard with live price charts and market news. Built with an Express backend and a React frontend — no API keys required.

![Dark theme dashboard showing stock cards, area chart, and news sidebar](https://placehold.co/1200x600/0f172a/f1f5f9?text=Stock+Dashboard)

---

## What it does

**Stock Cards** — Tracks the top 20 US stocks by default (AAPL, MSFT, NVDA, TSLA, and more). Each card shows the ticker, company name, current price, and percentage change with a green ▲ or red ▼ indicator. You can add any ticker and remove ones you don't need.

**Interactive Price Chart** — Click any stock card to load its price history as an area chart. The chart line and gradient fill are green when the stock is up overall, red when down.

**Timeline Selector** — Switch between 1D, 1W, 1M, 3M, and 1Y timeframes. The chart re-fetches data instantly when the period changes.

**Market News Sidebar** — Shows the latest 10 stock market headlines. Click any headline to expand the full article card in the main panel — you get the thumbnail, publisher, publish date, related tickers, and a button to open the full article. Articles auto-cycle every 5 minutes, and you can step through them with ◀ ▶ arrows or the dot indicators.

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

Clone the repo and install dependencies for both the backend and the frontend:

```bash
git clone https://github.com/krishnasHub/stock-dashboard.git
cd stock-dashboard

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

---

## Starting the app

Pick the script for your OS. Both the backend (port 3001) and frontend (port 5173) start together, and your default browser opens automatically.

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

Once running, open **http://localhost:5173** if the browser doesn't open automatically.  
Press **Ctrl+C** to stop both processes.

---

## Manual start (alternative)

If you prefer to run the two processes separately:

```bash
# Terminal 1 — backend
node server.js

# Terminal 2 — frontend
cd client
npm run dev
```

---

## API endpoints

The Express backend runs on port 3001 and exposes three endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/quotes?symbols=AAPL,MSFT` | Live quote data for one or more tickers |
| `GET /api/history/:symbol?period=1w` | OHLCV price history (`1d` `1w` `1m` `3m` `1y`) |
| `GET /api/news` | Latest 10 market news headlines |

---

## Default stock list

```
AAPL  MSFT  GOOGL  AMZN  NVDA
META  TSLA  BRK-B  JPM   V
UNH   XOM   JNJ    WMT   MA
PG    HD    COST   ABBV  CRM
```

You can add or remove tickers at any time using the input in the top-right of the dashboard.

---

## License

[MIT](LICENSE)
