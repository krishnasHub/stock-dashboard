import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';

const UP_COLOR   = '#22c55e';
const DOWN_COLOR = '#ef4444';
const INDEX_COLOR = '#94a3b8';
const H = 420;

export function formatDate(dateStr, period) {
  const d = new Date(dateStr);
  if (period === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (period === '1w') return d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function mergeToPercentChange(seriesMap, orderedSymbols) {
  const normalized = {};
  for (const sym of orderedSymbols) {
    const quotes = seriesMap[sym];
    if (!quotes?.length) continue;
    const valid = quotes.filter(q => q.close != null);
    if (!valid.length) continue;
    const first = valid[0].close;
    normalized[sym] = valid.map(q => ({
      ts: new Date(q.date).getTime(),
      pct: +((q.close - first) / first * 100).toFixed(3),
    }));
  }

  const syms = Object.keys(normalized);
  if (!syms.length) return [];

  const scaffold = syms.reduce((best, s) =>
    normalized[s].length > normalized[best].length ? s : best
  );

  return normalized[scaffold].map(({ ts, pct }) => {
    const point = { date: new Date(ts).toISOString() };
    for (const sym of syms) {
      if (sym === scaffold) { point[sym] = pct; continue; }
      const nearest = normalized[sym].reduce((b, c) =>
        Math.abs(c.ts - ts) < Math.abs(b.ts - ts) ? c : b
      );
      point[sym] = nearest.pct;
    }
    return point;
  });
}

// ── Single stock AreaChart ────────────────────────────────────
function SingleChart({ data, isUp, period }) {
  const color = isUp ? UP_COLOR : DOWN_COLOR;
  const gid = isUp ? 'gradUp' : 'gradDown';

  if (!data?.length) {
    return <Empty msg="No data available" />;
  }

  const cd = data.map(q => ({ date: q.date, price: q.close ?? q.open })).filter(q => q.price != null);

  return (
    <ResponsiveContainer width="100%" height={H}>
      <AreaChart data={cd} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="date" tickFormatter={d => formatDate(d, period)} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
        <YAxis tickFormatter={v => `$${v.toFixed(0)}`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={55} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#9ca3af', fontSize: 12 }}
          itemStyle={{ color, fontWeight: 600 }}
          formatter={v => [`$${v.toFixed(2)}`, 'Price']}
          labelFormatter={d => formatDate(d, period)}
        />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill={`url(#${gid})`} dot={false} activeDot={{ r: 4, fill: color }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Multi-series normalised % change LineChart ────────────────
function CompareChart({ seriesData, stockSymbols, stockColors, indexSymbol, period }) {
  const allSyms = indexSymbol ? [...stockSymbols, indexSymbol] : [...stockSymbols];
  const merged  = mergeToPercentChange(seriesData, allSyms);

  if (!merged.length) {
    return <Empty msg={stockSymbols.length === 0 ? 'Click stock cards below to compare (up to 5)' : 'Loading comparison data…'} />;
  }

  const fmtPct = v => (v == null ? '' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`);

  return (
    <ResponsiveContainer width="100%" height={H}>
      <LineChart data={merged} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="date" tickFormatter={d => formatDate(d, period)} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
        <YAxis tickFormatter={fmtPct} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={62} domain={['auto', 'auto']} />
        <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#9ca3af', fontSize: 12 }}
          formatter={(v, name) => [fmtPct(v), name]}
          labelFormatter={d => formatDate(d, period)}
        />
        {stockSymbols.map((sym, i) => (
          <Line key={sym} type="monotone" dataKey={sym} stroke={stockColors[i]} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: stockColors[i] }} connectNulls />
        ))}
        {indexSymbol && (
          <Line key={indexSymbol} type="monotone" dataKey={indexSymbol} stroke={INDEX_COLOR} strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 3 }} connectNulls />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14 }}>
      {msg}
    </div>
  );
}

// ── Public API ────────────────────────────────────────────────
// Single mode: pass { data, isUp, period }
// Compare/index mode: pass { seriesData, stockSymbols, stockColors, indexSymbol, period }
export default function StockChart(props) {
  if (props.seriesData) {
    return <CompareChart {...props} />;
  }
  return <SingleChart data={props.data} isUp={props.isUp} period={props.period} />;
}
