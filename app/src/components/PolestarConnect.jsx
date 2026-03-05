import { useState } from 'react';
import {
    Stack,
    Text,
    Button,
    TextInput,
    Group,
    Alert,
    Stepper,
    Badge,
    Paper,
    List,
    Anchor,
    Divider,
    ThemeIcon,
    Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconLogin,
    IconExternalLink,
    IconAlertCircle,
    IconCheck,
    IconInfoCircle,
    IconCar,
    IconBattery2,
    IconGauge,
} from '@tabler/icons-react';
import {
    startOAuthFlow,
    parseCallbackUrl,
    exchangeCodeForToken,
} from '../services/polestar/PolestarAuthService';
import { fetchVehicles, fetchTelematics } from '../services/polestar/PolestarApiService';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function VehicleCard({ vehicle, telematics }) {
    const modelName = vehicle?.content?.model?.name ?? 'Unknown model';
    const battery = vehicle?.content?.specification?.battery ?? '';
    const registrationNo = vehicle?.registrationNo ?? '';
    const softwareVersion = vehicle?.software?.version ?? '';

    const tel = telematics ?? {};
    const batteryLevel = tel.battery?.batteryChargeLevelPercentage ?? null;
    const chargingStatus = tel.battery?.chargingStatus ?? null;
    const estimatedRangeKm = tel.battery?.estimatedDistanceToEmptyKm ?? null;
    const odometerMeters = tel.odometer?.odometerMeters ?? null;

    return (
        <Paper withBorder p="md" radius="md">
            <Group gap="xs" mb="sm">
                <ThemeIcon variant="light" size="lg">
                    <IconCar size={18} />
                </ThemeIcon>
                <div>
                    <Text fw={600}>{modelName}</Text>
                    <Text size="xs" c="dimmed">{vehicle.vin}</Text>
                </div>
                {registrationNo && (
                    <Badge variant="outline" ml="auto">{registrationNo}</Badge>
                )}
            </Group>

            <Group gap="xl">
                {batteryLevel !== null && (
                    <Group gap="xs">
                        <IconBattery2 size={16} />
                        <Text size="sm">{batteryLevel}%</Text>
                        {chargingStatus && (
                            <Badge size="xs" variant="light" color="green">
                                {chargingStatus.replace(/_/g, ' ')}
                            </Badge>
                        )}
                    </Group>
                )}
                {estimatedRangeKm !== null && (
                    <Text size="sm" c="dimmed">
                        ~{estimatedRangeKm} km range
                    </Text>
                )}
                {odometerMeters !== null && (
                    <Group gap="xs">
                        <IconGauge size={16} />
                        <Text size="sm">
                            {Math.round(odometerMeters / 1000).toLocaleString()} km
                        </Text>
                    </Group>
                )}
            </Group>

            {(battery || softwareVersion) && (
                <Text size="xs" c="dimmed" mt="xs">
                    {[battery, softwareVersion && `SW ${softwareVersion}`]
                        .filter(Boolean)
                        .join(' · ')}
                </Text>
            )}
        </Paper>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function PolestarConnect() {
    const [active, setActive] = useState(0);
    const [callbackInput, setCallbackInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [telematics, setTelematics] = useState([]);
    const [codeVerifier, setCodeVerifier] = useState(null);

    const handleOpenAuth = async () => {
        setError(null);
        setLoading(true);
        try {
            const { url, codeVerifier: cv } = await startOAuthFlow();
            setCodeVerifier(cv);
            window.open(url, '_blank', 'noopener,noreferrer');
            setActive(1);
        } catch (err) {
            setError(`Could not start authentication: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setError(null);

        let code;
        try {
            ({ code } = parseCallbackUrl(callbackInput));
        } catch (err) {
            setError(err.message);
            return;
        }

        setLoading(true);
        try {
            const tokens = await exchangeCodeForToken(code, codeVerifier);
            const accessToken = tokens.access_token;

            const fetchedVehicles = await fetchVehicles(accessToken);
            const vins = fetchedVehicles.map((v) => v.vin);
            const fetchedTelematics = vins.length > 0
                ? await fetchTelematics(accessToken, vins)
                : [];

            setVehicles(fetchedVehicles);
            setTelematics(fetchedTelematics);
            setActive(2);

            notifications.show({
                title: 'Connected!',
                message: `Found ${fetchedVehicles.length} vehicle(s) in your Polestar account.`,
                color: 'green',
            });
        } catch (err) {
            const msg = err.message || 'Failed to connect to Polestar.';

            // Detect CORS errors (TypeError with no message) and give guidance
            if (err instanceof TypeError && !err.message) {
                setError(
                    'A network error occurred – this is likely a CORS restriction. ' +
                    'Your browser prevents direct requests to the Polestar API from third-party pages. ' +
                    'Please use the CSV/XLSX manual upload instead.'
                );
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setActive(0);
        setCallbackInput('');
        setError(null);
        setVehicles([]);
        setTelematics([]);
        setCodeVerifier(null);
    };

    const telematicsForVin = (vin) =>
        telematics.find((t) => t?.battery?.vin === vin || t?.odometer?.vin === vin);

    return (
        <Stack gap="xl">
            <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
                title="Experimental feature"
            >
                This feature uses the same undocumented Polestar cloud API as the open-source{' '}
                <Anchor
                    href="https://github.com/pypolestar/pypolestar"
                    target="_blank"
                    size="sm"
                >
                    pypolestar
                </Anchor>{' '}
                library. It can fetch vehicle information and real-time telematics. Full
                journey-log history is not yet available via the API – use the{' '}
                <Text span fw={600}>Upload File</Text> tab for complete trip analysis.
            </Alert>

            <Stepper active={active} onStepClick={setActive}>
                {/* ── Step 0: Open Polestar login ─────────────────────────── */}
                <Stepper.Step
                    label="Sign in"
                    description="Open Polestar login"
                    icon={<IconLogin size={18} />}
                    completedIcon={<IconCheck size={18} />}
                >
                    <Stack gap="md" mt="md">
                        <Text size="sm">
                            Click the button below to open the official Polestar sign-in page in a
                            new tab. Sign in with your Polestar ID, then copy the full URL from
                            your browser's address bar after you are redirected.
                        </Text>

                        <List size="sm" spacing="xs" withPadding>
                            <List.Item>A new tab will open with the Polestar login page</List.Item>
                            <List.Item>Sign in with your Polestar ID credentials</List.Item>
                            <List.Item>
                                After signing in you will land on{' '}
                                <Text span ff="monospace" size="xs">
                                    www.polestar.com/sign-in-callback?code=…
                                </Text>
                            </List.Item>
                            <List.Item>
                                Copy the <strong>entire URL</strong> from your browser's address
                                bar and paste it in the next step
                            </List.Item>
                        </List>

                        <Alert icon={<IconInfoCircle size={14} />} color="teal" variant="light">
                            Your credentials are entered directly on Polestar's own website.
                            This application never sees your username or password.
                        </Alert>

                        {error && (
                            <Alert
                                icon={<IconAlertCircle size={16} />}
                                color="red"
                                variant="light"
                            >
                                {error}
                            </Alert>
                        )}

                        <Button
                            leftSection={<IconExternalLink size={16} />}
                            onClick={handleOpenAuth}
                            loading={loading}
                        >
                            Open Polestar Login
                        </Button>
                    </Stack>
                </Stepper.Step>

                {/* ── Step 1: Paste callback URL ───────────────────────────── */}
                <Stepper.Step
                    label="Authorize"
                    description="Paste the callback URL"
                    completedIcon={<IconCheck size={18} />}
                >
                    <Stack gap="md" mt="md">
                        <Text size="sm">
                            After signing in, your browser will be redirected to a Polestar page.
                            Copy the full URL from the address bar and paste it below.
                        </Text>

                        <TextInput
                            label="Callback URL"
                            placeholder="https://www.polestar.com/sign-in-callback?code=…"
                            value={callbackInput}
                            onChange={(e) => setCallbackInput(e.currentTarget.value)}
                            description="Paste the full URL from your browser after signing in"
                        />

                        {error && (
                            <Alert
                                icon={<IconAlertCircle size={16} />}
                                color="red"
                                variant="light"
                            >
                                {error}
                            </Alert>
                        )}

                        <Group>
                            <Button
                                variant="default"
                                onClick={() => setActive(0)}
                                disabled={loading}
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleConnect}
                                loading={loading}
                                disabled={!callbackInput.trim()}
                            >
                                Connect
                            </Button>
                        </Group>
                    </Stack>
                </Stepper.Step>

                {/* ── Step 2: Results ──────────────────────────────────────── */}
                <Stepper.Step
                    label="Connected"
                    description="Vehicle data fetched"
                    completedIcon={<IconCheck size={18} />}
                >
                    <Stack gap="md" mt="md">
                        {vehicles.length === 0 ? (
                            <Alert color="yellow" variant="light">
                                No vehicles found in your account.
                            </Alert>
                        ) : (
                            <>
                                <Text size="sm" fw={600}>
                                    {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}{' '}
                                    found
                                </Text>
                                {vehicles.map((v) => (
                                    <VehicleCard
                                        key={v.vin}
                                        vehicle={v}
                                        telematics={telematicsForVin(v.vin)}
                                    />
                                ))}
                            </>
                        )}

                        <Divider />

                        <Box>
                            <Group gap="xs" mb="xs">
                                <IconInfoCircle size={16} />
                                <Text size="sm" fw={600}>
                                    Journey log history
                                </Text>
                            </Group>
                            <Text size="sm" c="dimmed">
                                The Polestar cloud API does not yet expose full journey-log history
                                (trip distances, addresses, energy consumption per trip). To
                                analyse your trips, please export a CSV or XLSX file from the
                                Polestar Journey Log app and use the{' '}
                                <Text span fw={600}>Upload File</Text> tab.
                            </Text>
                        </Box>

                        <Button variant="default" onClick={handleReset}>
                            Disconnect
                        </Button>
                    </Stack>
                </Stepper.Step>
            </Stepper>
        </Stack>
    );
}

export default PolestarConnect;
