import { Anchor, Box, Button, Group, Text } from '@mantine/core';
import { IconShieldLock } from '@tabler/icons-react';
import { PRIVACY_POLICY_URL, COOKIE_POLICY_URL } from '../../services/consent/ConsentService';

/**
 * First-party consent for the one optional third party, Google Analytics.
 * Two equal buttons, no dark patterns, and it says plainly what is and is
 * not collected. Closing without a choice is the same as declining for
 * this visit: analytics stays off until accepted.
 */
function ConsentBanner({ open, onDecide }) {
    if (!open) return null;
    return (
        <Box role="dialog" aria-label="Cookie consent" className="ps-glass ps-no-print" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 240, padding: '12px 14px', maxWidth: 720, margin: '0 auto' }}>
            <Group gap="sm" wrap="nowrap" align="flex-start">
                <IconShieldLock size={18} style={{ color: 'var(--ps-accent)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} lh={1.3}>Visit counting, nothing else.</Text>
                    <Text size="xs" c="dimmed" lh={1.5} mt={2}>
                        Your journey data never leaves this browser and is never sold or shared. The only optional cookie is Google Analytics, used to count visits; it stays off until you accept. Read the{' '}
                        <Anchor href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer" size="xs">privacy policy</Anchor> or the{' '}
                        <Anchor href={COOKIE_POLICY_URL} target="_blank" rel="noreferrer" size="xs">cookie policy</Anchor>. Change your mind any time from the footer.
                    </Text>
                    <Group gap="xs" mt="sm" wrap="wrap">
                        <Button size="xs" onClick={() => onDecide(true)}>Accept analytics</Button>
                        <Button size="xs" variant="default" onClick={() => onDecide(false)}>Decline</Button>
                    </Group>
                </div>
            </Group>
        </Box>
    );
}

export default ConsentBanner;
