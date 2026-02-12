import { Component, ErrorInfo, ReactNode } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { designTokens } from '../theme';
import { Text, Button } from 'react-native-paper';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error);
        console.error('Error info:', errorInfo);
        console.error('Error stack:', error.stack);
        console.error('Component stack:', errorInfo.componentStack);

        this.setState({
            error,
            errorInfo,
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.content}
                    >
                        <Text variant="headlineSmall" style={styles.title}>
                            Something went wrong
                        </Text>
                        <Text variant="bodyMedium" style={styles.errorText}>
                            {this.state.error?.toString()}
                        </Text>
                        {this.state.error?.stack && (
                            <View style={styles.stackContainer}>
                                <Text
                                    variant="labelLarge"
                                    style={styles.stackTitle}
                                >
                                    Stack Trace:
                                </Text>
                                <Text
                                    variant="bodySmall"
                                    style={styles.stackText}
                                >
                                    {this.state.error.stack}
                                </Text>
                            </View>
                        )}
                        {this.state.errorInfo?.componentStack && (
                            <View style={styles.stackContainer}>
                                <Text
                                    variant="labelLarge"
                                    style={styles.stackTitle}
                                >
                                    Component Stack:
                                </Text>
                                <Text
                                    variant="bodySmall"
                                    style={styles.stackText}
                                >
                                    {this.state.errorInfo.componentStack}
                                </Text>
                            </View>
                        )}
                        <Button
                            mode="contained"
                            onPress={() => {
                                this.setState({
                                    hasError: false,
                                    error: null,
                                    errorInfo: null,
                                });
                            }}
                            style={styles.button}
                        >
                            Try Again
                        </Button>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: designTokens.surface.white,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: designTokens.spacing.xl,
    },
    title: {
        marginBottom: designTokens.spacing.lg,
        color: designTokens.semantic.error,
    },
    errorText: {
        marginBottom: designTokens.spacing.lg,
        color: designTokens.text.darkGray,
    },
    stackContainer: {
        marginBottom: designTokens.spacing.lg,
        padding: designTokens.spacing.md,
        backgroundColor: designTokens.surface.lightGray,
        borderRadius: designTokens.borderRadius.sm,
    },
    stackTitle: {
        marginBottom: designTokens.spacing.sm,
        fontWeight: 'bold',
    },
    stackText: {
        fontFamily: 'monospace',
        fontSize: 10,
    },
    button: {
        marginTop: designTokens.spacing.lg,
    },
});
