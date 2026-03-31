import { useEffect, useRef } from 'react';
import { Paper } from '@mantine/core';
import {
    createLiveDataSocket,
    type AccelDataPoint,
} from '../../services/livedata';
import { isBleConnected, onBleData } from '../../services/bluetooth';
import { colorScheme, hexToRgba } from '../../colorScheme';

const MAX_CHART_POINTS = 300;

export interface LiveAccelChartProps {
    active?: boolean;
    height?: number;
    onData?: (point: AccelDataPoint) => void;
}

export default function LiveAccelChart({
    active = true,
    height = 200,
    onData,
}: LiveAccelChartProps) {
    const chartBuffer = useRef<AccelDataPoint[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animFrameRef = useRef<number>(0);
    const socketRef = useRef<ReturnType<typeof createLiveDataSocket> | null>(null);
    const onDataRef = useRef(onData);
    useEffect(() => {
        onDataRef.current = onData;
    }, [onData]);

    useEffect(() => {
        if (!active) {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
            return;
        }

        const pushPoint = (point: AccelDataPoint) => {
            chartBuffer.current.push(point);
            if (chartBuffer.current.length > MAX_CHART_POINTS) {
                chartBuffer.current = chartBuffer.current.slice(-MAX_CHART_POINTS);
            }
            onDataRef.current?.(point);
        };

        if (isBleConnected()) {
            const unsub = onBleData(pushPoint);
            return () => { unsub(); };
        }

        if (!socketRef.current) {
            const sock = createLiveDataSocket();
            socketRef.current = sock;
            sock.onData(pushPoint);
            sock.onClose(() => {
                socketRef.current = null;
            });
            sock.onError(() => {
                socketRef.current = null;
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [active]);

    useEffect(() => {
        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) {
                animFrameRef.current = requestAnimationFrame(draw);
                return;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                animFrameRef.current = requestAnimationFrame(draw);
                return;
            }

            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const W = rect.width;
            const H = rect.height;

            ctx.fillStyle = colorScheme.dark.background;
            ctx.fillRect(0, 0, W, H);

            const buf = chartBuffer.current;
            if (buf.length < 2) {
                ctx.fillStyle = colorScheme.dark.textMuted;
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Waiting for data…', W / 2, H / 2);
                animFrameRef.current = requestAnimationFrame(draw);
                return;
            }

            const channels: {
                key: keyof AccelDataPoint;
                color: string;
                label: string;
            }[] = [
                { key: 'az_world', color: colorScheme.semantic.success, label: 'Z (vertical)' },
                { key: 'ax_world', color: colorScheme.semantic.info, label: 'X' },
                { key: 'ay_world', color: colorScheme.semantic.error, label: 'Y' },
            ];

            let minVal = Infinity;
            let maxVal = -Infinity;
            for (const p of buf) {
                for (const ch of channels) {
                    const v = p[ch.key] as number;
                    if (v < minVal) minVal = v;
                    if (v > maxVal) maxVal = v;
                }
            }
            const yPad = Math.max(Math.abs(maxVal - minVal) * 0.15, 0.5);
            minVal -= yPad;
            maxVal += yPad;

            const xStep = W / (MAX_CHART_POINTS - 1);
            const startIdx = MAX_CHART_POINTS - buf.length;

            // Zero line
            ctx.strokeStyle = colorScheme.dark.border;
            ctx.lineWidth = 0.5;
            const zeroY = H - ((0 - minVal) / (maxVal - minVal)) * H;
            ctx.beginPath();
            ctx.moveTo(0, zeroY);
            ctx.lineTo(W, zeroY);
            ctx.stroke();

            // Y-axis labels
            ctx.fillStyle = colorScheme.dark.textSecondary;
            ctx.font = '11px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${maxVal.toFixed(1)} m/s²`, 4, 14);
            ctx.fillText(`${minVal.toFixed(1)} m/s²`, 4, H - 4);
            ctx.fillText('0', 4, zeroY - 4);

            // Draw each channel
            for (const ch of channels) {
                ctx.strokeStyle = ch.color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = 0; i < buf.length; i++) {
                    const x = (startIdx + i) * xStep;
                    const point = buf[i];
                    if (!point) continue;
                    const v = point[ch.key] as number;
                    const y = H - ((v - minVal) / (maxVal - minVal)) * H;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            ctx.clearRect(W - 130, 2, 128, channels.length * 16 + 4);
            ctx.fillStyle = hexToRgba(colorScheme.dark.background, 0.85);
            ctx.fillRect(W - 130, 2, 128, channels.length * 16 + 4);
            for (let ci = 0; ci < channels.length; ci++) {
                const ch = channels[ci];
                if (!ch) continue;
                const yPos = 16 + ci * 16;
                ctx.fillStyle = ch.color;
                ctx.fillRect(W - 124, yPos - 6, 14, 3);
                ctx.fillStyle = colorScheme.dark.text;
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(ch.label, W - 106, yPos);
            }

            animFrameRef.current = requestAnimationFrame(draw);
        };

        animFrameRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, []);

    return (
        <Paper
            radius="md"
            style={{
                overflow: 'hidden',
                background: colorScheme.dark.background,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height,
                    display: 'block',
                }}
            />
        </Paper>
    );
}
