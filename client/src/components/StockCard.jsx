export default function StockCard({ symbol, quote, selected, compareColor, onSelect, onRemove }) {
  const price  = quote?.regularMarketPrice;
  const change = quote?.regularMarketChangePercent;
  const isUp   = change == null ? null : change >= 0;

  const borderColor = compareColor ?? (selected ? '#3b82f6' : '#334155');
  const glow        = compareColor ? `${compareColor}40` : (selected ? '#3b82f640' : null);

  return (
    <div
      onClick={onSelect}
      style={{
        background: '#1e293b',
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: '14px 14px 12px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: glow ? `0 0 0 2px ${glow}` : 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
    >
      {/* Remove button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
        title="Remove"
      >×</button>

      {/* Colour dot for compare mode */}
      {compareColor && (
        <div style={{ position: 'absolute', top: 10, left: 10, width: 8, height: 8, borderRadius: '50%', background: compareColor }} />
      )}

      <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 2, paddingLeft: compareColor ? 14 : 0 }}>
        {symbol}
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
        {quote?.shortName || '—'}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
        {price != null ? `$${price.toFixed(2)}` : '—'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: isUp === null ? '#64748b' : isUp ? '#22c55e' : '#ef4444' }}>
        {change != null ? `${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%` : '—'}
      </div>
    </div>
  );
}
