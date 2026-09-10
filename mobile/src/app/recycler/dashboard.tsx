import {
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { router } from 'expo-router';

import { useAuth } from '../../services/auth';

export default function RecyclerDashboardScreen() {
    const {
        recycler,
        recyclerId,
        signOut,
    } = useAuth();

    const handleLogout = async () => {
        await signOut();
        router.replace('/login/recycler');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.brand}>
                    RELOOP
                </Text>

                <Text style={styles.title}>
                    Recycler Dashboard
                </Text>

                <Text style={styles.subtitle}>
                    Phase 1 authentication is connected.
                </Text>

                <View style={styles.card}>
                    <Text style={styles.label}>
                        Recycler
                    </Text>

                    <Text style={styles.value}>
                        {recycler?.name ?? 'Unknown Recycler'}
                    </Text>

                    <Text style={styles.label}>
                        Recycler ID
                    </Text>

                    <Text style={styles.value}>
                        {recyclerId ?? '—'}
                    </Text>

                    <Text style={styles.label}>
                        Facility
                    </Text>

                    <Text style={styles.value}>
                        {recycler?.facility_location ?? 'Not provided'}
                    </Text>
                </View>

                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        pressed && styles.buttonPressed,
                    ]}
                    onPress={() =>
                        router.push('/recycler/incoming-lots')
                    }
                >
                    <Text style={styles.buttonText}>
                        Incoming Lots
                    </Text>
                </Pressable>

                <Pressable
                    style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.buttonPressed,
                    ]}
                    onPress={handleLogout}
                >
                    <Text style={styles.secondaryButtonText}>
                        Sign Out
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F7F5',
    },

    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 32,
    },

    brand: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2,
        color: '#16794B',
    },

    title: {
        marginTop: 8,
        fontSize: 30,
        fontWeight: '800',
        color: '#173D2D',
    },

    subtitle: {
        marginTop: 8,
        fontSize: 16,
        lineHeight: 23,
        color: '#68756D',
    },

    card: {
        marginTop: 28,
        padding: 20,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
    },

    label: {
        marginTop: 12,
        fontSize: 12,
        fontWeight: '700',
        color: '#728078',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    value: {
        marginTop: 4,
        fontSize: 18,
        fontWeight: '700',
        color: '#173D2D',
    },

    button: {
        marginTop: 28,
        minHeight: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#16794B',
    },

    buttonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    secondaryButton: {
        marginTop: 12,
        minHeight: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#16794B',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },

    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#16794B',
    },

    buttonPressed: {
        opacity: 0.75,
    },
});