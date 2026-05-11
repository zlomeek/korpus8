import { Cabinet } from "@/data/cabinets";

const THICKNESS = 18;

export interface PricingSettings {
    pricePerM2Body: number;
    pricePerM2Back: number;
    pricePerLeg: number;
    pricePerM2Countertop?: number;
    pricePerMLGolaL?: number;
    pricePerMLGolaC?: number;
}

export interface CalculationResult {
    totalM2Body: number;
    totalM2Back: number;
    boardCost: number;
    backCost: number;
    legsCount: number;
    legsCost: number;
    golaCost: number;
    total: number;
}

export const defaultPricingSettings: PricingSettings = {
    pricePerM2Body: 200,
    pricePerM2Back: 30,
    pricePerLeg: 4,
    pricePerM2Countertop: 250,
    pricePerMLGolaL: 60,
    pricePerMLGolaC: 85,
};

export function calculateCabinet(cabinet: Cabinet, settings: PricingSettings = defaultPricingSettings): CalculationResult {
    if (cabinet.id.startsWith('blat-')) {
        const area = (cabinet.width / 1000) * (cabinet.depth / 1000);
        let cost = area * (settings.pricePerM2Countertop || 250);

        if ((cabinet as any).isCustomWidth) {
            cost = cost * 1.5;
        }

        return {
            totalM2Body: Number(area.toFixed(4)),
            totalM2Back: 0,
            boardCost: Number(cost.toFixed(2)),
            backCost: 0,
            legsCount: 0,
            legsCost: 0,
            golaCost: 0,
            total: Number(cost.toFixed(2))
        };
    }

    let totalM2Body = 0;
    let totalM2Back = 0;
    let golaCost = 0;

    // STRICT RULE: Cabinet consists ONLY of fixed elements.
    // We ignore cabinet.elements and calculate based on master dimensions.
    // Check for isFullTop in cabinet object (casted to any to avoid type error if interface not updated)
    const isFullTop = (cabinet as any).isFullTop || false;
    const config = (cabinet as any).configuration || "";
    const orientation = (cabinet as any).cornerOrientation || "right"; // Default to right
    const frontWidth = (cabinet as any).frontWidth || 600; // Default to 600mm
    const fridgeSpaceHeight = (cabinet as any).fridgeSpaceHeight || 1780; // Default to 1780mm
    const ovenSpaceHeight = (cabinet as any).ovenSpaceHeight || 590;
    const configUnder = (cabinet as any).configUnder || [];
    const configAbove = (cabinet as any).configAbove || [];
    const microwaveSpaceHeight = (cabinet as any).microwaveSpaceHeight || 380;
    const ovenBaseHeight = (cabinet as any).ovenBaseHeight || 720;
    const width2 = (cabinet as any).width2 || 900;

    const elementsToCalculate = generateFixedElements(
        cabinet.width,
        cabinet.height,
        cabinet.depth,
        isFullTop,
        config,
        cabinet.id,
        orientation,
        frontWidth,
        fridgeSpaceHeight,
        ovenSpaceHeight,
        configUnder,
        configAbove,
        microwaveSpaceHeight,
        ovenBaseHeight,
        width2,
        (cabinet as any).hasFronts || false,
        (cabinet as any).frontMaterial || 'Płyta laminowana 18mm',
        (cabinet as any).splitCargoFront || false,
        (cabinet as any).hoodHeight || 150,
        (cabinet as any).hoodCutoutSide || 'left',
        (cabinet as any).hoodCutoutOffset !== undefined ? (cabinet as any).hoodCutoutOffset : Math.round((cabinet.width - 36 - ((cabinet as any).hoodCutoutWidth || (cabinet.width - 76))) / 2),
        (cabinet as any).hoodCutoutWidth || (cabinet.width - 76),
        (cabinet as any).hoodCutoutDepth || 280,
        (cabinet as any).hoodHoleSide || 'left',
        (cabinet as any).hoodHoleOffset || 95,
        (cabinet as any).hasHoodHoleTop !== undefined ? (cabinet as any).hasHoodHoleTop : false,
        (cabinet as any).hasShelfHoles || false,
        (cabinet as any).shelfHoleCount || 0,
        (cabinet as any).extendFrontDown || false,
        (cabinet as any).depthRogowa || false
    );

    elementsToCalculate.forEach((el) => {
        // Convert mm to m (divide by 1000)
        // Area in m2 = (w_mm * d_mm) / 1,000,000
        const w = el.width || 0;
        const h = el.height || 0;
        const d = el.depth || 0;

        let areaMM2 = 0;

        // Calculate area based on which dimensions are present
        const isFartuchOrBlenda = el.id?.includes('fartuch') || el.id?.includes('blenda') || el.id?.includes('listwa');

        if (isFartuchOrBlenda && el.width && el.height) {
            areaMM2 = w * h;
        } else if (el.width && el.depth) {
            areaMM2 = w * d;
        } else if (el.height && el.depth) {
            areaMM2 = h * d;
        } else if (el.width && el.height) {
            areaMM2 = w * h;
        }

        const areaM2 = areaMM2 / 1000000;

        if ((el as any).type === 'gola-profile') {
            const pricePerM = (el as any).variant === 'C' ? (settings.pricePerMLGolaC || 85) : (settings.pricePerMLGolaL || 60);
            golaCost += ((el as any).width / 1000) * pricePerM;
        } else {
            // Note: For custom generated parts with both width and depth that are not standard shapes,
            // their calculated area based on bounding box width x depth will be correctly used.

            // We check both ID and Name to be safe, case-insensitive
            // EXCEPTION: "Plecy 18mm" is structural board, so it should count as Body, not Back (HDF).
            const isStructureBack = el.name.includes("18mm") || el.id.includes("18mm");
            const isBack = !isStructureBack && (el.id.toLowerCase().includes("plecy") || el.name.toLowerCase().includes("plecy"));

            if (isBack) {
                totalM2Back += areaM2;
            } else {
                totalM2Body += areaM2;
            }
        }
    });

    let boardCost = totalM2Body * settings.pricePerM2Body;
    
    // Apply custom width premium (1.5x) ONLY to board cost
    if ((cabinet as any).isCustomWidth) {
        boardCost = boardCost * 1.5;
    }

    const backCost = totalM2Back * settings.pricePerM2Back;

    // Legs calculation based on cabinet width
    let legsCount = 0;
    const width = cabinet.width; // master width in mm

    if (cabinet.id.includes('gorna') || cabinet.id === 'fartuch-kuchenny' || cabinet.id === 'blenda-meblowa' || cabinet.id.startsWith('blat-')) {
        legsCount = 0;
    } else if (cabinet.id === 'dolna-narozna-90') {
        legsCount = 8;
    } else if (width < 240) {
        legsCount = 2;
    } else if (width >= 240 && width <= 850) {
        legsCount = 4;
    } else if (width >= 851 && width <= 1200) {
        legsCount = 6;
    } else if (width > 1200) {
        legsCount = 6;
    }

    const legsCost = legsCount * settings.pricePerLeg;
    const total = boardCost + backCost + legsCost + golaCost;

    return {
        totalM2Body: Number(totalM2Body.toFixed(4)),
        totalM2Back: parseFloat(totalM2Back.toFixed(6)),
        boardCost: Number(boardCost.toFixed(2)),
        backCost: parseFloat(backCost.toFixed(2)),
        legsCount,
        legsCost: parseFloat(legsCost.toFixed(2)),
        golaCost: parseFloat(golaCost.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
    };
}

export function generateFixedElements(
    width: number,
    height: number,
    depth: number,
    isFullTop: boolean = false,
    configuration: string = "",
    cabinetId: string = "",
    cornerOrientation: 'left' | 'right' = 'right',
    frontWidth: number = 600,
    fridgeSpaceHeight: number = 1800,
    ovenSpaceHeight: number = 590,
    configUnder: string[] = [],
    configAbove: string[] = [],
    microwaveSpaceHeight: number = 380,
    ovenBaseHeight: number = 720,
    width2: number = 900,
    hasFronts: boolean = false,
    frontMaterial: string = "",
    splitCargoFront: boolean = false,
    hoodHeight: number = 150,
    hoodCutoutSide: 'left' | 'right' = 'left',
    hoodCutoutOffset: number = 20,
    hoodCutoutWidth: number = 500,
    hoodCutoutDepth: number = 280,
    hoodHoleSide: 'left' | 'right' = 'left',
    hoodHoleOffset: number = 95,
    hasHoodHoleTop: boolean = false,
    hasShelfHoles: boolean = false,
    shelfHoleCount: number = 0,
    extendFrontDown: boolean = false,
    depthRogowa: boolean = false,
    pipeSegmentsEnabled?: boolean[]
): any[] {
    if (cabinetId.startsWith("blat-") || cabinetId === 'blenda-meblowa' || cabinetId === 'fartuch-kuchenny' || cabinetId === 'gorna-listwa-podszafkowa' || cabinetId === 'gorna-listwa-miedzy-szafkowa') {
        let name = "Element";
        if (cabinetId.startsWith("blat-")) name = "Blat";
        else if (cabinetId === "blenda-meblowa") name = "Blenda meblowa";
        else if (cabinetId === "fartuch-kuchenny") name = "Fartuch kuchenny";
        else if (cabinetId.includes("listwa")) name = "Listwa";

        return [{
            id: cabinetId,
            name: name,
            width: width,
            height: height,
            depth: depth
        }];
    }

    const elements = [];
    const isTallCabinet = cabinetId.includes('lodowka') || cabinetId.includes('piekarnik');
    let technicalVoid = (cabinetId.startsWith('dolna-') || isTallCabinet) ? 50 : 20;

    // Jeśli wymuszono głębokość rogowa (540mm z 30mm prześwitem)
    if (depthRogowa || cabinetId === 'dolna-rogowa') {
        technicalVoid = 30;
    }

    // Obliczamy właściwości frontu na początku, aby były dostępne dla wszystkich typów szafek
    const isUpper = cabinetId.startsWith('gorna-');
    const frontHeightBase = height - 4;
    const finalFrontHeight = (isUpper && extendFrontDown) ? frontHeightBase + 22 : frontHeightBase;
    const frontOffsetY = (isUpper && extendFrontDown) ? -11 : 0;

    if (cabinetId === 'dolna-narozna-90' || cabinetId === 'gorna-narozna-90') {
        elements.push(
            { id: "bok-lewy", name: "Bok lewy", height: height, depth: depth },
            { id: "bok-prawy", name: "Bok prawy", height: height, depth: depth },
            { id: "wieniec-dolny", name: "Wieniec dolny", width: width - 18 - 20, depth: width2 - 18 - 18 }, // Skrócone o 18mm na lewe plecy, i o 20mm z lewej na prawe plecy
            { id: "wieniec-gorny", name: "Wieniec górny", width: width - 18 - 20, depth: width2 - 18 - 18 }, // Skrócone o 18mm na lewe plecy, i o 20mm z lewej na prawe plecy
            { id: "plecy-lewe", name: "Plecy lewe 18mm", width: width - 18, height: height - 4 }, // Zewnętrzne wymiary pleców lewych opierające się o boki
            { id: "plecy-prawe", name: "Plecy prawe wpuszczane", width: width2 - 18 - 18 - 3, height: height - 4 }
        );
    } else {
        // 1. Bok lewy
        elements.push({
            id: 'bok-lewy',
            name: 'Bok lewy',
            height: height,
            depth: depth
        });

        // 2. Bok prawy
        elements.push({
            id: 'bok-prawy',
            name: 'Bok prawy',
            height: height,
            depth: depth
        });

        // 3. Wieniec dolny
        elements.push({
            id: 'wieniec-dolny',
            name: cabinetId === 'gorna-okapowa' ? `Wieniec dolny (Wycięcie: ${hoodCutoutWidth}x${hoodCutoutDepth})` : 'Wieniec dolny',
            width: width - 36,
            depth: cabinetId === 'gorna-okapowa' ? depth : depth - technicalVoid
        });

        if (cabinetId === 'dolna-lodowka' || cabinetId === 'dolna-lodowka-2' || cabinetId === 'dolna-lodowka-3' || cabinetId === 'dolna-lodowka-4') {
            if (cabinetId === 'dolna-lodowka' && (ovenBaseHeight === 760 || ovenBaseHeight === 780)) {
                elements.push({
                    id: 'wieniec-dolny-dodatkowy',
                    name: 'Wieniec dolny dodatkowy',
                    width: width - 36,
                    depth: depth - technicalVoid
                });
                elements.push({
                    id: 'plecy-dol-dodatkowe',
                    name: 'Plecy (szpara dolna)',
                    width: width - 4,
                    height: ovenBaseHeight === 760 ? 56 : 76 // 60/80 mm full distance, minus 4mm
                });
            }

            // ... (Logic for dolna-lodowka remains same)
            elements.push({
                id: 'wieniec-srodkowy',
                name: 'Wieniec środkowy',
                width: width - 36,
                depth: depth - technicalVoid
            });

            if (cabinetId === 'dolna-lodowka-2' || cabinetId === 'dolna-lodowka-3' || cabinetId === 'dolna-lodowka-4') {
                // Pełne plecy od góry do dołu (cargo i szuflady wewnętrzne)
                elements.push({
                    id: 'plecy',
                    name: 'Plecy',
                    width: width - 4,
                    height: height - 4
                });
            } else {
                // Oryginalna lodówka — plecy tylko w górnej sekcji
                const topSpaceHeight = height - fridgeSpaceHeight - 18 - 18;
                if (topSpaceHeight > 0) {
                    elements.push({
                        id: 'plecy-gora',
                        name: 'Plecy (góra)',
                        width: width - 4,
                        height: topSpaceHeight + 32
                    });
                }
            }
        } else if (cabinetId === 'dolna-piekarnik') {
            // OVEN TOWER LOGIC

            // 1. Rims
            // Bottom was added.
            // Under Oven Rim: At 720mm (standard base logic) or fixed?
            // Let's assume 720mm bottom space (standard base).
            // If bottom rim (18) + space (X) + rim (18) = 720?? Usually 720 is body height.
            // For tall cabinets, the oven is usually at a comfortable height. 
            // 720mm is typical for "szafka dolna" height. So oven sits on top of a 720 base.
            // So Under Rim should be at height 720 (top of rim) or something.
            // Let's stick to 720mm space.

            const isLoweredOven = configUnder.includes('Obniżenie piekarnika o 1 szufladę (14 cm)');
            const bottomSpaceH = isLoweredOven ? (ovenBaseHeight - 140) : ovenBaseHeight;

            elements.push({
                id: 'wieniec-srodkowy-dol',
                name: 'Wieniec środkowy (pod piekarnikiem)',
                width: width - 36,
                depth: depth - technicalVoid
            });

            elements.push({
                id: 'wieniec-srodkowy-gora',
                name: 'Wieniec środkowy (nad piekarnikiem)',
                width: width - 36,
                depth: depth - technicalVoid
            });

            elements.push({
                id: 'wieniec-srodkowy-mikrofala',
                name: 'Wieniec środkowy (nad mikrofalką)',
                width: width - 36,
                depth: depth - technicalVoid
            });

            // Configs Under - Add shelves/drawers to element list? 
            // Technically "Cabinet consists ONLY of fixed elements".
            // Drawers are hardware/fronts, usually not body parts.
            // But Shelves ARE body parts.
            // Półki są dodawane przez główny blok pod spodem (unikanie duplikatów w przypadku wybrania 2x półki na górze i 2x u dołu generującego 8 półek łącznie)

            // Back Panel - Split (No back behind oven)
            // Bottom Portion (up to 720mm)
            // Assuming back starts from bottom 0 to 720. 
            // Standard back is usually h-4. For split, we might want full coverage of the cabinet body parts.
            // Let's assume Bottom Back covers the bottom section fully.
            elements.push({
                id: 'plecy-dol',
                name: 'Plecy (dół)',
                width: width - 4,
                height: bottomSpaceH - 2 // Minus slight margin? Or full? Let's say -2 for bottom gap.
            });

            // Top Portion (Above Microwave)
            // Starts at bottomSpaceH + ovenSpaceHeight (590) + 18 (rim) + microwaveSpaceHeight + 18 (rim)? No, let's just consider the spaces.
            // Actually, the space from the very bottom the the top of the microwave is:
            // bottomSpaceH + ovenSpaceHeight + THICKNESS + microwaveSpaceHeight.
            const topBackHeight = height - (bottomSpaceH + ovenSpaceHeight + 18 + microwaveSpaceHeight) - 2; // Minus 2 for top gap

            if (topBackHeight > 0) {
                elements.push({
                    id: 'plecy-gora-nad-mikrofala',
                    name: 'Plecy (góra nad mikrofalką)',
                    width: width - 4,
                    height: topBackHeight
                });
            }

        } else if (cabinetId === 'gorna-okapowa') {
            const shortenLeft = configUnder.some(opt => opt.toLowerCase().includes('skrócona z lewej'));
            const shortenRight = configUnder.some(opt => opt.toLowerCase().includes('skrócona z prawej'));

            const rimWidth = width - 36;
            const cWidth = hoodCutoutWidth || (width - 76);
            const cOffset = hoodCutoutOffset !== undefined ? hoodCutoutOffset : Math.round((rimWidth - cWidth) / 2);
            const lSpace = (hoodCutoutSide === 'left') ? cOffset : (rimWidth - cOffset - cWidth);
            const rSpace = (hoodCutoutSide === 'right') ? cOffset : (rimWidth - cOffset - cWidth);

            let blendaWidth = rimWidth;

            if (shortenLeft) {
                blendaWidth -= (lSpace - 18);
            }
            if (shortenRight) {
                blendaWidth -= (rSpace - 18);
            }

            elements.push({
                id: 'wieniec-srodkowy',
                name: 'Wieniec nad okapem (Otwór fi 150)',
                width: width - 36,
                depth: depth - technicalVoid
            });
            elements.push({
                id: 'blenda-okap',
                name: 'Blenda przednia okapu',
                width: blendaWidth,
                height: hoodHeight,
                depth: 18,
                material: frontMaterial || 'Płyta laminowana 18mm'
            });

            if (shortenLeft) {
                elements.push({
                    id: 'blenda-okap-boczna-lewa',
                    name: 'Blenda boczna okapu lewa',
                    width: depth - 56,
                    height: hoodHeight,
                    depth: 18,
                    material: frontMaterial || 'Płyta laminowana 18mm'
                });
            }

            if (shortenRight) {
                elements.push({
                    id: 'blenda-okap-boczna-prawa',
                    name: 'Blenda boczna okapu prawa',
                    width: depth - 56,
                    height: hoodHeight,
                    depth: 18,
                    material: frontMaterial || 'Płyta laminowana 18mm'
                });
            }

            elements.push({
                id: 'blenda-okap-tyl',
                name: 'Blenda tylna okapu',
                width: width - 36,
                height: hoodHeight,
                depth: 18,
                material: frontMaterial || 'Płyta laminowana 18mm'
            });

            // Zabudowa rury (Blendy pionowe nad okapem)
            const totalShelves = configUnder.reduce((acc, opt) => {
                const m = opt.match(/(\d+)\s*pół/i);
                return m ? parseInt(m[1]) : acc;
            }, 0);

            if (totalShelves > 0) {
                const hHeight = hoodHeight || 150;
                const internalH = height - hHeight - (THICKNESS * 3);
                const spacesCount = totalShelves + 1;
                const holesToDraw = totalShelves + 1; // Show all levels

                // Distribute total space into integers
                let remainingSpace = internalH - (totalShelves * THICKNESS);
                const spaceHeights: number[] = [];
                for (let i = 0; i < spacesCount; i++) {
                    const h = Math.round(remainingSpace / (spacesCount - i));
                    spaceHeights.push(h);
                    remainingSpace -= h;
                }

                for (let i = 0; i < holesToDraw; i++) {
                    // Jeśli segment nie jest jawnie włączony (true), pomijamy
                    if (!pipeSegmentsEnabled || pipeSegmentsEnabled[i] !== true) continue;
                    const currentSpaceH = spaceHeights[i];
                    elements.push({
                        id: `zabudowa-rury-przod-${i}`,
                        name: `Zabudowa rury - przód (poziom ${i + 1})`,
                        width: 206,
                        height: currentSpaceH,
                        depth: 18,
                        material: frontMaterial || 'Płyta laminowana 18mm'
                    });
                    elements.push({
                        id: `zabudowa-rury-bok-L-${i}`,
                        name: `Zabudowa rury - bok lewy (poziom ${i + 1})`,
                        width: 240,
                        height: currentSpaceH,
                        depth: 18,
                        material: frontMaterial || 'Płyta laminowana 18mm'
                    });
                    elements.push({
                        id: `zabudowa-rury-bok-P-${i}`,
                        name: `Zabudowa rury - bok prawy (poziom ${i + 1})`,
                        width: 240,
                        height: currentSpaceH,
                        depth: 18,
                        material: frontMaterial || 'Płyta laminowana 18mm'
                    });
                }
            }
        } else if (cabinetId === 'dolna-piekarnik-podblatowa') {
            elements.push({
                id: 'wieniec-srodkowy',
                name: 'Wieniec pod piekarnik',
                width: width - 36,
                depth: depth - technicalVoid
            });

            // Plecy góra-dół: Tylko pod piekarnikiem za szufladą
            const bottomBackHeight = height - ovenSpaceHeight - 4; // minus 4mm luzu
            if (bottomBackHeight > 0) {
                elements.push({
                    id: 'plecy-dol',
                    name: 'Plecy (dół)',
                    width: width - 4,
                    height: bottomBackHeight
                });
            }
        }

        // 4. WIENIEC GÓRNY / WIEŃCE GÓRNE
        // ... (rest logic)
        if (cabinetId === 'dolna-zlew') {
            elements.push({
                id: 'wieniec-gorny-przod-pion',
                name: 'Wieniec górny pionowy (przód)',
                width: width - 36,
                height: 100,
                depth: 18
            });
            elements.push({
                id: 'wieniec-gorny-tyl-pion',
                name: 'Wieniec górny pionowy (tył)',
                width: width - 36,
                height: 100,
                depth: 18
            });
        } else if (isFullTop) {
            elements.push({
                id: 'wieniec-gorny-pelny',
                name: cabinetId === 'gorna-okapowa' ? 'Wieniec górny (pełny) (Otwór fi 150)' : 'Wieniec górny (pełny)',
                width: width - 36,
                depth: depth - technicalVoid
            });
        } else {
            // Standard Top Rims
            elements.push({
                id: 'wieniec-gorny-przod',
                name: 'Wieniec górny (przód)',
                width: width - 36,
                depth: 100
            });

            elements.push({
                id: 'wieniec-gorny-tyl',
                name: 'Wieniec górny (tył)',
                width: width - 36,
                depth: 100
            });
        }

        // 5. Plecy
        if (cabinetId === 'dolna-zlew') {
            elements.push({
                id: 'plecy-18mm',
                name: 'Plecy 18mm',
                width: width - 36,
                height: 150,
                depth: 18
            });
        } else if (cabinetId.startsWith('dolna-lodowka') || cabinetId === 'dolna-piekarnik') {
            // Handled inside specific blocks
        } else if (cabinetId === 'gorna-okapowa') {
            elements.push({
                id: 'plecy',
                name: 'Plecy',
                width: width - 4,
                height: height - hoodHeight - 22
            });
        } else {
            // Standard Back
            elements.push({
                id: 'plecy',
                name: 'Plecy',
                width: width - 4,
                height: height - 4
            });
        }

        if (cabinetId === 'dolna-narozna' || cabinetId === 'gorna-narozna' || cabinetId === 'gorna-narozna-gleboka') {
            let blendaWidth = 520;
            if (cabinetId === 'gorna-narozna') blendaWidth = 350;
            if (cabinetId === 'gorna-narozna-gleboka') blendaWidth = 580;

            elements.push({
                id: 'blenda-slepa',
                name: 'Blenda (ślepy front)',
                width: blendaWidth,
                height: height,
                depth: 18
            });
        }

    } // Zakończenie bloku else dla standardowego korpusu

    // Półki (Shelves) - Universal for all cabinets and pillars
    let allConfigs = [
        ...(configUnder ? configUnder.map(c => ({ text: c, section: 'under' })) : []),
        ...(configAbove ? configAbove.map(c => ({ text: c, section: 'above' })) : [])
    ];
    // Jeśli nie ma przypisanych podziałów under/above, sprawdźmy główne configuration
    if (allConfigs.length === 0 && configuration) {
        allConfigs.push({ text: configuration, section: 'under' });
    }

    if (cabinetId === 'dolna-lodowka-4') {
        // Wymuszona ilość 8 półek dla słupka spiżarkowego (tylko w dolnej przestrzeni)
        allConfigs = allConfigs.filter(c => !(c.section === 'under' && c.text.toLowerCase().includes('półk')));
        allConfigs.push({ text: '8 półek', section: 'under' });
    }

    const uniqueConfigs: { text: string, section: string }[] = [];
    allConfigs.forEach(config => {
        // Prevent duplicate string generation
        if (!uniqueConfigs.some(uc => uc.text === config.text && uc.section === config.section)) {
            uniqueConfigs.push(config);
        }
    });

    uniqueConfigs.forEach(opt => {
        const lowerOpt = opt.text.toLowerCase();
        if (lowerOpt.includes('półka') || lowerOpt.includes('półki') || lowerOpt.includes('półek')) {
            let count = 1;
            if (lowerOpt.includes('2')) count = 2;
            else if (lowerOpt.includes('3')) count = 3;
            else if (lowerOpt.includes('4')) count = 4;
            else if (lowerOpt.includes('5')) count = 5;
            else if (lowerOpt.includes('6')) count = 6;
            else if (lowerOpt.includes('7')) count = 7;
            else if (lowerOpt.includes('8')) count = 8;
            else if (lowerOpt.includes('9')) count = 9;
            else if (lowerOpt.includes('10')) count = 10;

            for (let i = 0; i < count; i++) {
                // Wymiary półki: standardowo szerokość - 36, głębokość - (technicalVoid + 20) (daje 490 dla 560 i 2cm luzu z przodu)
                let shelfWidth = width - 36;
                let shelfDepth = depth - (technicalVoid + 20);

                if (cabinetId === 'gorna-narozna-gleboka') {
                    // W szafce narożnej górnej głębokiej półka idzie po całości wnęki, odliczamy tylko boki
                    shelfWidth = width - 36;
                    shelfDepth = depth - 20;
                }

                // Półki w słupku piecowym dzieli się na górne (nad) i dolne (pod)
                // W słupku na lodówkę podobnie - oddzielne z configAbove i configUnder
                const suffixId = opt.section === 'above' ? '-gora' : (cabinetId.includes('piekarnik') || cabinetId.includes('lodowka') ? '-dol' : '');
                const suffixName = opt.section === 'above' ? ' (górna)' : (cabinetId.includes('piekarnik') || cabinetId.includes('lodowka') ? ' (dolna)' : '');
                if (cabinetId === 'dolna-narozna-90') {
                    // Półka L-CNC: wycinana z kwadratu, wymiary to obwód L-kształtu (jak wieniec)
                    elements.push({
                        id: `polka-${i}${suffixId}`,
                        name: `Półka ${i + 1}${suffixName}`,
                        width: width - 36,
                        depth: width2 - 36,
                        type: 'polka'
                    });
                } else {
                    elements.push({
                        id: `polka-${i}${suffixId}`,
                        name: `Półka ${i + 1}${suffixName}`,
                        width: shelfWidth,
                        depth: shelfDepth,
                        type: 'polka'
                    });
                }
            }
        }
    });


    if (hasFronts) {
        // Obliczamy szerokość bazy dla frontów
        const fw = width;
        const fh = height;
        const isUpper = cabinetId.startsWith('gorna-');
        let configsToParse = configUnder;
        if (!configsToParse || configsToParse.length === 0) configsToParse = [configuration];

        // Wyjątki dla naroznych
        if (cabinetId === 'dolna-narozna-90' || cabinetId === 'gorna-narozna-90') {
            // Dla szafek narożnych 90 (L) zawsze używamy Pary drzwi (brak łamanych)
            const fW_L = width2 - depth - 4 - 18;
            const fW_P = width - depth - 4;
            elements.push({ id: 'front-drzwi-lewy', name: 'Front drzwi lewy', width: fW_L, height: finalFrontHeight, offsetY: frontOffsetY, type: 'front', material: frontMaterial });
            elements.push({ id: 'front-drzwi-prawy', name: 'Front drzwi prawy', width: fW_P, height: finalFrontHeight, offsetY: frontOffsetY, type: 'front', material: frontMaterial });
        } else if (cabinetId === 'dolna-narozna' || cabinetId === 'gorna-narozna' || cabinetId === 'gorna-narozna-gleboka') {
            let blendaWidth = 520;
            if (cabinetId === 'gorna-narozna') blendaWidth = 350;
            if (cabinetId === 'gorna-narozna-gleboka') blendaWidth = 580;

            if (cabinetId === 'gorna-narozna' || cabinetId === 'gorna-narozna-gleboka') {
                // Szafka górna narożna - bez listew dystansowych, front dochodzi z miniluzem bezpośrednio do blendy
                const doorWidth = width - blendaWidth - 4;
                elements.push({ id: 'front-drzwi', name: 'Front', width: doorWidth, height: finalFrontHeight, offsetY: frontOffsetY, type: 'front', material: frontMaterial });
            } else {
                // Szafka dolna narożna
                // Front dołączany do blendy (minus 100mm na listwę dystansową, minus blenda)
                const doorWidth = width - blendaWidth - 100 - 4;
                elements.push({ id: 'front-drzwi', name: 'Front', width: doorWidth, height: finalFrontHeight, offsetY: frontOffsetY, type: 'front', material: frontMaterial });

                // Listwa dystansowa 100mm (widoczna z pszodu)
                elements.push({ id: 'front-listwa-dyst', name: 'Listwa dystansowa', width: 100, height: height, type: 'front', material: frontMaterial });

                // Listwa kątowa 40mm (przykręcana prostopadle z tyłu listwy dystansowej w literę T) - potrzebne 2 sztuki do stworzenia kątownika/podparcia
                elements.push({ id: 'front-listwa-katowa-1', name: 'Listwa kątowa (front)', width: 40, height: height, type: 'front', material: frontMaterial });
                elements.push({ id: 'front-listwa-katowa-2', name: 'Listwa kątowa', width: 40, height: height, type: 'front', material: frontMaterial });
            }
        } else if (cabinetId === 'dolna-rogowa') {
            // Szafka dolna rogowa (620mm) - front standardowy (ok 616mm)
            elements.push({ id: 'front-drzwi', name: 'Front', width: width - 4, height: finalFrontHeight, offsetY: frontOffsetY, type: 'front', material: frontMaterial });

            // Listwa dystansowa 100mm (Z TYŁU)
            elements.push({ id: 'front-listwa-dyst-tyl', name: 'Listwa dystansowa (tył)', width: 100, height: height, type: 'listwa', material: frontMaterial });

            // Listwa kątowa 40mm (Z TYŁU) - 2 sztuki
            elements.push({ id: 'front-listwa-katowa-tyl-1', name: 'Listwa kątowa (tył) (front)', width: 40, height: height, type: 'listwa', material: frontMaterial });
            elements.push({ id: 'front-listwa-katowa-tyl-2', name: 'Listwa kątowa (tył)', width: 40, height: height, type: 'listwa', material: frontMaterial });
        } else if (cabinetId.startsWith('dolna-lodowka')) {
            // Trzy fronty - dolny (najczęściej zamrażarka), środkowy (chłodziarka) i górny
            // Wysokość dolnego zależy od wariantu wysokości korpusów dolnych (ovenBaseHeight)
            // Dla dolna-lodowka dodawana jest nowa szczelina i front wydłuża się w dół, dla cargo środek wędruje do góry
            let fBottomH = 716;
            let middleRimCenterY_fromBottom = 18 + (fridgeSpaceHeight > 0 ? fridgeSpaceHeight : 1780) + 9;

            if (cabinetId === 'dolna-lodowka-2' || cabinetId === 'dolna-lodowka-3' || cabinetId === 'dolna-lodowka-4' || cabinetId === 'dolna-lodowka') {
                // Dla nowej wersji słupka oraz oryginalnej lodówki - podnosimy po prostu wieniec nad dolnym frontem (szczelina miedzy zamrażarką a chłodziarką)
                const shiftUp = ovenBaseHeight === 760 ? 40 : (ovenBaseHeight === 780 ? 60 : 0);
                fBottomH += shiftUp;
                middleRimCenterY_fromBottom += shiftUp;
            }

            const fridgeH = fridgeSpaceHeight > 0 ? fridgeSpaceHeight : 1780;

            // Środkowy front: od góry dolnej szczeliny (fBottomH + szczelina) do połowy wieńca nad lodówką (minus luz 2mm)
            // fBottomH startuje 2mm od dołu. Góra to fBottomH + 2. + 4mm szczelina = fBottomH + 6 to dół fMiddleH.
            const fMiddleH = middleRimCenterY_fromBottom - 2 - (fBottomH + 6);

            // Górny front: od połowy wieńca nad lodówką (plus luz 2mm) do góry korpusu (minus luz 2mm)
            const fTopH = height - middleRimCenterY_fromBottom - 4;

            // Upewniamy się, czy dany front ma być klapą (jeśli wybrano Siłowniki)
            const botId = configUnder?.includes('Siłowniki') ? 'front-klapa-lodowka-dol' : 'front-lodowka-dol';
            const midId = configUnder?.includes('Siłowniki') ? 'front-klapa-lodowka-srodek' : 'front-lodowka-srodek';
            const topId = configAbove?.includes('Siłowniki') ? 'front-klapa-lodowka-gora' : 'front-lodowka-gora';

            if (cabinetId === 'dolna-lodowka-3' && !splitCargoFront) {
                // Słupek z szufladami wewnętrznymi - jeden front drzwi
                const combinedH = fBottomH + fMiddleH + 4;
                elements.push({ id: 'front-drzwi-wewn-dol', name: 'Front drzwi (dół)', width: width - 4, height: combinedH, type: 'front', material: frontMaterial });
            } else if (cabinetId === 'dolna-lodowka-3' && splitCargoFront) {
                // Podział na dwa osobne fronty drzwi (górny i dolny)
                elements.push({ id: 'front-drzwi-wewn-dol', name: 'Front drzwi (dół)', width: width - 4, height: fBottomH, type: 'front', material: frontMaterial });
                elements.push({ id: 'front-drzwi-wewn-srodek', name: 'Front drzwi (środek)', width: width - 4, height: fMiddleH, type: 'front', material: frontMaterial });
            } else if (cabinetId === 'dolna-lodowka-2' && !splitCargoFront) {
                const combinedCargoH = fBottomH + fMiddleH + 4; // Dodajemy 4mm luzu ze zjedzonej szpary po jej zlikwidowaniu w środku
                elements.push({ id: 'front-cargo-lodowka', name: 'Front wysoki', width: width - 4, height: combinedCargoH, type: 'front', material: frontMaterial });
            } else if (cabinetId === 'dolna-lodowka-2' && splitCargoFront) {
                elements.push({ id: 'front-cargo-lodowka-dol', name: 'Front wysoki (dół)', width: width - 4, height: fBottomH, type: 'front', material: frontMaterial });
                elements.push({ id: 'front-cargo-lodowka-srodek', name: 'Front wysoki (środek)', width: width - 4, height: fMiddleH, type: 'front', material: frontMaterial });
            } else if (cabinetId === 'dolna-lodowka-4' && !splitCargoFront) {
                const combinedH = fBottomH + fMiddleH + 4;
                elements.push({ id: 'front-drzwi-wewn-dol', name: 'Front drzwi (dół)', width: width - 4, height: combinedH, type: 'front', material: frontMaterial });
            } else if (cabinetId === 'dolna-lodowka-4' && splitCargoFront) {
                elements.push({ id: 'front-drzwi-wewn-dol', name: 'Front drzwi (dół)', width: width - 4, height: fBottomH, type: 'front', material: frontMaterial });
                elements.push({ id: 'front-drzwi-wewn-srodek', name: 'Front drzwi (środek)', width: width - 4, height: fMiddleH, type: 'front', material: frontMaterial });
            } else {
                elements.push({ id: botId, name: 'Front (dół)', width: width - 4, height: fBottomH, type: 'front', material: frontMaterial });
                elements.push({ id: midId, name: 'Front lodówki', width: width - 4, height: fMiddleH, type: 'front', material: frontMaterial });
            }
            if (fTopH > 0) {
                elements.push({ id: topId, name: 'Front (góra)', width: width - 4, height: fTopH, type: 'front', material: frontMaterial });
            }
        } else if (cabinetId === 'dolna-piekarnik') {
            // Front pod i nad piekarnikiem
            const isLoweredOven = configUnder?.includes('Obniżenie piekarnika o 1 szufladę (14 cm)');
            const bottomSpaceForDoors = isLoweredOven ? (ovenBaseHeight - 140) : ovenBaseHeight;
            const topSpaceH = height - (bottomSpaceForDoors + ovenSpaceHeight + 18 + microwaveSpaceHeight + 18);

            if (bottomSpaceForDoors > 0) {
                if (configUnder?.includes('3 szuflady (2 wysokie jedna niska)')) {
                    // Szuflady na dole - dla 3 szuflad bazą jest zawsze pełna wysokość (720), bo po prostu usuwamy jedną
                    const baseH = ovenBaseHeight || 720;
                    const hLowSection = 140;
                    const hHighSection = Math.floor((baseH - hLowSection) / 2);
                    elements.push({ id: 'front-szuflada-1-piekarnik', name: 'Front szuflady (wysoka)', width: width - 4, height: hHighSection - 4, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-2-piekarnik', name: 'Front szuflady (wysoka)', width: width - 4, height: (baseH - hLowSection - hHighSection) - 4, type: 'front', material: frontMaterial });

                    // Jeśli piekarnik JEST obniżony, po prostu NIE DODAJEMY górnej małej szuflady
                    if (!isLoweredOven) {
                        elements.push({ id: 'front-szuflada-3-piekarnik', name: 'Front szuflady (niska)', width: width - 4, height: hLowSection - 4, type: 'front', material: frontMaterial });
                    }
                } else if (configUnder?.includes('2 szuflady')) {
                    // Dla 2 szuflad bazą jest aktualna wysokość wnęki (może być obniżona)
                    const h = Math.floor((bottomSpaceForDoors - 8) / 2);
                    elements.push({ id: 'front-szuflada-1-piekarnik', name: 'Front szuflady', width: width - 4, height: h, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-2-piekarnik', name: 'Front szuflady', width: width - 4, height: bottomSpaceForDoors - h - 8, type: 'front', material: frontMaterial });
                } else if (configUnder?.some(c => c.toLowerCase().includes('drzwi'))) {
                    elements.push({ id: 'front-piekarnik-dol', name: 'Front (dół)', width: width - 4, height: bottomSpaceForDoors - 4, type: 'front', material: frontMaterial });
                }
            }
            if (topSpaceH > 0 && (configAbove?.some(c => c.toLowerCase().includes('drzwi')) || configAbove?.includes('Siłowniki'))) {
                const topPiekarnikId = configAbove?.includes('Siłowniki') ? 'front-klapa-piekarnik-gora' : 'front-piekarnik-gora';
                elements.push({ id: topPiekarnikId, name: 'Front (góra)', width: width - 4, height: topSpaceH - 4, type: 'front', material: frontMaterial });
            }
        } else if (cabinetId === 'dolna-piekarnik-podblatowa') {
            // Front dla dolnej szuflady (nachodzi na wieniec pod piekarnikiem)
            const drawerH = height - ovenSpaceHeight;
            if (drawerH > 0) {
                elements.push({ id: 'front-szuflada-piekarnik-niska', name: 'Front szuflady', width: width - 4, height: drawerH - 4, type: 'front', material: frontMaterial });
            }
        } else {
            // Szafki standardowe dopasowane do `configUnder` lub `configAbove`
            const hasGola = configUnder.some(o => o.startsWith('Listwa korytkowa(PEKA)'));
            const GOLA_VISIBLE_H = 25;
            const GOLA_TOTAL_H = 50; // Podblatowa
            const GOLA_MID_H = 64;   // MiÄ™dzyszafkowa

            const hasDrawers = configsToParse.some(o => o.toLowerCase().includes('szuflad'));
            const hasDoors = configsToParse.some(o => o.toLowerCase().includes('drzwi'));
            const hasActuators = configsToParse.some(o => o.toLowerCase().includes('siłow'));
            const hasCargo = configsToParse.includes('Cargo');

            if (hasCargo) {
                const cargoH = hasGola ? finalFrontHeight - GOLA_VISIBLE_H : finalFrontHeight;
                elements.push({ id: 'front-cargo', name: 'Front (Cargo)', width: width - 4, height: cargoH, type: 'front', material: frontMaterial });
                
                if (hasGola) {
                    elements.push({
                        id: 'gola-podblatowa',
                        name: 'Listwa korytkowa (Podblatowa)',
                        type: 'gola-profile',
                        variant: 'L',
                        width: width - 36,
                        height: GOLA_TOTAL_H,
                        yOffset: height - GOLA_TOTAL_H / 2
                    });
                }
            } else if (hasDrawers) {
                if (configsToParse.includes('1 szuflada')) {
                    const h = hasGola ? finalFrontHeight - GOLA_VISIBLE_H : finalFrontHeight;
                    elements.push({ id: 'front-szuflada-1', name: 'Front szuflady', width: width - 4, height: h, type: 'front', material: frontMaterial });
                    
                    if (hasGola) {
                        elements.push({
                            id: 'gola-podblatowa',
                            name: 'Listwa korytkowa (Podblatowa)',
                            type: 'gola-profile',
                            variant: 'L',
                            width: width,
                            height: GOLA_TOTAL_H,
                            yOffset: height - GOLA_TOTAL_H / 2
                        });
                    }
                } else if (configsToParse.includes('2 szuflady (główna + wewnętrzna)')) {
                    const h = hasGola ? finalFrontHeight - GOLA_VISIBLE_H : finalFrontHeight;
                    elements.push({ id: 'front-szuflada-glowna', name: 'Front szuflady (główna)', width: width - 4, height: h, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-wewnetrzna', name: 'Front szuflady (wewnętrzna)', width: width - 44, height: 140, type: 'front', material: frontMaterial });
                    
                    if (hasGola) {
                        elements.push({
                            id: 'gola-podblatowa',
                            name: 'Listwa korytkowa (Podblatowa)',
                            type: 'gola-profile',
                            variant: 'L',
                            width: width,
                            height: GOLA_TOTAL_H,
                            yOffset: height - GOLA_TOTAL_H / 2
                        });
                    }
                } else if (configsToParse.includes('2 szuflady')) {
                    const hBase = Math.floor((height - 8) / 2);
                    const h1 = hasGola ? hBase - GOLA_VISIBLE_H : hBase;
                    const h2 = hasGola ? (height - hBase - 8) - GOLA_VISIBLE_H : (height - hBase - 8);
                    
                    elements.push({ id: 'front-szuflada-1', name: 'Front szuflady', width: width - 4, height: h1, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-2', name: 'Front szuflady', width: width - 4, height: h2, type: 'front', material: frontMaterial });
                    
                    if (hasGola) {
                        elements.push({
                            id: 'gola-podblatowa',
                            name: 'Listwa korytkowa (Podblatowa)',
                            type: 'gola-profile',
                            variant: 'L',
                            width: width,
                            height: GOLA_TOTAL_H,
                            yOffset: height - GOLA_TOTAL_H / 2
                        });
                        elements.push({
                            id: 'gola-miedzy-1',
                            name: 'Listwa korytkowa (Między szafkowa)',
                            type: 'gola-profile',
                            variant: 'C',
                            width: width,
                            height: GOLA_MID_H,
                            yOffset: h1 + 16.5
                        });
                    }
                } else if (configsToParse.includes('3 szuflady')) {
                    const hBase = Math.floor((height - 12) / 3);
                    const h1 = hasGola ? hBase - GOLA_VISIBLE_H : hBase;
                    const h2 = hasGola ? hBase - GOLA_VISIBLE_H : hBase;
                    const h3 = hasGola ? (height - 2 * hBase - 12) - GOLA_VISIBLE_H : (height - 2 * hBase - 12);

                    elements.push({ id: 'front-szuflada-1', name: 'Front szuflady', width: width - 4, height: h1, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-2', name: 'Front szuflady', width: width - 4, height: h2, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-3', name: 'Front szuflady', width: width - 4, height: h3, type: 'front', material: frontMaterial });

                    if (hasGola) {
                        elements.push({
                            id: 'gola-podblatowa',
                            name: 'Listwa korytkowa (Podblatowa)',
                            type: 'gola-profile',
                            variant: 'L',
                            width: width,
                            height: GOLA_TOTAL_H,
                            yOffset: height - GOLA_TOTAL_H / 2
                        });
                        elements.push({
                            id: 'gola-miedzy-1',
                            name: 'Listwa korytkowa (Między szafkowa)',
                            type: 'gola-profile',
                            variant: 'C',
                            width: width,
                            height: GOLA_MID_H,
                            yOffset: h1 + 16.5
                        });
                        elements.push({
                            id: 'gola-miedzy-2',
                            name: 'Listwa korytkowa (Między szafkowa)',
                            type: 'gola-profile',
                            variant: 'C',
                            width: width,
                            height: GOLA_MID_H,
                            yOffset: h1 + 29 + h2 + 16.5
                        });
                    }
                } else if (configsToParse.includes('3 szuflady (2 wysokie jedna niska)')) {
                    const hLowSection = 140;
                    const hHighBase = Math.floor((height - hLowSection) / 2);
                    
                    const h1 = hasGola ? hHighBase - 4 - GOLA_VISIBLE_H : hHighBase - 4;
                    const h2 = hasGola ? (height - hLowSection - hHighBase) - 4 - GOLA_VISIBLE_H : (height - hLowSection - hHighBase) - 4;
                    const h3 = hasGola ? hLowSection - 4 - GOLA_VISIBLE_H : hLowSection - 4;

                    elements.push({ id: 'front-szuflada-1', name: 'Front szuflady (wysoka)', width: width - 4, height: h1, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-2', name: 'Front szuflady (wysoka)', width: width - 4, height: h2, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-3', name: 'Front szuflady (niska)', width: width - 4, height: h3, type: 'front', material: frontMaterial });

                    if (hasGola) {
                        elements.push({
                            id: 'gola-podblatowa',
                            name: 'Listwa korytkowa (Podblatowa)',
                            type: 'gola-profile',
                            variant: 'L',
                            width: width,
                            height: GOLA_TOTAL_H,
                            yOffset: height - GOLA_TOTAL_H / 2
                        });
                        elements.push({
                            id: 'gola-miedzy-1',
                            name: 'Listwa korytkowa (Między szafkowa)',
                            type: 'gola-profile',
                            variant: 'C',
                            width: width,
                            height: GOLA_MID_H,
                            yOffset: h1 + 16.5
                        });
                        elements.push({
                            id: 'gola-miedzy-2',
                            name: 'Listwa korytkowa (Między szafkowa)',
                            type: 'gola-profile',
                            variant: 'C',
                            width: width,
                            height: GOLA_MID_H,
                            yOffset: h1 + 29 + h2 + 16.5
                        });
                    }
                }
            } else if (hasDoors) {
                const h = hasGola ? finalFrontHeight - GOLA_VISIBLE_H : finalFrontHeight;
                
                if (configsToParse.includes('Para drzwi') || width > 600) {
                    const w = Math.floor((width - 8) / 2);
                    elements.push({ id: 'front-drzwi-1', name: 'Front (Para drzwi - lewy)', width: w, height: h, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-drzwi-2', name: 'Front (Para drzwi - prawy)', width: width - w - 8, height: h, type: 'front', material: frontMaterial });
                } else {
                    elements.push({ id: 'front-drzwi', name: 'Front', width: width - 4, height: h, type: 'front', material: frontMaterial });
                }
                
                if (hasGola) {
                    elements.push({
                        id: 'gola-podblatowa',
                        name: 'Listwa korytkowa (Podblatowa)',
                        type: 'gola-profile',
                        variant: 'L',
                        width: width,
                        height: GOLA_TOTAL_H,
                        yOffset: height - GOLA_TOTAL_H / 2
                    });
                }
            } else if (hasActuators) {
                const h = hasGola ? finalFrontHeight - GOLA_VISIBLE_H : finalFrontHeight;
                elements.push({ id: 'front-klapa', name: 'Front (klapa na siłownikach)', width: width - 4, height: h, type: 'front', material: frontMaterial });
                
                if (hasGola) {
                    elements.push({
                        id: 'gola-podblatowa',
                        name: 'Listwa korytkowa (Podblatowa)',
                        type: 'gola-profile',
                        variant: 'L',
                        width: width,
                        height: GOLA_TOTAL_H,
                        yOffset: height - GOLA_TOTAL_H / 2
                    });
                }
            } else {
                const h = hasGola ? finalFrontHeight - GOLA_VISIBLE_H : finalFrontHeight;
                if (width > 600) {
                    const w = Math.floor((width - 8) / 2);
                    elements.push({ id: 'front-drzwi-1', name: 'Front (Para drzwi - lewy)', width: w, height: h, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-drzwi-2', name: 'Front (Para drzwi - prawy)', width: width - w - 8, height: h, type: 'front', material: frontMaterial });
                } else {
                    elements.push({ id: 'front-drzwi', name: 'Front', width: width - 4, height: h, type: 'front', material: frontMaterial });
                }
                
                if (hasGola) {
                    elements.push({
                        id: 'gola-podblatowa',
                        name: 'Listwa korytkowa (Podblatowa)',
                        type: 'gola-profile',
                        variant: 'L',
                        width: width,
                        height: GOLA_TOTAL_H,
                        yOffset: height - GOLA_TOTAL_H / 2
                    });
                }
            }
        }
    }

    return elements;
}

export interface CollisionRect {
    w: number;
    d: number;
    x: number; // local center X
    z: number; // local center Z
    type?: 'body' | 'extension' | 'blenda' | 'spacer' | 'front';
}

export function getCollisionRects(cabinet: Cabinet, excludeFronts: boolean = false): CollisionRect[] {
    const isL = cabinet.id.endsWith('-90');
    if (isL) {
        const w2 = (cabinet as any).width2 || (cabinet.id.startsWith('gorna-') ? 650 : 900);
        const w1 = cabinet.width;
        let d = cabinet.depth;

        // If excluding fronts, we might want to slightly reduce depth if we treat depth as including total envelope
        // However, in this system cabinet.depth is usually corpus depth.
        // For L-cabinets, excluding fronts means we take the raw L corpus.

        // Optimized L-shape collision as TWO boxes (Back-Left orientation)
        return [
            { w: w1, d: d, x: 0, z: -w2 / 2 + d / 2 },
            { w: d, d: w2 - d, x: -w1 / 2 + d / 2, z: d / 2 }
        ];
    }

    const isUpperCorner = cabinet.id === 'gorna-narozna' || cabinet.id === 'gorna-narozna-gleboka';
    if (cabinet.id === 'dolna-narozna') {
        const baseBox: CollisionRect = { w: cabinet.width, d: cabinet.depth, x: 0, z: 0, type: 'body' };

        const orientation = (cabinet as any).cornerOrientation || 'right';
        const blendaWidth = 520;
        const spacerWidth = 100;

        // Positions for blenda and spacer: spacer must be between door and blenda
        let blendaX, spacerX, angleX;
        if (orientation === 'left') {
            // Door is on the right, so: [BLENDA] [SPACER] [DOOR]
            blendaX = -cabinet.width / 2 + blendaWidth / 2;
            spacerX = -cabinet.width / 2 + blendaWidth + spacerWidth / 2;
            // Angle strip edge at 560mm from wall (-width/2). Center at -width/2 + 560 + 9 = -width/2 + 569.
            angleX = -cabinet.width / 2 + 569;
        } else {
            // Door is on the left, so: [DOOR] [SPACER] [BLENDA]
            blendaX = cabinet.width / 2 - blendaWidth / 2;
            spacerX = cabinet.width / 2 - blendaWidth - spacerWidth / 2;
            // Angle strip edge at 560mm from wall (width/2). Center at width/2 - 560 - 9 = width/2 - 569.
            angleX = cabinet.width / 2 - 569;
        }
        const blendaBox: CollisionRect = { w: blendaWidth, d: 18, x: blendaX, z: cabinet.depth / 2 + 9, type: 'blenda' };
        const spacerBox: CollisionRect = { w: spacerWidth, d: 18, x: spacerX, z: cabinet.depth / 2 + 9, type: 'spacer' };

        // Angle strip consists of TWO 40mm x 18mm pieces placed side-by-side (both vertical)
        // Syncing with Szafka3D.tsx logic:
        const spacerX_base = orientation === 'left' ? -cabinet.width / 2 + blendaWidth + 50.3 : cabinet.width / 2 - blendaWidth - 50.3;
        const katowaX = orientation === 'left' ? spacerX_base + 1 : spacerX_base - 1;
        const katowaX2 = orientation === 'left' ? katowaX - 18 : katowaX + 18;

        // Piece 1: 18mm wide, 40mm deep
        const angleBox1: CollisionRect = { w: 18, d: 40, x: katowaX, z: cabinet.depth / 2 + 18 + 20, type: 'spacer' };
        // Piece 2: 18mm wide, 40mm deep (side-by-side with Piece 1)
        const angleBox2: CollisionRect = { w: 18, d: 40, x: katowaX2, z: cabinet.depth / 2 + 18 + 20, type: 'spacer' };

        return [baseBox, blendaBox, spacerBox, angleBox1, angleBox2];
    }

    if (cabinet.id === 'dolna-rogowa') {
        const baseBox: CollisionRect = { w: cabinet.width, d: cabinet.depth, x: 0, z: 0, type: 'body' };

        const orientation = (cabinet as any).cornerOrientation || 'right';
        const spacerWidth = 100;

        let spacerX = orientation === 'left'
            ? -cabinet.width / 2 + spacerWidth / 2
            : cabinet.width / 2 - spacerWidth / 2;

        const spacerBox: CollisionRect = { w: spacerWidth, d: 18, x: spacerX, z: -cabinet.depth / 2 - 9, type: 'spacer' };

        // Angle strip for rogowa (back assembly) - both vertical and side-by-side
        // Syncing with Szafka3D.tsx logic:
        const katowaX = orientation === 'left' ? spacerX - 1 : spacerX + 1;
        const katowaX2 = orientation === 'left' ? katowaX + 18 : katowaX - 18;

        const angleBox1: CollisionRect = { w: 18, d: 40, x: katowaX, z: -cabinet.depth / 2 - 18 - 20, type: 'spacer' };
        const angleBox2: CollisionRect = { w: 18, d: 40, x: katowaX2, z: -cabinet.depth / 2 - 18 - 20, type: 'spacer' };

        return [baseBox, spacerBox, angleBox1, angleBox2];
    }

    if (isUpperCorner) {
        const orientation = (cabinet as any).cornerOrientation || 'right';
        const blendaWidth = cabinet.id === 'gorna-narozna' ? 350 : 580;

        const baseBox: CollisionRect = { w: cabinet.width, d: cabinet.depth, x: 0, z: 0, type: 'body' };

        let blendaX;
        if (orientation === 'left') {
            blendaX = -cabinet.width / 2 + blendaWidth / 2;
        } else {
            blendaX = cabinet.width / 2 - blendaWidth / 2;
        }

        const blendaBox: CollisionRect = { w: blendaWidth, d: 18, x: blendaX, z: cabinet.depth / 2 + 9, type: 'blenda' };

        // Door front
        const doorWidth = cabinet.width - blendaWidth;
        let doorX;
        if (orientation === 'left') {
            doorX = cabinet.width / 2 - doorWidth / 2;
        } else {
            doorX = -cabinet.width / 2 + doorWidth / 2;
        }
        const doorBox: CollisionRect = { w: doorWidth, d: 18, x: doorX, z: cabinet.depth / 2 + 9, type: 'front' };

        return [baseBox, blendaBox, doorBox];
    }

    return [{ w: cabinet.width, d: cabinet.depth, x: 0, z: 0 }];
}
