import { Cabinet } from "@/data/cabinets";

export interface PricingSettings {
    pricePerM2Body: number;
    pricePerM2Back: number;
    pricePerLeg: number;
    pricePerM2Countertop?: number;
}

export interface CalculationResult {
    totalM2Body: number;
    totalM2Back: number;
    boardCost: number;
    backCost: number;
    legsCount: number;
    legsCost: number;
    total: number;
}

export const defaultPricingSettings: PricingSettings = {
    pricePerM2Body: 200,
    pricePerM2Back: 30,
    pricePerLeg: 4,
    pricePerM2Countertop: 250,
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
            total: Number(cost.toFixed(2))
        };
    }

    let totalM2Body = 0;
    let totalM2Back = 0;

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

    const elementsToCalculate = generateFixedElements(cabinet.width, cabinet.height, cabinet.depth, isFullTop, config, cabinet.id, orientation, frontWidth, fridgeSpaceHeight, ovenSpaceHeight, configUnder, configAbove, microwaveSpaceHeight, ovenBaseHeight, width2);

    elementsToCalculate.forEach((el) => {
        // Convert mm to m (divide by 1000)
        // Area in m2 = (w_mm * d_mm) / 1,000,000
        const w = el.width || 0;
        const h = el.height || 0;
        const d = el.depth || 0;

        let areaMM2 = 0;

        // Calculate area based on which dimensions are present
        if (el.width && el.depth) {
            areaMM2 = w * d;
        } else if (el.height && el.depth) {
            areaMM2 = h * d;
        } else if (el.width && el.height) {
            areaMM2 = w * h;
        }

        const areaM2 = areaMM2 / 1000000;

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
    });

    const boardCost = totalM2Body * settings.pricePerM2Body;
    const backCost = totalM2Back * settings.pricePerM2Back;

    // Legs calculation based on cabinet width
    let legsCount = 0;
    const width = cabinet.width; // master width in mm

    if (cabinet.id.includes('gorna')) {
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
    let total = boardCost + backCost + legsCost;

    // Apply custom width premium (1.5x)
    if ((cabinet as any).isCustomWidth) {
        total = total * 1.5;
    }

    return {
        totalM2Body: Number(totalM2Body.toFixed(4)),
        totalM2Back: parseFloat(totalM2Back.toFixed(6)),
        boardCost: parseFloat(boardCost.toFixed(2)),
        backCost: parseFloat(backCost.toFixed(2)),
        legsCount,
        legsCost: parseFloat(legsCost.toFixed(2)),
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
    splitCargoFront: boolean = false
): any[] {
    if (cabinetId.startsWith("blat-")) {
        return [];
    }

    const elements = [];
    const isTallCabinet = cabinetId.includes('lodowka') || cabinetId.includes('piekarnik');
    const technicalVoid = (cabinetId.startsWith('dolna-') || isTallCabinet) ? 50 : 20;

    if (cabinetId === 'dolna-narozna-90' || cabinetId === 'gorna-narozna-90') {
        elements.push(
            { id: "bok-lewy", name: "Bok lewy", height: height, depth: depth },
            { id: "bok-prawy", name: "Bok prawy", height: height, depth: depth },
            { id: "wieniec-dolny-L", name: "Wieniec dolny L-kształtny (CNC)", width: width - 18 - 20, depth: width2 - 18 - 18 }, // Skrócone o 18mm na lewe plecy, i o 20mm z lewej na prawe plecy
            { id: "wieniec-gorny-L", name: "Wieniec górny L-kształtny (CNC)", width: width - 18 - 20, depth: width2 - 18 - 18 }, // Skrócone o 18mm na lewe plecy, i o 20mm z lewej na prawe plecy
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
            name: 'Wieniec dolny',
            width: width - 36,
            depth: depth - technicalVoid
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
                name: 'Wieniec górny (pełny)',
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
                        name: `Półka ${i + 1} (L-CNC)${suffixName}`,
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
            // Domyślnie zakładamy drzwi łamane, jeśli Para drzwi nie jest jawnie wybrana
            const isParaDrzwi = configsToParse.includes('Para drzwi');
            const isDrzwiLamane = configsToParse.includes('Drzwi łamane') || !isParaDrzwi;

            // W szafce narożnej L (90) mamy dwoje drzwi
            if (isDrzwiLamane) {
                const fW_L = width2 - depth - 4 - 18;
                const fW_P = width - depth - 4;
                elements.push({ id: 'front-lamany-1', name: 'Front łamany (lewy)', width: fW_L, height: height - 4, type: 'front', material: frontMaterial });
                elements.push({ id: 'front-lamany-2', name: 'Front łamany (prawy)', width: fW_P, height: height - 4, type: 'front', material: frontMaterial });
            } else if (isParaDrzwi) {
                const fW_L = width2 - depth - 4 - 18;
                const fW_P = width - depth - 4;
                elements.push({ id: 'front-drzwi-lewy', name: 'Front L-kształtny (lewy)', width: fW_L, height: height - 4, type: 'front', material: frontMaterial });
                elements.push({ id: 'front-drzwi-prawy', name: 'Front L-kształtny (prawy)', width: fW_P, height: height - 4, type: 'front', material: frontMaterial });
            }
        } else if (cabinetId === 'dolna-narozna' || cabinetId === 'gorna-narozna' || cabinetId === 'gorna-narozna-gleboka') {
            let blendaWidth = 520;
            if (cabinetId === 'gorna-narozna') blendaWidth = 350;
            if (cabinetId === 'gorna-narozna-gleboka') blendaWidth = 580;

            if (cabinetId === 'gorna-narozna' || cabinetId === 'gorna-narozna-gleboka') {
                // Szafka górna narożna - bez listew dystansowych, front dochodzi z miniluzem bezpośrednio do blendy
                const doorWidth = width - blendaWidth - 4;
                elements.push({ id: 'front-drzwi', name: 'Front', width: doorWidth, height: height - 4, type: 'front', material: frontMaterial });
            } else {
                // Szafka dolna narożna
                // Front dołączany do blendy (minus 100mm na listwę dystansową, minus blenda)
                const doorWidth = width - blendaWidth - 100 - 4;
                elements.push({ id: 'front-drzwi', name: 'Front', width: doorWidth, height: height - 4, type: 'front', material: frontMaterial });

                // Listwa dystansowa 100mm (widoczna z pszodu)
                elements.push({ id: 'front-listwa-dyst', name: 'Listwa dystansowa', width: 100, height: height, type: 'front', material: frontMaterial });

                // Listwa kątowa 60mm (przykręcana prostopadle z tyłu listwy dystansowej w literę T)
                elements.push({ id: 'front-listwa-katowa', name: 'Listwa kątowa', width: 60, height: height, type: 'front', material: frontMaterial });
            }
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
            const bottomSpaceForDrawers = ovenBaseHeight; // Szuflady liczymy od bazowej wysokości (nie są skracane proporcjonalnie)
            const bottomSpaceForDoors = isLoweredOven ? (ovenBaseHeight - 140) : ovenBaseHeight; // Drzwi dopasowują się do obniżenia
            const topSpaceH = height - (bottomSpaceForDoors + ovenSpaceHeight + 18 + microwaveSpaceHeight + 18);

            if (bottomSpaceForDoors > 0) {
                if (configUnder?.includes('3 szuflady (2 wysokie jedna niska)')) {
                    // Szuflady na dole
                    const hLowSection = 140; // Niska szuflada bazowa wysokosc wneki
                    const hHighSection = Math.floor((bottomSpaceForDrawers - hLowSection) / 2);
                    elements.push({ id: 'front-szuflada-1-piekarnik', name: 'Front szuflady (wysoka)', width: width - 4, height: hHighSection - 4, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-2-piekarnik', name: 'Front szuflady (wysoka)', width: width - 4, height: (bottomSpaceForDrawers - hLowSection - hHighSection) - 4, type: 'front', material: frontMaterial });

                    // Jeśli piekarnik JEST obniżony, po prostu NIE DODAJEMY górnej małej szuflady
                    if (!isLoweredOven) {
                        elements.push({ id: 'front-szuflada-3-piekarnik', name: 'Front szuflady (niska)', width: width - 4, height: hLowSection - 4, type: 'front', material: frontMaterial });
                    }
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
            const hasDrawers = configsToParse.some(o => o.toLowerCase().includes('szuflad'));
            const hasDoors = configsToParse.some(o => o.toLowerCase().includes('drzwi'));
            const hasActuators = configsToParse.some(o => o.toLowerCase().includes('siłow'));
            const hasCargo = configsToParse.includes('Cargo');

            if (hasCargo) {
                elements.push({ id: 'front-cargo', name: 'Front (Cargo)', width: width - 4, height: height - 4, type: 'front', material: frontMaterial });
            } else if (hasDrawers) {
                if (configsToParse.includes('1 szuflada')) {
                    elements.push({ id: 'front-szuflada-1', name: 'Front szuflady', width: width - 4, height: height - 4, type: 'front', material: frontMaterial });
                } else if (configsToParse.includes('2 szuflady (główna + wewnętrzna)')) {
                    // Główny front (zewnętrzny na całą wysokość)
                    elements.push({ id: 'front-szuflada-glowna', name: 'Front szuflady (główna)', width: width - 4, height: height - 4, type: 'front', material: frontMaterial });
                    // Wewnętrzny front (za głównym, pod wieńcem pionowym, wewnątrz szafki)
                    // Wymiar wewnętrzny na szerokość to szerokość - 36 (boki), z małym luzem po bokach damy width - 44
                    elements.push({ id: 'front-szuflada-wewnetrzna', name: 'Front szuflady (wewnętrzna)', width: width - 44, height: 140, type: 'front', material: frontMaterial });
                } else if (configsToParse.includes('2 szuflady')) {
                    const h = Math.floor((height - 8) / 2);
                    elements.push({ id: 'front-szuflada-1', name: 'Front szuflady', width: width - 4, height: h, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-2', name: 'Front szuflady', width: width - 4, height: height - h - 8, type: 'front', material: frontMaterial });
                } else if (configsToParse.includes('3 szuflady')) {
                    const h = Math.floor((height - 12) / 3);
                    elements.push({ id: 'front-szuflada-1', name: 'Front szuflady', width: width - 4, height: h, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-2', name: 'Front szuflady', width: width - 4, height: h, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-3', name: 'Front szuflady', width: width - 4, height: height - 2 * h - 12, type: 'front', material: frontMaterial });
                } else if (configsToParse.includes('3 szuflady (2 wysokie jedna niska)')) {
                    const hLowSection = 140; // Niska 14cm calkowitej przestrzeni wneki
                    const hHighSection = Math.floor((height - hLowSection) / 2);
                    elements.push({ id: 'front-szuflada-1', name: 'Front szuflady (wysoka)', width: width - 4, height: hHighSection - 4, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-2', name: 'Front szuflady (wysoka)', width: width - 4, height: (height - hLowSection - hHighSection) - 4, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-szuflada-3', name: 'Front szuflady (niska)', width: width - 4, height: hLowSection - 4, type: 'front', material: frontMaterial });
                }
            } else if (hasDoors) {
                if (configsToParse.includes('Para drzwi') || width > 600) {
                    const w = Math.floor((width - 8) / 2);
                    elements.push({ id: 'front-drzwi-1', name: 'Front (Para drzwi - lewy)', width: w, height: height - 4, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-drzwi-2', name: 'Front (Para drzwi - prawy)', width: width - w - 8, height: height - 4, type: 'front', material: frontMaterial });
                } else {
                    // Pojedyncze drzwi
                    elements.push({ id: 'front-drzwi', name: 'Front', width: width - 4, height: height - 4, type: 'front', material: frontMaterial });
                }
            } else if (hasActuators) {
                // Siłowniki (klapa podnoszona do góry) - traktujemy wymiarowo tak samo jak jedne drzwi
                elements.push({ id: 'front-klapa', name: 'Front (klapa na siłownikach)', width: width - 4, height: height - 4, type: 'front', material: frontMaterial });
            } else {
                // Gdy zaznaczono opcję 'Fronty zewnętrzne', ale nie wybrano specyficznych nawiertów w konfiguracji
                // Domyślnie wstawiamy pojedyncze drzwi o pełnym wymiarze (lub podzielone dla szerokich szafek), aby upewnić się, że szafka nie jest pusta.
                if (width > 600) {
                    const w = Math.floor((width - 8) / 2);
                    elements.push({ id: 'front-drzwi-1', name: 'Front (Para drzwi - lewy)', width: w, height: height - 4, type: 'front', material: frontMaterial });
                    elements.push({ id: 'front-drzwi-2', name: 'Front (Para drzwi - prawy)', width: width - w - 8, height: height - 4, type: 'front', material: frontMaterial });
                } else {
                    elements.push({ id: 'front-drzwi', name: 'Front', width: width - 4, height: height - 4, type: 'front', material: frontMaterial });
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
    if (isUpperCorner) {
        const blendaThickness = 18;
        // If excludeFronts is true, we ignore the blenda thickness
        const effDepth = excludeFronts ? cabinet.depth : cabinet.depth + blendaThickness;
        const zOffset = excludeFronts ? 0 : blendaThickness / 2;
        return [{ w: cabinet.width, d: effDepth, x: 0, z: zOffset }];
    }

    if (cabinet.id === 'dolna-narozna') {
        const corpus = { w: cabinet.width, d: cabinet.depth, x: 0, z: 0 };
        if (excludeFronts) {
            return [corpus];
        }
        return [
            corpus,
            { w: cabinet.width, d: 78, x: 0, z: cabinet.depth / 2 + 39 }
        ];
    }

    return [{ w: cabinet.width, d: cabinet.depth, x: 0, z: 0 }];
}
