import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Appbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { designTokens } from '../../../theme';

export default function FileDetailScreen() {
    const router = useRouter();

    return (
        <ProtectedRoute>
            <View style={styles.container}>
                <Appbar.Header>
                    <Appbar.BackAction onPress={() => router.back()} />
                    <Appbar.Content title="File" />
                </Appbar.Header>
                <View style={styles.content}>
                    <Text variant="headlineSmall" style={styles.message}>
                        To Be Implemented
                    </Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        File functionality will be implemented by students.
                    </Text>
                </View>
            </View>
        </ProtectedRoute>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: designTokens.spacing.xl,
    },
    message: { marginBottom: designTokens.spacing.sm },
    subtitle: { opacity: 0.7, textAlign: 'center' },
});
