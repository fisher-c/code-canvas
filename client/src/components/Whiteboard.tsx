import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Eraser, Pen } from 'lucide-react';
import { DrawEvent } from '@/hooks/useSocket';

interface WhiteboardProps {
    isOpen: boolean;
    onClose: () => void;
    onDraw: (event: DrawEvent) => void;
    onClear: () => void;
    incomingEvents: DrawEvent[];
}

export function Whiteboard({ isOpen, onClose, onDraw, onClear, incomingEvents }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ef4444'); // Default red
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    // Handle incoming drawing events
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || incomingEvents.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        incomingEvents.forEach(event => {
            ctx.strokeStyle = event.color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            if (event.type === 'start') {
                ctx.beginPath();
                ctx.moveTo(event.x * canvas.width, event.y * canvas.height);
            } else if (event.type === 'move') {
                ctx.lineTo(event.x * canvas.width, event.y * canvas.height);
                ctx.stroke();
            } else if (event.type === 'end') {
                ctx.closePath();
            }
        });
    }, [incomingEvents]);

    // Resize canvas
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement;
                if (parent) {
                    canvasRef.current.width = parent.clientWidth;
                    canvasRef.current.height = parent.clientHeight;
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen]);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) / canvas.width,
            y: (clientY - rect.top) / canvas.height
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const pos = getPos(e);
        lastPos.current = pos;
        onDraw({ x: pos.x, y: pos.y, color, type: 'start' });

        // Draw locally immediately
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.beginPath();
            ctx.moveTo(pos.x * canvas.width, pos.y * canvas.height);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const pos = getPos(e);

        onDraw({ x: pos.x, y: pos.y, color, type: 'move' });

        // Draw locally
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
            ctx.stroke();
        }

        lastPos.current = pos;
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (lastPos.current) {
            onDraw({ x: lastPos.current.x, y: lastPos.current.y, color, type: 'end' });
        }
        lastPos.current = null;
    };

    const clearBoard = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            onClear();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-x-0 bottom-0 top-14 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 py-2 border-b border-border bg-card shadow-sm">
                <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1 sm:pb-0">
                    <div className="flex items-center gap-2">
                        <Pen className="w-4 h-4 text-primary" />
                        <span className="font-medium">Whiteboard</span>
                    </div>

                    <div className="h-6 w-px bg-border" />

                    {/* Colors */}
                    <div className="flex items-center gap-2">
                        {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#000000', '#ffffff'].map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full border border-border transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="h-6 w-px bg-border" />

                    <button
                        onClick={clearBoard}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                    >
                        <Eraser className="w-4 h-4" />
                        Clear
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 hover:bg-accent rounded-full transition-colors self-end sm:self-auto shrink-0"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative cursor-crosshair touch-none">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 w-full h-full"
                />
            </div>
        </div>
    );
}
