import { Table, Group, Text, Badge, Avatar } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { getAvatarUrl, getRoleBadgeColor } from '../../utils/userUtils';
import { designTokens } from '../../designTokens';
import SortableTableHeader from '../ui/SortableTableHeader';
import type { User } from '../../types/api';
import type { SortDirection } from '../../hooks/useTableSort';

interface UserTableViewProps {
    users: User[];
    userGroups: Record<number, string[]>;
    API_URL: string;
    onUserClick: (user: User) => void;
    sortColumn: string | null;
    sortDirection: SortDirection;
    onSort: (column: string) => void;
}

/**
 * Table view for users list
 */
export default function UserTableView({
    users,
    userGroups,
    API_URL,
    onUserClick,
    sortColumn,
    sortDirection,
    onSort,
}: UserTableViewProps) {
    const rows = users.map((user, index) => {
        const userGroupNames = userGroups[user.id] || [];
        const avatarUrl = getAvatarUrl(user.avatar_url, API_URL);
        return (
            <Table.Tr
                key={user.id}
                style={{
                    cursor: 'pointer',
                    backgroundColor: index % 2 === 0 ? 'white' : 'transparent',
                }}
                onClick={() => onUserClick(user)}
            >
                <Table.Td>
                    <Group gap="sm">
                        <Avatar
                            src={avatarUrl || undefined}
                            size={40}
                            radius="md"
                        >
                            <IconUser size={20} />
                        </Avatar>
                        <Text>{user.username}</Text>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Text size="sm">{user.email}</Text>
                </Table.Td>
                <Table.Td>
                    <Badge
                        style={{
                            backgroundColor: getRoleBadgeColor(
                                user.role?.name || 'user'
                            ),
                            color: designTokens.roles.textOnColored,
                        }}
                        variant="light"
                    >
                        {user.role?.name || 'user'}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    {userGroupNames.length > 0 ? (
                        <Text size="sm">{userGroupNames.join(', ')}</Text>
                    ) : (
                        <Text size="sm" c="dimmed">
                            No groups
                        </Text>
                    )}
                </Table.Td>
                <Table.Td>
                    <Text size="sm">
                        {user.is_active ? 'Active' : 'Disabled'}
                    </Text>
                </Table.Td>
            </Table.Tr>
        );
    });

    return (
        <Table highlightOnHover>
            <Table.Thead>
                <Table.Tr>
                    <SortableTableHeader
                        column="username"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={onSort}
                    >
                        User
                    </SortableTableHeader>
                    <SortableTableHeader
                        column="email"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={onSort}
                    >
                        Email
                    </SortableTableHeader>
                    <SortableTableHeader
                        column="role.name"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={onSort}
                    >
                        Role
                    </SortableTableHeader>
                    <Table.Th>Groups</Table.Th>
                    <SortableTableHeader
                        column="is_active"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={onSort}
                    >
                        Active
                    </SortableTableHeader>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
        </Table>
    );
}
