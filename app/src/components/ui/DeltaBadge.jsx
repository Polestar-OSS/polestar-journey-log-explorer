import { Group, Text } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight, IconMinus } from '@tabler/icons-react';

/**
 * Signed percentage change. `upIsGood` decides the colour direction; the
 * arrow + sign carry the meaning so colour is never alone.
 */
function DeltaBadge({ value, upIsGood = true, label = 'vs previous period', size = 'xs' }) {
    if (value === null || value === undefined || !isFinite(value)) return null;
    const positive = value > 0;
    const flat = value === 0;
    const good = flat ? null : positive === upIsGood;
    const color = flat ? 'var(--ps-muted)' : good ? 'var(--ps-good)' : 'var(--ps-critical)';
    const Icon = flat ? IconMinus : positive ? IconArrowUpRight : IconArrowDownRight;
    return (
        <Group gap={4} wrap="nowrap" align="center">
            <Icon size={13} stroke={2} style={{ color }} />
            <Text size={size} fw={600} style={{ color }} className="ps-tabular">
                {positive ? '+' : ''}{value}%
            </Text>
            <Text size={size} c="dimmed">{label}</Text>
        </Group>
    );
}

export default DeltaBadge;
