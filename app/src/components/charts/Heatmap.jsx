import { useState } from 'react';
import { Box, Group, Text } from '@mantine/core';
import { useTokens } from '../../theme/useTokens';
import { WEEKDAYS_SHORT } from '../../utils/journeyDate';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Weekday × hour grid. Sequential single-hue ramp; the hovered/focused cell
 * reports its value in the footer so no value is colour-only.
 */
function Heatmap({ cells, max, unit = 'trips', formatValue = (v) => v }) {
    const t = useTokens();
    const [hover, setHover] = useState(null);
    const ramp = t.sequential;

    const colorFor = (value) => {
        if (!value || max <= 0) return 'transparent';
        const idx = Math.min(ramp.length - 1, Math.max(1, Math.ceil((value / max) * (ramp.length - 1))));
        return ramp[idx];
    };

    const active = hover ? cells[hover.weekday * 24 + hover.hour] : null;

    return (
        <Box>
            <Box
                role="grid"
                aria-label={`Trips by weekday and hour`}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `34px repeat(24, minmax(0, 1fr))`,
                    gap: 2,
                    alignItems: 'stretch',
                }}
                onMouseLeave={() => setHover(null)}
            >
                <div />
                {HOURS.map((h) => (
                    <Text key={`h${h}`} size="10px" c="dimmed" ta="center" className="ps-tabular" style={{ lineHeight: 1 }}>
                        {h % 3 === 0 ? h : ''}
                    </Text>
                ))}
                {WEEKDAYS_SHORT.map((day, w) => (
                    <Box key={day} style={{ display: 'contents' }} role="row">
                        <Text size="10px" c="dimmed" pr={4} style={{ lineHeight: '18px' }}>{day}</Text>
                        {HOURS.map((h) => {
                            const cell = cells[w * 24 + h];
                            const isHover = hover && hover.weekday === w && hover.hour === h;
                            return (
                                <Box
                                    key={`${w}-${h}`}
                                    role="gridcell"
                                    tabIndex={cell.value ? 0 : -1}
                                    aria-label={`${day} ${h}:00, ${formatValue(cell.value)} ${unit}`}
                                    onMouseEnter={() => setHover({ weekday: w, hour: h })}
                                    onFocus={() => setHover({ weekday: w, hour: h })}
                                    style={{
                                        height: 18,
                                        borderRadius: 2,
                                        background: colorFor(cell.value),
                                        boxShadow: `inset 0 0 0 1px ${cell.value ? 'transparent' : t.grid}`,
                                        outline: isHover ? `2px solid ${t.ink}` : 'none',
                                        outlineOffset: -1,
                                        transition: 'transform 120ms var(--ps-ease)',
                                        transform: isHover ? 'scale(1.15)' : 'none',
                                        cursor: cell.value ? 'pointer' : 'default',
                                    }}
                                />
                            );
                        })}
                    </Box>
                ))}
            </Box>
            <Group justify="space-between" mt="sm" wrap="wrap" gap="xs">
                <Text size="xs" c="dimmed" className="ps-tabular" style={{ minHeight: 18 }}>
                    {active
                        ? `${WEEKDAYS_SHORT[active.weekday]} ${String(active.hour).padStart(2, '0')}:00 – ${String(active.hour + 1).padStart(2, '0')}:00 · ${formatValue(active.value)} ${unit}`
                        : 'Hover a cell to read it'}
                </Text>
                <Group gap={4} wrap="nowrap">
                    <Text size="10px" c="dimmed">0</Text>
                    {ramp.slice(1).map((c) => (
                        <Box key={c} style={{ width: 14, height: 8, background: c, borderRadius: 1 }} />
                    ))}
                    <Text size="10px" c="dimmed" className="ps-tabular">{formatValue(max)}</Text>
                </Group>
            </Group>
        </Box>
    );
}

export default Heatmap;
