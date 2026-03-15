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
            <text x={(x1 + x2) / 2} y={y1 - 10} textAnchor="middle" fontSize={fontSize} fontWeight="bold" fill={color}>{label}</text>
        </g>
    );

    const VerticalDimensionLine = ({ x, y1, y2, label, color = "#2563eb", fontSize = 24 }: any) => (
        <g>
            <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="2" />
            <line x1={x - 5} y1={y1 - 5} x2={x + 5} y2={y1 + 5} stroke={color} strokeWidth="2" />
            <line x1={x - 5} y1={y2 - 5} x2={x + 5} y2={y2 + 5} stroke={color} strokeWidth="2" />
            <text x={x - 10} y={(y1 + y2) / 2} textAnchor="middle" transform={`rotate(-90, ${x - 10}, ${(y1 + y2) / 2})`} fontSize={fontSize} fontWeight="bold" fill={color}>{label}</text>
        </g>
    );

    // Filter and map cabinets to elevations
    let activeCabinets: PlacedCabinet[] = [];
    let title = "";
    let getLocalX = (c: PlacedCabinet) => 0;

    if (currentWall === 'back') {
        activeCabinets = placedCabinets
            .filter(c => Math.abs(c.rotation[1]) < 0.1)
            .sort((a, b) => a.position[0] - b.position[0]);
        title = "ŚCIANA TYLNA";
        getLocalX = (c) => c.position[0] + halfW;
    } else if (currentWall === 'left') {
        activeCabinets = placedCabinets
            .filter(c => (Math.abs(c.rotation[1] - Math.PI/2) < 0.1 || Math.abs(c.rotation[1] + Math.PI/2) < 0.1) && c.position[0] < 0)
            .sort((a, b) => a.position[2] - b.position[2]);
        title = "ŚCIANA LEWA";
        getLocalX = (c) => c.position[2] + halfD;
    } else {
        activeCabinets = placedCabinets
            .filter(c => (Math.abs(c.rotation[1] - Math.PI/2) < 0.1 || Math.abs(c.rotation[1] + Math.PI/2) < 0.1) && c.position[0] > 0)
            .sort((a, b) => a.position[2] - b.position[2]);
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
                                    fontSize="24" 
                                    fontWeight="bold" 
                                    fill="#333"
                                >
                                    {cabW}x{cabH}
                                </text>
                            </g>
                        </g>
                    );
                })}

                {/* Dimensions (rendered outside scale inversion for text) */}
                <g transform="scale(1, -1)">
                    <text x={wallWidth/2} y={-roomH - 60} textAnchor="middle" fontSize="48" fontWeight="bold" fill="#2563eb">{title}</text>
                    
                    {/* Width Dimensions for wall gaps & cabinets */}
                    {activeCabinets.length > 0 ? (() => {
                        let currentX = 0;
                        return activeCabinets.map((cab, i) => {
                            const cabW = cab.cabinet.width;
                            const startX = getLocalX(cab) - cabW / 2;
                            const endX = startX + cabW;
                            const items = [];

                            // Gap to left
                            if (startX - currentX > 5) {
                                items.push(<DimensionLine key={`gap-${i}`} x1={currentX} y1={-20} x2={startX} y2={-20} label={Math.round(startX - currentX)} color="#ef4444" fontSize={28} />);
                            }
                            // Cabinet width
                            items.push(<DimensionLine key={`cab-${i}`} x1={startX} y1={-20} x2={endX} y2={-20} label={cabW} color="#2563eb" fontSize={28} />);
                            
                            currentX = endX;
                            if (i === activeCabinets.length - 1 && wallWidth - endX > 5) {
                                items.push(<DimensionLine key={`gap-last`} x1={endX} y1={-20} x2={wallWidth} y2={-20} label={Math.round(wallWidth - endX)} color="#ef4444" fontSize={28} />);
                            }
                            return items;
                        });
                    })() : (
                        <DimensionLine x1={0} y1={-20} x2={wallWidth} y2={-20} label={Math.round(wallWidth)} color="#ef4444" fontSize={28} />
                    )}

                    {/* Height dims for wall height */}
                    <VerticalDimensionLine x={-50} y1={0} y2={-roomH} label={roomH} color="#999" fontSize={28} />
                    
                    {/* Vertical placement of cabinets from floor */}
                    {activeCabinets.map((cab, idx) => {
                        const cabY = cab.position[1];
                        const cabH = cab.cabinet.height;
                        if (cabY > 5) {
                             return <VerticalDimensionLine key={`v-dist-${idx}`} x={getLocalX(cab) + cab.cabinet.width/2 + 20} y1={0} y2={-cabY} label={Math.round(cabY)} color="#10b981" fontSize={20} />;
                        }
                        return null;
                    })}
                </g>
            </g>

            {/* Controls hint */}
            <text x={padding} y={viewBoxH - 30} fontSize="20" fill="#666" fontWeight="bold">Nawigacja: Strzałki Lewo/Prawo | Wyjście: C</text>
        </svg>
    );
}
