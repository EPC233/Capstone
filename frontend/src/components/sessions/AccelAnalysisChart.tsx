import React, { useRef, useEffect, useCallback } from 'react';
import { Stack, Title, Paper, Group, Badge, Table, Box } from '@mantine/core';
import type { AnalysisResult } from '../../services/sessions';

// Colours matching PlotDataMagwick.py
const COLORS = {
    accel: '#40c057',   // green
    velocity: '#228be6', // blue
    position: '#fa5252', // red / tab:green mapped to green
    repShades: [
        'rgba(255,107,107,0.15)',
        'rgba(81,207,102,0.15)',
        'rgba(74,144,226,0.15)',
        'rgba(255,195,0,0.15)',
        'rgba(190,75,219,0.15)',
        'rgba(255,146,43,0.15)',
        'rgba(32,201,151,0.15)',
        'rgba(134,142,150,0.15)',
    ],
};

interface ChartCanvasProps {
    title: string;
    indices: number[];
    values: number[];
    color: string;
    yLabel: string;
    repBoundaries: { start: number; end: number }[];
    totalSamples: number;
    height?: number;
}

/**
 * Single canvas subplot (acceleration, velocity, or position).
 */
function ChartCanvas({
    title,
    indices,
    values,
    color,
    yLabel,
    repBoundaries,
    totalSamples,
    height = 200,
}: ChartCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || values.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = rect.height;
        const PAD_L = 60;
        const PAD_R = 16;
        const PAD_T = 28;
        const PAD_B = 24;
        const plotW = W - PAD_L - PAD_R;
        const plotH = H - PAD_T - PAD_B;

        // Background
        ctx.fillStyle = '#1a1b1e';
        ctx.fillRect(0, 0, W, H);

        // Title
        ctx.fillStyle = '#ddd';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(title, PAD_L, 16);

        // Auto-scale Y
        let minVal = Infinity;
        let maxVal = -Infinity;
        for (const v of values) {
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
        }
        const yPad = Math.max(Math.abs(maxVal - minVal) * 0.12, 0.01);
        minVal -= yPad;
        maxVal += yPad;

        const xScale = (sample: number) => PAD_L + (sample / totalSamples) * plotW;
        const yScale = (v: number) => PAD_T + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

        // Rep shading
        for (let ri = 0; ri < repBoundaries.length; ri++) {
            const rep = repBoundaries[ri]!;
            const x0 = xScale(rep.start);
            const x1 = xScale(rep.end);
            ctx.fillStyle = COLORS.repShades[ri % COLORS.repShades.length]!;
            ctx.fillRect(x0, PAD_T, x1 - x0, plotH);
        }

        // Grid lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        const gridSteps = 4;
        for (let gi = 0; gi <= gridSteps; gi++) {
            const yy = PAD_T + (gi / gridSteps) * plotH;
            ctx.beginPath();
            ctx.moveTo(PAD_L, yy);
            ctx.lineTo(W - PAD_R, yy);
            ctx.stroke();
        }

        // Zero line
        if (minVal < 0 && maxVal > 0) {
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 0.8;
            const zy = yScale(0);
            ctx.beginPath();
            ctx.moveTo(PAD_L, zy);
            ctx.lineTo(W - PAD_R, zy);
            ctx.stroke();
        }

        // Y-axis labels
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        for (let gi = 0; gi <= gridSteps; gi++) {
            const val = maxVal - (gi / gridSteps) * (maxVal - minVal);
            const yy = PAD_T + (gi / gridSteps) * plotH;
            ctx.fillText(val.toFixed(2), PAD_L - 4, yy + 3);
        }

        // Y label
        ctx.save();
        ctx.translate(12, PAD_T + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();

        // Data line
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < values.length; i++) {
            const x = xScale(indices[i]!);
            const y = yScale(values[i]!);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }, [title, indices, values, color, yLabel, repBoundaries, totalSamples, height]);

    useEffect(() => {
        draw();
        const handleResize = () => draw();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height, display: 'block' }}
        />
    );
}

// ---- Main export ----

interface AccelAnalysisChartProps {
    analysis: AnalysisResult;
}

export default function AccelAnalysisChart({ analysis }: AccelAnalysisChartProps) {
    const { chart, rep_boundaries, reps, total_samples, duration_seconds, rep_count } = analysis;

    return (
        <Stack gap="md">
            {/* Summary badges */}
            <Group gap="sm" wrap="wrap" pt="md">
                <Badge size="lg" color="blue" variant="light">
                    {total_samples} samples
                </Badge>
                <Badge size="lg" color="teal" variant="light">
                    {duration_seconds}s duration
                </Badge>
                <Badge size="lg" color="grape" variant="light">
                    {rep_count} rep{rep_count !== 1 ? 's' : ''} detected
                </Badge>
            </Group>

            {/* Charts */}
            <Paper radius="md" style={{ overflow: 'hidden', background: '#1a1b1e' }}>
                <ChartCanvas
                    title="Smoothed Z-Axis Acceleration (World Frame, Gravity Removed)"
                    indices={chart.time_samples}
                    values={chart.z_accel}
                    color={COLORS.accel}
                    yLabel="Acceleration (g)"
                    repBoundaries={rep_boundaries}
                    totalSamples={total_samples}
                    height={200}
                />
            </Paper>

            <Paper radius="md" style={{ overflow: 'hidden', background: '#1a1b1e' }}>
                <ChartCanvas
                    title="Estimated Z-Axis Velocity (Drift-Corrected per Rep)"
                    indices={chart.time_samples}
                    values={chart.velocity}
                    color={COLORS.velocity}
                    yLabel="Velocity (m/s)"
                    repBoundaries={rep_boundaries}
                    totalSamples={total_samples}
                    height={200}
                />
            </Paper>

            <Paper radius="md" style={{ overflow: 'hidden', background: '#1a1b1e' }}>
                <ChartCanvas
                    title="Estimated Z-Axis Position (Drift-Corrected per Rep)"
                    indices={chart.time_samples}
                    values={chart.position}
                    color={COLORS.position}
                    yLabel="Position (m)"
                    repBoundaries={rep_boundaries}
                    totalSamples={total_samples}
                    height={200}
                />
            </Paper>

            {/* Rep table */}
            {reps.length > 0 && (
                <Box>
                    <Title order={5} mb="xs">
                        Rep Details
                    </Title>
                    <Box style={{ overflowX: 'auto' }}>
                    <Table highlightOnHover withTableBorder style={{ tableLayout: 'auto' }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Rep</Table.Th>
                                <Table.Th style={{ minWidth: 130 }}>Phase</Table.Th>
                                <Table.Th>Duration</Table.Th>
                                <Table.Th>ROM</Table.Th>
                                <Table.Th>Peak Velocity</Table.Th>
                                <Table.Th>Avg Velocity</Table.Th>
                                <Table.Th>Peak Accel</Table.Th>
                                <Table.Th>Avg Accel</Table.Th>
                                <Table.Th>Avg Power</Table.Th>
                                <Table.Th>Samples</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {reps.map((rep) => {
                                const hasRestTop = rep.rest_at_top_seconds != null && rep.rest_at_top_seconds > 0;
                                const hasRestBottom = rep.rest_at_bottom_seconds != null && rep.rest_at_bottom_seconds > 0;
                                const rowSpan = 2 + (hasRestTop ? 1 : 0) + (hasRestBottom ? 1 : 0);
                                return (
                                <React.Fragment key={rep.rep_number}>
                                    {/* Eccentric row (upward) */}
                                    <Table.Tr>
                                        <Table.Td rowSpan={rowSpan} style={{ verticalAlign: 'middle', fontWeight: 600 }}>
                                            #{rep.rep_number}
                                        </Table.Td>
                                        <Table.Td style={{ minWidth: 130, overflow: 'visible' }}>
                                            <Badge size="sm" color="teal" variant="light">Eccentric ↑</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.eccentric ? `${rep.eccentric.duration_seconds}s` : '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.rom_cm} cm ({rep.rom_meters.toFixed(3)} m)
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.eccentric ? `${rep.eccentric.peak_velocity.toFixed(3)} m/s` : '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.eccentric ? `${rep.eccentric.avg_velocity.toFixed(3)} m/s` : '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.eccentric ? `${rep.eccentric.peak_accel.toFixed(2)} m/s²` : '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.eccentric ? `${rep.eccentric.avg_accel.toFixed(2)} m/s²` : '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.eccentric?.avg_watts != null ? `${rep.eccentric.avg_watts} W` : '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.eccentric ? `${rep.eccentric.start_sample}–${rep.eccentric.end_sample}` : '—'}
                                        </Table.Td>
                                    </Table.Tr>
                                    {/* Rest-at-top row (pause between phases) */}
                                    {hasRestTop && (
                                    <Table.Tr>
                                        <Table.Td style={{ minWidth: 130, overflow: 'visible' }}>
                                            <Badge size="sm" color="gray" variant="light">Rest ⏸</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.rest_at_top_seconds}s
                                        </Table.Td>
                                        <Table.Td colSpan={7} style={{ color: '#888', fontStyle: 'italic' }}>
                                            Pause at top of rep
                                        </Table.Td>
                                    </Table.Tr>
                                    )}
                                    {/* Concentric row (downward) */}
                                    <Table.Tr>
                                        <Table.Td style={{ minWidth: 130, overflow: 'visible' }}>
                                            <Badge size="sm" color="orange" variant="light">Concentric ↓</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.concentric ? `${rep.concentric.duration_seconds}s` : '—'}
                                        </Table.Td>
                                        <Table.Td>—</Table.Td>
                                        <Table.Td>
                                            {rep.concentric ? `${rep.concentric.peak_velocity.toFixed(3)} m/s` : '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.concentric ? `${rep.concentric.avg_velocity.toFixed(3)} m/s` : '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.concentric ? `${rep.concentric.peak_accel.toFixed(2)} m/s²` : '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.concentric ? `${rep.concentric.avg_accel.toFixed(2)} m/s²` : '—'}
                                        </Table.Td>
                                        <Table.Td>—</Table.Td>
                                        <Table.Td>
                                            {rep.concentric ? `${rep.concentric.start_sample}–${rep.concentric.end_sample}` : '—'}
                                        </Table.Td>
                                    </Table.Tr>
                                    {/* Rest-at-bottom row (pause at bottom of rep) */}
                                    {hasRestBottom && (
                                    <Table.Tr>
                                        <Table.Td style={{ minWidth: 130, overflow: 'visible' }}>
                                            <Badge size="sm" color="gray" variant="light">Rest ⏸</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {rep.rest_at_bottom_seconds}s
                                        </Table.Td>
                                        <Table.Td colSpan={7} style={{ color: '#888', fontStyle: 'italic' }}>
                                            Pause at bottom of rep
                                        </Table.Td>
                                    </Table.Tr>
                                    )}
                                </React.Fragment>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                    </Box>
                </Box>
            )}
        </Stack>
    );
}
