import { StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { designTokens } from '../theme';

interface InfoBadgeProps {
    icon: string;
    text: string;
    style?: object;
}

export default function InfoBadge({ icon, text, style }: InfoBadgeProps) {
    const theme = useTheme();

    return (
        <Chip
            icon={icon}
            style={[
                styles.badge,
                { backgroundColor: theme.colors.surfaceVariant },
                style,
            ]}
            textStyle={[
                styles.badgeText,
                { color: theme.colors.onSurfaceVariant },
            ]}
        >
            {text}
        </Chip>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        minHeight: 28,
        paddingVertical: designTokens.spacing.xs,
        paddingHorizontal: designTokens.spacing.sm,
    },
    badgeText: {
        fontSize: 12,
        lineHeight: 16,
    },
});
