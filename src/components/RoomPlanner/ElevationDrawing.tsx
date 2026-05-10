"use client";

import React from "react";
import { PlacedCabinet } from "./RoomPlanner";

interface ElevationDrawingProps {
    placedCabinets: PlacedCabinet[];
    roomDimensions: { width: number; depth: number; height: number };
    currentWall: 'left' | 'back' | 'right' | 'front';
}

export default function ElevationDrawing({ placedCabinets, roomDimensions, currentWall }: ElevationDrawingProps) {
    const { width: roomW, depth: roomD, height: roomH } = roomDimensions;
    const padding = 450;

    // Viewbox fits a single wall
    const wallWidth = (currentWall === 'back' || currentWall === 'front') ? roomW : roomD;
    const viewBoxW = wallWidth + padding * 2;
    const viewBoxH = roomH + padding * 2;

    const halfW = roomW / 2;
    const halfD = roomD / 2;

    // Helper for dimension lines
    const DimensionLine = ({ x1, y1, x2, y2, label, color = "#2563eb", fontSize = 24 }: any) => (
        <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" />
            <line x1={x1 - 5} y1={y1 - 5} x2={x1 + 5} y2={y1 + 5} stroke={color} strokeWidth="2" />
            <line x1={x2 - 5} y1={y2 - 5} x2={x2 + 5} y2={y2 + 5} stroke={color} strokeWidth="2" />
            <text x={(x1 + x2) / 2} y={y1 - 15} textAnchor="middle" fontSize={fontSize} fontWeight="bold" fill={color}>{label}</text>
        </g>
    );

    const VerticalDimensionLine = ({ x, y1, y2, label, color = "#2563eb", fontSize = 20 }: any) => (
        <g>
            <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="2" />
            <line x1={x - 5} y1={y1 - 5} x2={x + 5} y2={y1 + 5} stroke={color} strokeWidth="2" />
            <line x1={x - 5} y1={y2 - 5} x2={x + 5} y2={y2 + 5} stroke={color} strokeWidth="2" />
            <text x={x - 20} y={(y1 + y2) / 2} textAnchor="middle" transform={`rotate(-90, ${x - 20}, ${(y1 + y2) / 2})`} fontSize={fontSize} fontWeight="bold" fill={color}>{label}</text>
        </g>
    );

    // Filter and map cabinets to elevations
    const displayedCabinets = placedCabinets.filter(c => c.cabinet.id !== 'blenda-meblowa');

    let activeCabinets: PlacedCabinet[] = [];
    let leftSideCabinets: PlacedCabinet[] = [];
    let rightSideCabinets: PlacedCabinet[] = [];
    let title = "";
    let getLocalX = (c: PlacedCabinet) => 0;

    const facingFront = (r: number) => {
        const cosVal = Math.cos(r);
        const sinVal = Math.sin(r);
        return cosVal > 0.7 && Math.abs(sinVal) < 0.7;
    };
    const facingBack = (r: number) => {
        const cosVal = Math.cos(r);
        const sinVal = Math.sin(r);
        return cosVal < -0.7 && Math.abs(sinVal) < 0.7;
    };
    const facingRight = (r: number) => {
        const cosVal = Math.cos(r);
        const sinVal = Math.sin(r);
        return sinVal > 0.7 && Math.abs(cosVal) < 0.7;
    };
    const facingLeft = (r: number) => {
        const cosVal = Math.cos(r);
        const sinVal = Math.sin(r);
        return sinVal < -0.7 && Math.abs(cosVal) < 0.7;
    };

    const isSide = (r: number) => facingLeft(r) || facingRight(r);
    const isFrontBack = (r: number) => facingFront(r) || facingBack(r);

    if (currentWall === 'back') {
        activeCabinets = displayedCabinets
            .filter(c => facingFront(c.rotation[1]))
            .sort((a, b) => a.position[0] - b.position[0]);
        leftSideCabinets = displayedCabinets.filter(c => isSide(c.rotation[1]) && c.position[0] < 0);
        rightSideCabinets = displayedCabinets.filter(c => isSide(c.rotation[1]) && c.position[0] > 0);
        title = "ŚCIANA TYLNA";
        getLocalX = (c) => c.position[0] + halfW;
    } else if (currentWall === 'left') {
        activeCabinets = displayedCabinets
            .filter(c => facingRight(c.rotation[1]) && c.position[0] < 0)
            .sort((a, b) => b.position[2] - a.position[2]);
        leftSideCabinets = displayedCabinets.filter(c => isFrontBack(c.rotation[1]) && c.position[2] > 0);
        rightSideCabinets = displayedCabinets.filter(c => isFrontBack(c.rotation[1]) && c.position[2] < 0);
        title = "ŚCIANA LEWA";
        getLocalX = (c) => halfD - c.position[2];
    } else if (currentWall === 'right') {
        activeCabinets = displayedCabinets
            .filter(c => facingLeft(c.rotation[1]) && c.position[0] > 0)
            .sort((a, b) => a.position[2] - b.position[2]);
        leftSideCabinets = displayedCabinets.filter(c => isFrontBack(c.rotation[1]) && c.position[2] < 0);
        rightSideCabinets = displayedCabinets.filter(c => isFrontBack(c.rotation[1]) && c.position[2] > 0);
        title = "ŚCIANA PRAWA";
        getLocalX = (c) => c.position[2] + halfD;
    } else {
        // FRONT
        activeCabinets = displayedCabinets
            .filter(c => facingBack(c.rotation[1]))
            .sort((a, b) => a.position[0] - b.position[0]);
        leftSideCabinets = displayedCabinets.filter(c => isSide(c.rotation[1]) && c.position[0] < 0);
        rightSideCabinets = displayedCabinets.filter(c => isSide(c.rotation[1]) && c.position[0] > 0);
        title = "STRONA FRONTOWA (OTWARTA)";
        getLocalX = (c) => c.position[0] + halfW;
    }

    return (
        <svg viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} style={{ width: '100%', height: '100%', pointerEvents: 'none', background: '#fff' }} xmlns="http://www.w3.org/2000/svg">
            <g transform={`translate(${padding}, ${padding + roomH}) scale(1, -1)`}>
                {/* Wall Background */}
                <rect x={0} y={0} width={wallWidth} height={roomH} fill="#fcfcfc" stroke="#ccc" strokeWidth="2" />
                {/* Floor Line */}
                <line x1={-20} y1={0} x2={wallWidth + 20} y2={0} stroke="#333" strokeWidth="4" />

                {activeCabinets.map((cab) => {
                    const localX = getLocalX(cab);
                    const cabW = cab.cabinet.width;
                    const cabH = cab.cabinet.height;
                    const cabY = cab.position[1];
                    const id = cab.cabinet.id;
                    const isGorna = id.startsWith('gorna-');
                    const isAux = id.startsWith('blat-') || id.startsWith('blenda-') || id.startsWith('fartuch-') || id.includes('listwa-');

                    const LEG_HEIGHT = 100;
                    const isBaseOrTall = !isGorna && !isAux;
                    const renderY = isBaseOrTall ? cabY + LEG_HEIGHT : cabY;

                    let fillColor = isGorna ? "#f0f9ff" : "#f1f5f9";
                    if (isAux) {
                        fillColor = id.startsWith('blat-') ? "#fde68a" : "#e2e8f0"; // Yellowish for blat, gray for others
                    }

                    return (
                        <g key={cab.uuid}>
                            <rect
                                x={localX - cabW / 2}
                                y={renderY}
                                width={cabW}
                                height={cabH}
                                fill={fillColor}
                                fillOpacity={isAux ? 0.6 : 1}
                                stroke={isAux ? "#94a3b8" : "#000"}
                                strokeWidth={isAux ? "2" : "2"}
                                strokeDasharray={isAux ? "4 2" : "0"}
                            />
                            {/* Legs for base cabinets and tall pillars */}
                            {isBaseOrTall && (
                                <g>
                                    <line x1={localX - cabW / 2 + 40} y1={cabY} x2={localX - cabW / 2 + 40} y2={renderY} stroke="#000" strokeWidth="2" />
                                    <line x1={localX + cabW / 2 - 40} y1={cabY} x2={localX + cabW / 2 - 40} y2={renderY} stroke="#000" strokeWidth="2" />
                                </g>
                            )}
                            {/* Measurements text labels - Hide for auxiliary items to reduce clutter */}
                            {!isAux && (
                                <g transform="scale(1, -1)">
                                    <text
                                        x={localX}
                                        y={-renderY - cabH / 2}
                                        textAnchor="middle"
                                        alignmentBaseline="middle"
                                        fontSize="40"
                                        fontWeight="bold"
                                        fill="#333"
                                    >
                                        {cabW}x{cabH}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}

                {/* Side profiles and Dimensions */}
                {(() => {
                    const getEffDepth = (cab: PlacedCabinet) => {
                        // For side profiles, we care about the carcass depth (usually 560 or 330), not the full corner span
                        return cab.cabinet.depth;
                    };

                    // Filter overlapping side cabinets to show only the silhouette (max depth constraint)
                    const filterMaxDepth = (cabs: PlacedCabinet[]) => {
                        const groups: Record<string, PlacedCabinet> = {};
                        cabs.forEach(cab => {
                            if (cab.cabinet.id.includes('listwa-')) return;
                            const key = `${cab.position[1]}-${cab.cabinet.height}`;
                            if (!groups[key] || getEffDepth(cab) > getEffDepth(groups[key])) {
                                groups[key] = cab;
                            }
                        });
                        return Object.values(groups);
                    };

                    const processedLeft = filterMaxDepth(leftSideCabinets);
                    const processedRight = filterMaxDepth(rightSideCabinets);

                    interface ProjectedCabinet { startX: number; endX: number; label: number; isGorna: boolean; isDeep: boolean; uuid: string }
                    const projectedCabinets: ProjectedCabinet[] = [];

                    activeCabinets.forEach(cab => {
                        const cabW = cab.cabinet.width;
                        const startX = getLocalX(cab) - cabW / 2;
                        const isAux = cab.cabinet.id.startsWith('blat-') || cab.cabinet.id.startsWith('fartuch-') || cab.cabinet.id.includes('listwa-') || cab.cabinet.id.includes('rogowa');
                        const isBlenda = cab.cabinet.id.startsWith('blenda-');

                        // Exclude non-cabinet items (blaty, fartuchy, listwy, szafki ślepe)
                        // We KEEP blendy because their thickness (e.g. 18mm) is important for installation
                        if (isAux && !isBlenda) return;

                        const isG = cab.cabinet.id.startsWith('gorna-') && !isAux;
                        const isD = cab.cabinet.depth > 450;
                        projectedCabinets.push({ startX, endX: startX + cabW, label: cabW, isGorna: isG, isDeep: isD, uuid: cab.uuid });
                    });

                    processedLeft.forEach(cab => {
                        const effDepth = getEffDepth(cab);
                        const isAux = cab.cabinet.id.startsWith('blat-') || cab.cabinet.id.startsWith('blenda-') || cab.cabinet.id.startsWith('fartuch-') || cab.cabinet.id.includes('listwa-');

                        if (isAux) return;

                        const isG = cab.cabinet.id.startsWith('gorna-') && !isAux;
                        const isD = cab.cabinet.depth > 450;
                        projectedCabinets.push({ startX: 0, endX: effDepth, label: effDepth, isGorna: isG, isDeep: isD, uuid: cab.uuid + '-l' });
                    });

                    processedRight.forEach(cab => {
                        const effDepth = getEffDepth(cab);
                        const isAux = cab.cabinet.id.startsWith('blat-') || cab.cabinet.id.startsWith('blenda-') || cab.cabinet.id.startsWith('fartuch-') || cab.cabinet.id.includes('listwa-');

                        if (isAux) return;

                        const isG = cab.cabinet.id.startsWith('gorna-') && !isAux;
                        const isD = cab.cabinet.depth > 450;
                        projectedCabinets.push({ startX: wallWidth - effDepth, endX: wallWidth, label: effDepth, isGorna: isG, isDeep: isD, uuid: cab.uuid + '-r' });
                    });

                    const renderChain = (cabinets: ProjectedCabinet[], yPos: number) => {
                        if (cabinets.length === 0) return null;

                        const sorted = [...cabinets].sort((a, b) => a.startX - b.startX);
                        const unique: ProjectedCabinet[] = [];
                        sorted.forEach(cab => {
                            const exists = unique.find(u => Math.abs(u.startX - cab.startX) < 5 && Math.abs(u.endX - cab.endX) < 5);
                            if (!exists) unique.push(cab);
                        });

                        // Group into rows to avoid overlap
                        const rows: ProjectedCabinet[][] = [[]];
                        unique.forEach(cab => {
                            let placed = false;
                            for (let row of rows) {
                                const last = row[row.length - 1];
                                if (!last || cab.startX >= last.endX - 1) {
                                    row.push(cab);
                                    placed = true;
                                    break;
                                }
                            }
                            if (!placed) {
                                rows.push([cab]);
                            }
                        });

                        return (
                            <g>
                                {rows.map((row, rowIdx) => {
                                    const rowY = yPos + (rowIdx * 80 * (yPos > 0 ? 1 : -1));
                                    let currentX = 0;
                                    return (
                                        <g key={`row-${rowIdx}`}>
                                            {row.map((cab, i) => {
                                                const items = [];
                                                // Gap before
                                                if (cab.startX - currentX > 5 && rowIdx === 0) {
                                                    items.push(<DimensionLine key={`gap-${cab.uuid}`} x1={currentX} y1={rowY} x2={cab.startX} y2={rowY} label={Math.round(cab.startX - currentX)} color="#ef4444" fontSize={36} />);
                                                }
                                                // The cabinet itself
                                                items.push(<DimensionLine key={`cab-${cab.uuid}`} x1={cab.startX} y1={rowY} x2={cab.endX} y2={rowY} label={Math.round(cab.label)} color="#2563eb" fontSize={36} />);
                                                currentX = cab.endX;
                                                // Gap after (only for the last item in the FIRST row to show wall end)
                                                if (i === row.length - 1 && wallWidth - currentX > 5 && rowIdx === 0) {
                                                    items.push(<DimensionLine key={`gap-last-${cab.uuid}`} x1={currentX} y1={rowY} x2={wallWidth} y2={rowY} label={Math.round(wallWidth - currentX)} color="#ef4444" fontSize={36} />);
                                                }
                                                return items;
                                            })}
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    };

                    const projectedBase = projectedCabinets.filter(c => !c.isGorna).sort((a, b) => a.startX - b.startX);
                    const projectedUpperDeep = projectedCabinets.filter(c => c.isGorna && c.isDeep).sort((a, b) => a.startX - b.startX);
                    const projectedUpperShallow = projectedCabinets.filter(c => c.isGorna && !c.isDeep).sort((a, b) => a.startX - b.startX);

                    return (
                        <>
                            {/* Visual Side Profiles (not inverted) */}
                            {processedLeft.map(cab => {
                                const cabY = cab.position[1];
                                const cabD = getEffDepth(cab);
                                const cabH = cab.cabinet.height;
                                const isGorna = cab.cabinet.id.startsWith('gorna-');
                                const isAux = cab.cabinet.id.startsWith('blat-') || cab.cabinet.id.startsWith('blenda-') || cab.cabinet.id.startsWith('fartuch-') || cab.cabinet.id.includes('listwa-');
                                const labelPrefix = cab.cabinet.id.endsWith('-90') ? 'szer.' : 'gł.';
                                const LEG_HEIGHT = 100;
                                const isBaseOrTall = !isGorna && !isAux;
                                const renderY = isBaseOrTall ? cabY + LEG_HEIGHT : cabY;
                                return (
                                    <g key={`side-l-${cab.uuid}`}>
                                        <rect x={0} y={renderY} width={cabD} height={cabH} fill={isGorna ? "rgba(240, 249, 255, 0.4)" : "rgba(241, 245, 249, 0.4)"} stroke="#94a3b8" strokeWidth="4" strokeDasharray="6 4" />
                                        {isBaseOrTall && (
                                            <g>
                                                <line x1={20} y1={cabY} x2={20} y2={renderY} stroke="#94a3b8" strokeWidth="4" strokeDasharray="6 4" />
                                                <line x1={cabD - 20} y1={cabY} x2={cabD - 20} y2={renderY} stroke="#94a3b8" strokeWidth="4" strokeDasharray="6 4" />
                                            </g>
                                        )}
                                        <g transform="scale(1, -1)">
                                            <text x={cabD / 2} y={-renderY - cabH / 2 - 50} textAnchor="middle" alignmentBaseline="middle" fontSize="28" fontWeight="bold" fill="#64748b">
                                                {labelPrefix} {cabD} / {cabH}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                            {processedRight.map(cab => {
                                const cabY = cab.position[1];
                                const cabD = getEffDepth(cab);
                                const cabH = cab.cabinet.height;
                                const isGorna = cab.cabinet.id.startsWith('gorna-');
                                const isAux = cab.cabinet.id.startsWith('blat-') || cab.cabinet.id.startsWith('blenda-') || cab.cabinet.id.startsWith('fartuch-') || cab.cabinet.id.includes('listwa-');
                                const labelPrefix = cab.cabinet.id.endsWith('-90') ? 'szer.' : 'gł.';
                                const LEG_HEIGHT = 100;
                                const isBaseOrTall = !isGorna && !isAux;
                                const renderY = isBaseOrTall ? cabY + LEG_HEIGHT : cabY;
                                return (
                                    <g key={`side-r-${cab.uuid}`}>
                                        <rect x={wallWidth - cabD} y={renderY} width={cabD} height={cabH} fill={isGorna ? "rgba(240, 249, 255, 0.4)" : "rgba(241, 245, 249, 0.4)"} stroke="#94a3b8" strokeWidth="4" strokeDasharray="6 4" />
                                        {isBaseOrTall && (
                                            <g>
                                                <line x1={wallWidth - cabD + 20} y1={cabY} x2={wallWidth - cabD + 20} y2={renderY} stroke="#94a3b8" strokeWidth="4" strokeDasharray="6 4" />
                                                <line x1={wallWidth - 20} y1={cabY} x2={wallWidth - 20} y2={renderY} stroke="#94a3b8" strokeWidth="4" strokeDasharray="6 4" />
                                            </g>
                                        )}
                                        <g transform="scale(1, -1)">
                                            <text x={wallWidth - cabD / 2} y={-renderY - cabH / 2 - 50} textAnchor="middle" alignmentBaseline="middle" fontSize="28" fontWeight="bold" fill="#64748b">
                                                {labelPrefix} {cabD} / {cabH}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}

                            {/* Horizontal Dimensions */}
                            <g transform="scale(1, -1)">
                                <text x={wallWidth / 2} y={-roomH - 240} textAnchor="middle" fontSize="64" fontWeight="bold" fill="#2563eb">{title}</text>
                                {renderChain(projectedUpperDeep, -roomH - 160)}
                                {renderChain(projectedUpperShallow, -roomH - 60)}
                                {renderChain(projectedBase, 100)}
                            </g>
                        </>
                    );
                })()}

                {/* Dimensions (rendered outside scale inversion for text) */}
                <g transform="scale(1, -1)">
                    {/* Height dims for wall height */}
                    <VerticalDimensionLine x={-80} y1={0} y2={-roomH} label={roomH} color="#999" fontSize={36} />

                    {/* Vertical Dimension Chain on the LeftEdge */}
                    {activeCabinets.length > 0 && (() => {
                        const verticalCuts: number[] = [0, roomH];
                        activeCabinets.forEach(cab => {
                            const isGorna = cab.cabinet.id.startsWith('gorna-');
                            const isAux = cab.cabinet.id.startsWith('blat-') || cab.cabinet.id.startsWith('blenda-') || cab.cabinet.id.startsWith('fartuch-') || cab.cabinet.id.includes('listwa-');
                            const LEG_HEIGHT = 100;
                            const isBaseOrTall = !isGorna && !isAux;

                            const bottom = isBaseOrTall ? cab.position[1] + LEG_HEIGHT : cab.position[1];
                            const top = bottom + cab.cabinet.height;
                            verticalCuts.push(bottom);
                            verticalCuts.push(top);
                        });

                        // Sort and remove duplicates (within 5mm to avoid clutter)
                        verticalCuts.sort((a, b) => a - b);
                        const uniqueCuts = verticalCuts.filter((val, i, arr) => {
                            if (i === 0) return true;
                            return val - arr[i - 1] > 5;
                        });

                        const verticalSegments = [];
                        for (let i = 0; i < uniqueCuts.length - 1; i++) {
                            verticalSegments.push({
                                y1: uniqueCuts[i],
                                y2: uniqueCuts[i + 1],
                                label: Math.round(uniqueCuts[i + 1] - uniqueCuts[i])
                            });
                        }

                        return verticalSegments.map((seg, i) => (
                            <VerticalDimensionLine
                                key={`v-chain-${i}`}
                                x={-20}
                                y1={-seg.y1}
                                y2={-seg.y2}
                                label={seg.label}
                                color="#2563eb"
                                fontSize={32}
                            />
                        ));
                    })()}
                </g>
            </g>

            {/* Controls hint */}
            <text x={40} y={viewBoxH - 30} fontSize="20" fill="#666" fontWeight="bold">Nawigacja: Strzałki Lewo/Prawo | Wyjście: C</text>
        </svg>
    );
}
