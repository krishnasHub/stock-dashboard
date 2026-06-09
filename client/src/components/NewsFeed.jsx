export default function NewsFeed({ news, activeIndex, onSelect }) {
  if (!news || news.length === 0) {
    return <div style={{ color: '#64748b', fontSize: 13 }}>Loading news…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
      {news.map((item, i) => {
        const isSelected = i === activeIndex;
        return (
          <div
            key={i}
            onClick={() => onSelect(i)}
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 8px',
              borderRadius: 8,
              borderBottom: i < news.length - 1 ? '1px solid #334155' : 'none',
              cursor: 'pointer',
              background: isSelected ? '#0f172a' : 'transparent',
              outline: isSelected ? '1px solid #3b82f6' : 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#0f172a60'; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
          >
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt=""
                width={52}
                height={52}
                style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: isSelected ? '#f1f5f9' : '#cbd5e1',
                lineHeight: '1.4',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: 4,
              }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: isSelected ? '#3b82f6' : '#64748b' }}>
                {item.publisher}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
