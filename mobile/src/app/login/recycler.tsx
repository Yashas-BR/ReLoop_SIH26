import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function RecyclerLogin() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recycler Login</Text>

            <Text style={styles.subtitle}>
                Recycler login screen coming next
            </Text>

            <Pressable onPress={() => router.back()}>
                <Text style={styles.link}>Back</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 20,
    },

    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
    },

    subtitle: {
        marginTop: 8,
        fontSize: 15,
        color: '#6b7280',
    },

    link: {
        marginTop: 20,
        color: '#22c55e',
        fontWeight: '600',
    },
});