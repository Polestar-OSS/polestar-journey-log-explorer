import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useTokens } from '../../theme/useTokens';

/**
 * 12-point trend in the de-emphasis hue; the final point (current period) is
 * drawn as an accent dot.
 */
function Sparkline({ data, height = 36, accent = false }) {
    const t = useTokens();
    if (!data || data.length < 2) return <div style={{ height }} />;
    const color = accent ? t.accent : t.contextStrong;
    const last = data.length - 1;
    const id = `spark-${accent ? 'a' : 'c'}`;
    return (
        <div style={{ height, width: '100%' }} aria-hidden>
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.5}
                        fill={`url(#${id})`}
                        isAnimationActive={false}
                        dot={(props) => {
                            const { cx, cy, index } = props;
                            if (index !== last || cx === undefined) return null;
                            return <circle key="last" cx={cx} cy={cy} r={3} fill={t.accent} stroke={t.surface} strokeWidth={1.5} />;
                        }}
                        activeDot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export default Sparkline;
