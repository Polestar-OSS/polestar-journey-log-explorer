import { SegmentedControl, Tooltip } from '@mantine/core';
import { EXPERIENCE_LEVELS } from '../../utils/preferences';

/**
 * Simple · Detailed · Expert. One control, persisted, decides how much of
 * the dashboard is shown. The same data, three depths.
 */
function LevelSwitch({ value, onChange, size = 'xs' }) {
    const current = EXPERIENCE_LEVELS.find((l) => l.value === value) ?? EXPERIENCE_LEVELS[0];
    return (
        <Tooltip label={current.description} position="bottom" openDelay={400}>
            <SegmentedControl
                size={size}
                radius="xs"
                value={value}
                onChange={onChange}
                data={EXPERIENCE_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
                aria-label="Experience level"
            />
        </Tooltip>
    );
}

export default LevelSwitch;
