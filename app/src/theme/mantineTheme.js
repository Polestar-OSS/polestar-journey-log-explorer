import { createTheme, rem, Paper, Modal, Button, Tabs, Badge, Tooltip, Select, Popover } from '@mantine/core';

const FONT = "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Mantine theme tuned to a Polestar-like visual language:
 * monochrome surfaces, one warm accent, sharp corners, hairline borders,
 * light-weight display type.
 */
export const mantineTheme = createTheme({
    fontFamily: FONT,
    fontFamilyMonospace: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    headings: {
        fontFamily: FONT,
        fontWeight: '500',
        sizes: {
            h1: { fontSize: rem(40), lineHeight: '1.1', fontWeight: '400' },
            h2: { fontSize: rem(28), lineHeight: '1.15', fontWeight: '400' },
            h3: { fontSize: rem(22), lineHeight: '1.2', fontWeight: '500' },
            h4: { fontSize: rem(17), lineHeight: '1.3', fontWeight: '500' },
            h5: { fontSize: rem(15), lineHeight: '1.35', fontWeight: '500' },
            h6: { fontSize: rem(13), lineHeight: '1.4', fontWeight: '600' },
        },
    },
    primaryColor: 'polestar',
    primaryShade: { light: 6, dark: 5 },
    colors: {
        polestar: [
            '#fff1e6', '#ffe0c7', '#ffc59a', '#ffa563', '#ff8a38',
            '#ff7500', '#e8590c', '#c94b08', '#a63d06', '#7d2c06',
        ],
        // Mantine's dark scale: [6] paper, [7] body, [4]/[5] borders & hovers
        dark: [
            '#f5f5f3', '#c3c2b7', '#a3a29b', '#898781', '#2c2c2a',
            '#222220', '#151515', '#0b0b0b', '#080808', '#050505',
        ],
        gray: [
            '#f7f7f5', '#efefec', '#e3e2dc', '#d2d1ca', '#b9b8b0',
            '#898781', '#6b6a65', '#52514e', '#3a3a37', '#232321',
        ],
    },
    black: '#101010',
    white: '#ffffff',
    defaultRadius: 'xs',
    radius: { xs: rem(2), sm: rem(4), md: rem(6), lg: rem(10), xl: rem(16) },
    cursorType: 'pointer',
    focusRing: 'auto',
    components: {
        Paper: Paper.extend({
            defaultProps: { radius: 'xs' },
            classNames: { root: 'ps-paper' },
        }),
        Modal: Modal.extend({
            defaultProps: {
                radius: 'xs',
                overlayProps: { backgroundOpacity: 0.55, blur: 6 },
                transitionProps: { transition: 'fade-up', duration: 200 },
            },
            classNames: { content: 'ps-modal', header: 'ps-modal-header', title: 'ps-modal-title' },
        }),
        Button: Button.extend({
            defaultProps: { radius: 'xs' },
            classNames: { root: 'ps-button' },
        }),
        Tabs: Tabs.extend({
            classNames: { list: 'ps-tabs-list', tab: 'ps-tab' },
        }),
        Badge: Badge.extend({
            defaultProps: { radius: 'xs' },
            classNames: { root: 'ps-badge' },
        }),
        Tooltip: Tooltip.extend({
            defaultProps: { radius: 'xs', withArrow: false, openDelay: 250 },
        }),
        Select: Select.extend({ defaultProps: { radius: 'xs', comboboxProps: { radius: 'xs', shadow: 'md' } } }),
        Popover: Popover.extend({ defaultProps: { radius: 'xs', shadow: 'md' } }),
    },
});
