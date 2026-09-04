import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import Eyebrow from '../ui/Eyebrow';
import DeltaBadge from '../ui/DeltaBadge';
import Sparkline from '../charts/Sparkline';
import { useCountUp } from '../../hooks/useCountUp';
import { formatNumber } from '../../utils/format';

/**
 * Stat tile: label · value · optional delta vs previous period · optional
 * 12-point sparkline. Numbers count up on change (reduced-motion aware).
 */
function StatTile({ label, value, unit, digits, delta, upIsGood = true, deltaLabel, spark, icon: Icon, hint, onClick, accent = false, style, ...props }) {
    const numeric = typeof value === 'number' && isFinite(value);
    const animated = useCountUp(numeric ? value : 0);
    const display = numeric ? formatNumber(animated, digits ?? (Math.abs(value) >= 100 ? 0 : 1)) : value;

    const tile = (
        <Box
            className={`ps-card ${onClick ? 'ps-card-hover' : ''}`}
            p="md"
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
            style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden', ...style }}
            {...props}
        >
            {accent && <Box style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--ps-accent)' }} />}
            <Stack gap={6}>
                <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Eyebrow style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</Eyebrow>
                    {Icon && <Icon size={16} stroke={1.5} style={{ color: 'var(--ps-muted)', flexShrink: 0 }} />}
                </Group>
                <Text component="div" className="ps-stat-value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {display}
                    {unit && <span className="ps-stat-unit">{unit}</span>}
                </Text>
                {delta !== undefined && delta !== null ? (
                    <DeltaBadge value={delta} upIsGood={upIsGood} label={deltaLabel} />
                ) : hint ? (
                    <Text size="xs" c="dimmed" lineClamp={1}>{hint}</Text>
                ) : null}
                {spark && <Sparkline data={spark} accent={accent} />}
            </Stack>
        </Box>
    );

    return hint && delta !== undefined && delta !== null ? <Tooltip label={hint} multiline w={240}>{tile}</Tooltip> : tile;
}

export default StatTile;
