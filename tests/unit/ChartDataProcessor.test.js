import { describe, it, expect } from 'vitest';
import { ChartDataProcessor } from '../../app/src/services/charts/ChartDataProcessor.js';
import { processRawRows } from '../../app/src/utils/dataParser.js';
import { HEADERS_KM, SMALL_EXPORT, row } from '../fixtures/rows.js';

const processor = new ChartDataProcessor();
const { data } = processRawRows(SMALL_EXPORT, HEADERS_KM);

describe('aggregateByPeriod', () => {
    it('fills calendar gaps with zero rows', () => {
        const months = processor.aggregateByPeriod(data, 'month');
        expect(months.map((m) => m.key)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']);
        expect(months[1]).toMatchObject({ trips: 0, distance: 0, consumption: 0, efficiency: null });
        expect(months[0].trips).toBe(4);
        expect(months[0].efficiency).toBeCloseTo((7.2 / 25.7) * 100, 0);
    });

    it('aggregates by ISO week and by day', () => {
        const weeks = processor.aggregateByPeriod(data, 'week');
        expect(weeks[0].key).toBe('2026-W03');
        expect(weeks.at(-1).key).toBe('2026-W27');
        const days = processor.aggregateByPeriod(data, 'day');
        expect(days).toHaveLength(172); // Jan 12 .. Jul 2 inclusive
        expect(days.filter((d) => d.trips > 0)).toHaveLength(4);
    });

    it('trims to maxPoints from the end', () => {
        expect(processor.aggregateByPeriod(data, 'day', 10)).toHaveLength(10);
    });

    it('returns an empty array when nothing has a timestamp', () => {
        expect(processor.aggregateByPeriod([{ startTs: null }], 'month')).toEqual([]);
    });
});

describe('efficiencyTrend', () => {
    it('drops implausible values and computes a rolling median', () => {
        const spiky = [
            ...data,
            ...processRawRows([row({ start: '2026-07-03, 08:00', end: '2026-07-03, 08:02', km: 0.5, kwh: 0.6 })], HEADERS_KM).data, // 120 kWh/100km
        ];
        const trend = processor.efficiencyTrend(spiky, 'km', 3);
        expect(trend).toHaveLength(8);
        expect(trend[0].rolling).toBeNull();
        expect(trend[2].rolling).toBeCloseTo(27.7, 0);
        expect(trend.every((p) => p.efficiency < 60)).toBe(true);
    });
});

describe('histograms', () => {
    it('bins efficiency in 2.5 steps and reports the median and outliers', () => {
        const { bins, median, outliers } = processor.efficiencyHistogram(data, 'km');
        expect(bins[0]).toMatchObject({ x0: 0, x1: 2.5, count: 0 });
        expect(bins.reduce((s, b) => s + b.count, 0)).toBe(8);
        expect(median).toBeGreaterThan(15);
        expect(outliers).toBe(0);
    });

    it('bins distance into human bands with shares', () => {
        const bands = processor.distanceHistogram(data, 'km');
        expect(bands.map((b) => b.label)).toEqual(['0–2 km', '2–5 km', '5–10 km', '10–20 km', '20–50 km', '50–100 km', '100–250 km', '250+ km']);
        expect(bands[2]).toMatchObject({ count: 8, share: 100 });
    });

    it('scales the distance bands for miles', () => {
        const bands = processor.distanceHistogram(data, 'mi');
        expect(bands[1].label).toBe('1.2–3.1 mi');
    });
});

describe('rhythm and battery', () => {
    it('builds a 7x24 heatmap with the max value', () => {
        const heat = processor.weekdayHourHeatmap(data, 'trips');
        expect(heat.cells).toHaveLength(168);
        expect(heat.max).toBe(1);
        const monday8 = heat.cells[0 * 24 + 8];
        expect(monday8.trips).toBe(1);
    });

    it('sums distance when asked', () => {
        const heat = processor.weekdayHourHeatmap(data, 'distance');
        expect(heat.cells.reduce((s, c) => s + c.value, 0)).toBeCloseTo(51.3, 0);
    });

    it('derives charge gained before each trip from consecutive SOC readings', () => {
        const soc = processor.socTimeline(data, 40);
        expect(soc).toHaveLength(8);
        expect(soc[0].charged).toBe(0);
        // Jan 13 08:03 starts at 90 after Jan 12 ended at 72 → +18
        expect(soc[2].charged).toBe(18);
    });

    it('limits the timeline to the last N trips', () => {
        expect(processor.socTimeline(data, 3)).toHaveLength(3);
        expect(processor.socTimeline(data, 3)[0].label).toBe('Jul 1, 17:05');
    });

    it('produces a sparkline series of the requested length', () => {
        const spark = processor.sparkline(data, 'distance', 'month', 3);
        expect(spark).toHaveLength(3);
        expect(spark.at(-1).value).toBeCloseTo(25.6, 0);
    });
});

describe('efficiencyVsDistance', () => {
    it('returns one point per plausible trip', () => {
        const points = processor.efficiencyVsDistance(data, 'km');
        expect(points).toHaveLength(8);
        expect(points[0]).toMatchObject({ id: 0, distance: 6.4 });
    });
});
