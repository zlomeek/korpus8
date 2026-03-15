"use client";

import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useSpring, a } from "@react-spring/three";

interface Szafka3DProps {
    width: number;
    height: number;
    depth: number;
    isFullTop?: boolean;
    bodyColor?: string;
    type?: string;
    cornerOrientation?: 'left' | 'right';
    frontWidth?: number;
    fridgeSpaceHeight?: number;
    ovenSpaceHeight?: number;
    microwaveSpaceHeight?: number;
    ovenBaseHeight?: number;
    configUnder?: string[];
    configAbove?: string[];
    sinkBackRimHeight?: number;
    width2?: number;
    elements?: any[];
    isStaticPreview?: boolean;
    hasDoors?: boolean;
    renderAsGroup?: boolean;
}

// Reusable Leg Component matching the reference image
// Structure: Top Plate + Cylinder Shaft + Bottom Foot
function CabinetLeg({ position, material }: { position: [number, number, number]; material: THREE.Material }) {
    const HEIGHT = 60;
    const SHAFT_RADIUS = 12; // 24mm diameter shaft
    const CAP_RADIUS = 22;   // 44mm diameter caps
    const CAP_HEIGHT = 5;    // 5mm thick caps

    // Shaft height is total minus caps
    const SHAFT_HEIGHT = HEIGHT - (CAP_HEIGHT * 2);

    return (
        <group position={position}>
            {/* Top Plate */}
            <mesh position={[0, HEIGHT / 2 - CAP_HEIGHT / 2, 0]} castShadow receiveShadow material={material}>
                <cylinderGeometry args={[CAP_RADIUS, CAP_RADIUS, CAP_HEIGHT, 32]} />
            </mesh>

            {/* Central Shaft */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow material={material}>
                <cylinderGeometry args={[SHAFT_RADIUS, SHAFT_RADIUS, SHAFT_HEIGHT, 32]} />
            </mesh>

            {/* Bottom Foot */}
            <mesh position={[0, -HEIGHT / 2 + CAP_HEIGHT / 2, 0]} castShadow receiveShadow material={material}>
                <cylinderGeometry args={[CAP_RADIUS, CAP_RADIUS, CAP_HEIGHT, 32]} />
            </mesh>
        </group>
    );
}

// Reusable Hinge Component (Placeholder / Removed)
function CabinetHinge({ position, isRightSide }: { position: [number, number, number]; isRightSide: boolean }) {
    // Zawias usunięty zgodnie z prośbą użytkownika
    return null;
}

// Animated Drawer Component
function CabinetDrawer({
    position,
    width,
    height,
    depth,
    frontMaterials,
    children
}: {
    position: [number, number, number];
    width: number;
    height: number;
    depth: number;
    frontMaterials: THREE.Material;
    children?: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Szuflada wysuwa się na ok. 80% głębokości korpusu
    const slideOutDistance = depth * 0.8;

    const { positionZ } = useSpring({
        positionZ: isOpen ? slideOutDistance : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // --- Geometria skrzynki wewnętrznej szuflady ---
    // Materiały
    const bottomBackMaterial = React.useMemo(() => new THREE.MeshStandardMaterial({ color: "#d1d5db", roughness: 0.8 }), []); // Jasny szary (płyta)
    const sideMetalMaterial = React.useMemo(() => new THREE.MeshStandardMaterial({ color: "#9ca3af", roughness: 0.5, metalness: 0.2 }), []); // Ciemniejszy szary / metalik

    // Wymiary
    const isHighDrawer = height > 160; // Szuflady wyższe niż standardowa (zazwyczaj niska to ok 14cm = 140mm)
    const boxDepth = depth - 50; // Skrzynka odrobinę płytsza niż cały korpus
    const clearance = 15; // 15mm luzu po każdej stronie na prowadnicę
    const innerWidth = width - (clearance * 2);

    const sideBoxHeight = 90; // Dolne metalowe boki są zawsze takie same
    const backBoxHeight = isHighDrawer ? 190 : sideBoxHeight; // Stała wysokość tyłu dla wszystkich wysokich szuflad

    // Lokalizacje (front jest centrum w osi Z=0, jego tył to Z=-9)
    const boxCenterZ = -9 - (boxDepth / 2);
    // Dno przesuwamy do góry względem spodu frontu (żeby dno szuflady nie tarło o szafkę)
    const bottomFloorY = -height / 2 + 20 + 8; // dół frontu + 20mm + połowa grubości płyty 16mm (8mm)

    return (
        <group position={[position[0], position[1], 0]}>
            <a.group position-z={positionZ.to(z => position[2] + z)}>
                {/* 1. FRONT SZUFLADY */}
                <mesh
                    castShadow
                    receiveShadow
                    material={frontMaterials}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    <boxGeometry args={[width, height, 18]} />
                </mesh>

                {/* 2. SKRZYNKA WEWNĘTRZNA */}
                <group>
                    {/* Dno (Jasno szara płyta 16mm) */}
                    {/* Zaczyna się równo z tyłem frontu (-9), długość boxDepth */}
                    <mesh position={[0, bottomFloorY, boxCenterZ]} castShadow receiveShadow material={bottomBackMaterial}>
                        <boxGeometry args={[innerWidth - 26, 16, boxDepth]} /> {/* Węższe o grubości boków metalowych (2x13mm) */}
                    </mesh>

                    {/* Ścianka tylna (Jasno szara płyta 16mm) */}
                    {/* Stoi na dnie, na samym końcu boxDepth */}
                    <mesh position={[0, bottomFloorY + 8 + (backBoxHeight / 2), -9 - boxDepth + 8]} castShadow receiveShadow material={bottomBackMaterial}>
                        <boxGeometry args={[innerWidth - 26, backBoxHeight, 16]} />
                    </mesh>

                    {/* Lewy bok (Ciemnoszary / stalowy) */}
                    <mesh position={[-(innerWidth / 2) + 6.5, bottomFloorY + 8 + (sideBoxHeight / 2), boxCenterZ]} castShadow receiveShadow material={sideMetalMaterial}>
                        <boxGeometry args={[13, sideBoxHeight, boxDepth]} />
                    </mesh>

                    {/* Prawy bok (Ciemnoszary / stalowy) */}
                    <mesh position={[(innerWidth / 2) - 6.5, bottomFloorY + 8 + (sideBoxHeight / 2), boxCenterZ]} castShadow receiveShadow material={sideMetalMaterial}>
                        <boxGeometry args={[13, sideBoxHeight, boxDepth]} />
                    </mesh>

                    {/* Relingi dla wysokiej szuflady */}
                    {isHighDrawer && (
                        <>
                            {/* Lewy reling */}
                            <mesh position={[-(innerWidth / 2) + 6.5, bottomFloorY + backBoxHeight - 2, boxCenterZ]} castShadow receiveShadow material={sideMetalMaterial}>
                                <boxGeometry args={[13, 20, boxDepth]} />
                            </mesh>
                            {/* Prawy reling */}
                            <mesh position={[(innerWidth / 2) - 6.5, bottomFloorY + backBoxHeight - 2, boxCenterZ]} castShadow receiveShadow material={sideMetalMaterial}>
                                <boxGeometry args={[13, 20, boxDepth]} />
                            </mesh>
                        </>
                    )}
                </group>

                {children}
            </a.group>
        </group>
    );
}

// Animated Internal Blum Legrabox-style Drawer
function InternalBlumDrawer({
    position,
    width,
    height,
    depth,
}: {
    position: [number, number, number];
    width: number;
    height: number;
    depth: number;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const slideOutDistance = depth * 0.82;

    const { positionZ } = useSpring({
        positionZ: isOpen ? slideOutDistance : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // Materials (All White Theme)
    const frontPanelMat = React.useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), []);
    const bodyMat = React.useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), []);
    // Side rails & front horizontal rail (pure white)
    const metalDarkMat = React.useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, metalness: 0.1 }), []);
    // Endcaps (slightly grayish to stand out minimally)
    const metalMat = React.useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.7, metalness: 0.1 }), []);

    // Unused if glass removed, kept for compatibility if needed elsewhere
    const glassMat = React.useMemo(() => new THREE.MeshStandardMaterial({
        color: '#e0e8f0', roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.45
    }), []);

    // Dimensions
    const endcapW = 50;             // front endcap width (visible from front, 50mm)
    const sideThick = 13;           // side+top rail thickness (along depth)
    const clearance = 4;            // gap between inner panel and endcap (each side)
    const innerW = width - 36;      // space between cabinet sides (minus 2×18mm side panels)
    const panelW = innerW - endcapW * 2 - clearance * 2; // usable front panel width (total = innerW)
    const boxDepth = depth - 44;    // drawer box depth
    const boxW = innerW - sideThick * 2;                  // bottom/back width: spans between inner faces of side rails

    // X center of side rails — outer face aligns with outer face of endcap
    const railCenterX = panelW / 2 + clearance + endcapW - sideThick / 2;

    // Front face Y layout (bottom = Y 0, top = Y height):
    const topBarH = Math.round(height * 0.09);         // top cap bar (~9%)
    const solidH = Math.round(height * 0.50);          // solid white lower panel (50%)
    const topBarCenterY = height * 0.70 + 10;               // bar at 70% of drawer height + 10mm
    const glassH = Math.round(topBarCenterY - topBarH / 2 - solidH); // glass fills solid→bar

    const solidCenterY = solidH / 2;
    const glassCenterY = solidH + glassH / 2;

    // Side rails: lower solid panel (= solidH) + upper reling bar
    const sideRailTopY = topBarCenterY + topBarH / 2 + 30; // top edge of side reling
    const relingH = sideRailTopY - solidH;                 // height of upper reling part
    const relingCenterY = solidH + relingH / 2;            // center Y of reling
    const relingThick = 8;                                 // reling bar thickness (depth axis)

    // Z: drawer box back at Z=0, front at Z=boxDepth
    const frontFaceZ = boxDepth + 9; // front face center of 18mm front panel

    return (
        <group position={position}>
            {/* Przesunięcie o -18mm wgłąb szafki, tak by schować za 18mm frontem */}
            <a.group position-z={positionZ.to(z => -boxDepth - 18 + z)}>

                {/* === FRONT FACE (visible when door is open) === */}

                {/* Click target */}
                <mesh
                    position={[0, height / 2, frontFaceZ]}
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                >
                    <boxGeometry args={[innerW, height, 2]} />
                    <meshStandardMaterial transparent opacity={0} />
                </mesh >

                {/* Lower solid white panel */}
                < mesh position={[0, solidCenterY, frontFaceZ]} castShadow receiveShadow material={frontPanelMat} >
                    <boxGeometry args={[panelW + clearance * 2, solidH, 18]} />
                </mesh >

                {/* Front top rail (horizontal, between endcaps, lowered by 20mm, 20mm height) */}
                < mesh position={[0, sideRailTopY - 20 - 10, frontFaceZ - 1]} castShadow receiveShadow material={metalMat} >
                    <boxGeometry args={[panelW + clearance * 2, 20, 8]} />
                </mesh >

                {/* Left side endcap — full continuous height */}
                < mesh position={[-(panelW / 2) - clearance - endcapW / 2, sideRailTopY / 2, frontFaceZ - 1]} castShadow receiveShadow material={metalMat} >
                    <boxGeometry args={[endcapW, sideRailTopY, 16]} />
                </mesh >

                {/* Right side endcap — full continuous height */}
                < mesh position={[(panelW / 2) + clearance + endcapW / 2, sideRailTopY / 2, frontFaceZ - 1]} castShadow receiveShadow material={metalMat} >
                    <boxGeometry args={[endcapW, sideRailTopY, 16]} />
                </mesh >

                {/* === DRAWER BOX BODY (internal structure) === */}

                {/* Bottom plate — spans between side rails */}
                <mesh position={[0, 8, boxDepth / 2]} castShadow receiveShadow material={bodyMat}>
                    <boxGeometry args={[boxW, 16, boxDepth]} />
                </mesh>

                {/* Back plate — spans between side rails, same height as side rails */}
                <mesh position={[0, sideRailTopY / 2, 8]} castShadow receiveShadow material={bodyMat}>
                    <boxGeometry args={[boxW, sideRailTopY, 16]} />
                </mesh>

                {/* Left side rail — lower solid panel */}
                <mesh position={[-railCenterX, solidCenterY, boxDepth / 2]} castShadow receiveShadow material={metalDarkMat}>
                    <boxGeometry args={[sideThick, solidH, boxDepth]} />
                </mesh>
                {/* Left top horizontal bar — łączy przód z tyłem */}
                <mesh position={[-railCenterX, sideRailTopY - relingThick / 2, boxDepth / 2]} castShadow receiveShadow material={metalDarkMat}>
                    <boxGeometry args={[sideThick, relingThick, boxDepth]} />
                </mesh>

                {/* Right side rail — lower solid panel */}
                <mesh position={[railCenterX, solidCenterY, boxDepth / 2]} castShadow receiveShadow material={metalDarkMat}>
                    <boxGeometry args={[sideThick, solidH, boxDepth]} />
                </mesh>
                {/* Right top horizontal bar — łączy przód z tyłem */}
                <mesh position={[railCenterX, sideRailTopY - relingThick / 2, boxDepth / 2]} castShadow receiveShadow material={metalDarkMat}>
                    <boxGeometry args={[sideThick, relingThick, boxDepth]} />
                </mesh>

            </a.group >
        </group >
    );
}

// Animated Cargo Drawer Component (PEKA system)
function CabinetCargo({
    position,
    width,
    height,
    depth,
    frontMaterials,
    basketCount,
    children
}: {
    position: [number, number, number];
    width: number;
    height: number;
    depth: number;
    frontMaterials: THREE.Material;
    basketCount?: number;
    children?: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Wysuwa się na ok. 80% głębokości korpusu
    const slideOutDistance = depth * 0.8;

    const { positionZ } = useSpring({
        positionZ: isOpen ? slideOutDistance : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // --- Geometria Cargo Peka ---
    // Materiały
    const pekaMaterial = React.useMemo(() => new THREE.MeshStandardMaterial({ color: "#e5e7eb", roughness: 0.4, metalness: 0.6 }), []); // Jasny metal metallic / aluminium

    // Wymiary
    const boxDepth = depth - 50;
    const clearance = 20; // luz na prowadnice
    const innerWidth = width - (clearance * 2);

    // Lokalizacje
    const boxCenterZ = -9 - (boxDepth / 2);
    const bottomFloorY = -height / 2 + 60; // Standardowy odstęp dolny
    const topFloorY = height / 2 - 220; // Bazowe 120 od szczytu + 100 (10cm) miejsca użytkowego na przedmioty

    // Koszyk funkcja pomocnicza - zlikwidowana szpara między dnem a bocznymi siatkami
    const renderBasket = (yY: number) => {
        const floorThickness = 4;
        const wallHeight = 40;
        const wallY = yY + (floorThickness / 2) + (wallHeight / 2); // idealne spasowanie ze szczytem dna

        return (
            <group>
                {/* Dno masywne grafitowe */}
                <mesh position={[0, yY, boxCenterZ]} castShadow receiveShadow material={pekaMaterial}>
                    <boxGeometry args={[innerWidth, floorThickness, boxDepth]} />
                </mesh>
                {/* Lewy pełny bok kosza */}
                <mesh position={[-(innerWidth / 2) + 1, wallY, boxCenterZ]} castShadow receiveShadow material={pekaMaterial}>
                    <boxGeometry args={[2, wallHeight, boxDepth]} />
                </mesh>
                {/* Prawy pełny bok kosza */}
                <mesh position={[(innerWidth / 2) - 1, wallY, boxCenterZ]} castShadow receiveShadow material={pekaMaterial}>
                    <boxGeometry args={[2, wallHeight, boxDepth]} />
                </mesh>
                {/* Tył kosza */}
                <mesh position={[0, wallY, boxCenterZ - boxDepth / 2 + 1]} castShadow receiveShadow material={pekaMaterial}>
                    <boxGeometry args={[innerWidth - 4, wallHeight, 2]} />
                </mesh>
                {/* Przód kosza przylegający do frontu */}
                <mesh position={[0, wallY, boxCenterZ + boxDepth / 2 - 1]} castShadow receiveShadow material={pekaMaterial}>
                    <boxGeometry args={[innerWidth - 4, wallHeight, 2]} />
                </mesh>
            </group>
        );
    };

    return (
        <group position={[position[0], position[1], 0]}>
            <a.group position-z={positionZ.to(z => position[2] + z)}>
                {/* 1. FRONT CARGO */}
                {children ? (
                    <group onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                        {children}
                    </group>
                ) : (
                    <mesh
                        castShadow
                        receiveShadow
                        material={frontMaterials}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                    >
                        <boxGeometry args={[width, height, 18]} />
                    </mesh>
                )}

                {/* 2. STELAŻ PEKA */}
                <group>
                    {(() => {
                        const count = basketCount || 2;
                        if (count <= 1) return renderBasket(bottomFloorY);

                        const baskets = [];
                        const availableHeight = topFloorY - bottomFloorY;
                        const spacing = availableHeight / (count - 1);

                        for (let i = 0; i < count; i++) {
                            baskets.push(
                                <React.Fragment key={`basket-${i}`}>
                                    {renderBasket(bottomFloorY + spacing * i)}
                                </React.Fragment>
                            );
                        }
                        return baskets;
                    })()}
                </group>
            </a.group>
        </group>
    );
}

// Animated Door Component
function CabinetDoor({
    position,
    width,
    height,
    hingeX,
    isRightSide,
    frontMaterials,
    children
}: {
    position: [number, number, number];
    width: number;
    height: number;
    hingeX: number;
    isRightSide: boolean;
    frontMaterials: THREE.Material;
    children?: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Kąt otwarcia: ~105 stopni. Pamiętamy o kierunku obrotu.
    const openAngle = isRightSide ? Math.PI * 0.58 : -Math.PI * 0.58;

    const { rotationY } = useSpring({
        rotationY: isOpen ? openAngle : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // Ustawienie pivotu na środek bocznego profilu (X = width / 2 - 9, Z = 0), żeby otwierając się na 90 stopni,
    // krawędź frontu licowała się dokładnie z zewnętrzną krawędzią boku korpusu (bez wstawania 2cm dalej).
    const pivotX = isRightSide ? width / 2 - 9 : -(width / 2 - 9);
    const pivotZ = 0;

    return (
        <group position={position}>
            {/* Przesuwamy oś obrotu do miejsca tylnego brzegu drzwiczek (X = pivotX, Z = pivotZ) */}
            <a.group position={[pivotX, 0, pivotZ]} rotation-y={rotationY}>
                {/* Wewnątrz obróconej grupy, cofamy front na jego właściwe miejsce lokalne */}
                <group position={[-pivotX, 0, -pivotZ]}>
                    <mesh
                        castShadow
                        receiveShadow
                        material={frontMaterials}
                        onClick={(e) => {
                            e.stopPropagation(); // Blokuje kliknięcia w inne obiekty pod spodem
                            setIsOpen(!isOpen);
                        }}
                    >
                        <boxGeometry args={[width, height, 18]} />
                    </mesh>
                </group>
            </a.group>

            {/* Zawiasy osadzamy całkowicie niezależnie od rotacji frontu, przekazując im sygnał rotacji do własnej animacji */}
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    // Przekazujemy rotationY jako prop do CabinetHinge i pivot points
                    return React.cloneElement(child, { rotationY, pivotX, pivotZ } as any);
                }
                return child;
            })}
        </group>
    );
}

// Flap Component for Actuators (Siłowniki)
function CabinetFlap({
    position,
    width,
    height,
    frontMaterials,
}: {
    position: [number, number, number];
    width: number;
    height: number;
    frontMaterials: THREE.Material;
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Kąt otwarcia: 95 stopni w górę (czyli ujemny obrót wokół osi X).
    const openAngle = -Math.PI * (95 / 180);

    const { rotationX } = useSpring({
        rotationX: isOpen ? openAngle : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // Ustawienie pivotu na górną krawędź frontu
    const pivotY = height / 2 - 2;
    const pivotZ = 0;

    return (
        <group position={position}>
            {/* Przesuwamy oś obrotu do górnej krawędzi (Y = pivotY) */}
            <a.group position={[0, pivotY, pivotZ]} rotation-x={rotationX}>
                {/* Cofamy front na jego właściwe miejsce lokalne względem nowej osi */}
                <group position={[0, -pivotY, -pivotZ]}>
                    <mesh
                        castShadow
                        receiveShadow
                        material={frontMaterials}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                    >
                        <boxGeometry args={[width, height, 18]} />
                    </mesh>
                </group>
            </a.group>
        </group>
    );
}

// Bi-fold Door Component for L-shaped Corner Cabinet (Lewe skrzydło ciągnie prawe)
function LBiFoldDoor({
    leftDoor,
    rightDoor,
    width,
    width2,
    frontMaterials,
}: {
    leftDoor: any;
    rightDoor: any;
    width: number;
    width2: number;
    frontMaterials: THREE.Material;
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Główny zawias (z lewej strony, na lewym boku)
    // Lewe skrzydło jest przykrywające (wzdłuż osi Z), jego środek to:
    // Z = width2 / 2 - 2 - f.width / 2 (gdzie f.width to leftDoor.width)
    // Szerokość szafki od osi środkowej to width2/2. Skraj lewy to width2/2 - 2. Zawias jest na tym skraju.
    // X left panel: -width / 2 + 530 + 18 / 2 + 1
    const leftDoorX = -width / 2 + 530 + 18 / 2 + 1;
    const leftDoorZ = width2 / 2 - 2 - leftDoor.width / 2;

    const leftPivotX = leftDoorX;
    // Zawias głowny lewego skrzydła (przy ścianie lewej po osi Z)
    const leftPivotZ = width2 / 2 - 2;

    // Drzwi obracają się o 105 stopni.
    const { mainAngle } = useSpring({
        mainAngle: isOpen ? -Math.PI * (105 / 180) : 0, // Otwarcie do zewnątrz w lewo (105 stopni)
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // Zgodnie z wytycznymi, prawe skrzydło nie składa się względem lewego - zostaje pod kątem 90 stopni
    const { foldAngle } = useSpring({
        foldAngle: 0, // Zawsze zero, by zachować kształt "L"
        config: { mass: 1, tension: 120, friction: 20 }
    });

    return (
        <group>
            {/* Oś obrotu głównych (lewych) drzwi */}
            <a.group position={[leftPivotX, 0, leftPivotZ]} rotation-y={mainAngle}>
                {/* 1. Cofnięcie lewego skrzydła do środka (od osi obrotu) */}
                <group position={[0, 0, leftDoorZ - leftPivotZ]}>
                    <mesh
                        castShadow
                        receiveShadow
                        material={frontMaterials}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                    >
                        <boxGeometry args={[18, leftDoor.height, leftDoor.width]} />
                    </mesh>

                    {/* Środkowy (łączący) zawias między drzwiami */}
                    {/* Ten zawias znajduje się na końcu lewego skrzydła. 
                        W osi Z skrzydło ma długość leftDoor.width. 
                        Jego środek jest w Z=0 grupy, więc prawy koniec to Z = -leftDoor.width/2. */}
                    <a.group position={[18 / 2 + 9, 0, -leftDoor.width / 2]} rotation-y={foldAngle}>
                        {/* 2. Prawe skrzydło - w stanie początkowym jest prostopadłe do lewego */}
                        {/* Po zamknięciu musi znaleźć się w odpowiedniej osi na równi z korpusem */}
                        <group position={[rightDoor.width / 2 - 8, 0, -10]}>
                            <mesh
                                castShadow
                                receiveShadow
                                material={frontMaterials}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(!isOpen);
                                }}
                            >
                                <boxGeometry args={[rightDoor.width, rightDoor.height, 18]} />
                            </mesh>
                        </group>
                    </a.group>
                </group>
            </a.group>
        </group>
    );
}

// Double Door Component for L-shaped Corner (Niezależne)
function LDoubleDoor({
    f,
    width,
    width2,
    frontMaterials,
    isLeft
}: {
    f: any;
    width: number;
    width2: number;
    frontMaterials: THREE.Material;
    isLeft: boolean;
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Kąty otwarcia niezależnych drzwi (165 stopni tzn. 165/180 * PI)
    const openAngle = isLeft ? -Math.PI * (165 / 180) : Math.PI * (165 / 180);

    const { rotationY } = useSpring({
        rotationY: isOpen ? openAngle : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    if (isLeft) {
        // Lewe skrzydło
        const posX = -width / 2 + 530 + 18 / 2 + 1;
        const offsetZ = width2 / 2 - 2 - f.width / 2;
        const pivotZ = width2 / 2 - 2;

        return (
            <group>
                <a.group position={[posX, 0, pivotZ]} rotation-y={rotationY}>
                    <group position={[0, 0, offsetZ - pivotZ]}>
                        <mesh
                            castShadow
                            receiveShadow
                            material={frontMaterials}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(!isOpen);
                            }}
                        >
                            <boxGeometry args={[18, f.height, f.width]} />
                        </mesh>
                    </group>
                </a.group>
            </group>
        );
    } else {
        // Prawe skrzydło
        const posZ = -width2 / 2 + 530 + 18 / 2 + 1;
        const offsetX = width / 2 - 2 - f.width / 2;
        const pivotX = width / 2 - 2;

        return (
            <group>
                <a.group position={[pivotX, 0, posZ]} rotation-y={rotationY}>
                    <group position={[offsetX - pivotX, 0, 0]}>
                        <mesh
                            castShadow
                            receiveShadow
                            material={frontMaterials}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(!isOpen);
                            }}
                        >
                            <boxGeometry args={[f.width, f.height, 18]} />
                        </mesh>
                    </group>
                </a.group>
            </group>
        );
    }
}

// --- Komponenty drzwi dla szafki GÓRNEJ narożnej L (używają armDepth zamiast 530) ---

function GornaLDoubleDoor({
    f, width, width2, frontMaterials, isLeft, armDepth,
}: { f: any; width: number; width2: number; frontMaterials: THREE.Material; isLeft: boolean; armDepth: number; }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const openAngle = isLeft ? -Math.PI * (165 / 180) : Math.PI * (165 / 180);
    const { rotationY } = useSpring({ rotationY: isOpen ? openAngle : 0, config: { mass: 1, tension: 120, friction: 20 } });

    if (isLeft) {
        const posX = -width / 2 + armDepth + 18 / 2 + 1;
        const offsetZ = width2 / 2 - 2 - f.width / 2;
        const pivotZ = width2 / 2 - 2;
        return (
            <group>
                <a.group position={[posX, 0, pivotZ]} rotation-y={rotationY}>
                    <group position={[0, 0, offsetZ - pivotZ]}>
                        <mesh castShadow receiveShadow material={frontMaterials} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                            <boxGeometry args={[18, f.height, f.width]} />
                        </mesh>
                    </group>
                </a.group>
            </group>
        );
    } else {
        const posZ = -width2 / 2 + armDepth + 18 / 2 + 1;
        const offsetX = width / 2 - 2 - f.width / 2;
        const pivotX = width / 2 - 2;
        return (
            <group>
                <a.group position={[pivotX, 0, posZ]} rotation-y={rotationY}>
                    <group position={[offsetX - pivotX, 0, 0]}>
                        <mesh castShadow receiveShadow material={frontMaterials} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                            <boxGeometry args={[f.width, f.height, 18]} />
                        </mesh>
                    </group>
                </a.group>
            </group>
        );
    }
}

function GornaLBiFoldDoor({
    leftDoor, rightDoor, width, width2, frontMaterials, armDepth,
}: { leftDoor: any; rightDoor: any; width: number; width2: number; frontMaterials: THREE.Material; armDepth: number; }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const leftDoorX = -width / 2 + armDepth + 18 / 2 + 1;
    const leftDoorZ = width2 / 2 - 2 - leftDoor.width / 2;
    const leftPivotX = leftDoorX;
    const leftPivotZ = width2 / 2 - 2;
    const { mainAngle } = useSpring({ mainAngle: isOpen ? -Math.PI * (105 / 180) : 0, config: { mass: 1, tension: 120, friction: 20 } });
    const { foldAngle } = useSpring({ foldAngle: 0, config: { mass: 1, tension: 120, friction: 20 } });
    return (
        <group>
            <a.group position={[leftPivotX, 0, leftPivotZ]} rotation-y={mainAngle}>
                <group position={[0, 0, leftDoorZ - leftPivotZ]}>
                    <mesh castShadow receiveShadow material={frontMaterials} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                        <boxGeometry args={[18, leftDoor.height, leftDoor.width]} />
                    </mesh>
                    <a.group position={[18 / 2 + 9, 0, -leftDoor.width / 2]} rotation-y={foldAngle}>
                        <group position={[rightDoor.width / 2 - 8, 0, -10]}>
                            <mesh castShadow receiveShadow material={frontMaterials} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                                <boxGeometry args={[rightDoor.width, rightDoor.height, 18]} />
                            </mesh>
                        </group>
                    </a.group>
                </group>
            </a.group>
        </group>
    );
}

export default function Szafka3D({
    width,
    height,
    depth,
    isFullTop = false,
    type,
    cornerOrientation = 'left',
    frontWidth,
    bodyColor,
    configUnder = [],
    configAbove = [],
    ovenBaseHeight,
    ovenSpaceHeight,
    microwaveSpaceHeight,
    sinkBackRimHeight,
    fridgeSpaceHeight,
    width2,
    elements,
    isStaticPreview = false,
    hasDoors = true,
    renderAsGroup = false
}: Szafka3DProps) {
    // ... (Constants and materials remain same)

    const THICKNESS = 18;
    const GAP = 0.3; // 0.6mm global gap (0.3mm per side)
    const LEG_HEIGHT = 60; // 60mm legs

    // --- Materials ---

    // 1. Body: Warm White (User requested)
    const bodyMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: bodyColor,
                roughness: 0.5,
                metalness: 0.1,
            }),
        [bodyColor]
    );

    // 2. Wood: Natural Oak (For visible gaps and outer back)
    const woodMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#d4a373",
                roughness: 0.6,
                metalness: 0.1,
            }),
        []
    );

    // 3. Inner Back: Slightly lighter gray than body (or distinct)
    const innerBackMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#f3f4f6", // Lighter gray
                roughness: 0.5,
                metalness: 0.1,
            }),
        []
    );

    // 4. Edge Veneer:
    // - For White: Distinct Gray (#c0c0c0)
    // - For Cashmere/Anthracite: Match Body Color
    const edgeColor = useMemo(() => {
        if (bodyColor === '#d1c9bf' || bodyColor === '#383838') return bodyColor;
        return "#dcdcdc";
    }, [bodyColor]);

    const edgeMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: edgeColor,
                roughness: 0.8,
                metalness: 0.0,
            }),
        [edgeColor]
    );

    // 5. Legs: Matte Black (as per image)
    const legMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: "#202020", // Matte Black
                roughness: 0.7,   // Less shiny, more matte plastic/metal
                metalness: 0.2,
            }),
        []
    );

    // --- Material Assignments (Multi-Material Meshes) ---
    const sideMaterials = useMemo(
        () => [
            bodyMaterial, // Right
            bodyMaterial, // Left
            bodyMaterial, // Top
            bodyMaterial, // Bottom
            edgeMaterial, // Front (Veneer)
            bodyMaterial, // Back
        ],
        [bodyMaterial, edgeMaterial]
    );

    const rimMaterials = useMemo(
        () => [
            edgeMaterial, // Right
            edgeMaterial, // Left
            bodyMaterial, // Top
            bodyMaterial, // Bottom
            edgeMaterial, // Front
            bodyMaterial, // Back
        ],
        [bodyMaterial, woodMaterial, edgeMaterial]
    );

    const backPanelMaterials = useMemo(
        () => [
            woodMaterial, // Right
            woodMaterial, // Left
            woodMaterial, // Top
            woodMaterial, // Bottom
            innerBackMaterial, // Front
            woodMaterial, // Back
        ],
        [woodMaterial, innerBackMaterial, edgeMaterial]
    );

    const blendaMaterials = useMemo(
        () => [
            edgeMaterial, // Right (x+) - Narrow edge
            edgeMaterial, // Left (x-) - Narrow edge
            edgeMaterial, // Top (y+) - Narrow edge
            edgeMaterial, // Bottom (y-) - Narrow edge
            bodyMaterial, // Front (z+) - Large Face
            bodyMaterial, // Back (z-) - Large Face
        ],
        [bodyMaterial, edgeMaterial]
    );

    // 6. Front Material (Varies by user selection):
    // Fallbacks to generic semi-gloss if none specified or complex.
    const frontMaterials = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: bodyColor === '#383838' ? '#2d2d2d' : (bodyColor === '#d1c9bf' ? '#c8c0b6' : '#ffffff'), // Slightly distinct from body
            roughness: 0.3, // Glossier than body by default
            metalness: 0.05,
        });
    }, [bodyColor]);

    // Fronts mapping helper variables
    const frontMeshes = useMemo(() => {
        return (elements || []).filter(el => el.type === 'front' && el.id !== 'front-listwa-katowa');
    }, [elements]);

    // --- Geometry & Positioning ---


    const sideGeoArgs: [number, number, number] = [THICKNESS, height, depth];
    const leftSidePos: [number, number, number] = [-width / 2 + THICKNESS / 2, 0, 0];
    const rightSidePos: [number, number, number] = [width / 2 - THICKNESS / 2, 0, 0];

    const rimWidth = width - 2 * THICKNESS - 2 * GAP;

    const bottomRimDepth = Math.max(10, depth - 20);
    const bottomRimGeoArgs: [number, number, number] = [rimWidth, THICKNESS, bottomRimDepth];
    const bottomRimPos: [number, number, number] = [0, -height / 2 + THICKNESS / 2, -depth / 2 + 20 + bottomRimDepth / 2];

    // Full Top Rim
    const topRimFullGeoArgs: [number, number, number] = [rimWidth, THICKNESS, bottomRimDepth]; // Same depth as bottom (recessed for back)
    const topRimFullPos: [number, number, number] = [0, height / 2 - THICKNESS / 2, -depth / 2 + 20 + bottomRimDepth / 2];

    const topRimDepth = 100;
    const topRimGeoArgs: [number, number, number] = [rimWidth, THICKNESS, topRimDepth];
    const topRimFrontPos: [number, number, number] = [0, height / 2 - THICKNESS / 2, depth / 2 - 50];
    const topRimBackPos: [number, number, number] = [0, height / 2 - THICKNESS / 2, -depth / 2 + 70];

    const BACK_THICKNESS = 3;
    const backPanelWidth = width - 2 * THICKNESS - 2 * GAP;
    const backPanelGeoArgs: [number, number, number] = [backPanelWidth, height - 2 * GAP, BACK_THICKNESS];
    const backPanelPos: [number, number, number] = [0, 0, -depth / 2 + 20 - BACK_THICKNESS / 2];

    // Leg Positioning Logic
    // User Request:
    // - < 240mm: 2 Legs (Center)
    // - >= 240mm && < 851mm: 4 Legs (Corners)
    // - >= 851mm: 6 Legs (Corners + Center)
    // Offsets: Side 30mm, Front/Back 50mm.

    const LEG_RADIUS = 22;
    const DIST_SIDE = 30;
    const DIST_FRONT_BACK = 50;

    const legY = -height / 2 - LEG_HEIGHT / 2;

    // Z Positions (Common for all)
    const legZ_Front = depth / 2 - DIST_FRONT_BACK - LEG_RADIUS;
    const legZ_Back = -depth / 2 + DIST_FRONT_BACK + LEG_RADIUS;

    // Leg Array
    const legs = [];

    if (width < 240) {
        // 2 Legs (Centered X)
        legs.push(
            [0, legY, legZ_Front], // Front Center
            [0, legY, legZ_Back]   // Back Center
        );
    } else {
        // Corner Legs positions
        const legX = width / 2 - DIST_SIDE - LEG_RADIUS;

        // Add 4 Corners
        legs.push(
            [-legX, legY, legZ_Front], // Front Left
            [legX, legY, legZ_Front],  // Front Right
            [-legX, legY, legZ_Back],  // Back Left
            [legX, legY, legZ_Back]    // Back Right
        );

        // Add Middle Legs if Width >= 851mm
        if (width >= 851) {
            legs.push(
                [0, legY, legZ_Front], // Front Center
                [0, legY, legZ_Back]   // Back Center
            );
        }
    }

    if (type === 'dolna-narozna-90') {
        const leftDepth = 530;
        const backDepth = 530;

        // CNC cut from square, so the rims go all the way to 530 depth.
        const rimLeftDepth = leftDepth; // 530
        const rimBackDepth = backDepth; // 530

        const w2 = width2 || (type?.includes('gorna') ? 650 : 900);
        const cabinetGroup90Dolna = (
            <group position={[0, LEG_HEIGHT / 2, 0]}>
                {/* Bok Prawy (Back arm, right end. Parallel to YZ plane) */}
                <mesh position={[width / 2 - THICKNESS / 2, 0, -w2 / 2 + backDepth / 2]} castShadow receiveShadow material={sideMaterials}>
                    <boxGeometry args={[THICKNESS, height, backDepth]} />
                </mesh>

                {/* Bok Lewy (Left arm, front end. Parallel to XY plane) */}
                <mesh position={[-width / 2 + leftDepth / 2, 0, w2 / 2 - THICKNESS / 2]} castShadow receiveShadow material={sideMaterials}>
                    <boxGeometry args={[leftDepth, height, THICKNESS]} />
                </mesh>

                {/* Wieniec Dolny L-shape (skrócony z lewej o 20mm na wpuszczane plecy 3mm) */}
                <mesh position={[-THICKNESS / 2 + 10, -height / 2 + THICKNESS / 2, -w2 / 2 + 18 + (rimBackDepth - 18) / 2]} castShadow receiveShadow material={rimMaterials}>
                    <boxGeometry args={[width - THICKNESS - 20, THICKNESS, rimBackDepth - 18]} />
                </mesh>
                {/* Prawa część L-kształtnego wieńca dolnego skrócona z lewej o 20mm */}
                <mesh position={[-width / 2 + 10 + rimLeftDepth / 2, -height / 2 + THICKNESS / 2, -w2 / 2 + rimBackDepth + (w2 - rimBackDepth - THICKNESS) / 2]} castShadow receiveShadow material={rimMaterials}>
                    <boxGeometry args={[rimLeftDepth - 20, THICKNESS, w2 - rimBackDepth - THICKNESS]} />
                </mesh>

                {/* Wieniec Górny L-shape (skrócony z lewej o 20mm na wpuszczane plecy 3mm) */}
                <mesh position={[-THICKNESS / 2 + 10, height / 2 - THICKNESS / 2, -w2 / 2 + 18 + (rimBackDepth - 18) / 2]} castShadow receiveShadow material={rimMaterials}>
                    <boxGeometry args={[width - THICKNESS - 20, THICKNESS, rimBackDepth - 18]} />
                </mesh>
                {/* Prawa część L-kształtnego wieńca górnego skrócona z lewej o 20mm */}
                <mesh position={[-width / 2 + 10 + rimLeftDepth / 2, height / 2 - THICKNESS / 2, -w2 / 2 + rimBackDepth + (w2 - rimBackDepth - THICKNESS) / 2]} castShadow receiveShadow material={rimMaterials}>
                    <boxGeometry args={[rimLeftDepth - 20, THICKNESS, w2 - rimBackDepth - THICKNESS]} />
                </mesh>

                {/* Plecy L-shape wpuszczane oraz lewe 18mm */}
                <mesh position={[-THICKNESS / 2, 0, -w2 / 2 + 9]} castShadow receiveShadow material={sideMaterials}>
                    <boxGeometry args={[width - THICKNESS, height - 2 * GAP, 18]} />
                </mesh>
                {/* Right back panel 3mm - Wpuszczane.*/}
                <mesh position={[-width / 2 + 20 - 1.5, 0, (18 - THICKNESS) / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow material={backPanelMaterials}>
                    <boxGeometry args={[w2 - 18 - THICKNESS, height - 2 * GAP, 3]} />
                </mesh>

                {/* Półki L-shape */}
                {(() => {
                    const lShelves = (elements || []).filter(e => e.type === 'polka');
                    if (lShelves.length === 0) return null;

                    const internalHeight = height - THICKNESS * 2;
                    const spacing = internalHeight / (lShelves.length + 1);
                    const startY = -height / 2 + THICKNESS;

                    return lShelves.map((shelf, i) => {
                        const yPos = startY + spacing * (i + 1);
                        const bW = (width - THICKNESS - 20);
                        const bD = (rimBackDepth - 18);
                        const bX = (-THICKNESS / 2 + 10);
                        const bZ = (-w2 / 2 + 18 + (rimBackDepth - 18) / 2);
                        const lW = (rimLeftDepth - 20);
                        const overlap = 50;
                        const lD = (w2 - rimBackDepth - THICKNESS) + overlap;
                        const lX = (-width / 2 + 10 + rimLeftDepth / 2);
                        const lZ = (-w2 / 2 + rimBackDepth + (w2 - rimBackDepth - THICKNESS) / 2) - overlap / 2;

                        return (
                            <React.Fragment key={shelf.id}>
                                <mesh position={[bX, yPos, bZ]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[bW, THICKNESS, bD]} />
                                </mesh>
                                <mesh position={[lX, yPos, lZ]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[lW, THICKNESS, lD]} />
                                </mesh>
                            </React.Fragment>
                        );
                    });
                })()}

                {/* Fronty L-Kształtne */}
                {(() => {
                    if (!frontMeshes || frontMeshes.length === 0) return null;
                    const isBiFold = frontMeshes.some(f => f.name.includes('łamany'));
                    const isDouble = frontMeshes.some(f => f.name.includes('L-kształtny'));

                    if (isBiFold) {
                        const leftDoor = frontMeshes.find(f => f.name.includes('(lewy)'));
                        const rightDoor = frontMeshes.find(f => f.name.includes('(prawy)'));
                        if (leftDoor && rightDoor) return <LBiFoldDoor key="bifold" leftDoor={leftDoor} rightDoor={rightDoor} width={width} width2={w2} frontMaterials={frontMaterials} />;
                    } else if (isDouble) {
                        return frontMeshes.map((f, i) => {
                            if (f.name.includes('(lewy)')) return <LDoubleDoor key={`front-${i}`} f={f} width={width} width2={w2} frontMaterials={frontMaterials} isLeft={true} />;
                            if (f.name.includes('(prawy)')) return <LDoubleDoor key={`front-${i}`} f={f} width={width} width2={w2} frontMaterials={frontMaterials} isLeft={false} />;
                            return null;
                        });
                    }
                    return null;
                })()}

                {/* Nogi */}
                <CabinetLeg position={[-width / 2 + 50, legY, -w2 / 2 + 50]} material={legMaterial} />
                <CabinetLeg position={[width / 2 - 50, legY, -w2 / 2 + 50]} material={legMaterial} />
                <CabinetLeg position={[width / 2 - 50, legY, -w2 / 2 + backDepth - 50]} material={legMaterial} />
                <CabinetLeg position={[-width / 2 + leftDepth - 50, legY, -w2 / 2 + backDepth - 50]} material={legMaterial} />
                <CabinetLeg position={[-width / 2 + leftDepth - 50, legY, w2 / 2 - 50]} material={legMaterial} />
                <CabinetLeg position={[-width / 2 + 50, legY, w2 / 2 - 50]} material={legMaterial} />
                <CabinetLeg position={[-width / 2 + leftDepth - 50, legY, -w2 / 2 + 50]} material={legMaterial} />
                <CabinetLeg position={[-width / 2 + 50, legY, -w2 / 2 + backDepth - 50]} material={legMaterial} />
            </group>
        );

        if (renderAsGroup) return cabinetGroup90Dolna;

        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    minHeight: isStaticPreview ? "220px" : "400px",
                    background: "#f5f5f5",
                    borderRadius: "8px",
                    overflow: "hidden",
                    cursor: isStaticPreview ? "default" : "grab"
                }}
            >
                <Canvas
                    shadows
                    camera={{
                        fov: 50,
                        near: 1,
                        far: 20000,
                        position: [width * 2, height * 2 + LEG_HEIGHT, w2 * 2],
                    }}
                >
                    <OrbitControls
                        makeDefault
                        minPolarAngle={0}
                        maxPolarAngle={Math.PI / 1.5}
                        enableZoom={!isStaticPreview}
                        enablePan={!isStaticPreview}
                        enableRotate={!isStaticPreview}
                    />

                    <ambientLight intensity={1.0} />
                    <directionalLight
                        position={[500, 3000, 1000]}
                        intensity={2.8}
                        castShadow
                        shadow-mapSize={[4096, 4096]}
                        shadow-bias={-0.00005}
                    />
                    <directionalLight position={[-500, 1000, -500]} intensity={1.2} />

                    {cabinetGroup90Dolna}
                </Canvas>
            </div>
        );
    }


    if (type === 'gorna-narozna-90') {
        const armDepth = depth; // 330mm locked
        const rimArmDepth = armDepth;
        const w2 = width2 || (type?.includes('gorna') ? 650 : 900);

        const cabinetGroup90 = (
            <group position={[0, 0, 0]}>
                <mesh position={[width / 2 - THICKNESS / 2, 0, -w2 / 2 + armDepth / 2]} castShadow receiveShadow material={sideMaterials}>
                    <boxGeometry args={[THICKNESS, height, armDepth]} />
                </mesh>
                <mesh position={[-width / 2 + armDepth / 2, 0, w2 / 2 - THICKNESS / 2]} castShadow receiveShadow material={sideMaterials}>
                    <boxGeometry args={[armDepth, height, THICKNESS]} />
                </mesh>
                <mesh position={[-THICKNESS / 2 + 10, -height / 2 + THICKNESS / 2, -w2 / 2 + 18 + (rimArmDepth - 18) / 2]} castShadow receiveShadow material={rimMaterials}>
                    <boxGeometry args={[width - THICKNESS - 20, THICKNESS, rimArmDepth - 18]} />
                </mesh>
                <mesh position={[-width / 2 + 10 + rimArmDepth / 2, -height / 2 + THICKNESS / 2, -w2 / 2 + rimArmDepth + (w2 - rimArmDepth - THICKNESS) / 2]} castShadow receiveShadow material={rimMaterials}>
                    <boxGeometry args={[rimArmDepth - 20, THICKNESS, w2 - rimArmDepth - THICKNESS]} />
                </mesh>
                <mesh position={[-THICKNESS / 2 + 10, height / 2 - THICKNESS / 2, -w2 / 2 + 18 + (rimArmDepth - 18) / 2]} castShadow receiveShadow material={rimMaterials}>
                    <boxGeometry args={[width - THICKNESS - 20, THICKNESS, rimArmDepth - 18]} />
                </mesh>
                <mesh position={[-width / 2 + 10 + rimArmDepth / 2, height / 2 - THICKNESS / 2, -w2 / 2 + rimArmDepth + (w2 - rimArmDepth - THICKNESS) / 2]} castShadow receiveShadow material={rimMaterials}>
                    <boxGeometry args={[rimArmDepth - 20, THICKNESS, w2 - rimArmDepth - THICKNESS]} />
                </mesh>
                <mesh position={[-THICKNESS / 2, 0, -w2 / 2 + 9]} castShadow receiveShadow material={sideMaterials}>
                    <boxGeometry args={[width - THICKNESS, height - 2 * GAP, 18]} />
                </mesh>
                <mesh position={[-width / 2 + 20 - 1.5, 0, (18 - THICKNESS) / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow material={backPanelMaterials}>
                    <boxGeometry args={[w2 - 18 - THICKNESS, height - 2 * GAP, 3]} />
                </mesh>
                {
                    (() => {
                        const lShelves = (elements || []).filter(e => e.type === 'polka');
                        if (lShelves.length === 0) return null;
                        const internalHeight = height - THICKNESS * 2;
                        const spacing = internalHeight / (lShelves.length + 1);
                        const startY = -height / 2 + THICKNESS;
                        return lShelves.map((shelf, i) => {
                            const yPos = startY + spacing * (i + 1);
                            const bW = width - THICKNESS - 20;
                            const bD = rimArmDepth - 18;
                            const bX = -THICKNESS / 2 + 10;
                            const bZ = -w2 / 2 + 18 + (rimArmDepth - 18) / 2;
                            const lW = rimArmDepth - 20;
                            const overlap = 50;
                            const lD = (w2 - rimArmDepth - THICKNESS) + overlap;
                            const lX = -width / 2 + 10 + rimArmDepth / 2;
                            const lZ = (-w2 / 2 + rimArmDepth + (w2 - rimArmDepth - THICKNESS) / 2) - overlap / 2;
                            return (
                                <React.Fragment key={shelf.id}>
                                    <mesh position={[bX, yPos, bZ]} castShadow receiveShadow material={rimMaterials}><boxGeometry args={[bW, THICKNESS, bD]} /></mesh>
                                    <mesh position={[lX, yPos, lZ]} castShadow receiveShadow material={rimMaterials}><boxGeometry args={[lW, THICKNESS, lD]} /></mesh>
                                </React.Fragment>
                            );
                        });
                    })()
                }
                {
                    (() => {
                        if (!frontMeshes || frontMeshes.length === 0) return null;
                        const isBiFold = frontMeshes.some(f => f.name.includes('łamany'));
                        if (isBiFold) {
                            const lDoor = frontMeshes.find(f => f.name.includes('(lewy)'));
                            const rDoor = frontMeshes.find(f => f.name.includes('(prawy)'));
                            if (lDoor && rDoor) return <GornaLBiFoldDoor key="bifold" leftDoor={lDoor} rightDoor={rDoor} width={width} width2={w2} frontMaterials={frontMaterials} armDepth={armDepth} />;
                        } else {
                            return frontMeshes.map((f, i) => {
                                if (f.name.includes('(lewy)')) return <GornaLDoubleDoor key={`front-${i}`} f={f} width={width} width2={w2} frontMaterials={frontMaterials} isLeft={true} armDepth={armDepth} />;
                                if (f.name.includes('(prawy)')) return <GornaLDoubleDoor key={`front-${i}`} f={f} width={width} width2={w2} frontMaterials={frontMaterials} isLeft={false} armDepth={armDepth} />;
                                return null;
                            });
                        }
                        return null;
                    })()
                }

            </group>
        );

        if (renderAsGroup) return cabinetGroup90;

        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    minHeight: isStaticPreview ? "220px" : "400px",
                    background: "#f5f5f5",
                    borderRadius: "8px",
                    overflow: "hidden",
                    cursor: isStaticPreview ? "default" : "grab"
                }}
            >
                <Canvas
                    shadows
                    camera={{
                        fov: 50,
                        near: 1,
                        far: 20000,
                        position: [width * 2, height * 2, w2 * 2],
                    }}
                >
                    <OrbitControls
                        makeDefault
                        minPolarAngle={0}
                        maxPolarAngle={Math.PI / 1.5}
                        enableZoom={!isStaticPreview}
                        enablePan={!isStaticPreview}
                        enableRotate={!isStaticPreview}
                    />
                    <ambientLight intensity={1.0} />
                    <directionalLight position={[500, 3000, 1000]} intensity={2.8} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.00005} />
                    <directionalLight position={[-500, 1000, -500]} intensity={1.2} />

                    {cabinetGroup90}
                </Canvas>
            </div>
        );
    }

    const mainLegHeight = LEG_HEIGHT;

    const mainCabinetGroup = (
        <group position={[0, mainLegHeight / 2, 0]}>
            {/* Sides */}
            <mesh position={leftSidePos} castShadow receiveShadow material={sideMaterials}>
                <boxGeometry args={sideGeoArgs} />
            </mesh>
            <mesh position={rightSidePos} castShadow receiveShadow material={sideMaterials}>
                <boxGeometry args={sideGeoArgs} />
            </mesh>

            {/* Bottom Rim */}
            <mesh position={bottomRimPos} castShadow receiveShadow material={rimMaterials}>
                <boxGeometry args={bottomRimGeoArgs} />
            </mesh>

            {type === 'dolna-zlew' ? (
                <>
                    {/* SINK CABINET SPECIFIC */}
                    {/* 1. Front Vertical Rim (Flush with front) */}
                    <mesh
                        position={[0, height / 2 - 100 / 2, depth / 2 - THICKNESS / 2]}
                        castShadow
                        receiveShadow
                        material={rimMaterials}
                    >
                        <boxGeometry args={[rimWidth, 100, THICKNESS]} />
                    </mesh>

                    {/* 2. Rear Vertical Rim (Fixed at the top, recessed 18mm) */}
                    <mesh
                        position={[0, height / 2 - 100 / 2, -depth / 2 + 18 + THICKNESS / 2]}
                        castShadow
                        receiveShadow
                        material={rimMaterials}
                    >
                        <boxGeometry args={[rimWidth, 100, THICKNESS]} />
                    </mesh>

                    {/* 3. Low Back (18mm, H=150) */}
                    {/* Starts on top of bottom rim? Let's check bottom rim pos. Bottom rim is at Y = -height/2 + THICKNESS/2. */}
                    {/* So top of bottom rim is -height/2 + THICKNESS. */}
                    {/* Back center Y = -height/2 + THICKNESS + 150/2. */}
                    <mesh
                        position={[0, -height / 2 + THICKNESS + 150 / 2, -depth / 2 + 18 + THICKNESS / 2]}
                        castShadow
                        receiveShadow
                        material={sideMaterials} // Using side/body material for 18mm back
                    >
                        <boxGeometry args={[backPanelWidth, 150, THICKNESS]} />
                    </mesh>
                </>
            ) : type?.startsWith('dolna-lodowka') ? (
                <>
                    {/* FRIDGE CABINET SPECIFIC */}

                    {/* Middle Rim Y Calculation */}
                    {(() => {
                        const fHeight = fridgeSpaceHeight || 1780;
                        let shiftUp = 0;
                        if (type?.startsWith('dolna-lodowka')) {
                            shiftUp = ovenBaseHeight === 760 ? 40 : (ovenBaseHeight === 780 ? 60 : 0);
                        }

                        const middleRimY = -height / 2 + THICKNESS + fHeight + THICKNESS / 2 + shiftUp;

                        // Back Panel Logic
                        // Height = Clear Space + 32mm
                        const rawSpaceH = (height / 2 - THICKNESS) - (middleRimY + THICKNESS / 2);
                        const backPanelH = rawSpaceH + 32;
                        // Center Y remains center of the clear space to ensure symmetrical overlap
                        const backPanelTopY = (height / 2 - THICKNESS) - rawSpaceH / 2;

                        return (
                            <>
                                {/* 1. Middle Rim */}
                                <mesh position={[0, middleRimY, -depth / 2 + 20 + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[rimWidth, THICKNESS, bottomRimDepth]} />
                                </mesh>

                                {/* 1.5 Extra Bottom Rim (if 760 or 780, only for original fridge cabinet) */}
                                {type === 'dolna-lodowka' && (ovenBaseHeight === 760 || ovenBaseHeight === 780) && (
                                    <>
                                        <mesh
                                            position={[0, -height / 2 + (ovenBaseHeight === 760 ? 60 : 80) - THICKNESS / 2, bottomRimPos[2]]}
                                            castShadow
                                            receiveShadow
                                            material={rimMaterials}
                                        >
                                            <boxGeometry args={[rimWidth, THICKNESS, bottomRimDepth]} />
                                        </mesh>

                                        {/* Back panel in the gap */}
                                        <mesh
                                            position={[
                                                0,
                                                -height / 2 + (ovenBaseHeight === 760 ? 30 : 40), // Center Y
                                                backPanelPos[2] // Same Z as the main back panel
                                            ]}
                                            castShadow
                                            receiveShadow
                                            material={backPanelMaterials}
                                        >
                                            <boxGeometry args={[backPanelWidth, ovenBaseHeight === 760 ? 56 : 76, 3]} />
                                        </mesh>
                                    </>
                                )}

                                {/* 2. Top Rims (Standard or Full) */}
                                {isFullTop ? (
                                    <mesh position={topRimFullPos} castShadow receiveShadow material={rimMaterials}>
                                        <boxGeometry args={topRimFullGeoArgs} />
                                    </mesh>
                                ) : (
                                    <>
                                        <mesh position={topRimFrontPos} castShadow receiveShadow material={rimMaterials}>
                                            <boxGeometry args={topRimGeoArgs} />
                                        </mesh>
                                        <mesh position={topRimBackPos} castShadow receiveShadow material={rimMaterials}>
                                            <boxGeometry args={topRimGeoArgs} />
                                        </mesh>
                                    </>
                                )}



                                {/* 4. Back Panel */}
                                {(type === 'dolna-lodowka-2' || type === 'dolna-lodowka-3' || type === 'dolna-lodowka-4') ? (
                                    // Pełne plecy od góry do dołu
                                    <mesh position={[0, 0, backPanelPos[2]]} castShadow receiveShadow material={backPanelMaterials}>
                                        <boxGeometry args={[backPanelWidth, height - 4, 3]} />
                                    </mesh>
                                ) : (
                                    // Oryginalna lodówka — plecy tylko w górnej sekcji
                                    rawSpaceH > 0 && (
                                        <mesh position={[0, backPanelTopY, backPanelPos[2]]} castShadow receiveShadow material={backPanelMaterials}>
                                            <boxGeometry args={[backPanelWidth, backPanelH, 3]} />
                                        </mesh>
                                    )
                                )}
                            </>
                        );
                    })()}
                </>
            ) : type === 'dolna-piekarnik' ? (
                <>
                    {(() => {
                        // Specs:
                        const isLoweredOven = configUnder.includes('Obniżenie piekarnika o 1 szufladę (14 cm)');
                        const bottomSpaceHeight = isLoweredOven ? ((ovenBaseHeight || 720) - 140) : (ovenBaseHeight || 720);
                        const ovenH = ovenSpaceHeight || 590;
                        const microwaveH = microwaveSpaceHeight || 380;

                        // Local Definitions
                        const frontZ = depth / 2 + 9;
                        const frontMaterials = bodyMaterial;
                        const bottomRimY = bottomRimPos[1];

                        // Rim Under Oven
                        // 720mm from bottom
                        const rimUnderY = -height / 2 + bottomSpaceHeight - THICKNESS / 2;

                        // Rim Above Oven (Under Microwave)
                        const rimAboveOvenY = (rimUnderY + THICKNESS / 2) + ovenH + THICKNESS / 2;

                        // Rim Above Microwave
                        const rimAboveMicrowaveY = (rimAboveOvenY + THICKNESS / 2) + microwaveH + THICKNESS / 2;

                        // CONFIGURATION VISUALIZATION - DISABLED AS PER USER REQUEST
                        const renderConfigUnder = () => {
                            return null;
                        };

                        const renderConfigAbove = () => {
                            return null;
                        };

                        return (
                            <>
                                {/* Rims */}
                                <mesh position={[0, rimUnderY, -depth / 2 + 20 + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[rimWidth, THICKNESS, bottomRimDepth]} />
                                </mesh>
                                <mesh position={[0, rimAboveOvenY, -depth / 2 + 20 + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[rimWidth, THICKNESS, bottomRimDepth]} />
                                </mesh>
                                <mesh position={[0, rimAboveMicrowaveY, -depth / 2 + 20 + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[rimWidth, THICKNESS, bottomRimDepth]} />
                                </mesh>

                                {/* Top Rims (Standard or Full) */}
                                {isFullTop ? (
                                    <mesh position={topRimFullPos} castShadow receiveShadow material={rimMaterials}>
                                        <boxGeometry args={topRimFullGeoArgs} />
                                    </mesh>
                                ) : (
                                    <>
                                        <mesh position={topRimFrontPos} castShadow receiveShadow material={rimMaterials}>
                                            <boxGeometry args={topRimGeoArgs} />
                                        </mesh>
                                        <mesh position={topRimBackPos} castShadow receiveShadow material={rimMaterials}>
                                            <boxGeometry args={topRimGeoArgs} />
                                        </mesh>
                                    </>
                                )}

                                {/* Standard Top/Bottom Rims and Back must be rendered manually or use standard else?
                                            We are inside ternary "dolna-piekarnik" ? ( ... )
                                            So we must render everything.
                                        */}

                                {/* Bottom Rim (Standard) */}
                                <mesh position={[0, bottomRimY, -depth / 2 + 20 + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[rimWidth, THICKNESS, bottomRimDepth]} />
                                </mesh>

                                {/* Top Rims (Standard or Full) */}
                                {isFullTop ? (
                                    <mesh position={topRimFullPos} castShadow receiveShadow material={rimMaterials}>
                                        <boxGeometry args={topRimFullGeoArgs} />
                                    </mesh>
                                ) : (
                                    <>
                                        <mesh position={topRimFrontPos} castShadow receiveShadow material={rimMaterials}>
                                            <boxGeometry args={topRimGeoArgs} />
                                        </mesh>
                                        <mesh position={topRimBackPos} castShadow receiveShadow material={rimMaterials}>
                                            <boxGeometry args={topRimGeoArgs} />
                                        </mesh>
                                    </>
                                )}

                                {/* Back Panels - Split */}
                                {/* Bottom Back Panel */}
                                {/* Niche Height: 720. Panel Height: 720 - 4. Center: Middle of 720. */}
                                <mesh
                                    position={[0, -height / 2 + bottomSpaceHeight / 2, -depth / 2 + 17 + 1.5]}
                                    castShadow
                                    receiveShadow
                                    material={backPanelMaterials}
                                >
                                    <boxGeometry args={[width - 4, bottomSpaceHeight - 4, 3]} />
                                </mesh>

                                {/* Top Back Panel */}
                                {(() => {
                                    const topStart = bottomSpaceHeight + ovenH + THICKNESS + microwaveH;
                                    const topH = height - topStart;
                                    const topCenterY = -height / 2 + topStart + topH / 2;

                                    if (topH > 0) {
                                        return (
                                            <mesh
                                                position={[0, topCenterY, -depth / 2 + 17 + 1.5]}
                                                castShadow
                                                receiveShadow
                                                material={backPanelMaterials}
                                            >
                                                <boxGeometry args={[width - 4, topH - 4, 3]} />
                                            </mesh>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Configurations */}
                                {renderConfigUnder()}
                                {renderConfigAbove()}
                            </>
                        );
                    })()}
                </>
            ) : (
                <>
                    {/* Top Rim(s) Standard */}
                    {isFullTop ? (
                        <mesh position={topRimFullPos} castShadow receiveShadow material={rimMaterials}>
                            <boxGeometry args={topRimFullGeoArgs} />
                        </mesh>
                    ) : (
                        <>
                            <mesh position={topRimFrontPos} castShadow receiveShadow material={rimMaterials}>
                                <boxGeometry args={topRimGeoArgs} />
                            </mesh>
                            <mesh position={topRimBackPos} castShadow receiveShadow material={rimMaterials}>
                                <boxGeometry args={topRimGeoArgs} />
                            </mesh>
                        </>
                    )}

                    {/* Standard Back Panel */}
                    <mesh position={backPanelPos} castShadow receiveShadow material={backPanelMaterials}>
                        <boxGeometry args={backPanelGeoArgs} />
                    </mesh>
                </>
            )}

            {(type === 'dolna-narozna' || type === 'gorna-narozna' || type === 'gorna-narozna-gleboka') && (() => {
                const blendaWidth = type === 'gorna-narozna' ? 350 : (type === 'gorna-narozna-gleboka' ? 580 : 520);
                return (
                    /* BLIND CORNER PANEL (Blenda) */
                    /* Right Blind: Blenda on Right. Left Blind: Blenda on Left. */
                    /* Door Opening usually 600 or frontWidth. BlendaWidth = 520. */
                    <mesh
                        position={[
                            cornerOrientation === 'left'
                                ? (-width / 2) + (blendaWidth / 2) // Left aligned
                                : (width / 2) - (blendaWidth / 2), // Right aligned
                            0, // Centered vertically
                            // Głębokość wyrównana z grupą frontów (depth / 2 + 18 / 2 + 1)
                            depth / 2 + THICKNESS / 2 + 1
                        ]}
                        castShadow
                        receiveShadow
                        material={blendaMaterials}
                    >
                        {/* Width: 520. Height: CabinetHeight. Depth: 18. */}
                        <boxGeometry args={[blendaWidth, height, THICKNESS]} />
                    </mesh>
                )
            })()}

            {/* PÓŁKI (Uniwersalne) */}
            {(() => {
                if (!elements) return null;
                const shelvesList = (elements || []).filter(e => e.type === 'polka');
                if (shelvesList.length === 0) return null;

                const renderShelvesForGroup = (groupShelves: any[], availableHeight: number, startY: number) => {
                    if (groupShelves.length === 0) return null;
                    const count = groupShelves.length;
                    const spacing = availableHeight / (count + 1);

                    return groupShelves.map((shelf, i) => {
                        const yPos = startY + spacing * (i + 1);
                        const shelfZ = -depth / 2 + 20 + shelf.depth / 2; // Anchored to back panel to leave gap at front

                        let shelfX = 0;
                        if (type === 'dolna-narozna' || type === 'gorna-narozna-gleboka') {
                            shelfX = 0; // Teraz półka idzie po całości, więc jest na środku
                        }

                        return (
                            <mesh key={shelf.id} position={[shelfX, yPos, shelfZ]} castShadow receiveShadow material={rimMaterials}>
                                <boxGeometry args={[shelf.width, THICKNESS, shelf.depth]} />
                            </mesh>
                        );
                    });
                };

                const topShelves = shelvesList.filter(s => s.id.includes('-gora'));
                const bottomShelves = shelvesList.filter(s => s.id.includes('-dol'));
                const generalShelves = shelvesList.filter(s => !s.id.includes('-gora') && !s.id.includes('-dol'));

                if (type === 'dolna-piekarnik') {
                    const isLoweredOven = configUnder?.includes('Obniżenie piekarnika o 1 szufladę (14 cm)');
                    const bottomSpaceHeight = isLoweredOven ? ((ovenBaseHeight || 720) - 140) : (ovenBaseHeight || 720);

                    const ovenH = ovenSpaceHeight || 590;
                    const microH = microwaveSpaceHeight || 380;

                    const topStartDistance = bottomSpaceHeight + ovenH + THICKNESS + microH + THICKNESS;
                    const topStartY = -height / 2 + topStartDistance;
                    const topH = height - topStartDistance - THICKNESS; // Środek użytkowej wnęki (minus górny wieniec)

                    const bottomH = bottomSpaceHeight;
                    const bottomStartY = -height / 2;

                    return (
                        <>
                            {renderShelvesForGroup(topShelves, topH, topStartY)}
                            {renderShelvesForGroup(bottomShelves, bottomH, bottomStartY)}
                        </>
                    );
                } else if (type?.startsWith('dolna-lodowka')) {
                    const fHeight = fridgeSpaceHeight || 1780;
                    let shiftUp = 0;
                    if (type?.startsWith('dolna-lodowka')) {
                        shiftUp = ovenBaseHeight === 760 ? 40 : (ovenBaseHeight === 780 ? 60 : 0);
                    }
                    const middleRimY = -height / 2 + THICKNESS + fHeight + THICKNESS / 2 + shiftUp;

                    const bottomH = middleRimY - THICKNESS / 2 - (-height / 2 + THICKNESS);
                    const bottomStartY = -height / 2 + THICKNESS;

                    const topStartY = middleRimY + THICKNESS / 2;
                    const topH = (height / 2 - THICKNESS) - topStartY;

                    return (
                        <>
                            {renderShelvesForGroup(topShelves, topH, topStartY)}
                            {renderShelvesForGroup(bottomShelves, bottomH, bottomStartY)}
                            {renderShelvesForGroup(generalShelves, height - THICKNESS * 2, -height / 2 + THICKNESS)}
                        </>
                    );
                } else {
                    const internalH = height - (isFullTop ? THICKNESS * 2 : THICKNESS * 2);
                    const startY = -height / 2 + THICKNESS;

                    return renderShelvesForGroup(generalShelves, internalH, startY);
                }
            })()}

            {/* Wewnętrzne szuflady Blum dla słupka z szufladami wewnętrznymi (pojawiają się z frontami) */}
            {type === 'dolna-lodowka-3' && hasDoors && (() => {
                const drawerH = 170;
                const RIM = 18;
                
                // Obliczamy dostępną wysokość dla sekcji szuflad (dół pod lodówką)
                // fHeight to wysokość niszy na lodówkę (standardowo ok. 1780)
                const fHeight = fridgeSpaceHeight || 1780;
                const shiftUp = ovenBaseHeight === 760 ? 40 : (ovenBaseHeight === 780 ? 60 : 0);
                
                // Wysokość do spodu wieńca środkowego: (RIM + fHeight + shiftUp)
                // Dostępna przestrzeń od wieńca dolnego: (RIM + fHeight + shiftUp) - RIM = fHeight + shiftUp
                const availableH = fHeight + shiftUp;
                
                // Rozmieszczamy 5 szuflad: pierwsza na dole, ostatnia pod samym wieńcem (z marginesem 100mm na górną szufladę/wieniec)
                // Odstęp (step) = (Dostępna wysokość - wysokość jednej szuflady - margines górny) / 4
                const topMargin = 100;
                const step = (availableH - drawerH - topMargin) / 4;

                return Array.from({ length: 5 }).map((_, i) => {
                    const yBottom = -height / 2 + RIM + i * step;
                    return (
                        <InternalBlumDrawer
                            key={`idr-${i}`}
                            position={[0, yBottom, depth / 2]}
                            width={width}
                            height={drawerH}
                            depth={depth}
                        />
                    );
                });
            })()}
            {frontMeshes.length > 0 && (() => {
                const cargoFronts = frontMeshes.filter(f => f.id.includes('cargo'));
                const regularFronts = frontMeshes.filter(f => !f.id.includes('cargo'));

                let cargoComponent = null;
                if (cargoFronts.length > 0) {
                    if (cargoFronts.length === 1) {
                        const f = cargoFronts[0];
                        let yOffset = 0;
                        if (type?.startsWith('dolna-lodowka')) {
                            yOffset = -height / 2 + f.height / 2 + 2;
                        }
                        cargoComponent = <CabinetCargo key={`cargo-main`} position={[0, yOffset, 0]} width={f.width} height={f.height} depth={depth} frontMaterials={frontMaterials} basketCount={type === 'dolna-lodowka-2' ? 6 : undefined} />;
                    } else {
                        const totalHeight = cargoFronts.reduce((sum, f) => sum + f.height, 0) + (cargoFronts.length - 1) * 4;
                        const yOffset = -height / 2 + totalHeight / 2 + 2;

                        let currentY = -totalHeight / 2;
                        cargoComponent = (
                            <CabinetCargo key="cargo-main" position={[0, yOffset, 0]} width={width - 4} height={totalHeight} depth={depth} frontMaterials={frontMaterials} basketCount={type === 'dolna-lodowka-2' ? 6 : undefined}>
                                {cargoFronts.map((f, i) => {
                                    const childY = currentY + f.height / 2;
                                    currentY += f.height + 4;
                                    return (
                                        <mesh key={f.id} position={[0, childY, 0]} castShadow receiveShadow material={frontMaterials}>
                                            <boxGeometry args={[f.width, f.height, 18]} />
                                        </mesh>
                                    );
                                })}
                            </CabinetCargo>
                        );
                    }
                }

                return (
                    <group position={[0, 0, depth / 2 + 18 / 2 + 1]}>
                        {cargoComponent}
                        {/* Odsunięcie frontu o 1mm od korpusu (szpara), grubość frontu bazowo 18 */}
                        {regularFronts.map((f, i) => {
                            // Kalkulacja pozycjonowania w osi Y na podstawie kolejności/id
                            let yOffset = 0;
                            let zOffset = 0;

                            if (f.id.includes('wewnetrzn')) {
                                yOffset = height / 2 - 100 - f.height / 2 - 2; // Pod górnym wieńcem pionowym (100mm)
                                zOffset = -18; // Cofnięcie o 18mm w głąb w stosunku do głównego frontu
                            } else if (f.height === height || f.height === height - 4) {
                                yOffset = 0;
                            } else if (type !== 'dolna-narozna' && type !== 'gorna-narozna' && type !== 'dolna-piekarnik' && !type?.startsWith('dolna-lodowka') && frontMeshes.length > 1) {
                                // Gdy w szafce dolnej są szuflady (sterta), budujemy je w pętli od dołu do góry
                                // height = dany front, total u dołu to akumulacja poprzednich
                                let acc = 0;
                                for (let j = 0; j < i; j++) {
                                    acc += frontMeshes[j].height + 3; // 3mm szczeliny
                                }
                                yOffset = -height / 2 + acc + f.height / 2 + 2; // 2mm luzu od dołu
                            } else if (type === 'dolna-piekarnik') {
                                // Wiekarnik - specyficzne
                                if (f.id === 'front-szuflada-1-piekarnik') { yOffset = -height / 2 + f.height / 2 + 2; }
                                if (f.id === 'front-szuflada-2-piekarnik') {
                                    const h1 = frontMeshes.find(m => m.id === 'front-szuflada-1-piekarnik')?.height || 0;
                                    yOffset = -height / 2 + h1 + 3 + f.height / 2 + 2;
                                }
                                if (f.id === 'front-szuflada-3-piekarnik') {
                                    const h1 = frontMeshes.find(m => m.id === 'front-szuflada-1-piekarnik')?.height || 0;
                                    const h2 = frontMeshes.find(m => m.id === 'front-szuflada-2-piekarnik')?.height || 0;
                                    yOffset = -height / 2 + h1 + 3 + h2 + 3 + f.height / 2 + 2;
                                }
                                if (f.id === 'front-piekarnik-dol') { yOffset = -height / 2 + f.height / 2 + 2; }
                                if (f.id === 'front-piekarnik-gora' || f.id === 'front-klapa-piekarnik-gora') { yOffset = height / 2 - f.height / 2 - 2; }
                            } else if (type?.startsWith('dolna-lodowka')) {
                                if (f.id.includes('lodowka-dol') || f.id.includes('drzwi-wewn-dol')) { yOffset = -height / 2 + f.height / 2 + 2; }
                                if (f.id.includes('lodowka-srodek') || f.id.includes('drzwi-wewn-srodek')) {
                                    const bottomH = frontMeshes.find(m => m.id.includes('lodowka-dol') || m.id.includes('drzwi-wewn-dol'))?.height || 716;
                                    yOffset = -height / 2 + bottomH + 2 + 4 + f.height / 2; // +4mm gap
                                }
                                if (f.id.includes('lodowka-gora')) { yOffset = height / 2 - f.height / 2 - 2; }
                            }

                            if (f.id.includes('drzwi') && f.name.includes('lewy') && type !== 'dolna-narozna-90') {
                                // Para drzwi lewych - zawias z lewej strony
                                // Krawędź frontu to -f.width/2. Grubość boku to 18. Odsuwamy zawias do wewnątrz korpusu o 18mm i margines szpary.
                                const hingeX = -f.width / 2 + 18 + 0.5;
                                return (
                                    <CabinetDoor key={`f-${i}`} position={[-width / 4, yOffset, zOffset]} width={f.width} height={f.height} hingeX={hingeX} isRightSide={false} frontMaterials={frontMaterials}>
                                        <CabinetHinge position={[hingeX, f.height / 2 - 80, -9]} isRightSide={false} />
                                        <CabinetHinge position={[hingeX, -f.height / 2 + 80, -9]} isRightSide={false} />
                                        {f.height > 900 && <CabinetHinge position={[hingeX, 0, -9]} isRightSide={false} />}
                                        {f.height > 1500 && <CabinetHinge position={[hingeX, f.height / 4, -9]} isRightSide={false} />}
                                    </CabinetDoor>
                                );
                            } else if (f.id.includes('drzwi') && f.name.includes('prawy') && type !== 'dolna-narozna-90') {
                                // Para drzwi prawych - zawias z prawej strony
                                const hingeX = f.width / 2 - 18 - 0.5;
                                return (
                                    <CabinetDoor key={`f-${i}`} position={[width / 4, yOffset, zOffset]} width={f.width} height={f.height} hingeX={hingeX} isRightSide={true} frontMaterials={frontMaterials}>
                                        <CabinetHinge position={[hingeX, f.height / 2 - 80, -9]} isRightSide={true} />
                                        <CabinetHinge position={[hingeX, -f.height / 2 + 80, -9]} isRightSide={true} />
                                        {f.height > 900 && <CabinetHinge position={[hingeX, 0, -9]} isRightSide={true} />}
                                        {f.height > 1500 && <CabinetHinge position={[hingeX, -f.height / 4, -9]} isRightSide={true} />}
                                    </CabinetDoor>
                                );
                            }

                            if (type === 'dolna-narozna' || type === 'gorna-narozna' || type === 'gorna-narozna-gleboka') {
                                const blendaWidth = type === 'gorna-narozna' ? 350 : (type === 'gorna-narozna-gleboka' ? 580 : 520);
                                if (f.id.includes('listwa-dyst')) {
                                    // Pasek dystansowy (100mm)
                                    // Znajduje się bezpośrednio przy blendzie.
                                    // Szerokość bieżącej połowy to width / 2. Blenda to blendaWidth, z krawędzi od zewnątrz biegnie grubość boku, ale pozycjonowanie jest liczone od zera lokalnej grupy szafki.
                                    // Z uwagi, że system oblicza boxy na środku X wymiarów szafki i odejmuje, środek blendy to: (width / 2) - (blendaWidth / 2) dla prawej i na odwrót.
                                    // 0.3mm gap + spacer width/2
                                    const spacerX = cornerOrientation === 'left'
                                        ? -width / 2 + blendaWidth + 0.3 + (f.width / 2)
                                        : width / 2 - blendaWidth - 0.3 - (f.width / 2);

                                    // Mesh szczeliny w kolorze dąb (#d4a373)
                                    const gapX = cornerOrientation === 'left'
                                        ? -width / 2 + blendaWidth + 0.15
                                        : width / 2 - blendaWidth - 0.15;

                                    // Listwa kątowa 60mm na zewnątrz przestrzeni korpusu (+Z)
                                    // Zrównana z główną listwą w osi X
                                    const katowaZOffset = zOffset + 9 + 30; // 9mm to front listwy głównej, 30mm to połowa 60mm

                                    return (
                                        <React.Fragment key={`f-${i}`}>
                                            {/* Szczelina dąb */}
                                            <mesh position={[gapX, yOffset, zOffset]} castShadow receiveShadow>
                                                <boxGeometry args={[0.3, f.height, 18]} />
                                                <meshStandardMaterial color="#d4a373" />
                                            </mesh>
                                            {/* Listwa Główna */}
                                            <mesh position={[spacerX, yOffset, zOffset]} castShadow receiveShadow material={frontMaterials}>
                                                <boxGeometry args={[f.width, f.height, 18]} />
                                            </mesh>
                                            {/* Listwa Kątowa (60mm, T-Shape, na zewnątrz) - kolor frontu */}
                                            <mesh position={[spacerX, yOffset, katowaZOffset]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow material={frontMaterials}>
                                                <boxGeometry args={[60, f.height, 18]} />
                                            </mesh>
                                            {/* Druga Listwa Kątowa (60mm, dokładana od strony blendy na zewnątrz) - kolor blendy */}
                                            <mesh position={[cornerOrientation === 'left' ? spacerX - 18 : spacerX + 18, yOffset, katowaZOffset]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow material={blendaMaterials}>
                                                <boxGeometry args={[60, f.height, 18]} />
                                            </mesh>
                                        </React.Fragment>
                                    );
                                }

                                // Szafka narożna główny front: umieszczony jest obok dystansu (dół) lub zaraz przy blendzie (góra)
                                // Środek frontu głównego: maksymalnie przy krawędzi bez blendy (minus luzy 2mm).
                                const frontX = cornerOrientation === 'left' ? (width / 2) - (f.width / 2) - 2 : (-width / 2) + (f.width / 2) + 2;

                                // Dolna i górna szafka narożna otwierają się po stronie blendy (lub według tej samej logiki)
                                const isRightHinge = cornerOrientation === 'right';

                                // Zawias liczymy lokalnie dla komponentu CabinetDoor (który sam jest już odsunięty w X, więc hingeX jest względem zera frontu)
                                const hingeX = isRightHinge ? f.width / 2 - 18 - 0.5 : -f.width / 2 + 18 + 0.5;

                                return (
                                    <CabinetDoor key={`f-${i}`} position={[frontX, yOffset, zOffset]} width={f.width} height={f.height} hingeX={hingeX} isRightSide={isRightHinge} frontMaterials={frontMaterials}>
                                        {/* Zostawiamy tagi CabinetHinge dla spójności, choć obecnie zwracają null */}
                                        <CabinetHinge position={[hingeX, f.height / 2 - 80, -9]} isRightSide={isRightHinge} />
                                        <CabinetHinge position={[hingeX, -f.height / 2 + 80, -9]} isRightSide={isRightHinge} />
                                    </CabinetDoor>
                                );
                            }

                            // Domyślny jeden wielki front na środku całej szerokości
                            // Ustalenie po której stronie zawiasy (dla pojedynczych drzwi)
                            const hasHinges = !f.id.includes('klapa') && (f.id.includes('drzwi') || f.id.includes('szuflady-wewn-dol') || f.id.includes('lodowka-dol') || f.id.includes('lodowka-srodek') || f.id.includes('lodowka-gora') || f.id.includes('piekarnik-dol') || f.id.includes('piekarnik-gora'));
                            let isRightHinge = configUnder.some(c => c.toLowerCase().includes('praw'));
                            if (!isRightHinge && configAbove.some(c => c.toLowerCase().includes('praw'))) isRightHinge = true;
                            if (!isRightHinge && (type === 'dolna-narozna' || type === 'gorna-narozna' || type === 'gorna-narozna-gleboka')) isRightHinge = cornerOrientation === 'right'; // narozna odwraca mechanizm                                
                            const hingeX = isRightHinge ? f.width / 2 - 18 - 0.5 : -f.width / 2 + 18 + 0.5;

                            if (hasHinges) {
                                return (
                                    <CabinetDoor key={`f-${i}`} position={[0, yOffset, zOffset]} width={f.width} height={f.height} hingeX={hingeX} isRightSide={isRightHinge} frontMaterials={frontMaterials}>
                                        <CabinetHinge position={[hingeX, f.height / 2 - 80, -9]} isRightSide={isRightHinge} />
                                        <CabinetHinge position={[hingeX, -f.height / 2 + 80, -9]} isRightSide={isRightHinge} />
                                        {f.height > 900 && <CabinetHinge position={[hingeX, 0, -9]} isRightSide={isRightHinge} />}
                                        {f.height > 1500 && <CabinetHinge position={[hingeX, f.height / 4, -9]} isRightSide={isRightHinge} />}
                                    </CabinetDoor>
                                );
                            } else if (f.id.includes('klapa')) {
                                // Fronty otwierane do góry (siłowniki)
                                return (
                                    <CabinetFlap key={`f-${i}`} position={[0, yOffset, zOffset]} width={f.width} height={f.height} frontMaterials={frontMaterials} />
                                );
                            } else if (f.id.includes('cargo')) {
                                // Front Cargo PEKA wysuwany w przód
                                return (
                                    <CabinetCargo key={`f-${i}`} position={[0, yOffset, zOffset]} width={f.width} height={f.height} depth={depth} frontMaterials={frontMaterials} basketCount={type === 'dolna-lodowka-2' ? 6 : undefined} />
                                );
                            } else {
                                // Sprawdzamy czy to szuflada
                                // Uznajemy za szufladę elementy generowane z konfiguracji szuflad
                                const isDrawer = f.id.includes('szuflad') || (!hasHinges && !f.id.includes('klapa') && f.width > 200 && f.height > 100 && type !== 'dolna-narozna' && type !== 'gorna-narozna' && !type?.startsWith('dolna-lodowka') && type !== 'dolna-piekarnik');

                                if (isDrawer) {
                                    return (
                                        <CabinetDrawer key={`f-${i}`} position={[0, yOffset, zOffset]} width={f.width} height={f.height} depth={depth} frontMaterials={frontMaterials} />
                                    );
                                }

                                // Renderujemy jako płaski front
                                return (
                                    <group key={`f-${i}`} position={[0, yOffset, zOffset]}>
                                        <mesh castShadow receiveShadow material={frontMaterials}>
                                            <boxGeometry args={[f.width, f.height, 18]} />
                                        </mesh>
                                    </group>
                                );
                            }
                        })}
                    </group>
                );
            })()}

            {/* Legs */}
            {(!type || !type.includes('gorna')) && legs.map((pos, index) => (
                <CabinetLeg key={index} position={pos as [number, number, number]} material={legMaterial} />
            ))}
        </group>
    );

    if (renderAsGroup) return mainCabinetGroup;

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                minHeight: isStaticPreview ? "220px" : "400px",
                background: "#f5f5f5",
                borderRadius: "8px",
                overflow: "hidden",
                cursor: isStaticPreview ? "default" : "grab"
            }}
        >
            <Canvas
                shadows
                camera={{
                    fov: 50,
                    near: 1,
                    far: 20000,
                    position: isStaticPreview && height >= 2000
                        ? [width * 3.0, height * 1.0 + LEG_HEIGHT, depth * 3.5]
                        : [width * 2.5, height * 2 + LEG_HEIGHT, depth * 2.5],
                }}
            >
                <OrbitControls
                    makeDefault
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 1.5}
                    enableZoom={!isStaticPreview}
                    enablePan={!isStaticPreview}
                    enableRotate={!isStaticPreview}
                />

                <ambientLight intensity={1.0} />
                <directionalLight
                    position={[500, 3000, 1000]}
                    intensity={2.8}
                    castShadow
                    shadow-mapSize={[4096, 4096]}
                    shadow-bias={-0.00005}
                />
                <directionalLight position={[-500, 1000, -500]} intensity={1.2} />

                {mainCabinetGroup}
            </Canvas>
        </div>
    );
}
