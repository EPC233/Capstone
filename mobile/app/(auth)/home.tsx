import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designTokens } from '../../theme';

export default function HomeScreen() {
    const router = useRouter();
    const theme = useTheme();

    const handleGetStarted = () => {
        router.push('/(auth)/login');
    };

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
                            Fitness Tracker
                        </Text>
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleGetStarted}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                    >
                        Login
                    </Button>
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
    button: {
        marginTop: 10,
        borderRadius: designTokens.borderRadius.md,
        paddingVertical: designTokens.spacing.xs,
        minWidth: 200,
    },
    buttonContent: {
        paddingVertical: 8,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
});
