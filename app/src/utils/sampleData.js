import { processRawRows } from './dataParser';
import { formatJourneyDate } from './journeyDate';

/**
 * Deterministic synthetic journey log so visitors can explore the tool without
 * uploading anything. Modelled on a Gothenburg commuter with a Polestar 2
 * Long Range (≈79 kWh usable): seasonal efficiency swing, home/work clusters,
 * errands, a few long weekend drives and one road trip. Nothing here is real.
 */

// mulberry32 - tiny seeded PRNG so the sample is identical on every load
const mulberry32 = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const PLACES = {
    home: { name: 'Vasagatan 12, 411 24 Göteborg', lat: 57.6985, lng: 11.9670 },
    work: { name: 'Lindholmspiren 5, 417 56 Göteborg', lat: 57.7065, lng: 11.9385 },
    gym: { name: 'Skånegatan 20, 412 51 Göteborg', lat: 57.7010, lng: 11.9890 },
    grocery: { name: 'Backavägen 2, 417 05 Göteborg', lat: 57.7250, lng: 11.9640 },
    school: { name: 'Örgrytevägen 5, 412 51 Göteborg', lat: 57.6960, lng: 11.9910 },
    friends: { name: 'Kungsbackavägen 44, 434 30 Kungsbacka', lat: 57.4870, lng: 12.0760 },
    airport: { name: 'Landvetter Flygplats, 438 80 Landvetter', lat: 57.6688, lng: 12.2920 },
    cabin: { name: 'Fjällbacka Strandvägen 3, 457 40 Fjällbacka', lat: 58.5990, lng: 11.2870 },
    stockholm: { name: 'Sveavägen 10, 111 57 Stockholm', lat: 59.3350, lng: 18.0630 },
    malmo: { name: 'Stortorget 1, 211 22 Malmö', lat: 55.6060, lng: 13.0000 },
};

const ROUTE_KM = {
    'home-work': 6.4, 'home-gym': 2.1, 'home-grocery': 3.8, 'home-school': 2.6,
    'home-friends': 31, 'home-airport': 26, 'home-cabin': 152, 'home-stockholm': 470,
    'home-malmo': 275, 'work-grocery': 4.9, 'work-gym': 5.2, 'work-school': 4.4,
    'school-work': 4.4, 'gym-home': 2.1,
};

const kmBetween = (a, b) => ROUTE_KM[`${a}-${b}`] ?? ROUTE_KM[`${b}-${a}`] ?? 8;

// kWh/100km baseline by month for a Nordic climate (Jan..Dec)
const SEASON_EFF = [24.5, 23.5, 20.5, 18.5, 17, 16.2, 16, 16.4, 17.5, 19.5, 22, 24];

const USABLE_KWH = 79;

export const buildSampleJourneyLog = () => {
    const rand = mulberry32(20260904);
    const rows = [];

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 364);

    let odometer = 8420;
    let soc = 82;
    let lastPlace = 'home';

    const drive = (from, to, when, tempOffset = 0) => {
        const km = kmBetween(from, to) * (0.92 + rand() * 0.16);
        const distance = Math.round(km * 10) / 10;
        const month = when.getMonth();
        let eff = SEASON_EFF[month] + tempOffset + (rand() - 0.5) * 3;
        if (distance < 4) eff *= 1.35 + rand() * 0.4; // cold-start / short-hop penalty
        if (distance > 100) eff *= 1.08; // motorway speeds
        if (when.getHours() >= 7 && when.getHours() <= 9) eff *= 1.03;
        eff = Math.max(11, eff);
        const consumption = Math.round(((distance * eff) / 100) * 100) / 100;
        const socDrop = (consumption / USABLE_KWH) * 100;

        const avgSpeed = distance > 100 ? 95 : distance > 20 ? 62 : 28 + rand() * 10;
        const durationMin = Math.max(2, Math.round((distance / avgSpeed) * 60 + rand() * 4));
        const endTime = new Date(when.getTime() + durationMin * 60000);

        const socStart = Math.round(soc);
        soc = Math.max(4, soc - socDrop);
        const socEnd = Math.round(soc);

        const startOdo = Math.round(odometer);
        odometer += distance;

        rows.push({
            'Start Date': formatJourneyDate(when),
            'End Date': formatJourneyDate(endTime),
            'Start Address': PLACES[from].name,
            'End Address': PLACES[to].name,
            'Distance in KM': distance,
            'Consumption in Kwh': consumption,
            'Category': distance > 100 ? 'Private' : from === 'work' || to === 'work' ? 'Commute' : 'Private',
            'Start Latitude': PLACES[from].lat + (rand() - 0.5) * 0.0006,
            'Start Longitude': PLACES[from].lng + (rand() - 0.5) * 0.0006,
            'End Latitude': PLACES[to].lat + (rand() - 0.5) * 0.0006,
            'End Longitude': PLACES[to].lng + (rand() - 0.5) * 0.0006,
            'Start Odometer': startOdo,
            'End Odometer': Math.round(odometer),
            'Trip Type': 'SINGLE',
            'SOC Source': socStart,
            'SOC Destination': socEnd,
            'Comments': '',
        });
        lastPlace = to;
        return endTime;
    };

    const at = (day, h, m = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = new Date(d);
        const dow = day.getDay(); // 0 Sun .. 6 Sat
        const month = day.getMonth();

        // Overnight home charging (to 80 %, occasionally 90-100 % before long drives)
        if (lastPlace === 'home' && soc < 78 && rand() < 0.85) {
            soc = 80 + (rand() < 0.15 ? 10 + rand() * 10 : 0);
        }

        // Road trips: Stockholm in June, Malmö in September, cabin weekends in summer
        // Long drives include a DC fast-charge stop, so the arrival SOC is pinned by hand
        const longDrive = (from, to, when, arrivalSoc) => {
            soc = 100;
            drive(from, to, when);
            rows[rows.length - 1]['SOC Destination'] = arrivalSoc;
            soc = arrivalSoc;
        };
        if (month === 5 && day.getDate() === 14 && lastPlace === 'home') {
            longDrive('home', 'stockholm', at(day, 7, 40), 23);
            continue;
        }
        if (month === 5 && day.getDate() === 17 && lastPlace === 'stockholm') {
            longDrive('stockholm', 'home', at(day, 9, 10), 19);
            continue;
        }
        if (month === 8 && day.getDate() === 6 && lastPlace === 'home') {
            longDrive('home', 'malmo', at(day, 8, 5), 42);
            continue;
        }
        if (month === 8 && day.getDate() === 7 && lastPlace === 'malmo') {
            longDrive('malmo', 'home', at(day, 16, 30), 33);
            continue;
        }
        if (lastPlace === 'stockholm' || lastPlace === 'malmo') continue; // away for the weekend
        if ((month === 6 || month === 7) && dow === 5 && rand() < 0.5 && lastPlace === 'home') {
            soc = 100;
            drive('home', 'cabin', at(day, 16, 45));
            continue;
        }
        if (lastPlace === 'cabin') {
            if (dow === 0) {
                soc = Math.min(100, soc + 35); // slow charge at the cabin
                drive('cabin', 'home', at(day, 15, 20));
            }
            continue;
        }
        if (lastPlace !== 'home') {
            // stranded at work/gym overnight? drive home first thing
            drive(lastPlace, 'home', at(day, 7, 30));
        }

        const isWeekday = dow >= 1 && dow <= 5;
        const morningTemp = (month <= 1 || month === 11) ? 2.5 : 0; // cold cabin heat-up

        if (isWeekday && rand() < 0.86) {
            const leave = at(day, 7, 35 + Math.floor(rand() * 30));
            if (rand() < 0.35) {
                const t = drive('home', 'school', leave, morningTemp);
                drive('school', 'work', new Date(t.getTime() + (4 + rand() * 6) * 60000));
            } else {
                drive('home', 'work', leave, morningTemp);
            }

            if (rand() < 0.22) {
                const lunch = at(day, 12, Math.floor(rand() * 40));
                const t = drive('work', 'grocery', lunch);
                drive('grocery', 'work', new Date(t.getTime() + 25 * 60000));
            }

            const back = at(day, 16, 30 + Math.floor(rand() * 75));
            if (rand() < 0.3) {
                const t = drive('work', 'gym', back);
                drive('gym', 'home', new Date(t.getTime() + 65 * 60000));
            } else {
                drive('work', 'home', back);
            }
            if (rand() < 0.12) {
                const t = drive('home', 'grocery', at(day, 19, 15));
                drive('grocery', 'home', new Date(t.getTime() + 30 * 60000));
            }
        } else if (!isWeekday) {
            const r = rand();
            if (r < 0.35) {
                const t = drive('home', 'friends', at(day, 11, 10 + Math.floor(rand() * 50)));
                drive('friends', 'home', new Date(t.getTime() + (180 + rand() * 120) * 60000));
            } else if (r < 0.65) {
                const t = drive('home', 'grocery', at(day, 10, 30 + Math.floor(rand() * 30)));
                drive('grocery', 'home', new Date(t.getTime() + 40 * 60000));
            } else if (r < 0.72) {
                const t = drive('home', 'airport', at(day, 5, 50));
                drive('airport', 'home', new Date(t.getTime() + 35 * 60000));
            }
        } else if (rand() < 0.3) {
            const t = drive('home', 'gym', at(day, 18, 0));
            drive('gym', 'home', new Date(t.getTime() + 70 * 60000));
        }
    }

    // The real export is newest-first; mirror that so the parser path is identical
    rows.reverse();
    const headers = Object.keys(rows[0]);
    return processRawRows(rows, headers);
};
