import { useTokens } from '../../theme/useTokens';
import { formatNumber } from '../../utils/format';

/**
 * Recharts tooltip content. Values lead, series names follow; each row is
 * keyed by a short stroke of the series colour. Labels are rendered as text
 * nodes (never HTML) because they may originate from user data.
 */
function ChartTooltip({ active, payload, label, title, rows, footer }) {
    const t = useTokens();
    if (!active || !payload || payload.length === 0) return null;
    const datum = payload[0]?.payload;
    const resolvedTitle = typeof title === 'function' ? title(datum, label) : title ?? label;
    const resolvedRows = rows
        ? rows(datum, payload)
        : payload
            .filter((p) => p.value !== null && p.value !== undefined)
            .map((p) => ({ key: p.dataKey, label: p.name, value: p.value, color: p.color || p.fill, unit: p.unit }));
    const resolvedFooter = typeof footer === 'function' ? footer(datum) : footer;

    return (
        <div
            style={{
                background: t.tooltipBg,
                color: t.tooltipInk,
                padding: '10px 12px',
                borderRadius: 2,
                minWidth: 160,
                boxShadow: '0 12px 32px -12px rgba(0,0,0,0.5)',
                fontSize: 12,
                lineHeight: 1.4,
                pointerEvents: 'none',
            }}
        >
            {resolvedTitle && (
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 6, fontWeight: 600 }}>
                    {resolvedTitle}
                </div>
            )}
            {resolvedRows.map((row) => (
                <div key={row.key ?? row.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <span style={{ width: 12, height: 2, background: row.color || 'currentColor', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {typeof row.value === 'number' ? formatNumber(row.value) : row.value}
                        {row.unit ? <span style={{ fontWeight: 400, opacity: 0.75, marginLeft: 3 }}>{row.unit}</span> : null}
                    </span>
                    <span style={{ opacity: 0.75, marginLeft: 'auto', paddingLeft: 12 }}>{row.label}</span>
                </div>
            ))}
            {resolvedFooter && <div style={{ marginTop: 8, opacity: 0.7, fontSize: 11 }}>{resolvedFooter}</div>}
        </div>
    );
}

export default ChartTooltip;
