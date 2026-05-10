"use client";

import React, { useState, useEffect } from "react";
import { Cabinet, cabinetTemplates } from "@/data/cabinets";
import { generateFixedElements, defaultPricingSettings, getCollisionRects } from "@/lib/calculate";
import RoomScene from "@/components/RoomPlanner/RoomScene";
import CabinetForm from "@/components/CabinetForm";
import TechnicalDrawing from "@/components/RoomPlanner/TechnicalDrawing";
import ElevationDrawing from "@/components/RoomPlanner/ElevationDrawing";
import CartPanel from "@/components/RoomPlanner/CartPanel";
import DecorSelector from "@/components/DecorSelector";
import { Decor } from "@/data/decors";

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

    // DEBUG: Expose state to window
    if (typeof window !== 'undefined') {
        (window as any).placedCabinetsDebug = placedCabinets;
    }

    const [selectedCabinetIds, setSelectedCabinetIds] = useState<string[]>([]);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isTechnicalView, setIsTechnicalView] = useState(false);
    const [isElevationView, setIsElevationView] = useState(false);
    const [technicalFilter, setTechnicalFilter] = useState<'lower' | 'upper-shallow' | 'upper-deep'>('lower');
    const [currentElevationWall, setCurrentElevationWall] = useState<'left' | 'back' | 'right' | 'front'>('back');
    const [showTechnicalBanner, setShowTechnicalBanner] = useState(false);
    const [showElevationBanner, setShowElevationBanner] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, cabUuid: string } | null>(null);
    const [lyzwaCabUuid, setLyzwaCabUuid] = useState<string | null>(null);
    const [extensionPrompt, setExtensionPrompt] = useState<{ uuids: string[], direction: 'left' | 'right' } | null>(null);
    const [blendaWidth, setBlendaWidth] = useState<number>(200);
    const [blendaHeight, setBlendaHeight] = useState<number>(200);
    const [showFrontEdges, setShowFrontEdges] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [globalDecorMode, setGlobalDecorMode] = useState<'body' | 'front' | null>(null);
    const [selectionDecorMode, setSelectionDecorMode] = useState<'body' | 'front' | null>(null);
    const [isHudVisible, setIsHudVisible] = useState(true);
    const [wallOpacities, setWallOpacities] = useState<Record<string, number>>({
        'wall-back': 1.0,
        'wall-left': 1.0,
        'wall-right': 1.0
    });

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
                // } else if (e.key.toLowerCase() === 'c') {
                //     setIsElevationView(prev => !prev);
                //     setIsTechnicalView(false);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                if (isElevationView) {
                    setCurrentElevationWall(prev => {
                        const walls: ('left' | 'back' | 'right' | 'front')[] = ['left', 'back', 'right', 'front'];
                        const idx = walls.indexOf(prev);
                        if (e.key === 'ArrowRight') return walls[(idx + 1) % 4];
                        return walls[(idx - 1 + 4) % 4];
                    });
                }
            } else if (e.key === ']') {
                setIsHudVisible(prev => !prev);
            }
        };
        window.addEventListener('click', handleGlobalClick);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('click', handleGlobalClick);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isElevationView, isTechnicalView]);

    // Group templates by category
    const categories = [
        { name: "Szafki dolne", templates: cabinetTemplates.filter(c => c.id.startsWith('dolna') && !c.id.includes('lodowka') && (c.id === 'dolna-piekarnik-podblatowa' || !c.id.includes('piekarnik'))) },
        { name: "Szafki górne", templates: cabinetTemplates.filter(c => c.id.startsWith('gorna')) },
        { name: "Słupki wysokie", templates: cabinetTemplates.filter(c => c.id.includes('lodowka') || (c.id.includes('piekarnik') && c.id !== 'dolna-piekarnik-podblatowa')) },
        { name: "Blaty Robocze", templates: cabinetTemplates.filter(c => c.id.startsWith('blat')) }
    ];

    const handleAddCabinetToRoom = (template: Cabinet) => {
        const isUpper = template.id.startsWith("gorna-");
        const isBlat = template.id.startsWith("blat-");
        const defaultY = isUpper ? 1400 : (isBlat ? 820 : 0);

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

        const hoodCutoutWidth = (template as any).hoodCutoutWidth || Math.max(0, template.width - 76);
        const hoodCutoutOffset = (template as any).hoodCutoutOffset !== undefined ? (template as any).hoodCutoutOffset : Math.round((template.width - 36 - hoodCutoutWidth) / 2);

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
            false, // Default to no fronts
            'Płyta laminowana 18mm', // frontMaterial
            false, // splitCargoFront
            (template as any).hoodHeight,
            (template as any).hoodCutoutSide,
            hoodCutoutOffset,
            hoodCutoutWidth,
            (template as any).hoodCutoutDepth,
            (template as any).hoodHoleSide,
            (template as any).hoodHoleOffset,
            (template as any).hasHoodHoleTop,
            (template as any).hasShelfHoles,
            (template as any).shelfHoleCount,
            (template as any).extendFrontDown || false,
            (template as any).depthRogowa || false
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
                bodyColor: '#fefdf5',
                hoodHeight: (template as any).hoodHeight || (template.id === 'gorna-okapowa' ? 150 : undefined),
                hoodCutoutSide: (template as any).hoodCutoutSide || 'left',
                hoodCutoutWidth: hoodCutoutWidth,
                hoodCutoutOffset: hoodCutoutOffset,
                hoodCutoutDepth: (template as any).hoodCutoutDepth || 272,
                hoodHoleSide: (template as any).hoodHoleSide || 'left',
                hoodHoleOffset: (template as any).hoodHoleOffset !== undefined ? (template as any).hoodHoleOffset : 95,
                hasHoodHoleTop: (template as any).hasHoodHoleTop !== undefined ? (template as any).hasHoodHoleTop : false,
                hasShelfHoles: (template as any).hasShelfHoles || false,
                shelfHoleCount: (template as any).shelfHoleCount || 0
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

    const handleSetGlobalDecor = (decor: Decor) => {
        if (!globalDecorMode) return;
        setPlacedCabinets(prev => prev.map(cab => {
            const c = cab.cabinet as any;
            const allowFullTopOption = ['dolna-standard', 'dolna-narozna'].includes(c.id);
            const forceFullTop = !allowFullTopOption && c.id !== 'dolna-zlew';
            const isFullTop = c.isFullTop !== undefined ? c.isFullTop : forceFullTop;

            const updatedElements = generateFixedElements(
                c.width,
                c.height,
                c.depth,
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
                c.width2,
                c.hasFronts,
                c.frontMaterial,
                c.splitCargoFront,
                c.hoodHeight,
                c.hoodCutoutSide,
                c.hoodCutoutOffset,
                c.hoodCutoutWidth,
                c.hoodCutoutDepth,
                c.hoodHoleSide,
                c.hoodHoleOffset,
                c.hasHoodHoleTop,
                c.hasShelfHoles,
                c.shelfHoleCount,
                c.extendFrontDown || false,
                c.depthRogowa || false,
                c.pipeSegmentsEnabled
            );

            return {
                ...cab,
                cabinet: {
                    ...cab.cabinet,
                    [globalDecorMode === 'body' ? 'bodyDecorId' : 'frontDecorId']: decor.id,
                    elements: updatedElements
                }
            };
        }));
        setGlobalDecorMode(null);
    };

    const handleSetSelectionDecor = (decor: Decor) => {
        if (!selectionDecorMode) return;
        setPlacedCabinets(prev => prev.map(cab => {
            if (!selectedCabinetIds.includes(cab.uuid)) return cab;

            const c = cab.cabinet as any;
            const allowFullTopOption = ['dolna-standard', 'dolna-narozna'].includes(c.id);
            const forceFullTop = !allowFullTopOption && c.id !== 'dolna-zlew';
            const isFullTop = c.isFullTop !== undefined ? c.isFullTop : forceFullTop;

            const updatedElements = generateFixedElements(
                c.width,
                c.height,
                c.depth,
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
                c.width2,
                c.hasFronts,
                c.frontMaterial,
                c.splitCargoFront,
                c.hoodHeight,
                c.hoodCutoutSide,
                c.hoodCutoutOffset,
                c.hoodCutoutWidth,
                c.hoodCutoutDepth,
                c.hoodHoleSide,
                c.hoodHoleOffset,
                c.hasHoodHoleTop,
                c.hasShelfHoles,
                c.shelfHoleCount,
                c.extendFrontDown || false,
                c.depthRogowa || false,
                c.pipeSegmentsEnabled
            );

            return {
                ...cab,
                cabinet: {
                    ...cab.cabinet,
                    [selectionDecorMode === 'body' ? 'bodyDecorId' : 'frontDecorId']: decor.id,
                    elements: updatedElements
                }
            };
        }));
        setSelectionDecorMode(null);
    };

    const handleToggleLock = (uuids: string[]) => {
        setPlacedCabinets(prev => prev.map(cab =>
            uuids.includes(cab.uuid) ? { ...cab, isLocked: !cab.isLocked } : cab
        ));
        setContextMenu(null);
    };

    const handleMoveForward = (uuids: string[], distance: number) => {
        setPlacedCabinets(prev => prev.map(cab => {
            if (uuids.includes(cab.uuid)) {
                const rotY = cab.rotation[1];
                const dx = distance * Math.sin(rotY);
                const dz = distance * Math.cos(rotY);
                return {
                    ...cab,
                    position: [cab.position[0] + dx, cab.position[1], cab.position[2] + dz]
                };
            }
            return cab;
        }));
        setContextMenu(null);
    };

    const handleMoveAwayFromWall = (uuids: string[]) => handleMoveForward(uuids, 50);

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
                    c.splitCargoFront,
                    c.hoodHeight,
                    c.hoodCutoutSide,
                    c.hoodCutoutOffset,
                    c.hoodCutoutWidth,
                    c.hoodCutoutDepth,
                    c.hoodHoleSide,
                    c.hoodHoleOffset,
                    c.hasHoodHoleTop,
                    c.hasShelfHoles,
                    c.shelfHoleCount,
                    c.extendFrontDown || false,
                    c.depthRogowa || false
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

    const handleAddSharedCountertop = (uuids: string[]) => {
        const targets = placedCabinets.filter(c => uuids.includes(c.uuid));
        if (targets.length === 0) return;

        // Baza obrotu: priorytetyzujemy szafki proste (unikamy rotacji szafek narożnych)
        const normalCab = targets.find(c => !c.cabinet.id.includes('narozna') && !c.cabinet.id.includes('rogowa'));
        const baseRotY = normalCab ? normalCab.rotation[1] : targets[0].rotation[1];

        // -----------------------------------------------------------------------
        // KONWENCJA RUCHU: przód szafki = +sin(rotY), +cos(rotY) (patrz handleMoveAwayFromWall)
        // Tył szafki = jej środek - (depth/2) * (sin(rotY), cos(rotY))
        // -----------------------------------------------------------------------

        // Dla szerokości (X) używamy wszystkich szafek; dla głębokości (Z) tylko równoległych
        let minLocalX = Infinity;
        let maxLocalX = -Infinity;

        targets.forEach(c => {
            const isL90 = c.cabinet.id.endsWith('-90');
            const w = c.cabinet.width;
            const d = isL90 ? ((c.cabinet as any).width2 || c.cabinet.width) : c.cabinet.depth;
            const cosVal = Math.cos(c.rotation[1]);
            const sinVal = Math.sin(c.rotation[1]);

            [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].forEach(([lx, lz]) => {
                const wx = c.position[0] + lx * cosVal - lz * sinVal;
                const wz = c.position[2] + lx * sinVal + lz * cosVal;
                const localX = wx * Math.cos(-baseRotY) - wz * Math.sin(-baseRotY);
                minLocalX = Math.min(minLocalX, localX);
                maxLocalX = Math.max(maxLocalX, localX);
            });
        });

        const totalWidth = Math.abs(maxLocalX - minLocalX);
        const centerLocalX = (minLocalX + maxLocalX) / 2;

        // Używamy szafki referencyjnej do ustalenia głębokości
        const refCab = normalCab || targets[0];
        const rotY = refCab.rotation[1];
        const refD = refCab.cabinet.depth;

        // Tył szafki w przestrzeni świata: środek - (depth/2) w kierunku przodu
        // Przód = +sin(rotY) w X, +cos(rotY) w Z
        const backWorldX = refCab.position[0] - (refD / 2) * Math.sin(rotY);
        const backWorldZ = refCab.position[2] - (refD / 2) * Math.cos(rotY);

        // Środek blatu (600mm): tył blatu = tył szafki, więc środek blatu jest 300mm "do przodu"
        const counterCenterX = backWorldX + 300 * Math.sin(rotY);
        const counterCenterZ = backWorldZ + 300 * Math.cos(rotY);

        // Przenosimy środek blatu na środek szerokości (centerLocalX)
        // Środek szerokości blatu w świecie (wzdłuż osi X lokalnej blatu):
        const widthAxisX = Math.cos(rotY);  // Jednostkowy wektor osi X lokalnej blatu w świecie X
        const widthAxisZ = Math.sin(rotY);  // Jednostkowy wektor osi X lokalnej blatu w świecie Z

        // lx = wx * cos(-rotY) - wz * sin(-rotY) — lokalny X szafki ref:
        const refLocalX = refCab.position[0] * Math.cos(-baseRotY) - refCab.position[2] * Math.sin(-baseRotY);
        const deltaLocalX = centerLocalX - refLocalX;

        const worldX = counterCenterX + deltaLocalX * widthAxisX;
        const worldZ = counterCenterZ + deltaLocalX * widthAxisZ;

        console.log(`[BLAT] refCab back: [${backWorldX.toFixed(0)}, ${backWorldZ.toFixed(0)}]`
            + ` | center: [${counterCenterX.toFixed(0)}, ${counterCenterZ.toFixed(0)}]`
            + ` | final: [${worldX.toFixed(0)}, ${worldZ.toFixed(0)}]`
            + ` | refLocalX=${refLocalX.toFixed(0)}, centerLocalX=${centerLocalX.toFixed(0)}, delta=${deltaLocalX.toFixed(0)}`);



        const blatCabinet: Cabinet = {
            id: 'blat-stworzony',
            name: 'Blat Roboczy (Dopasowany)',
            width: totalWidth,
            height: 38,
            depth: 600,
            standardWidths: [],
            elements: []
        };

        const newCabId = crypto.randomUUID();
        const newRecord: PlacedCabinet = {
            uuid: newCabId,
            cabinet: blatCabinet,
            position: [worldX, 820, worldZ],
            rotation: [0, baseRotY, 0],
            isLocked: false
        };

        setPlacedCabinets(prev => [...prev, newRecord]);
        setSelectedCabinetIds([newCabId]);
    };

    const handleExtendCountertop = (uuids: string[], direction: 'left' | 'right', amount: number = 38) => {
        setPlacedCabinets(prev => prev.map(cab => {
            if (!uuids.includes(cab.uuid) || !cab.cabinet.id.startsWith('blat-')) return cab;

            const rotY = cab.rotation[1];
            const extendAmount = amount;
            const shiftAmount = extendAmount / 2;
            const sign = Math.abs(Math.cos(rotY)) > 0.5 ? 1 : -1;
            // Dla poszerzenia z prawej: przesuwamy środek w prawo (+X), o ile sign=1
            const dLocalX = (direction === 'right' ? shiftAmount : -shiftAmount) * sign;

            const dWorldX = dLocalX * Math.cos(rotY);
            const dWorldZ = dLocalX * Math.sin(rotY);

            const newWidth = cab.cabinet.width + extendAmount;

            const updatedElements = generateFixedElements(
                newWidth, cab.cabinet.height, cab.cabinet.depth,
                false,
                undefined,
                cab.cabinet.id,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                false,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                false,
                false
            );

            return {
                ...cab,
                position: [cab.position[0] + dWorldX, cab.position[1], cab.position[2] + dWorldZ],
                cabinet: {
                    ...cab.cabinet,
                    width: newWidth,
                    elements: updatedElements
                }
            };
        }));
    };

    const handleExtendStrip = (uuids: string[], direction: 'left' | 'right', customAmount?: number) => {
        setPlacedCabinets(prev => prev.map(cab => {
            if (!uuids.includes(cab.uuid) || !(cab.cabinet.id.includes('listwa') || cab.cabinet.id.startsWith('blat-'))) return cab;

            const rotY = cab.rotation[1];
            const isPodszafkowa = cab.cabinet.id === 'gorna-listwa-podszafkowa';
            const extendAmount = customAmount !== undefined ? customAmount : (isPodszafkowa ? 348 : 328);
            const shiftAmount = extendAmount / 2;
            const sign = Math.abs(Math.cos(rotY)) > 0.5 ? 1 : -1;
            const dLocalX = (direction === 'right' ? shiftAmount : -shiftAmount) * sign;

            const dWorldX = dLocalX * Math.cos(rotY);
            const dWorldZ = dLocalX * Math.sin(rotY);

            const newWidth = cab.cabinet.width + extendAmount;

            return {
                ...cab,
                position: [cab.position[0] + dWorldX, cab.position[1], cab.position[2] + dWorldZ],
                cabinet: {
                    ...cab.cabinet,
                    width: newWidth
                }
            };
        }));
    };

    const handleTrimStrip = (uuids: string[], direction: 'left' | 'right') => {
        setPlacedCabinets(prev => prev.map(cab => {
            if (!uuids.includes(cab.uuid) || !cab.cabinet.id.includes('listwa')) return cab;
            if (cab.cabinet.width <= 18) return cab;

            const rotY = cab.rotation[1];
            const trimAmount = 18;
            const halfTrim = trimAmount / 2;
            const sign = Math.abs(Math.cos(rotY)) > 0.5 ? 1 : -1;
            const dLocalX = (direction === 'right' ? -halfTrim : halfTrim) * sign;

            const dWorldX = dLocalX * Math.cos(rotY);
            const dWorldZ = dLocalX * Math.sin(rotY);

            return {
                ...cab,
                position: [cab.position[0] + dWorldX, cab.position[1], cab.position[2] + dWorldZ] as [number, number, number],
                cabinet: {
                    ...cab.cabinet,
                    width: cab.cabinet.width - trimAmount,
                }
            };
        }));
    };

    const handleAddSharedStrip = (
        uuids: string[],
        endType: 'none' | 'angle-45-left' | 'angle-45-right' | 'angle-45-both' = 'none',
        stripD: number = 310,
        stripType: 'miedzy' | 'podszafkowa' = 'miedzy'
    ) => {
        const targets = placedCabinets.filter(c => uuids.includes(c.uuid));
        if (targets.length === 0) return;

        const baseRotY = targets[0].rotation[1];
        let minLocalX = Infinity;
        let maxLocalX = -Infinity;

        targets.forEach(c => {
            const rects = getCollisionRects(c.cabinet);
            rects.forEach(rect => {
                const w = rect.w;
                const d = rect.d;
                const cosVal = Math.cos(c.rotation[1]);
                const sinVal = Math.sin(c.rotation[1]);

                // Przemieszczamy narożniki prostokąta kolizji względem rzutu na ścianę
                // rect.x i rect.z to środek lokalny danego prostokąta
                [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].forEach(([lx, lz]) => {
                    // Przesunięcie o lokalny środek prostokąta (rect.x, rect.z)
                    const flx = lx + rect.x;
                    const flz = lz + rect.z;

                    const wx = c.position[0] + flx * cosVal - flz * sinVal;
                    const wz = c.position[2] + flx * sinVal + flz * cosVal;
                    const localX = wx * Math.cos(-baseRotY) - wz * Math.sin(-baseRotY);
                    minLocalX = Math.min(minLocalX, localX);
                    maxLocalX = Math.max(maxLocalX, localX);
                });
            });
        });

        // SKRACANIE DLA SZAFEK NAROŻNYCH GŁĘBOKICH
        const deepCorners = targets.filter(c =>
            (c.cabinet.id === 'gorna-narozna-gleboka' || c.cabinet.id === 'gorna-narozna-90') &&
            c.cabinet.depth >= 500
        );

        deepCorners.forEach(dc => {
            const orientation = (dc.cabinet as any).cornerOrientation || 'left';
            if (orientation === 'left' && (endType === 'angle-45-left' || endType === 'angle-45-both')) {
                minLocalX += 250;
            }
            if (orientation === 'right' && (endType === 'angle-45-right' || endType === 'angle-45-both')) {
                maxLocalX -= 250;
            }
        });

        const totalWidth = Math.abs(maxLocalX - minLocalX);
        const centerLocalX = (minLocalX + maxLocalX) / 2;

        // Prefer standard shallow uppers over corner L-cabinets for depth reference (more stable wall anchor)
        const actualCabinets = targets.filter(c =>
            c.cabinet.id.startsWith('gorna-') &&
            !c.cabinet.id.includes('listwa') &&
            c.cabinet.depth >= 300
        );

        const nonCorner = actualCabinets.filter(c => !c.cabinet.id.endsWith('-90'));
        const refCab = nonCorner.length > 0
            ? nonCorner[0]
            : (actualCabinets[0] || targets[0] || placedCabinets[0]);

        const rotY = refCab.rotation[1];
        const isL = refCab.cabinet.id.endsWith('-90');
        // If it's an L-cabinet, its center is at width2/2 (e.g. 325mm) from the wall, 
        // not at corpus depth/2 (165mm).
        const refD = isL
            ? ((refCab.cabinet as any).width2 || (refCab.cabinet.id.startsWith('gorna-') ? 650 : 900))
            : refCab.cabinet.depth;

        // 1. USTALAMY POZYCJĘ ŚCIANY (BACK WALL)
        // Back edge of reference cabinet = wall location.
        const wallX = refCab.position[0] - (refD / 2) * Math.sin(rotY);
        const wallZ = refCab.position[2] - (refD / 2) * Math.cos(rotY);

        // 2. USTALAMY ŚRODEK LISTWY (STRIP CENTER)
        // frontDist to odległość od ściany do lica frontu (refD + 18)
        const frontDist = refD + 18 + 2; // +2 for front-to-corpus gap
        let distToCenter: number;

        if (stripType === 'podszafkowa') {
            // Listwa podszafkowa zawsze dolega do ściany (back-aligned)
            distToCenter = stripD / 2;
        } else {
            // Listwa między-szafkowa zachowuje poprzednią logikę front-align
            distToCenter = (stripD > 310)
                ? (frontDist - stripD / 2)
                : (refD - stripD / 2);
        }

        const sCenterX = wallX + distToCenter * Math.sin(rotY);
        const sCenterZ = wallZ + distToCenter * Math.cos(rotY);

        // 3. ROZPISANIE SZEROKOŚCI WZDŁUŻ LINII SZAFEK (Lateral shift)
        const widthVectorX = Math.cos(rotY);
        const widthVectorZ = Math.sin(rotY);

        // Lokalny X szafki referencyjnej w systemie baseRotY
        const refLX = refCab.position[0] * Math.cos(-baseRotY) - refCab.position[2] * Math.sin(-baseRotY);
        const diffX = centerLocalX - refLX;

        const worldX = sCenterX + diffX * widthVectorX;
        const worldZ = sCenterZ + diffX * widthVectorZ;

        // 4. WYSOKOŚĆ (Y)
        const worldY = refCab.position[1] - 18;

        const stripID = stripType === 'podszafkowa' ? 'gorna-listwa-podszafkowa' : 'gorna-listwa-miedzy-szafkowa';
        const stripName = stripType === 'podszafkowa' ? 'Listwa Podszafkowa' : 'Listwa Między Szafkowa';

        const stripCabinet: Cabinet = {
            id: stripID,
            name: stripName,
            width: totalWidth,
            height: 18,
            depth: stripD,
            leftCutType: (endType === 'angle-45-left' || endType === 'angle-45-both') ? 'angle-45-left' : 'none',
            rightCutType: (endType === 'angle-45-right' || endType === 'angle-45-both') ? 'angle-45-right' : 'none',
            elements: []
        };

        const newCabId = `listwa-${Date.now()}`;
        const newRecord: PlacedCabinet = {
            uuid: newCabId,
            cabinet: stripCabinet,
            position: [worldX, worldY, worldZ],
            rotation: [0, rotY, 0],
            isLocked: true
        };

        setPlacedCabinets(prev => [...prev, newRecord]);
        setSelectedCabinetIds([newCabId]);
    };

    const handleAddFartuch = (targetCabs: PlacedCabinet[]) => {
        let newCabinets: PlacedCabinet[] = [];

        targetCabs.forEach(cab => {
            // Find max height of countertops/bottom cabinets in the scene as baseline
            const fRotY = cab.rotation[1];
            const cosR = Math.abs(Math.cos(fRotY));
            const sinR = Math.abs(Math.sin(fRotY));
            const extX = (cab.cabinet.width / 2) * cosR + (cab.cabinet.depth / 2) * sinR;
            const extZ = (cab.cabinet.width / 2) * sinR + (cab.cabinet.depth / 2) * cosR;
            const bMinX = cab.position[0] - extX;
            const bMaxX = cab.position[0] + extX;
            const bMinZ = cab.position[2] - extZ;
            const bMaxZ = cab.position[2] + extZ;

            // KONWENCJA: position[1] = DOLNA KRAWĘDŹ dla WSZYSTKICH obiektów floating
            // Szafka3D renderowana jest z yOriginOffset=height/2 więc geometria idzie od 0 do +height.
            // Zatem: bottom=position[1], top=position[1]+height

            // Dolna krawędź listwy = po prostu position[1] (bottom-edge convention)
            const listwaBottom = cab.position[1];

            const bottoms = placedCabinets.filter(c => {
                if (c.position[1] >= cab.position[1] - 100) return false;
                if (!c.cabinet.id.includes('dolna') && !c.cabinet.id.includes('blat') && !c.cabinet.id.includes('zlewowa')) return false;

                // Górna krawędź kandydata (bottom-edge convention):
                const isCBlat = c.cabinet.id.startsWith('blat-');
                const cTopEdge = isCBlat
                    ? c.position[1] + c.cabinet.height       // blat floating: top = bottom + height
                    : c.position[1] + c.cabinet.height + 100; // szafka dolna: top = y + height + legs

                // Wyklucz wysokie szafki (lodówka, piekarnik), których szczyt przekracza listwę
                if (cTopEdge > listwaBottom + 50) return false;

                const cRotY = c.rotation[1];
                const cCosR = Math.abs(Math.cos(cRotY));
                const cSinR = Math.abs(Math.sin(cRotY));
                const cExtX = (c.cabinet.width / 2) * cCosR + (c.cabinet.depth / 2) * cSinR;
                const cExtZ = (c.cabinet.width / 2) * cSinR + (c.cabinet.depth / 2) * cCosR;
                const cMinX = c.position[0] - cExtX;
                const cMaxX = c.position[0] + cExtX;
                const cMinZ = c.position[2] - cExtZ;
                const cMaxZ = c.position[2] + cExtZ;

                const overlapX = bMinX <= cMaxX && bMaxX >= cMinX;
                const overlapZ = bMinZ <= cMaxZ && bMaxZ >= cMinZ;

                return overlapX && overlapZ;
            });

            let maxH = 858; // default: szafka 820 na nodze + blat 38 = 858 top
            for (const c of bottoms) {
                const isBlat = c.cabinet.id.startsWith('blat-');
                const topEdge = isBlat
                    ? c.position[1] + c.cabinet.height       // blat: top = bottom + height
                    : c.position[1] + c.cabinet.height + 100; // szafka dolna: top = y + height + legs
                maxH = Math.max(maxH, topEdge);
            }

            const countertopTop = maxH;

            // Listwa: position[1] = dolna krawędź listwy (bottom-edge convention)
            const listwaBottomEdge = cab.position[1]; // = listwaBottom (same thing, dla czytelności)

            const fartuchHeight = Math.max(10, listwaBottomEdge - countertopTop);
            // position[1] fartucha = DOLNA KRAWĘDŹ (bottom-edge convention, tak jak wszystkie floating)
            const fartuchBottomY = countertopTop;

            const rotY = cab.rotation[1];
            const dirX = Math.sin(rotY);
            const dirZ = Math.cos(rotY);

            // Push it back against the wall
            const shiftAmount = (cab.cabinet.depth / 2) - 9;
            const shiftX = -dirX * shiftAmount;
            const shiftZ = -dirZ * shiftAmount;

            const worldX = cab.position[0] + shiftX;
            const worldZ = cab.position[2] + shiftZ;

            const fartuchCabinet: Cabinet = {
                id: 'fartuch-kuchenny',
                name: 'Fartuch kuchenny',
                width: cab.cabinet.width,
                height: fartuchHeight,
                depth: 18,
                elements: []
            };

            const newCabId = `fartuch-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            newCabinets.push({
                uuid: newCabId,
                cabinet: fartuchCabinet,
                position: [worldX, fartuchBottomY, worldZ],
                rotation: [0, rotY, 0],
                isLocked: true // You can unlock it to edit manually if needed
            });
        });

        if (newCabinets.length > 0) {
            setPlacedCabinets(prev => [...prev, ...newCabinets]);
            setSelectedCabinetIds(newCabinets.map(c => c.uuid));
        }
    };

    const handleAddBlenda = () => {
        const w = Math.min(2000, Math.max(20, blendaWidth));
        const h = Math.min(2600, Math.max(20, blendaHeight));
        const newId = `blenda-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newCab: PlacedCabinet = {
            uuid: newId,
            cabinet: {
                id: 'blenda-meblowa',
                name: 'Blenda meblowa',
                width: w,
                height: h,
                depth: 18,
                elements: []
            },
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            isLocked: false
        };
        setPlacedCabinets(prev => [...prev, newCab]);
        setSelectedCabinetIds([newId]);
    };

    const handleTrimFartuch = (uuids: string[], direction: 'left' | 'right') => {
        setPlacedCabinets(prev => prev.map(cab => {
            if (!uuids.includes(cab.uuid) || cab.cabinet.id !== 'fartuch-kuchenny') return cab;
            if (cab.cabinet.width <= 18) return cab; // Nie ucinamy jeśli by zniknął całkowicie

            const rotY = cab.rotation[1];
            const trimAmount = 18;
            const halfTrim = trimAmount / 2;
            // sign: dla ściany tylnej (rotY≈0) sign=1, dla bocznych (rotY≈±π/2) sign=-1 lub 1
            const sign = Math.abs(Math.cos(rotY)) > 0.5 ? 1 : -1;
            // direction 'left' → skracamy z lewej → centrum przesuwa się w prawo (+)
            // direction 'right' → skracamy z prawej → centrum przesuwa się w lewo (-)
            const dLocalX = (direction === 'right' ? -halfTrim : halfTrim) * sign;

            const dWorldX = dLocalX * Math.cos(rotY);
            const dWorldZ = dLocalX * Math.sin(rotY);

            return {
                ...cab,
                position: [cab.position[0] + dWorldX, cab.position[1], cab.position[2] + dWorldZ] as [number, number, number],
                cabinet: {
                    ...cab.cabinet,
                    width: cab.cabinet.width - trimAmount,
                }
            };
        }));
    };

    const handleTrimCountertop = (uuids: string[], direction: 'left' | 'right', amount?: number) => {
        setPlacedCabinets(prev => prev.map(cab => {
            if (!uuids.includes(cab.uuid) || !cab.cabinet.id.startsWith('blat-')) return cab;

            const trimAmount = amount !== undefined ? amount : 600;
            if (cab.cabinet.width <= trimAmount) return cab; // Nie ucinamy jeśli zniknie całkowicie

            const rotY = cab.rotation[1];
            const shiftAmount = trimAmount / 2;
            const sign = Math.abs(Math.cos(rotY)) > 0.5 ? 1 : -1;
            const dLocalX = (direction === 'right' ? -shiftAmount : shiftAmount) * sign;

            const dWorldX = dLocalX * Math.cos(rotY);
            const dWorldZ = dLocalX * Math.sin(rotY);

            const newWidth = cab.cabinet.width - trimAmount;

            const updatedElements = generateFixedElements(
                newWidth, cab.cabinet.height, cab.cabinet.depth,
                false,
                undefined,
                cab.cabinet.id,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                false,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                false,
                false
            );

            return {
                ...cab,
                position: [cab.position[0] + dWorldX, cab.position[1], cab.position[2] + dWorldZ],
                cabinet: {
                    ...cab.cabinet,
                    width: newWidth,
                    elements: updatedElements
                }
            };
        }));
    };

    /**
     * Sets up a "łyżwa" (mason's mitre) joint between exactly 2 blat-* cabinets.
     * maleUuid's right end (or left) extends 50mm and gets the male profile.
     * femaleUuid's corresponding end gets the female notch.
     * The `swap` flag reverses which blat is male vs female.
     */
    const handleJoinCountertops = (uuids: string[], swap: boolean = false) => {
        if (uuids.length !== 2) return;

        const [idA, idB] = uuids;
        const cabA = placedCabinets.find(c => c.uuid === idA);
        const cabB = placedCabinets.find(c => c.uuid === idB);
        if (!cabA || !cabB) return;
        if (!cabA.cabinet.id.startsWith('blat-') || !cabB.cabinet.id.startsWith('blat-')) return;

        // Determine which is male (extends) and female (notched) – swap flag reverses this
        const [maleId, femaleId] = swap ? [idB, idA] : [idA, idB];
        const maleCab = placedCabinets.find(c => c.uuid === maleId)!;
        const femaleCab = placedCabinets.find(c => c.uuid === femaleId)!;

        // For the male blat: extend width by 30mm on the right side,
        // shift the center position +15mm in local X so the box stays wall-flush on left.
        const maleRotY = maleCab.rotation[1];
        const extendMM = 30;
        const shiftMM = extendMM / 2; // shift center by half
        const dWorldX = shiftMM * Math.cos(maleRotY);
        const dWorldZ = -shiftMM * Math.sin(maleRotY);

        setPlacedCabinets(prev => prev.map(cab => {
            if (cab.uuid === maleId) {
                return {
                    ...cab,
                    position: [cab.position[0] + dWorldX, cab.position[1], cab.position[2] + dWorldZ] as [number, number, number],
                    cabinet: {
                        ...cab.cabinet,
                        width: cab.cabinet.width + extendMM,
                        rightCutType: 'lyzwa-male' as const,
                        leftCutType: (cab.cabinet as any).leftCutType || 'none'
                    }
                };
            }
            if (cab.uuid === femaleId) {
                return {
                    ...cab,
                    cabinet: {
                        ...cab.cabinet,
                        leftCutType: 'lyzwa-female' as const,
                        rightCutType: (cab.cabinet as any).rightCutType || 'none'
                    }
                };
            }
            return cab;
        }));
    };

    const handleExportProject = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(placedCabinets));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "projekt_kuchni.korpus");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string);
                setPlacedCabinets(parsed);
                // Opcjonalnie rzutowanie stanu powiązanych kabinetów
            } catch (err) {
                alert("Błąd wczytywania pliku projektu.");
            }
        };
        reader.readAsText(file);
        // Reset inputa żeby można było wczytać ten sam plik ponownie
        event.target.value = '';
    };

    const measureGap = () => {
        if (selectedCabinetIds.length !== 2) return null;
        const c1 = placedCabinets.find(c => c.uuid === selectedCabinetIds[0]);
        const c2 = placedCabinets.find(c => c.uuid === selectedCabinetIds[1]);
        if (!c1 || !c2) return null;

        const getBounds = (cab: PlacedCabinet) => {
            const rotY = cab.rotation[1];
            let w = cab.cabinet.width;
            let d = cab.cabinet.depth;

            // Startowe lokalne wierzchołki bryły korpusu na płaszczyźnie płaskiej (X i Z)
            let localMinX = -w / 2;
            let localMaxX = w / 2;
            let localMinZ = -d / 2;
            let localMaxZ = d / 2;

            if (cab.cabinet.id.endsWith('-90')) {
                // Narożna L-ka: dla szafki L-90 pełny obrys to W x W2 wyśrodkowany.
                d = (cab.cabinet as any).width2 || cab.cabinet.width;
                localMinZ = -d / 2;
                localMaxZ = d / 2;
                // Fronty uciekają do wewnątrz obrysu więc nie wypychają maksymalnego Z
            } else {
                // Szafki zwykłe i ślepe narożniki: płaszczyzna frontowa (drzwi i blenda) odstaje na zewnątrz w osi Z.
                const hasFrontPlane = cab.cabinet.hasFronts || cab.cabinet.id.includes('narozna');
                if (hasFrontPlane && !cab.cabinet.id.startsWith('blat-')) {
                    localMaxZ += 18; // Uwzględniamy 18mm grubości płaszczyzny frontowej/blendy
                }
            }

            // Odbijamy na 4 rogi a następnie aplikujemy globalny obrót
            const corners = [
                { x: localMinX, z: localMinZ },
                { x: localMaxX, z: localMinZ },
                { x: localMaxX, z: localMaxZ },
                { x: localMinX, z: localMaxZ },
            ];

            const cos = Math.cos(rotY);
            const sin = Math.sin(rotY);

            let worldMinX = Infinity, worldMaxX = -Infinity;
            let worldMinZ = Infinity, worldMaxZ = -Infinity;

            corners.forEach(p => {
                // Rzutowanie rotacji w obrębie 2D ze zmianami osi w ThreeJS (Standard CCW)
                const wx = cab.position[0] + (p.x * cos - p.z * sin);
                const wz = cab.position[2] + (p.x * sin + p.z * cos);
                if (wx < worldMinX) worldMinX = wx;
                if (wx > worldMaxX) worldMaxX = wx;
                if (wz < worldMinZ) worldMinZ = wz;
                if (wz > worldMaxZ) worldMaxZ = wz;
            });

            return {
                minX: worldMinX,
                maxX: worldMaxX,
                minZ: worldMinZ,
                maxZ: worldMaxZ,
            };
        };

        const b1 = getBounds(c1);
        const b2 = getBounds(c2);

        let gapX = 0;
        if (b2.minX >= b1.maxX) gapX = b2.minX - b1.maxX;
        else if (b1.minX >= b2.maxX) gapX = b1.minX - b2.maxX;

        let gapZ = 0;
        if (b2.minZ >= b1.maxZ) gapZ = b2.minZ - b1.maxZ;
        else if (b1.minZ >= b2.maxZ) gapZ = b1.minZ - b2.maxZ;

        return { x: Math.round(gapX), z: Math.round(gapZ) };
    };
    const gaps = measureGap();

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#1a1a1a', color: '#fff' }}>
            {/* Sidebar / Library */}
            {isHudVisible && (
                <div style={{ width: '300px', minWidth: '300px', flexShrink: 0, background: '#2c2c2c', display: 'flex', flexDirection: 'column', borderRight: '1px solid #444', zIndex: 10 }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #444', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Biblioteka Szafek</h2>
                            <button onClick={onReset} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', textDecoration: 'underline' }}>
                                Nowy Pokój
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={handleExportProject} style={{ flex: 1, padding: '0.4rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                Zapisz Projekt
                            </button>
                            <label style={{ flex: 1, padding: '0.4rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' }}>
                                Wczytaj
                                <input type="file" accept=".korpus,.json" style={{ display: 'none' }} onChange={handleImportProject} />
                            </label>
                        </div>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #444', background: '#333', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', fontWeight: 'bold' }}>Ustawienia globalne</div>
                        <button
                            onClick={() => {
                                const allVisible = placedCabinets.every(c => c.cabinet.hasFronts);
                                handleToggleFronts(placedCabinets.map(c => c.uuid), !allVisible);
                            }}
                            style={{ width: '100%', padding: '0.6rem', background: '#4b5563', color: '#fff', border: '1px solid #6b7280', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                            Pokaż/ukryj wszystkie fronty
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

                        {/* Blendy section */}
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', borderBottom: '1px solid #333', paddingBottom: '0.3rem' }}>
                                Blendy
                            </h3>
                            <div style={{ background: '#3a3a3a', padding: '0.8rem', borderRadius: '6px', border: '1px solid #555', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#bbb' }}>Blenda z płyty meblowej 18mm</div>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem', color: '#ccc' }}>
                                    Szerokość (mm)
                                    <input
                                        type="number"
                                        min={20} max={2000} step={1}
                                        value={blendaWidth}
                                        onChange={e => setBlendaWidth(Number(e.target.value))}
                                        style={{ padding: '0.3rem 0.5rem', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '0.85rem' }}
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem', color: '#ccc' }}>
                                    Wysokość (mm)
                                    <input
                                        type="number"
                                        min={20} max={2600} step={1}
                                        value={blendaHeight}
                                        onChange={e => setBlendaHeight(Number(e.target.value))}
                                        style={{ padding: '0.3rem 0.5rem', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '0.85rem' }}
                                    />
                                </label>
                                <button
                                    onClick={handleAddBlenda}
                                    style={{ padding: '0.45rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#818cf8'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
                                >
                                    + Dodaj blendę
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Properties panel for Selected Cabinets */}
                    {selectedCabinetIds.length > 0 && (
                        <div style={{ padding: '1rem', borderTop: '1px solid #444', background: '#242424' }}>
                            <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', color: '#4ade80' }}>
                                {selectedCabinetIds.length === 1 ? 'Zaznaczona szafka' : `Zaznaczono szafek: ${selectedCabinetIds.length}`}
                            </h3>

                            {selectedCabinetIds.length === 2 && gaps && (gaps.x > 0 || gaps.z > 0) && (
                                <div style={{ padding: '0.8rem', marginBottom: '1rem', background: '#1e3a8a', borderRadius: '6px', border: '1px solid #3b82f6' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#bfdbfe', marginBottom: '0.4rem' }}>Wolna przestrzeń między szafkami:</div>
                                    {gaps.x > 0 && <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.2rem' }}>Oś szerokości (X): {gaps.x} mm</div>}
                                    {gaps.z > 0 && <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fff' }}>Oś głębokości (Z): {gaps.z} mm</div>}
                                </div>
                            )}

                            <div style={{ marginBottom: '1rem' }}>
                                {selectedCabinetIds.length === 1 && (
                                    <button
                                        onClick={() => setIsConfiguratorOpen(true)}
                                        style={{ width: '100%', padding: '0.6rem', background: '#4ade80', color: '#1a1a1a', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '0.5rem' }}
                                    >
                                        Konfiguruj szafkę
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                <button
                                    onClick={() => setSelectionDecorMode('body')}
                                    style={{ width: '100%', padding: '0.6rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    Materiał korpusu
                                </button>
                                <button
                                    onClick={() => setSelectionDecorMode('front')}
                                    style={{ width: '100%', padding: '0.6rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    Materiał frontu
                                </button>
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

                            {selectedCabinetIds.length === 1 && (() => {
                                const selCab = placedCabinets.find(c => c.uuid === selectedCabinetIds[0]);
                                const isFloatingType = selCab?.cabinet.id.startsWith('gorna-') || selCab?.cabinet.id.startsWith('blat-') || selCab?.cabinet.id === 'fartuch-kuchenny' || selCab?.cabinet.id === 'blenda-meblowa';
                                if (!isFloatingType || !selCab) return null;
                                return (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.9rem', color: '#ccc' }}>
                                            Wysokość od podłogi (mm)
                                            <input
                                                type="number"
                                                value={Math.round(selCab.position[1])}
                                                onChange={(e) => {
                                                    handleUpdateCabinet(selCab.uuid, [selCab.position[0], Number(e.target.value), selCab.position[2]], selCab.rotation);
                                                }}
                                                style={{ width: '100%', padding: '0.4rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
                                            />
                                        </label>
                                    </div>
                                );
                            })()}

                            <button
                                onClick={() => handleToggleLock(selectedCabinetIds)}
                                style={{
                                    width: '100%', padding: '0.4rem',
                                    background: '#333', color: '#fff',
                                    border: '1px solid #555', borderRadius: '4px',
                                    cursor: 'pointer', marginBottom: '0.5rem',
                                    fontSize: '0.85rem'
                                }}
                            >
                                {selectedCabinetIds.every(id => placedCabinets.find(c => c.uuid === id)?.isLocked) ? 'Odblokuj pozycję' : 'Zablokuj pozycję'}
                            </button>

                            <button
                                onClick={() => handleRemoveCabinet(selectedCabinetIds)}
                                style={{ width: '100%', padding: '0.5rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Usuń {selectedCabinetIds.length > 1 ? 'zaznaczone' : ''} ze sceny
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Main 3D Viewport */}
            <div style={{ flex: 1, position: 'relative' }}>
                {/* Top Center Toolbar */}
                {isHudVisible && (
                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '8px 20px',
                        borderRadius: '40px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        border: '1px solid #ddd',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            color: '#333',
                            whiteSpace: 'nowrap'
                        }}>
                            <input
                                type="checkbox"
                                checked={showFrontEdges}
                                onChange={(e) => setShowFrontEdges(e.target.checked)}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#22c55e'
                                }}
                            />
                            Krawędzie frontów
                        </label>

                        <div style={{ width: '1px', height: '20px', background: '#ddd' }} />

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setIsTechnicalView(prev => !prev)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: isTechnicalView ? '#22c55e' : '#f3f4f6',
                                    color: isTechnicalView ? '#fff' : '#666',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Techniczny (Z)
                            </button>
                            <button
                                onClick={() => setIsPreviewMode(prev => !prev)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: isPreviewMode ? '#8b5cf6' : '#f3f4f6',
                                    color: isPreviewMode ? '#fff' : '#666',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Podgląd (X)
                            </button>
                        </div>

                        <div style={{ width: '1px', height: '20px', background: '#ddd' }} />

                        {/* Przycisk koszyka */}
                        <button
                            onClick={() => setIsCartOpen(prev => !prev)}
                            title="Wycena projektu"
                            style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                border: 'none',
                                background: isCartOpen ? '#f59e0b' : '#f3f4f6',
                                color: isCartOpen ? '#fff' : '#666',
                                fontSize: '0.82rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                        >
                            Koszyk
                            {placedCabinets.length > 0 && (
                                <span style={{
                                    background: '#ef4444',
                                    color: '#fff',
                                    borderRadius: '999px',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    padding: '1px 5px',
                                    lineHeight: '1.4',
                                }}>
                                    {placedCabinets.length}
                                </span>
                            )}
                        </button>
                    </div>
                )}
                <RoomScene
                    roomDimensions={roomDimensions}
                    placedCabinets={placedCabinets}
                    selectedCabinetIds={selectedCabinetIds}
                    onSelectCabinet={handleSelectCabinet}
                    onUpdateCabinet={handleUpdateCabinet}
                    onContextMenu={(uuid, event) => !isPreviewMode && !isTechnicalView && setContextMenu({ ...event, cabUuid: uuid })}
                    isPreviewMode={isPreviewMode}
                    isTechnicalView={isTechnicalView}
                    showFrontEdges={showFrontEdges}
                    wallOpacities={wallOpacities}
                />
            </div>

            {/* Technical View Overlay */}
            {isTechnicalView && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1500, background: '#fff' }}>
                    <TechnicalDrawing placedCabinets={placedCabinets} roomDimensions={roomDimensions} filter={technicalFilter} />

                    {/* Filter Controls */}


                    <div style={{
                        position: 'absolute',
                        bottom: '40px',
                        right: '40px',
                        display: 'flex',
                        background: 'rgba(255,255,255,0.9)',
                        padding: '6px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        zIndex: 2000,
                        border: '1px solid #ddd',
                        gap: '4px'
                    }}>
                        {([
                            { id: 'lower', label: 'Dół' },
                            { id: 'upper-shallow', label: 'Góra płytka' },
                            { id: 'upper-deep', label: 'Góra głęboka' }
                        ] as const).map(f => (
                            <button
                                key={f.id}
                                onClick={() => setTechnicalFilter(f.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: technicalFilter === f.id ? '#2563eb' : 'transparent',
                                    color: technicalFilter === f.id ? '#fff' : '#4b5563',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
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
                            <span></span>
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
                            <span></span>
                            WIDOK Z PRZODU ({currentElevationWall.toUpperCase()}) - Zmień ścianę ← →
                        </div>
                    )}
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
                    {contextMenu.cabUuid.startsWith('wall-') ? (
                        <>
                            <div style={{ padding: '8px 16px', borderBottom: '1px solid #444', marginBottom: '4px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '8px' }}>Przezroczystość ściany</div>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={wallOpacities[contextMenu.cabUuid] || 1.0}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setWallOpacities(prev => ({ ...prev, [contextMenu.cabUuid]: val }));
                                    }}
                                    style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
                                />
                                <div style={{ fontSize: '0.75rem', textAlign: 'right', marginTop: '4px', color: '#3b82f6' }}>
                                    {Math.round((wallOpacities[contextMenu.cabUuid] || 1.0) * 100)}%
                                </div>
                            </div>
                            <ContextButton 
                                label="Zresetuj widok ściany"
                                onClick={() => {
                                    setWallOpacities(prev => ({ ...prev, [contextMenu.cabUuid]: 1.0 }));
                                    setContextMenu(null);
                                }}
                            />
                        </>
                    ) : (
                        <>
                            <ContextButton
                                label="Konfiguruj szafkę"
                                onClick={() => {
                                    setSelectedCabinetIds([contextMenu.cabUuid]);
                                    setIsConfiguratorOpen(true);
                                    setContextMenu(null);
                                }}
                            />
                            <ContextButton
                                label="Duplikuj"
                                onClick={() => handleDuplicateCabinet(contextMenu.cabUuid)}
                            />
                            <ContextButton
                                label="Obróć o 90°"
                                onClick={() => {
                                    const targets = selectedCabinetIds.includes(contextMenu.cabUuid) ? selectedCabinetIds : [contextMenu.cabUuid];
                                    if (!selectedCabinetIds.includes(contextMenu.cabUuid)) {
                                        setSelectedCabinetIds([contextMenu.cabUuid]);
                                    }
                                    rotateSelected('right');
                                    setContextMenu(null);
                                }}
                            />
                        </>
                    )}
                    {(() => {
                        const cab = placedCabinets.find(c => c.uuid === contextMenu.cabUuid);
                        if (!cab) return null;

                        const isListwaItem = cab.cabinet.id === 'gorna-listwa-miedzy-szafkowa';
                        const isStandard540Item = cab.cabinet.id === 'dolna-standard' && cab.cabinet.depth === 540;

                        if (!isListwaItem && !isStandard540Item) return null;

                        return (
                            <ContextButton
                                label="Wysuń o 18mm"
                                onClick={() => {
                                    const targets = selectedCabinetIds.includes(contextMenu.cabUuid) ? selectedCabinetIds : [contextMenu.cabUuid];
                                    handleMoveForward(targets, 18);
                                    setContextMenu(null);
                                }}
                            />
                        );
                    })()}
                    {!contextMenu.cabUuid.startsWith('wall-') && (
                        <ContextButton
                            label={placedCabinets.find(c => c.uuid === contextMenu.cabUuid)?.isLocked ? "Odblokuj" : "Zablokuj"}
                            onClick={() => {
                                const targets = selectedCabinetIds.includes(contextMenu.cabUuid) ? selectedCabinetIds : [contextMenu.cabUuid];
                                handleToggleLock(targets);
                            }}
                        />
                    )}

                    {(() => {
                        if (contextMenu.cabUuid.startsWith('wall-')) return null;
                        const targets = selectedCabinetIds.includes(contextMenu.cabUuid) ? selectedCabinetIds : [contextMenu.cabUuid];
                        const targetCabs = placedCabinets.filter(c => targets.includes(c.uuid));

                        const allBaseCabinets = targetCabs.every(c => {
                            const isBase = c.cabinet.id.startsWith('dolna-');
                            const isTallOven = c.cabinet.id === 'dolna-piekarnik'; // Tower
                            const isTallFridge = c.cabinet.id.startsWith('dolna-lodowka'); // Tower
                            return isBase && !isTallOven && !isTallFridge;
                        });

                        if (targets.length > 0 && allBaseCabinets) {
                            return (
                                <ContextButton
                                    label="Połóż dopasowany Blat"
                                    onClick={() => {
                                        handleAddSharedCountertop(targets);
                                        setContextMenu(null);
                                    }}
                                />
                            );
                        }

                        // OPCJA LISTWY DLA SZAFEK GÓRNYCH GŁĘBOKICH
                        const allUpperDeep = targetCabs.every(c => c.cabinet.id.includes('gorna-') && !c.cabinet.id.includes('listwa') && c.cabinet.depth >= 500);
                        if (targets.length > 0 && allUpperDeep) {
                            return (
                                <>
                                    <div style={{ height: '1px', background: '#555', margin: '4px 0' }} />
                                    <h4 style={{ margin: '4px 12px', fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase' }}>Listwa między szafkami</h4>
                                    <ContextButton
                                        label="Kąt prosty (31cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'none', 310); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt prosty (33cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'none', 330); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Lewy (31cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-left', 310); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Lewy (33cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-left', 330); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Prawy (31cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-right', 310); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Prawy (33cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-right', 330); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Obustronny (31cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-both', 310); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Obustronny (33cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-both', 330); setContextMenu(null); }}
                                    />
                                </>
                            );
                        }

                        // OPCJA LISTWY PODSZAFKOWEJ DLA SZAFEK GÓRNYCH PŁYTKICH (330mm)
                        const allUpperShallow = targetCabs.every(c => c.cabinet.id.includes('gorna-') && !c.cabinet.id.includes('listwa') && Math.abs(c.cabinet.depth - 330) < 10);
                        if (targets.length > 0 && allUpperShallow) {
                            return (
                                <>
                                    <div style={{ height: '1px', background: '#555', margin: '4px 0' }} />
                                    <h4 style={{ margin: '4px 12px', fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase' }}>Listwa podszafkowa</h4>
                                    <ContextButton
                                        label="Kąt prosty (31cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'none', 310, 'podszafkowa'); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt prosty (35cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'none', 350, 'podszafkowa'); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Lewy (31cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-left', 310, 'podszafkowa'); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Lewy (35cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-left', 350, 'podszafkowa'); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Prawy (31cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-right', 310, 'podszafkowa'); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Prawy (35cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-right', 350, 'podszafkowa'); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Obustronny (31cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-both', 310, 'podszafkowa'); setContextMenu(null); }}
                                    />
                                    <ContextButton
                                        label="Kąt 45° Obustronny (35cm)"
                                        onClick={() => { handleAddSharedStrip(targets, 'angle-45-both', 350, 'podszafkowa'); setContextMenu(null); }}
                                    />
                                </>
                            );
                        }

                        // OPCJE DLA ISTNIEJĄCEJ LISTWY
                        const allStrips = targetCabs.every(c => c.cabinet.id.includes('listwa'));
                        if (targets.length > 0 && allStrips) {
                            return (
                                <>
                                    <div style={{ height: '1px', background: '#555', margin: '4px 0' }} />
                                    <h4 style={{ margin: '4px 12px', fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase' }}>Edycja listwy</h4>
                                    {(() => {
                                        const isPodszafkowa = targetCabs.every(c => c.cabinet.id === 'gorna-listwa-podszafkowa');
                                        const value = isPodszafkowa ? '34.8cm' : '32.8cm';
                                        return (
                                            <>
                                                <ContextButton
                                                    label={`Poszerz +${value} (L)`}
                                                    onClick={() => { handleExtendStrip(targets, 'left'); setContextMenu(null); }}
                                                />
                                                {isPodszafkowa && (
                                                    <ContextButton
                                                        label="Przedłużenie pod szafkę narożną L (L)"
                                                        onClick={() => { }}
                                                        submenu={(
                                                            <>
                                                                <ContextButton label="Poszerz o 650mm" onClick={() => { handleExtendStrip(targets, 'left', 650); setContextMenu(null); }} />
                                                                <ContextButton label="Poszerz o 750mm" onClick={() => { handleExtendStrip(targets, 'left', 750); setContextMenu(null); }} />
                                                                <ContextButton label="Poszerz o 800mm" onClick={() => { handleExtendStrip(targets, 'left', 800); setContextMenu(null); }} />
                                                                <ContextButton label="Poszerz o 850mm" onClick={() => { handleExtendStrip(targets, 'left', 850); setContextMenu(null); }} />
                                                            </>
                                                        )}
                                                    />
                                                )}
                                                {isPodszafkowa && (
                                                    <ContextButton
                                                        label="Przedłuż pod okap (L)"
                                                        onClick={() => { setExtensionPrompt({ uuids: targets, direction: 'left' }); setContextMenu(null); }}
                                                    />
                                                )}
                                                <ContextButton
                                                    label="Skróć o 18mm (L)"
                                                    onClick={() => { handleTrimStrip(targets, 'left'); setContextMenu(null); }}
                                                />
                                                <div style={{ height: '1px', background: '#333', margin: '4px 0' }} />
                                                <ContextButton
                                                    label={`Poszerz +${value} (P)`}
                                                    onClick={() => { handleExtendStrip(targets, 'right'); setContextMenu(null); }}
                                                />
                                                {isPodszafkowa && (
                                                    <ContextButton
                                                        label="Przedłużenie pod szafkę narożną L (P)"
                                                        onClick={() => { }}
                                                        submenu={(
                                                            <>
                                                                <ContextButton label="Poszerz o 650mm" onClick={() => { handleExtendStrip(targets, 'right', 650); setContextMenu(null); }} />
                                                                <ContextButton label="Poszerz o 750mm" onClick={() => { handleExtendStrip(targets, 'right', 750); setContextMenu(null); }} />
                                                                <ContextButton label="Poszerz o 800mm" onClick={() => { handleExtendStrip(targets, 'right', 800); setContextMenu(null); }} />
                                                                <ContextButton label="Poszerz o 850mm" onClick={() => { handleExtendStrip(targets, 'right', 850); setContextMenu(null); }} />
                                                            </>
                                                        )}
                                                    />
                                                )}
                                                {isPodszafkowa && (
                                                    <ContextButton
                                                        label="Przedłuż pod okap (P)"
                                                        onClick={() => { setExtensionPrompt({ uuids: targets, direction: 'right' }); setContextMenu(null); }}
                                                    />
                                                )}
                                                <ContextButton
                                                    label="Skróć o 18mm (P)"
                                                    onClick={() => { handleTrimStrip(targets, 'right'); setContextMenu(null); }}
                                                />
                                                {isPodszafkowa && (
                                                    <>
                                                        <div style={{ height: '1px', background: '#333', margin: '4px 0' }} />
                                                        <ContextButton
                                                            label="Dodaj fartuch wzdłuż ściany"
                                                            onClick={() => { handleAddFartuch(targetCabs); setContextMenu(null); }}
                                                        />
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </>
                            );
                        }

                        const allBlats = targetCabs.every(c => c.cabinet.id.startsWith('blat-'));
                        if (targets.length > 0 && allBlats) {
                            return (
                                <>
                                    <div style={{ height: '1px', background: '#444', margin: '4px 0' }} />
                                    <ContextButton
                                        label="Przedłuż nad szafkę rogową"
                                        onClick={() => { }}
                                        submenu={(
                                            <>
                                                <ContextButton label="W lewo (L)" onClick={() => { handleExtendCountertop(targets, 'left', 618); setContextMenu(null); }} />
                                                <ContextButton label="W prawo (P)" onClick={() => { handleExtendCountertop(targets, 'right', 618); setContextMenu(null); }} />
                                            </>
                                        )}
                                    />
                                    <ContextButton
                                        label="Poszerz o 18mm"
                                        onClick={() => { }}
                                        submenu={(
                                            <>
                                                <ContextButton label="Z lewej (L)" onClick={() => { handleExtendCountertop(targets, 'left', 18); setContextMenu(null); }} />
                                                <ContextButton label="Z prawej (P)" onClick={() => { handleExtendCountertop(targets, 'right', 18); setContextMenu(null); }} />
                                            </>
                                        )}
                                    />
                                    <ContextButton
                                        label="Poszerz o 2cm"
                                        onClick={() => { }}
                                        submenu={(
                                            <>
                                                <ContextButton label="Z lewej (L)" onClick={() => { handleExtendCountertop(targets, 'left', 20); setContextMenu(null); }} />
                                                <ContextButton label="Z prawej (P)" onClick={() => { handleExtendCountertop(targets, 'right', 20); setContextMenu(null); }} />
                                            </>
                                        )}
                                    />
                                    <ContextButton
                                        label="Skróć o 18mm"
                                        onClick={() => { }}
                                        submenu={(
                                            <>
                                                <ContextButton label="Z lewej (L)" onClick={() => { handleTrimCountertop(targets, 'left', 18); setContextMenu(null); }} />
                                                <ContextButton label="Z prawej (P)" onClick={() => { handleTrimCountertop(targets, 'right', 18); setContextMenu(null); }} />
                                            </>
                                        )}
                                    />
                                    <ContextButton
                                        label="Utnij 60cm (do narożnika)"
                                        onClick={() => { }}
                                        submenu={(
                                            <>
                                                <ContextButton label="Z lewej (L)" onClick={() => { handleTrimCountertop(targets, 'left'); setContextMenu(null); }} />
                                                <ContextButton label="Z prawej (P)" onClick={() => { handleTrimCountertop(targets, 'right'); setContextMenu(null); }} />
                                            </>
                                        )}
                                    />
                                    <ContextButton
                                        label="Przesuń do tyłu o 18mm"
                                        onClick={() => {
                                            handleMoveForward(targets, -18);
                                            setContextMenu(null);
                                        }}
                                    />
                                    <ContextButton
                                        label="Przesuń do tyłu o 20mm"
                                        onClick={() => {
                                            handleMoveForward(targets, -20);
                                            setContextMenu(null);
                                        }}
                                    />
                                    {targets.length >= 1 && (
                                        <>
                                            <div style={{ height: '1px', background: '#555', margin: '4px 0' }} />
                                            <ContextButton
                                                label="Łączenie na łyżwę"
                                                onClick={() => {
                                                    setLyzwaCabUuid(contextMenu.cabUuid);
                                                    setContextMenu(null);
                                                }}
                                            />
                                        </>
                                    )}
                                </>
                            );
                        }

                        const allFartuchy = targetCabs.every(c => c.cabinet.id === 'fartuch-kuchenny');
                        if (targets.length > 0 && allFartuchy) {
                            return (
                                <>
                                    <div style={{ height: '1px', background: '#555', margin: '4px 0' }} />
                                    <h4 style={{ margin: '4px 12px', fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase' }}>Edycja fartucha</h4>
                                    <ContextButton
                                        label="Skróć 18mm z lewej"
                                        onClick={() => {
                                            handleTrimFartuch(targets, 'left');
                                            setContextMenu(null);
                                        }}
                                    />
                                    <ContextButton
                                        label="Skróć 18mm z prawej"
                                        onClick={() => {
                                            handleTrimFartuch(targets, 'right');
                                            setContextMenu(null);
                                        }}
                                    />
                                </>
                            );
                        }

                        return null;
                    })()}
                    <div style={{ height: '1px', background: '#444', margin: '4px 0' }} />
                    {!contextMenu.cabUuid.startsWith('wall-') && (
                        <ContextButton
                            label="Usuń szafkę"
                            color="#ef4444"
                            onClick={() => {
                                const targets = selectedCabinetIds.includes(contextMenu.cabUuid) ? selectedCabinetIds : [contextMenu.cabUuid];
                                handleRemoveCabinet(targets);
                                setContextMenu(null);
                            }}
                        />
                    )}
                </div>
            )}

            {/* Overlay hint */}
            {isHudVisible && (
                <div style={{ position: 'absolute', top: '1rem', left: isHudVisible ? '320px' : '20px', background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', borderRadius: '20px', pointerEvents: 'none', transition: 'left 0.3s' }}>
                    <span style={{ fontSize: '0.85rem' }}>Przeciągaj szafki myszą (strzałki). Kliknij z CTRL by przesunąć góra/dół. Prawy przycisk myszy obraca kamerę.</span>
                </div>
            )}

            {/* Lyzwa Panel */}
            {lyzwaCabUuid && (() => {
                const blatCab = placedCabinets.find(c => c.uuid === lyzwaCabUuid);
                if (!blatCab) return null;
                return (
                    <LyzwaPanel
                        cabinet={blatCab.cabinet}
                        onApply={(leftCut, rightCut) => {
                            setPlacedCabinets(prev => prev.map(c => {
                                if (c.uuid !== lyzwaCabUuid) return c;
                                // Determine if sides were/are extended (lyzwa-male OR lyzwa-female are now "male-acting" joints that expand)
                                const wasRightExt = (c.cabinet as any).rightCutType === 'lyzwa-male' || (c.cabinet as any).rightCutType === 'lyzwa-female';
                                const nowRightExt = rightCut === 'lyzwa-male' || rightCut === 'lyzwa-female';
                                const wasLeftExt = (c.cabinet as any).leftCutType === 'lyzwa-male' || (c.cabinet as any).leftCutType === 'lyzwa-female';
                                const nowLeftExt = leftCut === 'lyzwa-male' || leftCut === 'lyzwa-female';

                                const rotY = c.rotation[1];
                                let newWidth = c.cabinet.width;
                                let posOff = 0;

                                // Handle Right side extension (+30mm width, +15mm shift right)
                                if (!wasRightExt && nowRightExt) { newWidth += 30; posOff += 15; }
                                if (wasRightExt && !nowRightExt) { newWidth -= 30; posOff -= 15; }

                                // Handle Left side extension (+30mm width, -15mm shift left)
                                if (!wasLeftExt && nowLeftExt) { newWidth += 30; posOff -= 15; }
                                if (wasLeftExt && !nowLeftExt) { newWidth -= 30; posOff += 15; }

                                const dx = posOff * Math.cos(rotY);
                                const dz = -posOff * Math.sin(rotY);
                                return {
                                    ...c,
                                    position: [c.position[0] + dx, c.position[1], c.position[2] + dz] as [number, number, number],
                                    cabinet: { ...c.cabinet, width: newWidth, leftCutType: leftCut, rightCutType: rightCut }
                                };
                            }));
                            setLyzwaCabUuid(null);
                        }}
                        onClose={() => setLyzwaCabUuid(null)}
                    />
                );
            })()}

            {extensionPrompt && (
                <ExtensionModal
                    direction={extensionPrompt.direction}
                    onClose={() => setExtensionPrompt(null)}
                    onApply={(amount) => {
                        handleExtendStrip(extensionPrompt.uuids, extensionPrompt.direction, amount);
                        setExtensionPrompt(null);
                    }}
                />
            )}

            {/* Configurator Modal */}
            {isConfiguratorOpen && selectedCabinetIds.length === 1 && (
                <CabinetForm
                    cabinet={placedCabinets.find(c => c.uuid === selectedCabinetIds[0])!.cabinet}
                    settings={defaultPricingSettings}
                    onClose={() => setIsConfiguratorOpen(false)}
                    onAddToCart={(updatedCab) => handleSaveConfiguration(updatedCab)}
                />
            )}

            {/* Cart Panel - wycena projektu */}
            {isCartOpen && (
                <CartPanel
                    placedCabinets={placedCabinets}
                    onClose={() => setIsCartOpen(false)}
                />
            )}
            {/* Global Decor Selector */}
            {globalDecorMode && (
                <DecorSelector
                    title={globalDecorMode === 'body' ? "Wybierz kolor dla wszystkich korpusów" : "Wybierz kolor dla wszystkich frontów"}
                    onSelect={handleSetGlobalDecor}
                    onClose={() => setGlobalDecorMode(null)}
                />
            )}

            {/* Selection Decor Selector */}
            {selectionDecorMode && (
                <DecorSelector
                    title={selectionDecorMode === 'body' ? "Wybierz materiał korpusu dla zaznaczonych" : "Wybierz materiał frontu dla zaznaczonych"}
                    onSelect={handleSetSelectionDecor}
                    onClose={() => setSelectionDecorMode(null)}
                />
            )}
        </div>
    );
}

function ContextButton({ label, onClick, color = '#fff', submenu }: { label: string, onClick: () => void, color?: string, submenu?: React.ReactNode }) {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            style={{ position: 'relative', width: '100%' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
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
                    gap: '8px',
                    position: 'relative'
                }}
            >
                {label}
                {submenu && <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>▶</span>}
            </button>

            {isHovered && submenu && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '100%',
                    background: '#2c2c2c',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    padding: '4px 0',
                    minWidth: '180px',
                    zIndex: 1001
                }}>
                    {submenu}
                </div>
            )}
        </div>
    );
}

type CutType = 'none' | 'lyzwa-male' | 'lyzwa-female' | 'lyzwa-female-corner';

function LyzwaPanel({
    cabinet,
    onApply,
    onClose,
}: {
    cabinet: any;
    onApply: (leftCut: CutType, rightCut: CutType) => void;
    onClose: () => void;
}) {
    const [leftCut, setLeftCut] = React.useState<CutType>(cabinet.leftCutType || 'none');
    const [rightCut, setRightCut] = React.useState<CutType>(cabinet.rightCutType || 'none');

    const LABELS: Record<CutType, string> = {
        'none': '— Brak',
        'lyzwa-male': 'Męska',
        'lyzwa-female': 'Męska (frez)',
        'lyzwa-female-corner': 'Żeńska (narożna 60cm)',
    };

    const EdgeSelector = ({ label, value, onChange }: { label: string; value: CutType; onChange: (v: CutType) => void }) => (
        <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.78rem', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['none', 'lyzwa-female', 'lyzwa-female-corner'] as CutType[]).map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        style={{
                            flex: 1, padding: '6px 4px', fontSize: '0.75rem',
                            border: value === opt ? '2px solid #f59e0b' : '1px solid #555',
                            borderRadius: '6px', cursor: 'pointer',
                            background: value === opt ? '#78350f' : '#333',
                            color: value === opt ? '#fef3c7' : '#ccc',
                            fontWeight: value === opt ? 700 : 400,
                            transition: 'all 0.15s',
                        }}
                    >
                        {LABELS[opt]}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div
            style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: '#1e1e1e', border: '1px solid #555', borderRadius: '12px',
                padding: '24px', width: '480px', zIndex: 1000,
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                color: '#fff', fontFamily: 'system-ui, sans-serif'
            }}
            onClick={e => e.stopPropagation()}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#f59e0b' }}>Łączenie na łyżwę</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Visual blat diagram */}
            <div style={{
                position: 'relative', height: '80px', margin: '0 0 20px',
                background: '#d4a373', borderRadius: '4px',
                border: '1px solid #a07850',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <span style={{ fontSize: '0.8rem', color: '#5a3a1a', fontWeight: 600 }}>BLAT — {cabinet.width}mm × {cabinet.depth}mm</span>
                {/* Left edge indicator */}
                <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px',
                    borderRadius: '4px 0 0 4px',
                    background: leftCut === 'lyzwa-male' ? '#f59e0b' : (leftCut.includes('female') ? '#6366f1' : '#888'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} />
                {/* Right edge indicator */}
                <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px',
                    borderRadius: '0 4px 4px 0',
                    background: rightCut === 'lyzwa-male' ? '#f59e0b' : (rightCut.includes('female') ? '#6366f1' : '#888'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} />
                {/* Labels on diagram */}
                <div style={{ position: 'absolute', left: '14px', fontSize: '0.7rem', color: leftCut !== 'none' ? '#fef3c7' : '#555' }}>
                    {leftCut !== 'none' ? (leftCut === 'lyzwa-male' || leftCut === 'lyzwa-female' ? 'Męska' : 'Żeńska (rogu)') : ''}
                </div>
                <div style={{ position: 'absolute', right: '14px', fontSize: '0.7rem', color: rightCut !== 'none' ? '#fef3c7' : '#555' }}>
                    {rightCut !== 'none' ? (rightCut === 'lyzwa-male' || rightCut === 'lyzwa-female' ? 'Męska' : 'Żeńska (rogu)') : ''}
                </div>
            </div>

            {/* Edge selectors */}
            <EdgeSelector label="Krawędź lewa" value={leftCut} onChange={setLeftCut} />
            <EdgeSelector label="Krawędź prawa" value={rightCut} onChange={setRightCut} />

            {/* Legend */}
            <div style={{ fontSize: '0.72rem', color: '#777', margin: '8px 0 20px', lineHeight: '1.6' }}>
                <span><span style={{ color: '#6366f1' }}>■</span> Żeńska: blat ma wycięcie boczne 50mm przyjmujące występ</span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                    onClick={onClose}
                    style={{ padding: '8px 18px', background: '#333', color: '#ccc', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer' }}
                >
                    Anuluj
                </button>
                <button
                    onClick={() => onApply(leftCut, rightCut)}
                    style={{ padding: '8px 18px', background: '#f59e0b', color: '#1a1a1a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                >
                    Zastosuj łyżwę
                </button>
            </div>
        </div>
    );
}

function ExtensionModal({
    onApply,
    onClose,
    direction
}: {
    onApply: (amount: number) => void;
    onClose: () => void;
    direction: 'left' | 'right';
}) {
    const [amount, setAmount] = React.useState<number>(600);

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.7)', zIndex: 3000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1e1e1e', border: '1px solid #555', borderRadius: '12px',
                    padding: '24px', width: '320px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                    color: '#fff', fontFamily: 'system-ui, sans-serif'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#f59e0b' }}>Przedłużenie ({direction === 'left' ? 'L' : 'P'})</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px' }}>Długość przedłużenia (mm):</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && onApply(amount)}
                        style={{
                            width: '100%', padding: '12px', background: '#333', border: '1px solid #555',
                            borderRadius: '8px', color: '#fff', fontSize: '1.1rem', outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '8px 18px', background: '#333', color: '#ccc', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={() => onApply(amount)}
                        style={{ padding: '8px 18px', background: '#f59e0b', color: '#1a1a1a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                    >
                        Przedłuż
                    </button>
                </div>
            </div>
        </div>
    );
}
