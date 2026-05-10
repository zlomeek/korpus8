"use client";

import React from "react";
import { PlacedCabinet } from "./RoomPlanner";
import { getCollisionRects } from "@/lib/calculate";

interface TechnicalDrawingProps {
    placedCabinets: PlacedCabinet[];
    roomDimensions: { width: number; depth: number; height: number };
    filter?: 'lower' | 'upper-shallow' | 'upper-deep' | 'all';
}

export default function TechnicalDrawing({ placedCabinets, roomDimensions, filter = 'all' }: TechnicalDrawingProps) {
    const filteredCabinets = placedCabinets.filter(c => {
        const id = c.cabinet.id;
        const isTall = (id.includes('lodowka') || id.includes('piekarnik')) && id !== 'dolna-piekarnik-podblatowa';
        const isLowerCabinet = id.startsWith('dolna-') && !isTall;
        const isUpper = id.startsWith('gorna-');
        const isBlenda = id.startsWith('blenda-');
        const isBlat = id.startsWith('blat-');
        const isFartuch = id === 'fartuch-kuchenny';
        const isListwa = id.includes('listwa');
        const depth = c.cabinet.depth;

        if (filter === 'lower') return (isLowerCabinet || isTall) && !isBlenda && !isListwa;
        if (filter === 'upper-shallow') return (isUpper && depth < 450 || isTall) && !isBlenda && !isListwa;
        if (filter === 'upper-deep') return (isUpper && depth >= 450 || isTall) && !isBlenda && !isListwa;
        return true;
    });

    const { width, depth } = roomDimensions;
    const padding = 350; // Increased padding for vertical text
    const viewBoxW = width + padding * 2;
    const viewBoxD = depth + padding * 2;

    const halfW = width / 2;
    const halfD = depth / 2;

    const mapX = (x: number) => x + halfW + padding;
    const mapY = (z: number) => z + halfD + padding;

    // Helper for horizontal dimension lines
    const DimensionLine = ({ x1, y1, x2, y2, label, color = "#2563eb", fontSize = 48 }: { x1: number, y1: number, x2: number, y2: number, label: string, color?: string, fontSize?: number }) => (
        <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="6" />
            <line x1={x1} y1={y1 - 20} x2={x1} y2={y1 + 20} stroke={color} strokeWidth="6" />
            <line x1={x2} y1={y2 - 20} x2={x2} y2={y2 + 20} stroke={color} strokeWidth="6" />
            <text
                x={(x1 + x2) / 2}
                y={y1 - 30}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight="bold"
                fill={color}
            >
                {label}
            </text>
        </g>
    );

    // Helper for vertical dimension lines (Depth/Offsets)
    const VerticalDimensionLine = ({ x, y1, y2, label, color = "#2563eb", fontSize = 40, labelOffset = -30 }: { x: number, y1: number, y2: number, label: string, color?: string, fontSize?: number, labelOffset?: number }) => (
        <g>
            <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="6" />
            <line x1={x - 20} y1={y1} x2={x + 20} y2={y1} stroke={color} strokeWidth="6" />
            <line x1={x - 20} y1={y2} x2={x + 20} y2={y2} stroke={color} strokeWidth="6" />
            <text
                x={x + labelOffset}
                y={(y1 + y2) / 2}
                textAnchor="middle"
                transform={`rotate(-90, ${x + labelOffset}, ${(y1 + y2) / 2})`}
                fontSize={fontSize}
                fontWeight="bold"
                fill={color}
            >
                {label}
            </text>
        </g>
    );

    return (
        <svg
            viewBox={`0 0 ${viewBoxW} ${viewBoxD}`}
            style={{ width: '100%', height: '100%', pointerEvents: 'none', background: '#fff' }}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Legend / Title */}
            <text x={padding} y={80} fontSize="72" fontWeight="bold" fill="#333">
                RZUT KUCHNI - WIDOK TECHNICZNY ({
                    filter === 'lower' ? 'Dół + Słupki' :
                        (filter === 'upper-shallow' ? 'Góra płytka + Słupki' : 'Góra głęboka + Słupki')
                })
            </text>

            {/* Room Boundary */}
            <rect
                x={padding}
                y={padding}
                width={width}
                height={depth}
                fill="#fcfcfc"
                stroke="#000"
                strokeWidth="12"
            />

            {/* Walls Context */}
            <text x={padding + width / 2} y={padding - 30} textAnchor="middle" fontSize="36" fontWeight="bold" fill="#999">ŚCIANA TYLNA</text>
            <text x={padding - 100} y={padding + depth / 2} textAnchor="middle" transform={`rotate(-90, ${padding - 100}, ${padding + depth / 2})`} fontSize="36" fontWeight="bold" fill="#999">ŚCIANA LEWA</text>
            <text x={padding + width + 100} y={padding + depth / 2} textAnchor="middle" transform={`rotate(90, ${padding + width + 100}, ${padding + depth / 2})`} fontSize="36" fontWeight="bold" fill="#999">ŚCIANA PRAWA</text>

            {/* Cabinets */}
            {filteredCabinets.map((cab) => {
                const cabW = cab.cabinet.width;
                const rotation = cab.rotation[1];
                const isGorna = cab.cabinet.id.includes('gorna');
                const isLCorner = cab.cabinet.id.endsWith('-90');
                const w2 = (cab as any).cabinet.width2 || (cab.cabinet.id.startsWith('gorna-') ? 650 : 900);

                const renderCabinetShape = () => {
                    const isL = cab.cabinet.id.endsWith('-90');
                    if (isL) {
                        const w1 = cab.cabinet.width;
                        const w2 = (cab.cabinet as any).width2 || (cab.cabinet.id.startsWith('gorna-') ? 650 : 900);
                        const d = cab.cabinet.depth;

                        const points = [
                            `${-w1 / 2},${-w2 / 2}`,
                            `${w1 / 2},${-w2 / 2}`,
                            `${w1 / 2},${-w2 / 2 + d}`,
                            `${-w1 / 2 + d},${-w2 / 2 + d}`,
                            `${-w1 / 2 + d},${w2 / 2}`,
                            `${-w1 / 2},${w2 / 2}`
                        ].join(" ");

                        return (
                            <polygon
                                points={points}
                                fill={isGorna ? "#f0f9ff" : "#f1f5f9"}
                                stroke="#000"
                                strokeWidth="6"
                                transform={`translate(${mapX(cab.position[0])}, ${mapY(cab.position[2])}) rotate(${(-rotation * 180) / Math.PI})`}
                            />
                        );
                    }

                    const rects = getCollisionRects(cab.cabinet);
                    const isUpperCorner = cab.cabinet.id === 'gorna-narozna' || cab.cabinet.id === 'gorna-narozna-gleboka';

                    return rects.map((rect, idx) => {
                        if (rect.type === 'blenda' && !isGorna) return null;
                        if (rect.type === 'front' && isUpperCorner) return null;

                        const localX = rect.x;
                        const localZ = rect.z;
                        const w = rect.w;
                        const d = rect.d;

                        const isSpacer = rect.type === 'spacer';
                        const isExtension = rect.type === 'extension' || rect.type === 'blenda' || rect.type === 'front';

                        return (
                            <rect
                                key={`${cab.uuid}-rect-${idx}`}
                                x={localX - w / 2}
                                y={localZ - d / 2}
                                width={w}
                                height={d}
                                fill={isGorna ? (isSpacer ? "#cbd5e1" : "#f0f9ff") : (isSpacer ? "#cbd5e1" : "#f1f5f9")}
                                stroke="#000"
                                strokeWidth={isExtension ? "2" : "6"}
                                strokeDasharray={isExtension ? "10 5" : "0"}
                                transform={`translate(${mapX(cab.position[0])}, ${mapY(cab.position[2])}) rotate(${(-rotation * 180) / Math.PI})`}
                            />
                        );
                    });
                };

                return (
                    <g key={cab.uuid}>
                        {renderCabinetShape()}
                        <text
                            x={mapX(cab.position[0])}
                            y={mapY(cab.position[2])}
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            fontSize="32"
                            fontWeight="bold"
                            fill="#333"
                        >
                            {isLCorner ? `${cabW}x${w2}` : cabW}
                        </text>
                    </g>
                );
            })}

            {/* --- WYMIARY PODSTAWOWE (GABARYTY POMIESZCZENIA) --- */}
            <DimensionLine 
                x1={padding} 
                y1={160} 
                x2={padding + width} 
                y2={160} 
                label={`SZEROKOŚĆ CAŁKOWITA: ${width}`} 
                color="#334155" 
                fontSize={44} 
            />

            <VerticalDimensionLine 
                x={padding + width + 280} 
                y1={padding} 
                y2={padding + depth} 
                label={`GŁĘBOKOŚĆ CAŁKOWITA: ${depth}`} 
                color="#334155" 
                fontSize={44} 
                labelOffset={50} 
            />


            {/* --- ŚCIANA LEWA - Łańcuch szerokości --- */}
            {(() => {
                const leftWallCabinets = filteredCabinets
                    .filter(c => {
                        const rot = c.rotation[1];
                        // Szafki obrócone "pionowo" (90, 270, -90, -270 stopni)
                        const isVertical = Math.abs(Math.sin(rot)) > 0.9;
                        // Strona lewa (X < 0)
                        const isLeft = c.position[0] < 0;
                        return isVertical && isLeft;
                    })
                    .sort((a, b) => a.position[2] - b.position[2]);

                if (leftWallCabinets.length === 0) return null;
                const xPos = padding - 180;

                return (
                    <g>
                        {(() => {
                            const first = leftWallCabinets[0];
                            const startZ = first.position[2] - first.cabinet.width / 2;
                            const gap = startZ - (-halfD);
                            if (gap > 5) return <VerticalDimensionLine x={xPos} y1={padding} y2={mapY(startZ)} label={`${Math.round(gap)}`} color="#ef4444" fontSize={36} labelOffset={-40} />;
                            return null;
                        })()}

                        {leftWallCabinets.map((cab, i) => {
                            const next = leftWallCabinets[i + 1];
                            const startY = mapY(cab.position[2] - cab.cabinet.width / 2);
                            const endY = mapY(cab.position[2] + cab.cabinet.width / 2);
                            const items = [
                                <VerticalDimensionLine key={`w-${cab.uuid}`} x={xPos} y1={startY} y2={endY} label={`${cab.cabinet.width}`} color="#2563eb" fontSize={40} labelOffset={-40} />
                            ];
                            if (next) {
                                const nextStart = mapY(next.position[2] - next.cabinet.width / 2);
                                const gap = Math.round((next.position[2] - next.cabinet.width / 2) - (cab.position[2] + cab.cabinet.width / 2));
                                if (gap > 5) items.push(<VerticalDimensionLine key={`g-${cab.uuid}`} x={xPos} y1={endY} y2={nextStart} label={`${gap}`} color="#ef4444" fontSize={36} labelOffset={-40} />);
                            }
                            return <React.Fragment key={`group-${cab.uuid}`}>{items}</React.Fragment>;
                        })}

                        {(() => {
                            const last = leftWallCabinets[leftWallCabinets.length - 1];
                            const endZ = last.position[2] + last.cabinet.width / 2;
                            const gap = halfD - endZ;
                            if (gap > 5) return <VerticalDimensionLine x={xPos} y1={mapY(endZ)} y2={padding + depth} label={`${Math.round(gap)}`} color="#ef4444" fontSize={36} labelOffset={-40} />;
                            return null;
                        })()}
                    </g>
                );
            })()}

            {/* --- ŚCIANA TYLNA (GÓRA) - Łańcuch szerokości --- */}
            {(() => {
                const backWallCabinets = filteredCabinets
                    .filter(c => {
                        const rot = c.rotation[1];
                        // Szafki poziome (0, 180 stopni)
                        const isHorizontal = Math.abs(Math.cos(rot)) > 0.9;
                        // Strona górna (Z < 0)
                        const isBack = c.position[2] < 0;
                        return isHorizontal && isBack;
                    })
                    .sort((a, b) => a.position[0] - b.position[0]);

                if (backWallCabinets.length === 0) return null;
                const yPos = 260;

                return (
                    <g>
                        {(() => {
                            const first = backWallCabinets[0];
                            const startX = first.position[0] - first.cabinet.width / 2;
                            const gap = startX - (-halfW);
                            if (gap > 5) return <DimensionLine x1={padding} y1={yPos} x2={mapX(startX)} y2={yPos} label={`${Math.round(gap)}`} color="#ef4444" fontSize={36} />;
                            return null;
                        })()}

                        {backWallCabinets.map((cab, i) => {
                            const next = backWallCabinets[i + 1];
                            const startX = mapX(cab.position[0] - cab.cabinet.width / 2);
                            const endX = mapX(cab.position[0] + cab.cabinet.width / 2);
                            
                            const items = [
                                <DimensionLine key={`w-${cab.uuid}`} x1={startX} y1={yPos} x2={endX} y2={yPos} label={`${cab.cabinet.width}`} color="#2563eb" fontSize={40} />
                            ];

                            if (next) {
                                const nextStart = mapX(next.position[0] - next.cabinet.width / 2);
                                const gap = Math.round((next.position[0] - next.cabinet.width / 2) - (cab.position[0] + cab.cabinet.width / 2));
                                if (gap > 5) items.push(<DimensionLine key={`g-${cab.uuid}`} x1={endX} y1={yPos} x2={nextStart} y2={yPos} label={`${gap}`} color="#ef4444" fontSize={36} />);
                            }
                            return <React.Fragment key={`group-${cab.uuid}`}>{items}</React.Fragment>;
                        })}

                        {/* Do ściany prawej */}
                        {(() => {
                            const last = backWallCabinets[backWallCabinets.length - 1];
                            const endX = last.position[0] + last.cabinet.width / 2;
                            const gap = halfW - endX;
                            if (gap > 5) return <DimensionLine x1={mapX(endX)} y1={yPos} x2={padding + width} y2={yPos} label={`${Math.round(gap)}`} color="#ef4444" fontSize={36} />;
                            return null;
                        })()}
                    </g>
                );
            })()}

            {/* --- ŚCIANA PRAWA - Łańcuch szerokości --- */}
            {(() => {
                const rightWallCabinets = filteredCabinets
                    .filter(c => {
                        const rot = c.rotation[1];
                        // Szafki obrócone "pionowo" (90, 270 stopni)
                        const isVertical = Math.abs(Math.sin(rot)) > 0.9;
                        // Strona prawa (X > 0)
                        const isRight = c.position[0] > 0;
                        return isVertical && isRight;
                    })
                    .sort((a, b) => a.position[2] - b.position[2]);

                if (rightWallCabinets.length === 0) return null;
                const xPos = padding + width + 180;

                return (
                    <g>
                        {/* Od ściany tylnej */}
                        {(() => {
                            const first = rightWallCabinets[0];
                            const startZ = first.position[2] - first.cabinet.width / 2;
                            const gap = startZ - (-halfD);
                            if (gap > 5) return <VerticalDimensionLine x={xPos} y1={padding} y2={mapY(startZ)} label={`${Math.round(gap)}`} color="#ef4444" fontSize={36} labelOffset={40} />;
                            return null;
                        })()}

                        {rightWallCabinets.map((cab, i) => {
                            const next = rightWallCabinets[i + 1];
                            const startY = mapY(cab.position[2] - cab.cabinet.width / 2);
                            const endY = mapY(cab.position[2] + cab.cabinet.width / 2);
                            const items = [
                                <VerticalDimensionLine key={`w-${cab.uuid}`} x={xPos} y1={startY} y2={endY} label={`${cab.cabinet.width}`} color="#2563eb" fontSize={40} labelOffset={40} />
                            ];
                            if (next) {
                                const nextStart = mapY(next.position[2] - next.cabinet.width / 2);
                                const gap = Math.round((next.position[2] - next.cabinet.width / 2) - (cab.position[2] + cab.cabinet.width / 2));
                                if (gap > 5) items.push(<VerticalDimensionLine key={`g-${cab.uuid}`} x={xPos} y1={endY} y2={nextStart} label={`${gap}`} color="#ef4444" fontSize={36} labelOffset={40} />);
                            }
                            return <React.Fragment key={`group-${cab.uuid}`}>{items}</React.Fragment>;
                        })}

                        {/* Do końca frontu */}
                        {(() => {
                            const last = rightWallCabinets[rightWallCabinets.length - 1];
                            const endZ = last.position[2] + last.cabinet.width / 2;
                            const gap = halfD - endZ;
                            if (gap > 5) return <VerticalDimensionLine x={xPos} y1={mapY(endZ)} y2={padding + depth} label={`${Math.round(gap)}`} color="#ef4444" fontSize={36} labelOffset={40} />;
                            return null;
                        })()}
                    </g>
                );
            })()}

            {/* Info Box */}
            <g transform={`translate(${padding}, ${padding + depth + 120})`}>
                <text fontSize="36" fill="#666" fontWeight="bold">Wymiary podane w mm. Czerwone linie oznaczają wolne przestrzenie.</text>
            </g>
        </svg>
    );
}
