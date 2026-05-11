"use client";

import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { useSpring, a } from "@react-spring/three";
import { decors } from "@/data/decors";


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
    leftCutType?: 'none' | 'lyzwa-male' | 'lyzwa-female' | 'lyzwa-female-corner' | 'straight';
    rightCutType?: 'none' | 'lyzwa-male' | 'lyzwa-female' | 'lyzwa-female-corner' | 'straight';
    showEdges?: boolean;
    hoodHeight?: number;
    hoodCutoutSide?: 'left' | 'right';
    hoodCutoutOffset?: number;
    hoodCutoutWidth?: number;
    hoodCutoutDepth?: number;
    hoodHoleSide?: 'left' | 'right';
    hoodHoleOffset?: number;
    hasHoodHoleTop?: boolean;
    hasShelfHoles?: boolean;
    shelfHoleCount?: number;
    depthRogowa?: boolean;
    extendFrontDown?: boolean;
    bodyDecorId?: string;
    frontDecorId?: string;
    pipeSegmentsEnabled?: boolean[];
}

// Komponent pomocniczy do nakĹ‚adania tekstury na pĹ‚ytÄ™
function usePanelMaterial(
    decorId: string | undefined,
    width: number,
    height: number,
    defaultColor: string,
    isVertical: boolean = true,
    totalWidth?: number,
    totalHeight?: number,
    offsetX: number = 0,
    offsetY: number = 0
) {
    const decor = useMemo(() => decors.find(d => d.id === decorId), [decorId]);

    const texture = useMemo(() => {
        if (!decor?.imageUrl) return null;
        const loader = new THREE.TextureLoader();
        const tex = loader.load(decor.imageUrl);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.center.set(0.5, 0.5); // Center for correct rotation

        if (isVertical) {
            tex.repeat.set(width / decor.realWidth, height / decor.realHeight);
            if (decor.category === 'laminowana' || decor.category === 'blat') {
                tex.offset.set(
                    offsetX / decor.realWidth,
                    offsetY / decor.realHeight
                );
            }
        } else {
            tex.repeat.set(height / decor.realWidth, width / decor.realHeight);
            tex.rotation = Math.PI / 2;

            if (decor.category === 'laminowana' || decor.category === 'blat') {
                tex.offset.set(
                    offsetY / decor.realWidth,
                    -offsetX / decor.realHeight
                );
            }
        }
        return tex;
    }, [decor, width, height, isVertical, offsetX, offsetY]);

    return useMemo(() => {
        // Dla dekorów uni z kolorem — nie używamy tekstury, tylko kolor
        if (decor?.type === 'uni' && decor?.color) {
            return new THREE.MeshStandardMaterial({
                color: decor.color,
                roughness: 1.0,
                metalness: 0.0
            });
        }
        return new THREE.MeshStandardMaterial({
            color: texture ? '#ffffff' : defaultColor,
            map: texture,
            roughness: 1.0,
            metalness: 0.0
        });
    }, [texture, defaultColor, decor]);
}

// Komponent listwy korytkowej PEKA
function GolaProfile({ variant, width, height, yOffset, depth, bodyColor }: { variant: 'L' | 'C', width: number, height: number, yOffset: number, depth: number, bodyColor: string }) {
    const shape = useMemo(() => {
        const s = new THREE.Shape();
        if (variant === 'L') {
            // Listwa podblatowa (L) - CCW winding
            const h = height; // Zazwyczaj 50
            s.moveTo(0, 0); // Bottom Front
            s.lineTo(25, 0); // Bottom Back
            s.lineTo(25, h); // Top Back
            s.lineTo(22, h); // Pionowa gruboĹ›Ä‡
            s.lineTo(22, 3);  // RĂłg wewnÄ™trzny
            s.lineTo(0, 3);   // Frontowy lip
            s.lineTo(0, 0);
        } else {
            // Listwa miÄ™dzy szafkowa (C) - CCW winding, wysokoĹ›Ä‡ z parametru (64)
            const h = height; 
            s.moveTo(0, 0);   // Bottom Front
            s.lineTo(25, 0);  // Bottom Back
            s.lineTo(25, h);  // Top Back
            s.lineTo(0, h);   // Top Front
            s.lineTo(0, h - 3); // GruboĹ›Ä‡ gĂłrnego lipa
            s.lineTo(22, h - 3); // WewnÄ™trzny rĂłg gĂłra
            s.lineTo(22, 3);     // Pionowa Ĺ›cianka wewnÄ™trzna
            s.lineTo(0, 3);      // WewnÄ™trzny rĂłg dĂłĹ‚
            s.lineTo(0, 0);
        }
        return s;
    }, [variant, height]);

    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: "#1a1a1a", // Satynowa czerĹ„
        metalness: 0.7,
        roughness: 0.3,
    }), []);

    // ObrĂłt o 90 stopni (PI/2) sprawia, ĹĽe:
    // Lokalny X (gĹ‚Ä™bokoĹ›Ä‡ listwy 25mm) -> World -Z
    // Lokalny Y (wysokoĹ›Ä‡ listwy) -> World Y
    // Lokalny Z (szerokoĹ›Ä‡ listwy) -> World X
    return (
        <group position={[-width / 2, yOffset - height / 2, depth / 2]} rotation={[0, Math.PI / 2, 0]}>
            <mesh castShadow receiveShadow material={material}>
                <extrudeGeometry args={[shape, { depth: width, bevelEnabled: false }]} />
            </mesh>
        </group>
    );
}


// Komponent boku szafki z wyciÄ™ciami pod Gola
function SidePanel({ height, depth, thickness, golaProfiles, isRight, position, material }: { height: number, depth: number, thickness: number, golaProfiles: any[], isRight: boolean, position: [number, number, number], material: any }) {
    const shape = useMemo(() => {
        const s = new THREE.Shape();
        
        // Ze wzglÄ™du na rotacjÄ™:
        // Dla Right (-PI/2): Local X = depth/2 to PRZĂ“D (Z world)
        // Dla Left (PI/2): Local X = -depth/2 to PRZĂ“D (Z world)
        const frontEdge = isRight ? depth / 2 : -depth / 2;
        const backEdge = isRight ? -depth / 2 : depth / 2;
        const cutoutDepth = isRight ? (depth / 2 - 25) : (-depth / 2 + 25);

        // Start od dolnego tylnego rogu
        s.moveTo(backEdge, -height / 2);
        
        // Dolna krawÄ™dĹş do przodu
        s.lineTo(frontEdge, -height / 2);
        
        // Przednia krawÄ™dĹş z wyciÄ™ciami
        const sortedGola = [...golaProfiles].sort((a, b) => a.yOffset - b.yOffset);
        
        sortedGola.forEach(g => {
             const gCenterLocal = g.yOffset - height / 2;
             const gTop = gCenterLocal + g.height / 2;
             const gBot = gCenterLocal - g.height / 2;
             
             if (g.id.includes('miedzy')) {
                 s.lineTo(frontEdge, gBot);
                 s.lineTo(cutoutDepth, gBot);
                 s.lineTo(cutoutDepth, gTop);
                 s.lineTo(frontEdge, gTop);
             }
        });
        
        // WyciÄ™cie podblatowe
        const podblatowa = golaProfiles.find(g => g.id.includes('podblatowa'));
        if (podblatowa) {
             const gBot = height / 2 - 50; // Podblatowa L ma zawsze 50 (moĹĽna teĹĽ g.height/2 jeĹ›li golaProfiles.find)
             s.lineTo(frontEdge, gBot);
             s.lineTo(cutoutDepth, gBot);
             s.lineTo(cutoutDepth, height / 2);
        } else {
             s.lineTo(frontEdge, height / 2);
        }
        
        // GĂłra i tyĹ‚
        s.lineTo(backEdge, height / 2);
        s.lineTo(backEdge, -height / 2);
        
        return s;
    }, [height, depth, golaProfiles, isRight]);

    return (
        <group position={position} rotation={[0, isRight ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <mesh castShadow receiveShadow material={material}>
                <extrudeGeometry args={[shape, { depth: thickness, bevelEnabled: false }]} />
            </mesh>
        </group>
    );
}


function useFrontMaterials(
    decorId: string | undefined,
    width: number,
    height: number,
    bodyColor: string,
    isVertical: boolean = true,
    totalWidth?: number,
    totalHeight?: number,
    offsetX: number = 0,
    offsetY: number = 0
) {
    const decor = useMemo(() => decors.find(d => d.id === decorId), [decorId]);
    const mainMaterial = usePanelMaterial(decorId, width, height, bodyColor, isVertical, totalWidth, totalHeight, offsetX, offsetY);

    const edgeTexture = useMemo(() => {
        if (!decor?.edgeImageUrl) return null;
        const loader = new THREE.TextureLoader();
        const tex = loader.load(decor.edgeImageUrl);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }, [decor]);

    const edgeMaterialSides = useMemo(() => {
        if (!edgeTexture || !decor) return mainMaterial;
        const tex = edgeTexture.clone();
        tex.needsUpdate = true;
        // Krawędzie boczne: wysokość x 18mm
        const rW = decor.edgeRealWidth || 1000;
        const rH = decor.edgeRealHeight || 100;
        tex.repeat.set(height / rW, 18 / rH);
        tex.rotation = Math.PI / 2;
        return new THREE.MeshStandardMaterial({ map: tex, color: '#ffffff', roughness: 1.0, metalness: 0.0 });
    }, [edgeTexture, height, decor, mainMaterial]);

    const edgeMaterialTopBottom = useMemo(() => {
        if (!edgeTexture || !decor) return mainMaterial;
        const tex = edgeTexture.clone();
        tex.needsUpdate = true;
        // Krawędzie góra/dół: szerokość x 18mm
        const rW = decor.edgeRealWidth || 1000;
        const rH = decor.edgeRealHeight || 100;
        tex.repeat.set(width / rW, 18 / rH);
        return new THREE.MeshStandardMaterial({ map: tex, color: '#ffffff', roughness: 1.0, metalness: 0.0 });
    }, [edgeTexture, width, decor, mainMaterial]);

    return useMemo(() => [
        edgeMaterialSides,      // +X
        edgeMaterialSides,      // -X
        edgeMaterialTopBottom,  // +Y
        edgeMaterialTopBottom,  // -Y
        mainMaterial,           // +Z (Front)
        mainMaterial            // -Z (Back)
    ], [edgeMaterialSides, edgeMaterialTopBottom, mainMaterial]);
}

function FlatFront({
    decorId,
    width,
    height,
    bodyColor,
    totalWidth,
    totalHeight,
    offsetX,
    offsetY,
    rotation = [0, 0, 0]
}: {
    decorId?: string,
    width: number,
    height: number,
    bodyColor: string,
    totalWidth: number,
    totalHeight: number,
    offsetX: number,
    offsetY: number,
    rotation?: [number, number, number]
}) {
    const materials = useFrontMaterials(decorId, width, height, bodyColor, true, totalWidth, totalHeight, offsetX, offsetY);
    return (
        <mesh castShadow receiveShadow material={materials} rotation={rotation}>
            <boxGeometry args={[width, height, 18]} />
        </mesh>
    );
}






// Reusable Leg Component matching the reference image
// Structure: Top Plate + Cylinder Shaft + Bottom Foot
function CabinetLeg({ position, material }: { position: [number, number, number]; material: THREE.Material }) {
    const HEIGHT = 100;
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
    // Zawias usuniÄ™ty zgodnie z proĹ›bÄ… uĹĽytkownika
    return null;
}

// Animated Drawer Component
function CabinetDrawer({
    position,
    width,
    height,
    depth,
    frontDecorId,
    offsetY,
    totalWidth,
    totalHeight,
    isThreeDrawers,
    hasGola,
    isTopDrawer,
    children
}: {
    position: [number, number, number];
    width: number;
    height: number;
    depth: number;
    frontDecorId?: string;
    offsetY?: number;
    totalWidth?: number;
    totalHeight?: number;
    showEdges?: boolean;
    isThreeDrawers?: boolean;
    hasGola?: boolean;
    isTopDrawer?: boolean;
    children?: React.ReactNode;
}) {
    const materials = useFrontMaterials(frontDecorId, width, height, "#ffffff", true, totalWidth, totalHeight, 0, offsetY || 0);
    const [isOpen, setIsOpen] = React.useState(false);

    // Szuflada wysuwa siÄ™ na ok. 80% gĹ‚Ä™bokoĹ›ci korpusu
    const slideOutDistance = depth * 0.8;

    const { positionZ } = useSpring({
        positionZ: isOpen ? slideOutDistance : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // --- Geometria skrzynki wewnÄ™trznej ---
    // MateriaĹ‚y
    const bottomBackMaterial = React.useMemo(() => new THREE.MeshStandardMaterial({ color: "#d1d5db", roughness: 0.8 }), []); // Jasny szary (pĹ‚yta)
    const sideMetalMaterial = React.useMemo(() => new THREE.MeshStandardMaterial({ color: "#9ca3af", roughness: 0.5, metalness: 0.2 }), []); // Ciemniejszy szary / metalik

    // Wymiary
    const isHighDrawer = height > 180; // Szuflady wyĹĽsze bez podwyĹĽszenia relingiem to zazwyczaj fronty do 180mm (np 720/4)
    const boxDepth = depth - 50; // Skrzynka odrobinÄ™ pĹ‚ytsza niĹĽ caĹ‚y korpus
    const clearance = 15; // 15mm luzu po kaĹĽdej stronie na prowadnicÄ™
    const innerWidth = width - (clearance * 2);

    // Ograniczamy wysokoĹ›Ä‡ bokĂłw dla bardzo niskich frontĂłw (np. 116mm w szafce dolnej piekarnikowej)
    let sideBoxHeight = height < 130 ? 63 : 90; // Dolne metalowe boki (standard ~90, niskie N ~63)
    if (isTopDrawer) sideBoxHeight = 80; // ObniĹĽenie boku gĂłrnej szuflady
    
    let backBoxHeight = isHighDrawer ? 190 : sideBoxHeight; // StaĹ‚a wysokoĹ›Ä‡ tyĹ‚u dla wszystkich wysokich szuflad
    
    // ObniĹĽenie o 40mm (30+10) dla NISKIEJ gĂłrnej szuflady przy systemie Gola
    if (!isHighDrawer && isTopDrawer && hasGola) {
        sideBoxHeight = 50;
        backBoxHeight = 50;
    }
    
    // ObniĹĽenie relingu dla opcji 3 szuflady (z Gola i bez niej)
    if (isHighDrawer && isThreeDrawers) {
        if (hasGola) {
            backBoxHeight = 145; // 35+10 = 45mm niĹĽej niĹĽ standard
        } else {
            backBoxHeight = 180; // 10mm niĹĽej niĹĽ standard
        }
    }

    // Lokalizacje (front jest centrum w osi Z=0, jego tyĹ‚ to Z=-9)
    const boxCenterZ = -9 - (boxDepth / 2);
    // Dno przesuwamy do gĂłry wzglÄ™dem spodu frontu (ĹĽeby dno szuflady nie tarĹ‚o o szafkÄ™)
    const bottomFloorY = -height / 2 + 20 + 8; // dĂłĹ‚ frontu + 20mm + poĹ‚owa gruboĹ›ci pĹ‚yty 16mm (8mm)

    return (
        <group position={[position[0], position[1], 0]}>
            <a.group position-z={positionZ.to(z => position[2] + z)}>
                {/* 1. FRONT SZUFLADY */}
                <mesh
                    castShadow
                    receiveShadow
                    material={materials}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    <boxGeometry args={[width, height, 18]} />
                </mesh>

                {/* 2. SKRZYNKA WEWNÄTRZNA */}
                <group>
                    {/* Dno (Jasno szara pĹ‚yta 16mm) */}
                    {/* Zaczyna siÄ™ rĂłwno z tyĹ‚em frontu (-9), dĹ‚ugoĹ›Ä‡ boxDepth */}
                    <mesh position={[0, bottomFloorY, boxCenterZ]} castShadow receiveShadow material={bottomBackMaterial}>
                        <boxGeometry args={[innerWidth - 26, 16, boxDepth]} /> {/* WÄ™ĹĽsze o gruboĹ›ci bokĂłw metalowych (2x13mm) */}
                    </mesh>

                    {/* Ĺšcianka tylna (Jasno szara pĹ‚yta 16mm) */}
                    {/* Stoi na dnie, na samym koĹ„cu boxDepth */}
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
    showEdges,
}: {
    position: [number, number, number];
    width: number;
    height: number;
    depth: number;
    showEdges?: boolean;
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
    const innerW = width - 36;      // space between cabinet sides (minus 2Ă—18mm side panels)
    const panelW = innerW - endcapW * 2 - clearance * 2; // usable front panel width (total = innerW)
    const boxDepth = depth - 44;    // drawer box depth
    const boxW = innerW - sideThick * 2;                  // bottom/back width: spans between inner faces of side rails

    // X center of side rails â€” outer face aligns with outer face of endcap
    const railCenterX = panelW / 2 + clearance + endcapW - sideThick / 2;

    // Front face Y layout (bottom = Y 0, top = Y height):
    const topBarH = Math.round(height * 0.09);         // top cap bar (~9%)
    const solidH = Math.round(height * 0.50);          // solid white lower panel (50%)
    const topBarCenterY = height * 0.70 + 10;               // bar at 70% of drawer height + 10mm
    const glassH = Math.round(topBarCenterY - topBarH / 2 - solidH); // glass fills solidâ†’bar

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
            {/* PrzesuniÄ™cie o -18mm wgĹ‚Ä…b szafki, tak by schowaÄ‡ za 18mm frontem */}
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

                {/* Left side endcap â€” full continuous height */}
                < mesh position={[-(panelW / 2) - clearance - endcapW / 2, sideRailTopY / 2, frontFaceZ - 1]} castShadow receiveShadow material={metalMat} >
                    <boxGeometry args={[endcapW, sideRailTopY, 16]} />
                </mesh >

                {/* Right side endcap â€” full continuous height */}
                < mesh position={[(panelW / 2) + clearance + endcapW / 2, sideRailTopY / 2, frontFaceZ - 1]} castShadow receiveShadow material={metalMat} >
                    <boxGeometry args={[endcapW, sideRailTopY, 16]} />
                </mesh >

                {/* === DRAWER BOX BODY (internal structure) === */}

                {/* Bottom plate â€” spans between side rails */}
                <mesh position={[0, 8, boxDepth / 2]} castShadow receiveShadow material={bodyMat}>
                    <boxGeometry args={[boxW, 16, boxDepth]} />
                </mesh>

                {/* Back plate â€” spans between side rails, same height as side rails */}
                <mesh position={[0, sideRailTopY / 2, 8]} castShadow receiveShadow material={bodyMat}>
                    <boxGeometry args={[boxW, sideRailTopY, 16]} />
                </mesh>

                {/* Left side rail â€” lower solid panel */}
                <mesh position={[-railCenterX, solidCenterY, boxDepth / 2]} castShadow receiveShadow material={metalDarkMat}>
                    <boxGeometry args={[sideThick, solidH, boxDepth]} />
                </mesh>
                {/* Left top horizontal bar â€” Ĺ‚Ä…czy przĂłd z tyĹ‚em */}
                <mesh position={[-railCenterX, sideRailTopY - relingThick / 2, boxDepth / 2]} castShadow receiveShadow material={metalDarkMat}>
                    <boxGeometry args={[sideThick, relingThick, boxDepth]} />
                </mesh>

                {/* Right side rail â€” lower solid panel */}
                <mesh position={[railCenterX, solidCenterY, boxDepth / 2]} castShadow receiveShadow material={metalDarkMat}>
                    <boxGeometry args={[sideThick, solidH, boxDepth]} />
                </mesh>
                {/* Right top horizontal bar â€” Ĺ‚Ä…czy przĂłd z tyĹ‚em */}
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
    frontDecorId,
    offsetY,
    totalWidth,
    totalHeight,
    showEdges,
    basketCount,
    children
}: {
    position: [number, number, number];
    width: number;
    height: number;
    depth: number;
    frontDecorId?: string;
    offsetY?: number;
    totalWidth?: number;
    totalHeight?: number;
    showEdges?: boolean;
    basketCount?: number;
    children?: React.ReactNode;
}) {
    const materials = useFrontMaterials(frontDecorId, width, height, "#ffffff", true, totalWidth, totalHeight, 0, offsetY || 0);
    const [isOpen, setIsOpen] = React.useState(false);

    // Wysuwa siÄ™ na ok. 80% gĹ‚Ä™bokoĹ›ci korpusu
    const slideOutDistance = depth * 0.8;

    const { positionZ } = useSpring({
        positionZ: isOpen ? slideOutDistance : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // --- Geometria Cargo Peka ---
    // MateriaĹ‚y
    const pekaMaterial = React.useMemo(() => new THREE.MeshStandardMaterial({ color: "#e5e7eb", roughness: 0.4, metalness: 0.6 }), []); // Jasny metal metallic / aluminium

    // Wymiary
    const boxDepth = depth - 50;
    const clearance = 20; // luz na prowadnice
    const innerWidth = width - (clearance * 2);

    // Lokalizacje
    const boxCenterZ = -9 - (boxDepth / 2);
    const bottomFloorY = -height / 2 + 60; // Standardowy odstÄ™p dolny
    const topFloorY = height / 2 - 220; // Bazowe 120 od szczytu + 100 (10cm) miejsca uĹĽytkowego na przedmioty

    // Koszyk funkcja pomocnicza - zlikwidowana szpara miÄ™dzy dnem a bocznymi siatkami
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
                {/* Lewy peĹ‚ny bok kosza */}
                <mesh position={[-(innerWidth / 2) + 1, wallY, boxCenterZ]} castShadow receiveShadow material={pekaMaterial}>
                    <boxGeometry args={[2, wallHeight, boxDepth]} />
                </mesh>
                {/* Prawy peĹ‚ny bok kosza */}
                <mesh position={[(innerWidth / 2) - 1, wallY, boxCenterZ]} castShadow receiveShadow material={pekaMaterial}>
                    <boxGeometry args={[2, wallHeight, boxDepth]} />
                </mesh>
                {/* TyĹ‚ kosza */}
                <mesh position={[0, wallY, boxCenterZ - boxDepth / 2 + 1]} castShadow receiveShadow material={pekaMaterial}>
                    <boxGeometry args={[innerWidth - 4, wallHeight, 2]} />
                </mesh>
                {/* PrzĂłd kosza przylegajÄ…cy do frontu */}
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
                        material={materials}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                    >
                        <boxGeometry args={[width, height, 18]} />
                    </mesh>
                )}

                {/* 2. STELAĹ» PEKA */}
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
    frontDecorId,
    offsetY,
    totalWidth,
    totalHeight,
    showEdges,
    children
}: {
    position: [number, number, number];
    width: number;
    height: number;
    hingeX: number;
    isRightSide: boolean;
    frontDecorId?: string;
    offsetY?: number;
    totalWidth?: number;
    totalHeight?: number;
    showEdges?: boolean;
    children?: React.ReactNode;
}) {
    const materials = useFrontMaterials(frontDecorId, width, height, "#ffffff", true, totalWidth, totalHeight, 0, offsetY || 0);
    const [isOpen, setIsOpen] = React.useState(false);

    // KÄ…t otwarcia: ~105 stopni. PamiÄ™tamy o kierunku obrotu.
    const openAngle = isRightSide ? Math.PI * 0.58 : -Math.PI * 0.58;

    const { rotationY } = useSpring({
        rotationY: isOpen ? openAngle : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // Ustawienie pivotu na Ĺ›rodek bocznego profilu (X = width / 2 - 9, Z = 0), ĹĽeby otwierajÄ…c siÄ™ na 90 stopni,
    // krawÄ™dĹş frontu licowaĹ‚a siÄ™ dokĹ‚adnie z zewnÄ™trznÄ… krawÄ™dziÄ… boku korpusu (bez wstawania 2cm dalej).
    const pivotX = isRightSide ? width / 2 - 9 : -(width / 2 - 9);
    const pivotZ = 0;

    return (
        <group position={position}>
            {/* Przesuwamy oĹ› obrotu do miejsca tylnego brzegu drzwiczek (X = pivotX, Z = pivotZ) */}
            <a.group position={[pivotX, 0, pivotZ]} rotation-y={rotationY}>
                {/* WewnÄ…trz obrĂłconej grupy, cofamy front na jego wĹ‚aĹ›ciwe miejsce lokalne */}
                <group position={[-pivotX, 0, -pivotZ]}>
                    <mesh
                        castShadow
                        receiveShadow
                        material={materials}
                        onClick={(e) => {
                            e.stopPropagation(); // Blokuje klikniÄ™cia w inne obiekty pod spodem
                            setIsOpen(!isOpen);
                        }}
                    >
                        <boxGeometry args={[width, height, 18]} />
                    </mesh>
                </group>
            </a.group>

            {/* Zawiasy osadzamy caĹ‚kowicie niezaleĹĽnie od rotacji frontu, przekazujÄ…c im sygnaĹ‚ rotacji do wĹ‚asnej animacji */}
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

// Flap Component for Actuators (SiĹ‚owniki)
function CabinetFlap({
    position,
    width,
    height,
    frontDecorId,
    offsetY,
    totalWidth,
    totalHeight,
    showEdges,
}: {
    position: [number, number, number];
    width: number;
    height: number;
    frontDecorId?: string;
    offsetY?: number;
    totalWidth?: number;
    totalHeight?: number;
    showEdges?: boolean;
}) {
    const materials = useFrontMaterials(frontDecorId, width, height, "#ffffff", true, totalWidth, totalHeight, 0, offsetY || 0);
    const [isOpen, setIsOpen] = React.useState(false);

    // KÄ…t otwarcia: 95 stopni w gĂłrÄ™ (czyli ujemny obrĂłt wokĂłĹ‚ osi X).
    const openAngle = -Math.PI * (95 / 180);

    const { rotationX } = useSpring({
        rotationX: isOpen ? openAngle : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // Ustawienie pivotu na gĂłrnÄ… krawÄ™dĹş frontu
    const pivotY = height / 2 - 2;
    const pivotZ = 0;

    return (
        <group position={position}>
            {/* Przesuwamy oĹ› obrotu do gĂłrnej krawÄ™dzi (Y = pivotY) */}
            <a.group position={[0, pivotY, pivotZ]} rotation-x={rotationX}>
                {/* Cofamy front na jego wĹ‚aĹ›ciwe miejsce lokalne wzglÄ™dem nowej osi */}
                <group position={[0, -pivotY, -pivotZ]}>
                    <mesh
                        castShadow
                        receiveShadow
                        material={materials}
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

// Bi-fold Door Component for L-shaped Corner Cabinet (Lewe skrzydĹ‚o ciÄ…gnie prawe)
function LBiFoldDoor({
    leftDoor,
    rightDoor,
    width,
    width2,
    depth,
    frontDecorId,
    bodyColor,
    showEdges,
}: {
    leftDoor: any;
    rightDoor: any;
    width: number;
    width2: number;
    depth: number;
    frontDecorId?: string;
    bodyColor: string;
    showEdges?: boolean;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const materials = useFrontMaterials(frontDecorId, leftDoor.width, leftDoor.height, bodyColor, true);
    // Swap materials for 18mm thickness on X axis: [Main, Main, Edge, Edge, Edge, Edge]
    const rotatedMaterials = [materials[4], materials[5], materials[2], materials[3], materials[0], materials[1]];

    // GĹ‚Ăłwny zawias (z lewej strony, na lewym boku)
    // Lewe skrzydĹ‚o jest przykrywajÄ…ce (wzdĹ‚uĹĽ osi Z), jego Ĺ›rodek to:
    // Z = width2 / 2 - 2 - f.width / 2 (gdzie f.width to leftDoor.width)
    // SzerokoĹ›Ä‡ szafki od osi Ĺ›rodkowej to width2/2. Skraj lewy to width2/2 - 2. Zawias jest na tym skraju.
    // X left panel: -width / 2 + depth + 18 / 2 + 1
    const leftDoorX = -width / 2 + depth + 18 / 2 + 2;
    const leftDoorZ = width2 / 2 - 2 - leftDoor.width / 2;

    const leftPivotX = leftDoorX;
    // Zawias gĹ‚owny lewego skrzydĹ‚a (przy Ĺ›cianie lewej po osi Z)
    const leftPivotZ = width2 / 2 - 2 + 2; // +2 for gap

    // Drzwi obracajÄ… siÄ™ o 105 stopni.
    const { mainAngle } = useSpring({
        mainAngle: isOpen ? -Math.PI * (105 / 180) : 0, // Otwarcie do zewnÄ…trz w lewo (105 stopni)
        config: { mass: 1, tension: 120, friction: 20 }
    });

    // Zgodnie z wytycznymi, prawe skrzydĹ‚o nie skĹ‚ada siÄ™ wzglÄ™dem lewego - zostaje pod kÄ…tem 90 stopni
    const { foldAngle } = useSpring({
        foldAngle: 0, // Zawsze zero, by zachowaÄ‡ ksztaĹ‚t "L"
        config: { mass: 1, tension: 120, friction: 20 }
    });

    return (
        <group>
            {/* OĹ› obrotu gĹ‚Ăłwnych (lewych) drzwi */}
            <a.group position={[leftPivotX, 0, leftPivotZ]} rotation-y={mainAngle}>
                {/* 1. CofniÄ™cie lewego skrzydĹ‚a do Ĺ›rodka (od osi obrotu) */}
                <group position={[0, 0, leftDoorZ - leftPivotZ]}>
                    <mesh
                        castShadow
                        receiveShadow
                        material={rotatedMaterials}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                    >
                        <boxGeometry args={[18, leftDoor.height, leftDoor.width]} />
                    </mesh>

                    {/* Ĺšrodkowy (Ĺ‚Ä…czÄ…cy) zawias miÄ™dzy drzwiami */}
                    {/* Ten zawias znajduje siÄ™ na koĹ„cu lewego skrzydĹ‚a. 
                        W osi Z skrzydĹ‚o ma dĹ‚ugoĹ›Ä‡ leftDoor.width. 
                        Jego Ĺ›rodek jest w Z=0 grupy, wiÄ™c prawy koniec to Z = -leftDoor.width/2. */}
                    <a.group position={[9, 0, -leftDoor.width / 2]} rotation-y={foldAngle}>
                        {/* 2. Prawe skrzydĹ‚o - w stanie poczÄ…tkowym jest prostopadĹ‚e do lewego */}
                        {/* Po zamkniÄ™ciu musi znaleĹşÄ‡ siÄ™ w odpowiedniej osi na rĂłwni z korpusem */}
                        <group position={[rightDoor.width / 2 - 18, 0, -7]}>
                            <mesh
                                castShadow
                                receiveShadow
                                material={materials}
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

// Double Door Component for L-shaped Corner (NiezaleĹĽne)
function LDoubleDoor({
    f,
    width,
    width2,
    depth,
    frontDecorId,
    bodyColor,
    isLeft,
    showEdges
}: {
    f: any;
    width: number;
    width2: number;
    depth: number;
    frontDecorId?: string;
    bodyColor: string;
    isLeft: boolean;
    showEdges?: boolean;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const materials = useFrontMaterials(frontDecorId, f.width, f.height, bodyColor, true);
    const rotatedMaterials = [materials[4], materials[5], materials[2], materials[3], materials[0], materials[1]];

    // KÄ…ty otwarcia niezaleĹĽnych drzwi (165 stopni tzn. 165/180 * PI)
    const openAngle = isLeft ? -Math.PI * (165 / 180) : Math.PI * (165 / 180);

    const { rotationY } = useSpring({
        rotationY: isOpen ? openAngle : 0,
        config: { mass: 1, tension: 120, friction: 20 }
    });

    if (isLeft) {
        // Lewe skrzydĹ‚o
        const posX = -width / 2 + depth + 18 / 2 + 2;
        const offsetZ = width2 / 2 - 2 - f.width / 2;
        const pivotZ = width2 / 2 - 2 + 2;

        return (
            <group>
                <a.group position={[posX, 0, pivotZ]} rotation-y={rotationY}>
                    <group position={[0, 0, offsetZ - pivotZ]}>
                        <mesh
                            castShadow
                            receiveShadow
                            material={rotatedMaterials}
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
        // Prawe skrzydĹ‚o
        const posZ = -width2 / 2 + depth + 18 / 2 + 2;
        const offsetX = width / 2 - 2 - f.width / 2;
        const pivotX = width / 2 - 2 + 2;

        return (
            <group>
                <a.group position={[pivotX, 0, posZ]} rotation-y={rotationY}>
                    <group position={[offsetX - pivotX, 0, 0]}>
                        <mesh
                            castShadow
                            receiveShadow
                            material={materials}
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

// --- Komponenty drzwi dla szafki GĂ“RNEJ naroĹĽnej L (uĹĽywajÄ… armDepth zamiast 530) ---

function GornaLDoubleDoor({
    f, width, width2, frontDecorId, bodyColor, isLeft, armDepth, showEdges
}: { f: any; width: number; width2: number; frontDecorId?: string; bodyColor: string; isLeft: boolean; armDepth: number; showEdges?: boolean; }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const materials = useFrontMaterials(frontDecorId, f.width, f.height, bodyColor, true);
    const rotatedMaterials = [materials[4], materials[5], materials[2], materials[3], materials[0], materials[1]];
    const openAngle = isLeft ? -Math.PI * (165 / 180) : Math.PI * (165 / 180);
    const { rotationY } = useSpring({ rotationY: isOpen ? openAngle : 0, config: { mass: 1, tension: 120, friction: 20 } });

    if (isLeft) {
        const posX = -width / 2 + armDepth + 18 / 2 + 2;
        const offsetZ = width2 / 2 - 2 - f.width / 2;
        const pivotZ = width2 / 2 - 2 + 2;
        return (
            <group position={[0, f.offsetY || 0, 0]}>
                <a.group position={[posX, 0, pivotZ]} rotation-y={rotationY}>
                    <group position={[0, 0, offsetZ - pivotZ]}>
                        <mesh castShadow receiveShadow material={rotatedMaterials} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                            <boxGeometry args={[18, f.height, f.width]} />
                        </mesh>
                    </group>
                </a.group>
            </group>
        );
    } else {
        const posZ = -width2 / 2 + armDepth + 18 / 2 + 2;
        const offsetX = width / 2 - 2 - f.width / 2;
        const pivotX = width / 2 - 2 + 2;
        return (
            <group position={[0, f.offsetY || 0, 0]}>
                <a.group position={[pivotX, 0, posZ]} rotation-y={rotationY}>
                    <group position={[offsetX - pivotX, 0, 0]}>
                        <mesh castShadow receiveShadow material={materials} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                            <boxGeometry args={[f.width, f.height, 18]} />
                        </mesh>
                    </group>
                </a.group>
            </group>
        );
    }
}

function GornaLBiFoldDoor({
    leftDoor, rightDoor, width, width2, frontDecorId, bodyColor, armDepth, showEdges
}: { leftDoor: any; rightDoor: any; width: number; width2: number; frontDecorId?: string; bodyColor: string; armDepth: number; showEdges?: boolean; }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const materials = useFrontMaterials(frontDecorId, leftDoor.width, leftDoor.height, bodyColor, true);
    const rotatedMaterials = [materials[4], materials[5], materials[2], materials[3], materials[0], materials[1]];
    const leftDoorX = -width / 2 + armDepth + 18 / 2 + 2;
    const leftDoorZ = width2 / 2 - 2 - leftDoor.width / 2;
    const leftPivotX = leftDoorX;
    const leftPivotZ = width2 / 2 - 2 + 2;
    const { mainAngle } = useSpring({ mainAngle: isOpen ? -Math.PI * (105 / 180) : 0, config: { mass: 1, tension: 120, friction: 20 } });
    const { foldAngle } = useSpring({ foldAngle: 0, config: { mass: 1, tension: 120, friction: 20 } });
    return (
        <group position={[0, leftDoor.offsetY || 0, 0]}>
            <a.group position={[leftPivotX, 0, leftPivotZ]} rotation-y={mainAngle}>
                <group position={[0, 0, leftDoorZ - leftPivotZ]}>
                    <mesh castShadow receiveShadow material={rotatedMaterials} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                        <boxGeometry args={[18, leftDoor.height, leftDoor.width]} />
                    </mesh>
                    <a.group position={[9, 0, -leftDoor.width / 2]} rotation-y={foldAngle}>
                        <group position={[rightDoor.width / 2 - 18, 0, -7]}>
                            <mesh castShadow receiveShadow material={materials} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                                <boxGeometry args={[rightDoor.width, rightDoor.height, 18]} />
                            </mesh>
                        </group>
                    </a.group>
                </group>
            </a.group>
        </group>
    );
}
function Countertop3D({
    width,
    height,
    depth,
    leftCutType,
    rightCutType,
    woodMaterial,
    decorId,
    bodyColor,
    isStaticPreview
}: {
    width: number;
    height: number;
    depth: number;
    leftCutType?: string;
    rightCutType?: string;
    woodMaterial: THREE.Material;
    decorId?: string;
    bodyColor: string;
    isStaticPreview?: boolean;
}) {
    const materials = useFrontMaterials(decorId, width, depth, bodyColor, false);
    // For countertop box [width, height, depth]:
    // 0,1: Sides (height x depth) -> Side Edge
    // 2,3: Top/Bottom (width x depth) -> Main Face
    // 4,5: Front/Back (width x height) -> Top/Bottom Edge (since thickness is height)
    const countertopMaterials = [materials[0], materials[1], materials[4], materials[5], materials[2], materials[3]];

    // For extrude geometry: [0] is Cap (Top/Bottom), [1] is Sides (Edges)
    const extrudeMaterials = [materials[4], materials[0]];
    const leftCut = leftCutType || 'none';
    const rightCut = rightCutType || 'none';

    // We define buildBlatShape outside useMemo as it's a pure helper here
    const buildBlatShape = (w: number, d: number, left: string, right: string) => {
        const shape = new THREE.Shape();
        if (right === 'lyzwa-male') shape.moveTo(w / 2 - 30, -d / 2);
        else shape.moveTo(w / 2, -d / 2);

        if (left === 'lyzwa-male') {
            shape.lineTo(-w / 2 + 30, -d / 2);
            shape.lineTo(-w / 2 + 30, d / 2 - 35);
            shape.quadraticCurveTo(-w / 2 + 30, d / 2 - 30, -w / 2 + 25, d / 2 - 25);
            shape.lineTo(-w / 2, d / 2);
        } else if (left === 'lyzwa-female') {
            shape.lineTo(-w / 2, -d / 2);
            shape.lineTo(-w / 2, d / 2 - 35);
            shape.quadraticCurveTo(-w / 2, d / 2 - 30, -w / 2 + 5, d / 2 - 25);
            shape.lineTo(-w / 2 + 30, d / 2);
        } else if (left === 'lyzwa-female-corner') {
            shape.lineTo(-w / 2, -d / 2);
            shape.lineTo(-w / 2, d / 2 - 30);
            shape.lineTo(-w / 2 + 565, d / 2 - 30);
            shape.quadraticCurveTo(-w / 2 + 570, d / 2 - 30, -w / 2 + 575, d / 2 - 25);
            shape.lineTo(-w / 2 + 600, d / 2);
        } else {
            shape.lineTo(-w / 2, -d / 2);
            shape.lineTo(-w / 2, d / 2);
        }

        if (right === 'lyzwa-male') {
            shape.lineTo(w / 2, d / 2);
            shape.lineTo(w / 2 - 25, d / 2 - 25);
            shape.quadraticCurveTo(w / 2 - 30, d / 2 - 30, w / 2 - 30, d / 2 - 35);
            shape.lineTo(w / 2 - 30, -d / 2);
        } else if (right === 'lyzwa-female-corner') {
            shape.lineTo(w / 2 - 600, d / 2);
            shape.lineTo(w / 2 - 600 + 25, d / 2 - 25);
            shape.quadraticCurveTo(w / 2 - 600 + 30, d / 2 - 30, w / 2 - 600 + 35, d / 2 - 30);
            shape.lineTo(w / 2, d / 2 - 30);
            shape.lineTo(w / 2, -d / 2);
        } else if (right === 'lyzwa-female') {
            shape.lineTo(w / 2 - 30, d / 2);
            shape.lineTo(w / 2 - 5, d / 2 - 25);
            shape.quadraticCurveTo(w / 2, d / 2 - 30, w / 2, d / 2 - 35);
            shape.lineTo(w / 2, -d / 2);
        } else {
            shape.lineTo(w / 2, d / 2);
            shape.lineTo(w / 2, -d / 2);
        }
        return shape;
    };

    // HOOK CALLED UNCONDITIONALLY WITHIN THIS COMPONENT
    const jointLines = useMemo(() => {
        const segments: THREE.Vector3[][] = [];
        if (leftCut === 'lyzwa-female' || leftCut === 'lyzwa-male') {
            const p = new THREE.Path();
            if (leftCut === 'lyzwa-male') {
                p.moveTo(-width / 2 + 30, -depth / 2);
                p.lineTo(-width / 2 + 30, depth / 2 - 35);
                p.quadraticCurveTo(-width / 2 + 30, depth / 2 - 30, -width / 2 + 25, depth / 2 - 25);
                p.lineTo(-width / 2, depth / 2);
            } else {
                p.moveTo(-width / 2, -depth / 2);
                p.lineTo(-width / 2, depth / 2 - 35);
                p.quadraticCurveTo(-width / 2, depth / 2 - 30, -width / 2 + 5, depth / 2 - 25);
                p.lineTo(-width / 2 + 30, depth / 2);
            }
            const pts = p.getPoints(32);
            segments.push(pts.map(pt => new THREE.Vector3(pt.x, pt.y, 0)));
            segments.push(pts.map(pt => new THREE.Vector3(pt.x, pt.y, height)));
        }
        if (rightCut === 'lyzwa-female' || rightCut === 'lyzwa-male') {
            const p = new THREE.Path();
            if (rightCut === 'lyzwa-male') {
                p.moveTo(width / 2, depth / 2);
                p.lineTo(width / 2 - 25, depth / 2 - 25);
                p.quadraticCurveTo(width / 2 - 30, depth / 2 - 30, width / 2 - 30, depth / 2 - 35);
                p.lineTo(width / 2 - 30, -depth / 2);
            } else {
                p.moveTo(width / 2 - 30, depth / 2);
                p.lineTo(width / 2 - 5, depth / 2 - 25);
                p.quadraticCurveTo(width / 2, depth / 2 - 30, width / 2, depth / 2 - 35);
                p.lineTo(width / 2, -depth / 2);
            }
            const pts = p.getPoints(32);
            segments.push(pts.map(pt => new THREE.Vector3(pt.x, pt.y, 0)));
            segments.push(pts.map(pt => new THREE.Vector3(pt.x, pt.y, height)));
        }
        return segments;
    }, [leftCut, rightCut, width, depth, height]);

    const uvGenerator = useMemo(() => ({
        generateTopUV: (geometry: any, vertices: any, indexA: number, indexB: number, indexC: number) => {
            const ax = vertices[indexA * 3];
            const ay = vertices[indexA * 3 + 1];
            const bx = vertices[indexB * 3];
            const by = vertices[indexB * 3 + 1];
            const cx = vertices[indexC * 3];
            const cy = vertices[indexC * 3 + 1];
            return [
                new THREE.Vector2(ax / width + 0.5, ay / depth + 0.5),
                new THREE.Vector2(bx / width + 0.5, by / depth + 0.5),
                new THREE.Vector2(cx / width + 0.5, cy / depth + 0.5)
            ];
        },
        generateSideWallUV: () => [
            new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1)
        ]
    }), [width, depth]);

    if (leftCut !== 'none' || rightCut !== 'none') {
        const shape = buildBlatShape(width, depth, leftCut, rightCut);

        return (
            <group position={[0, isStaticPreview ? 0 : height / 2, 0]}>
                <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow material={extrudeMaterials}>
                    <extrudeGeometry args={[shape, { depth: height, bevelEnabled: false, curveSegments: 32, UVGenerator: uvGenerator }]} />
                    {jointLines.map((pts, idx) => (
                        <Line
                            key={idx}
                            points={pts}
                            color="#666666"
                            lineWidth={0.2}
                        />
                    ))}
                </mesh>
            </group>
        );
    }

    const blatGeoArgs: [number, number, number] = [width, height, depth];
    return (
        <group position={[0, isStaticPreview ? 0 : height / 2, 0]}>
            <mesh castShadow receiveShadow material={countertopMaterials}>
                <boxGeometry args={blatGeoArgs} />
            </mesh>
        </group>
    );
}

function CabinetStrip3D({
    width,
    height,
    depth,
    type,
    leftCutType,
    rightCutType,
    woodMaterial,
    decorId,
    bodyColor
}: {
    width: number;
    height: number;
    depth: number;
    type?: string;
    leftCutType?: string;
    rightCutType?: string;
    woodMaterial: THREE.Material;
    decorId?: string;
    bodyColor: string;
}) {
    const blendaMaterials = useFrontMaterials(decorId, width, height, bodyColor || "#fefdf5", true);
    const leftCut = leftCutType || 'none';
    const rightCut = rightCutType || 'none';

    const buildStripShape = (w: number, d: number, left: string, right: string) => {
        const shape = new THREE.Shape();
        if (left === 'angle-45-left') shape.moveTo(-w / 2 + d, -d / 2);
        else shape.moveTo(-w / 2, -d / 2);
        if (right === 'angle-45-right') shape.lineTo(w / 2 - d, -d / 2);
        else shape.lineTo(w / 2, -d / 2);
        shape.lineTo(w / 2, d / 2);
        shape.lineTo(-w / 2, d / 2);
        if (left === 'angle-45-left') shape.lineTo(-w / 2 + d, -d / 2);
        else shape.lineTo(-w / 2, -d / 2);
        return shape;
    };

    const isPodszafkowa = type === 'gorna-listwa-podszafkowa';
    const ledProfileOffset = depth >= 340 ? 158 : 120;

    const buildLedStripShape = (w: number, d: number, left: string, right: string, yf: number, yb: number) => {
        const ls = new THREE.Shape();
        const tlx = left === 'angle-45-left' ? -w / 2 - yb + d / 2 : -w / 2;
        const trx = right === 'angle-45-right' ? w / 2 + yb - d / 2 : w / 2;
        const brx = right === 'angle-45-right' ? w / 2 + yf - d / 2 : w / 2;
        const blx = left === 'angle-45-left' ? -w / 2 - yf + d / 2 : -w / 2;
        ls.moveTo(tlx, yb);
        ls.lineTo(trx, yb);
        ls.lineTo(brx, yf);
        ls.lineTo(blx, yf);
        ls.lineTo(tlx, yb);
        return ls;
    };

    const shape = buildStripShape(width, depth, leftCut, rightCut);
    const extrudeSettings = { depth: height, bevelEnabled: false };
    const ledExtrudeSettings = { depth: 7, bevelEnabled: false };

    let ledMeshes = null;
    if (isPodszafkowa) {
        const y_front = -depth / 2 + ledProfileOffset;
        const y_back = y_front + 22;
        const shapeFrontBlack = buildLedStripShape(width, depth, leftCut, rightCut, y_front, y_front + 4);
        const shapeMidWhite = buildLedStripShape(width, depth, leftCut, rightCut, y_front + 4, y_back - 4);
        const shapeBackBlack = buildLedStripShape(width, depth, leftCut, rightCut, y_back - 4, y_back);

        ledMeshes = (
            <group position={[0, 0, -2]}>
                <mesh castShadow receiveShadow>
                    <extrudeGeometry args={[shapeBackBlack, ledExtrudeSettings]} />
                    <meshStandardMaterial attach="material-0" color="#111111" roughness={0.6} />
                    <meshStandardMaterial attach="material-1" color="#888888" metalness={0.8} roughness={0.2} />
                </mesh>
                <mesh castShadow receiveShadow>
                    <extrudeGeometry args={[shapeMidWhite, ledExtrudeSettings]} />
                    <meshStandardMaterial attach="material-0" color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} roughness={0.1} />
                    <meshStandardMaterial attach="material-1" color="#888888" metalness={0.8} roughness={0.2} />
                </mesh>
                <mesh castShadow receiveShadow>
                    <extrudeGeometry args={[shapeFrontBlack, ledExtrudeSettings]} />
                    <meshStandardMaterial attach="material-0" color="#111111" roughness={0.6} />
                    <meshStandardMaterial attach="material-1" color="#888888" metalness={0.8} roughness={0.2} />
                </mesh>
            </group>
        );
    }

    return (
        <group position={[0, -height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh castShadow receiveShadow material={blendaMaterials}>
                <extrudeGeometry args={[shape, extrudeSettings]} />
            </mesh>
            {ledMeshes}
        </group>
    );
}


function Cabinet90Lower3D({
    width,
    height,
    depth,
    width2,
    elements,
    THICKNESS,
    GAP,
    LEG_HEIGHT,
    legY,
    legMaterial,
    sideMaterials,
    rimMaterials,
    backPanelMaterials,
    frontMaterials,
    frontMeshes,
    frontDecorId,
    bodyColor,
    showEdges,
    renderAsGroup,
    isStaticPreview
}: {
    width: number;
    height: number;
    depth: number;
    width2?: number;
    elements: any[];
    THICKNESS: number;
    GAP: number;
    LEG_HEIGHT: number;
    legY: number;
    legMaterial: THREE.Material;
    sideMaterials: THREE.Material;
    rimMaterials: THREE.Material;
    backPanelMaterials: THREE.Material | THREE.Material[];
    frontMaterials: THREE.Material;
    frontMeshes: any[];
    frontDecorId?: string;
    bodyColor: string;
    showEdges: boolean;
    renderAsGroup: boolean;
    isStaticPreview: boolean;
}) {
    const leftDepth = depth;
    const backDepth = depth;
    const rimLeftDepth = leftDepth;
    const rimBackDepth = backDepth;
    const w2 = width2 || 900;

    const DIST_BACK = 100;
    const DIST_FRONT = 50;

    const cabinetGroup = (
        <group position={[0, LEG_HEIGHT / 2, 0]}>
            <mesh position={[width / 2 - THICKNESS / 2, 0, -w2 / 2 + backDepth / 2]} castShadow receiveShadow material={sideMaterials}>
                <boxGeometry args={[THICKNESS, height, backDepth]} />
            </mesh>
            <mesh position={[-width / 2 + leftDepth / 2, 0, w2 / 2 - THICKNESS / 2]} castShadow receiveShadow material={sideMaterials}>
                <boxGeometry args={[leftDepth, height, THICKNESS]} />
            </mesh>
            <mesh position={[-THICKNESS / 2 + 10, -height / 2 + THICKNESS / 2, -w2 / 2 + 18 + (rimBackDepth - 18) / 2]} castShadow receiveShadow material={rimMaterials}>
                <boxGeometry args={[width - THICKNESS - 20, THICKNESS, rimBackDepth - 18]} />
            </mesh>
            <mesh position={[-width / 2 + 10 + rimLeftDepth / 2, -height / 2 + THICKNESS / 2, -w2 / 2 + rimBackDepth + (w2 - rimBackDepth - THICKNESS) / 2]} castShadow receiveShadow material={rimMaterials}>
                <boxGeometry args={[rimLeftDepth - 20, THICKNESS, w2 - rimBackDepth - THICKNESS]} />
            </mesh>
            <mesh position={[-THICKNESS / 2 + 10, height / 2 - THICKNESS / 2, -w2 / 2 + 18 + (rimBackDepth - 18) / 2]} castShadow receiveShadow material={rimMaterials}>
                <boxGeometry args={[width - THICKNESS - 20, THICKNESS, rimBackDepth - 18]} />
            </mesh>
            <mesh position={[-width / 2 + 10 + rimLeftDepth / 2, height / 2 - THICKNESS / 2, -w2 / 2 + rimBackDepth + (w2 - rimBackDepth - THICKNESS) / 2]} castShadow receiveShadow material={rimMaterials}>
                <boxGeometry args={[rimLeftDepth - 20, THICKNESS, w2 - rimBackDepth - THICKNESS]} />
            </mesh>
            <mesh position={[-THICKNESS / 2, 0, -w2 / 2 + 9]} castShadow receiveShadow material={sideMaterials}>
                <boxGeometry args={[width - THICKNESS, height - 2 * GAP, 18]} />
            </mesh>
            <mesh position={[-width / 2 + 20 - 1.5, 0, (18 - THICKNESS) / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow material={backPanelMaterials}>
                <boxGeometry args={[w2 - 18 - THICKNESS, height - 2 * GAP, 3]} />
            </mesh>
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
            {(() => {
                if (!frontMeshes || frontMeshes.length === 0) return null;
                const isBiFold = frontMeshes.some(f => f.id && f.id.startsWith('front-lamany'));
                const isDouble = frontMeshes.some(f => f.id && f.id.startsWith('front-drzwi'));
                if (isBiFold) {
                    const leftDoor = frontMeshes.find(f => f.id === 'front-lamany-1');
                    const rightDoor = frontMeshes.find(f => f.id === 'front-lamany-2');
                    if (leftDoor && rightDoor) return <LBiFoldDoor key="bifold" leftDoor={leftDoor} rightDoor={rightDoor} width={width} width2={w2} depth={depth} frontDecorId={leftDoor.decorId || frontDecorId} bodyColor={leftDoor.bodyColor || bodyColor} showEdges={showEdges} />;
                } else if (isDouble) {
                    return frontMeshes.map((f, i) => {
                        if (f.id === 'front-drzwi-lewy') return <LDoubleDoor key={`front-${i}`} f={f} width={width} width2={w2} depth={depth} frontDecorId={f.decorId || frontDecorId} bodyColor={f.bodyColor || bodyColor} isLeft={true} showEdges={showEdges} />;
                        if (f.id === 'front-drzwi-prawy') return <LDoubleDoor key={`front-${i}`} f={f} width={width} width2={w2} depth={depth} frontDecorId={f.decorId || frontDecorId} bodyColor={f.bodyColor || bodyColor} isLeft={false} showEdges={showEdges} />;
                        return null;
                    });
                }
                return null;
            })()}
            <CabinetLeg position={[-width / 2 + DIST_BACK, legY, -w2 / 2 + DIST_BACK]} material={legMaterial} />
            <CabinetLeg position={[width / 2 - DIST_FRONT, legY, -w2 / 2 + DIST_BACK]} material={legMaterial} />
            <CabinetLeg position={[width / 2 - DIST_FRONT, legY, -w2 / 2 + backDepth - DIST_FRONT]} material={legMaterial} />
            <CabinetLeg position={[-width / 2 + leftDepth - DIST_FRONT, legY, -w2 / 2 + backDepth - DIST_FRONT]} material={legMaterial} />
            <CabinetLeg position={[-width / 2 + leftDepth - DIST_FRONT, legY, w2 / 2 - DIST_FRONT]} material={legMaterial} />
            <CabinetLeg position={[-width / 2 + DIST_BACK, legY, w2 / 2 - DIST_FRONT]} material={legMaterial} />
            <CabinetLeg position={[-width / 2 + leftDepth - DIST_FRONT, legY, -w2 / 2 + DIST_BACK]} material={legMaterial} />
            <CabinetLeg position={[-width / 2 + DIST_BACK, legY, -w2 / 2 + backDepth - DIST_FRONT]} material={legMaterial} />
        </group>
    );

    if (renderAsGroup) return cabinetGroup;

    return (
        <div style={{ width: "100%", height: "100%", minHeight: isStaticPreview ? "220px" : "400px", background: "#f5f5f5", borderRadius: "8px", overflow: "hidden", cursor: isStaticPreview ? "default" : "grab" }}>
            <Canvas shadows camera={{ fov: 50, near: 1, far: 20000, position: [width * 2, height * 2 + LEG_HEIGHT, w2 * 2] }}>
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.5} enableZoom={!isStaticPreview} enablePan={!isStaticPreview} enableRotate={!isStaticPreview} />
                <ambientLight intensity={1.0} />
                <directionalLight position={[500, 3000, 1000]} intensity={2.8} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.00005} />
                <directionalLight position={[-500, 1000, -500]} intensity={1.2} />
                {cabinetGroup}
            </Canvas>
        </div>
    );
}

function Cabinet90Upper3D({
    width,
    height,
    depth,
    width2,
    elements,
    THICKNESS,
    GAP,
    sideMaterials,
    rimMaterials,
    backPanelMaterials,
    frontMaterials,
    frontMeshes,
    frontDecorId,
    bodyColor,
    showEdges,
    renderAsGroup,
    isStaticPreview
}: {
    width: number;
    height: number;
    depth: number;
    width2?: number;
    elements: any[];
    THICKNESS: number;
    GAP: number;
    sideMaterials: THREE.Material;
    rimMaterials: THREE.Material;
    backPanelMaterials: THREE.Material | THREE.Material[];
    frontMaterials: THREE.Material;
    frontMeshes: any[];
    frontDecorId?: string;
    bodyColor: string;
    showEdges: boolean;
    renderAsGroup: boolean;
    isStaticPreview: boolean;
}) {
    const armDepth = depth;
    const rimArmDepth = armDepth;
    const w2 = width2 || 650;

    const cabinetGroup = (
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
            {(() => {
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
            })()}
            {(() => {
                if (!frontMeshes || frontMeshes.length === 0) return null;
                const isBiFold = frontMeshes.some(f => f.id && f.id.startsWith('front-lamany'));
                const isDouble = frontMeshes.some(f => f.id && f.id.startsWith('front-drzwi'));
                if (isBiFold) {
                    const lDoor = frontMeshes.find(f => f.id === 'front-lamany-1');
                    const rDoor = frontMeshes.find(f => f.id === 'front-lamany-2');
                    if (lDoor && rDoor) return <GornaLBiFoldDoor key="bifold" leftDoor={lDoor} rightDoor={rDoor} width={width} width2={w2} frontDecorId={lDoor.decorId || frontDecorId} bodyColor={lDoor.bodyColor || bodyColor} armDepth={armDepth} showEdges={showEdges} />;
                } else if (isDouble) {
                    return frontMeshes.map((f, i) => {
                        if (f.id === 'front-drzwi-lewy') return <GornaLDoubleDoor key={`front-${i}`} f={f} width={width} width2={w2} frontDecorId={f.decorId || frontDecorId} bodyColor={f.bodyColor || bodyColor} isLeft={true} armDepth={armDepth} showEdges={showEdges} />;
                        if (f.id === 'front-drzwi-prawy') return <GornaLDoubleDoor key={`front-${i}`} f={f} width={width} width2={w2} frontDecorId={f.decorId || frontDecorId} bodyColor={f.bodyColor || bodyColor} isLeft={false} armDepth={armDepth} showEdges={showEdges} />;
                        return null;
                    });
                }
                return null;
            })()}
        </group>
    );

    if (renderAsGroup) return cabinetGroup;

    return (
        <div style={{ width: "100%", height: "100%", minHeight: isStaticPreview ? "220px" : "400px", background: "#f5f5f5", borderRadius: "8px", overflow: "hidden", cursor: isStaticPreview ? "default" : "grab" }}>
            <Canvas shadows camera={{ fov: 50, near: 1, far: 20000, position: [width * 2, height * 2, w2 * 2] }}>
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.5} enableZoom={!isStaticPreview} enablePan={!isStaticPreview} enableRotate={!isStaticPreview} />
                <ambientLight intensity={1.0} />
                <directionalLight position={[500, 3000, 1000]} intensity={2.8} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.00005} />
                <directionalLight position={[-500, 1000, -500]} intensity={1.2} />
                {cabinetGroup}
            </Canvas>
        </div>
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
    renderAsGroup = false,
    leftCutType,
    rightCutType,
    showEdges = false,
    hoodHeight,
    hoodCutoutSide,
    hoodCutoutOffset,
    hoodCutoutWidth,
    hoodCutoutDepth,
    hoodHoleSide,
    hoodHoleOffset,
    hasHoodHoleTop,
    hasShelfHoles,
    shelfHoleCount,
    depthRogowa,
    extendFrontDown,
    bodyDecorId,
    frontDecorId,
    pipeSegmentsEnabled
}: Szafka3DProps) {

    // --- Materials (use Panel Material hook for textures) ---
    const bodyMaterial = usePanelMaterial(bodyDecorId, width, height, bodyColor || "#fefdf5", true); // Boki: pionowo
    const rimMaterial = usePanelMaterial(bodyDecorId, width, height, bodyColor || "#fefdf5", false); // WieĹ„ce: poziomo
    const frontMaterials = usePanelMaterial(frontDecorId, width, height, bodyColor || "#fefdf5", true); // Fronty: pionowo
    const blatMaterial = usePanelMaterial(bodyDecorId, width, depth, bodyColor || "#fefdf5", false); // Blaty: sĹ‚oje poziomo (wzdĹ‚uĹĽ)


    const THICKNESS = 18;
    const GAP = 0; // Removign gap for perfect flush joints in 3D
    const LEG_HEIGHT = 100; // 100mm legs

    // --- Materials ---

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
        const decor = decors.find(d => d.id === bodyDecorId);
        if (decor?.color) return decor.color;
        return bodyColor || "#dcdcdc";
    }, [bodyColor, bodyDecorId]);

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
    const sideMaterials = bodyMaterial;

    const rimMaterials = rimMaterial;


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

    const blendaMaterials = useFrontMaterials(bodyDecorId, width, height, bodyColor || "#fefdf5", true);

    // 6. Front Material (Varies by user selection):
    // Fallbacks to generic semi-gloss if none specified or complex.
    // Front Materials are now handled by the hook above


    const frontMeshes = useMemo(() => {
        return (elements || []).filter(el => el.type === 'front' && el.id !== 'front-listwa-katowa');
    }, [elements]);

    const golaProfiles = useMemo(() => (elements || []).filter(e => e.type === 'gola-profile'), [elements]);

    // --- Geometry & Positioning ---


    const isTallCabinet = type?.includes('lodowka') || type?.includes('piekarnik');
    let technicalVoid = (type?.startsWith('dolna-') || isTallCabinet) ? 50 : 20;

    // JeĹ›li wymuszono gĹ‚Ä™bokoĹ›Ä‡ rogowa (540mm z 30mm przeĹ›witem)
    if (depthRogowa || type === 'dolna-rogowa') {
        technicalVoid = 30;
    }

    const sideGeoArgs: [number, number, number] = [THICKNESS, height, depth];
    const leftSidePos: [number, number, number] = [-width / 2 + THICKNESS / 2, 0, 0];
    const rightSidePos: [number, number, number] = [width / 2 - THICKNESS / 2, 0, 0];

    const isGola = golaProfiles.length > 0;
    const golaRecess = isGola ? 25 : 0;

    const rimWidth = width - 2 * THICKNESS - 2 * GAP;

    const bottomRimDepth = Math.max(10, depth - technicalVoid);
    const bottomRimGeoArgs: [number, number, number] = [rimWidth, THICKNESS, bottomRimDepth];
    const bottomRimPos: [number, number, number] = [0, -height / 2 + THICKNESS / 2, -depth / 2 + technicalVoid + bottomRimDepth / 2];

    // Full Top Rim
    const topRimFullDepth = isGola ? bottomRimDepth - golaRecess : bottomRimDepth;
    const topRimFullGeoArgs: [number, number, number] = [rimWidth, THICKNESS, topRimFullDepth]; // Recessed by golaRecess if active
    const topRimFullPos: [number, number, number] = [0, height / 2 - THICKNESS / 2, -depth / 2 + technicalVoid + topRimFullDepth / 2];

    const topRimDepth = 100;
    const topRimGeoArgs: [number, number, number] = [rimWidth, THICKNESS, topRimDepth];
    const topRimFrontPos: [number, number, number] = [0, height / 2 - THICKNESS / 2, depth / 2 - topRimDepth / 2 - golaRecess];
    const topRimBackPos: [number, number, number] = [0, height / 2 - THICKNESS / 2, -depth / 2 + technicalVoid + topRimDepth / 2];

    const BACK_THICKNESS = 3;
    const backPanelWidth = width - 2 * THICKNESS - 2 * GAP;
    const backPanelGeoArgs: [number, number, number] = [backPanelWidth, height - 2 * GAP, BACK_THICKNESS];
    const backPanelPos: [number, number, number] = [0, 0, -depth / 2 + technicalVoid - BACK_THICKNESS / 2];

    // Leg Positioning Logic
    // User Request:
    // - < 240mm: 2 Legs (Center)
    // - >= 240mm && < 851mm: 4 Legs (Corners)
    // - >= 851mm: 6 Legs (Corners + Center)
    // Offsets: Side 30mm, Front/Back 50mm.

    const LEG_RADIUS = 22;
    const DIST_SIDE = 30;
    const DIST_FRONT = 50;
    const DIST_BACK = 100;

    const legY = -height / 2 - LEG_HEIGHT / 2;

    // Z Positions (Common for all)
    const legZ_Front = depth / 2 - DIST_FRONT - LEG_RADIUS;
    const legZ_Back = -depth / 2 + DIST_BACK + LEG_RADIUS;

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
        return (
            <Cabinet90Lower3D
                width={width}
                height={height}
                depth={depth}
                width2={width2}
                elements={elements || []}
                THICKNESS={THICKNESS}
                GAP={GAP}
                LEG_HEIGHT={LEG_HEIGHT}
                legY={legY}
                legMaterial={legMaterial}
                sideMaterials={sideMaterials}
                rimMaterials={rimMaterials}
                backPanelMaterials={backPanelMaterials}
                frontMaterials={frontMaterials}
                frontMeshes={frontMeshes}
                frontDecorId={frontDecorId}
                bodyColor={bodyColor || "#fefdf5"}
                showEdges={showEdges}
                renderAsGroup={renderAsGroup}
                isStaticPreview={isStaticPreview}
            />
        );
    }


    if (type === 'gorna-narozna-90') {
        return (
            <Cabinet90Upper3D
                width={width}
                height={height}
                depth={depth}
                width2={width2}
                elements={elements || []}
                THICKNESS={THICKNESS}
                GAP={GAP}
                sideMaterials={sideMaterials}
                rimMaterials={rimMaterials}
                backPanelMaterials={backPanelMaterials}
                frontMaterials={frontMaterials}
                frontMeshes={frontMeshes}
                frontDecorId={frontDecorId}
                bodyColor={bodyColor || "#fefdf5"}
                showEdges={showEdges}
                renderAsGroup={renderAsGroup}
                isStaticPreview={isStaticPreview}
            />
        );
    }

    if (type?.startsWith('blat-')) {
        const countertopGroup = (
            <Countertop3D
                width={width}
                height={height}
                depth={depth}
                leftCutType={leftCutType}
                rightCutType={rightCutType}
                woodMaterial={blatMaterial}
                decorId={bodyDecorId}
                bodyColor={bodyColor || "#fefdf5"}
                isStaticPreview={isStaticPreview}
            />
        );

        if (renderAsGroup) return countertopGroup;

        return (
            <div style={{ width: "100%", height: "100%", minHeight: isStaticPreview ? "220px" : "400px", background: "#f5f5f5", borderRadius: "8px", overflow: "hidden" }}>
                <Canvas shadows camera={{ fov: 30, near: 1, far: 5000, position: [0, height * 5, depth * 5] }}>
                    <OrbitControls makeDefault />
                    <ambientLight intensity={1.0} />
                    <directionalLight position={[100, 500, 100]} intensity={1.5} castShadow />
                    {countertopGroup}
                </Canvas>
            </div>
        );
    }

    // --- LISTWA MIÄ˜DZY SZAFKOWA / PODSZAFKOWA ---
    if (type === 'gorna-listwa-miedzy-szafkowa' || type === 'gorna-listwa-podszafkowa') {
        const stripGroup = (
            <CabinetStrip3D
                width={width}
                height={height}
                depth={depth}
                type={type}
                leftCutType={leftCutType}
                rightCutType={rightCutType}
                woodMaterial={bodyMaterial}
                decorId={bodyDecorId}
                bodyColor={bodyColor || "#fefdf5"}
            />
        );

        if (renderAsGroup) return stripGroup;

        return (
            <div style={{ width: "100%", height: "100%", minHeight: isStaticPreview ? "220px" : "400px", background: "#f5f5f5", borderRadius: "8px", overflow: "hidden" }}>
                <Canvas shadows camera={{ fov: 30, near: 1, far: 5000, position: [0, height * 12, depth * 15] }}>
                    <OrbitControls makeDefault />
                    <ambientLight intensity={1.0} />
                    <directionalLight position={[100, 500, 100]} intensity={1.5} castShadow />
                    {stripGroup}
                </Canvas>
            </div>
        );
    }

    if (type === 'fartuch-kuchenny') {
        const fartuchGroup = (
            // DraggableCabinet renderuje Szafka3D z group position={[0, yOriginOffset, 0]} = [0, height/2, 0]
            // co oznacza ĹĽe geometria tutaj na [0,0,0] (centered) trafi od dolnej krawÄ™dzi do gĂłrnej.
            // Finalnie: bottom = position[1], top = position[1] + height âś“
            <group>
                <mesh castShadow receiveShadow material={blendaMaterials}>
                    <boxGeometry args={[width, height, depth]} />
                </mesh>
                {showEdges && (
                    <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
                        <lineBasicMaterial color="#555" />
                    </lineSegments>
                )}
            </group>
        );

        if (renderAsGroup) return fartuchGroup;

        return (
            <div style={{ width: "100%", height: "100%", minHeight: isStaticPreview ? "220px" : "400px", background: "#f5f5f5", borderRadius: "8px", overflow: "hidden" }}>
                <Canvas shadows camera={{ fov: 30, near: 1, far: 5000, position: [0, height * 2, width * 1.5] }}>
                    <OrbitControls makeDefault />
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[100, 500, 100]} intensity={2.0} castShadow />

                    {fartuchGroup}
                </Canvas>
            </div>
        );
    }

    if (type === 'blenda-meblowa') {
        // Blenda: pionowy panel z płyty meblowej 18mm
        // width = szerokość, height = wysokość, depth = 18mm (grubość)
        // Używamy blendaMaterials aby obsłużyć obrzeża
        const blendaGroup = (
            <group>
                <mesh castShadow receiveShadow material={blendaMaterials}>
                    <boxGeometry args={[width, height, depth]} />
                </mesh>
            </group>
        );

        if (renderAsGroup) return blendaGroup;

        return (
            <div style={{ width: "100%", height: "100%", minHeight: isStaticPreview ? "220px" : "400px", background: "#f5f5f5", borderRadius: "8px", overflow: "hidden" }}>
                <Canvas shadows camera={{ fov: 40, near: 1, far: 5000, position: [width * 1.2, height * 0.8, depth * 8] }}>
                    <OrbitControls makeDefault />
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[100, 500, 100]} intensity={2.0} castShadow />

                    {blendaGroup}
                </Canvas>
            </div>
        );
    }

    const mainLegHeight = (!type || !type.includes('gorna')) ? LEG_HEIGHT : 0;

    const mainCabinetGroup = (
        <group position={[0, mainLegHeight / 2, 0]}>
            {/* Sides */}
            {golaProfiles.length > 0 ? (
                <>
                    <SidePanel height={height} depth={depth} thickness={THICKNESS} golaProfiles={golaProfiles} isRight={false} position={[-width / 2, 0, 0]} material={sideMaterials} />
                    <SidePanel height={height} depth={depth} thickness={THICKNESS} golaProfiles={golaProfiles} isRight={true} position={[width / 2, 0, 0]} material={sideMaterials} />
                </>
            ) : (
                <>
                    <mesh position={leftSidePos} castShadow receiveShadow material={sideMaterials}>
                        <boxGeometry args={sideGeoArgs} />
                    </mesh>
                    <mesh position={rightSidePos} castShadow receiveShadow material={sideMaterials}>
                        <boxGeometry args={sideGeoArgs} />
                    </mesh>
                </>
            )}

            {/* Gola Profiles */}
            {golaProfiles.map(g => (
                <GolaProfile 
                    key={g.id} 
                    variant={g.variant} 
                    width={g.width} 
                    height={g.height} 
                    yOffset={g.yOffset - height / 2} 
                    depth={depth}
                    bodyColor={bodyColor || "#ffffff"} 
                />
            ))}

            {type !== 'gorna-okapowa' && (
                <mesh position={bottomRimPos} castShadow receiveShadow material={rimMaterials}>
                    <boxGeometry args={bottomRimGeoArgs} />
                </mesh>
            )}

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

                    {/* 2. Rear Vertical Rim (Fixed at the top, recessed for technical void) */}
                    <mesh
                        position={[0, height / 2 - 100 / 2, -depth / 2 + technicalVoid + THICKNESS / 2]}
                        castShadow
                        receiveShadow
                        material={rimMaterials}
                    >
                        <boxGeometry args={[rimWidth, 100, THICKNESS]} />
                    </mesh>

                    {/* 3. Low Back (18mm, H=150) */}
                    <mesh
                        position={[0, -height / 2 + THICKNESS + 150 / 2, -depth / 2 + technicalVoid + THICKNESS / 2]}
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
                                <mesh position={[0, middleRimY, -depth / 2 + technicalVoid + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
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
                                    // PeĹ‚ne plecy od gĂłry do doĹ‚u
                                    <mesh position={[0, 0, backPanelPos[2]]} castShadow receiveShadow material={backPanelMaterials}>
                                        <boxGeometry args={[backPanelWidth, height - 4, 3]} />
                                    </mesh>
                                ) : (
                                    // Oryginalna lodĂłwka â€” plecy tylko w gĂłrnej sekcji
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
                                <mesh position={[0, rimUnderY, -depth / 2 + technicalVoid + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[rimWidth, THICKNESS, bottomRimDepth]} />
                                </mesh>
                                <mesh position={[0, rimAboveOvenY, -depth / 2 + technicalVoid + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[rimWidth, THICKNESS, bottomRimDepth]} />
                                </mesh>
                                <mesh position={[0, rimAboveMicrowaveY, -depth / 2 + technicalVoid + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
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
                                <mesh position={[0, bottomRimY, -depth / 2 + technicalVoid + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
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
                                    position={[0, -height / 2 + bottomSpaceHeight / 2, -depth / 2 + (technicalVoid - 3) + 1.5]}
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
                                                position={[0, topCenterY, -depth / 2 + (technicalVoid - 3) + 1.5]}
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
            ) : type === 'dolna-piekarnik-podblatowa' ? (
                <>
                    {/* Wieniec Srodkowy (pod piekarnik) */}
                    {(() => {
                        const ovenH = ovenSpaceHeight || 600;
                        const wieniecY = height / 2 - ovenH - THICKNESS / 2;
                        const bottomSpaceHeight = height - ovenH;

                        return (
                            <>
                                <mesh position={[0, wieniecY, -depth / 2 + technicalVoid + bottomRimDepth / 2]} castShadow receiveShadow material={rimMaterials}>
                                    <boxGeometry args={[rimWidth, THICKNESS, bottomRimDepth]} />
                                </mesh>

                                {/* Plecy Dół (Tylko za szufladą) */}
                                {bottomSpaceHeight > 4 && (
                                    <mesh
                                        position={[0, -height / 2 + bottomSpaceHeight / 2, -depth / 2 + (technicalVoid - 3) + 1.5]}
                                        castShadow
                                        receiveShadow
                                        material={backPanelMaterials}
                                    >
                                        <boxGeometry args={[width - 4, bottomSpaceHeight - 4, 3]} />
                                    </mesh>
                                )}
                            </>
                        );
                    })()}

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
                </>
            ) : type === 'gorna-okapowa' ? (
                <>
                    {(() => {
                        const hHeight = Math.round(elements?.find(e => e.id === 'blenda-okap')?.height || 150);
                        const wRodkowyY = -height / 2 + THICKNESS + hHeight + THICKNESS / 2;

                        const holeRadius = 75; // 150/2
                        const holePath = new THREE.Path();
                        holePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, false);

                        // --- 1. FULL DEPTH SHAPE (for bottom wieniec) with RECTANGULAR CUTOUT ---
                        const cutoutW = hoodCutoutWidth || Math.max(0, width - 76);
                        const cutoutD = hoodCutoutDepth || 280;
                        const cutoutOffset = hoodCutoutOffset !== undefined ? hoodCutoutOffset : Math.round((width - 36 - cutoutW) / 2);
                        const cutoutSide = hoodCutoutSide || 'left';
                        const lSpace = (cutoutSide === 'left') ? cutoutOffset : (rimWidth - cutoutOffset - cutoutW);
                        const rSpace = (cutoutSide === 'right') ? cutoutOffset : (rimWidth - cutoutOffset - cutoutW);

                        const fullShape = new THREE.Shape();
                        fullShape.moveTo(-rimWidth / 2, -depth / 2);
                        fullShape.lineTo(rimWidth / 2, -depth / 2);
                        fullShape.lineTo(rimWidth / 2, depth / 2);
                        fullShape.lineTo(-rimWidth / 2, depth / 2);
                        fullShape.lineTo(-rimWidth / 2, -depth / 2);

                        const rectCutoutPath = new THREE.Path();
                        // X position based on side and offset
                        // rimWidth is (width - 36). Inner face of left side is at -rimWidth/2.
                        let xStart = (cutoutSide === 'left')
                            ? -rimWidth / 2 + cutoutOffset
                            : rimWidth / 2 - cutoutOffset - cutoutW;

                        // Path is defined relative to the center of the shape [0,0] which corresponds to wieniec center
                        // Since wieniec is width = rimWidth, depth = depth.
                        // We translate coordinates to be relative to center.
                        const xMin = xStart;
                        const xMax = xStart + cutoutW;
                        // Center within the allowed depth: (-depth/2 + 20) to (depth/2 - 36)
                        // Allowed center is ((-depth/2 + 20) + (depth/2 - 36)) / 2 = -8
                        const yCenter = -9;
                        const yMin = yCenter - cutoutD / 2;
                        const yMax = yCenter + cutoutD / 2;

                        rectCutoutPath.moveTo(xMin, yMin);
                        rectCutoutPath.lineTo(xMax, yMin);
                        rectCutoutPath.lineTo(xMax, yMax);
                        rectCutoutPath.lineTo(xMin, yMax);
                        rectCutoutPath.lineTo(xMin, yMin);

                        fullShape.holes.push(rectCutoutPath);

                        // --- 2. MIDDLE RIM SHAPE (centered on rectangular cutout) ---
                        const middleRimShape = new THREE.Shape();
                        middleRimShape.moveTo(-rimWidth / 2, -bottomRimDepth / 2);
                        middleRimShape.lineTo(rimWidth / 2, -bottomRimDepth / 2);
                        middleRimShape.lineTo(rimWidth / 2, bottomRimDepth / 2);
                        middleRimShape.lineTo(-rimWidth / 2, bottomRimDepth / 2);
                        middleRimShape.lineTo(-rimWidth / 2, -bottomRimDepth / 2);

                        const middleCenterX = (xMin + xMax) / 2;
                        const middleCirclePath = new THREE.Path();
                        middleCirclePath.absarc(middleCenterX, 0, holeRadius, 0, Math.PI * 2, false);
                        middleRimShape.holes.push(middleCirclePath);

                        // --- 3. TOP RIM SHAPE (controlled by hoodHole props) ---
                        const topRimShape = new THREE.Shape();
                        topRimShape.moveTo(-rimWidth / 2, -bottomRimDepth / 2);
                        topRimShape.lineTo(rimWidth / 2, -bottomRimDepth / 2);
                        topRimShape.lineTo(rimWidth / 2, bottomRimDepth / 2);
                        topRimShape.lineTo(-rimWidth / 2, bottomRimDepth / 2);
                        topRimShape.lineTo(-rimWidth / 2, -bottomRimDepth / 2);

                        const cutoutW_top = hoodCutoutWidth || Math.max(0, width - 76);
                        const cutoutOffset_top = hoodCutoutOffset !== undefined ? hoodCutoutOffset : Math.round((width - 36 - cutoutW_top) / 2);
                        const cutoutSide_top = hoodCutoutSide || 'left';
                        const xMin_top = (cutoutSide_top === 'left')
                            ? -rimWidth / 2 + cutoutOffset_top
                            : rimWidth / 2 - cutoutOffset_top - cutoutW_top;
                        const xMax_top = xMin_top + cutoutW_top;
                        const pipeCenterX_top = (xMin_top + xMax_top) / 2;

                        const topCirclePath = new THREE.Path();
                        topCirclePath.absarc(pipeCenterX_top, 0, holeRadius, 0, Math.PI * 2, false);
                        if (hasHoodHoleTop === true) {
                            topRimShape.holes.push(topCirclePath);
                        }

                        return (
                            <>
                                {/* Wieniec Dolny z otworem (FULL DEPTH) */}
                                <group
                                    position={[0, -height / 2, 0]}
                                    rotation={[-Math.PI / 2, 0, 0]}
                                >
                                    <mesh castShadow receiveShadow material={rimMaterials}>
                                        <extrudeGeometry args={[fullShape, { depth: THICKNESS, bevelEnabled: false, curveSegments: 32 }]} />
                                    </mesh>
                                </group>

                                {/* Wieniec Srodkowy z otworem (STANDARD DEPTH) - Centered on bottom cutout */}
                                <group
                                    position={[0, wRodkowyY - THICKNESS / 2, -depth / 2 + technicalVoid + bottomRimDepth / 2]}
                                    rotation={[-Math.PI / 2, 0, 0]}
                                >
                                    <mesh castShadow receiveShadow material={rimMaterials}>
                                        <extrudeGeometry args={[middleRimShape, { depth: THICKNESS, bevelEnabled: false, curveSegments: 32 }]} />
                                    </mesh>
                                </group>

                                {/* Blenda frontowa (Fixed) */}
                                {(() => {
                                    const config = configUnder || [];
                                    const sLeft = config.some(opt => opt.toLowerCase().includes('skrócona z lewej'));
                                    const sRight = config.some(opt => opt.toLowerCase().includes('skrócona z prawej'));

                                    let bWidth = rimWidth;
                                    let bX = 0;
                                    if (sLeft) {
                                        const shrink = lSpace - 18;
                                        bWidth -= shrink;
                                        bX += shrink / 2;
                                    }
                                    if (sRight) {
                                        const shrink = rSpace - 18;
                                        bWidth -= shrink;
                                        bX -= shrink / 2;
                                    }

                                    return (
                                        <mesh
                                            position={[bX, -height / 2 + THICKNESS + hHeight / 2, depth / 2 - 9]}
                                            castShadow
                                            receiveShadow
                                            material={blendaMaterials}
                                        >
                                            <boxGeometry args={[bWidth, hHeight, 18]} />
                                        </mesh>
                                    );
                                })()}

                                {/* Blendy boczne (dodawane przy skróceniu) */}
                                {(() => {
                                    const config = configUnder || [];
                                    const sLeft = config.some(opt => opt.toLowerCase().includes('skrócona z lewej'));
                                    const sRight = config.some(opt => opt.toLowerCase().includes('skrócona z prawej'));
                                    const hHeight = hoodHeight || 120;
                                    const bDepth = depth - 56;
                                    const bZ = 10; // Center between front (18mm) and back (recessed 20mm) blendas

                                    return (
                                        <>
                                            {sLeft && (
                                                <mesh
                                                    position={[-rimWidth / 2 + (lSpace - 9), -height / 2 + THICKNESS + hHeight / 2, bZ]}
                                                    castShadow
                                                    receiveShadow
                                                    material={blendaMaterials}
                                                >
                                                    <boxGeometry args={[18, hHeight, bDepth]} />
                                                </mesh>
                                            )}
                                            {sRight && (
                                                <mesh
                                                    position={[rimWidth / 2 - (rSpace - 9), -height / 2 + THICKNESS + hHeight / 2, bZ]}
                                                    castShadow
                                                    receiveShadow
                                                    material={blendaMaterials}
                                                >
                                                    <boxGeometry args={[18, hHeight, bDepth]} />
                                                </mesh>
                                            )}
                                        </>
                                    );
                                })()}

                                {/* Blenda tylna (Recessed 20mm to match technical void) */}
                                <mesh
                                    position={[0, -height / 2 + THICKNESS + hHeight / 2, -depth / 2 + 9 + 20]}
                                    castShadow
                                    receiveShadow
                                    material={blendaMaterials}
                                >
                                    <boxGeometry args={[rimWidth, hHeight, 18]} />
                                </mesh>

                                {/* Zabudowa rury wewnątrz szafki - Synchronized Logic */}
                                {(() => {
                                    const hHeight = Math.round(hoodHeight || 150);
                                    const combinedConfig = [...(configUnder || []), ...(configAbove || [])];
                                    const totalShelvesCount = combinedConfig.reduce((acc, opt) => {
                                        if (typeof opt !== 'string') return acc;
                                        const m = opt.match(/(\d+)\s*pół/i);
                                        return m ? parseInt(m[1]) : acc;
                                    }, 0);

                                    const internalH = height - hHeight - (THICKNESS * 3);
                                    const startY = -height / 2 + THICKNESS + hHeight + THICKNESS;

                                    // Używamy tej samej formuły co renderShelvesForGroup:
                                    // spacing = internalH / (count + 1), bez odejmowania grubości półek.
                                    // Segmenty zabudowy mieszczą się dokładnie między półkami.
                                    const absoluteSegments: { start: number, h: number, end: number }[] = [];
                                    if (totalShelvesCount === 0) {
                                        absoluteSegments.push({ start: startY, h: internalH, end: startY + internalH });
                                    } else {
                                        const spacing = internalH / (totalShelvesCount + 1);
                                        for (let j = 0; j <= totalShelvesCount; j++) {
                                            let segStart: number, segH: number;
                                            if (j === 0) {
                                                // Pierwsze pole: od startY do spodu pierwszej półki
                                                segStart = startY;
                                                segH = spacing - THICKNESS / 2;
                                            } else if (j === totalShelvesCount) {
                                                // Ostatnie pole: od góry ostatniej półki do góry wnęki
                                                segStart = startY + j * spacing + THICKNESS / 2;
                                                segH = internalH - j * spacing - THICKNESS / 2;
                                            } else {
                                                // Środkowe pola: między dwiema półkami
                                                segStart = startY + j * spacing + THICKNESS / 2;
                                                segH = spacing - THICKNESS;
                                            }
                                            if (segH > 0) {
                                                absoluteSegments.push({ start: segStart, h: segH, end: segStart + segH });
                                            }
                                        }
                                    }

                                    const cutoutW = hoodCutoutWidth || Math.max(0, width - 76);
                                    const cutoutOffset = hoodCutoutOffset !== undefined ? hoodCutoutOffset : Math.round((width - 36 - cutoutW) / 2);
                                    const cutoutSide = hoodCutoutSide || 'left';
                                    const rimWidth = width - 36;
                                    let xStart = (cutoutSide === 'left') ? -rimWidth / 2 + cutoutOffset : rimWidth / 2 - cutoutOffset - cutoutW;
                                    const pipeCenterX = (xStart + xStart + cutoutW) / 2;


                                    return absoluteSegments.map((segment, i) => {
                                        // Pomijamy segment jeśli nie jest jawnie włączony
                                        if (!pipeSegmentsEnabled || pipeSegmentsEnabled[i] !== true) return null;
                                        const { start, h } = segment;
                                        const yPos = start + h / 2;
                                        return (
                                            <group key={`pipe-box-${i}`}>
                                                {/* Front */}
                                                <mesh position={[pipeCenterX, yPos, 104]} castShadow receiveShadow material={rimMaterial}>
                                                    <boxGeometry args={[206, h, THICKNESS]} />
                                                </mesh>
                                                {/* Boki */}
                                                <mesh position={[pipeCenterX - 94, yPos, -25]} castShadow receiveShadow material={rimMaterial}>
                                                    <boxGeometry args={[THICKNESS, h, 240]} />
                                                </mesh>
                                                <mesh position={[pipeCenterX + 94, yPos, -25]} castShadow receiveShadow material={rimMaterial}>
                                                    <boxGeometry args={[THICKNESS, h, 240]} />
                                                </mesh>
                                            </group>
                                        );
                                    });
                                })()}

                                {/* Plecy (skrócone) */}
                                <mesh
                                    position={[0, hHeight / 2 + 9, backPanelPos[2]]}
                                    castShadow
                                    receiveShadow
                                    material={backPanelMaterials}
                                >
                                    <boxGeometry args={[backPanelWidth, height - hHeight - 22, 3]} />
                                </mesh>

                                {/* Top Rims (Full has hole, standard might overlap slightly but usually hood has full top) */}
                                {isFullTop ? (
                                    <group
                                        position={[0, height / 2 - THICKNESS, -depth / 2 + technicalVoid + bottomRimDepth / 2]}
                                        rotation={[-Math.PI / 2, 0, 0]}
                                    >
                                        <mesh castShadow receiveShadow material={rimMaterials}>
                                            <extrudeGeometry args={[topRimShape, { depth: THICKNESS, bevelEnabled: false, curveSegments: 32 }]} />
                                        </mesh>
                                    </group>
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
                                <Edges color="#d1d5db" threshold={15} />
                            </mesh>
                            <mesh position={topRimBackPos} castShadow receiveShadow material={rimMaterials}>
                                <boxGeometry args={topRimGeoArgs} />
                                <Edges color="#d1d5db" threshold={15} />
                            </mesh>
                        </>
                    )}

                    {/* Standard Back Panel */}
                    <mesh position={backPanelPos} castShadow receiveShadow material={backPanelMaterials}>
                        <boxGeometry args={backPanelGeoArgs} />
                        <Edges color="#d1d5db" threshold={15} />
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
                            // Głębokość wyrównana z korpusem (depth / 2 + 18 / 2)
                            depth / 2 + THICKNESS / 2
                        ]}
                        castShadow
                        receiveShadow
                        material={blendaMaterials}
                    >
                        {/* Width: 520. Height: CabinetHeight. Depth: 18. */}
                        <boxGeometry args={[blendaWidth, height, THICKNESS]} />
                        <Edges color="#d1d5db" threshold={15} />
                    </mesh>
                )
            })()}

            {type === 'dolna-rogowa' && (() => {
                const listwaWidth = 100;
                const katowaWidth = 40;
                const spacerX = cornerOrientation === 'left'
                    ? -width / 2 + (listwaWidth / 2)
                    : width / 2 - (listwaWidth / 2);

                // Ĺšrodek listwy kÄ…towej na 51mm od WEWNÄTRZNEJ krawÄ™dzi listwy dystansowej
                // (Co daje 49mm od zewnÄ™trznej krawÄ™dzi szafki: 100 - 51 = 49)
                // DziÄ™ki temu widoczny pasek to 49 - 9 = 40mm (idealne 4cm)
                const katowaX = cornerOrientation === 'left'
                    ? spacerX - 1
                    : spacerX + 1;

                // Listwa dystansowa rĂłwnolegĹ‚a do plecĂłw, NASUWA SIÄ na koniec boku
                // Skoro bok koĹ„czy siÄ™ na -depth/2, a listwa ma na niego nachodziÄ‡, 
                // to jej przednia krawÄ™dĹş musi byÄ‡ na -depth/2.
                // Zatem Ĺ›rodek listwy (gruboĹ›Ä‡ 18mm) jest na -depth/2 - 9mm.
                const zPos = -depth / 2 - (THICKNESS / 2);

                return (
                    <group position={[0, 0, zPos]}>
                        {/* Listwa dystansowa (tylna) - przykrÄ™cona do czoĹ‚a boku */}
                        <mesh position={[spacerX, 0, 0]} castShadow receiveShadow material={frontMaterials}>
                            <boxGeometry args={[listwaWidth, height, THICKNESS]} />
                            <Edges color="#d1d5db" threshold={15} />
                        </mesh>

                        {/* Listwa kÄ…towa â€“ WIDOCZNA (Kolor frontu) â€“ Srodek na 51mm od krawÄ™dzi boku */}
                        <mesh
                            position={[katowaX, 0, -29]}
                            rotation={[0, Math.PI / 2, 0]}
                            castShadow
                            receiveShadow
                            material={frontMaterials}
                        >
                            <boxGeometry args={[katowaWidth, height, THICKNESS]} />
                        </mesh>

                        {/* Listwa kÄ…towa â€“ TECHNICZNA (Kolor korpusu) â€“ przesuniÄ™ta do wewnÄ…trz */}
                        <mesh
                            position={[
                                cornerOrientation === 'left'
                                    ? katowaX + THICKNESS  // Dla lewej: w prawo od frontowej
                                    : katowaX - THICKNESS, // Dla prawej: w lewo od frontowej
                                0,
                                -29
                            ]}
                            rotation={[0, Math.PI / 2, 0]}
                            castShadow
                            receiveShadow
                            material={blendaMaterials}
                        >
                            <boxGeometry args={[katowaWidth, height, THICKNESS]} />
                        </mesh>
                    </group>
                );
            })()}

            {/* PĂ“ĹKI (Uniwersalne) */}
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
                        const shelfZ = -depth / 2 + technicalVoid + shelf.depth / 2; // Anchored to back panel to leave gap at front

                        let shelfX = 0;
                        if (type === 'dolna-narozna' || type === 'gorna-narozna-gleboka') {
                            shelfX = 0; // Teraz pĂłĹ‚ka idzie po caĹ‚oĹ›ci, wiÄ™c jest na Ĺ›rodku
                        }

                        // Logika otworĂłw w pĂłĹ‚kach dla szafki okapowej
                        // Liczymy od doĹ‚u (i=0 to dolna pĂłĹ‚ka w grupie)
                        const needsHole = type === 'gorna-okapowa' && hasShelfHoles && i < (shelfHoleCount || 0);

                        if (needsHole) {
                            // Obliczamy pozycjÄ™ otworu tak samo jak w wieĹ„cu Ĺ›rodkowym
                            const cutoutW = hoodCutoutWidth || Math.max(0, width - 76);
                            const cutoutOffset = hoodCutoutOffset !== undefined ? hoodCutoutOffset : Math.round((width - 36 - cutoutW) / 2);
                            const cutoutSide = hoodCutoutSide || 'left';
                            const rimWidth = width - 36;

                            let xStart = (cutoutSide === 'left')
                                ? -rimWidth / 2 + cutoutOffset
                                : rimWidth / 2 - cutoutOffset - cutoutW;
                            const xMin = xStart;
                            const xMax = xStart + cutoutW;
                            const holeCenterX = (xMin + xMax) / 2;

                            // Tworzymy ksztaĹ‚t pĂłĹ‚ki z otworem
                            const shelfShape = new THREE.Shape();
                            shelfShape.moveTo(-shelf.width / 2, -shelf.depth / 2);
                            shelfShape.lineTo(shelf.width / 2, -shelf.depth / 2);
                            shelfShape.lineTo(shelf.width / 2, shelf.depth / 2);
                            shelfShape.lineTo(-shelf.width / 2, shelf.depth / 2);
                            shelfShape.lineTo(-shelf.width / 2, -shelf.depth / 2);

                            // OtwĂłr w pĂłĹ‚ce (Ĺ›rodek otworu wzglÄ™dem Ĺ›rodka szafki to holeCenterX)
                            // PĂłĹ‚ka jest wycentrowana w X, wiÄ™c holeCenterX jest poprawnym przesuniÄ™ciem
                            // W Z pĂłĹ‚ka jest przesuniÄ™ta o technicalVoid/2 wzglÄ™dem Ĺ›rodka? 
                            // Nie, shelfZ to absolutna pozycja. 
                            // Ale Shape renderujemy pĹ‚asko i potem pozycjonujemy grupÄ™.
                            // W wieĹ„cu Ĺ›rodkowym bottomRimDepth to depth-technicalVoid.
                            // Tu shelf.depth to teĹĽ depth-technicalVoid minus 20.
                            // PĂłĹ‚ka wyrĂłwnana do tyĹ‚u, Ĺ›rodek pĹ‚ytszej o 20mm pĂłĹ‚ki gubi 10mm.
                            const rimDepth = depth - technicalVoid;
                            const shiftY = (shelf.depth - rimDepth) / 2; // zazwyczaj to -10, co w logice globalnej (-Y = +Z) przesuwa Ĺ›rodek o 10mm do przodu, idealnie w oĹ› otworĂłw wieĹ„cĂłw

                            const holePath = new THREE.Path();
                            holePath.absarc(holeCenterX, shiftY, 75, 0, Math.PI * 2, false);
                            shelfShape.holes.push(holePath);

                            return (
                                <group key={shelf.id} position={[shelfX, yPos - THICKNESS / 2, shelfZ]} rotation={[-Math.PI / 2, 0, 0]}>
                                    <mesh castShadow receiveShadow material={rimMaterials}>
                                        <extrudeGeometry args={[shelfShape, { depth: THICKNESS, bevelEnabled: false, curveSegments: 32 }]} />
                                    </mesh>
                                </group>
                            );
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
                    const topH = height - topStartDistance - THICKNESS; // Ĺšrodek uĹĽytkowej wnÄ™ki (minus gĂłrny wieniec)

                    const bottomH = bottomSpaceHeight;
                    const bottomStartY = -height / 2;

                    return (
                        <>
                            {renderShelvesForGroup(topShelves, topH, topStartY)}
                            {renderShelvesForGroup(bottomShelves, bottomH, bottomStartY)}
                        </>
                    );
                } else if (type === 'gorna-okapowa') {
                    // Dla szafki okapowej pĂłĹ‚ki zaczynajÄ… siÄ™ nad wieĹ„cem Ĺ›rodkowym
                    // Wieniec Ĺ›rodkowy jest nad blendÄ… (hoodHeight)
                    // Pozycja Y startu: -height/2 + THICKNESS (dolny) + hoodHeight + THICKNESS (Ĺ›rodkowy)
                    const internalH = height - (3 * THICKNESS) - (hoodHeight || 150);
                    const startY = -height / 2 + (2 * THICKNESS) + (hoodHeight || 150);

                    return renderShelvesForGroup(generalShelves, internalH, startY);
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
                } else if (type === 'gorna-okapowa' || type?.includes('okapowa')) {
                    const hHeight = Math.round(hoodHeight || 150);
                    const combinedConfig = [...(configUnder || []), ...(configAbove || [])];
                    const totalShelvesCount = combinedConfig.reduce((acc, opt) => {
                        if (typeof opt !== 'string') return acc;
                        const m = opt.match(/(\d+)\s*pół/i);
                        return m ? parseInt(m[1]) : acc;
                    }, 0);

                    const internalH = height - hHeight - (THICKNESS * 3);
                    const spacesCount = totalShelvesCount + 1;

                    let remaining = internalH - (totalShelvesCount * THICKNESS);
                    const spaceHeights: number[] = [];
                    for (let j = 0; j < spacesCount; j++) {
                        const h = Math.round(remaining / (spacesCount - j));
                        spaceHeights.push(h);
                        remaining -= h;
                    }

                    const startY = -height / 2 + THICKNESS + hHeight + THICKNESS;
                    const absoluteSegments: { start: number, h: number, end: number }[] = [];
                    let cursorY = startY;
                    for (const h of spaceHeights) {
                        absoluteSegments.push({ start: cursorY, h: h, end: cursorY + h });
                        cursorY += h + THICKNESS;
                    }

                    const cutoutW = hoodCutoutWidth || Math.max(0, width - 76);
                    const cutoutOffset = hoodCutoutOffset !== undefined ? hoodCutoutOffset : Math.round((width - 36 - cutoutW) / 2);
                    const cutoutSide = hoodCutoutSide || 'left';
                    const rimWidth = width - 36;
                    let xStart = (cutoutSide === 'left') ? -rimWidth / 2 + cutoutOffset : rimWidth / 2 - cutoutOffset - cutoutW;
                    const pipeCenterX = (xStart + xStart + cutoutW) / 2;

                    return (
                        <>
                            {/* Render Shelves Only (Pipe Enclosure is now in carcass group for better visibility) */}
                            {generalShelves.map((shelf, i) => {
                                const segment = absoluteSegments[i];
                                if (!segment) return null;
                                const { end } = segment;
                                const yPos = end + THICKNESS / 2;

                                const shelfZ = -depth / 2 + technicalVoid + shelf.depth / 2;
                                const needsHole = hasShelfHoles && i < (shelfHoleCount || 0);

                                if (needsHole) {
                                    const holeCenterX = pipeCenterX;
                                    const rimDepth = depth - technicalVoid;
                                    const shiftY = (shelf.depth - rimDepth) / 2;

                                    const shelfShape = new THREE.Shape();
                                    shelfShape.moveTo(-shelf.width / 2, -shelf.depth / 2);
                                    shelfShape.lineTo(shelf.width / 2, -shelf.depth / 2);
                                    shelfShape.lineTo(shelf.width / 2, shelf.depth / 2);
                                    shelfShape.lineTo(-shelf.width / 2, shelf.depth / 2);
                                    shelfShape.lineTo(-shelf.width / 2, -shelf.depth / 2);

                                    const holePath = new THREE.Path();
                                    holePath.absarc(holeCenterX, shiftY, 75, 0, Math.PI * 2, false);
                                    shelfShape.holes.push(holePath);

                                    return (
                                        <group key={shelf.id} position={[0, yPos - THICKNESS / 2, shelfZ]} rotation={[-Math.PI / 2, 0, 0]}>
                                            <mesh castShadow receiveShadow material={rimMaterials}>
                                                <extrudeGeometry args={[shelfShape, { depth: THICKNESS, bevelEnabled: false, curveSegments: 32 }]} />
                                            </mesh>
                                        </group>
                                    );
                                }

                                return (
                                    <mesh key={shelf.id} position={[0, yPos, shelfZ]} castShadow receiveShadow material={rimMaterials}>
                                        <boxGeometry args={[shelf.width, THICKNESS, shelf.depth]} />
                                    </mesh>
                                );
                            })}
                        </>
                    );
                } else {
                    const internalH = height - THICKNESS * 2;
                    const startY = -height / 2 + THICKNESS;

                    return renderShelvesForGroup(generalShelves, internalH, startY);
                }
            })()}

            {/* WewnÄ™trzne szuflady Blum dla sĹ‚upka z szufladami wewnÄ™trznymi (pojawiajÄ… siÄ™ z frontami) */}
            {type === 'dolna-lodowka-3' && hasDoors && (() => {
                const drawerH = 170;
                const RIM = 18;

                // Obliczamy dostÄ™pnÄ… wysokoĹ›Ä‡ dla sekcji szuflad (dĂłĹ‚ pod lodĂłwkÄ…)
                // fHeight to wysokoĹ›Ä‡ niszy na lodĂłwkÄ™ (standardowo ok. 1780)
                const fHeight = fridgeSpaceHeight || 1780;
                const shiftUp = ovenBaseHeight === 760 ? 40 : (ovenBaseHeight === 780 ? 60 : 0);

                // WysokoĹ›Ä‡ do spodu wieĹ„ca Ĺ›rodkowego: (RIM + fHeight + shiftUp)
                // DostÄ™pna przestrzeĹ„ od wieĹ„ca dolnego: (RIM + fHeight + shiftUp) - RIM = fHeight + shiftUp
                const availableH = fHeight + shiftUp;

                // Rozmieszczamy 5 szuflad: pierwsza na dole, ostatnia pod samym wieĹ„cem (z marginesem 100mm na gĂłrnÄ… szufladÄ™/wieniec)
                // OdstÄ™p (step) = (DostÄ™pna wysokoĹ›Ä‡ - wysokoĹ›Ä‡ jednej szuflady - margines gĂłrny) / 4
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
                        cargoComponent = <CabinetCargo key={`cargo-main`} position={[0, yOffset, 0]} width={f.width} height={f.height} depth={depth} frontDecorId={frontDecorId || bodyDecorId} offsetY={yOffset - f.height / 2 + height / 2} totalWidth={width} totalHeight={height} showEdges={showEdges} basketCount={type === 'dolna-lodowka-2' ? 6 : undefined} />;
                    } else {
                        const totalHeight = cargoFronts.reduce((sum, f) => sum + f.height, 0) + (cargoFronts.length - 1) * 4;
                        const yOffset = -height / 2 + totalHeight / 2 + 2;

                        let currentY = -totalHeight / 2;
                        cargoComponent = (
                            <CabinetCargo
                                key="cargo-main"
                                position={[0, yOffset, 0]}
                                width={width - 4}
                                height={totalHeight}
                                depth={depth}
                                frontDecorId={frontDecorId || bodyDecorId}
                                totalWidth={width}
                                totalHeight={height}
                                offsetY={yOffset - totalHeight / 2 + height / 2}
                                showEdges={showEdges}
                                basketCount={type === 'dolna-lodowka-2' ? 6 : undefined}
                            >
                                {cargoFronts.map((f, i) => {
                                    const childY = currentY + f.height / 2;
                                    currentY += f.height + 4;
                                    const grainOffsetY = yOffset + childY - f.height / 2 + height / 2;
                                    const material = usePanelMaterial(frontDecorId || bodyDecorId, f.width, f.height, "#ffffff", true, width, height, 0, grainOffsetY);
                                    return (
                                        <mesh key={f.id} position={[0, childY, 0]} castShadow receiveShadow material={material}>
                                            <boxGeometry args={[f.width, f.height, 18]} />
                                        </mesh>
                                    );
                                })}
                            </CabinetCargo>
                        );
                    }
                }

                return (
                    <group position={[0, 0, depth / 2 + 18 / 2 + 2]}>
                        {cargoComponent}
                        {/* Odsunięcie frontu o 1mm od korpusu (szpara), grubość frontu bazowo 18 */}
                        {regularFronts.filter(f => !f.id.includes('listwa-katowa')).map((f, i) => {
                            // Kalkulacja pozycjonowania w osi Y na podstawie kolejnoĹ›ci/id
                            let yOffset = 0;
                            let zOffset = 0;

                            if (f.id.includes('wewnetrzn')) {
                                yOffset = height / 2 - 100 - f.height / 2 - 2; // Pod gĂłrnym wieĹ„cem pionowym (100mm)
                                zOffset = -18; // CofniÄ™cie o 18mm w gĹ‚Ä…b w stosunku do gĹ‚Ăłwnego frontu
                            } else if (f.height === height || f.height === height - 4 || (type?.startsWith('gorna-') && f.height > height - 10) || (golaProfiles.length > 0 && f.height >= height - 30)) {
                                yOffset = golaProfiles.length > 0 ? -12.5 : 0;
                            } else if (type === 'dolna-piekarnik-podblatowa') {
                                yOffset = -height / 2 + f.height / 2 + 2;
                            } else if (!type?.startsWith('gorna-') && type !== 'dolna-narozna' && type !== 'gorna-narozna' && type !== 'dolna-piekarnik' && !type?.startsWith('dolna-lodowka') && frontMeshes.length > 1) {
                                // Gdy w szafce dolnej sÄ… szuflady (sterta), budujemy je w pÄ™tli od doĹ‚u do gĂłry
                                // height = dany front, total u doĹ‚u to akumulacja poprzednich
                                let acc = 0;
                                const isGola = golaProfiles.length > 0;
                                for (let j = 0; j < i; j++) {
                                    acc += frontMeshes[j].height + (isGola ? 29 : 3); // 25mm extra gap for Gola + 3mm or 4mm base
                                }
                                yOffset = -height / 2 + acc + f.height / 2 + 2; // 2mm luzu od doĹ‚u
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
                                // KrawÄ™dĹş frontu to -f.width/2. GruboĹ›Ä‡ boku to 18. Odsuwamy zawias do wewnÄ…trz korpusu o 18mm i margines szpary.
                                const hingeX = -f.width / 2 + 18 + 0.5;
                                return (
                                    <CabinetDoor key={`f-${i}`} position={[-width / 4, yOffset + (f.offsetY || 0), zOffset]} width={f.width} height={f.height} hingeX={hingeX} isRightSide={false} frontDecorId={frontDecorId} offsetY={yOffset + (f.offsetY || 0) - f.height / 2 + height / 2} totalWidth={width} totalHeight={height} showEdges={showEdges}>
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
                                    <CabinetDoor key={`f-${i}`} position={[width / 4, yOffset + (f.offsetY || 0), zOffset]} width={f.width} height={f.height} hingeX={hingeX} isRightSide={true} frontDecorId={frontDecorId} offsetY={yOffset + (f.offsetY || 0) - f.height / 2 + height / 2} totalWidth={width} totalHeight={height} showEdges={showEdges}>
                                        <CabinetHinge position={[hingeX, f.height / 2 - 80, -9]} isRightSide={true} />
                                        <CabinetHinge position={[hingeX, -f.height / 2 + 80, -9]} isRightSide={true} />
                                        {f.height > 900 && <CabinetHinge position={[hingeX, 0, -9]} isRightSide={true} />}
                                        {f.height > 1500 && <CabinetHinge position={[hingeX, -f.height / 4, -9]} isRightSide={true} />}
                                    </CabinetDoor>
                                );
                            }

                            if (type === 'dolna-narozna' || type === 'gorna-narozna' || type === 'gorna-narozna-gleboka') {
                                const blendaWidth = type === 'gorna-narozna' ? 350 : (type === 'gorna-narozna-gleboka' ? 580 : 520);
                                if (f.id.includes('listwa-dyst') || (f.width === 100 && !f.id.includes('drzwi'))) {
                                    // Pasek dystansowy (100mm)
                                    zOffset = -2;
                                    const spacerX = cornerOrientation === 'left'
                                        ? -width / 2 + blendaWidth + 0.3 + (f.width / 2)
                                        : width / 2 - blendaWidth - 0.3 - (f.width / 2);

                                    const gapX = cornerOrientation === 'left'
                                        ? -width / 2 + blendaWidth + 0.15
                                        : width / 2 - blendaWidth - 0.15;

                                    // Listwa kątowa 40mm na zewnątrz przestrzeni korpusu (+Z)
                                    // Dopasowujemy do zielonego obrysu (CollisionRect)
                                    const katowaZOffset = zOffset + 9 + 20;

                                    const katowaX = cornerOrientation === 'left'
                                        ? spacerX + 1
                                        : spacerX - 1;

                                    const katowaX2 = cornerOrientation === 'left'
                                        ? katowaX - 18
                                        : katowaX + 18;

                                    return (
                                        <React.Fragment key={`f-${i}`}>
                                            {/* Szczelina dąb */}
                                            <mesh position={[gapX, yOffset + (f.offsetY || 0), zOffset]} castShadow receiveShadow>
                                                <boxGeometry args={[0.3, f.height, 18]} />
                                                <meshStandardMaterial color="#d4a373" />
                                            </mesh>
                                            {/* Listwa Główna */}
                                            <mesh position={[spacerX, yOffset + (f.offsetY || 0), zOffset]} castShadow receiveShadow material={frontMaterials}>
                                                <boxGeometry args={[f.width, f.height, 18]} />
                                            </mesh>
                                            {/* Listwa Kątowa 1 - PROSTOPADŁA (Depth) - kolor frontu */}
                                            <mesh position={[katowaX, yOffset + (f.offsetY || 0), katowaZOffset]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow material={frontMaterials}>
                                                <boxGeometry args={[40, f.height, 18]} />
                                            </mesh>
                                            {/* Listwa Kątowa 2 - PROSTOPADŁA (Depth) - kolor korpusu (odpad) */}
                                            <mesh
                                                position={[katowaX2, yOffset + (f.offsetY || 0), katowaZOffset]}
                                                rotation={[0, Math.PI / 2, 0]}
                                                castShadow receiveShadow material={bodyMaterial}
                                            >
                                                <boxGeometry args={[40, f.height, 18]} />
                                            </mesh>
                                        </React.Fragment>
                                    );
                                }

                                // Szafka naroĹĽna gĹ‚Ăłwny front: umieszczony jest obok dystansu (dĂłĹ‚) lub zaraz przy blendzie (gĂłra)
                                // Ĺšrodek frontu gĹ‚Ăłwnego: maksymalnie przy krawÄ™dzi bez blendy (minus luzy 2mm).
                                const frontX = cornerOrientation === 'left' ? (width / 2) - (f.width / 2) - 2 : (-width / 2) + (f.width / 2) + 2;

                                // Dolna i gĂłrna szafka naroĹĽna otwierajÄ… siÄ™ po stronie blendy (lub wedĹ‚ug tej samej logiki)
                                const isRightHinge = cornerOrientation === 'right';

                                // Zawias liczymy lokalnie dla komponentu CabinetDoor (ktĂłry sam jest juĹĽ odsuniÄ™ty w X, wiÄ™c hingeX jest wzglÄ™dem zera frontu)
                                const hingeX = isRightHinge ? f.width / 2 - 18 - 0.5 : -f.width / 2 + 18 + 0.5;

                                return (
                                    <CabinetDoor key={`f-${i}`} position={[frontX, yOffset + (f.offsetY || 0), zOffset]} width={f.width} height={f.height} hingeX={hingeX} isRightSide={isRightHinge} frontDecorId={frontDecorId} offsetY={yOffset + (f.offsetY || 0) - f.height / 2 + height / 2} totalWidth={width} totalHeight={height} showEdges={showEdges}>
                                        {/* Zostawiamy tagi CabinetHinge dla spĂłjnoĹ›ci, choÄ‡ obecnie zwracajÄ… null */}
                                        <CabinetHinge position={[hingeX, f.height / 2 - 80, -9]} isRightSide={isRightHinge} />
                                        <CabinetHinge position={[hingeX, -f.height / 2 + 80, -9]} isRightSide={isRightHinge} />
                                    </CabinetDoor>
                                );
                            }

                            // DomyĹ›lny jeden wielki front na Ĺ›rodku caĹ‚ej szerokoĹ›ci
                            // Ustalenie po ktĂłrej stronie zawiasy (dla pojedynczych drzwi)
                            const hasHinges = !f.id.includes('klapa') && (f.id.includes('drzwi') || f.id.includes('szuflady-wewn-dol') || f.id.includes('lodowka-dol') || f.id.includes('lodowka-srodek') || f.id.includes('lodowka-gora') || f.id.includes('piekarnik-dol') || f.id.includes('piekarnik-gora'));
                            let isRightHinge = configUnder.some(c => c.toLowerCase().includes('praw'));
                            if (!isRightHinge && configAbove.some(c => c.toLowerCase().includes('praw'))) isRightHinge = true;
                            if (!isRightHinge && (type === 'dolna-narozna' || type === 'gorna-narozna' || type === 'gorna-narozna-gleboka')) isRightHinge = cornerOrientation === 'right'; // narozna odwraca mechanizm                                
                            const hingeX = isRightHinge ? f.width / 2 - 18 - 0.5 : -f.width / 2 + 18 + 0.5;

                            if (hasHinges) {
                                return (
                                    <CabinetDoor key={`f-${i}`} position={[0, yOffset + (f.offsetY || 0), zOffset]} width={f.width} height={f.height} hingeX={hingeX} isRightSide={isRightHinge} frontDecorId={frontDecorId} offsetY={yOffset + (f.offsetY || 0) - f.height / 2 + height / 2} totalWidth={width} totalHeight={height} showEdges={showEdges}>
                                        <CabinetHinge position={[hingeX, f.height / 2 - 80, -9]} isRightSide={isRightHinge} />
                                        <CabinetHinge position={[hingeX, -f.height / 2 + 80, -9]} isRightSide={isRightHinge} />
                                        {f.height > 900 && <CabinetHinge position={[hingeX, 0, -9]} isRightSide={isRightHinge} />}
                                        {f.height > 1500 && <CabinetHinge position={[hingeX, f.height / 4, -9]} isRightSide={isRightHinge} />}
                                    </CabinetDoor>
                                );
                            } else if (f.id.includes('klapa')) {
                                // Fronty otwierane do gĂłry (siĹ‚owniki)
                                return (
                                    <CabinetFlap key={`f-${i}`} position={[0, yOffset + (f.offsetY || 0), zOffset]} width={f.width} height={f.height} frontDecorId={frontDecorId} offsetY={yOffset + (f.offsetY || 0) - f.height / 2 + height / 2} totalWidth={width} totalHeight={height} showEdges={showEdges} />
                                );
                            } else if (f.id.includes('cargo')) {
                                // Front Cargo PEKA wysuwany w przĂłd
                                return (
                                    <CabinetCargo key={`f-${i}`} position={[0, yOffset + (f.offsetY || 0), zOffset]} width={f.width} height={f.height} depth={depth} frontDecorId={frontDecorId} offsetY={yOffset + (f.offsetY || 0) - f.height / 2 + height / 2} totalWidth={width} totalHeight={height} showEdges={showEdges} basketCount={type === 'dolna-lodowka-2' ? 6 : undefined} />
                                );
                            } else {
                                // Sprawdzamy czy to szuflada
                                // Uznajemy za szufladÄ™ elementy generowane z konfiguracji szuflad
                                const isDrawer = f.id.includes('szuflad') || (!hasHinges && !f.id.includes('klapa') && f.width > 200 && f.height > 100 && type !== 'dolna-narozna' && type !== 'gorna-narozna' && !type?.startsWith('dolna-lodowka') && type !== 'dolna-piekarnik');

                                if (isDrawer) {
                                    const isThreeDrawers = configUnder.some(o => o === '3 szuflady');
                                    const hasGola = golaProfiles.length > 0;
                                    // Znajdujemy czy to najwyĹĽsza szuflada w zestawie
                                    const drawerFronts = regularFronts.filter(rf => rf.id.includes('szuflad'));
                                    const isTopDrawer = drawerFronts[drawerFronts.length - 1]?.id === f.id;

                                    return (
                                        <CabinetDrawer key={`f-${i}`} position={[0, yOffset + (f.offsetY || 0), zOffset]} width={f.width} height={f.height} depth={depth} frontDecorId={frontDecorId} offsetY={yOffset + (f.offsetY || 0) - f.height / 2 + height / 2} totalWidth={width} totalHeight={height} showEdges={showEdges} isThreeDrawers={isThreeDrawers} hasGola={hasGola} isTopDrawer={isTopDrawer} />
                                    );
                                }

                                // Renderujemy jako pĹ‚aski front
                                return (
                                    <group key={`f-${i}`} position={[0, yOffset + (f.offsetY || 0), zOffset]}>
                                        <FlatFront
                                            decorId={frontDecorId}
                                            width={f.width}
                                            height={f.height}
                                            bodyColor={bodyColor || "#ffffff"}
                                            totalWidth={width}
                                            totalHeight={height}
                                            offsetX={0}
                                            offsetY={yOffset + (f.offsetY || 0) - f.height / 2 + height / 2}
                                        />
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

                <ambientLight intensity={0.5} />
                <hemisphereLight intensity={0.4} groundColor="#000000" color="#ffffff" />
                <directionalLight
                    position={[500, 3000, 1000]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize={[4096, 4096]}
                    shadow-bias={-0.00005}
                />
                <directionalLight position={[-1000, 1000, -1000]} intensity={0.4} />


                {mainCabinetGroup}
            </Canvas>
        </div>
    );
}

