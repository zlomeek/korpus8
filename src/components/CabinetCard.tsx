"use client";

import { Cabinet } from "@/data/cabinets";
import styles from "./CabinetCard.module.css";
import { calculateCabinet, PricingSettings, generateFixedElements } from "@/lib/calculate";
import Szafka3D from "./3D/Szafka3D";

interface CabinetCardProps {
    cabinet: Cabinet;
    settings: PricingSettings;
    onEdit: (cabinet: Cabinet) => void;
}

export default function CabinetCard({ cabinet, settings, onEdit }: CabinetCardProps) {
    const result = calculateCabinet(cabinet, settings);

    const isFullTop = cabinet.id.includes('gorna') || cabinet.id.includes('lodowka') || cabinet.id.includes('piekarnik');

    // Aby wyświetlały poprawnie ułożone półki wewnątrz i podzielone fronty, należy odpalić generateFixedElements.
    // Dajemy bezpieczne wartości domyślne dla szafek na starcie podglądu (wersje "puste" lub z domyslnymi ustawieniami z kreatora).
    const defaultElements = generateFixedElements(
        cabinet.width,
        cabinet.height,
        cabinet.depth,
        isFullTop,
        "", // defaults for configuration
        cabinet.id,
        "right", // domyślny orientation
        600, // domyślny frontWidth
        1800, // domyślny fridgeSpaceHeight
        590, // domyślny ovenSpaceHeight
        cabinet.id === 'dolna-piekarnik' ? ['3 szuflady (2 wysokie jedna niska)'] : cabinet.id === 'dolna-lodowka-4' ? ['8 półek'] : [], // domyślne opcje dolne
        cabinet.id === 'dolna-piekarnik' ? ['Drzwi'] : [], // domyślne opcje górne
        380, // domyślne microwaveSpaceHeight
        720, // domyślne ovenBaseHeight
        900, // width2
        true, // hasFronts
        "standard"
    );

    return (
        <div className={styles.card}>
            <div className={styles.cardLayout}>
                <div className={styles.cardContent}>
                    <h3>{cabinet.name}</h3>
                    <div className={styles.details}>
                        <p>Wymiary: {cabinet.width}x{cabinet.height}x{cabinet.depth}</p>
                        <p>Korpus: {result.totalM2Body.toFixed(3)} m²</p>
                        <p>Plecy: {result.totalM2Back.toFixed(3)} m²</p>
                        <p>Nogi: {result.legsCount} szt.</p>
                        <p>Cena: {result.total.toFixed(2)} PLN</p>
                    </div>
                </div>

                <div className={styles.cardPreview}>
                    <Szafka3D
                        width={cabinet.width}
                        height={cabinet.height}
                        depth={cabinet.depth}
                        type={cabinet.id}
                        isFullTop={isFullTop}
                        isStaticPreview={true}
                        fridgeSpaceHeight={1800}
                        ovenSpaceHeight={590}
                        microwaveSpaceHeight={380}
                        ovenBaseHeight={720}
                        configUnder={cabinet.id === 'dolna-piekarnik' ? ['3 szuflady (2 wysokie jedna niska)'] : cabinet.id === 'dolna-lodowka-4' ? ['8 półek'] : []}
                        configAbove={cabinet.id === 'dolna-piekarnik' ? ['Drzwi'] : []}
                        elements={defaultElements}
                        hasDoors={true}
                    />
                </div>
            </div>

            <button
                className="btn btn-primary"
                onClick={() => onEdit(cabinet)}
                style={{ marginTop: 'auto' }}
            >
                Edytuj / Szczegóły
            </button>
        </div>
    );
}
