/**
 * Price Discovery Screen — Mobile
 * Full feature parity with frontend/src/collector/PriceDiscovery.jsx
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import Svg, {
    Circle,
    Defs,
    Line as SVGLine,
    LinearGradient,
    Path,
    Stop,
} from 'react-native-svg';

import {
    DEFAULT_LOCATION,
    MATERIAL_CATEGORIES,
    getInstantValuation,
    getMarketPulse,
    getPriceTrends,
    getRecyclerRateBoard,
    refreshMarketPrices,
} from '../../../api/client';
import { BrandedHeader } from '../../components/branding/BrandedHeader';
import { useTranslation } from '../../../i18n/config';

/* =========================================================
   CONSTANTS
========================================================= */

const LOCATIONS = [
    'Bengaluru', 'Delhi', 'Mumbai', 'Hyderabad', 'Chennai',
    'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat',
    'Lucknow', 'Nagpur', 'Indore', 'Kochi', 'Coimbatore',
];

const BENCHMARK_HUBS = [
    { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai',   lat: 13.0827, lng: 80.2707 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Mumbai',    lat: 19.0760, lng: 72.8777 },
    { name: 'Pune',      lat: 18.5204, lng: 73.8567 },
    { name: 'Delhi',     lat: 28.6139, lng: 77.2090 },
    { name: 'Jaipur',    lat: 26.9124, lng: 75.7873 },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
    { name: 'Kolkata',   lat: 22.5726, lng: 88.3639 },
];

const SCREEN_W = Dimensions.get('window').width;
const CHART_H = 210;
const CHART_PAD_L = 8;
const CHART_PAD_R = 10;
const CHART_PAD_T = 12;
const CHART_PAD_B = 28;
const Y_LABEL_W = 46;

/* =========================================================
   TYPES
========================================================= */

type PriceTrend = {
    price_date: string;
    buying_price?: number | string;
    market_range_low?: number | null;
    market_range_high?: number | null;
};

type Analytics = {
    benchmark_rate?: number;
    recycler_quote_avg?: number;
    recycler_quote_median?: number;
    quote_observations_count?: number;
    completed_transaction_avg?: number;
};

type PriceCard = {
    market_benchmark?: number;
    unit_price?: number;
    market_range_low?: number;
    market_range_high?: number;
};

type RecyclerRow = {
    recycler_id?: number | string;
    name?: string;
    facility_location?: string;
    service_area?: string;
    offered_rate?: number | string;
    latitude?: number | string;
    longitude?: number | string;
    materials_accepted?: string[];
    pickup_availability?: string;
    rate_date?: string;
    distance?: number | null;
};

type PulseItem = {
    material_category: string;
    unit_price?: number;
    market_range?: string;
    regional_demand?: string;
    hub?: string;
};

/* =========================================================
   HELPERS
========================================================= */

function fmt(v?: number | string | null): string {
    if (v == null || v === '') return '\u2014';
    return `\u20B9${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
    if (!isFinite(lat1 + lon1 + lat2 + lon2)) return null;
    const R = 6371;
    const dL = ((lat2 - lat1) * Math.PI) / 180;
    const dN = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dL / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dN / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function trendStats(arr: PriceTrend[]) {
    if (!arr?.length) return null;
    const prices = arr.map(t => Number(t.buying_price)).filter(p => isFinite(p) && p > 0);
    if (!prices.length) return null;
    const first = prices[0], last = prices[prices.length - 1];
    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        latest: last,
        change: first ? ((last - first) / first) * 100 : null,
    };
}

/* =========================================================
   SVG LINE CHART
========================================================= */

function PriceLineChart({ trends, width, height }: { trends: PriceTrend[]; width: number; height: number }) {
    const pl = CHART_PAD_L, pr = CHART_PAD_R, pt = CHART_PAD_T, pb = CHART_PAD_B;
    const cw = width - pl - pr;
    const ch = height - pt - pb;
    const n = trends.length;

    const buyPrices = trends.map(t => Number(t.buying_price));
    const rangeLows  = trends.map(t => t.market_range_low  != null ? Number(t.market_range_low)  : null);
    const rangeHighs = trends.map(t => t.market_range_high != null ? Number(t.market_range_high) : null);
    const hasRange = rangeLows.some(v => v != null) && rangeHighs.some(v => v != null);

    const allVals = [
        ...buyPrices,
        ...(hasRange ? rangeLows.filter((v): v is number => v != null)  : []),
        ...(hasRange ? rangeHighs.filter((v): v is number => v != null) : []),
    ].filter(v => isFinite(v) && v > 0);

    if (!allVals.length) return null;

    const minV = Math.min(...allVals) * 0.97;
    const maxV = Math.max(...allVals) * 1.03;
    const span = maxV - minV || 1;

    const xOf = (i: number) => pl + (i / Math.max(n - 1, 1)) * cw;
    const yOf = (v: number) => pt + ch - ((v - minV) / span) * ch;

    const pts = buyPrices.map((p, i) => ({ x: xOf(i), y: yOf(p) }));
    let linePath = '';
    pts.forEach((p, i) => {
        if (i === 0) {
            linePath += `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        } else {
            const cpx = ((pts[i - 1].x + p.x) / 2).toFixed(1);
            linePath += ` C${cpx},${pts[i-1].y.toFixed(1)} ${cpx},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        }
    });

    const bottom = (pt + ch).toFixed(1);
    const areaPath = linePath
        + ` L${pts[pts.length-1].x.toFixed(1)},${bottom}`
        + ` L${pts[0].x.toFixed(1)},${bottom} Z`;

    let bandPath = '';
    if (hasRange) {
        const topPts: {x:number;y:number}[] = [];
        const botPts: {x:number;y:number}[] = [];
        for (let i = 0; i < n; i++) {
            const lo = rangeLows[i], hi = rangeHighs[i];
            if (lo != null && hi != null) {
                topPts.push({ x: xOf(i), y: yOf(hi) });
                botPts.push({ x: xOf(i), y: yOf(lo) });
            }
        }
        if (topPts.length > 1) {
            const top = topPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            const bot = [...botPts].reverse().map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            bandPath = top + ' ' + bot + ' Z';
        }
    }

    const TICKS = 4;
    const gridYs: number[] = [];
    for (let i = 0; i <= TICKS; i++) gridYs.push(yOf(minV + (span * i) / TICKS));

    const lastPt = pts[pts.length - 1];
    const rightEdge = (width - pr).toFixed(1);

    return (
        <Svg width={width} height={height}>
            <Defs>
                <LinearGradient id="pdAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.20} />
                    <Stop offset="100%" stopColor="#7c3aed" stopOpacity={0.01} />
                </LinearGradient>
                <LinearGradient id="pdBandGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%"   stopColor="#a78bfa" stopOpacity={0.18} />
                    <Stop offset="100%" stopColor="#a78bfa" stopOpacity={0.04} />
                </LinearGradient>
            </Defs>

            {gridYs.map((y, i) => (
                <SVGLine
                    key={i}
                    x1={pl} y1={y.toFixed(1)}
                    x2={rightEdge} y2={y.toFixed(1)}
                    stroke="rgba(124,58,237,0.07)"
                    strokeWidth={1}
                />
            ))}

            {bandPath !== '' && <Path d={bandPath} fill="url(#pdBandGrad)" />}
            <Path d={areaPath} fill="url(#pdAreaGrad)" />
            <Path d={linePath} stroke="#7c3aed" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {lastPt && (
                <>
                    <Circle cx={lastPt.x.toFixed(1)} cy={lastPt.y.toFixed(1)} r={9}   fill="rgba(124,58,237,0.15)" />
                    <Circle cx={lastPt.x.toFixed(1)} cy={lastPt.y.toFixed(1)} r={5}   fill="#7c3aed" />
                    <Circle cx={lastPt.x.toFixed(1)} cy={lastPt.y.toFixed(1)} r={2.5} fill="#fff" />
                </>
            )}
        </Svg>
    );
}

function YLabels({ trends, height }: { trends: PriceTrend[]; height: number }) {
    const prices = trends.map(t => Number(t.buying_price)).filter(p => isFinite(p) && p > 0);
    if (!prices.length) return null;
    const minV = Math.min(...prices) * 0.97;
    const maxV = Math.max(...prices) * 1.03;
    const span = maxV - minV || 1;
    const ch = height - CHART_PAD_T - CHART_PAD_B;
    const TICKS = 4;
    const labels = Array.from({ length: TICKS + 1 }, (_, i) => ({
        val: minV + (span * i) / TICKS,
        y: CHART_PAD_T + ch - (i / TICKS) * ch,
    }));
    return (
        <View style={{ position: 'absolute', left: 0, top: 0, width: Y_LABEL_W, height }}>
            {labels.map((l, i) => (
                <Text key={i} style={{ position: 'absolute', top: l.y - 7, right: 4, fontSize: 9, color: '#64748b', fontWeight: '500' }}>
                    {`\u20B9${Math.round(l.val)}`}
                </Text>
            ))}
        </View>
    );
}

function XLabels({ trends, svgWidth }: { trends: PriceTrend[]; svgWidth: number }) {
    const n = trends.length;
    const cw = svgWidth - CHART_PAD_L - CHART_PAD_R;
    const MAX_X = Math.min(6, n);
    const labels = Array.from({ length: MAX_X }, (_, i) => {
        const idx = Math.round((i / Math.max(MAX_X - 1, 1)) * (n - 1));
        const d = trends[idx];
        if (!d) return null;
        return {
            x: CHART_PAD_L + (idx / Math.max(n - 1, 1)) * cw,
            label: new Date(d.price_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        };
    }).filter(Boolean) as { x: number; label: string }[];
    return (
        <View style={{ position: 'relative', height: 20, marginTop: 2 }}>
            {labels.map((l, i) => (
                <Text key={i} style={{ position: 'absolute', left: Y_LABEL_W + l.x - 16, fontSize: 9, color: '#64748b', width: 32, textAlign: 'center' }}>
                    {l.label}
                </Text>
            ))}
        </View>
    );
}

/* =========================================================
   SUB-COMPONENTS
========================================================= */

function Chip({ label, value, accent, up }: { label: string; value: string; accent?: boolean; up?: boolean }) {
    return (
        <View style={[S.chip2, accent && S.chip2Accent, up === true && S.chip2Up]}>
            <Text style={S.chipLabel}>{label}</Text>
            <Text style={[S.chipValue, accent === true && S.chipValueAccent, up === true && S.chipValueUp]}>{value}</Text>
        </View>
    );
}

function Mini({ label, value, accent, up, down }: { label: string; value: string; accent?: boolean; up?: boolean; down?: boolean }) {
    return (
        <View style={S.mini}>
            <Text style={S.miniLabel}>{label}</Text>
            <Text style={[S.miniValue, accent === true && { color: '#7c3aed' }, up === true && { color: '#16a34a' }, down === true && { color: '#dc2626' }]}>
                {value}
            </Text>
        </View>
    );
}

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function PriceDiscoveryScreen() {
    const { t, lang } = useTranslation();

    const [category, setCategory] = useState(MATERIAL_CATEGORIES[2].id);
    const [location, setLocation] = useState(DEFAULT_LOCATION);
    const [days, setDays] = useState(90);

    const [trends,     setTrends]     = useState<PriceTrend[]>([]);
    const [analytics,  setAnalytics]  = useState<Analytics | null>(null);
    const [rateRows,   setRateRows]   = useState<RecyclerRow[]>([]);
    const [priceCards, setPriceCards] = useState<Record<string, PriceCard>>({});
    const [pulse,      setPulse]      = useState<PulseItem[] | null>(null);
    const [search,     setSearch]     = useState('');
    const [showTable,  setShowTable]  = useState(false);

    const [loadingTrend, setLoadingTrend] = useState(true);
    const [loadingRec,   setLoadingRec]   = useState(true);
    const [loadingCards, setLoadingCards] = useState(true);
    const [syncing,      setSyncing]      = useState(false);
    const [gpsLoading,   setGpsLoading]   = useState(false);
    const [refreshing,   setRefreshing]   = useState(false);
    const [error,        setError]        = useState('');
    const [gpsError,     setGpsError]     = useState('');
    const [syncToast,    setSyncToast]    = useState('');
    const [speaking,     setSpeaking]     = useState(false);

    const [userCoords, setUserCoords] = useState<{
        lat: number; lng: number; closestHub: string; distanceToHub: number;
    } | null>(null);

    const stats     = useMemo(() => trendStats(trends), [trends]);
    const rawCat    = MATERIAL_CATEGORIES.find(c => c.id === category);
    const catLabel  = t(`materials.${category}`) || rawCat?.label || category;
    const card      = priceCards[category];
    const benchmark = card?.market_benchmark ?? analytics?.benchmark_rate ?? stats?.latest;
    const pulseItem = pulse?.find(p => p.material_category === category) ?? null;
    const chartSvgW = SCREEN_W - 36 - Y_LABEL_W;

    const filtered = useMemo(() => {
        const catMatch = (mats: string[]) => {
            if (mats.includes(category)) return true;
            if (category === 'Plastic' && mats.some(m => m.includes('Plastic'))) return true;
            if (category === 'Motor'   && mats.some(m => m.includes('Motor')))   return true;
            if (category === 'LCD'     && mats.some(m => m.includes('LCD')))     return true;
            return false;
        };
        return [...rateRows]
            .filter(r => catMatch(r.materials_accepted || []))
            .map(r => ({
                ...r,
                distance: userCoords
                    ? distKm(userCoords.lat, userCoords.lng, Number(r.latitude), Number(r.longitude))
                    : null,
            }))
            .filter(r => {
                if (!search.trim()) return true;
                const q = search.toLowerCase();
                return (r.name || '').toLowerCase().includes(q) ||
                    (r.facility_location || r.service_area || '').toLowerCase().includes(q);
            })
            .sort((a, b) =>
                userCoords && a.distance != null && b.distance != null
                    ? a.distance - b.distance
                    : Number(b.offered_rate || 0) - Number(a.offered_rate || 0),
            );
    }, [rateRows, category, search, userCoords]);

    const rateAsOf = rateRows.reduce<string | null>(
        (best, r) => r.rate_date && (!best || r.rate_date > best) ? r.rate_date : best, null,
    );

    const loadCards = useCallback(() => {
        setLoadingCards(true);
        Promise.allSettled(
            MATERIAL_CATEGORIES.map(cat =>
                (getInstantValuation as any)({ category: cat.id, location, weight: 1 })
                    .then((r: any) => ({ id: cat.id, data: r?.data ?? r }))
                    .catch(() => ({ id: cat.id, data: null })),
            ),
        ).then(results => {
            const map: Record<string, PriceCard> = {};
            results.forEach(r => {
                if (r.status === 'fulfilled' && r.value.data) map[r.value.id] = r.value.data;
            });
            setPriceCards(map);
        }).finally(() => setLoadingCards(false));
    }, [location]);

    const fetchTrends = useCallback(() => {
        setLoadingTrend(true);
        setError('');
        (getPriceTrends as any)({ category, location, days })
            .then((r: any) => {
                setTrends(Array.isArray(r?.data) ? r.data : []);
                setAnalytics(r?.analytics ?? null);
            })
            .catch(() => { setTrends([]); setError(t('prices.loadError')); })
            .finally(() => setLoadingTrend(false));
    }, [category, location, days, t]);

    const fetchRates = useCallback(() => {
        setLoadingRec(true);
        (getRecyclerRateBoard as any)({ category, location })
            .then((r: any) => setRateRows(Array.isArray(r?.data) ? r.data : []))
            .catch(() => setRateRows([]))
            .finally(() => setLoadingRec(false));
    }, [category, location]);

    const fetchPulse = useCallback(() => {
        (getMarketPulse as any)(location)
            .then((r: any) => setPulse(Array.isArray(r?.pulse) ? r.pulse : null))
            .catch(() => {});
    }, [location]);

    useEffect(() => { loadCards();   }, [loadCards]);
    useEffect(() => { fetchTrends(); }, [fetchTrends]);
    useEffect(() => { fetchRates();  }, [fetchRates]);
    useEffect(() => { fetchPulse();  }, [fetchPulse]);

    async function onRefresh() {
        setRefreshing(true);
        await Promise.allSettled([fetchTrends(), fetchRates(), loadCards()]);
        fetchPulse();
        setRefreshing(false);
    }

    async function onSync() {
        setSyncing(true);
        setSyncToast('');
        setError('');
        try {
            await (refreshMarketPrices as any)(days);
            setSyncToast('Market rates synchronized with live commodity scrap indices.');
            fetchTrends(); loadCards(); fetchRates(); fetchPulse();
            setTimeout(() => setSyncToast(''), 4000);
        } catch {
            setError('Could not refresh market prices. Using cached indexes.');
        } finally {
            setSyncing(false);
        }
    }

    async function onGPS() {
        setGpsLoading(true);
        setGpsError('');
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { setGpsError('Location access denied.'); return; }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude: lat, longitude: lng } = pos.coords;
            let best = 'Bengaluru', minD = Infinity;
            for (const h of BENCHMARK_HUBS) {
                const d = distKm(lat, lng, h.lat, h.lng);
                if (d != null && d < minD) { minD = d; best = h.name; }
            }
            setUserCoords({ lat, lng, closestHub: best, distanceToHub: minD });
            setLocation(best);
        } catch {
            setGpsError('Failed to get location. Pick a city manually.');
        } finally {
            setGpsLoading(false);
        }
    }

    function onSpeak() {
        if (speaking) { Speech.stop(); setSpeaking(false); return; }
        const price = benchmark;
        let txt = price
            ? `Current ${catLabel} price in ${location} is Rupees ${Math.round(price)} per kilogram.`
            : `No price data available for ${catLabel} in ${location}.`;
        if (price && stats?.change != null && Math.abs(stats.change) > 0.01) {
            const ch = Math.abs(stats.change).toFixed(1);
            txt += stats.change > 0
                ? ` Price has increased by ${ch} percent over the last ${days} days.`
                : ` Price has decreased by ${ch} percent over the last ${days} days.`;
        }
        const langMap: Record<string, string> = {
            en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN', mr: 'mr-IN',
            ta: 'ta-IN', te: 'te-IN', ml: 'ml-IN', bn: 'bn-IN',
        };
        setSpeaking(true);
        Speech.speak(txt, {
            language: langMap[lang] || 'en-IN',
            rate: 0.9,
            onDone:    () => setSpeaking(false),
            onError:   () => setSpeaking(false),
            onStopped: () => setSpeaking(false),
        });
    }

    return (
        <ScrollView
            style={S.screen}
            contentContainerStyle={S.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        >
            {/* Header */}
            <BrandedHeader
                title={t('priceDiscovery.title')}
                subtitle={t('priceDiscovery.subtitle')}
                rightElement={
                    <Pressable style={[S.syncBtn, syncing && S.disabled]} onPress={onSync} disabled={syncing}>
                        {syncing
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={S.syncBtnTxt}>{'🔄 '}{t('priceDiscovery.syncLiveMarket')}</Text>
                        }
                    </Pressable>
                }
            />

            {!!syncToast && (
                <View style={S.toastGreen}>
                    <Text style={S.toastGreenTxt}>{'✅  '}{syncToast}</Text>
                </View>
            )}
            {!!error && (
                <View style={S.toastWarn}>
                    <Text style={S.toastWarnTxt}>{'⚠️  '}{error}</Text>
                </View>
            )}

            {/* Live Pulse Banner */}
            {pulseItem != null && (
                <View style={S.pulse}>
                    <View style={S.pulseL}>
                        <View style={S.liveDot} />
                        <Text style={S.liveTxt}>{t('priceDiscovery.liveCommodityIndex')}</Text>
                    </View>
                    <View style={S.pulseM}>
                        <Text style={S.pulseCat}>{catLabel}{' '}{t('priceDiscovery.benchmark')}:</Text>
                        <Text style={S.pulsePrice}>{fmt(benchmark)}/kg</Text>
                    </View>
                    <View style={S.pulseR}>
                        {pulseItem.regional_demand != null && (
                            <View style={S.demandBadge}>
                                <Text style={S.demandTxt}>{t('priceDiscovery.demand')}: {pulseItem.regional_demand}</Text>
                            </View>
                        )}
                        {pulseItem.hub != null && (
                            <View style={S.hubBadge}>
                                <Text style={S.hubTxt}>{pulseItem.hub}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Location Controls */}
            <View style={S.block}>
                <View style={S.controlRow}>
                    <Text style={S.ctrlLabel}>{t('prices.location')}</Text>
                    <Pressable style={[S.gpsBtn, gpsLoading && S.disabled]} onPress={onGPS} disabled={gpsLoading}>
                        <Text style={S.gpsTxt}>{gpsLoading ? t('priceDiscovery.locating') : t('priceDiscovery.useGps')}</Text>
                    </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {LOCATIONS.map(loc => (
                        <Pressable
                            key={loc}
                            style={[S.chip, location === loc && S.chipOn]}
                            onPress={() => { setLocation(loc); setUserCoords(null); setGpsError(''); }}
                        >
                            <Text style={[S.chipTxt, location === loc && S.chipTxtOn]}>{loc}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
                {userCoords != null && (
                    <Text style={S.gpsNote}>
                        {'📍 GPS '}{userCoords.lat.toFixed(4)}{', '}{userCoords.lng.toFixed(4)}
                        {'  ('}{userCoords.distanceToHub.toFixed(1)}{' km to '}{userCoords.closestHub}{' hub)'}
                    </Text>
                )}
                {!!gpsError && <Text style={S.gpsErr}>{'⚠️  '}{gpsError}</Text>}
            </View>

            {/* Days Controls */}
            <View style={S.daysRow}>
                <Text style={S.ctrlLabel}>{t('prices.days')}</Text>
                <View style={S.dayTabs}>
                    {([30, 60, 90] as const).map(d => (
                        <Pressable key={d} style={[S.dayTab, days === d && S.dayTabOn]} onPress={() => setDays(d)}>
                            <Text style={[S.dayTabTxt, days === d && S.dayTabTxtOn]}>
                                {d === 30 ? t('prices.day30') : d === 60 ? t('prices.day60') : t('prices.day90')}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Section 1: Current Market Rates */}
            <View style={S.secRow}>
                <Text style={S.secTitle}>{t('priceDiscovery.regionalPrices')}</Text>
                <Text style={S.secSub}>{location}{' · '}{t('prices.buyingPrice').toLowerCase()}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.cardScroll}>
                {MATERIAL_CATEGORIES.map(cat => {
                    const c = priceCards[cat.id];
                    const on = category === cat.id;
                    return (
                        <Pressable key={cat.id} style={[S.matCard, on && S.matCardOn]} onPress={() => setCategory(cat.id)}>
                            <Text style={S.matIcon}>{cat.icon}</Text>
                            <Text style={[S.matName, on && S.matNameOn]} numberOfLines={1}>
                                {t(`materials.${cat.id}`) || cat.label}
                            </Text>
                            {loadingCards
                                ? <ActivityIndicator size="small" color="#7c3aed" style={{ marginTop: 4 }} />
                                : (
                                    <>
                                        <View style={S.matRow}>
                                            <Text style={S.matRowLbl} numberOfLines={1}>{t('priceDiscovery.currentMarketBenchmark')}</Text>
                                            <Text style={[S.matPrice, on && S.matPriceOn]}>
                                                {c != null ? fmt(c.market_benchmark ?? c.unit_price) : '\u2014'}/kg
                                            </Text>
                                        </View>
                                        {c?.market_range_low != null && c?.market_range_high != null && (
                                            <View style={S.matRow}>
                                                <Text style={S.matRowLbl}>{t('priceDiscovery.marketRange')}</Text>
                                                <Text style={S.matRange}>{fmt(c.market_range_low)}{'\u2013'}{fmt(c.market_range_high)}</Text>
                                            </View>
                                        )}
                                    </>
                                )
                            }
                            {on && <View style={S.matActiveLine} />}
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Section 2: Hero + Category tabs + Speak */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabsScroll}>
                {MATERIAL_CATEGORIES.map(cat => (
                    <Pressable key={cat.id} style={[S.catTab, category === cat.id && S.catTabOn]} onPress={() => setCategory(cat.id)}>
                        <Text style={S.catTabIcon}>{cat.icon}</Text>
                        <Text style={[S.catTabTxt, category === cat.id && S.catTabTxtOn]}>
                            {t(`materials.${cat.id}`) || cat.label}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>

            <View style={S.hero}>
                <View style={{ flex: 1 }}>
                    <Text style={S.heroKicker}>{t('priceDiscovery.currentMarketBenchmark')}</Text>
                    <Text style={S.heroCatLoc}>{catLabel}{' · '}{location}</Text>
                    <View style={S.heroPriceRow}>
                        {loadingTrend
                            ? <ActivityIndicator color="#7c3aed" />
                            : (
                                <>
                                    <Text style={S.heroPrice}>{benchmark != null ? fmt(benchmark) : '\u2014'}</Text>
                                    {benchmark != null && <Text style={S.heroUnit}>{' / kg'}</Text>}
                                </>
                            )
                        }
                    </View>
                    <Text style={S.heroDesc}>{t('priceDiscovery.heroDesc')}</Text>
                    {stats?.change != null && (
                        <Text style={[S.chg, stats.change >= 0 ? S.chgUp : S.chgDown]}>
                            {stats.change >= 0 ? '\u25B2' : '\u25BC'}{' '}{Math.abs(stats.change).toFixed(1)}{'% vs '}{days}{'d ago'}
                        </Text>
                    )}
                </View>
                <Pressable style={[S.speakBtn, speaking && S.speakBtnOn]} onPress={onSpeak}>
                    <Text style={S.speakIcon}>{speaking ? '\uD83D\uDD0A' : '\uD83D\uDD09'}</Text>
                    <Text style={[S.speakTxt, speaking && S.speakTxtOn]}>
                        {speaking ? t('priceDiscovery.stopAudio') : t('priceDiscovery.speakPrice')}
                    </Text>
                </Pressable>
            </View>

            {/* Section 3: Trend Chart */}
            <View style={S.card}>
                <View style={S.chartHdr}>
                    <Text style={S.secTitle}>{t('prices.trendChart')}{' \u2014 '}{catLabel}</Text>
                    <Text style={S.secSub}>{days}{' '}{t('prices.days')}{' · '}{location}</Text>
                </View>

                {analytics != null && !loadingTrend && (
                    <View style={S.analyticsBox}>
                        <Text style={S.analyticsTitle}>
                            {'📊 '}{t('priceDiscovery.marketIntelligence', { location })}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={S.chipsRow}>
                                <Chip label={t('priceDiscovery.marketBenchmark')} value={`${fmt(benchmark)}/kg`} accent />
                                {analytics.recycler_quote_avg != null && (
                                    <Chip label={t('priceDiscovery.quotedMarketAvg')} value={`${fmt(analytics.recycler_quote_avg)}/kg`} />
                                )}
                                {analytics.recycler_quote_median != null && (
                                    <Chip label={t('priceDiscovery.medianQuote')} value={`${fmt(analytics.recycler_quote_median)}/kg`} />
                                )}
                                {analytics.quote_observations_count != null && (
                                    <Chip label={t('priceDiscovery.quoteObservations')} value={String(analytics.quote_observations_count)} />
                                )}
                                {analytics.completed_transaction_avg != null && (
                                    <Chip label={t('priceDiscovery.realizedSaleAvg')} value={`${fmt(analytics.completed_transaction_avg)}/kg`} up />
                                )}
                            </View>
                        </ScrollView>
                    </View>
                )}

                {stats != null && !loadingTrend && (
                    <View style={S.statsRow}>
                        <Mini label={t('prices.min')}    value={fmt(stats.min)} />
                        <Mini label={t('prices.avg')}    value={fmt(stats.avg)} accent />
                        <Mini label={t('prices.max')}    value={fmt(stats.max)} />
                        <Mini label={t('prices.latest')} value={fmt(stats.latest)} />
                        {stats.change != null && (
                            <Mini
                                label={t('prices.change')}
                                value={`${stats.change >= 0 ? '+' : ''}${stats.change.toFixed(1)}%`}
                                up={stats.change >= 0}
                                down={stats.change < 0}
                            />
                        )}
                    </View>
                )}

                {loadingTrend ? (
                    <View style={S.loader}>
                        <ActivityIndicator size="large" color="#7c3aed" />
                        <Text style={S.loaderTxt}>Loading chart...</Text>
                    </View>
                ) : trends.length === 0 ? (
                    <View style={S.empty}>
                        <Text style={S.emptyTxt}>{t('prices.noTrendData')}</Text>
                    </View>
                ) : (
                    <>
                        <View style={[S.chartWrap, { height: CHART_H }]}>
                            <YLabels trends={trends} height={CHART_H} />
                            <View style={{ marginLeft: Y_LABEL_W }}>
                                <PriceLineChart trends={trends} width={chartSvgW} height={CHART_H} />
                            </View>
                        </View>
                        <XLabels trends={trends} svgWidth={chartSvgW} />
                    </>
                )}

                {trends.length > 0 && !loadingTrend && (
                    <View style={S.progressBox}>
                        <Text style={S.progressTitle}>
                            {'📈 '}{t('priceDiscovery.historicalProgression', { days: String(days) })}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={S.progressRow}>
                                {trends.slice(-6).map((item, i, arr) => (
                                    <View key={item.price_date || i} style={S.progressItem}>
                                        <Text style={S.progressPrice}>{`\u20B9${Math.round(Number(item.buying_price))}`}</Text>
                                        {i < arr.length - 1 && <Text style={S.progressArrow}>{' \u2192 '}</Text>}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}

                {trends.length > 0 && !loadingTrend && (
                    <>
                        <Pressable style={S.toggleBtn} onPress={() => setShowTable(v => !v)}>
                            <Text style={S.toggleTxt}>
                                {showTable ? '\u25B2 Hide' : '\u25BC Show'}{' '}{t('prices.trendChartDesc')}{' ('}{trends.length}{' '}{t('prices.dataPoints')}{')'}
                            </Text>
                        </Pressable>
                        {showTable && (
                            <ScrollView horizontal showsHorizontalScrollIndicator>
                                <View>
                                    <View style={[S.tr, S.tHdr]}>
                                        <Text style={[S.td, S.tHdrTxt, { width: 80 }]}>{t('dashboard.date')}</Text>
                                        <Text style={[S.td, S.tHdrTxt, { width: 80 }]}>{t('prices.location')}</Text>
                                        <Text style={[S.td, S.tHdrTxt, { width: 90 }]}>{t('prices.buyingPrice')}</Text>
                                        <Text style={[S.td, S.tHdrTxt, { width: 90 }]}>{t('prices.min')}</Text>
                                        <Text style={[S.td, S.tHdrTxt, { width: 90 }]}>{t('prices.max')}</Text>
                                    </View>
                                    {[...trends].reverse().slice(0, 30).map((item, i) => (
                                        <View key={i} style={[S.tr, i % 2 === 0 && S.trAlt]}>
                                            <Text style={[S.td, { width: 80 }]}>{new Date(item.price_date).toLocaleDateString('en-IN')}</Text>
                                            <Text style={[S.td, { width: 80 }]}>{location}</Text>
                                            <Text style={[S.td, { width: 90, color: '#7c3aed', fontWeight: '700' }]}>{fmt(item.buying_price)}/kg</Text>
                                            <Text style={[S.td, { width: 90 }]}>{fmt(item.market_range_low)}</Text>
                                            <Text style={[S.td, { width: 90 }]}>{fmt(item.market_range_high)}</Text>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        )}
                    </>
                )}
            </View>

            {/* Section 4: Recycler Rates */}
            <View style={S.card}>
                <Text style={S.secTitle}>{t('prices.recyclerRates')}{' \u2014 '}{catLabel}</Text>
                <Text style={S.secSub2}>{t('prices.currentRatesDesc')}</Text>
                {rateAsOf != null && <Text style={S.rateAsOf}>{t('prices.rateAsOf', { date: rateAsOf })}</Text>}

                <View style={S.searchBox}>
                    <Text style={S.searchIcon}>{'🔍'}</Text>
                    <TextInput
                        style={S.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t('priceDiscovery.filterRecyclersPlaceholder')}
                        placeholderTextColor="#9ca3af"
                    />
                    {!!search && (
                        <Pressable onPress={() => setSearch('')} style={S.clearX}>
                            <Text style={S.clearXTxt}>{'\u2715'}</Text>
                        </Pressable>
                    )}
                </View>
                {!!search.trim() && (
                    <Text style={S.rateCount}>
                        {t('priceDiscovery.showingRecyclers', {
                            count: String(filtered.length),
                            total: String(rateRows.filter(r => (r.materials_accepted || []).includes(category)).length),
                        })}
                    </Text>
                )}

                {loadingRec ? (
                    <View style={S.loader}>
                        <ActivityIndicator size="large" color="#7c3aed" />
                        <Text style={S.loaderTxt}>Loading rates...</Text>
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={S.empty}>
                        <Text style={S.emptyTxt}>
                            {search ? t('priceDiscovery.noRecyclersMatch', { search }) : t('prices.noRecyclers')}
                        </Text>
                        {!!search && (
                            <Pressable style={S.clearFilterBtn} onPress={() => setSearch('')}>
                                <Text style={S.clearFilterTxt}>{t('priceDiscovery.clearFilter')}</Text>
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                        <View>
                            <View style={[S.tr, S.tHdr]}>
                                <Text style={[S.td, S.tHdrTxt, { width: 150 }]}>{t('prices.recyclerName')}</Text>
                                <Text style={[S.td, S.tHdrTxt, { width: 120 }]}>{t('prices.location')}</Text>
                                {userCoords != null && <Text style={[S.td, S.tHdrTxt, { width: 80 }]}>{t('priceDiscovery.distance')}</Text>}
                                <Text style={[S.td, S.tHdrTxt, { width: 100 }]}>{t('prices.offered')}</Text>
                                <Text style={[S.td, S.tHdrTxt, { width: 70 }]}>{t('prices.pickup')}</Text>
                                <Text style={[S.td, S.tHdrTxt, { width: 90 }]}>{'vs '}{t('prices.buyingPrice')}</Text>
                            </View>
                            {filtered.map((r, i) => {
                                const mktPrice = priceCards[category]?.unit_price;
                                const vsMkt = mktPrice != null && r.offered_rate != null
                                    ? ((Number(r.offered_rate) - mktPrice) / mktPrice * 100).toFixed(1)
                                    : null;
                                const isDaily = r.pickup_availability === 'daily';
                                return (
                                    <View key={String(r.recycler_id ?? i)} style={[S.tr, i % 2 === 0 && S.trAlt]}>
                                        <View style={[S.td, { width: 150 }]}>
                                            <View style={S.nameRow}>
                                                {i === 0 && r.offered_rate != null && (
                                                    <View style={S.bestBadge}>
                                                        <Text style={S.bestTxt}>{'\u2605'}</Text>
                                                    </View>
                                                )}
                                                <Text style={S.rName} numberOfLines={1}>
                                                    {r.name ?? `Recycler ${i + 1}`}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[S.td, S.muted, { width: 120 }]} numberOfLines={1}>
                                            {r.facility_location ?? r.service_area ?? '\u2014'}
                                        </Text>
                                        {userCoords != null && (
                                            <Text style={[S.td, { width: 80, color: '#7c3aed', fontWeight: '500' }]}>
                                                {r.distance != null ? `📍 ${r.distance} km` : '\u2014'}
                                            </Text>
                                        )}
                                        <Text style={[S.td, { width: 100, color: '#d97706', fontWeight: '700' }]}>
                                            {r.offered_rate != null ? `${fmt(r.offered_rate)}/kg` : '\u2014'}
                                        </Text>
                                        <Text style={[S.td, { width: 70, color: isDaily ? '#16a34a' : '#9ca3af' }]}>
                                            {isDaily ? `\u2713 ${t('prices.yes')}` : `\u2717 ${t('prices.no')}`}
                                        </Text>
                                        <View style={[S.td, { width: 90 }]}>
                                            {vsMkt != null ? (
                                                <View style={[S.vsBadge, Number(vsMkt) >= 0 ? S.vsUp : S.vsDn]}>
                                                    <Text style={[S.vsTxt, Number(vsMkt) >= 0 ? S.vsTxtUp : S.vsTxtDn]}>
                                                        {Number(vsMkt) >= 0 ? '+' : ''}{vsMkt}{'%'}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={S.muted}>{'\u2014'}</Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}
            </View>

            <View style={{ height: 60 }} />
        </ScrollView>
    );
}

/* =========================================================
   STYLES
========================================================= */

const P = '#7c3aed', PL = '#ede9fe', PBG = '#f5f3ff';
const T = '#0f172a', M = '#64748b', B = '#e2e8f0', BG = '#f8fafc';

const S = StyleSheet.create({
    screen: { flex: 1, backgroundColor: BG },
    container: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 40 },
    syncBtn: { backgroundColor: P, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
    syncBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    disabled: { opacity: 0.55 },
    toastGreen: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 12, marginBottom: 10 },
    toastGreenTxt: { color: '#15803d', fontSize: 13, fontWeight: '600' },
    toastWarn: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 10, padding: 12, marginBottom: 10 },
    toastWarnTxt: { color: '#b45309', fontSize: 13, fontWeight: '500' },
    pulse: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, backgroundColor: PBG, borderWidth: 1, borderColor: '#c4b5fd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
    pulseL: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
    liveTxt: { fontSize: 10, fontWeight: '700', color: '#10b981', letterSpacing: 0.5, textTransform: 'uppercase' },
    pulseM: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    pulseCat: { fontSize: 13, fontWeight: '600', color: T },
    pulsePrice: { fontSize: 15, fontWeight: '800', color: P },
    pulseR: { flexDirection: 'row', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' },
    demandBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    demandTxt: { fontSize: 10, fontWeight: '600', color: '#15803d' },
    hubBadge: { backgroundColor: PL, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    hubTxt: { fontSize: 10, fontWeight: '600', color: P },
    block: { marginBottom: 12 },
    controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    ctrlLabel: { fontSize: 12, fontWeight: '700', color: M, textTransform: 'uppercase', letterSpacing: 0.4 },
    gpsBtn: { backgroundColor: PL, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    gpsTxt: { color: P, fontSize: 12, fontWeight: '600' },
    gpsNote: { fontSize: 10, color: M, marginTop: 4, fontStyle: 'italic' },
    gpsErr: { fontSize: 11, color: '#dc2626', marginTop: 4 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: B, backgroundColor: '#fff', marginRight: 8 },
    chipOn: { backgroundColor: P, borderColor: P },
    chipTxt: { fontSize: 12, fontWeight: '500', color: M },
    chipTxtOn: { color: '#fff', fontWeight: '700' },
    daysRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
    dayTabs: { flexDirection: 'row', gap: 6 },
    dayTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: B, backgroundColor: '#fff' },
    dayTabOn: { backgroundColor: P, borderColor: P },
    dayTabTxt: { fontSize: 12, fontWeight: '600', color: M },
    dayTabTxtOn: { color: '#fff' },
    secRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
    secTitle: { fontSize: 16, fontWeight: '700', color: T },
    secSub: { fontSize: 11, color: M },
    secSub2: { fontSize: 13, color: M, marginBottom: 8, marginTop: 2 },
    cardScroll: { flexGrow: 0, marginBottom: 18 },
    matCard: { width: 155, marginRight: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: B, padding: 12, gap: 4, position: 'relative', overflow: 'hidden' },
    matCardOn: { borderColor: P, backgroundColor: PBG },
    matIcon: { fontSize: 22, marginBottom: 2 },
    matName: { fontSize: 11, fontWeight: '700', color: M, textTransform: 'uppercase', letterSpacing: 0.3 },
    matNameOn: { color: P },
    matRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
    matRowLbl: { fontSize: 9, color: M, flex: 1 },
    matPrice: { fontSize: 12, fontWeight: '700', color: T },
    matPriceOn: { color: P },
    matRange: { fontSize: 10, fontWeight: '600', color: M },
    matActiveLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: P },
    tabsScroll: { flexGrow: 0, marginBottom: 12 },
    catTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: B, backgroundColor: '#fff', marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
    catTabOn: { backgroundColor: P, borderColor: P },
    catTabIcon: { fontSize: 13 },
    catTabTxt: { fontSize: 12, fontWeight: '600', color: M },
    catTabTxtOn: { color: '#fff' },
    hero: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#c4b5fd', padding: 18, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, shadowColor: P, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    heroKicker: { fontSize: 10, fontWeight: '700', color: M, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    heroCatLoc: { fontSize: 13, fontWeight: '600', color: M, marginBottom: 4 },
    heroPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 },
    heroPrice: { fontSize: 34, fontWeight: '800', color: P },
    heroUnit: { fontSize: 16, fontWeight: '600', color: M },
    heroDesc: { fontSize: 10, color: M, marginBottom: 6 },
    chg: { fontSize: 13, fontWeight: '700' },
    chgUp: { color: '#16a34a' },
    chgDown: { color: '#dc2626' },
    speakBtn: { backgroundColor: PBG, borderRadius: 12, padding: 12, alignItems: 'center', minWidth: 72, borderWidth: 1.5, borderColor: '#c4b5fd', gap: 4 },
    speakBtnOn: { backgroundColor: P, borderColor: P },
    speakIcon: { fontSize: 22 },
    speakTxt: { fontSize: 10, fontWeight: '700', color: P, textAlign: 'center' },
    speakTxtOn: { color: '#fff' },
    card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: B, padding: 16, marginBottom: 20 },
    chartHdr: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
    analyticsBox: { backgroundColor: PBG, borderRadius: 10, borderWidth: 1, borderColor: '#c4b5fd', borderStyle: 'dashed', padding: 10, marginBottom: 12 },
    analyticsTitle: { fontSize: 10, fontWeight: '700', color: M, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
    chipsRow: { flexDirection: 'row', gap: 8 },
    chip2: { backgroundColor: BG, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: B, minWidth: 110, alignItems: 'center' },
    chip2Accent: { backgroundColor: PL, borderColor: '#c4b5fd' },
    chip2Up: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
    chipLabel: { fontSize: 9, fontWeight: '600', color: M, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2, textAlign: 'center' },
    chipValue: { fontSize: 13, fontWeight: '700', color: T, textAlign: 'center' },
    chipValueAccent: { color: P },
    chipValueUp: { color: '#16a34a' },
    statsRow: { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
    mini: { flex: 1, minWidth: 56, backgroundColor: BG, borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: B },
    miniLabel: { fontSize: 8, fontWeight: '700', color: M, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 2 },
    miniValue: { fontSize: 12, fontWeight: '700', color: T },
    chartWrap: { position: 'relative', overflow: 'hidden', marginBottom: 4 },
    progressBox: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: B, padding: 12, marginTop: 8, marginBottom: 10 },
    progressTitle: { fontSize: 10, fontWeight: '700', color: M, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 },
    progressRow: { flexDirection: 'row', alignItems: 'center' },
    progressItem: { flexDirection: 'row', alignItems: 'center' },
    progressPrice: { fontSize: 15, fontWeight: '700', color: P },
    progressArrow: { fontSize: 12, color: M, fontWeight: '500' },
    toggleBtn: { paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: B, marginTop: 8 },
    toggleTxt: { fontSize: 12, color: P, fontWeight: '600' },
    tr: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: B, alignItems: 'center' },
    trAlt: { backgroundColor: '#fafafa' },
    tHdr: { backgroundColor: '#f1f5f9' },
    td: { fontSize: 12, color: T, paddingHorizontal: 6 },
    tHdrTxt: { fontSize: 10, fontWeight: '700', color: M, textTransform: 'uppercase', letterSpacing: 0.2 },
    rateAsOf: { fontSize: 11, color: M, marginBottom: 8, fontStyle: 'italic' },
    rateCount: { fontSize: 11, color: M, marginBottom: 8 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderWidth: 1, borderColor: B, borderRadius: 10, marginBottom: 10, paddingHorizontal: 10 },
    searchIcon: { fontSize: 14, marginRight: 6 },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: T },
    clearX: { padding: 6 },
    clearXTxt: { color: M, fontSize: 16 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rName: { fontSize: 12, fontWeight: '700', color: T, flex: 1 },
    muted: { color: M },
    bestBadge: { backgroundColor: '#fef3c7', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
    bestTxt: { fontSize: 9, color: '#b45309', fontWeight: '700' },
    vsBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    vsUp: { backgroundColor: '#dcfce7' },
    vsDn: { backgroundColor: '#fee2e2' },
    vsTxt: { fontSize: 11, fontWeight: '700' },
    vsTxtUp: { color: '#15803d' },
    vsTxtDn: { color: '#b91c1c' },
    clearFilterBtn: { marginTop: 10, backgroundColor: PL, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'center' },
    clearFilterTxt: { color: P, fontSize: 13, fontWeight: '600' },
    loader: { alignItems: 'center', paddingVertical: 30, gap: 10 },
    loaderTxt: { color: M, fontSize: 13 },
    empty: { alignItems: 'center', paddingVertical: 30 },
    emptyTxt: { color: M, fontSize: 13, textAlign: 'center' },
});