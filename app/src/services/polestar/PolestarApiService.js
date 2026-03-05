/**
 * Polestar GraphQL API Service
 *
 * Wraps the Polestar MyStarV2 GraphQL API used by the pypolestar library:
 * https://github.com/pypolestar/pypolestar
 *
 * Endpoint: https://pc-api.polestar.com/eu-north-1/mystar-v2/
 * Authentication: Bearer access token obtained via PolestarAuthService
 */

export const API_MYSTAR_V2_URL =
    'https://pc-api.polestar.com/eu-north-1/mystar-v2/';

// ---------------------------------------------------------------------------
// Low-level GraphQL client
// ---------------------------------------------------------------------------

async function graphqlQuery(accessToken, query, variables = {}) {
    const response = await fetch(API_MYSTAR_V2_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Unauthorized – your session may have expired. Please reconnect.');
        }
        throw new Error(`API request failed (HTTP ${response.status})`);
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
        const first = result.errors[0];
        const code = first?.extensions?.code;
        if (code === 'UNAUTHENTICATED') {
            throw new Error('Session expired. Please reconnect to Polestar.');
        }
        throw new Error(first?.message || 'GraphQL error');
    }

    return result.data;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Fetch the list of vehicles associated with the authenticated account.
 *
 * Maps to the `getConsumerCarsV2` GraphQL query in pypolestar.
 *
 * @param {string} accessToken
 * @returns {Promise<Array<{ vin: string, registrationNo: string, content: object, software: object }>>}
 */
export async function fetchVehicles(accessToken) {
    const query = `
        query GetConsumerCarsV2 {
            getConsumerCarsV2 {
                vin
                registrationNo
                registrationDate
                factoryCompleteDate
                content {
                    model { name code }
                    specification { battery bodyType }
                }
                software {
                    version
                    versionTimestamp
                }
            }
        }
    `;

    const data = await graphqlQuery(accessToken, query);
    return data?.getConsumerCarsV2 ?? [];
}

/**
 * Fetch real-time telematics for the given VINs.
 *
 * Maps to the `carTelematicsV2` GraphQL query in pypolestar.
 *
 * @param {string} accessToken
 * @param {string[]} vins
 * @returns {Promise<Array<{ battery: object, odometer: object, health: object }>>}
 */
export async function fetchTelematics(accessToken, vins) {
    const query = `
        query CarTelematicsV2($vins: [String!]!) {
            carTelematicsV2(vins: $vins) {
                battery {
                    vin
                    batteryChargeLevelPercentage
                    chargingStatus
                    estimatedChargingTimeToFullMinutes
                    estimatedDistanceToEmptyKm
                    timestamp { seconds nanos }
                }
                odometer {
                    vin
                    odometerMeters
                    timestamp { seconds nanos }
                }
                health {
                    vin
                    serviceWarning
                    daysToService
                    distanceToServiceKm
                    timestamp { seconds nanos }
                }
            }
        }
    `;

    const data = await graphqlQuery(accessToken, query, { vins });
    return data?.carTelematicsV2 ?? [];
}
