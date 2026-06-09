import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const UP_COLOR = '#22c55e';
const DOWN_COLOR = '#ef4444';

function formatDate(dateStr, period) {
  const d = new Date(dateStr);
  if (period === '1d') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (period === '1w') {
    return d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function StockChart({ data, isUp, period }) {
  const color = isUp ? UP_COLOR : DOWN_COLOR;
  const gradientId = isUp ? 'gradUp' : 'gradDown';

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        No data available
      </div>
    );
  }

  const chartData = data.map(q => ({
    date: q.date,
    price: q.close ?? q.open,
  })).filter(q => q.price != null);

  return (
    <ResponsiveContainer width="100%" height={420}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={d => formatDate(d, period)}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tickFormatter={v => `$${v.toFixed(0)}`}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={55}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#9ca3af', fontSize: 12 }}
          itemStyle={{ color: color, fontWeight: 600 }}
          formatter={v => [`$${v.toFixed(2)}`, 'Price']}
          labelFormatter={d => formatDate(d, period)}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
