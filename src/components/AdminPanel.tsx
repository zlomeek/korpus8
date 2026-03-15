"use client";

import { useState, useEffect } from "react";
import { PricingSettings, defaultPricingSettings } from "@/lib/calculate";
import styles from "./AdminPanel.module.css";

interface AdminPanelProps {
    settings: PricingSettings;
    onSettingsChange: (settings: PricingSettings) => void;
}

export default function AdminPanel({ settings, onSettingsChange }: AdminPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localSettings, setLocalSettings] = useState<PricingSettings>(settings);

    // Sync local state when prop changes (e.g. from local storage load)
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleChange = (field: keyof PricingSettings, value: number) => {
        const newSettings = { ...localSettings, [field]: value };
        setLocalSettings(newSettings);
        onSettingsChange(newSettings);
    };

    return (
        <div className={styles.panel}>
            <button
                className={styles.toggleBtn}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? "▼ Ukryj Panel Admina" : "⚙ Panel Admina / Ustawienia Cen"}
            </button>

            {isOpen && (
                <div className={styles.content}>
                    <div className={styles.grid}>
                        <label>
                            Cena m² Korpusu (PLN)
                            <input
                                type="number"
                                value={localSettings.pricePerM2Body}
                                onChange={(e) => handleChange("pricePerM2Body", Number(e.target.value))}
                            />
                        </label>
                        <label>
                            Cena m² Pleców (PLN)
                            <input
                                type="number"
                                value={localSettings.pricePerM2Back}
                                onChange={(e) => handleChange("pricePerM2Back", Number(e.target.value))}
                            />
                        </label>
                        <label>
                            Cena za nogę (PLN)
                            <input
                                type="number"
                                value={localSettings.pricePerLeg}
                                onChange={(e) => handleChange("pricePerLeg", Number(e.target.value))}
                            />
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
