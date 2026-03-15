"use client";

import React, { useState, useEffect } from "react";
import { Cabinet, cabinetTemplates } from "@/data/cabinets";
import { generateFixedElements, defaultPricingSettings } from "@/lib/calculate";
import RoomScene from "@/components/RoomPlanner/RoomScene";
import CabinetForm from "@/components/CabinetForm";
import TechnicalDrawing from "@/components/RoomPlanner/TechnicalDrawing";
import ElevationDrawing from "@/components/RoomPlanner/ElevationDrawing";

export interface PlacedCabinet {
    uuid: string;
    cabinet: Cabinet;
    position: [number, number, number];
    rotation: [number, number, number];
    isLocked?: boolean;
}

interface RoomPlannerProps {
    roomDimensions: { width: number; depth: number; height: number };
    onReset: () => void;
}

export default function RoomPlanner({ roomDimensions, onReset }: RoomPlannerProps) {
    const [placedCabinets, setPlacedCabinets] = useState<PlacedCabinet[]>([]);
    const [selectedCabinetIds, setSelectedCabinetIds] = useState<string[]>([]);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isTechnicalView, setIsTechnicalView] = useState(false);
    const [isElevationView, setIsElevationView] = useState(false);
    const [currentElevationWall, setCurrentElevationWall] = useState<'left' | 'back' | 'right'>('back');
    const [showTechnicalBanner, setShowTechnicalBanner] = useState(false);
    const [showElevationBanner, setShowElevationBanner] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, cabUuid: string } | null>(null);

    useEffect(() => {
        if (isTechnicalView) {
            setShowTechnicalBanner(true);
            const timer = setTimeout(() => setShowTechnicalBanner(false), 2000);
            return () => clearTimeout(timer);
        } else if (isElevationView) {
            setShowElevationBanner(true);
            const timer = setTimeout(() => setShowElevationBanner(false), 2000);
            return () => clearTimeout(timer);
        } else {
            setShowTechnicalBanner(false);
            setShowElevationBanner(false);
        }
    }, [isTechnicalView, isElevationView]);

    // Close context menu on any click outside
    useEffect(() => {
        const handleGlobalClick = () => setContextMenu(null);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'x') {
                setIsPreviewMode(prev => {
                    if (!prev) setSelectedCabinetIds([]); // Clear selection when entering preview
                    return !prev;
                });
            } else if (e.key.toLowerCase() === 'z') {
                setIsTechnicalView(prev => !prev);
                setIsElevationView(false);
            } else if (e.key.toLowerCase() === 'c') {
                setIsElevationView(prev => !prev);
                setIsTechnicalView(false);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                // Cycle elevation wall
                setIsElevationView(isElevation => {
                    if (isElevation) {
                        setCurrentElevationWall(prev => {
                            const walls: ('left' | 'back' | 'right')[] = ['left', 'back', 'right'];
                            const idx = walls.indexOf(prev);
                            if (e.key === 'ArrowRight') return walls[(idx + 1) % 3];
                            return walls[(idx - 1 + 3) % 3];
                        });
                    }
                    return isElevation;
                });
            }
        };
        window.addEventListener('click', handleGlobalClick);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('click', handleGlobalClick);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Group templates by category
    const categories = [
        { name: "Szafki dolne", templates: cabinetTemplates.filter(c => c.id.startsWith('dolna') && !c.id.includes('lodowka') && !c.id.includes('piekarnik')) },
        { name: "Szafki górne", templates: cabinetTemplates.filter(c => c.id.startsWith('gorna')) },
        { name: "Słupki wysokie", templates: cabinetTemplates.filter(c => c.id.includes('lodowka') || c.id.includes('piekarnik')) }
    ];

    const handleAddCabinetToRoom = (template: Cabinet) => {
        const isUpper = template.id.startsWith("gorna-");
        const defaultY = isUpper ? 1400 : 0;

        const allowFullTopOption = ['dolna-standard', 'dolna-narozna'].includes(template.id);
        const forceFullTop = !allowFullTopOption && template.id !== 'dolna-zlew';
        const isFullTop = (template as any).isFullTop !== undefined ? (template as any).isFullTop : forceFullTop;

        const fridgeSpaceHeight = (template as any).fridgeSpaceHeight || 1780;
        const ovenSpaceHeight = (template as any).ovenSpaceHeight || 590;
        const microwaveSpaceHeight = (template as any).microwaveSpaceHeight || 380;
        const ovenBaseHeight = (template as any).ovenBaseHeight || 720;
        const cornerOrientation = (template as any).cornerOrientation || 'right';
        const frontWidth = (template as any).frontWidth || 600;
        const w2 = (template as any).width2 || (template.id.startsWith('gorna-') ? 650 : 900);

        // Initialize elements using generateFixedElements to ensure everything is set (even if template is empty)
        const initialElements = generateFixedElements(
            template.width,
            template.height,
            template.depth,
            isFullTop,
            (template as any).configurationOptions?.[0] || "",
            template.id,
            cornerOrientation,
            frontWidth,
            fridgeSpaceHeight,
            ovenSpaceHeight,
            [],
            [],
            microwaveSpaceHeight,
            ovenBaseHeight,
            w2,
            false // Default to no fronts
        );

        const newPlacedCabinet: PlacedCabinet = {
            uuid: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            cabinet: {
                ...template,
                isFullTop,
                fridgeSpaceHeight,
                ovenSpaceHeight,
                microwaveSpaceHeight,
                ovenBaseHeight,
                cornerOrientation,
                frontWidth,
                width2: w2,
                elements: initialElements,
                hasFronts: false,
                bodyColor: '#fefdf5'
            },
            position: [0, defaultY, 0],
            rotation: [0, 0, 0]
        };

        setPlacedCabinets(prev => [...prev, newPlacedCabinet]);
        setSelectedCabinetIds([newPlacedCabinet.uuid]);
    };

    const handleSelectCabinet = (uuid: string, ctrlKey: boolean) => {
        if (ctrlKey) {
            setSelectedCabinetIds(prev => 
                prev.includes(uuid) 
                    ? prev.filter(id => id !== uuid) 
                    : [...prev, uuid]
            );
        } else {
            setSelectedCabinetIds([uuid]);
        }
    };

    const handleUpdateCabinet = (uuid: string, position: [number, number, number], rotation: [number, number, number]) => {
        setPlacedCabinets(prev => prev.map(cab =>
            cab.uuid === uuid ? { ...cab, position, rotation } : cab
        ));
    };

    const handleRemoveCabinet = (uuids: string[]) => {
        setPlacedCabinets(prev => prev.filter(cab => !uuids.includes(cab.uuid)));
        setSelectedCabinetIds(prev => prev.filter(id => !uuids.includes(id)));
    };

    // UI rotation controls for the currently selected cabinets
    const rotateSelected = (direction: 'left' | 'right') => {
        if (selectedCabinetIds.length === 0) return;

        setPlacedCabinets(prev => prev.map(cab => {
            if (selectedCabinetIds.includes(cab.uuid)) {
                const currentRotY = cab.rotation[1];
                const newRotY = direction === 'left'
                    ? currentRotY + (Math.PI / 2) // +90 deg
                    : currentRotY - (Math.PI / 2); // -90 deg
                return { ...cab, rotation: [0, newRotY, 0] };
            }
            return cab;
        }));
    };

    const handleDuplicateCabinet = (uuid: string) => {
        const original = placedCabinets.find(c => c.uuid === uuid);
        if (!original) return;

        const newUuid = `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newPlacedCabinet: PlacedCabinet = {
            ...JSON.parse(JSON.stringify(original)), // Deep clone
            uuid: newUuid,
            position: [original.position[0] + 50, original.position[1], original.position[2] + 50] // Slight offset
        };

        setPlacedCabinets(prev => [...prev, newPlacedCabinet]);
        setSelectedCabinetIds([newUuid]);
        setContextMenu(null);
    };

    const handleToggleLock = (uuids: string[]) => {
        setPlacedCabinets(prev => prev.map(cab =>
            uuids.includes(cab.uuid) ? { ...cab, isLocked: !cab.isLocked } : cab
        ));
        setContextMenu(null);
    };

    const handleMoveAwayFromWall = (uuids: string[]) => {
        setPlacedCabinets(prev => prev.map(cab => {
            if (uuids.includes(cab.uuid)) {
                const rotY = cab.rotation[1];
                const dx = 50 * Math.sin(rotY);
                const dz = 50 * Math.cos(rotY);
                return {
                    ...cab,
                    position: [cab.position[0] + dx, cab.position[1], cab.position[2] + dz]
                };
            }
            return cab;
        }));
        setContextMenu(null);
    };

    const handleSaveConfiguration = (updatedCabinet: Cabinet) => {
        setPlacedCabinets(prev => prev.map(cab => {
            if (cab.uuid === selectedCabinetIds[0]) {
                return {
                    ...cab,
                    cabinet: updatedCabinet
                };
            }
            return cab;
        }));
        setIsConfiguratorOpen(false);
    };

    const handleToggleFronts = (uuids: string[], hasFronts: boolean) => {
        setPlacedCabinets(prev => prev.map(cab => {
            if (uuids.includes(cab.uuid)) {
                const allowFullTopOption = ['dolna-standard', 'dolna-narozna'].includes(cab.cabinet.id);
                const forceFullTop = !allowFullTopOption && cab.cabinet.id !== 'dolna-zlew';
                const isFullTop = (cab.cabinet as any).isFullTop !== undefined ? (cab.cabinet as any).isFullTop : forceFullTop;

                const c = cab.cabinet as any;
                const w2 = (cab.cabinet as any).width2 || (cab.cabinet.id.startsWith('gorna-') ? 650 : 900);
                const updatedElements = generateFixedElements(
                    cab.cabinet.width,
                    cab.cabinet.height,
                    cab.cabinet.depth,
                    isFullTop,
                    c.configuration,
                    c.id,
                    c.cornerOrientation,
                    c.frontWidth,
                    c.fridgeSpaceHeight,
                    c.ovenSpaceHeight,
                    c.configUnder,
                    c.configAbove,
                    c.microwaveSpaceHeight,
                    c.ovenBaseHeight,
                    w2,
                    hasFronts,
                    c.frontMaterial,
                    c.splitCargoFront
                );
                return {
                    ...cab,
                    cabinet: {
                        ...cab.cabinet,
                        hasFronts,
                        elements: updatedElements
                    }
                };
            }
            return cab;
        }));
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#1a1a1a', color: '#fff' }}>
            {/* Sidebar / Library */}
            <div style={{ width: '300px', background: '#2c2c2c', display: 'flex', flexDirection: 'column', borderRight: '1px solid #444', zIndex: 10 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Biblioteka Szafek</h2>
                    <button onClick={onReset} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', textDecoration: 'underline' }}>
                        Nowy Pokój
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {categories.map((cat) => (
                        <div key={cat.name}>
                            <h3 style={{ fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', borderBottom: '1px solid #333', paddingBottom: '0.3rem' }}>
                                {cat.name}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {cat.templates.map((template) => (
                                    <div
                                        key={template.id}
                                        style={{
                                            background: '#3a3a3a',
                                            padding: '0.8rem',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            border: '1px solid #555',
                                            transition: 'background 0.2s'
                                        }}
                                        onClick={() => handleAddCabinetToRoom(template)}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#4a4a4a'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#3a3a3a'}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{template.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#bbb', marginTop: '0.2rem' }}>
                                            {template.width}x{template.height}x{template.depth} mm
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Properties panel for Selected Cabinets */}
                {selectedCabinetIds.length > 0 && (
                    <div style={{ padding: '1rem', borderTop: '1px solid #444', background: '#242424' }}>
                        <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', color: '#4ade80' }}>
                            {selectedCabinetIds.length === 1 ? 'Zaznaczona szafka' : `Zaznaczono szafek: ${selectedCabinetIds.length}`}
                        </h3>

                        <div style={{ marginBottom: '1rem' }}>
                            {selectedCabinetIds.length === 1 && (
                                <button
                                    onClick={() => setIsConfiguratorOpen(true)}
                                    style={{ width: '100%', padding: '0.6rem', background: '#4ade80', color: '#1a1a1a', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '0.5rem' }}
                                >
                                    Konfiguruj szafkę 🛠️
                                </button>
                            )}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedCabinetIds.every(id => (placedCabinets.find(c => c.uuid === id)?.cabinet as any).hasFronts)}
                                    onChange={(e) => handleToggleFronts(selectedCabinetIds, e.target.checked)}
                                />
                                Fronty zewnętrzne
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <button
                                onClick={() => rotateSelected('left')}
                                style={{ flex: 1, padding: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Obróć ↺
                            </button>
                            <button
                                onClick={() => rotateSelected('right')}
                                style={{ flex: 1, padding: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Obróć ↻
                            </button>
                        </div>

                        <button
                            onClick={() => handleRemoveCabinet(selectedCabinetIds)}
                            style={{ width: '100%', padding: '0.5rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Usuń {selectedCabinetIds.length > 1 ? 'zaznaczone' : ''} ze sceny
                        </button>
                    </div>
                )}
            </div>

            {/* Main 3D Viewport */}
            <div style={{ flex: 1, position: 'relative' }}>
                <RoomScene
                    roomDimensions={roomDimensions}
                    placedCabinets={placedCabinets}
                    selectedCabinetIds={selectedCabinetIds}
                    onSelectCabinet={handleSelectCabinet}
                    onUpdateCabinet={handleUpdateCabinet}
                    onContextMenu={(uuid, event) => !isPreviewMode && !isTechnicalView && setContextMenu({ ...event, cabUuid: uuid })}
                    isPreviewMode={isPreviewMode}
                    isTechnicalView={isTechnicalView}
                />
            </div>

            {/* Technical View Overlay */}
            {isTechnicalView && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1500, background: '#fff' }}>
                    <TechnicalDrawing placedCabinets={placedCabinets} roomDimensions={roomDimensions} />
                    {showTechnicalBanner && (
                        <div style={{ 
                            position: 'absolute', 
                            top: '20px', 
                            left: '50%', 
                            transform: 'translateX(-50%)',
                            background: 'rgba(34, 197, 94, 0.9)', // Green color for technical
                            color: '#fff',
                            padding: '10px 30px',
                            borderRadius: '30px',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                            zIndex: 2000,
                            border: '2px solid rgba(255,255,255,0.2)',
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '1.4rem' }}>📐</span>
                            WIDOK TECHNICZNY (Wciśnij Z aby wyjść)
                        </div>
                    )}
                </div>
            )}

            {/* Elevation View Overlay */}
            {isElevationView && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1500, background: '#fff' }}>
                    <ElevationDrawing 
                        placedCabinets={placedCabinets} 
                        roomDimensions={roomDimensions} 
                        currentWall={currentElevationWall}
                    />
                    {showElevationBanner && (
                        <div style={{ 
                            position: 'absolute', 
                            top: '20px', 
                            left: '50%', 
                            transform: 'translateX(-50%)',
                            background: 'rgba(59, 130, 246, 0.9)', // Blue color for elevation
                            color: '#fff',
                            padding: '10px 30px',
                            borderRadius: '30px',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                            zIndex: 2000,
                            border: '2px solid rgba(255,255,255,0.2)',
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '1.4rem' }}>📏</span>
                            WIDOK Z PRZODU ({currentElevationWall.toUpperCase()}) - Zmień ścianę ← →
                        </div>
                    )}
                </div>
            )}

            {/* Preview Mode Notification Banner */}
            {isPreviewMode && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(59, 130, 246, 0.9)',
                    color: '#fff',
                    padding: '10px 30px',
                    borderRadius: '30px',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    zIndex: 2000,
                    border: '2px solid rgba(255,255,255,0.2)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '1.4rem' }}>👁️</span>
                    TRYB PODGLĄDU (Wciśnij X aby wyjść)
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        background: '#2c2c2c',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        padding: '4px 0',
                        zIndex: 1000,
                        minWidth: '160px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ContextButton 
                        label="Konfiguruj szafkę 🛠️" 
                        onClick={() => {
                            setSelectedCabinetIds([contextMenu.cabUuid]);
                            setIsConfiguratorOpen(true);
                            setContextMenu(null);
                        }} 
                    />
                    <ContextButton 
                        label="Duplikuj 📑" 
                        onClick={() => handleDuplicateCabinet(contextMenu.cabUuid)} 
                    />
                    <ContextButton 
                        label="Obróć o 90° ↻" 
                        onClick={() => {
                            const targets = selectedCabinetIds.includes(contextMenu.cabUuid) ? selectedCabinetIds : [contextMenu.cabUuid];
                            if (!selectedCabinetIds.includes(contextMenu.cabUuid)) {
                                setSelectedCabinetIds([contextMenu.cabUuid]);
                            }
                            rotateSelected('right');
                            setContextMenu(null);
                        }} 
                    />
                    <ContextButton 
                        label={placedCabinets.find(c => c.uuid === contextMenu.cabUuid)?.isLocked ? "Odblokuj 🔓" : "Zablokuj 🔒"} 
                        onClick={() => {
                            const targets = selectedCabinetIds.includes(contextMenu.cabUuid) ? selectedCabinetIds : [contextMenu.cabUuid];
                            handleToggleLock(targets);
                        }} 
                    />
                    {(() => {
                        const cab = placedCabinets.find(c => c.uuid === contextMenu.cabUuid);
                        if (!cab || cab.cabinet.id.startsWith('gorna-')) return null;
                        
                        // Check if against wall
                        const { position, rotation, cabinet } = cab;
                        const rotY = rotation[1];
                        const effDepth = cabinet.id.endsWith('-90') ? ((cabinet as any).width2 || 900) : cabinet.depth;
                        
                        const worldX = position[0] - (effDepth / 2) * Math.sin(rotY);
                        const worldZ = position[2] - (effDepth / 2) * Math.cos(rotY);

                        const margin = 10;
                        const roomHalfW = roomDimensions.width / 2;
                        const roomHalfD = roomDimensions.depth / 2;
                        
                        const isAgainstWall = 
                            Math.abs(worldZ - (-roomHalfD)) < margin || 
                            Math.abs(worldX - (-roomHalfW)) < margin || 
                            Math.abs(worldX - roomHalfW) < margin;

                        if (!isAgainstWall) return null;

                        return (
                            <ContextButton 
                                label="Odsuń o 5cm od ściany 📏" 
                                onClick={() => {
                                    const targets = selectedCabinetIds.includes(contextMenu.cabUuid) ? selectedCabinetIds : [contextMenu.cabUuid];
                                    handleMoveAwayFromWall(targets);
                                }} 
                            />
                        );
                    })()}
                    <div style={{ height: '1px', background: '#444', margin: '4px 0' }} />
                    <ContextButton 
                        label="Usuń szafkę 🗑️" 
                        color="#ef4444"
                        onClick={() => {
                            const targets = selectedCabinetIds.includes(contextMenu.cabUuid) ? selectedCabinetIds : [contextMenu.cabUuid];
                            handleRemoveCabinet(targets);
                            setContextMenu(null);
                        }} 
                    />
                </div>
            )}

            {/* Overlay hint */}
            <div style={{ position: 'absolute', top: '1rem', left: '320px', background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', borderRadius: '20px', pointerEvents: 'none' }}>
                <span style={{ fontSize: '0.85rem' }}>Przeciągaj szafki myszą (strzałki). Kliknij z CTRL by przesunąć góra/dół. Prawy przycisk myszy obraca kamerę.</span>
            </div>

            {/* Configurator Modal */}
            {isConfiguratorOpen && selectedCabinetIds.length === 1 && (
                <CabinetForm
                    cabinet={placedCabinets.find(c => c.uuid === selectedCabinetIds[0])!.cabinet}
                    settings={defaultPricingSettings}
                    onClose={() => setIsConfiguratorOpen(false)}
                    onAddToCart={(updatedCab) => handleSaveConfiguration(updatedCab)}
                />
            )}
        </div>
    );
}

function ContextButton({ label, onClick, color = '#fff' }: { label: string, onClick: () => void, color?: string }) {
    const [isHovered, setIsHovered] = React.useState(false);
    
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                width: '100%',
                padding: '8px 16px',
                background: isHovered ? '#3a3a3a' : 'transparent',
                border: 'none',
                color: color,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}
        >
            {label}
        </button>
    );
}
