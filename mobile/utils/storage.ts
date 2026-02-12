import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage utility that works on both native and web platforms
 * Uses SecureStore on native, localStorage on web
 */
export async function getItem(key: string): Promise<string | null> {
    try {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        } else {
            return await SecureStore.getItemAsync(key);
        }
    } catch (error) {
        console.error('Error getting item from storage:', error);
        return null;
    }
}

export async function setItem(key: string, value: string): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    } catch (error) {
        console.error('Error setting item in storage:', error);
        throw error;
    }
}

export async function removeItem(key: string): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    } catch (error) {
        // Ignore errors when removing items
        console.warn('Error removing item from storage:', error);
    }
}
