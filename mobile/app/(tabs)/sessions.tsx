import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ProtectedRoute from '../../components/ProtectedRoute';
import { getSessions, Session } from '../../services/sessions';
import { designTokens } from '../../theme';

export default function SessionsScreen() {
    return (
        <ProtectedRoute>
            <SessionsContent />
        </ProtectedRoute>
    );
}

function SessionsContent() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSessions();
            setSessions(data);
        } catch (err) {
            setError('Failed to load sessions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={designTokens.app.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadSessions}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Sessions</Text>
            
            {sessions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No Sessions yet</Text>
                    <Text style={styles.emptySubtext}>Create your first session to get started!</Text>
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.sessionCard}
                            onPress={() => router.push(`/sessions/${item.id}`)}
                        >
                            <Text style={styles.sessionName}>{item.name}</Text>
                            {item.description && (
                                <Text style={styles.sessionDescription} numberOfLines={2}>
                                    {item.description}
                                </Text>
                            )}
                            {item.session_type && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{item.session_type}</Text>
                                </View>
                            )}
                            <View style={styles.statsRow}>
                                <Text style={styles.statText}>
                                    {item.sets.length} set(s)
                                </Text>
                                <Text style={styles.statText}>
                                    {item.graph_images.length} graphs
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        padding: 20,
        paddingBottom: 10,
        color: designTokens.text.onSurface,
    },
    listContent: {
        padding: 16,
    },
    sessionCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sessionName: {
        fontSize: 20,
        fontWeight: '600',
        color: designTokens.text.onSurface,
        marginBottom: 4,
    },
    sessionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: designTokens.app.primary + '20',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
    },
    badgeText: {
        fontSize: 12,
        color: designTokens.app.primary,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 4,
    },
    statText: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#e74c3c',
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: designTokens.app.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
