import { Modal, Stack, NumberInput, Select, Text, Group, Button, Divider, Paper, SimpleGrid, Autocomplete, Loader } from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconCurrencyDollar, IconBolt, IconHome, IconMapPin } from '@tabler/icons-react';

function CostCalculatorModal({ opened, onClose, statistics }) {
  const [electricityRate, setElectricityRate] = useState(0.13);
  const [currency, setCurrency] = useState('USD');
  const [homeChargingPercent, setHomeChargingPercent] = useState(80);
  const [citySearch, setCitySearch] = useState('');
  const [cityOptions, setCityOptions] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Global electricity rates by country (USD per kWh, approximate 2025 rates)
  const electricityRatesByCountry = {
    'United States': { rate: 0.16, currency: 'USD' },
    'Canada': { rate: 0.11, currency: 'CAD' },
    'United Kingdom': { rate: 0.35, currency: 'GBP' },
    'Germany': { rate: 0.38, currency: 'EUR' },
    'France': { rate: 0.23, currency: 'EUR' },
    'Spain': { rate: 0.28, currency: 'EUR' },
    'Italy': { rate: 0.31, currency: 'EUR' },
    'Netherlands': { rate: 0.33, currency: 'EUR' },
    'Belgium': { rate: 0.30, currency: 'EUR' },
    'Sweden': { rate: 0.20, currency: 'EUR' },
    'Norway': { rate: 0.17, currency: 'EUR' },
    'Denmark': { rate: 0.36, currency: 'EUR' },
    'Australia': { rate: 0.25, currency: 'AUD' },
    'New Zealand': { rate: 0.23, currency: 'AUD' },
    'Japan': { rate: 0.26, currency: 'USD' },
    'South Korea': { rate: 0.11, currency: 'USD' },
    'China': { rate: 0.08, currency: 'USD' },
    'India': { rate: 0.08, currency: 'USD' },
    'Brazil': { rate: 0.15, currency: 'USD' },
    'Mexico': { rate: 0.09, currency: 'USD' },
    'Argentina': { rate: 0.05, currency: 'USD' },
    'Chile': { rate: 0.14, currency: 'USD' },
    'South Africa': { rate: 0.11, currency: 'USD' },
    'Israel': { rate: 0.17, currency: 'USD' },
    'Switzerland': { rate: 0.21, currency: 'EUR' },
    'Austria': { rate: 0.24, currency: 'EUR' },
    'Poland': { rate: 0.18, currency: 'EUR' },
    'Portugal': { rate: 0.27, currency: 'EUR' },
    'Ireland': { rate: 0.32, currency: 'EUR' },
    'Finland': { rate: 0.19, currency: 'EUR' },
    'Turkey': { rate: 0.10, currency: 'USD' },
    'United Arab Emirates': { rate: 0.08, currency: 'USD' },
    'Saudi Arabia': { rate: 0.05, currency: 'USD' },
    'Singapore': { rate: 0.22, currency: 'USD' },
    'Malaysia': { rate: 0.08, currency: 'USD' },
    'Thailand': { rate: 0.11, currency: 'USD' },
    'Indonesia': { rate: 0.09, currency: 'USD' },
    'Philippines': { rate: 0.18, currency: 'USD' },
  };

  // Debounced city search
  useEffect(() => {
    if (citySearch.length < 3) {
      setCityOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingCities(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&q=${encodeURIComponent(citySearch)}&` +
          `addressdetails=1&limit=5`,
          {
            headers: {
              'User-Agent': 'Polestar Journey Log Explorer'
            }
          }
        );
        const data = await response.json();
        const options = data.map(place => ({
          value: place.display_name,
          country: place.address?.country,
          label: place.display_name,
        }));
        setCityOptions(options);
      } catch (error) {
        console.error('Error fetching cities:', error);
        setCityOptions([]);
      } finally {
        setLoadingCities(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [citySearch]);

  const handleCitySelect = (value) => {
    setCitySearch(value);
    const selectedCity = cityOptions.find(opt => opt.value === value);
    if (selectedCity?.country) {
      const countryRate = electricityRatesByCountry[selectedCity.country];
      if (countryRate) {
        setElectricityRate(countryRate.rate);
        setCurrency(countryRate.currency);
      }
    }
  };

  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
  };

  const calculateCosts = () => {
    if (!statistics) return { homeChargingCost: 0, publicChargingCost: 0, totalCost: 0, avgPerTrip: 0, avgPerKm: 0 };

    const totalConsumption = statistics.totalConsumption;
    const homeConsumption = (totalConsumption * homeChargingPercent) / 100;
    const publicConsumption = totalConsumption - homeConsumption;

    // Home charging cost
    const homeChargingCost = homeConsumption * electricityRate;

    // Public charging typically 2-3x home rate
    const publicRate = electricityRate * 2.5;
    const publicChargingCost = publicConsumption * publicRate;

    const totalCost = homeChargingCost + publicChargingCost;
    const avgPerTrip = totalCost / statistics.totalTrips;
    const avgPerKm = totalCost / statistics.totalDistance;

    return {
      homeChargingCost: homeChargingCost.toFixed(2),
      publicChargingCost: publicChargingCost.toFixed(2),
      totalCost: totalCost.toFixed(2),
      avgPerTrip: avgPerTrip.toFixed(2),
      avgPerKm: avgPerKm.toFixed(4),
    };
  };

  const costs = calculateCosts();
  const symbol = currencySymbols[currency];

  return (
    <Modal
      zIndex={99999999999999}
      opened={opened}
      onClose={onClose}
      title="Charging Cost Calculator"
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Estimate your charging costs based on your electricity rates and charging habits.
        </Text>

        <Autocomplete
          label="City or Location (Optional)"
          description="Search for your city to auto-fill electricity rates"
          placeholder="Type your city name..."
          leftSection={<IconMapPin size={16} />}
          rightSection={loadingCities ? <Loader size={16} /> : null}
          data={cityOptions.map(opt => opt.value)}
          value={citySearch}
          onChange={setCitySearch}
          onOptionSubmit={handleCitySelect}
          limit={5}
        />

        <NumberInput
          label="Home Electricity Rate"
          description="Cost per kWh at home"
          leftSection={<IconBolt size={16} />}
          value={electricityRate}
          onChange={setElectricityRate}
          min={0}
          step={0.01}
          decimalScale={3}
          suffix={` ${symbol}/kWh`}
        />

        <Select
          label="Currency"
          leftSection={<IconCurrencyDollar size={16} />}
          value={currency}
          onChange={setCurrency}
          data={[
            { value: 'USD', label: 'USD - US Dollar' },
            { value: 'EUR', label: 'EUR - Euro' },
            { value: 'GBP', label: 'GBP - British Pound' },
            { value: 'CAD', label: 'CAD - Canadian Dollar' },
            { value: 'AUD', label: 'AUD - Australian Dollar' },
          ]}
        />

        <NumberInput
          label="Home Charging Percentage"
          description="% of charging done at home vs public chargers"
          leftSection={<IconHome size={16} />}
          value={homeChargingPercent}
          onChange={setHomeChargingPercent}
          min={0}
          max={100}
          suffix="%"
        />

        <Divider label="Cost Breakdown" labelPosition="center" />

        <Paper p="md" withBorder style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>Home Charging ({homeChargingPercent}%)</Text>
              <Text size="sm" fw={700}>{symbol}{costs.homeChargingCost}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" fw={500}>Public Charging ({100 - homeChargingPercent}%)</Text>
              <Text size="sm" fw={700}>{symbol}{costs.publicChargingCost}</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="lg" fw={700}>Total Cost</Text>
              <Text size="lg" fw={700} c="blue">{symbol}{costs.totalCost}</Text>
            </Group>
          </Stack>
        </Paper>

        <SimpleGrid cols={2} spacing="sm">
          <Paper p="sm" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase">Avg per Trip</Text>
            <Text size="lg" fw={700}>{symbol}{costs.avgPerTrip}</Text>
          </Paper>
          <Paper p="sm" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase">Avg per km</Text>
            <Text size="lg" fw={700}>{symbol}{costs.avgPerKm}</Text>
          </Paper>
        </SimpleGrid>

        <Text size="xs" c="dimmed">
          * Public charging rate estimated at 2.5x home rate. Actual costs may vary based on charging network and location.
        </Text>

        <Button onClick={onClose} fullWidth>
          Close
        </Button>
      </Stack>
    </Modal>
  );
}

export default CostCalculatorModal;
