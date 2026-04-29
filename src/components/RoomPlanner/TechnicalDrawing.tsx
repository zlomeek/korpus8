"use client";

import React from "react";
import { PlacedCabinet } from "./RoomPlanner";
import { getCollisionRects } from "@/lib/calculate";

interface TechnicalDrawingProps {
    placedCabinets: PlacedCabinet[];
    roomDimensions: { width: number; depth: number; height: number };
    filter?: 'lower' | 'upper-shallow' | 'upper-deep';
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

    // Filter cabinets by wall
    const backWallCabinets = filteredCabinets
        .filter(c => Math.abs(c.rotation[1]) < 0.1)
        .sort((a, b) => a.position[0] - b.position[0]);

    return (
        <svg
            viewBox={`0 0 ${viewBoxW} ${viewBoxD}`}
            style={{ width: '100%', height: '100%', pointerEvents: 'none', background: '#fff' }}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Legend / Title */}
            <text x={padding} y={padding / 2 - 50} fontSize="72" fontWeight="bold" fill="#333">
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
            <text x={padding + width/2} y={padding - 60} textAnchor="middle" fontSize="36" fontWeight="bold" fill="#999">ŚCIANA TYLNA</text>
            <text x={padding - 100} y={padding + depth/2} textAnchor="middle" transform={`rotate(-90, ${padding - 100}, ${padding + depth/2})`} fontSize="36" fontWeight="bold" fill="#999">ŚCIANA LEWA</text>
            <text x={padding + width + 100} y={padding + depth/2} textAnchor="middle" transform={`rotate(90, ${padding + width + 100}, ${padding + depth/2})`} fontSize="36" fontWeight="bold" fill="#999">ŚCIANA PRAWA</text>

            {/* Cabinets */}
            {filteredCabinets.map((cab) => {
                const cabW = cab.cabinet.width;
                const cabD = cab.cabinet.depth;
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

                        // Local points for L-shape
                        // A: Back-Left outer corner (-w1/2, -w2/2)
                        // B: Back-Right outer corner (w1/2, -w2/2)
                        // C: Back-Right inner edge (w1/2, -w2/2 + d)
                        // D: Inside corner (-w1/2 + d, -w2/2 + d)
                        // E: Front-Left inner edge (-w1/2 + d, w2/2)
                        // F: Front-Left outer corner (-w1/2, w2/2)
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
                                transform={`translate(${mapX(cab.position[0])}, ${mapY(cab.position[2])}) rotate(${(rotation * 180) / Math.PI})`}
                            />
                        );
                    }

                    const rects = getCollisionRects(cab.cabinet);
                    const isUpperCorner = cab.cabinet.id === 'gorna-narozna' || cab.cabinet.id === 'gorna-narozna-gleboka';
                    
                    return rects.map((rect, idx) => {
                        // Ukrywamy ślepe blendy w narożnikach DOLNYCH (na prośbę użytkownika wcześniej), 
                        // ale w GÓRNYCH je pokazujemy (na nową prośbę użytkownika)
                        if (rect.type === 'blenda' && !isGorna) return null;
                        
                        // Ukrywamy front w szafkach górnych narożnych (użytkownik chce tam widzieć tylko blendę)
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
                                transform={`translate(${mapX(cab.position[0])}, ${mapY(cab.position[2])}) rotate(${(rotation * 180) / Math.PI})`}
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

            {/* Horizontal Dimensions (Widths/Gaps) - BACK WALL */}
            {backWallCabinets.length > 0 && (
                <g transform={`translate(0, ${padding - 120})`}>
                    {(() => {
                        const first = backWallCabinets[0];
                        const gap = (first.position[0] - first.cabinet.width / 2) - (-halfW);
                        if (gap > 5) return <DimensionLine x1={padding} y1={0} x2={mapX(first.position[0] - first.cabinet.width/2)} y2={0} label={`${Math.round(gap)}`} color="#ef4444" fontSize={40} />;
                        return null;
                    })()}

                    {backWallCabinets.map((cab, i) => {
                        const next = backWallCabinets[i + 1];
                        const startX = mapX(cab.position[0] - cab.cabinet.width / 2);
                        const endX = mapX(cab.position[0] + cab.cabinet.width / 2);
                        const gapX2 = next ? mapX(next.position[0] - next.cabinet.width / 2) : 0;
                        const gap = next ? Math.round(gapX2 - endX) : 0;

                        return (
                            <React.Fragment key={cab.uuid}>
                                <DimensionLine x1={startX} y1={0} x2={endX} y2={0} label={`${cab.cabinet.width}`} />
                                {next && gap > 5 && <DimensionLine x1={endX} y1={0} x2={gapX2} y2={0} label={`${gap}`} color="#ef4444" fontSize={40} />}
                            </React.Fragment>
                        );
                    })}

                    {(() => {
                        const last = backWallCabinets[backWallCabinets.length - 1];
                        const gap = halfW - (last.position[0] + last.cabinet.width / 2);
                        if (gap > 5) return <DimensionLine x1={mapX(last.position[0] + last.cabinet.width/2)} y1={0} x2={padding + width} y2={0} label={`${Math.round(gap)}`} color="#ef4444" fontSize={40} />;
                        return null;
                    })()}
                </g>
            )}
            {/* Side Wall Dimensions (LEFT) */}
            {(() => {
                const leftWallCabinets = filteredCabinets
                    .filter(c => Math.abs(c.rotation[1] - Math.PI/2) < 0.1 || Math.abs(c.rotation[1] + Math.PI/2) < 0.1)
                    .filter(c => Math.abs(c.position[0] - (-halfW + c.cabinet.depth/2)) < 100)
                    .sort((a, b) => a.position[2] - b.position[2]);

                if (leftWallCabinets.length === 0) return null;

                return (
                    <g transform={`translate(${padding - 120}, 0)`}>
                        {(() => {
                            const first = leftWallCabinets[0];
                            const firstW = first.cabinet.width;
                            const gap = (first.position[2] - firstW / 2) - (-halfD);
                            if (gap > 5) return <VerticalDimensionLine x={0} y1={padding} y2={mapY(first.position[2] - firstW/2)} label={`${Math.round(gap)}`} color="#ef4444" fontSize={40} labelOffset={-40} />;
                            return null;
                        })()}
                        {leftWallCabinets.map((cab, i) => {
                            const next = leftWallCabinets[i + 1];
                            const cabW = cab.cabinet.width;
                            const startY = mapY(cab.position[2] - cabW / 2);
                            const endY = mapY(cab.position[2] + cabW / 2);
                            const gapY2 = next ? mapY(next.position[2] - next.cabinet.width / 2) : 0;
                            const gap = next ? Math.round(gapY2 - endY) : 0;

                            return (
                                <React.Fragment key={cab.uuid}>
                                    <VerticalDimensionLine x={0} y1={startY} y2={endY} label={`${cabW}`} fontSize={40} labelOffset={-40} />
                                    {next && gap > 5 && <VerticalDimensionLine x={0} y1={endY} y2={gapY2} label={`${gap}`} color="#ef4444" fontSize={40} labelOffset={-40} />}
                                </React.Fragment>
                            );
                        })}
                        {(() => {
                            const last = leftWallCabinets[leftWallCabinets.length - 1];
                            const lastW = last.cabinet.width;
                            const gap = halfD - (last.position[2] + lastW / 2);
                            if (gap > 5) return <VerticalDimensionLine x={0} y1={mapY(last.position[2] + lastW/2)} y2={padding + depth} label={`${Math.round(gap)}`} color="#ef4444" fontSize={40} labelOffset={-40} />;
                            return null;
                        })()}
                    </g>
                );
            })()}

            {/* Side Wall Dimensions (RIGHT) */}
            {(() => {
                const rightWallCabinets = filteredCabinets
                    .filter(c => Math.abs(c.rotation[1] - Math.PI/2) < 0.1 || Math.abs(c.rotation[1] + Math.PI/2) < 0.1)
                    .filter(c => Math.abs(c.position[0] - (halfW - c.cabinet.depth/2)) < 100)
                    .sort((a, b) => a.position[2] - b.position[2]);

                if (rightWallCabinets.length === 0) return null;

                return (
                    <g transform={`translate(${padding + width + 120}, 0)`}>
                        {(() => {
                            const first = rightWallCabinets[0];
                            const firstW = first.cabinet.width;
                            const gap = (first.position[2] - firstW / 2) - (-halfD);
                            if (gap > 5) return <VerticalDimensionLine x={0} y1={padding} y2={mapY(first.position[2] - firstW/2)} label={`${Math.round(gap)}`} color="#ef4444" fontSize={40} labelOffset={40} />;
                            return null;
                        })()}
                        {rightWallCabinets.map((cab, i) => {
                            const next = rightWallCabinets[i + 1];
                            const cabW = cab.cabinet.width;
                            const startY = mapY(cab.position[2] - cabW / 2);
                            const endY = mapY(cab.position[2] + cabW / 2);
                            const gapY2 = next ? mapY(next.position[2] - next.cabinet.width / 2) : 0;
                            const gap = next ? Math.round(gapY2 - endY) : 0;

                            return (
                                <React.Fragment key={cab.uuid}>
                                    <VerticalDimensionLine x={0} y1={startY} y2={endY} label={`${cabW}`} fontSize={40} labelOffset={40} />
                                    {next && gap > 5 && <VerticalDimensionLine x={0} y1={endY} y2={gapY2} label={`${gap}`} color="#ef4444" fontSize={40} labelOffset={40} />}
                                </React.Fragment>
                            );
                        })}
                        {(() => {
                            const last = rightWallCabinets[rightWallCabinets.length - 1];
                            const lastW = last.cabinet.width;
                            const gap = halfD - (last.position[2] + lastW / 2);
                            if (gap > 5) return <VerticalDimensionLine x={0} y1={mapY(last.position[2] + lastW/2)} y2={padding + depth} label={`${Math.round(gap)}`} color="#ef4444" fontSize={40} labelOffset={40} />;
                            return null;
                        })()}
                    </g>
                );
            })()}

            {/* Depth Rulers (Left: Max Depth, Right: Up to 3 Smallest) */}
            {backWallCabinets.length > 0 && (() => {
                // Get unique depth + posZ configurations
                const depthMap = new Map<string, { d: number, posZ: number }>();
                backWallCabinets.forEach(c => {
                    const isL = c.cabinet.id.endsWith('-90');
                    const w2 = (c.cabinet as any).width2 || 900;
                    const d = isL ? w2 : c.cabinet.depth;
                    const key = `${d}_${Math.round(c.position[2])}`;
                    if (!depthMap.has(key)) {
                        depthMap.set(key, { d, posZ: c.position[2] });
                    }
                });

                const uniqueInfos = Array.from(depthMap.values());
                const sortedByDepth = [...uniqueInfos].sort((a, b) => a.d - b.d);
                
                // Max for the left
                const maxDepthInfo = [...uniqueInfos].sort((a, b) => b.d - a.d)[0];
                // 3 smallest for the right
                const smallest3 = sortedByDepth.slice(0, 3);

                const renderRuler = (info: { d: number, posZ: number }, xOffset: number) => {
                    const backWallGap = Math.round((info.posZ - info.d / 2) - (-halfD));
                    const frontSpace = Math.round(halfD - (info.posZ + info.d / 2));
                    return (
                        <g transform={`translate(${xOffset}, 0)`}>
                            {backWallGap > 5 && <VerticalDimensionLine x={0} y1={padding} y2={mapY(info.posZ - info.d/2)} label={`${backWallGap}`} color="#ef4444" fontSize={36} />}
                            <VerticalDimensionLine x={0} y1={mapY(info.posZ - info.d/2)} y2={mapY(info.posZ + info.d/2)} label={`${info.d}`} color="#2563eb" fontSize={36} />
                            {frontSpace > 5 && <VerticalDimensionLine x={0} y1={mapY(info.posZ + info.d/2)} y2={padding + depth} label={`${frontSpace}`} color="#ef4444" fontSize={36} />}
                        </g>
                    );
                };

                return (
                    <>
                        {/* LEFT RULER: MAX DEPTH */}
                        {renderRuler(maxDepthInfo, padding - 280)}
                        
                        {/* RIGHT RULERS: 3 SMALLEST */}
                        {smallest3.map((info, i) => (
                            <React.Fragment key={`${info.d}_${info.posZ}`}>
                                {renderRuler(info, padding + width + 280 + i * 130)}
                            </React.Fragment>
                        ))}
                    </>
                );
            })()}

            {/* Info Box */}
            <g transform={`translate(${padding}, ${padding + depth + 120})`}>
                <text fontSize="36" fill="#666" fontWeight="bold">Wymiary podane w mm. Czerwone linie oznaczają wolne przestrzenie.</text>
            </g>
        </svg>
    );
}
