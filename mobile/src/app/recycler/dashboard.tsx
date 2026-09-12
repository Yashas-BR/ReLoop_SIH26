import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    useFocusEffect,
    router,
} from 'expo-router';

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    getAvailableLots,
    getLotsByRecycler,
    getRecycler,
} from '../../api/client';

import {
    LotCard,
} from '../../components/recycler/LotCard';

import {
    StatCard,
} from '../../components/recycler/StatCard';

import {
    StatusBadge,
} from '../../components/recycler/StatusBadge';

import {
    LanguageSelector,
} from '../../components/LanguageSelector';

import {
    useAuth,
} from '../../services/auth';

import type {
    Recycler,
} from '../../types/auth';

import type {
    RecyclerLot,
} from '../../types/recycler-dashboard';

import {
    useTranslation,
} from '../../../i18n/config';

import { BrandedHeader } from '../../components/branding/BrandedHeader';

export default function RecyclerDashboardScreen() {
    const {
        recyclerId,
        recycler:
        storedRecycler,

        updateRecycler,

        signOut,
    } = useAuth();

    const {
        t,
        lang,
    } =
        useTranslation();

    const [
        recycler,
        setRecycler,
    ] =
        useState<Recycler | null>(
            storedRecycler,
        );

    const [
        lots,
        setLots,
    ] =
        useState<RecyclerLot[]>(
            [],
        );

    const [
        newLots,
        setNewLots,
    ] = useState(0);

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

    const loadDashboard =
        useCallback(
            async (
                refresh = false,
            ) => {
                if (!recyclerId) {
                    return;
                }

                refresh
                    ? setRefreshing(true)
                    : setLoading(true);

                setError('');

                try {
                    const [
                        recyclerResponse,
                        lotsResponse,
                        availableResponse,
                    ] =
                        await Promise.allSettled(
                            [
                                getRecycler(
                                    recyclerId,
                                ),

                                getLotsByRecycler(
                                    recyclerId,
                                ),

                                getAvailableLots(
                                    recyclerId,
                                ),
                            ],
                        );

                    if (
                        recyclerResponse.status ===
                        'fulfilled'
                    ) {
                        const nextRecycler =
                            recyclerResponse
                                .value.data;

                        setRecycler(
                            nextRecycler,
                        );

                        await updateRecycler(
                            nextRecycler,
                        );
                    }

                    if (
                        lotsResponse.status ===
                        'fulfilled'
                    ) {
                        setLots(
                            Array.isArray(
                                lotsResponse
                                    .value.data,
                            )
                                ? lotsResponse
                                    .value.data
                                : [],
                        );
                    } else {
                        setError(
                            t(
                                'recyclerDash.loadError',
                            ),
                        );
                    }

                    if (
                        availableResponse.status ===
                        'fulfilled'
                    ) {
                        setNewLots(
                            Array.isArray(
                                availableResponse
                                    .value.data,
                            )
                                ? availableResponse
                                    .value.data
                                    .length
                                : 0,
                        );
                    }
                } catch (loadError) {
                    console.error(
                        '[RecyclerDashboard]',
                        loadError,
                    );

                    setError(
                        t(
                            'recyclerDash.loadError',
                        ),
                    );
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            [
                recyclerId,
                t,
                updateRecycler,
            ],
        );

    useFocusEffect(
        useCallback(() => {
            void loadDashboard();
        }, [loadDashboard]),
    );

    const pending =
        useMemo(
            () =>
                lots.filter(
                    lot =>
                        lot.transaction_status ===
                        'matched',
                ).length,
            [lots],
        );

    const confirmed =
        useMemo(
            () =>
                lots.filter(
                    lot =>
                        lot.transaction_status ===
                        'confirmed' ||
                        lot.transaction_status ===
                        'handed_over',
                ).length,
            [lots],
        );

    const recentLots =
        useMemo(
            () =>
                [...lots]
                    .sort(
                        (
                            first,
                            second,
                        ) =>
                            new Date(
                                second.created_at ??
                                0,
                            ).getTime() -
                            new Date(
                                first.created_at ??
                                0,
                            ).getTime(),
                    )
                    .slice(0, 5),
            [lots],
        );

    async function handleSignOut() {
        await signOut();

        router.replace(
            '/login/recycler',
        );
    }

    if (
        loading &&
        !recycler
    ) {
        return (
            <View
                style={
                    styles.loadingScreen
                }
            >
                <ActivityIndicator
                    size="large"
                />

                <Text
                    style={
                        styles.loadingText
                    }
                >
                    {t(
                        'common.loading',
                    )}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={
                styles.screen
            }
            contentContainerStyle={
                styles.content
            }
            refreshControl={
                <RefreshControl
                    refreshing={
                        refreshing
                    }
                    onRefresh={() =>
                        void loadDashboard(
                            true,
                        )
                    }
                />
            }
        >
            <LanguageSelector />

            <BrandedHeader
                title={recycler?.name ?? t('recyclerDash.title')}
                subtitle={
                    <View>
                        <Text style={styles.subtitle}>
                            {recycler?.facility_location ?? t('recyclerDash.subtitle')}
                        </Text>
                        <View style={styles.badges}>
                            <StatusBadge status={recycler?.account_status ?? 'active'} />
                            <StatusBadge status={recycler?.authorization_status} />
                        </View>
                    </View>
                }
                rightElement={
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push('/recycler/profile')}
                        style={({ pressed }) => [
                            styles.profileButton,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text style={styles.profileButtonText}>
                            {t('recyclerProfile.title')}
                        </Text>
                    </Pressable>
                }
            />

            {!!error && (
                <View
                    style={
                        styles.errorBox
                    }
                >
                    <Text
                        style={
                            styles.errorText
                        }
                    >
                        {error}
                    </Text>

                    <Pressable
                        onPress={() =>
                            void loadDashboard()
                        }
                    >
                        <Text
                            style={
                                styles.retry
                            }
                        >
                            {t(
                                'common.retry',
                            )}
                        </Text>
                    </Pressable>
                </View>
            )}

            <View
                style={
                    styles.stats
                }
            >
                <StatCard
                    label={t(
                        'recyclerDash.totalLots',
                    )}
                    value={
                        newLots
                    }
                    subtitle={t(
                        'incomingLots.title',
                    )}
                    onPress={() => router.push('/recycler/incoming-lots')}
                />

                <StatCard
                    label={t(
                        'recyclerDash.totalPending',
                    )}
                    value={
                        pending
                    }
                    subtitle={t(
                        'incomingLots.filterPending',
                    )}
                />

                <StatCard
                    label={t(
                        'recyclerDash.totalConfirmed',
                    )}
                    value={
                        confirmed
                    }
                    subtitle={t(
                        'common.completed',
                    )}
                    accent
                />

                <StatCard
                    label={t(
                        'recyclerProfile.materials',
                    )}
                    value={
                        recycler
                            ?.materials_accepted
                            ?.length ??
                        0
                    }
                    subtitle={t(
                        'recyclerProfile.materialsHint',
                    )}
                />
            </View>

            {newLots > 0 && (
                <View
                    style={
                        styles.newLotsCard
                    }
                >
                    <View
                        style={{ flex: 1 }}
                    >
                        <Text
                            style={
                                styles.newLotsTitle
                            }
                        >
                            {t(
                                'recyclerDash.newLotsAvailable',
                                { count: newLots }
                            )}
                        </Text>

                        <Text
                            style={
                                styles.newLotsDescription
                            }
                        >
                            {t(
                                'recyclerDash.newLotsDesc',
                            )}
                        </Text>
                    </View>

                    <Pressable
                        onPress={() =>
                            router.push(
                                '/recycler/incoming-lots',
                            )
                        }
                        style={
                            styles.quoteButton
                        }
                    >
                        <Text
                            style={
                                styles.quoteButtonText
                            }
                        >
                            {t(
                                'recyclerDash.viewLots',
                            )}
                        </Text>
                    </Pressable>
                </View>
            )}

            <Text
                style={
                    styles.sectionTitle
                }
            >
                {t(
                    'dashboard.quickActions',
                )}
            </Text>

            <View
                style={
                    styles.actions
                }
            >
                <QuickAction
                    title={t(
                        'recyclerDash.incomingLots',
                    )}
                    description={t(
                        'recyclerDash.incomingLotsDesc',
                    )}
                    onPress={() =>
                        router.push(
                            '/recycler/incoming-lots',
                        )
                    }
                />

                <QuickAction
                  title={t(
                    'recyclerActivity.title',
                  )}
                  description={t(
                    'recyclerActivity.dashboardDescription',
                  )}
                  onPress={() =>
                    router.push(
                      '/recycler/activity' as any,
                    )
                  }
                />

                <QuickAction
                    title={t(
                        'recyclerDash.myProfile',
                    )}
                    description={t(
                        'recyclerDash.myProfileDesc',
                    )}
                    onPress={() =>
                        router.push('/recycler/profile')
                    }
                />

                <QuickAction
                    title={t(
                        'recyclerScan.title',
                    )}
                    description={t(
                        'recyclerScan.dashboardDescription',
                    )}
                    onPress={() =>
                        router.push(
                            '/recycler/scan' as any,
                        )
                    }
                />

                <QuickAction
                    title={t(
                        'recyclerMap.title',
                    )}
                    description={t(
                        'recyclerMap.dashboardDescription',
                    )}
                    onPress={() =>
                        router.push(
                            '/recycler/map' as any,
                        )
                    }
                />
            </View>

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
                    {t(
                        'recyclerDash.incomingLots',
                    )}
                </Text>

                <Pressable
                    onPress={() =>
                        router.push(
                            '/recycler/incoming-lots',
                        )
                    }
                >
                    <Text
                        style={
                            styles.viewAll
                        }
                    >
                        {t(
                            'recyclerDash.viewAll',
                        )}
                    </Text>
                </Pressable>
            </View>

            {recentLots.length ===
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
                        {t(
                            'incomingLots.noLots',
                        )}
                    </Text>

                    <Text
                        style={
                            styles.emptyText
                        }
                    >
                        {t(
                            'incomingLots.noLotsDesc',
                        )}
                    </Text>
                </View>
            ) : (
                <View
                    style={
                        styles.lotList
                    }
                >
                    {recentLots.map(
                        lot => (
                            <LotCard
                                key={
                                    lot.lot_id
                                }
                                lot={lot}
                                language={
                                    lang
                                }
                                kgLabel={t(
                                    'common.kg',
                                )}
                                onPress={() =>
                                    router.push({
                                        pathname: '/recycler/lot/[id]',
                                        params: {
                                            id: lot.lot_id,
                                        },
                                    })
                                }
                            />
                        ),
                    )}
                </View>
            )}

            <Pressable
                accessibilityRole="button"
                onPress={
                    handleSignOut
                }
                style={({ pressed }) => [
                    styles.signOut,

                    pressed &&
                    styles.pressed,
                ]}
            >
                <Text
                    style={
                        styles.signOutText
                    }
                >
                    {t('common.signOut')}
                </Text>
            </Pressable>
        </ScrollView>
    );
}

function QuickAction({
    title,
    description,
    onPress,
}: {
    title: string;

    description: string;

    onPress:
    () => void;
}) {
    return (
        <Pressable
            onPress={
                onPress
            }
            style={({ pressed }) => [
                styles.actionCard,

                pressed &&
                styles.pressed,
            ]}
        >
            <Text
                style={
                    styles.actionTitle
                }
            >
                {title}
            </Text>

            <Text
                style={
                    styles.actionDescription
                }
            >
                {description}
            </Text>

            <Text
                style={
                    styles.actionArrow
                }
            >
                →
            </Text>
        </Pressable>
    );
}

const styles =
    StyleSheet.create({
        pressed: {
            opacity: 0.7,
        },
        screen: {
            flex: 1,

            backgroundColor:
                '#F5F8F6',
        },

        content: {
            padding: 20,

            paddingTop: 50,

            paddingBottom: 60,
        },

        loadingScreen: {
            flex: 1,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                '#F5F8F6',
        },

        loadingText: {
            marginTop: 12,

            color: '#68756D',
        },

        header: {
            marginTop: 24,

            flexDirection:
                'row',

            alignItems:
                'flex-start',

            justifyContent:
                'space-between',

            gap: 12,
        },

        headerText: {
            flex: 1,
        },

        eyebrow: {
            fontSize: 12,

            fontWeight: '900',

            letterSpacing: 2,

            color: '#16794B',
        },

        title: {
            marginTop: 6,

            fontSize: 30,

            lineHeight: 36,

            fontWeight: '900',

            color: '#173D2D',
        },

        subtitle: {
            marginTop: 5,

            fontSize: 14,

            color: '#68756D',
        },

        badges: {
            marginTop: 12,

            flexDirection:
                'row',

            flexWrap: 'wrap',

            gap: 7,
        },

        profileButton: {
            paddingHorizontal: 13,

            paddingVertical: 10,

            borderRadius: 12,

            borderWidth: 1,

            borderColor:
                '#16794B',

            backgroundColor:
                '#FFFFFF',
        },

        profileButtonText: {
            fontSize: 12,

            fontWeight: '800',

            color: '#16794B',
        },

        stats: {
            marginTop: 25,

            flexDirection:
                'row',

            flexWrap: 'wrap',

            justifyContent:
                'space-between',

            gap: 12,
        },

        errorBox: {
            marginTop: 20,

            padding: 14,

            borderRadius: 14,

            backgroundColor:
                '#FFF0EE',
        },

        errorText: {
            color: '#A12D25',

            fontWeight: '600',
        },

        retry: {
            marginTop: 8,

            color: '#16794B',

            fontWeight: '800',
        },

        newLotsCard: {
            marginTop: 25,

            padding: 18,

            borderRadius: 18,

            backgroundColor:
                '#E6F5EC',

            flexDirection:
                'row',

            alignItems:
                'center',

            gap: 12,
        },

        newLotsTitle: {
            fontSize: 16,

            fontWeight: '900',

            color: '#173D2D',
        },

        newLotsDescription: {
            marginTop: 5,

            fontSize: 13,

            lineHeight: 19,

            color: '#597067',
        },

        quoteButton: {
            paddingHorizontal: 13,

            paddingVertical: 10,

            borderRadius: 12,

            backgroundColor:
                '#16794B',
        },

        quoteButtonText: {
            fontSize: 12,

            fontWeight: '800',

            color: '#FFFFFF',
        },

        sectionTitle: {
            marginTop: 28,

            fontSize: 20,

            fontWeight: '900',

            color: '#173D2D',
        },

        actions: {
            marginTop: 13,

            gap: 10,
        },

        actionCard: {
            padding: 17,

            borderRadius: 18,

            backgroundColor:
                '#FFFFFF',

            borderWidth: 1,

            borderColor:
                '#E1E8E3',
        },

        actionTitle: {
            fontSize: 16,

            fontWeight: '800',

            color: '#173D2D',
        },

        actionDescription: {
            marginTop: 4,

            fontSize: 13,

            color: '#718078',
        },

        actionArrow: {
            position:
                'absolute',

            right: 17,

            top: 23,

            fontSize: 20,

            color: '#16794B',
        },

        sectionHeader: {
            flexDirection:
                'row',

            alignItems:
                'flex-end',

            justifyContent:
                'space-between',
        },

        viewAll: {
            color: '#16794B',

            fontWeight: '800',
        },

        lotList: {
            marginTop: 13,

            gap: 11,
        },

        emptyCard: {
            marginTop: 13,

            padding: 26,

            borderRadius: 18,

            backgroundColor:
                '#FFFFFF',

            alignItems:
                'center',
        },

        emptyTitle: {
            fontSize: 17,

            fontWeight: '800',

            color: '#173D2D',
        },

        emptyText: {
            marginTop: 7,

            textAlign: 'center',

            lineHeight: 20,

            color: '#718078',
        },

        signOut: {
            marginTop: 34,

            minHeight: 50,

            alignItems:
                'center',

            justifyContent:
                'center',

            borderRadius: 14,

            borderWidth: 1,

            borderColor:
                '#D5DDD8',
        },

        signOutText: {
            fontWeight: '800',

            color: '#6B746F',
        },
    });