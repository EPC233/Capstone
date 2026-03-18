import {
    Title,
    Text,
    Stack,
    Card,
    Group,
    Badge,
    ActionIcon,
    Table,
    Anchor,
    Divider,
} from '@mantine/core';
import { IconPhoto, IconDownload, IconTrash } from '@tabler/icons-react';
import type { GraphImage } from '../../services/sessions';
import { formatDate, formatFileSize, getDownloadUrl } from './sessionUtils';

interface GraphImagesCardProps {
    graphImages: GraphImage[];
    actionLoading: string | null;
    onDeleteGraphImage: (imageId: number) => void;
}

export default function GraphImagesCard({
    graphImages,
    actionLoading,
    onDeleteGraphImage,
}: GraphImagesCardProps) {
    return (
        <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
                <Group justify="space-between">
                    <Group gap="sm">
                        <IconPhoto size={20} />
                        <Title order={4}>Graph Images</Title>
                    </Group>
                    <Badge>{graphImages.length || 0} image(s)</Badge>
                </Group>
                <Divider />
                {graphImages.length > 0 ? (
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>File Name</Table.Th>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Size</Table.Th>
                                <Table.Th>Description</Table.Th>
                                <Table.Th>Uploaded</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {graphImages.map((image: GraphImage) => (
                                <Table.Tr key={image.id}>
                                    <Table.Td>
                                        <Anchor
                                            href={getDownloadUrl(image.file_path)}
                                            target="_blank"
                                        >
                                            {image.file_name}
                                        </Anchor>
                                    </Table.Td>
                                    <Table.Td>{image.image_type || '-'}</Table.Td>
                                    <Table.Td>{formatFileSize(image.file_size)}</Table.Td>
                                    <Table.Td>{image.description || '-'}</Table.Td>
                                    <Table.Td>{formatDate(image.created_at)}</Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <ActionIcon
                                                component="a"
                                                href={getDownloadUrl(image.file_path)}
                                                target="_blank"
                                                variant="subtle"
                                                color="blue"
                                                title="Download"
                                            >
                                                <IconDownload size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                color="red"
                                                variant="subtle"
                                                onClick={() => onDeleteGraphImage(image.id)}
                                                loading={actionLoading === `graph-${image.id}`}
                                                title="Delete"
                                            >
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                ) : (
                    <Text c="dimmed" ta="center" py="md">
                        No graph images uploaded yet.
                    </Text>
                )}
            </Stack>
        </Card>
    );
}
