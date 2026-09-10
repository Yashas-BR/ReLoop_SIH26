import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import * as Location from 'expo-location';

import {
    acceptOffer,
    DEFAULT_LAT,
    DEFAULT_LNG,
    getMatchedRecyclers,
    getOffersByLot,
    rejectOffer,
    requestQuote,
} from '../../../api/client';

import { getSession } from '../../../services/auth';

/* =========================================================
   TYPES
========================================================= */

type Recycler = {
    id?: number;
    recycler_id?: number;

    name?: string;

    service_area?: string;
    facility_location?: string;

    suitability?: number;
    match_score?: number;

    score_price?: number;
    score_distance?: number;
    score_pickup?: number;
    score_reliability?: number;

    distance_km?: number;

    offered_rate?: number | string;

    pickup_availability?: string;

    materials_accepted?: string[];
};

type Offer = {
    id: number;

    recycler_id: number;

    recycler_name?: string;

    offer_status:
    | 'requested'
    | 'offered'
    | 'accepted'
    | 'rejected'
    | string;

    offered_price?: number | string;

    contact_details?: string;
    recycler_contact_details?: string;

    pickup_availability?: string;

    recycler_facility?: string;
    recycler_service_area?: string;
};

/* =========================================================
   SCREEN
========================================================= */

export default function MatchedRecyclersScreen() {
    /*
     * These values come from Create Lot.
     */
    const params = useLocalSearchParams<{
        lotId?: string;
        category?: string;
        location?: string;
        lat?: string;
        lng?: string;
        weight?: string;
        estimatedValue?: string;
    }>();

    const lotId = params.lotId
        ? String(params.lotId)
        : '';

    const category =
        params.category || 'PCB';

    const passedLocation =
        params.location || '';

    const passedLat =
        params.lat != null
            ? Number(params.lat)
            : null;

    const passedLng =
        params.lng != null
            ? Number(params.lng)
            : null;

    const lotWeight =
        params.weight
            ? Number(params.weight)
            : null;

    const estimatedValue =
        params.estimatedValue
            ? Number(params.estimatedValue)
            : null;

    /* =======================================================
       STATE
    ======================================================= */

    const [
        sessionLoaded,
        setSessionLoaded,
    ] = useState(false);

    const [
        city,
        setCity,
    ] = useState(
        passedLocation
    );

    const [
        lat,
        setLat,
    ] = useState<number>(
        passedLat ??
        Number(DEFAULT_LAT)
    );

    const [
        lng,
        setLng,
    ] = useState<number>(
        passedLng ??
        Number(DEFAULT_LNG)
    );

    const [
        detectingGps,
        setDetectingGps,
    ] = useState(false);

    const [
        radiusKm,
        setRadiusKm,
    ] = useState(150);

    const [
        recyclers,
        setRecyclers,
    ] = useState<Recycler[]>([]);

    const [
        searchTerm,
        setSearchTerm,
    ] = useState('');

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState('');

    const [
        offers,
        setOffers,
    ] = useState<Offer[]>([]);

    const [
        offersError,
        setOffersError,
    ] = useState('');

    const [
        requesting,
        setRequesting,
    ] = useState<
        number | null
    >(null);

    const [
        offerBusy,
        setOfferBusy,
    ] = useState<
        number | null
    >(null);

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const [
        selectedId,
        setSelectedId,
    ] = useState<
        number | null
    >(null);

    /* =======================================================
       SESSION + LOCATION
    ======================================================= */

    useEffect(() => {
        async function initialise() {
            try {
                const session =
                    await getSession();

                /*
                 * Priority:
                 *
                 * 1. coordinates passed from Create Lot
                 * 2. coordinates embedded in location text
                 * 3. registered collector coordinates
                 * 4. default Bengaluru
                 */

                let initialLat =
                    passedLat;

                let initialLng =
                    passedLng;

                if (
                    (initialLat == null ||
                        initialLng == null) &&
                    passedLocation
                ) {
                    const match =
                        String(
                            passedLocation
                        ).match(
                            /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/
                        );

                    if (match) {
                        initialLat =
                            parseFloat(
                                match[1]
                            );

                        initialLng =
                            parseFloat(
                                match[2]
                            );
                    }
                }

                if (
                    initialLat == null ||
                    initialLng == null
                ) {
                    if (
                        session?.latitude !=
                        null &&
                        session?.longitude !=
                        null
                    ) {
                        initialLat =
                            Number(
                                session.latitude
                            );

                        initialLng =
                            Number(
                                session.longitude
                            );
                    }
                }

                if (
                    initialLat != null
                ) {
                    setLat(
                        initialLat
                    );
                }

                if (
                    initialLng != null
                ) {
                    setLng(
                        initialLng
                    );
                }

                if (
                    !passedLocation &&
                    session?.operating_location
                ) {
                    setCity(
                        session.operating_location
                    );
                }

                /*
                 * If Create Lot did not pass GPS
                 * AND account does not contain GPS,
                 * try phone location.
                 */
                if (
                    passedLat == null &&
                    passedLng == null &&
                    (session?.latitude ==
                        null ||
                        session?.longitude ==
                        null)
                ) {
                    await detectPhoneLocation();
                }
            } finally {
                setSessionLoaded(
                    true
                );
            }
        }

        initialise();
    }, []);

    async function detectPhoneLocation() {
        try {
            setDetectingGps(
                true
            );

            const permission =
                await Location.requestForegroundPermissionsAsync();

            if (
                permission.status !==
                'granted'
            ) {
                return;
            }

            const result =
                await Location.getCurrentPositionAsync(
                    {
                        accuracy:
                            Location
                                .Accuracy
                                .Balanced,
                    }
                );

            setLat(
                result.coords.latitude
            );

            setLng(
                result.coords.longitude
            );
        } catch (err) {
            console.log(
                'Location error:',
                err
            );
        } finally {
            setDetectingGps(
                false
            );
        }
    }

    /* =======================================================
       MATCHED RECYCLERS
    ======================================================= */

    const fetchRecyclers =
        useCallback(
            async (
                searchRadius?:
                    number
            ) => {
                const radius =
                    searchRadius ??
                    radiusKm;

                setError('');

                try {
                    const response =
                        await getMatchedRecyclers(
                            {
                                category,

                                maxDistanceKm:
                                    radius,

                                lat,
                                lng,

                                location:
                                    city ||
                                    undefined,
                            }
                        );

                    if (
                        response
                            ?.location?.lat !=
                        null &&
                        response
                            ?.location?.lng !=
                        null
                    ) {
                        setLat(
                            Number(
                                response
                                    .location
                                    .lat
                            )
                        );

                        setLng(
                            Number(
                                response
                                    .location
                                    .lng
                            )
                        );
                    }

                    const list =
                        Array.isArray(
                            response?.data
                        )
                            ? response.data
                            : [];

                    setRecyclers(
                        list
                    );

                    /*
                     * Same behavior as web:
                     * if nothing is nearby,
                     * automatically expand.
                     */
                    if (
                        list.length ===
                        0 &&
                        radius < 1000
                    ) {
                        try {
                            const expanded =
                                await getMatchedRecyclers(
                                    {
                                        category,

                                        maxDistanceKm:
                                            1500,

                                        lat,
                                        lng,

                                        location:
                                            city ||
                                            undefined,
                                    }
                                );

                            if (
                                Array.isArray(
                                    expanded?.data
                                ) &&
                                expanded.data
                                    .length >
                                0
                            ) {
                                setRecyclers(
                                    expanded.data
                                );

                                setRadiusKm(
                                    1500
                                );
                            }
                        } catch {
                            // keep original empty result
                        }
                    }
                } catch (
                err: any
                ) {
                    console.log(
                        'Recycler load error:',
                        err
                    );

                    setError(
                        err?.message ||
                        'Could not load matched recyclers.'
                    );
                }
            },
            [
                category,
                lat,
                lng,
                city,
                radiusKm,
            ]
        );

    /* =======================================================
       OFFERS
    ======================================================= */

    const loadOffers =
        useCallback(
            async () => {
                if (!lotId) {
                    return;
                }

                setOffersError(
                    ''
                );

                try {
                    const response =
                        await getOffersByLot(
                            lotId
                        );

                    setOffers(
                        Array.isArray(
                            response?.data
                        )
                            ? response.data
                            : []
                    );
                } catch (
                err
                ) {
                    console.log(
                        'Offers load error:',
                        err
                    );

                    setOffersError(
                        'Could not load quote offers.'
                    );
                }
            },
            [lotId]
        );

    /* =======================================================
       INITIAL LOAD
    ======================================================= */

    useEffect(() => {
        if (
            !sessionLoaded
        ) {
            return;
        }

        async function load() {
            setLoading(true);

            try {
                await Promise.all([
                    fetchRecyclers(),
                    loadOffers(),
                ]);
            } finally {
                setLoading(
                    false
                );
            }
        }

        load();
    }, [sessionLoaded]);

    /* =======================================================
       REFRESH
    ======================================================= */

    async function refresh() {
        setRefreshing(
            true
        );

        try {
            await Promise.all([
                fetchRecyclers(),
                loadOffers(),
            ]);
        } finally {
            setRefreshing(
                false
            );
        }
    }

    /* =======================================================
       REQUEST QUOTE
    ======================================================= */

    async function handleRequestQuote(
        recycler: Recycler
    ) {
        if (!lotId) {
            setError(
                'Lot information is missing.'
            );

            return;
        }

        const recyclerId =
            recycler.id ??
            recycler.recycler_id;

        if (!recyclerId) {
            setError(
                'Recycler ID is missing.'
            );

            return;
        }

        setRequesting(
            recyclerId
        );

        setError('');
        setSuccessMessage(
            ''
        );

        try {
            await requestQuote(
                lotId,
                recyclerId
            );

            setSuccessMessage(
                `Quote requested from ${recycler.name ||
                'recycler'
                }.`
            );

            await loadOffers();
        } catch (
        err: any
        ) {
            setError(
                err?.message ||
                'Could not request quote.'
            );
        } finally {
            setRequesting(
                null
            );
        }
    }

    /* =======================================================
       ACCEPT / REJECT
    ======================================================= */

    async function handleOfferAction(
        offerId: number,
        decision:
            | 'accept'
            | 'reject'
    ) {
        setOfferBusy(
            offerId
        );

        setError('');
        setSuccessMessage(
            ''
        );

        try {
            if (
                decision ===
                'accept'
            ) {
                await acceptOffer(
                    offerId
                );

                setSuccessMessage(
                    'Quote accepted successfully.'
                );
            } else {
                await rejectOffer(
                    offerId
                );

                setSuccessMessage(
                    'Quote rejected.'
                );
            }

            await loadOffers();
            await fetchRecyclers();
        } catch (
        err: any
        ) {
            setError(
                err?.message ||
                'Could not update quote.'
            );
        } finally {
            setOfferBusy(
                null
            );
        }
    }

    /* =======================================================
       HELPERS
    ======================================================= */

    function recyclerIdOf(
        recycler: Recycler
    ) {
        return (
            recycler.id ??
            recycler.recycler_id
        );
    }

    function suitabilityOf(
        recycler: Recycler
    ) {
        if (
            recycler.suitability !=
            null
        ) {
            return Math.max(
                0,
                Math.min(
                    100,
                    Math.round(
                        Number(
                            recycler.suitability
                        )
                    )
                )
            );
        }

        return Math.max(
            0,
            Math.round(
                (1 -
                    Math.min(
                        recycler.match_score ??
                        0.5,
                        1
                    )) *
                100
            )
        );
    }

    function pctScore(
        value?: number
    ) {
        return Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    (value ?? 0.5) *
                    100
                )
            )
        );
    }

    function offerForRecycler(
        recyclerId?: number
    ) {
        if (!recyclerId) {
            return undefined;
        }

        return offers.find(
            (offer) =>
                Number(
                    offer.recycler_id
                ) ===
                Number(
                    recyclerId
                )
        );
    }

    const acceptedOffer =
        useMemo(
            () =>
                offers.find(
                    (offer) =>
                        offer.offer_status ===
                        'accepted'
                ),

            [offers]
        );

    const openOffers =
        useMemo(
            () =>
                offers.filter(
                    (offer) =>
                        [
                            'requested',
                            'offered',
                        ].includes(
                            offer.offer_status
                        )
                ),

            [offers]
        );

    const filteredRecyclers =
        useMemo(() => {
            if (
                !searchTerm.trim()
            ) {
                return recyclers;
            }

            const query =
                searchTerm
                    .toLowerCase()
                    .trim();

            return recyclers.filter(
                (recycler) => {
                    const name =
                        (
                            recycler.name ||
                            ''
                        ).toLowerCase();

                    const location =
                        (
                            recycler.facility_location ||
                            recycler.service_area ||
                            ''
                        ).toLowerCase();

                    return (
                        name.includes(
                            query
                        ) ||
                        location.includes(
                            query
                        )
                    );
                }
            );
        }, [
            recyclers,
            searchTerm,
        ]);

    /* =======================================================
       UI
    ======================================================= */

    return (
        <ScrollView
            style={
                styles.screen
            }
            contentContainerStyle={
                styles.container
            }
            refreshControl={
                <RefreshControl
                    refreshing={
                        refreshing
                    }
                    onRefresh={
                        refresh
                    }
                />
            }
            showsVerticalScrollIndicator={
                false
            }
        >
            {/* HEADER */}

            <Pressable
                onPress={() =>
                    router.back()
                }
            >
                <Text
                    style={
                        styles.back
                    }
                >
                    ‹ Back
                </Text>
            </Pressable>

            <Text
                style={
                    styles.title
                }
            >
                Matched Recyclers
            </Text>

            <Text
                style={
                    styles.subtitle
                }
            >
                Authorized recyclers
                matched for your{' '}
                {category} lot.
            </Text>

            <View
                style={
                    styles.locationRow
                }
            >
                {detectingGps ? (
                    <>
                        <ActivityIndicator
                            size="small"
                            color="#16a34a"
                        />

                        <Text
                            style={
                                styles.locationText
                            }
                        >
                            Detecting your
                            location...
                        </Text>
                    </>
                ) : (
                    <Text
                        style={
                            styles.locationText
                        }
                    >
                        📍{' '}
                        {city &&
                            !city.startsWith(
                                'GPS Location'
                            )
                            ? `${city} · ${lat.toFixed(
                                4
                            )}, ${lng.toFixed(
                                4
                            )}`
                            : `${lat.toFixed(
                                4
                            )}, ${lng.toFixed(
                                4
                            )}`}
                    </Text>
                )}
            </View>

            {/* LOT SUMMARY */}

            {lotId ? (
                <View
                    style={
                        styles.lotSummary
                    }
                >
                    <View>
                        <Text
                            style={
                                styles.lotId
                            }
                        >
                            {lotId}
                        </Text>

                        <Text
                            style={
                                styles.lotCategory
                            }
                        >
                            {category}
                            {lotWeight
                                ? ` · ${lotWeight} kg`
                                : ''}
                        </Text>
                    </View>

                    {estimatedValue !=
                        null ? (
                        <View
                            style={
                                styles.estimateBlock
                            }
                        >
                            <Text
                                style={
                                    styles.estimateLabel
                                }
                            >
                                PLATFORM
                                ESTIMATE
                            </Text>

                            <Text
                                style={
                                    styles.estimateValue
                                }
                            >
                                ₹
                                {estimatedValue.toLocaleString(
                                    'en-IN'
                                )}
                            </Text>
                        </View>
                    ) : null}
                </View>
            ) : null}

            {/* SUCCESS */}

            {successMessage ? (
                <View
                    style={
                        styles.successBanner
                    }
                >
                    <Text
                        style={
                            styles.successText
                        }
                    >
                        ✓{' '}
                        {
                            successMessage
                        }
                    </Text>
                </View>
            ) : null}

            {/* ERROR */}

            {error ? (
                <View
                    style={
                        styles.errorBanner
                    }
                >
                    <Text
                        style={
                            styles.errorText
                        }
                    >
                        ⚠️ {error}
                    </Text>
                </View>
            ) : null}

            {offersError ? (
                <View
                    style={
                        styles.warningBanner
                    }
                >
                    <Text
                        style={
                            styles.warningText
                        }
                    >
                        ⚠️{' '}
                        {offersError}
                    </Text>
                </View>
            ) : null}

            {/* =================================================
          QUOTES RECEIVED
      ================================================= */}

            {lotId &&
                (openOffers.length >
                    0 ||
                    acceptedOffer) ? (
                <View
                    style={
                        styles.card
                    }
                >
                    <View
                        style={
                            styles.sectionHeader
                        }
                    >
                        <Text
                            style={
                                styles.sectionTitle
                            }
                        >
                            Quotes Received
                        </Text>

                        {acceptedOffer ? (
                            <View
                                style={
                                    styles.acceptedBadge
                                }
                            >
                                <Text
                                    style={
                                        styles.acceptedBadgeText
                                    }
                                >
                                    ✓ Accepted
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {acceptedOffer ? (
                        <AcceptedOfferCard
                            offer={
                                acceptedOffer
                            }
                            lotWeight={
                                lotWeight
                            }
                        />
                    ) : (
                        <>
                            <View
                                style={
                                    styles.privacyNotice
                                }
                            >
                                <Text
                                    style={
                                        styles.privacyText
                                    }
                                >
                                    🔐 Recycler
                                    contact details
                                    remain protected
                                    until you accept
                                    a quote.
                                </Text>
                            </View>

                            {openOffers.map(
                                (offer) => (
                                    <OfferCard
                                        key={
                                            offer.id
                                        }
                                        offer={
                                            offer
                                        }
                                        lotWeight={
                                            lotWeight
                                        }
                                        busy={
                                            offerBusy ===
                                            offer.id
                                        }
                                        disableActions={
                                            offerBusy !=
                                            null
                                        }
                                        onAccept={() =>
                                            handleOfferAction(
                                                offer.id,
                                                'accept'
                                            )
                                        }
                                        onReject={() =>
                                            handleOfferAction(
                                                offer.id,
                                                'reject'
                                            )
                                        }
                                    />
                                )
                            )}
                        </>
                    )}
                </View>
            ) : null}

            {/* =================================================
          SEARCH
      ================================================= */}

            {!loading &&
                recyclers.length >
                0 ? (
                <View
                    style={
                        styles.searchCard
                    }
                >
                    <Text
                        style={
                            styles.searchIcon
                        }
                    >
                        🔍
                    </Text>

                    <TextInput
                        value={
                            searchTerm
                        }
                        onChangeText={
                            setSearchTerm
                        }
                        placeholder="Search recyclers by name or location"
                        placeholderTextColor="#9ca3af"
                        style={
                            styles.searchInput
                        }
                    />

                    {searchTerm ? (
                        <Pressable
                            onPress={() =>
                                setSearchTerm(
                                    ''
                                )
                            }
                        >
                            <Text
                                style={
                                    styles.clearSearch
                                }
                            >
                                ✕
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}

            {searchTerm ? (
                <Text
                    style={
                        styles.searchCount
                    }
                >
                    Showing{' '}
                    {
                        filteredRecyclers.length
                    }{' '}
                    of{' '}
                    {
                        recyclers.length
                    }{' '}
                    matched recyclers
                </Text>
            ) : null}

            {/* =================================================
          LOADING
      ================================================= */}

            {loading ? (
                <View
                    style={
                        styles.loadingBox
                    }
                >
                    <ActivityIndicator
                        size="large"
                        color="#16a34a"
                    />

                    <Text
                        style={
                            styles.loadingText
                        }
                    >
                        Finding the best
                        recyclers...
                    </Text>
                </View>
            ) : null}

            {/* =================================================
          NO RECYCLERS
      ================================================= */}

            {!loading &&
                recyclers.length ===
                0 ? (
                <View
                    style={
                        styles.emptyCard
                    }
                >
                    <Text
                        style={
                            styles.emptyIcon
                        }
                    >
                        ♻️
                    </Text>

                    <Text
                        style={
                            styles.emptyTitle
                        }
                    >
                        No recyclers found
                    </Text>

                    <Text
                        style={
                            styles.emptyText
                        }
                    >
                        We couldn't find a
                        matching recycler
                        near this location.
                    </Text>

                    <Pressable
                        style={
                            styles.outlineButton
                        }
                        onPress={
                            refresh
                        }
                    >
                        <Text
                            style={
                                styles.outlineButtonText
                            }
                        >
                            Try Again
                        </Text>
                    </Pressable>
                </View>
            ) : null}

            {/* =================================================
          SEARCH EMPTY
      ================================================= */}

            {!loading &&
                recyclers.length >
                0 &&
                filteredRecyclers.length ===
                0 ? (
                <View
                    style={
                        styles.emptyCard
                    }
                >
                    <Text
                        style={
                            styles.emptyTitle
                        }
                    >
                        No search matches
                    </Text>

                    <Pressable
                        style={
                            styles.outlineButton
                        }
                        onPress={() =>
                            setSearchTerm('')
                        }
                    >
                        <Text
                            style={
                                styles.outlineButtonText
                            }
                        >
                            Clear Search
                        </Text>
                    </Pressable>
                </View>
            ) : null}

            {/* =================================================
          RECYCLER CARDS
      ================================================= */}

            {!loading &&
                filteredRecyclers.map(
                    (recycler) => {
                        const recyclerId =
                            recyclerIdOf(
                                recycler
                            );

                        if (!recyclerId) {
                            return null;
                        }

                        const suitability =
                            suitabilityOf(
                                recycler
                            );

                        const myOffer =
                            offerForRecycler(
                                recyclerId
                            );

                        const isSelected =
                            selectedId ===
                            recyclerId;

                        const isRequesting =
                            requesting ===
                            recyclerId;

                        const isAcceptedRecycler =
                            acceptedOffer &&
                            Number(
                                acceptedOffer.recycler_id
                            ) ===
                            Number(
                                recyclerId
                            );

                        return (
                            <Pressable
                                key={
                                    recyclerId
                                }
                                onPress={() =>
                                    setSelectedId(
                                        recyclerId
                                    )
                                }
                                style={[
                                    styles.recyclerCard,

                                    isSelected &&
                                    styles.recyclerCardSelected,

                                    isAcceptedRecycler &&
                                    styles.recyclerCardAccepted,
                                ]}
                            >
                                {/* HEADER */}

                                <View
                                    style={
                                        styles.recyclerHeader
                                    }
                                >
                                    <View
                                        style={
                                            styles.recyclerNameWrap
                                        }
                                    >
                                        <View
                                            style={
                                                styles.recyclerAvatar
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.recyclerAvatarText
                                                }
                                            >
                                                ♻
                                            </Text>
                                        </View>

                                        <View
                                            style={{
                                                flex: 1,
                                            }}
                                        >
                                            <Text
                                                style={
                                                    styles.recyclerName
                                                }
                                            >
                                                {recycler.name ||
                                                    'Authorized Recycler'}
                                            </Text>

                                            <Text
                                                style={
                                                    styles.recyclerLocation
                                                }
                                            >
                                                {recycler.service_area ||
                                                    recycler.facility_location ||
                                                    'Location unavailable'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View
                                        style={
                                            styles.authorizedBadge
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.authorizedText
                                            }
                                        >
                                            ✓ Authorized
                                        </Text>
                                    </View>
                                </View>

                                {/* SUITABILITY */}

                                <View
                                    style={
                                        styles.scoreSection
                                    }
                                >
                                    <View
                                        style={
                                            styles.scoreHeader
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.scoreLabel
                                            }
                                        >
                                            Suitability
                                        </Text>

                                        <Text
                                            style={
                                                styles.scoreValue
                                            }
                                        >
                                            {
                                                suitability
                                            }
                                            %
                                        </Text>
                                    </View>

                                    <View
                                        style={
                                            styles.scoreTrack
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.scoreFill,

                                                {
                                                    width:
                                                        `${suitability}%`,
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>

                                {/* SCORE BREAKDOWN */}

                                {recycler.score_price !=
                                    null ||
                                    recycler.score_reliability !=
                                    null ? (
                                    <View
                                        style={
                                            styles.scoreChips
                                        }
                                    >
                                        <ScoreChip
                                            text={`Price ${pctScore(
                                                recycler.score_price
                                            )}%`}
                                        />

                                        <ScoreChip
                                            text={`Distance ${pctScore(
                                                recycler.score_distance
                                            )}%`}
                                        />

                                        <ScoreChip
                                            text={`Pickup ${pctScore(
                                                recycler.score_pickup
                                            )}%`}
                                        />

                                        <ScoreChip
                                            text={`Reliability ${pctScore(
                                                recycler.score_reliability
                                            )}%`}
                                        />
                                    </View>
                                ) : null}

                                {/* STATS */}

                                <View
                                    style={
                                        styles.stats
                                    }
                                >
                                    <Stat
                                        icon="📍"
                                        label="Distance"
                                        value={
                                            recycler.distance_km !=
                                                null
                                                ? `${Number(
                                                    recycler.distance_km
                                                ).toFixed(
                                                    1
                                                )} km`
                                                : '—'
                                        }
                                    />

                                    <Stat
                                        icon="₹"
                                        label="Recycler Rate"
                                        value={
                                            recycler.offered_rate
                                                ? `₹${recycler.offered_rate}/kg`
                                                : '—'
                                        }
                                        subValue={
                                            lotWeight &&
                                                recycler.offered_rate
                                                ? `Est. ₹${Math.round(
                                                    Number(
                                                        lotWeight
                                                    ) *
                                                    Number(
                                                        recycler.offered_rate
                                                    )
                                                ).toLocaleString(
                                                    'en-IN'
                                                )}`
                                                : undefined
                                        }
                                    />

                                    <Stat
                                        icon="🚚"
                                        label="Pickup"
                                        value={
                                            recycler.pickup_availability ===
                                                'daily'
                                                ? 'Available'
                                                : recycler.pickup_availability ||
                                                'On request'
                                        }
                                    />
                                </View>

                                {/* MATERIALS */}

                                {Array.isArray(
                                    recycler.materials_accepted
                                ) &&
                                    recycler
                                        .materials_accepted
                                        .length >
                                    0 ? (
                                    <View
                                        style={
                                            styles.materials
                                        }
                                    >
                                        {recycler.materials_accepted.map(
                                            (
                                                material
                                            ) => (
                                                <View
                                                    key={
                                                        material
                                                    }
                                                    style={
                                                        styles.materialChip
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.materialText
                                                        }
                                                    >
                                                        {
                                                            material
                                                        }
                                                    </Text>
                                                </View>
                                            )
                                        )}
                                    </View>
                                ) : null}

                                {/* =================================================
                    ACTION STATE
                ================================================= */}

                                {acceptedOffer ? (
                                    isAcceptedRecycler ? (
                                        <View>
                                            <View
                                                style={
                                                    styles.acceptedRecyclerBox
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.acceptedRecyclerTitle
                                                    }
                                                >
                                                    ✓ Accepted
                                                    Recycler
                                                </Text>

                                                <Text
                                                    style={
                                                        styles.acceptedRecyclerRate
                                                    }
                                                >
                                                    ₹
                                                    {
                                                        acceptedOffer.offered_price
                                                    }{' '}
                                                    / kg
                                                </Text>

                                                {lotWeight &&
                                                    acceptedOffer.offered_price ? (
                                                    <Text
                                                        style={
                                                            styles.acceptedRecyclerPayout
                                                        }
                                                    >
                                                        Agreed
                                                        payout:{' '}
                                                        ₹
                                                        {Math.round(
                                                            Number(
                                                                lotWeight
                                                            ) *
                                                            Number(
                                                                acceptedOffer.offered_price
                                                            )
                                                        ).toLocaleString(
                                                            'en-IN'
                                                        )}
                                                    </Text>
                                                ) : null}
                                            </View>

                                            {/* PART 2 */}

                                            <View
                                                style={
                                                    styles.nextPartBox
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.nextPartText
                                                    }
                                                >
                                                    Handover
                                                    button will
                                                    be connected
                                                    in Part 2.
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <Text
                                            style={
                                                styles.unavailableText
                                            }
                                        >
                                            Another
                                            recycler's
                                            quote has been
                                            accepted.
                                        </Text>
                                    )
                                ) : !myOffer ? (
                                    <Pressable
                                        style={[
                                            styles.primaryButton,

                                            requesting !=
                                            null &&
                                            styles.disabledButton,
                                        ]}
                                        disabled={
                                            requesting !=
                                            null
                                        }
                                        onPress={() =>
                                            handleRequestQuote(
                                                recycler
                                            )
                                        }
                                    >
                                        {isRequesting ? (
                                            <View
                                                style={
                                                    styles.buttonLoading
                                                }
                                            >
                                                <ActivityIndicator
                                                    size="small"
                                                    color="#ffffff"
                                                />

                                                <Text
                                                    style={
                                                        styles.primaryButtonText
                                                    }
                                                >
                                                    Requesting...
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text
                                                style={
                                                    styles.primaryButtonText
                                                }
                                            >
                                                Request Quote
                                            </Text>
                                        )}
                                    </Pressable>
                                ) : myOffer.offer_status ===
                                    'requested' ? (
                                    <View
                                        style={
                                            styles.waitingBox
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.waitingText
                                            }
                                        >
                                            ⏳ Quote
                                            requested —
                                            awaiting
                                            recycler
                                        </Text>
                                    </View>
                                ) : myOffer.offer_status ===
                                    'offered' ? (
                                    <View
                                        style={
                                            styles.offerActionBox
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.offerSmallLabel
                                            }
                                        >
                                            RECYCLER'S
                                            OFFER
                                        </Text>

                                        <Text
                                            style={
                                                styles.offerPrice
                                            }
                                        >
                                            ₹
                                            {Number(
                                                myOffer.offered_price
                                            ).toLocaleString(
                                                'en-IN'
                                            )}{' '}
                                            / kg
                                        </Text>

                                        {lotWeight &&
                                            myOffer.offered_price ? (
                                            <Text
                                                style={
                                                    styles.offerPayout
                                                }
                                            >
                                                Estimated
                                                payout: ₹
                                                {Math.round(
                                                    Number(
                                                        lotWeight
                                                    ) *
                                                    Number(
                                                        myOffer.offered_price
                                                    )
                                                ).toLocaleString(
                                                    'en-IN'
                                                )}
                                            </Text>
                                        ) : null}

                                        <View
                                            style={
                                                styles.offerButtons
                                            }
                                        >
                                            <Pressable
                                                style={[
                                                    styles.acceptButton,

                                                    offerBusy !=
                                                    null &&
                                                    styles.disabledButton,
                                                ]}
                                                disabled={
                                                    offerBusy !=
                                                    null
                                                }
                                                onPress={() =>
                                                    handleOfferAction(
                                                        myOffer.id,
                                                        'accept'
                                                    )
                                                }
                                            >
                                                {offerBusy ===
                                                    myOffer.id ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color="#ffffff"
                                                    />
                                                ) : (
                                                    <Text
                                                        style={
                                                            styles.acceptButtonText
                                                        }
                                                    >
                                                        ✓ Accept
                                                    </Text>
                                                )}
                                            </Pressable>

                                            <Pressable
                                                style={[
                                                    styles.rejectButton,

                                                    offerBusy !=
                                                    null &&
                                                    styles.disabledButton,
                                                ]}
                                                disabled={
                                                    offerBusy !=
                                                    null
                                                }
                                                onPress={() =>
                                                    handleOfferAction(
                                                        myOffer.id,
                                                        'reject'
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.rejectButtonText
                                                    }
                                                >
                                                    Reject
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ) : (
                                    <Pressable
                                        style={
                                            styles.primaryButton
                                        }
                                        onPress={() =>
                                            handleRequestQuote(
                                                recycler
                                            )
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.primaryButtonText
                                            }
                                        >
                                            Request Quote
                                        </Text>
                                    </Pressable>
                                )}
                            </Pressable>
                        );
                    }
                )}

            <View
                style={{
                    height: 50,
                }}
            />
        </ScrollView>
    );
}

/* =========================================================
   COMPONENTS
========================================================= */

function ScoreChip({
    text,
}: {
    text: string;
}) {
    return (
        <View
            style={
                styles.scoreChip
            }
        >
            <Text
                style={
                    styles.scoreChipText
                }
            >
                {text}
            </Text>
        </View>
    );
}

function Stat({
    icon,
    label,
    value,
    subValue,
}: {
    icon: string;
    label: string;
    value: string;
    subValue?: string;
}) {
    return (
        <View
            style={
                styles.stat
            }
        >
            <Text
                style={
                    styles.statIcon
                }
            >
                {icon}
            </Text>

            <Text
                style={
                    styles.statLabel
                }
            >
                {label}
            </Text>

            <Text
                style={
                    styles.statValue
                }
            >
                {value}
            </Text>

            {subValue ? (
                <Text
                    style={
                        styles.statSubValue
                    }
                >
                    {subValue}
                </Text>
            ) : null}
        </View>
    );
}

function OfferCard({
    offer,
    lotWeight,
    busy,
    disableActions,
    onAccept,
    onReject,
}: {
    offer: Offer;
    lotWeight: number | null;
    busy: boolean;
    disableActions: boolean;
    onAccept: () => void;
    onReject: () => void;
}) {
    if (
        offer.offer_status ===
        'requested'
    ) {
        return (
            <View
                style={
                    styles.offerCard
                }
            >
                <Text
                    style={
                        styles.offerRecyclerName
                    }
                >
                    {offer.recycler_name ||
                        'Recycler'}
                </Text>

                <Text
                    style={
                        styles.awaitingText
                    }
                >
                    ⏳ Awaiting recycler
                    quote
                </Text>
            </View>
        );
    }

    const price =
        Number(
            offer.offered_price
        );

    const payout =
        lotWeight &&
            Number.isFinite(price)
            ? Math.round(
                lotWeight * price
            )
            : null;

    return (
        <View
            style={
                styles.offerCard
            }
        >
            <Text
                style={
                    styles.offerRecyclerName
                }
            >
                {offer.recycler_name ||
                    'Recycler'}
            </Text>

            <Text
                style={
                    styles.offerCardPrice
                }
            >
                ₹
                {price.toLocaleString(
                    'en-IN'
                )}{' '}
                / kg
            </Text>

            {payout != null ? (
                <Text
                    style={
                        styles.offerCardPayout
                    }
                >
                    Estimated payout: ₹
                    {payout.toLocaleString(
                        'en-IN'
                    )}
                </Text>
            ) : null}

            <View
                style={
                    styles.offerButtons
                }
            >
                <Pressable
                    style={[
                        styles.acceptButton,
                        disableActions &&
                        styles.disabledButton,
                    ]}
                    disabled={
                        disableActions
                    }
                    onPress={
                        onAccept
                    }
                >
                    {busy ? (
                        <ActivityIndicator
                            size="small"
                            color="#ffffff"
                        />
                    ) : (
                        <Text
                            style={
                                styles.acceptButtonText
                            }
                        >
                            ✓ Accept Quote
                        </Text>
                    )}
                </Pressable>

                <Pressable
                    style={[
                        styles.rejectButton,
                        disableActions &&
                        styles.disabledButton,
                    ]}
                    disabled={
                        disableActions
                    }
                    onPress={
                        onReject
                    }
                >
                    <Text
                        style={
                            styles.rejectButtonText
                        }
                    >
                        Reject
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

function AcceptedOfferCard({
    offer,
    lotWeight,
}: {
    offer: Offer;
    lotWeight: number | null;
}) {
    const price =
        Number(
            offer.offered_price
        );

    return (
        <View>
            <View
                style={
                    styles.acceptedBanner
                }
            >
                <Text
                    style={
                        styles.acceptedBannerText
                    }
                >
                    ✓ Accepted{' '}
                    {offer.recycler_name ||
                        'Recycler'}{' '}
                    at ₹
                    {price.toLocaleString(
                        'en-IN'
                    )}
                    /kg
                </Text>

                {lotWeight ? (
                    <Text
                        style={
                            styles.acceptedPayout
                        }
                    >
                        Estimated payout: ₹
                        {Math.round(
                            lotWeight *
                            price
                        ).toLocaleString(
                            'en-IN'
                        )}
                    </Text>
                ) : null}
            </View>

            <View
                style={
                    styles.contactCard
                }
            >
                <View
                    style={
                        styles.contactHeader
                    }
                >
                    <Text
                        style={
                            styles.contactTitle
                        }
                    >
                        📞 Pickup
                        Coordination
                    </Text>

                    <View
                        style={
                            styles.unlockedBadge
                        }
                    >
                        <Text
                            style={
                                styles.unlockedText
                            }
                        >
                            🔓 Unlocked
                        </Text>
                    </View>
                </View>

                <ContactRow
                    label="Facility"
                    value={
                        offer.recycler_name ||
                        '—'
                    }
                />

                <ContactRow
                    label="Phone"
                    value={
                        offer.contact_details ||
                        offer.recycler_contact_details ||
                        'Available during dispatch confirmation'
                    }
                />

                <ContactRow
                    label="Pickup"
                    value={
                        offer.pickup_availability ||
                        'Daily / On Request'
                    }
                />

                <ContactRow
                    label="Location"
                    value={
                        offer.recycler_facility ||
                        offer.recycler_service_area ||
                        'Bengaluru'
                    }
                />
            </View>
        </View>
    );
}

function ContactRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <View
            style={
                styles.contactRow
            }
        >
            <Text
                style={
                    styles.contactLabel
                }
            >
                {label}
            </Text>

            <Text
                style={
                    styles.contactValue
                }
            >
                {value}
            </Text>
        </View>
    );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
    StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor:
                '#f8fafc',
        },

        container: {
            padding: 18,
        },

        back: {
            color:
                '#16a34a',
            fontSize: 14,
            fontWeight:
                '700',
            marginBottom: 14,
        },

        title: {
            fontSize: 29,
            fontWeight:
                '900',
            color:
                '#111827',
        },

        subtitle: {
            fontSize: 13,
            color:
                '#6b7280',
            marginTop: 5,
        },

        locationRow: {
            marginTop: 9,
            flexDirection:
                'row',
            alignItems:
                'center',
            gap: 7,
        },

        locationText: {
            color:
                '#15803d',
            fontSize: 11,
            flex: 1,
        },

        lotSummary: {
            marginTop: 20,
            borderRadius: 14,
            padding: 15,
            backgroundColor:
                '#ecfdf5',
            borderWidth: 1,
            borderColor:
                '#bbf7d0',
            flexDirection:
                'row',
            justifyContent:
                'space-between',
            alignItems:
                'center',
            gap: 12,
        },

        lotId: {
            color:
                '#111827',
            fontWeight:
                '900',
            fontSize: 15,
        },

        lotCategory: {
            marginTop: 3,
            color:
                '#4b5563',
            fontSize: 11,
        },

        estimateBlock: {
            alignItems:
                'flex-end',
        },

        estimateLabel: {
            color:
                '#6b7280',
            fontSize: 8,
            fontWeight:
                '800',
        },

        estimateValue: {
            color:
                '#16a34a',
            fontSize: 18,
            fontWeight:
                '900',
            marginTop: 2,
        },

        successBanner: {
            marginTop: 15,
            padding: 12,
            backgroundColor:
                '#ecfdf5',
            borderColor:
                '#86efac',
            borderWidth: 1,
            borderRadius: 10,
        },

        successText: {
            color:
                '#15803d',
            fontSize: 12,
            fontWeight:
                '600',
        },

        errorBanner: {
            marginTop: 15,
            padding: 12,
            backgroundColor:
                '#fef2f2',
            borderColor:
                '#fca5a5',
            borderWidth: 1,
            borderRadius: 10,
        },

        errorText: {
            color:
                '#b91c1c',
            fontSize: 12,
        },

        warningBanner: {
            marginTop: 15,
            padding: 12,
            backgroundColor:
                '#fffbeb',
            borderColor:
                '#fcd34d',
            borderWidth: 1,
            borderRadius: 10,
        },

        warningText: {
            color:
                '#92400e',
            fontSize: 12,
        },

        card: {
            marginTop: 16,
            backgroundColor:
                '#ffffff',
            borderWidth: 1,
            borderColor:
                '#e5e7eb',
            borderRadius: 15,
            padding: 15,
        },

        sectionHeader: {
            flexDirection:
                'row',
            justifyContent:
                'space-between',
            alignItems:
                'center',
            gap: 10,
            marginBottom: 13,
        },

        sectionTitle: {
            color:
                '#111827',
            fontSize: 17,
            fontWeight:
                '800',
        },

        acceptedBadge: {
            backgroundColor:
                '#dcfce7',
            paddingHorizontal:
                9,
            paddingVertical:
                5,
            borderRadius: 20,
        },

        acceptedBadgeText: {
            color:
                '#15803d',
            fontSize: 9,
            fontWeight:
                '800',
        },

        privacyNotice: {
            backgroundColor:
                '#f8fafc',
            padding: 10,
            borderRadius: 9,
            marginBottom: 10,
        },

        privacyText: {
            color:
                '#64748b',
            fontSize: 10,
            lineHeight: 15,
        },

        searchCard: {
            marginTop: 16,
            backgroundColor:
                '#ffffff',
            flexDirection:
                'row',
            alignItems:
                'center',
            borderWidth: 1,
            borderColor:
                '#e5e7eb',
            borderRadius: 13,
            paddingHorizontal: 13,
        },

        searchIcon: {
            fontSize: 16,
        },

        searchInput: {
            flex: 1,
            height: 48,
            paddingHorizontal:
                10,
            color:
                '#111827',
            fontSize: 12,
        },

        clearSearch: {
            color:
                '#6b7280',
            fontSize: 15,
            padding: 5,
        },

        searchCount: {
            color:
                '#6b7280',
            marginTop: 7,
            fontSize: 10,
        },

        loadingBox: {
            paddingVertical:
                70,
            alignItems:
                'center',
        },

        loadingText: {
            color:
                '#6b7280',
            marginTop: 12,
            fontSize: 12,
        },

        emptyCard: {
            backgroundColor:
                '#ffffff',
            borderRadius: 15,
            borderColor:
                '#e5e7eb',
            borderWidth: 1,
            alignItems:
                'center',
            padding: 30,
            marginTop: 16,
        },

        emptyIcon: {
            fontSize: 35,
        },

        emptyTitle: {
            marginTop: 10,
            color:
                '#111827',
            fontWeight:
                '800',
            fontSize: 16,
        },

        emptyText: {
            color:
                '#6b7280',
            fontSize: 11,
            textAlign:
                'center',
            marginVertical: 10,
        },

        recyclerCard: {
            backgroundColor:
                '#ffffff',
            borderWidth: 1.5,
            borderColor:
                '#e5e7eb',
            borderRadius: 16,
            padding: 16,
            marginTop: 13,
        },

        recyclerCardSelected: {
            borderColor:
                '#16a34a',
        },

        recyclerCardAccepted: {
            borderColor:
                '#22c55e',
            borderWidth: 2,
        },

        recyclerHeader: {
            flexDirection:
                'row',
            justifyContent:
                'space-between',
            alignItems:
                'flex-start',
            gap: 10,
        },

        recyclerNameWrap: {
            flex: 1,
            flexDirection:
                'row',
            gap: 10,
            alignItems:
                'center',
        },

        recyclerAvatar: {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor:
                '#dcfce7',
            alignItems:
                'center',
            justifyContent:
                'center',
        },

        recyclerAvatarText: {
            color:
                '#16a34a',
            fontSize: 22,
        },

        recyclerName: {
            color:
                '#111827',
            fontSize: 15,
            fontWeight:
                '800',
        },

        recyclerLocation: {
            color:
                '#6b7280',
            fontSize: 10,
            marginTop: 3,
        },

        authorizedBadge: {
            backgroundColor:
                '#ecfdf5',
            paddingVertical:
                5,
            paddingHorizontal:
                7,
            borderRadius: 15,
        },

        authorizedText: {
            color:
                '#15803d',
            fontSize: 8,
            fontWeight:
                '800',
        },

        scoreSection: {
            marginTop: 16,
        },

        scoreHeader: {
            flexDirection:
                'row',
            justifyContent:
                'space-between',
        },

        scoreLabel: {
            color:
                '#4b5563',
            fontSize: 11,
            fontWeight:
                '600',
        },

        scoreValue: {
            color:
                '#16a34a',
            fontSize: 12,
            fontWeight:
                '900',
        },

        scoreTrack: {
            height: 7,
            backgroundColor:
                '#e5e7eb',
            borderRadius: 4,
            overflow:
                'hidden',
            marginTop: 7,
        },

        scoreFill: {
            height: '100%',
            backgroundColor:
                '#16a34a',
            borderRadius: 4,
        },

        scoreChips: {
            flexDirection:
                'row',
            flexWrap:
                'wrap',
            gap: 6,
            marginTop: 11,
        },

        scoreChip: {
            backgroundColor:
                '#f1f5f9',
            paddingVertical:
                5,
            paddingHorizontal:
                8,
            borderRadius: 15,
        },

        scoreChipText: {
            fontSize: 9,
            color:
                '#475569',
            fontWeight:
                '600',
        },

        stats: {
            flexDirection:
                'row',
            justifyContent:
                'space-between',
            marginTop: 16,
            borderTopWidth: 1,
            borderTopColor:
                '#f1f5f9',
            paddingTop: 14,
            gap: 5,
        },

        stat: {
            flex: 1,
            alignItems:
                'center',
        },

        statIcon: {
            fontSize: 16,
        },

        statLabel: {
            color:
                '#9ca3af',
            fontSize: 8,
            marginTop: 3,
            textAlign:
                'center',
        },

        statValue: {
            color:
                '#111827',
            fontSize: 10,
            fontWeight:
                '700',
            marginTop: 2,
            textAlign:
                'center',
        },

        statSubValue: {
            color:
                '#16a34a',
            fontSize: 8,
            marginTop: 2,
            textAlign:
                'center',
        },

        materials: {
            flexDirection:
                'row',
            flexWrap:
                'wrap',
            gap: 5,
            marginTop: 13,
        },

        materialChip: {
            backgroundColor:
                '#f0fdf4',
            paddingHorizontal:
                8,
            paddingVertical:
                4,
            borderRadius: 15,
        },

        materialText: {
            color:
                '#15803d',
            fontSize: 8,
            fontWeight:
                '600',
        },

        primaryButton: {
            marginTop: 15,
            backgroundColor:
                '#16a34a',
            borderRadius: 10,
            minHeight: 44,
            alignItems:
                'center',
            justifyContent:
                'center',
            paddingHorizontal:
                14,
        },

        primaryButtonText: {
            color:
                '#ffffff',
            fontWeight:
                '800',
            fontSize: 12,
        },

        buttonLoading: {
            flexDirection:
                'row',
            gap: 8,
            alignItems:
                'center',
        },

        disabledButton: {
            opacity: 0.5,
        },

        waitingBox: {
            marginTop: 14,
            padding: 11,
            backgroundColor:
                '#f8fafc',
            borderRadius: 9,
            alignItems:
                'center',
        },

        waitingText: {
            color:
                '#64748b',
            fontSize: 10,
            fontWeight:
                '600',
        },

        offerActionBox: {
            marginTop: 14,
            backgroundColor:
                '#f8fafc',
            borderRadius: 10,
            padding: 13,
            alignItems:
                'center',
        },

        offerSmallLabel: {
            color:
                '#9ca3af',
            fontSize: 8,
            fontWeight:
                '800',
        },

        offerPrice: {
            color:
                '#16a34a',
            fontSize: 20,
            fontWeight:
                '900',
            marginTop: 3,
        },

        offerPayout: {
            color:
                '#6b7280',
            fontSize: 9,
            marginTop: 3,
        },

        offerButtons: {
            flexDirection:
                'row',
            gap: 8,
            marginTop: 11,
        },

        acceptButton: {
            flex: 1,
            backgroundColor:
                '#16a34a',
            minHeight: 40,
            borderRadius: 9,
            alignItems:
                'center',
            justifyContent:
                'center',
        },

        acceptButtonText: {
            color:
                '#ffffff',
            fontSize: 10,
            fontWeight:
                '800',
        },

        rejectButton: {
            flex: 1,
            backgroundColor:
                '#ffffff',
            borderWidth: 1,
            borderColor:
                '#d1d5db',
            minHeight: 40,
            borderRadius: 9,
            alignItems:
                'center',
            justifyContent:
                'center',
        },

        rejectButtonText: {
            color:
                '#4b5563',
            fontSize: 10,
            fontWeight:
                '700',
        },

        unavailableText: {
            color:
                '#6b7280',
            textAlign:
                'center',
            marginTop: 15,
            fontSize: 10,
        },

        acceptedRecyclerBox: {
            marginTop: 14,
            padding: 12,
            backgroundColor:
                '#dcfce7',
            borderRadius: 10,
            alignItems:
                'center',
        },

        acceptedRecyclerTitle: {
            color:
                '#15803d',
            fontSize: 11,
            fontWeight:
                '800',
        },

        acceptedRecyclerRate: {
            color:
                '#15803d',
            fontSize: 17,
            fontWeight:
                '900',
            marginTop: 3,
        },

        acceptedRecyclerPayout: {
            color:
                '#166534',
            fontSize: 9,
            marginTop: 3,
        },

        nextPartBox: {
            marginTop: 8,
            padding: 9,
            borderRadius: 8,
            backgroundColor:
                '#f8fafc',
            alignItems:
                'center',
        },

        nextPartText: {
            color:
                '#64748b',
            fontSize: 9,
        },

        /* OFFER SECTION */

        offerCard: {
            borderTopWidth: 1,
            borderTopColor:
                '#e5e7eb',
            paddingVertical: 13,
        },

        offerRecyclerName: {
            fontWeight:
                '800',
            color:
                '#111827',
            fontSize: 13,
        },

        awaitingText: {
            color:
                '#6b7280',
            fontSize: 10,
            marginTop: 4,
        },

        offerCardPrice: {
            color:
                '#16a34a',
            fontSize: 17,
            fontWeight:
                '900',
            marginTop: 5,
        },

        offerCardPayout: {
            color:
                '#6b7280',
            fontSize: 9,
            marginTop: 2,
        },

        acceptedBanner: {
            backgroundColor:
                '#dcfce7',
            padding: 12,
            borderRadius: 10,
            marginBottom: 10,
        },

        acceptedBannerText: {
            color:
                '#15803d',
            fontSize: 11,
            fontWeight:
                '800',
        },

        acceptedPayout: {
            color:
                '#166534',
            fontSize: 9,
            marginTop: 4,
        },

        contactCard: {
            backgroundColor:
                '#f8fafc',
            borderWidth: 1,
            borderColor:
                '#86efac',
            borderRadius: 10,
            padding: 13,
        },

        contactHeader: {
            flexDirection:
                'row',
            justifyContent:
                'space-between',
            alignItems:
                'center',
            gap: 8,
            marginBottom: 10,
        },

        contactTitle: {
            color:
                '#15803d',
            fontWeight:
                '800',
            fontSize: 12,
        },

        unlockedBadge: {
            backgroundColor:
                '#dcfce7',
            paddingHorizontal:
                7,
            paddingVertical:
                4,
            borderRadius: 12,
        },

        unlockedText: {
            color:
                '#15803d',
            fontSize: 8,
            fontWeight:
                '700',
        },

        contactRow: {
            paddingVertical: 7,
            borderTopWidth: 1,
            borderTopColor:
                '#e5e7eb',
        },

        contactLabel: {
            color:
                '#9ca3af',
            fontSize: 8,
            fontWeight:
                '600',
        },

        contactValue: {
            color:
                '#111827',
            fontSize: 10,
            fontWeight:
                '600',
            marginTop: 2,
        },

        outlineButton: {
            borderWidth: 1,
            borderColor:
                '#d1d5db',
            borderRadius: 9,
            paddingHorizontal:
                15,
            paddingVertical:
                10,
            marginTop: 10,
        },

        outlineButtonText: {
            color:
                '#374151',
            fontWeight:
                '700',
            fontSize: 11,
        },
    });