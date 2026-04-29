"use client";

import React, { useRef, useState, useEffect } from "react";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Cabinet } from "@/data/cabinets";
import Szafka3D from "@/components/3D/Szafka3D";
import { PlacedCabinet } from "./RoomPlanner";
import { getCollisionRects, CollisionRect } from "@/lib/calculate";

interface DraggableCabinetProps {
    uuid: string;
    cabinet: Cabinet;
    initialPosition: [number, number, number];
    initialRotation: [number, number, number];
    isSelected: boolean;
    onSelect: (ctrlKey: boolean) => void;
    onUpdate: (uuid: string, position: [number, number, number], rotation: [number, number, number]) => void;
    roomDimensions: { width: number; depth: number; height: number };
    otherCabinets: PlacedCabinet[];
    onContextMenu?: (uuid: string, event: { x: number, y: number }) => void;
    isLocked?: boolean;
    isPreviewMode?: boolean;
    isTechnicalView?: boolean;
    showFrontEdges?: boolean;
}

// === COLLISION HELPERS ===

function getRectWorldBounds(p: THREE.Vector3, r: number, rect: CollisionRect) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const hw = rect.w / 2;
    const hd = rect.d / 2;
    const points = [
        { x: -hw + rect.x, z: -hd + rect.z },
        { x: hw + rect.x, z: -hd + rect.z },
        { x: hw + rect.x, z: hd + rect.z },
        { x: -hw + rect.x, z: hd + rect.z },
    ];
    points.forEach(v => {
        const rx = v.x * Math.cos(r) - v.z * Math.sin(r);
        const rz = v.x * Math.sin(r) + v.z * Math.cos(r);
        minX = Math.min(minX, p.x + rx);
        maxX = Math.max(maxX, p.x + rx);
        minZ = Math.min(minZ, p.z + rz);
        maxZ = Math.max(maxZ, p.z + rz);
    });
    return { minX, maxX, minZ, maxZ };
}

function checkSAT(
    pos1: THREE.Vector3, rot1: number, rect1: CollisionRect,
    pos2: THREE.Vector3, rot2: number, rect2: CollisionRect
) {
    const getCorners = (p: THREE.Vector3, r: number, rect: CollisionRect) => {
        const hw = rect.w / 2;
        const hd = rect.d / 2;
        const c = [
            new THREE.Vector2(-hw + rect.x, -hd + rect.z),
            new THREE.Vector2(hw + rect.x, -hd + rect.z),
            new THREE.Vector2(hw + rect.x, hd + rect.z),
            new THREE.Vector2(-hw + rect.x, hd + rect.z),
        ];
        return c.map(v => {
            const rotatedX = v.x * Math.cos(r) - v.y * Math.sin(r);
            const rotatedY = v.x * Math.sin(r) + v.y * Math.cos(r);
            return new THREE.Vector2(p.x + rotatedX, p.z + rotatedY);
        });
    };

    const corners1 = getCorners(pos1, rot1, rect1);
    const corners2 = getCorners(pos2, rot2, rect2);

    const getAxes = (c: THREE.Vector2[]) => {
        const axes = [];
        for (let i = 0; i < c.length; i++) {
            const p1 = c[i];
            const p2 = c[(i + 1) % c.length];
            const edge = new THREE.Vector2().subVectors(p2, p1);
            axes.push(new THREE.Vector2(-edge.y, edge.x).normalize());
        }
        return axes;
    };

    const axes = [...getAxes(corners1), ...getAxes(corners2)];
    for (const axis of axes) {
        const project = (corners: THREE.Vector2[]) => {
            let min = Infinity, max = -Infinity;
            for (const p of corners) {
                const dot = p.dot(axis);
                min = Math.min(min, dot);
                max = Math.max(max, dot);
            }
            return [min, max];
        };
        const [min1, max1] = project(corners1);
        const [min2, max2] = project(corners2);
        const marginVal = 0.01;
        if (max1 < min2 + marginVal || max2 < min1 + marginVal) return false;
    }
    return true;
}

function checkGlobalCollision(
    pos1: THREE.Vector3, rot1: number, cabinet1: Cabinet,
    pos2: THREE.Vector3, rot2: number, cabinet2: Cabinet,
    yOverlap: boolean
) {
    if (!yOverlap) return false;
    const rects1 = getCollisionRects(cabinet1);
    const rects2 = getCollisionRects(cabinet2);

    for (const r1 of rects1) {
        for (const r2 of rects2) {
            if (checkSAT(pos1, rot1, r1, pos2, rot2, r2)) return true;
        }
    }
    return false;
}

// === COMPONENT ===

export default function DraggableCabinet({
    uuid,
    cabinet,
    initialPosition,
    initialRotation,
    isSelected,
    onSelect,
    onUpdate,
    roomDimensions,
    otherCabinets,
    onContextMenu,
    isLocked,
    isPreviewMode,
    isTechnicalView,
    showFrontEdges
}: DraggableCabinetProps) {
    const [target, setTarget] = useState<THREE.Object3D | null>(null);
    const [lastValidPos, setLastValidPos] = useState<[number, number, number]>(initialPosition);
    const transformRef = useRef<any>(null);
    const { camera, gl } = useThree();

    useEffect(() => {
        if (target) {
            target.rotation.set(initialRotation[0], initialRotation[1], initialRotation[2]);
            target.position.set(...initialPosition);
            setLastValidPos(initialPosition);
        }
    }, [initialRotation, initialPosition, target]);

    useEffect(() => {
        if (transformRef.current && target) {
            const controls = transformRef.current;

            const changeCallback = () => {
                if (!controls || !controls.enabled) return;

                const requestedPos = target.position.clone();
                const rotY = target.rotation.y;
                const oldPos = new THREE.Vector3(...lastValidPos);

                // Calculate rects for snapping/bounds ONLY (excluding front panels to avoid wall gaps)
                const rects = getCollisionRects(cabinet, true);
                const getFullBounds = (p: THREE.Vector3, r: number) => {
                    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
                    rects.forEach(rect => {
                        const b = getRectWorldBounds(p, r, rect);
                        minX = Math.min(minX, b.minX);
                        maxX = Math.max(maxX, b.maxX);
                        minZ = Math.min(minZ, b.minZ);
                        maxZ = Math.max(maxZ, b.maxZ);
                    });
                    return { minX, maxX, minZ, maxZ };
                };

                const roomHalfW = roomDimensions.width / 2;
                const roomHalfZ = roomDimensions.depth / 2;
                const SNAP = 15;
                const LEG_H = 100;
                const isFloating = cabinet.id.startsWith('gorna-') || cabinet.id.startsWith('blat-') || cabinet.id === 'fartuch-kuchenny' || cabinet.id === 'blenda-meblowa';
                const h1 = isFloating ? cabinet.height : (cabinet.height + LEG_H);

                // Axis Snapping & Room Bounds
                const tryAxis = (axis: 'x' | 'y' | 'z', currentVal: number, oldVal: number) => {
                    let testPos = target.position.clone();
                    testPos[axis] = currentVal;

                    let wallSnapOffset = 0;
                    // Snapping to walls
                    if (axis === 'x') {
                        const b = getFullBounds(testPos, rotY);
                        if (Math.abs(b.maxX - roomHalfW) < SNAP) wallSnapOffset = -(b.maxX - roomHalfW);
                        if (Math.abs(b.minX - (-roomHalfW)) < SNAP) wallSnapOffset = -(b.minX + roomHalfW);
                    } else if (axis === 'z') {
                        const b = getFullBounds(testPos, rotY);
                        const isCountertop = cabinet.id.startsWith('blat-');
                        if (!isCountertop && Math.abs(b.maxZ - roomHalfZ) < SNAP) wallSnapOffset = -(b.maxZ - roomHalfZ);
                        if (Math.abs(b.minZ - (-roomHalfZ)) < SNAP) wallSnapOffset = -(b.minZ + roomHalfZ);
                    } else if (axis === 'y' && isFloating) {
                        if (Math.abs(currentVal + h1 - roomDimensions.height) < SNAP) wallSnapOffset = (roomDimensions.height - h1) - currentVal;
                        if (Math.abs(currentVal - 0) < SNAP) wallSnapOffset = -currentVal;
                    }

                    // Snapping to others
                    let bestSnapOffset = 0;
                    let minSnapDist = Infinity;

                    otherCabinets.forEach(other => {
                        const isOtherFloating = other.cabinet.id.startsWith('gorna-') || other.cabinet.id.startsWith('blat-') || other.cabinet.id === 'fartuch-kuchenny' || other.cabinet.id === 'blenda-meblowa';
                        const h2 = isOtherFloating ? other.cabinet.height : (other.cabinet.height + LEG_H);

                        const yOverlapPhysics = !(testPos.y + h1 <= other.position[1] || other.position[1] + h2 <= testPos.y);
                        const topTouchesBottom = Math.abs((testPos.y + h1) - other.position[1]) < 2;
                        const bottomTouchesTop = Math.abs(testPos.y - (other.position[1] + h2)) < 2;

                        if (!yOverlapPhysics && !topTouchesBottom && !bottomTouchesTop && axis !== 'y') return;

                        const otherRects = getCollisionRects(other.cabinet, true);
                        const otherPosVec = new THREE.Vector3(...other.position);
                        const snapRects = getCollisionRects(cabinet, true);

                        snapRects.forEach(myRect => {
                            const myB = getRectWorldBounds(testPos, rotY, myRect);
                            otherRects.forEach(oRect => {
                                const ob = getRectWorldBounds(otherPosVec, other.rotation[1], oRect);

                                const xOverlap = !(myB.maxX <= ob.minX + 1.0 || ob.maxX <= myB.minX + 1.0);
                                const zOverlap = !(myB.maxZ <= ob.minZ + 1.0 || ob.maxZ <= myB.minZ + 1.0);

                                if (axis === 'x' && zOverlap) {
                                    if (yOverlapPhysics || topTouchesBottom || bottomTouchesTop) {
                                        const d1 = Math.abs(myB.minX - ob.maxX);
                                        const d2 = Math.abs(myB.maxX - ob.minX);
                                        const d3 = Math.abs(myB.minX - ob.minX);
                                        const d4 = Math.abs(myB.maxX - ob.maxX);

                                        if (d1 < SNAP && d1 < minSnapDist) {
                                            minSnapDist = d1; bestSnapOffset = (ob.maxX - myB.minX);
                                        }
                                        if (d2 < SNAP && d2 < minSnapDist) {
                                            minSnapDist = d2; bestSnapOffset = (ob.minX - myB.maxX);
                                        }
                                        if (d3 < SNAP && d3 < minSnapDist) {
                                            minSnapDist = d3; bestSnapOffset = (ob.minX - myB.minX);
                                        }
                                        if (d4 < SNAP && d4 < minSnapDist) {
                                            minSnapDist = d4; bestSnapOffset = (ob.maxX - myB.maxX);
                                        }
                                    }
                                } else if (axis === 'z' && xOverlap) {
                                    if (yOverlapPhysics || topTouchesBottom || bottomTouchesTop) {
                                        const d1 = Math.abs(myB.minZ - ob.maxZ);
                                        const d2 = Math.abs(myB.maxZ - ob.minZ);
                                        const d3 = Math.abs(myB.minZ - ob.minZ);
                                        const d4 = Math.abs(myB.maxZ - ob.maxZ);

                                        if (d1 < SNAP && d1 < minSnapDist) {
                                            minSnapDist = d1; bestSnapOffset = (ob.maxZ - myB.minZ);
                                        }
                                        if (d2 < SNAP && d2 < minSnapDist) {
                                            minSnapDist = d2; bestSnapOffset = (ob.minZ - myB.maxZ);
                                        }
                                        if (d3 < SNAP && d3 < minSnapDist) {
                                            minSnapDist = d3; bestSnapOffset = (ob.minZ - myB.minZ);
                                        }
                                        if (d4 < SNAP && d4 < minSnapDist) {
                                            minSnapDist = d4; bestSnapOffset = (ob.maxZ - myB.maxZ);
                                        }
                                    }
                                } else if (axis === 'y') {
                                    const horizontallyRelevant = (xOverlap || Math.abs(myB.minX - ob.maxX) < SNAP || Math.abs(myB.maxX - ob.minX) < SNAP) &&
                                        (zOverlap || Math.abs(myB.minZ - ob.maxZ) < SNAP || Math.abs(myB.maxZ - ob.minZ) < SNAP);

                                    if (horizontallyRelevant) {
                                        const dBottom = Math.abs(testPos.y - other.position[1]);
                                        const dTop = Math.abs((testPos.y + h1) - (other.position[1] + h2));
                                        const dTop2Bottom = Math.abs((testPos.y + h1) - other.position[1]);
                                        const dBottom2Top = Math.abs(testPos.y - (other.position[1] + h2));

                                        if (dBottom < SNAP && dBottom < minSnapDist) {
                                            minSnapDist = dBottom; bestSnapOffset = other.position[1] - testPos.y;
                                        }
                                        if (dTop < SNAP && dTop < minSnapDist) {
                                            minSnapDist = dTop; bestSnapOffset = (other.position[1] + h2) - (testPos.y + h1);
                                        }
                                        if (dTop2Bottom < SNAP && dTop2Bottom < minSnapDist) {
                                            minSnapDist = dTop2Bottom; bestSnapOffset = other.position[1] - (testPos.y + h1);
                                        }
                                        if (dBottom2Top < SNAP && dBottom2Top < minSnapDist) {
                                            minSnapDist = dBottom2Top; bestSnapOffset = (other.position[1] + h2) - testPos.y;
                                        }
                                    }
                                }
                            });
                        });
                    });

                    let finalVal = currentVal;
                    if (minSnapDist < SNAP) {
                        finalVal = currentVal + bestSnapOffset;
                    } else if (wallSnapOffset !== 0) {
                        finalVal = currentVal + wallSnapOffset;
                    }

                    // Room Constraints (Hard limit) using FULL bounds
                    testPos[axis] = finalVal;
                    const bFinal = getFullBounds(testPos, rotY);
                    if (axis === 'x') {
                        if (bFinal.maxX > roomHalfW) finalVal -= (bFinal.maxX - roomHalfW);
                        if (bFinal.minX < -roomHalfW) finalVal += (-roomHalfW - bFinal.minX);
                    } else if (axis === 'z') {
                        const isCountertop = cabinet.id.startsWith('blat-');
                        if (bFinal.maxZ > roomHalfZ && !isCountertop) finalVal -= (bFinal.maxZ - roomHalfZ);
                        if (bFinal.minZ < -roomHalfZ) finalVal += (-roomHalfZ - bFinal.minZ);
                    } else if (axis === 'y') {
                        if (finalVal + h1 > roomDimensions.height) finalVal = roomDimensions.height - h1;
                        if (finalVal < 0) finalVal = 0;
                    }

                    // Global Collision Check
                    testPos[axis] = finalVal;
                    let collision = false;
                    for (const other of otherCabinets) {
                        const isOtherFloating = other.cabinet.id.startsWith('gorna-') || other.cabinet.id.startsWith('blat-') || other.cabinet.id === 'fartuch-kuchenny' || other.cabinet.id === 'blenda-meblowa';
                        const h2 = isOtherFloating ? other.cabinet.height : (other.cabinet.height + LEG_H);
                        const otherYOverlap = !(testPos.y + h1 <= other.position[1] || other.position[1] + h2 <= testPos.y);
                        if (checkGlobalCollision(testPos, rotY, cabinet, new THREE.Vector3(...other.position), other.rotation[1], other.cabinet, otherYOverlap)) {
                            collision = true;
                            break;
                        }
                    }
                    return collision ? oldVal : finalVal;
                };

                const finalX = tryAxis('x', requestedPos.x, oldPos.x);
                target.position.x = finalX;
                const finalY = tryAxis('y', requestedPos.y, oldPos.y);
                target.position.y = finalY;
                const finalZ = tryAxis('z', requestedPos.z, oldPos.z);
                target.position.z = finalZ;

                const isListwa = cabinet.id.toLowerCase().includes('listwa');

                // Snap Y position to 18mm increments for strips (board thickness)
                if (isListwa) {
                    target.position.y = Math.round(target.position.y / 18) * 18;
                }

                // SPECIAL FEATURE: Automatycznie dobijaj szafki górne płytkie do dolnej krawędzi szafek górnych głębokich LUB do listwy
                // Wyłączamy automatyczne dobijanie dla listew między-szafkowych, aby umożliwić ich ręczne/programowe pozycjonowanie w pionie
                if (cabinet.id.startsWith('gorna-') && cabinet.depth <= 350 && !isListwa) {
                    const myRects = getCollisionRects(cabinet, true);
                    for (const other of otherCabinets) {
                        // Szukamy szafek głębokich (standardowo 560mm) lub listew
                        const isDeepUpper = other.cabinet.id.startsWith('gorna-') && other.cabinet.depth >= 500;
                        const isSharedStrip = other.cabinet.id.includes('listwa');

                        if (isDeepUpper || isSharedStrip) {
                            const otherRects = getCollisionRects(other.cabinet, true);
                            let xzOverlap = false;

                            // Docelowy punkt Y: jeśli listwa, to jej spód. Jeśli szafka głęboka, to 18mm pod jej spodem (miejsce na listwę)
                            const snapTargetY = isSharedStrip ? other.position[1] : (other.position[1] - 18);

                            for (const mr of myRects) {
                                const mB = getRectWorldBounds(target.position, target.rotation.y, mr);
                                for (const or of otherRects) {
                                    const oB = getRectWorldBounds(new THREE.Vector3(...other.position), other.rotation[1], or);
                                    const overlapX = Math.max(0, Math.min(mB.maxX, oB.maxX) - Math.max(mB.minX, oB.minX));
                                    const overlapZ = Math.max(0, Math.min(mB.maxZ, oB.maxZ) - Math.max(mB.minZ, oB.minZ));

                                    // Sprawdzamy dystans pionowy - ma dociągać tylko z odległości 100mm
                                    const verticalDist = Math.abs((target.position.y + h1) - snapTargetY);

                                    if (overlapX >= 50 && overlapZ >= 50 && verticalDist <= 100) {
                                        xzOverlap = true; break;
                                    }
                                }
                                if (xzOverlap) break;
                            }
                            if (xzOverlap) {
                                // Dobij precyzyjnie top szafki płytkiej do wybranego poziomu
                                target.position.y = snapTargetY - h1;
                                break;
                            }
                        }
                    }
                }

                const newPos: [number, number, number] = [target.position.x, target.position.y, target.position.z];
                setLastValidPos(newPos);
                onUpdate(uuid, newPos, [target.rotation.x, target.rotation.y, target.rotation.z]);
            };

            const onDraggingChanged = (event: { value: boolean }) => { };
            controls.addEventListener('dragging-changed', onDraggingChanged);
            controls.addEventListener('change', changeCallback);
            controls.enabled = !isLocked && !isPreviewMode && !isTechnicalView;
            return () => {
                controls.removeEventListener('dragging-changed', onDraggingChanged);
                controls.removeEventListener('change', changeCallback);
            };
        }
    }, [onUpdate, uuid, roomDimensions, cabinet, target, otherCabinets, lastValidPos, isLocked, isPreviewMode, isTechnicalView]);

    const LEG_H = 100;
    const isFloating = cabinet.id.startsWith('gorna-') || cabinet.id.startsWith('blat-') || cabinet.id === 'fartuch-kuchenny' || cabinet.id === 'blenda-meblowa';
    const isListwa = cabinet.id.toLowerCase().includes('listwa');
    const yOriginOffset = isFloating ? cabinet.height / 2 : (cabinet.height + LEG_H) / 2;
    const h1 = isFloating ? cabinet.height : (cabinet.height + LEG_H);

    return (
        <group>
            {isSelected && target && !isPreviewMode && !isTechnicalView && !isLocked ? (
                <TransformControls
                    ref={transformRef}
                    object={target}
                    mode="translate"
                    translationSnap={isListwa ? 18 : 0.1}
                    showY={cabinet.id.startsWith('gorna-') || cabinet.id.startsWith('blat-') || cabinet.id === 'fartuch-kuchenny' || cabinet.id === 'blenda-meblowa'}
                    size={1.2}
                />
            ) : null}

            <group
                ref={setTarget as any}
                position={initialPosition}
                rotation={new THREE.Euler(...initialRotation)}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isPreviewMode && !isTechnicalView) {
                        onSelect(e.nativeEvent.ctrlKey || e.nativeEvent.metaKey);
                    }
                }}
                onContextMenu={(e: any) => {
                    e.stopPropagation();
                    if (isPreviewMode || isTechnicalView) return;
                    const originalEvent = e.nativeEvent || e.domEvent;
                    if (onContextMenu && originalEvent) {
                        onContextMenu(uuid, { x: originalEvent.clientX, y: originalEvent.clientY });
                    }
                }}
            >
                {isSelected && !isPreviewMode && !isTechnicalView && (
                    <group position={[0, yOriginOffset, 0]}>
                        {isListwa ? (
                            (() => {
                                const w = cabinet.width;
                                const d = cabinet.depth;
                                const left = (cabinet as any).leftCutType || 'none';
                                const right = (cabinet as any).rightCutType || 'none';

                                const shape = new THREE.Shape();
                                if (left === 'angle-45-left') {
                                    shape.moveTo(-w / 2 + d, -d / 2);
                                } else {
                                    shape.moveTo(-w / 2, -d / 2);
                                }

                                if (right === 'angle-45-right') {
                                    shape.lineTo(w / 2 - d, -d / 2);
                                } else {
                                    shape.lineTo(w / 2, -d / 2);
                                }

                                shape.lineTo(w / 2, d / 2);
                                shape.lineTo(-w / 2, d / 2);

                                if (left === 'angle-45-left') {
                                    shape.lineTo(-w / 2 + d, -d / 2);
                                } else {
                                    shape.lineTo(-w / 2, -d / 2);
                                }

                                return (
                                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -cabinet.height / 2, 0]}>
                                        <extrudeGeometry args={[shape, { depth: cabinet.height, bevelEnabled: false }]} />
                                        <meshBasicMaterial color={isLocked ? "#ff0000" : "#00ff00"} wireframe transparent opacity={0.3} />
                                    </mesh>
                                );
                            })()
                        ) : (
                            getCollisionRects(cabinet).map((rect, i) => (
                                <mesh key={i} position={[rect.x, 0, rect.z]}>
                                    <boxGeometry args={[rect.w, h1, rect.d]} />
                                    <meshBasicMaterial color={isLocked ? "#ff0000" : "#00ff00"} wireframe transparent opacity={0.3} />
                                </mesh>
                            ))
                        )}
                    </group>
                )}
                <group position={[0, yOriginOffset, 0]}>
                    <Szafka3D
                        width={cabinet.width}
                        height={cabinet.height}
                        depth={cabinet.depth}
                        type={cabinet.id}
                        configUnder={(cabinet as any).configUnder || []}
                        configAbove={(cabinet as any).configAbove || []}
                        cornerOrientation={(cabinet as any).cornerOrientation}
                        frontWidth={(cabinet as any).frontWidth}
                        fridgeSpaceHeight={(cabinet as any).fridgeSpaceHeight}
                        ovenSpaceHeight={(cabinet as any).ovenSpaceHeight}
                        microwaveSpaceHeight={(cabinet as any).microwaveSpaceHeight}
                        ovenBaseHeight={(cabinet as any).ovenBaseHeight}
                        isFullTop={(cabinet as any).isFullTop}
                        bodyColor={(cabinet as any).bodyColor || '#ffffff'}
                        bodyDecorId={(cabinet as any).bodyDecorId}
                        frontDecorId={(cabinet as any).frontDecorId}
                        sinkBackRimHeight={(cabinet as any).sinkBackRimHeight}
                        hasDoors={(cabinet as any).hasFronts}
                        elements={(cabinet as any).elements}
                        width2={(cabinet as any).width2}
                        leftCutType={(cabinet as any).leftCutType}
                        rightCutType={(cabinet as any).rightCutType}
                        hoodHeight={cabinet.hoodHeight}
                        hoodCutoutSide={(cabinet as any).hoodCutoutSide}
                        hoodCutoutOffset={(cabinet as any).hoodCutoutOffset}
                        hoodCutoutWidth={(cabinet as any).hoodCutoutWidth}
                        hoodCutoutDepth={(cabinet as any).hoodCutoutDepth}
                        hoodHoleSide={(cabinet as any).hoodHoleSide}
                        hoodHoleOffset={(cabinet as any).hoodHoleOffset}
                        hasHoodHoleTop={(cabinet as any).hasHoodHoleTop !== undefined ? (cabinet as any).hasHoodHoleTop : false}
                        hasShelfHoles={(cabinet as any).hasShelfHoles}
                        shelfHoleCount={(cabinet as any).shelfHoleCount}
                        extendFrontDown={(cabinet as any).extendFrontDown}
                        depthRogowa={(cabinet as any).depthRogowa}
                        pipeSegmentsEnabled={(cabinet as any).pipeSegmentsEnabled}
                        isStaticPreview={true}
                        renderAsGroup={true}
                        showEdges={showFrontEdges}
                    />

                </group>
            </group>
        </group>
    );
}
