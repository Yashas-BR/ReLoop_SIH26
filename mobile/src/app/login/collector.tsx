import { router } from 'expo-router';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function CollectorLogin() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Collector Login</Text>

            <Pressable
                style={styles.button}
                onPress={() => router.back()}
            >
                <Text style={styles.buttonText}>Go Back</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#f8fafc',
    },

    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 20,
    },

    button: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 10,
    },

    buttonText: {
        color: 'white',
        fontWeight: '700',
    },
});