import { Box, Flex, Stack, Text } from '@mantine/core';
import Eyebrow from '../ui/Eyebrow';

/**
 * Consistent chrome for every chart: eyebrow, title, optional description,
 * a controls slot on the right, and a footnote row underneath.
 */
function ChartCard({ eyebrow, title, description, controls, footer, children, minHeight, style, className = '', ...props }) {
    return (
        <Box className={`ps-card ${className}`} p={{ base: 'md', sm: 'lg' }} style={{ minHeight, display: 'flex', flexDirection: 'column', ...style }} {...props}>
            <Flex justify="space-between" align={{ base: 'stretch', sm: 'flex-start' }} direction={{ base: 'column', sm: 'row' }} gap="sm" mb="md">
                <Stack gap={4} style={{ minWidth: 0, flex: '1 1 260px' }}>
                    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                    {title && (
                        <Text fz={{ base: 'md', sm: 'lg' }} fw={500} lh={1.25} style={{ letterSpacing: '-0.01em' }}>
                            {title}
                        </Text>
                    )}
                    {description && (
                        <Text size="sm" c="dimmed" lh={1.45}>
                            {description}
                        </Text>
                    )}
                </Stack>
                {controls && <Box className="ps-no-print ps-chart-controls">{controls}</Box>}
            </Flex>
            <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
            {footer && (
                <Text size="xs" c="dimmed" mt="sm" lh={1.5}>
                    {footer}
                </Text>
            )}
        </Box>
    );
}

export default ChartCard;
