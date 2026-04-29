"use client";

import React, { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Text } from "@react-three/drei";
import * as THREE from "three";
import { PlacedCabinet } from "./RoomPlanner";
import DraggableCabinet from "@/components/RoomPlanner/DraggableCabinet";

interface RoomSceneProps {
    roomDimensions: { width: number; depth: number; height: number };
    placedCabinets: PlacedCabinet[];
    selectedCabinetIds: string[];
    onSelectCabinet: (uuid: string, ctrlKey: boolean) => void;
    onUpdateCabinet: (uuid: string, position: [number, number, number], rotation: [number, number, number]) => void;
    onContextMenu?: (uuid: string, event: { x: number, y: number }) => void;
    isPreviewMode?: boolean;
    isTechnicalView?: boolean;
    showFrontEdges?: boolean;
}

function CameraManager({ isTechnicalView, wallHeight, halfD }: { isTechnicalView: boolean, wallHeight: number, halfD: number }) {
    const { camera } = useThree();
    
    useEffect(() => {
        if (isTechnicalView) {
            camera.position.set(0, 5000, 0);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
        }
    }, [isTechnicalView, camera]);

    return null;
}

export default function RoomScene({
    roomDimensions,
    placedCabinets,
    selectedCabinetIds,
    onSelectCabinet,
    onUpdateCabinet,
    onContextMenu,
    isPreviewMode,
    isTechnicalView,
    showFrontEdges
}: RoomSceneProps) {

    // Room center is [0,0,0], walls are calculated from there
    const halfW = roomDimensions.width / 2;
    const halfD = roomDimensions.depth / 2;
    const wallHeight = roomDimensions.height;

    return (
        <Canvas 
            shadows 
            camera={{ 
                position: [0, 1500, halfD * 2], 
                fov: 50,
                near: 1,
                far: 30000 // Crucial for mm-scale scenes!
            }}
        >
            {/* UI/Lights */}
            <color attach="background" args={["#2a2d32"]} />
            <ambientLight intensity={0.7} />
            <hemisphereLight intensity={0.8} groundColor="#444444" color="#ffffff" />
            <directionalLight
                position={[5000, 5000, 5000]}
                intensity={1.8} 
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-halfW * 2}
                shadow-camera-right={halfW * 2}
                shadow-camera-top={halfD * 2}
                shadow-camera-bottom={-halfD * 2}
                shadow-bias={-0.001}
            />
            <directionalLight position={[-5000, 2000, -5000]} intensity={1.2} />
            <pointLight position={[0, wallHeight, 0]} intensity={0.4} color="#fff" />




            <CameraManager isTechnicalView={!!isTechnicalView} wallHeight={wallHeight} halfD={halfD} />

            <OrbitControls
                makeDefault
                minPolarAngle={isTechnicalView ? 0 : Math.PI / 10}
                maxPolarAngle={isTechnicalView ? 0.01 : Math.PI / 2 - 0.1}
                maxDistance={25000}
                minDistance={10}
                zoomSpeed={1.8}
                enableDamping={false}
                target={[0, 0, 0]}
                enableRotate={!isTechnicalView}
            />

            {/* Room Geometry */}
            <group>
                {/* Floor (Visible Oak) */}
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
                    <planeGeometry args={[roomDimensions.width + 1000, roomDimensions.depth + 1000]} />
                    <meshStandardMaterial color="#cdaa7d" roughness={0.6} metalness={0.1} />
                </mesh>

                {/* WALLS: Back, Left, Right (No Front wall to avoid blocking view) */}
                {(() => {
                    const thickness = 200;
                    const h = wallHeight;
                    const w = roomDimensions.width;
                    const d = roomDimensions.depth;

                    return (
                        <>
                            {/* Back Wall */}
                            <mesh position={[0, h / 2, -halfD - thickness / 2]} receiveShadow castShadow>
                                <boxGeometry args={[w + thickness * 2, h, thickness]} />
                                <meshStandardMaterial color="#b0b0b0" />
                            </mesh>

                            {/* Left Wall */}
                            <mesh position={[-halfW - thickness / 2, h / 2, 0]} receiveShadow castShadow>
                                <boxGeometry args={[thickness, h, d]} />
                                <meshStandardMaterial color="#b0b0b0" />
                            </mesh>

                            {/* Right Wall */}
                            <mesh position={[halfW + thickness / 2, h / 2, 0]} receiveShadow castShadow>
                                <boxGeometry args={[thickness, h, d]} />
                                <meshStandardMaterial color="#b0b0b0" />
                            </mesh>



                            {/* Wall Labels (Always visible on top of wall sections) */}
                            {/* Back Wall Label */}
                            <Text
                                position={[0, h + 10, -halfD - thickness / 2]}
                                rotation={[-Math.PI / 2, 0, 0]}
                                fontSize={120}
                                color="#666666"
                                anchorX="center"
                                anchorY="middle"
                                fontWeight="bold"
                            >
                                ŚCIANA TYLNA
                            </Text>

                            {/* Left Wall Label */}
                            <Text
                                position={[-halfW - thickness / 2, h + 10, 0]}
                                rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                                fontSize={120}
                                color="#666666"
                                anchorX="center"
                                anchorY="middle"
                                fontWeight="bold"
                            >
                                ŚCIANA LEWA
                            </Text>

                            {/* Right Wall Label */}
                            <Text
                                position={[halfW + thickness / 2, h + 10, 0]}
                                rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
                                fontSize={120}
                                color="#666666"
                                anchorX="center"
                                anchorY="middle"
                                fontWeight="bold"
                            >
                                ŚCIANA PRAWA
                            </Text>

                        </>
                    );
                })()}

                {/* Grid */}
                {!isTechnicalView && (
                    <Grid
                        position={[0, 0, 0]}
                        args={[10000, 10000]}
                        cellSize={100}
                        cellColor="#444"
                        sectionSize={1000}
                        sectionColor="#666"
                        fadeDistance={10000}
                    />
                )}
            </group>

            {/* Cabinets */}
            {placedCabinets.map((cab) => (
                <DraggableCabinet
                    key={cab.uuid}
                    uuid={cab.uuid}
                    cabinet={cab.cabinet}
                    initialPosition={cab.position}
                    initialRotation={cab.rotation}
                    isSelected={selectedCabinetIds.includes(cab.uuid)}
                    onSelect={(ctrlKey) => onSelectCabinet(cab.uuid, ctrlKey)}
                    onUpdate={onUpdateCabinet}
                    roomDimensions={roomDimensions}
                    otherCabinets={placedCabinets.filter(c => c.uuid !== cab.uuid)}
                    onContextMenu={onContextMenu}
                    isLocked={cab.isLocked}
                    isPreviewMode={isPreviewMode}
                    isTechnicalView={isTechnicalView}
                    showFrontEdges={showFrontEdges}
                />
            ))}

            <Suspense fallback={null}>
                <Environment preset="city" />
            </Suspense>
        </Canvas>
    );
}
