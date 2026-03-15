"use client";

import React, { useRef, useState, useEffect } from "react";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Cabinet } from "@/data/cabinets";
import Szafka3D from "@/components/3D/Szafka3D";
import { PlacedCabinet } from "./RoomPlanner";

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
}

// === COLLISION HELPERS ===

interface CollisionRect {
    w: number;
    d: number;
    x: number; // local center X
    z: number; // local center Z
}

function getCollisionRects(cabinet: Cabinet): CollisionRect[] {
    const isL = cabinet.id.endsWith('-90');
    if (isL) {
        const w2 = (cabinet as any).width2 || 900;
        const w1 = cabinet.width;
        const d = cabinet.depth;
        // Optimized L-shape collision as TWO boxes (Back-Left orientation)
        return [
            { w: w1, d: d, x: 0, z: -w2 / 2 + d / 2 },
            { w: d, d: w2 - d, x: -w1 / 2 + d / 2, z: d / 2 }
        ];
    }
    return [{ w: cabinet.width, d: cabinet.depth, x: 0, z: 0 }];
}

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
    isTechnicalView
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
                const requestedPos = target.position.clone();
                const rotY = target.rotation.y;
                const oldPos = new THREE.Vector3(...lastValidPos);

                const rects = getCollisionRects(cabinet);
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
                const SNAP = 50;
                const LEG_H = 60;
                const h1 = cabinet.id.startsWith('gorna-') ? cabinet.height : (cabinet.height + LEG_H);

                // Axis Snapping & Room Bounds
                const tryAxis = (axis: 'x' | 'y' | 'z', currentVal: number, oldVal: number) => {
                    let testPos = target.position.clone();
                    testPos[axis] = currentVal;
                    
                    let finalVal = currentVal;
                    // Snapping to walls
                    if (axis === 'x') {
                        const b = getFullBounds(testPos, rotY);
                        if (Math.abs(b.maxX - roomHalfW) < SNAP) finalVal = currentVal - (b.maxX - roomHalfW);
                        if (Math.abs(b.minX - (-roomHalfW)) < SNAP) finalVal = currentVal - (b.minX + roomHalfW);
                    } else if (axis === 'z') {
                        const b = getFullBounds(testPos, rotY);
                        if (Math.abs(b.maxZ - roomHalfZ) < SNAP) finalVal = currentVal - (b.maxZ - roomHalfZ);
                        if (Math.abs(b.minZ - (-roomHalfZ)) < SNAP) finalVal = currentVal - (b.minZ + roomHalfZ);
                    } else if (axis === 'y' && cabinet.id.startsWith('gorna-')) {
                        if (Math.abs(finalVal + h1 - roomDimensions.height) < SNAP) finalVal = roomDimensions.height - h1;
                        if (Math.abs(finalVal - 0) < SNAP) finalVal = 0;
                    }

                    // Snapping to others
                    otherCabinets.forEach(other => {
                        const h2 = other.cabinet.id.startsWith('gorna-') ? other.cabinet.height : (other.cabinet.height + LEG_H);
                        const yOverlap = !(testPos.y + h1 < other.position[1] || other.position[1] + h2 < testPos.y);
                        if (!yOverlap) return;

                        const otherRects = getCollisionRects(other.cabinet);
                        const otherPosVec = new THREE.Vector3(...other.position);
                        
                        // Per-rectangle snapping for maximum accuracy (especially for L-shapes)
                        rects.forEach(myRect => {
                            const myB = getRectWorldBounds(testPos, rotY, myRect);
                            otherRects.forEach(oRect => {
                                const ob = getRectWorldBounds(otherPosVec, other.rotation[1], oRect);
                                
                                const xOverlap = !(myB.maxX < ob.minX || ob.maxX < myB.minX);
                                const zOverlap = !(myB.maxZ < ob.minZ || ob.maxZ < myB.minZ);

                                if (axis === 'x' && zOverlap) {
                                    if (Math.abs(myB.minX - ob.maxX) < SNAP) finalVal = currentVal + (ob.maxX - myB.minX);
                                    if (Math.abs(myB.maxX - ob.minX) < SNAP) finalVal = currentVal - (myB.maxX - ob.minX);
                                } else if (axis === 'z' && xOverlap) {
                                    if (Math.abs(myB.minZ - ob.maxZ) < SNAP) finalVal = currentVal + (ob.maxZ - myB.minZ);
                                    if (Math.abs(myB.maxZ - ob.minZ) < SNAP) finalVal = currentVal - (myB.maxZ - ob.minZ);
                                }
                            });
                        });
                    });

                    // Room Constraints (Hard limit) using FULL bounds
                    testPos[axis] = finalVal;
                    const bFinal = getFullBounds(testPos, rotY);
                    if (axis === 'x') {
                        if (bFinal.maxX > roomHalfW) finalVal -= (bFinal.maxX - roomHalfW);
                        if (bFinal.minX < -roomHalfW) finalVal += (-roomHalfW - bFinal.minX);
                    } else if (axis === 'z') {
                        if (bFinal.maxZ > roomHalfZ) finalVal -= (bFinal.maxZ - roomHalfZ);
                        if (bFinal.minZ < -roomHalfZ) finalVal += (-roomHalfZ - bFinal.minZ);
                    } else if (axis === 'y') {
                        if (finalVal + h1 > roomDimensions.height) finalVal = roomDimensions.height - h1;
                        if (finalVal < 0) finalVal = 0;
                    }

                    // Global Collision Check
                    testPos[axis] = finalVal;
                    let collision = false;
                    for (const other of otherCabinets) {
                        const h2 = other.cabinet.id.startsWith('gorna-') ? other.cabinet.height : (other.cabinet.height + LEG_H);
                        const otherYOverlap = !(testPos.y + h1 < other.position[1] || other.position[1] + h2 < testPos.y);
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

                const newPos: [number, number, number] = [target.position.x, target.position.y, target.position.z];
                setLastValidPos(newPos);
                onUpdate(uuid, newPos, [target.rotation.x, target.rotation.y, target.rotation.z]);
            };

            const onDraggingChanged = (event: { value: boolean }) => {};
            controls.addEventListener('dragging-changed', onDraggingChanged);
            controls.addEventListener('change', changeCallback);
            controls.enabled = !isLocked && !isPreviewMode && !isTechnicalView;
            return () => {
                controls.removeEventListener('dragging-changed', onDraggingChanged);
                controls.removeEventListener('change', changeCallback);
            };
        }
    }, [onUpdate, uuid, roomDimensions, cabinet, target, otherCabinets, lastValidPos, isLocked, isPreviewMode, isTechnicalView]);

    const LEG_H = 60;
    const yOriginOffset = cabinet.id.startsWith('gorna-') ? cabinet.height / 2 : (cabinet.height + LEG_H) / 2;

    return (
        <group>
            {isSelected && target && !isPreviewMode && !isTechnicalView ? (
                <TransformControls
                    ref={transformRef}
                    object={target}
                    mode="translate"
                    translationSnap={0.1}
                    showY={cabinet.id.startsWith('gorna-')}
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
                        {getCollisionRects(cabinet).map((rect, i) => (
                            <mesh key={i} position={[rect.x, 0, rect.z]}>
                                <boxGeometry args={[rect.w, cabinet.height, rect.d]} />
                                <meshBasicMaterial color={isLocked ? "#ff0000" : "#00ff00"} wireframe transparent opacity={0.3} />
                            </mesh>
                        ))}
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
                        sinkBackRimHeight={(cabinet as any).sinkBackRimHeight}
                        hasDoors={(cabinet as any).hasFronts}
                        elements={(cabinet as any).elements}
                        width2={(cabinet as any).width2}
                        isStaticPreview={true}
                        renderAsGroup={true}
                    />
                </group>
            </group>
        </group>
    );
}
