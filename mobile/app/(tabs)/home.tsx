import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { designTokens } from '../../theme';

export default function HomeScreen() {
    const theme = useTheme();
    const { user } = useAuth();

    return (
        <SafeAreaView
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text
                            variant="headlineLarge"
                            style={[
                                styles.title,
                                { color: theme.colors.primary },
                            ]}
                        >
                        </Text>
                        <Text
                            variant="bodyLarge"
                            style={[
                                styles.subtitle,
                                { color: theme.colors.onSurfaceVariant },
                            ]}
                        >
                        </Text>
                    </View>

                    {user && (
                        <View style={styles.welcomeSection}>
                            <Text
                                variant="titleMedium"
                                style={[
                                    styles.welcomeText,
                                    { color: theme.colors.onSurface },
                                ]}
                            >
                                Welcome back, {user.first_name || user.username}
                                !
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: designTokens.spacing.xxl,
    },
    content: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        marginBottom: designTokens.spacing.md,
        textAlign: 'center',
        fontWeight: '700',
        fontSize: 32,
    },
    subtitle: {
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 22,
        fontSize: 18,
    },
    welcomeSection: {
        marginTop: designTokens.spacing.xl,
        alignItems: 'center',
    },
    welcomeText: {
        textAlign: 'center',
        fontWeight: '500',
    },
});
