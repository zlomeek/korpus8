"use client";

import React from "react";
import { PlacedCabinet } from "./RoomPlanner";

interface ElevationDrawingProps {
    placedCabinets: PlacedCabinet[];
    roomDimensions: { width: number; depth: number; height: number };
    currentWall: 'left' | 'back' | 'right';
}

export default function ElevationDrawing({ placedCabinets, roomDimensions, currentWall }: ElevationDrawingProps) {
    const { width: roomW, depth: roomD, height: roomH } = roomDimensions;
    const padding = 200;

    // Viewbox fits a single wall
    const wallWidth = currentWall === 'back' ? roomW : roomD;
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

    const VerticalDimensionLine = ({ x, y1, y2, label, color = "#2563eb", fontSize = 24 }: any) => (
        <g>
            <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="2" />
            <line x1={x - 5} y1={y1 - 5} x2={x + 5} y2={y1 + 5} stroke={color} strokeWidth="2" />
            <line x1={x - 5} y1={y2 - 5} x2={x + 5} y2={y2 + 5} stroke={color} strokeWidth="2" />
            <text x={x - 20} y={(y1 + y2) / 2} textAnchor="middle" transform={`rotate(-90, ${x - 20}, ${(y1 + y2) / 2})`} fontSize={fontSize} fontWeight="bold" fill={color}>{label}</text>
        </g>
    );

    // Filter and map cabinets to elevations
    let activeCabinets: PlacedCabinet[] = [];
    let leftSideCabinets: PlacedCabinet[] = [];
    let rightSideCabinets: PlacedCabinet[] = [];
    let title = "";
    let getLocalX = (c: PlacedCabinet) => 0;

    const isFacingFrontBack = (r: number) => Math.abs(Math.sin(r)) < 0.1;
    const isFacingLeftRight = (r: number) => Math.abs(Math.cos(r)) < 0.1;

    if (currentWall === 'back') {
        activeCabinets = placedCabinets
            .filter(c => isFacingFrontBack(c.rotation[1]))
            .sort((a, b) => a.position[0] - b.position[0]);
        leftSideCabinets = placedCabinets.filter(c => isFacingLeftRight(c.rotation[1]) && c.position[0] < 0);
        rightSideCabinets = placedCabinets.filter(c => isFacingLeftRight(c.rotation[1]) && c.position[0] > 0);
        title = "ŚCIANA TYLNA";
        getLocalX = (c) => c.position[0] + halfW;
    } else if (currentWall === 'left') {
        activeCabinets = placedCabinets
            .filter(c => isFacingLeftRight(c.rotation[1]) && c.position[0] < 0)
            .sort((a, b) => b.position[2] - a.position[2]); // Z decreases from left to right on this view
        leftSideCabinets = placedCabinets.filter(c => isFacingFrontBack(c.rotation[1]) && c.position[2] > 0);
        rightSideCabinets = placedCabinets.filter(c => isFacingFrontBack(c.rotation[1]) && c.position[2] < 0);
        title = "ŚCIANA LEWA";
        getLocalX = (c) => halfD - c.position[2];
    } else {
        activeCabinets = placedCabinets
            .filter(c => isFacingLeftRight(c.rotation[1]) && c.position[0] > 0)
            .sort((a, b) => a.position[2] - b.position[2]); // Z increases from left to right on this view
        leftSideCabinets = placedCabinets.filter(c => isFacingFrontBack(c.rotation[1]) && c.position[2] < 0);
        rightSideCabinets = placedCabinets.filter(c => isFacingFrontBack(c.rotation[1]) && c.position[2] > 0);
        title = "ŚCIANA PRAWA";
        getLocalX = (c) => c.position[2] + halfD;
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
                    const isGorna = cab.cabinet.id.includes('gorna');

                    return (
                        <g key={cab.uuid}>
                            <rect 
                                x={localX - cabW/2} 
                                y={cabY} 
                                width={cabW} 
                                height={cabH} 
                                fill={isGorna ? "#f0f9ff" : "#f1f5f9"} 
                                stroke="#000" 
                                strokeWidth="2" 
                            />
                            {/* Measurements text labels */}
                            <g transform="scale(1, -1)">
                                <text 
                                    x={localX} 
                                    y={-cabY - cabH/2} 
                                    textAnchor="middle" 
                                    alignmentBaseline="middle" 
                                    fontSize="40" 
                                    fontWeight="bold" 
                                    fill="#333"
                                >
                                    {cabW}x{cabH}
                                </text>
                            </g>
                        </g>
                    );
                })}

                {/* Side profiles and Dimensions */}
                {(() => {
                    const getEffDepth = (cab: PlacedCabinet) => {
                        if (cab.cabinet.id.endsWith('-90')) return (cab.cabinet as any).width2 || (!cab.cabinet.id.includes('gorna') ? 900 : 650);
                        return cab.cabinet.depth;
                    };

                    // Filter overlapping side cabinets to show only the silhouette (max depth constraint)
                    const filterMaxDepth = (cabs: PlacedCabinet[]) => {
                        const uppers = cabs.filter(c => c.cabinet.id.includes('gorna'));
                        const bases = cabs.filter(c => !c.cabinet.id.includes('gorna'));
                        
                        const getTarget = (list: PlacedCabinet[]) => {
                            if (list.length === 0) return null;
                            return list.reduce((maxCab, cab) => getEffDepth(cab) > getEffDepth(maxCab) ? cab : maxCab, list[0]);
                        };
                        
                        const targets = [];
                        const maxU = getTarget(uppers);
                        if (maxU) targets.push(maxU);
                        const maxB = getTarget(bases);
                        if (maxB) targets.push(maxB);
                        return targets;
                    };

                    const processedLeft = filterMaxDepth(leftSideCabinets);
                    const processedRight = filterMaxDepth(rightSideCabinets);

                    interface ProjectedCabinet { startX: number; endX: number; label: number; isGorna: boolean; uuid: string }
                    const projectedCabinets: ProjectedCabinet[] = [];

                    activeCabinets.forEach(cab => {
                        const cabW = cab.cabinet.width;
                        const startX = getLocalX(cab) - cabW / 2;
                        projectedCabinets.push({ startX, endX: startX + cabW, label: cabW, isGorna: cab.cabinet.id.includes('gorna'), uuid: cab.uuid });
                    });

                    processedLeft.forEach(cab => {
                        const effDepth = getEffDepth(cab);
                        projectedCabinets.push({ startX: 0, endX: effDepth, label: effDepth, isGorna: cab.cabinet.id.includes('gorna'), uuid: cab.uuid + '-l' });
                    });

                    processedRight.forEach(cab => {
                        const effDepth = getEffDepth(cab);
                        projectedCabinets.push({ startX: wallWidth - effDepth, endX: wallWidth, label: effDepth, isGorna: cab.cabinet.id.includes('gorna'), uuid: cab.uuid + '-r' });
                    });

                    const renderChain = (cabinets: ProjectedCabinet[], yPos: number) => {
                        if (cabinets.length === 0) {
                            if (yPos > 0) return <DimensionLine x1={0} y1={yPos} x2={wallWidth} y2={yPos} label={Math.round(wallWidth)} color="#ef4444" fontSize={48} />;
                            return null;
                        }
                        let currentX = 0;
                        return cabinets.map((cab, i) => {
                            const items = [];
                            if (cab.startX - currentX > 5) {
                                items.push(<DimensionLine key={`gap-${cab.uuid}`} x1={currentX} y1={yPos} x2={cab.startX} y2={yPos} label={Math.round(cab.startX - currentX)} color="#ef4444" fontSize={48} />);
                            }
                            items.push(<DimensionLine key={`cab-${cab.uuid}`} x1={cab.startX} y1={yPos} x2={cab.endX} y2={yPos} label={cab.label} color="#2563eb" fontSize={48} />);
                            currentX = cab.endX;
                            if (i === cabinets.length - 1 && wallWidth - currentX > 5) {
                                items.push(<DimensionLine key={`gap-last-${cab.uuid}`} x1={currentX} y1={yPos} x2={wallWidth} y2={yPos} label={Math.round(wallWidth - currentX)} color="#ef4444" fontSize={48} />);
                            }
                            return items;
                        });
                    };

                    const projectedBase = projectedCabinets.filter(c => !c.isGorna).sort((a,b) => a.startX - b.startX);
                    const projectedUpper = projectedCabinets.filter(c => c.isGorna).sort((a,b) => a.startX - b.startX);

                    return (
                        <>
                            {/* Visual Side Profiles (not inverted) */}
                            {processedLeft.map(cab => {
                                const cabD = getEffDepth(cab);
                                const cabH = cab.cabinet.height;
                                const cabY = cab.position[1];
                                const isGorna = cab.cabinet.id.includes('gorna');
                                const labelPrefix = cab.cabinet.id.endsWith('-90') ? 'szer.' : 'gł.';
                                return (
                                    <g key={`side-l-${cab.uuid}`}>
                                        <rect x={0} y={cabY} width={cabD} height={cabH} fill={isGorna ? "rgba(240, 249, 255, 0.4)" : "rgba(241, 245, 249, 0.4)"} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" />
                                        <g transform="scale(1, -1)">
                                            <text x={cabD/2} y={-cabY - cabH/2} textAnchor="middle" alignmentBaseline="middle" fontSize="28" fontWeight="bold" fill="#64748b">
                                                {labelPrefix} {cabD} / {cabH}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                            {processedRight.map(cab => {
                                const cabD = getEffDepth(cab);
                                const cabH = cab.cabinet.height;
                                const cabY = cab.position[1];
                                const isGorna = cab.cabinet.id.includes('gorna');
                                const labelPrefix = cab.cabinet.id.endsWith('-90') ? 'szer.' : 'gł.';
                                return (
                                    <g key={`side-r-${cab.uuid}`}>
                                        <rect x={wallWidth - cabD} y={cabY} width={cabD} height={cabH} fill={isGorna ? "rgba(240, 249, 255, 0.4)" : "rgba(241, 245, 249, 0.4)"} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" />
                                        <g transform="scale(1, -1)">
                                            <text x={wallWidth - cabD/2} y={-cabY - cabH/2} textAnchor="middle" alignmentBaseline="middle" fontSize="28" fontWeight="bold" fill="#64748b">
                                                {labelPrefix} {cabD} / {cabH}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                            
                            {/* Horizontal Dimensions (Rendered inverted for text alignment logic) */}
                            <g transform="scale(1, -1)">
                                <text x={wallWidth/2} y={-roomH - 140} textAnchor="middle" fontSize="64" fontWeight="bold" fill="#2563eb">{title}</text>
                                {renderChain(projectedBase, 60)}
                                {renderChain(projectedUpper, -roomH - 60)}
                            </g>
                        </>
                    );
                })()}

                {/* Dimensions (rendered outside scale inversion for text) */}
                <g transform="scale(1, -1)">
                    {/* Height dims for wall height */}
                    <VerticalDimensionLine x={-80} y1={0} y2={-roomH} label={roomH} color="#999" fontSize={48} />
                    
                    {/* Vertical Dimension Chain on the LeftEdge */}
                    {activeCabinets.length > 0 && (() => {
                        const verticalCuts: number[] = [0, roomH];
                        activeCabinets.forEach(cab => {
                            const bottom = cab.position[1];
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
                                fontSize={40} 
                            />
                        ));
                    })()}
                </g>
            </g>

            {/* Controls hint */}
            <text x={padding} y={viewBoxH - 30} fontSize="20" fill="#666" fontWeight="bold">Nawigacja: Strzałki Lewo/Prawo | Wyjście: C</text>
        </svg>
    );
}
