import { describe, it, expect } from 'vitest';
import { StoryBuilder, describeDistance, describeEnergy } from '../../app/src/services/story/StoryBuilder.js';
import { InsightsCalculator } from '../../app/src/services/insights/InsightsCalculator.js';
import { processRawRows, calculateStatistics } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT } from '../fixtures/rows.js';

describe('describeDistance', () => {
    it('picks a reference people can picture', () => {
        expect(describeDistance(42)).toBe('about a marathon');
        expect(describeDistance(85)).toBe('about 2 marathons');
        expect(describeDistance(1000)).toBe('about Berlin to Rome');
        expect(describeDistance(41000)).toBe('once around the equator');
        expect(describeDistance(90000)).toBe('2.2 times around the equator');
        expect(describeDistance(0)).toBeNull();
    });
});

describe('describeEnergy', () => {
    it('scales from phone charges to months of household use', () => {
        expect(describeEnergy(3)).toMatch(/phone charges/);
        expect(describeEnergy(120)).toMatch(/10 days of a typical household/);
        expect(describeEnergy(1800)).toMatch(/5 months/);
    });
});

describe('StoryBuilder', () => {
    const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);
    const statistics = calculateStatistics(data, 'km');
    const insights = new InsightsCalculator('km').compute(data);
    const cards = new StoryBuilder({ distanceUnit: 'km', electricityRate: 0.2, currencySymbol: '€' }).build({ statistics, insights, data });

    it('always leads with distance, energy and cost', () => {
        expect(cards.slice(0, 3).map((c) => c.id)).toEqual(['distance', 'energy', 'cost']);
        expect(cards[0].figure).toBe(51);
        expect(cards[0].unit).toBe('km');
        expect(cards[1].headline).toMatch(/km per kWh/);
        expect(cards[2].figure).toBe('€2');
        expect(cards[2].body).toMatch(/€0.2\/kWh/);
    });

    it('skips cards whose inputs are not available', () => {
        const ids = cards.map((c) => c.id);
        expect(ids).not.toContain('range'); // battery estimate needs bigger SOC drops
        expect(ids).not.toContain('winter'); // fewer than five trips per season
        expect(ids).toContain('carbon');
        expect(ids).toContain('rhythm');
        expect(ids).toContain('tips');
    });

    it('ends with up to three tips', () => {
        const tips = cards.find((c) => c.id === 'tips');
        expect(tips.list.length).toBeGreaterThan(0);
        expect(tips.list.length).toBeLessThanOrEqual(3);
    });

    it('returns nothing for an empty journey', () => {
        expect(new StoryBuilder().build({ statistics: null, insights: null, data: [] })).toEqual([]);
    });
});
