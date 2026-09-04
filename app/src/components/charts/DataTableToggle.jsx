import { ActionIcon, ScrollArea, Table, Tooltip } from '@mantine/core';
import { IconTable, IconChartBar } from '@tabler/icons-react';

/**
 * Every chart carries a table twin. The toggle lives in the card's control
 * slot; the table renders in place of the plot.
 */
export function TableToggle({ opened, onToggle }) {
    return (
        <Tooltip label={opened ? 'Show chart' : 'Show as table'}>
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={onToggle} aria-pressed={opened} aria-label="Toggle table view">
                {opened ? <IconChartBar size={16} /> : <IconTable size={16} />}
            </ActionIcon>
        </Tooltip>
    );
}

export function DataTable({ columns, rows, maxHeight = 280 }) {
    return (
        <ScrollArea.Autosize mah={maxHeight} type="auto">
            <Table striped highlightOnHover withRowBorders={false} verticalSpacing={4} fz="xs" className="ps-tabular" stickyHeader>
                <Table.Thead>
                    <Table.Tr>
                        {columns.map((c) => (
                            <Table.Th key={c.key} style={{ textAlign: c.align || 'right', color: 'var(--ps-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {c.label}
                            </Table.Th>
                        ))}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row, i) => (
                        <Table.Tr key={row.key ?? i}>
                            {columns.map((c) => (
                                <Table.Td key={c.key} style={{ textAlign: c.align || 'right', whiteSpace: 'nowrap' }}>
                                    {c.format ? c.format(row[c.key], row) : row[c.key] ?? '–'}
                                </Table.Td>
                            ))}
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </ScrollArea.Autosize>
    );
}
