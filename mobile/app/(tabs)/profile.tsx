import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
    Card,
    Text,
    Button,
    Appbar,
    Avatar,
    useTheme,
    Divider,
    Modal,
    Portal,
    TextInput,
    Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { designTokens } from '../../theme';
import { updateUserProfile } from '../../services/users';

export default function ProfileScreen() {
    const theme = useTheme();
    const { user, logout, refreshUser } = useAuth();
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarError, setSnackbarError] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [email, setEmail] = useState(user?.email || '');

    // Update form when user changes
    React.useEffect(() => {
        if (user) {
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const handleLogout = async () => {
        await logout();
    };

    const openEditModal = () => {
        setEditModalVisible(true);
    };

    const closeEditModal = () => {
        setEditModalVisible(false);
        // Reset form to current user values
        if (user) {
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
            setEmail(user.email || '');
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setLoading(true);
        try {
            await updateUserProfile(user.id, {
                first_name: firstName.trim() || null,
                last_name: lastName.trim() || null,
                email: email.trim(),
            });

            // Refresh user data
            await refreshUser();

            setSnackbarMessage('Profile updated successfully');
            setSnackbarError(false);
            setSnackbarVisible(true);
            setEditModalVisible(false);
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to update profile. Please try again.';
            setSnackbarMessage(errorMessage);
            setSnackbarError(true);
            setSnackbarVisible(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <View
                style={[
                    styles.container,
                    { backgroundColor: theme.colors.background },
                ]}
            >
                {/* <Appbar.Header elevated>
                    <Appbar.Content
                        title="Profile"
                        titleStyle={styles.headerTitle}
                    />
                    <Appbar.Action
                        icon="pencil"
                        onPress={openEditModal}
                        iconColor={theme.colors.primary}
                    />
                </Appbar.Header> */}

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Card style={styles.profileCard} mode="elevated">
                        <Card.Content style={styles.profileContent}>
                            <View style={styles.avatarContainer}>
                                <Avatar.Text
                                    size={80}
                                    label={
                                        user?.username
                                            ?.charAt(0)
                                            .toUpperCase() || 'U'
                                    }
                                    style={[
                                        styles.avatar,
                                        {
                                            backgroundColor:
                                                theme.colors.primary,
                                        },
                                    ]}
                                />
                            </View>
                            <Text
                                variant="headlineSmall"
                                style={styles.username}
                            >
                                {user?.username || 'User'}
                            </Text>
                            {user?.email && (
                                <Text variant="bodyMedium" style={styles.email}>
                                    {user.email}
                                </Text>
                            )}
                            {user?.role && (
                                <View style={styles.roleContainer}>{/* 
                                    <MaterialCommunityIcons
                                        name={
                                            user.role.name === 'admin'
                                                ? 'shield-account'
                                                : 'account'
                                        }
                                        size={16}
                                        color={theme.colors.primary} */}
                                    />
                                    <Text
                                        variant="bodySmall"
                                        style={styles.role}
                                    >
                                        {user.role.name
                                            .charAt(0)
                                            .toUpperCase() +
                                            user.role.name.slice(1)}
                                    </Text>
                                </View>
                            )}
                        </Card.Content>
                    </Card>

                    <Card style={styles.card} mode="elevated">
                        <Card.Content>
                            <Text
                                variant="titleMedium"
                                style={styles.sectionTitle}
                            >
                                Account info
                            </Text>
                            <Divider style={styles.divider} />
                            {user?.first_name && user?.last_name && (
                                <View style={styles.infoRow}>
                                    <Text
                                        variant="bodyMedium"
                                        style={styles.infoLabel}
                                    >
                                        Name:
                                    </Text>
                                    <Text
                                        variant="bodyMedium"
                                        style={styles.infoValue}
                                    >
                                        {user.first_name} {user.last_name}
                                    </Text>
                                </View>
                            )}
                            {user?.email && (
                                <View style={styles.infoRow}>
                                    <Text
                                        variant="bodyMedium"
                                        style={styles.infoLabel}
                                    >
                                        Email:
                                    </Text>
                                    <Text
                                        variant="bodyMedium"
                                        style={styles.infoValue}
                                    >
                                        {user.email}
                                    </Text>
                                </View>
                            )}
                        </Card.Content>
                    </Card>

                    <Button
                        mode="contained"
                        onPress={handleLogout}
                        style={styles.logoutButton}
                        contentStyle={styles.logoutButtonContent}
                        labelStyle={styles.logoutButtonLabel}
                        /* icon="logout" */
                        buttonColor={theme.colors.primary}
                    >
                        Logout
                    </Button>
                </ScrollView>

                <Portal>
                    <Modal
                        visible={editModalVisible}
                        onDismiss={closeEditModal}
                        contentContainerStyle={[
                            styles.modalContainer,
                            { backgroundColor: theme.colors.surface },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Text
                                variant="headlineSmall"
                                style={styles.modalTitle}
                            >
                                Edit Profile
                            </Text>
                        </View>

                        <View style={styles.modalContent}>
                            <TextInput
                                label="First Name"
                                value={firstName}
                                onChangeText={setFirstName}
                                mode="outlined"
                                style={styles.input}
                                left={<TextInput.Icon icon="account" />}
                            />

                            <TextInput
                                label="Last Name"
                                value={lastName}
                                onChangeText={setLastName}
                                mode="outlined"
                                style={styles.input}
                                left={<TextInput.Icon icon="account" />}
                            />

                            <TextInput
                                label="Email"
                                value={email}
                                onChangeText={setEmail}
                                mode="outlined"
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                left={<TextInput.Icon icon="email" />}
                            />

                            <View style={styles.modalActions}>
                                <Button
                                    mode="outlined"
                                    onPress={closeEditModal}
                                    style={styles.cancelButton}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={handleSave}
                                    style={styles.saveButton}
                                    loading={loading}
                                    disabled={loading}
                                    buttonColor={theme.colors.primary}
                                >
                                    Save
                                </Button>
                            </View>
                        </View>
                    </Modal>
                </Portal>

                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={3000}
                    style={snackbarError ? styles.errorSnackbar : undefined}
                >
                    {snackbarMessage}
                </Snackbar>
            </View>
        </ProtectedRoute>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: designTokens.spacing.xl,
        paddingBottom: designTokens.spacing.xxxl,
    },
    headerTitle: {
        fontWeight: '600',
        fontSize: 20,
    },
    profileCard: {
        marginBottom: designTokens.spacing.xl,
        borderRadius: designTokens.borderRadius.lg,
    },
    profileContent: {
        padding: designTokens.spacing.xxl,
        alignItems: 'center',
    },
    avatarContainer: {
        marginBottom: designTokens.spacing.lg,
    },
    avatar: {
        alignSelf: 'center',
    },
    username: {
        fontWeight: '600',
        marginBottom: designTokens.spacing.xs,
        textAlign: 'center',
    },
    email: {
        opacity: 0.7,
        marginBottom: designTokens.spacing.sm,
        textAlign: 'center',
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: designTokens.spacing.xs,
        marginTop: designTokens.spacing.xs,
    },
    role: {
        fontWeight: '500',
        color: designTokens.app.primary,
    },
    card: {
        marginBottom: designTokens.spacing.xl,
        borderRadius: designTokens.borderRadius.lg,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: designTokens.spacing.md,
    },
    divider: {
        marginBottom: designTokens.spacing.lg,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: designTokens.spacing.md,
    },
    infoLabel: {
        fontWeight: '500',
        opacity: 0.7,
    },
    infoValue: {
        fontWeight: '400',
    },
    logoutButton: {
        marginTop: designTokens.spacing.sm,
        borderRadius: designTokens.borderRadius.md,
    },
    logoutButtonContent: {
        paddingVertical: 8,
    },
    logoutButtonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalContainer: {
        margin: designTokens.spacing.xl,
        padding: designTokens.spacing.xl,
        borderRadius: designTokens.borderRadius.lg,
    },
    modalHeader: {
        marginBottom: designTokens.spacing.lg,
    },
    modalTitle: {
        fontWeight: '600',
    },
    modalContent: {
        gap: designTokens.spacing.md,
    },
    input: {
        marginBottom: designTokens.spacing.md,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: designTokens.spacing.md,
        marginTop: designTokens.spacing.md,
    },
    cancelButton: {
        flex: 1,
    },
    saveButton: {
        flex: 1,
    },
    errorSnackbar: {
        backgroundColor: designTokens.semantic.error,
    },
});
