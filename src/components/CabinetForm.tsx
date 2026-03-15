"use client";

import { Cabinet } from "@/data/cabinets";
import { calculateCabinet, PricingSettings, generateFixedElements } from "@/lib/calculate";
import React, { useState, useEffect } from "react";
import styles from "./CabinetForm.module.css";
import dynamic from 'next/dynamic';

// Dynamically import Szafka3D to avoid SSR issues with R3F
const Szafka3D = dynamic(() => import("./3D/Szafka3D"), { ssr: false });

interface CabinetFormProps {
    cabinet: Cabinet;
    settings: PricingSettings;
    onClose: () => void;
    onAddToCart: (cabinet: Cabinet, calculation: any) => void;
}

export default function CabinetForm({ cabinet, settings, onClose, onAddToCart }: CabinetFormProps) {
    // Determine valid options for Full Top
    const allowFullTopOption = ['dolna-standard', 'dolna-narozna'].includes(cabinet.id);
    const forceFullTop = !allowFullTopOption && cabinet.id !== 'dolna-zlew'; // Force full top for Upper/Fridge, but NOT for Sink (which has vertical rims)

    // Initialize with fixed elements based on dimensions
    // We need to manage isFullTop state. We can add it to formData or a separate state.
    // Let's add it to formData by casting or extending.
    const [width2, setWidth2] = useState<number>((cabinet.id === 'dolna-narozna-90' || cabinet.id === 'gorna-narozna-90') ? (cabinet.width2 || (cabinet.id.includes('gorna') ? 650 : 900)) : 0);

    const [formData, setFormData] = useState<Cabinet & {
        isFullTop?: boolean;
        bodyColor?: string;
        configuration?: string;
        cornerOrientation?: 'left' | 'right';
        frontWidth?: number;
        fridgeSpaceHeight?: number;
        ovenSpaceHeight?: number;
        microwaveSpaceHeight?: number;
        ovenBaseHeight?: number;
        configUnder?: string[];
        configAbove?: string[];
        hasFronts?: boolean;
        frontMaterial?: string;
        splitCargoFront?: boolean;
    }>(() => {
        const isFullTop = cabinet.isFullTop !== undefined ? cabinet.isFullTop : forceFullTop;
        const cornerOrientation = cabinet.cornerOrientation || 'right';
        const frontWidth = cabinet.frontWidth || 600;
        const fridgeSpaceHeight = cabinet.fridgeSpaceHeight || 1780;
        const ovenSpaceHeight = cabinet.ovenSpaceHeight || (cabinet.id === 'dolna-piekarnik' ? 590 : 600);
        const microwaveSpaceHeight = cabinet.microwaveSpaceHeight || (cabinet.id === 'dolna-piekarnik' ? 380 : undefined);
        const ovenBaseHeight = cabinet.ovenBaseHeight || (cabinet.id === 'dolna-piekarnik' ? 720 : undefined);
        const width2Local = (cabinet.id === 'dolna-narozna-90' || cabinet.id === 'gorna-narozna-90') ? (cabinet.width2 || (cabinet.id.includes('gorna') ? 650 : 900)) : 0;
        const hasFronts = cabinet.hasFronts !== undefined ? cabinet.hasFronts : false;

        return {
            ...cabinet,
            isFullTop,
            bodyColor: cabinet.bodyColor || '#fefdf5',
            configuration: "",
            cornerOrientation,
            frontWidth,
            fridgeSpaceHeight,
            ovenSpaceHeight,
            microwaveSpaceHeight,
            ovenBaseHeight,
            sinkBackRimHeight: cabinet.sinkBackRimHeight || (cabinet.id === 'dolna-zlew' ? 500 : undefined),
            configUnder: cabinet.configUnder || [],
            configAbove: cabinet.configAbove || [],
            hasFronts,
            splitCargoFront: false,
            frontMaterial: 'Płyta laminowana 18mm',
            elements: generateFixedElements(cabinet.width, cabinet.height, cabinet.depth, isFullTop, "", cabinet.id, cornerOrientation, frontWidth, fridgeSpaceHeight, ovenSpaceHeight, cabinet.configUnder || [], cabinet.configAbove || [], microwaveSpaceHeight, ovenBaseHeight, width2Local || undefined, hasFronts, 'Płyta laminowana 18mm', false)
        };
    });

    const FRONT_MATERIALS = [
        { name: 'Płyta laminowana 18mm', value: 'Płyta laminowana 18mm', priceMultiplier: 1.0 },
        { name: 'MDF Folia 19mm', value: 'MDF Folia 19mm', priceMultiplier: 1.8 },
        { name: 'Akryl 19mm', value: 'Akryl 19mm', priceMultiplier: 2.2 },
        { name: 'Lakier Mat 19mm', value: 'Lakier Mat 19mm', priceMultiplier: 2.5 },
    ];

    const BODY_COLORS = [
        { name: 'Biel Alpejska', value: '#fefdf5' }, // Using the warm white we established
        { name: 'Kaszmir', value: '#d1c9bf' },
        { name: 'Antracyt', value: '#383838' }
    ];

    // Limits
    const LIMITS = {
        width: { min: 150, max: 1200 },
        height: { min: (cabinet.id === 'dolna-piekarnik' || cabinet.id.startsWith('dolna-lodowka')) ? 2300 : 250, max: 2700 },
        depth: { min: 300, max: 700 }
    };

    const [calculation, setCalculation] = useState(calculateCabinet(formData, settings));

    useEffect(() => {
        setCalculation(calculateCabinet(formData, settings));
    }, [formData, settings]);

    // Helper functions for shelf calculations
    const getInternalHeight = () => {
        // Obliczamy światło szafki. Podstawa to wysokość - 2x grubość wieńca (2 * 18 = 36)
        return (formData.height || 720) - 36;
    };

    const isShelfAllowed = (count: number) => {
        // WYJĄTEK: Zezwalamy na 1 półkę w szafce górnej głębokiej przy wysokości 300mm pomimo że narusza to regułę 15cm
        if (cabinet.id === 'gorna-gleboka' && formData.height === 300 && count === 1) {
            return true;
        }

        const internal = getInternalHeight();
        const totalShelfThickness = count * 18;
        const spaces = count + 1;
        const remaining = internal - totalShelfThickness;
        return (remaining / spaces) >= 150;
    };

    // Filter available configuration options based on width
    const getFilteredOptions = (width: number) => {
        if (!cabinet.configurationOptions) return [];

        return cabinet.configurationOptions.filter(opt => {
            const lowerOpt = opt.toLowerCase();

            // Rule 1: Cargo - removed for > 600
            if (lowerOpt.includes('cargo') && width > 600) return false;
            if (opt === 'Cargo' && width > 400) return false; // Specific rule for Cargo

            // Rule 2: Drawers - removed for < 300
            if (lowerOpt.includes('szuflad') && width < 300) return false;

            // Rule 3: 3/4 shelves - only for 150 (and maybe 200/250? User said "w szafce 15", implying just 150)
            if ((lowerOpt.includes('3 półki') || lowerOpt.includes('4 półki')) && width !== 150) return false;

            // Rule 4: Doors (Sink Cabinet specific, but generally applicable based on width)
            // "Drzwi" (Single Door) - usually up to 600
            // EXCEPTION: Corner cabinet (dolna-narozna, gorna-narozna) has "Drzwi" option but width > 1000/600.
            if (lowerOpt === 'drzwi' && width > 600 && cabinet.id !== 'dolna-narozna' && cabinet.id !== 'gorna-narozna') return false;

            // "Para drzwi" (Double Doors) - usually from 600 up (or > 600)
            // User requested: 50,60 -> Drzwi. 80,90,100 -> Para drzwi.
            // So > 600 for Para drzwi.
            if (lowerOpt.includes('para drzwi') && width <= 600) return false;

            return true;
        });
    };

    const filteredOptions = getFilteredOptions(formData.width);

    // Master dimension change handler
    const handleWidth2Change = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const val = Number(e.target.value);
        setWidth2(val);
        setFormData(prev => {
            const updated = { ...prev };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, val, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleMasterDimChange = (field: 'width' | 'height' | 'depth', value: number) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Check if configuration is still valid, if not reset
            if (field === 'width') {
                const validOptions = getFilteredOptions(value);
                if (updated.configuration && !validOptions.includes(updated.configuration)) {
                    // Reset to first valid option or empty
                    updated.configuration = validOptions.length > 0 ? validOptions[0] : "";
                }
            }

            // Regenerate all elements based on new dimensions
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    // Clamp values on blur to ensure they stay within limits
    const handleBlur = (field: 'width' | 'height' | 'depth') => {
        setFormData(prev => {
            let value = prev[field];
            const { min, max } = LIMITS[field];

            // Clamp value
            if (value < min) value = min;
            if (value > max) value = max;

            if (value !== prev[field]) {
                const updated = { ...prev, [field]: value };

                // If height changed, re-evaluate shelves
                if (field === 'height' && updated.configUnder) {
                    const internal = value - 36;
                    let validConfig = [...updated.configUnder];

                    if (validConfig.includes('4 półki') && ((internal - 4 * 18) / 5) < 150) validConfig = validConfig.filter(o => o !== '4 półki');
                    if (validConfig.includes('3 półki') && ((internal - 3 * 18) / 4) < 150) validConfig = validConfig.filter(o => o !== '3 półki');
                    if (validConfig.includes('2 półki') && ((internal - 2 * 18) / 3) < 150) validConfig = validConfig.filter(o => o !== '2 półki');
                    if (validConfig.includes('1 półka') && ((internal - 1 * 18) / 2) < 150) validConfig = validConfig.filter(o => o !== '1 półka');

                    updated.configUnder = validConfig;
                }

                updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
                return updated;
            }
            return prev;
        });
    };

    const handleFullTopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isFullTop = e.target.checked;
        setFormData(prev => {
            const updated = { ...prev, isFullTop };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleConfigurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const configuration = e.target.value;
        setFormData(prev => {
            const updated = { ...prev, configuration };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleOrientationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cornerOrientation = e.target.value as 'left' | 'right';
        setFormData(prev => {
            const updated = { ...prev, cornerOrientation };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleFrontWidthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const frontWidth = Number(e.target.value);
        setFormData(prev => {
            const updated = { ...prev, frontWidth };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleOvenBaseHeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const ovenBaseHeight = Number(e.target.value);
        setFormData(prev => {
            const updated = { ...prev, ovenBaseHeight };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleFridgeHeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const fridgeSpaceHeight = Number(e.target.value);
        setFormData(prev => {
            const updated = { ...prev, fridgeSpaceHeight };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    // OVEN TOWER HANDLERS
    const handleOvenHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const ovenSpaceHeight = Number(e.target.value);
        setFormData(prev => {
            const updated = { ...prev, ovenSpaceHeight };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleMicrowaveHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const microwaveSpaceHeight = Number(e.target.value);
        setFormData(prev => {
            const updated = { ...prev, microwaveSpaceHeight };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleSinkBackRimHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sinkBackRimHeight = Number(e.target.value);
        setFormData(prev => {
            return { ...prev, sinkBackRimHeight };
            // elements don't need regeneration since dimensions of this element don't change
        });
    };

    const handleConfigUnderChange = (option: string, checked: boolean) => {
        setFormData(prev => {
            let newConfig = [...(prev.configUnder || [])];

            const optLower = option.toLowerCase();
            const isDrawer = optLower.includes('szuflad');
            const isDoor = optLower.includes('drzwi');
            const isShelf = optLower.includes('półk');
            const customOpts = ['Cargo', 'Magic Corner', 'Le Mans'];
            const isCustom = customOpts.includes(option);
            const isStrut = option === 'Siłowniki';
            const isNawiertyLewe = option === 'Mocowania zawiasów z lewej';
            const isNawiertyPrawe = option === 'Mocowania zawiasów z prawej';

            if (checked) {
                if (isDrawer && option !== 'Obniżenie piekarnika o 1 szufladę (14 cm)') {
                    // Exclusive with Door, Shelf, Cargo, and other Drawers, BUT KEEP OBNIZENIE PIEKARNIKA
                    newConfig = newConfig.filter(o => !o.toLowerCase().includes('drzwi') && !o.toLowerCase().includes('półk') && (!o.toLowerCase().includes('szuflad') || o === 'Obniżenie piekarnika o 1 szufladę (14 cm)') && !customOpts.includes(o));
                    newConfig.push(option);
                } else if (isDoor) {
                    // Exclusive with drawers (except obnizenie piekarnika), cargo, struts and other doors
                    newConfig = newConfig.filter(o => (!o.toLowerCase().includes('szuflad') || o === 'Obniżenie piekarnika o 1 szufladę (14 cm)') && !o.toLowerCase().includes('drzwi') && !customOpts.includes(o) && o !== 'Siłowniki');
                    newConfig.push(option);
                    // Automatycznie zaznacz mocowanie z lewej strony jeśli nie ma żadnego (tylko dla szafek dolnych, nie słupków)
                    if (!cabinet.id.startsWith('dolna-lodowka') && cabinet.id !== 'dolna-piekarnik' && !newConfig.some(o => o.toLowerCase().includes('z lewej') || o.toLowerCase().includes('z prawej'))) {
                        newConfig.push('Mocowania zawiasów z lewej');
                    }
                } else if (isShelf) {
                    // Clear drawers (except obnizenie), cargo, etc.
                    newConfig = newConfig.filter(o => (!o.toLowerCase().includes('szuflad') || o === 'Obniżenie piekarnika o 1 szufladę (14 cm)') && !customOpts.includes(o));

                    if (!newConfig.some(o => o.toLowerCase().includes('drzwi')) && !newConfig.includes('Siłowniki') && !cabinet.id.startsWith('gorna-')) {
                        newConfig.push('Drzwi');
                        // Automatycznie zaznacz mocowanie z lewej strony jeśli nie ma żadnego (tylko dla szafek dolnych, nie słupków)
                        if (!cabinet.id.startsWith('dolna-lodowka') && cabinet.id !== 'dolna-piekarnik' && !newConfig.some(o => o.toLowerCase().includes('z lewej') || o.toLowerCase().includes('z prawej'))) {
                            newConfig.push('Mocowania zawiasów z lewej');
                        }
                    }

                    // Mutex between "1 Półka" and "2 Półki" etc
                    newConfig = newConfig.filter(o => !o.toLowerCase().includes('półk'));
                    newConfig.push(option);
                } else if (isCustom) {
                    // Cargo, Magic Corner, Le Mans clears everything else (including shelves)
                    newConfig = newConfig.filter(o => !customOpts.includes(o) && !o.toLowerCase().includes('drzwi') && !o.toLowerCase().includes('półk') && (!o.toLowerCase().includes('szuflad') || o === 'Obniżenie piekarnika o 1 szufladę (14 cm)'));
                    
                    // Magic Corner i Le Mans zachowują się jak półka w kwestii drzwi (wymagają ich)
                    if (optLower === 'magic corner' || optLower === 'le mans') {
                        if (!newConfig.some(o => o.toLowerCase().includes('drzwi')) && !cabinet.id.startsWith('gorna-')) {
                            newConfig.push('Drzwi');
                            if (!cabinet.id.startsWith('dolna-lodowka') && cabinet.id !== 'dolna-piekarnik' && !newConfig.some(o => o.toLowerCase().includes('z lewej') || o.toLowerCase().includes('z prawej'))) {
                                newConfig.push('Mocowania zawiasów z lewej');
                            }
                        }
                    }
                    
                    newConfig.push(option);
                } else if (isStrut) {
                    // Mutex: Clear Door
                    newConfig = newConfig.filter(o => !o.toLowerCase().includes('drzwi'));
                    newConfig.push(option);
                } else if (isNawiertyLewe) {
                    newConfig = newConfig.filter(o => o !== 'Mocowania zawiasów z prawej');
                    newConfig.push(option);
                } else if (isNawiertyPrawe) {
                    newConfig = newConfig.filter(o => o !== 'Mocowania zawiasów z lewej');
                    newConfig.push(option);
                } else {
                    newConfig.push(option);
                }
            } else {
                // Unchecking
                newConfig = newConfig.filter(o => o !== option);

                // If unchecking Door or Strut, uncheck Shelves and Hinges
                if (isDoor || isStrut) {
                    newConfig = newConfig.filter(o => !o.toLowerCase().includes('półk') && !o.includes('Mocowania zawiasów'));
                }
            }

            const updated = { ...prev, configUnder: newConfig };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, newConfig, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleConfigAboveChange = (option: string, checked: boolean) => {
        setFormData(prev => {
            let newConfig = [...(prev.configAbove || [])];

            const optLower = option.toLowerCase();
            const isDoor = option === 'Drzwi';
            const isShelf = optLower.includes('półk');
            const isStrut = option === 'Siłowniki';

            if (checked) {
                if (isStrut) {
                    // Mutex: Clear Door
                    newConfig = newConfig.filter(o => o !== 'Drzwi');
                    newConfig.push(option);
                } else if (isDoor) {
                    // Mutex: Clear Struts
                    newConfig = newConfig.filter(o => o !== 'Siłowniki');
                    newConfig.push(option);

                    if (!cabinet.id.startsWith('dolna-lodowka') && cabinet.id !== 'dolna-piekarnik' && !newConfig.some(o => o.toLowerCase().includes('z lewej') || o.toLowerCase().includes('z prawej'))) {
                        newConfig.push('Mocowania zawiasów z lewej');
                    }
                } else if (isShelf) {
                    // Auto-check Door if neither Door nor Struts are checked
                    if (!newConfig.includes('Drzwi') && !newConfig.includes('Siłowniki')) {
                        newConfig.push('Drzwi');
                        if (!cabinet.id.startsWith('dolna-lodowka') && cabinet.id !== 'dolna-piekarnik' && !newConfig.some(o => o.toLowerCase().includes('z lewej') || o.toLowerCase().includes('z prawej'))) {
                            newConfig.push('Mocowania zawiasów z lewej');
                        }
                    }

                    // Mutex Shelves
                    newConfig = newConfig.filter(o => !o.toLowerCase().includes('półk'));
                    newConfig.push(option);
                } else {
                    newConfig.push(option);
                }
            } else {
                newConfig = newConfig.filter(o => o !== option);
                // If unchecking Door or Strut
                if (isDoor || isStrut) {
                    if (!newConfig.includes('Drzwi') && !newConfig.includes('Siłowniki')) {
                        newConfig = newConfig.filter(o => !o.toLowerCase().includes('półk'));
                    }
                    if (isDoor) {
                        newConfig = newConfig.filter(o => !o.includes('Mocowania zawiasów'));
                    }
                }
            }

            const updated = { ...prev, configAbove: newConfig };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, newConfig, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, bodyColor: e.target.value }));
    };

    const handleFormFrontsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setFormData(prev => {
            const updated = { ...prev, hasFronts: checked };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, checked, updated.frontMaterial, updated.splitCargoFront);
            return updated;
        });
    };

    const handleSplitCargoFrontToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setFormData(prev => {
            const updated = { ...prev, splitCargoFront: checked };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, checked);
            return updated;
        });
    };

    const handleFormFrontsMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const material = e.target.value;
        setFormData(prev => {
            const updated = { ...prev, frontMaterial: material };
            updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, material, updated.splitCargoFront);
            return updated;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Walidacja wyboru strony zawiasów dla pojedynczych drzwi
        const hasSingleDoor = (cfg: string | string[] | undefined) => {
            if (!cfg) return false;
            if (Array.isArray(cfg)) return cfg.includes('Drzwi') && !cfg.includes('Para drzwi');
            return cfg.includes('Drzwi') && !cfg.includes('Para drzwi');
        };
        const hasHingeSide = (cfg: string | string[] | undefined) => {
            if (!cfg) return false;
            if (Array.isArray(cfg)) return cfg.some(opt => opt.toLowerCase().includes('z lewej') || opt.toLowerCase().includes('z prawej'));
            return cfg.toLowerCase().includes('z lewej') || cfg.toLowerCase().includes('z prawej');
        };

        const isBlindCorner = cabinet.id === 'dolna-narozna' || cabinet.id === 'gorna-narozna' || cabinet.id === 'gorna-narozna-gleboka';

        // Sprawdzamy główną konfigurację (zwykłe szafki)
        // Dla szafek narożnych z blendą pomijamy sprawdzanie zawiasów, bo są one stałe
        if (!isBlindCorner && hasSingleDoor(formData.configuration) && !hasHingeSide(formData.configUnder) && !hasHingeSide(formData.configuration)) {
            alert("Proszę wybrać stronę mocowania zawiasów (lewa/prawa) przed dodaniem do koszyka.");
            return;
        }

        // Walidacja czy szafka ma JAKĄKOLWIEK konfigurację (nie jest pustym korpusem)
        const hasPrimaryConfig = (cfg: string | string[] | undefined) => {
            if (!cfg) return false;
            const options = Array.isArray(cfg) ? cfg : [cfg];
            const mainOptions = [
                'drzwi', 'szuflad', 'siłowniki', 'para drzwi', 'drzwi łamane', 
                'magic corner', 'le mans', 'cargo', 'kosz'
            ];
            return options.some(opt => 
                mainOptions.some(main => opt.toLowerCase().includes(main))
            );
        };

        const configIsValid = 
            hasPrimaryConfig(formData.configuration) || 
            hasPrimaryConfig(formData.configUnder) || 
            hasPrimaryConfig(formData.configAbove);

        if (!configIsValid) {
            alert("Proszę wybrać konfigurację szafki (np. drzwi, szuflady, siłowniki, cargo) przed dodaniem do koszyka.");
            return;
        }

        // Dla szafki na piekarnik WYMAGAMY opcji nad i pod piekarnikiem oraz zawiasów
        if (cabinet.id === 'dolna-piekarnik') {
            const hasUnder = formData.configUnder && formData.configUnder.some(opt => opt.toLowerCase().includes('drzwi') || opt.toLowerCase().includes('szuflad'));
            const hasAbove = formData.configAbove && formData.configAbove.some(opt => opt.toLowerCase().includes('drzwi') || opt.toLowerCase().includes('siłownik'));
            
            if (!hasUnder) {
                alert("Proszę wybrać opcję w przestrzeni pod piekarnikiem (np. Drzwi lub Szuflady).");
                return;
            }
            if (!hasAbove) {
                alert("Proszę wybrać opcję w przestrzeni nad piekarnikiem (np. Drzwi lub Siłowniki).");
                return;
            }

            // Unified hinge check for Oven Tower: if ANY section has single door, require hinge orientation in configUnder
            const anyDoor = hasSingleDoor(formData.configUnder) || hasSingleDoor(formData.configAbove);
            const hingeSelected = hasHingeSide(formData.configUnder);

            if (anyDoor && !hingeSelected) {
                alert("Proszę wybrać stronę mocowania zawiasów (lewa/prawa) w sekcji 'Główna konfiguracja nawiertów' (konieczne dla drzwi).");
                return;
            }
        }

        // Dla słupków na lodówkę WYMAGAMY strony zawiasów (przestrzeń lodówki)
        if (cabinet.id.startsWith('dolna-lodowka') && !hasHingeSide(formData.configUnder)) {
            alert("Proszę wybrać stronę mocowania zawiasów (lewa/prawa) dla przestrzeni lodówki.");
            return;
        }

        // Sprawdzamy sekcje słupków (dolna/górna) - już mamy hasHingeSide dla pojedynczych drzwi
        // Dla szafek narożnych z blendą pomijamy sprawdzanie zawiasów
        // Dla szafki na piekarnik i lodówek pomijamy te sprawdzenia, bo mają własne zunifikowane walidacje powyżej
        const isTallRef = cabinet.id === 'dolna-piekarnik' || cabinet.id.startsWith('dolna-lodowka');
        if (!isBlindCorner && !isTallRef && hasSingleDoor(formData.configUnder) && !hasHingeSide(formData.configUnder)) {
            alert("Proszę wybrać stronę mocowania zawiasów (lewa/prawa) dla dolnych drzwi słupka.");
            return;
        }
        if (!isBlindCorner && !isTallRef && hasSingleDoor(formData.configAbove) && !hasHingeSide(formData.configAbove)) {
            alert("Proszę wybrać stronę mocowania zawiasów (lewa/prawa) dla górnych drzwi słupka.");
            return;
        }

        onAddToCart(formData, calculation);
    };

    // Obliczanie wysokości górnej wnęki (nad mikrofalą)
    const isLoweredOvenComp = formData.configUnder?.includes('Obniżenie piekarnika o 1 szufladę (14 cm)');
    const bottomSpaceHComp = isLoweredOvenComp ? ((formData.ovenBaseHeight || 720) - 140) : (formData.ovenBaseHeight || 720);
    const topSpaceHeight = formData.height - (bottomSpaceHComp + (formData.ovenSpaceHeight || 590) + 18 + (formData.microwaveSpaceHeight || 380) + 18 + 18);
    const topSpaceHeightAboveOven = formData.height - (bottomSpaceHComp + (formData.ovenSpaceHeight || 590) + 18 + (formData.microwaveSpaceHeight || 380) + 18 + 18);
    // Zakładam, że autor miał na myśli "jeśli wnęka jest MNIEJSZA niż 45 cm, zablokuj", gdyż fizycznie mała przestrzeń nie mieści dwóch półek.
    // Jeśli jednak intencją było zablokowanie, gdy jest WIĘKSZA, można zmienić operator.
    const blockTwoShelvesAbove = cabinet.id === 'dolna-piekarnik' && topSpaceHeightAboveOven < 450;
    const blockActuatorsOven = cabinet.id === 'dolna-piekarnik' && (topSpaceHeightAboveOven - 4) > 600;

    const topSpaceHeightFridge = cabinet.id.startsWith('dolna-lodowka') ? formData.height - (formData.fridgeSpaceHeight || 1780) - 36 - ((formData.ovenBaseHeight === 760 || formData.ovenBaseHeight === 780) ? (formData.ovenBaseHeight === 760 ? 60 : 80) : 0) : 0;
    const blockTwoShelvesFridge = cabinet.id.startsWith('dolna-lodowka') && topSpaceHeightFridge < 600;

    // Obliczanie wysokości frontu nad lodówką, by zablokować siłownik powyżej 600mm
    const fridgeTopFrontH = topSpaceHeightFridge - 4;
    const blockActuatorsFridge = cabinet.id.startsWith('dolna-lodowka') && fridgeTopFrontH > 600;

    // --- Constraints for Upper Cabinets ---
    const isUpperCabinet = cabinet.id.startsWith('gorna-');
    const blockActuatorsUpper = isUpperCabinet && formData.height > 600;

    const blockHingesForDoubleDoors = formData.width > 600;

    useEffect(() => {
        // Jeśli 2 półki są zablokowane, ale zaznaczone, odznacz je automatycznie
        if (blockTwoShelvesAbove && formData.configAbove?.includes('2 półki')) {
            setFormData(prev => {
                const updatedConfigAbove = prev.configAbove?.filter(o => o !== '2 półki') || [];
                const updated = { ...prev, configAbove: updatedConfigAbove };
                updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updatedConfigAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
                return updated;
            });
        }
    }, [blockTwoShelvesAbove, formData.configAbove, cabinet.id]);

    useEffect(() => {
        // Jeśli 2 półki są zablokowane dla lodówki, ale zaznaczone, odznacz je automatycznie
        if (blockTwoShelvesFridge && formData.configAbove?.some(o => o.toLowerCase().includes('2 półki'))) {
            setFormData(prev => {
                const updatedConfigAbove = prev.configAbove?.filter(o => !o.toLowerCase().includes('2 półki')) || [];
                const updated = { ...prev, configAbove: updatedConfigAbove };
                updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updatedConfigAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
                return updated;
            });
        }
    }, [blockTwoShelvesFridge, formData.configAbove, cabinet.id]);

    useEffect(() => {
        // Jeśli siłowniki są zaznaczone w piekarniku, ale przekroczono 600mm -> odznacz i zastąp Drzwiami
        if (blockActuatorsOven && formData.configAbove?.includes('Siłowniki')) {
            setFormData(prev => {
                const updatedConfigAbove = prev.configAbove?.filter(o => o !== 'Siłowniki') || [];
                if (!updatedConfigAbove.includes('Drzwi')) {
                    updatedConfigAbove.push('Drzwi');
                    if (!updatedConfigAbove.some(o => o.toLowerCase().includes('z lewej') || o.toLowerCase().includes('z prawej'))) {
                        updatedConfigAbove.push('Mocowania zawiasów z lewej');
                    }
                }
                const updated = { ...prev, configAbove: updatedConfigAbove };
                updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updatedConfigAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
                return updated;
            });
        }
    }, [blockActuatorsOven, formData.configAbove, cabinet.id]);

    useEffect(() => {
        // Zablokuj siłowniki dla lodówki jeśli front > 600mm
        if (blockActuatorsFridge && formData.configAbove?.includes('Siłowniki')) {
            setFormData(prev => {
                const updatedConfigAbove = prev.configAbove?.filter(o => o !== 'Siłowniki') || [];
                if (!updatedConfigAbove.includes('Drzwi')) {
                    updatedConfigAbove.push('Drzwi');
                    if (!updatedConfigAbove.some(o => o.toLowerCase().includes('z lewej') || o.toLowerCase().includes('z prawej'))) {
                        updatedConfigAbove.push('Mocowania zawiasów z lewej');
                    }
                }
                const updated = { ...prev, configAbove: updatedConfigAbove };
                updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updated.configUnder, updatedConfigAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
                return updated;
            });
        }
    }, [blockActuatorsFridge, formData.configAbove, cabinet.id]);

    useEffect(() => {
        // Skasuj zaznaczenia stron mocowania zawiasów jeśli wymuszona jest para drzwi
        if (blockHingesForDoubleDoors) {
            const hasLeftHinge = formData.configUnder?.includes('Mocowania zawiasów z lewej');
            const hasRightHinge = formData.configUnder?.includes('Mocowania zawiasów z prawej');

            if (hasLeftHinge || hasRightHinge) {
                setFormData(prev => {
                    const updatedConfigUnder = prev.configUnder?.filter(o => o !== 'Mocowania zawiasów z lewej' && o !== 'Mocowania zawiasów z prawej') || [];
                    const updated = { ...prev, configUnder: updatedConfigUnder };
                    updated.elements = generateFixedElements(updated.width, updated.height, updated.depth, updated.isFullTop, updated.configuration, cabinet.id, updated.cornerOrientation, updated.frontWidth, updated.fridgeSpaceHeight, updated.ovenSpaceHeight, updatedConfigUnder, updated.configAbove, updated.microwaveSpaceHeight, updated.ovenBaseHeight, width2, updated.hasFronts, updated.frontMaterial, updated.splitCargoFront);
                    return updated;
                });
            }
        }
    }, [blockHingesForDoubleDoors, formData.configUnder, cabinet.id]);

    if (!cabinet) return null;
    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Edytuj szafkę: {cabinet.name}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div className={styles.container}>
                    {/* Left Column: 3D Preview (R3F) */}
                    <div className={styles.previewColumn}>
                        <Szafka3D
                            width={formData.width}
                            height={formData.height}
                            depth={formData.depth}
                            isFullTop={formData.isFullTop}
                            bodyColor={formData.bodyColor}
                            type={cabinet.id}
                            cornerOrientation={formData.cornerOrientation}
                            frontWidth={formData.frontWidth}
                            fridgeSpaceHeight={formData.fridgeSpaceHeight}
                            ovenSpaceHeight={formData.ovenSpaceHeight}
                            microwaveSpaceHeight={formData.microwaveSpaceHeight}
                            ovenBaseHeight={formData.ovenBaseHeight}
                            configUnder={formData.configUnder}
                            configAbove={formData.configAbove}
                            sinkBackRimHeight={formData.sinkBackRimHeight}
                            width2={width2}
                            elements={formData.elements}
                            hasDoors={formData.hasFronts}
                        />
                    </div>

                    {/* Right Column: Form Controls */}
                    <div className={styles.formColumn}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

                            <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #bae6fd' }}>
                                <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '0.5rem' }}>Wymiary Korpusu (Master)</h3>
                                <div className={styles.grid} style={{ marginBottom: 0 }}>
                                    <label>
                                        Szerokość (mm)
                                        {cabinet.standardWidths && cabinet.standardWidths.length > 0 ? (
                                            <select
                                                value={formData.width}
                                                onChange={(e) => {
                                                    const newWidth = Number(e.target.value);
                                                    handleMasterDimChange('width', newWidth);
                                                }}
                                                disabled={cabinet.id === 'dolna-piekarnik'}
                                                style={{ width: '100%', padding: '0.2rem', ...(cabinet.id === 'dolna-piekarnik' ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}) }}
                                            >
                                                {cabinet.standardWidths.map(w => (
                                                    <option key={w} value={w}>{w}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="number"
                                                min={LIMITS.width.min}
                                                max={LIMITS.width.max}
                                                value={formData.width}
                                                onChange={(e) => handleMasterDimChange('width', Number(e.target.value))}
                                                onBlur={() => handleBlur('width')}
                                                disabled={cabinet.id === 'dolna-piekarnik' || cabinet.id.startsWith('dolna-lodowka')}
                                                style={(cabinet.id === 'dolna-piekarnik' || cabinet.id.startsWith('dolna-lodowka')) ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed', width: '100%', padding: '0.2rem' } : { width: '100%', padding: '0.2rem' }}
                                            />
                                        )}
                                    </label>

                                    {(cabinet.id === 'dolna-narozna-90' || cabinet.id === 'gorna-narozna-90') && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                                Szerokość Prawego Ramienia L (mm)
                                            </label>
                                            <select
                                                value={width2}
                                                onChange={handleWidth2Change}
                                                style={{ width: '100%', padding: '0.2rem' }}
                                            >
                                                {cabinet.id === 'gorna-narozna-90' ? (
                                                    <>
                                                        <option value={650}>650</option>
                                                        <option value={750}>750</option>
                                                        <option value={800}>800</option>
                                                        <option value={850}>850</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value={710}>710</option>
                                                        <option value={800}>800</option>
                                                        <option value={900}>900</option>
                                                        <option value={1000}>1000</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    )}

                                    <label>
                                        Wysokość (mm)
                                        {cabinet.standardHeights && cabinet.standardHeights.length > 0 ? (
                                            <select
                                                value={formData.height}
                                                onChange={(e) => {
                                                    const newHeight = Number(e.target.value);
                                                    handleMasterDimChange('height', newHeight);
                                                }}
                                                style={{ width: '100%', padding: '0.2rem' }}
                                            >
                                                {cabinet.standardHeights.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                <input
                                                    type="range"
                                                    min={LIMITS.height.min}
                                                    max={LIMITS.height.max}
                                                    step={10}
                                                    value={formData.height}
                                                    onChange={(e) => handleMasterDimChange('height', Number(e.target.value))}
                                                    style={{ width: '100%', cursor: 'pointer', margin: 0, padding: 0, outline: 'none' }}
                                                />
                                                <input
                                                    type="number"
                                                    min={LIMITS.height.min}
                                                    max={LIMITS.height.max}
                                                    value={formData.height}
                                                    onChange={(e) => handleMasterDimChange('height', Number(e.target.value))}
                                                    onBlur={() => handleBlur('height')}
                                                    style={{ width: '100%', padding: '0.2rem' }}
                                                />
                                            </div>
                                        )}
                                    </label>
                                    <label>
                                        Głębokość (mm)
                                        {cabinet.standardDepths && cabinet.standardDepths.length > 0 ? (
                                            <select
                                                value={formData.depth}
                                                onChange={(e) => {
                                                    const newDepth = Number(e.target.value);
                                                    handleMasterDimChange('depth', newDepth);
                                                }}
                                                disabled={cabinet.lockDepth}
                                                style={{ width: '100%', padding: '0.2rem', ...(cabinet.lockDepth ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}) }}
                                            >
                                                {cabinet.standardDepths.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="number"
                                                min={LIMITS.depth.min}
                                                max={LIMITS.depth.max}
                                                value={formData.depth}
                                                onChange={(e) => handleMasterDimChange('depth', Number(e.target.value))}
                                                onBlur={() => handleBlur('depth')}
                                                disabled={cabinet.lockDepth}
                                                style={cabinet.lockDepth ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
                                            />
                                        )}
                                    </label>
                                </div>
                            </div>

                            {cabinet.id === 'dolna-lodowka' && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Wysokość korpusów twojej kuchni</label>
                                        <select
                                            value={formData.ovenBaseHeight || 720}
                                            onChange={handleOvenBaseHeightChange}
                                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
                                        >
                                            <option value={720}>720</option>
                                            <option value={760}>760</option>
                                            <option value={780}>780</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                            Wysokość wnęki na lodówkę (mm)
                                        </label>
                                        <select
                                            value={formData.fridgeSpaceHeight}
                                            onChange={handleFridgeHeightChange}
                                            style={{ width: '100%', padding: '0.2rem' }}
                                        >
                                            <option value={1780}>178 cm</option>
                                            <option value={1940}>194 cm</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {(cabinet.id === 'dolna-lodowka-2' || cabinet.id === 'dolna-lodowka-3' || cabinet.id === 'dolna-lodowka-4') && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                            {cabinet.id === 'dolna-lodowka-4' ? 'Wysokość podziału frontów (linii lodówki)' : 'Wysokość twojej lodówki (mm)'}
                                        </label>
                                        <select
                                            value={formData.fridgeSpaceHeight}
                                            onChange={handleFridgeHeightChange}
                                            style={{ width: '100%', padding: '0.2rem' }}
                                        >
                                            <option value={1780}>178 cm</option>
                                            <option value={1940}>194 cm</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                            Wysokość szafek dolnych w twojej kuchni
                                        </label>
                                        <select
                                            value={formData.ovenBaseHeight || 720}
                                            onChange={handleOvenBaseHeightChange}
                                            style={{ width: '100%', padding: '0.2rem' }}
                                        >
                                            <option value={720}>72 cm</option>
                                            <option value={760}>76 cm</option>
                                            <option value={780}>78 cm</option>
                                        </select>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.splitCargoFront || false}
                                            onChange={handleSplitCargoFrontToggle}
                                        />
                                        <span>Podział frontu (dwa osobne fronty bazowe)</span>
                                    </label>
                                </div>
                            )}

                            {(cabinet.id === 'dolna-narozna' || cabinet.id === 'gorna-narozna' || cabinet.id === 'gorna-narozna-gleboka') && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                        Szerokość Blendy (mm)
                                    </label>
                                    <input
                                        type="number"
                                        value={(cabinet.id as string) === 'gorna-narozna' ? 350 : (cabinet.id as string) === 'gorna-narozna-gleboka' ? 580 : 520}
                                        disabled
                                        style={{ width: '100%', padding: '0.2rem', backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                                    />
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>
                                        Szerokość Frontu (mm) - Wyliczana automatycznie
                                    </label>
                                    <input
                                        type="number"
                                        value={(formData.width || ((cabinet.id as string) === 'gorna-narozna' ? 650 : 1020)) - ((cabinet.id as string) === 'gorna-narozna' ? 350 : (cabinet.id as string) === 'gorna-narozna-gleboka' ? 580 : 620)} // Width - blenda (350 or 580 or 520+100)
                                        disabled
                                        style={{ width: '100%', padding: '0.2rem', backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                                    />
                                </div>
                            )}

                            {(cabinet.id === 'dolna-narozna' || cabinet.id === 'gorna-narozna' || cabinet.id === 'gorna-narozna-gleboka') && (
                                <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                        Strona szafki (Położenie blendy)
                                    </label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="cornerOrientation"
                                                value="right"
                                                checked={formData.cornerOrientation === 'right'}
                                                onChange={handleOrientationChange}
                                            />
                                            Prawa (Standard)
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="cornerOrientation"
                                                value="left"
                                                checked={formData.cornerOrientation === 'left'}
                                                onChange={handleOrientationChange}
                                            />
                                            Lewa
                                        </label>
                                    </div>
                                </div>
                            )}

                            {allowFullTopOption && (
                                <div style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.isFullTop || false}
                                            onChange={handleFullTopChange}
                                        />
                                        Pełny wieniec górny (płyta 18mm)
                                    </label>
                                </div>
                            )}

                            <div style={{ marginTop: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    Kolor Korpusu
                                </label>
                                <select
                                    value={formData.bodyColor}
                                    onChange={handleColorChange}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {BODY_COLORS.map(color => (
                                        <option key={color.value} value={color.value}>
                                            {color.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {cabinet.id.startsWith('dolna-lodowka') && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                                    {/* --- 1. Główna konfiguracja nawiertów (Przestrzeń lodówki) --- */}
                                    <div style={{ padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#444' }}>
                                            Główna konfiguracja nawiertów
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem', opacity: ((cabinet.id !== 'dolna-lodowka-3' && cabinet.id !== 'dolna-lodowka-4') && formData.configAbove?.includes('Siłowniki')) ? 0.5 : 1 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Mocowania zawiasów z lewej')}
                                                    onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z lewej', e.target.checked)}
                                                    disabled={(cabinet.id !== 'dolna-lodowka-3' && cabinet.id !== 'dolna-lodowka-4') && formData.configAbove?.includes('Siłowniki')}
                                                />
                                                Mocowania zawiasów z lewej
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem', opacity: ((cabinet.id !== 'dolna-lodowka-3' && cabinet.id !== 'dolna-lodowka-4') && formData.configAbove?.includes('Siłowniki')) ? 0.5 : 1 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Mocowania zawiasów z prawej')}
                                                    onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z prawej', e.target.checked)}
                                                    disabled={(cabinet.id !== 'dolna-lodowka-3' && cabinet.id !== 'dolna-lodowka-4') && formData.configAbove?.includes('Siłowniki')}
                                                />
                                                Mocowania zawiasów z prawej
                                            </label>
                                        </div>
                                    </div>

                                    {/* --- 2. Przestrzeń nad lodówką (configAbove) --- */}
                                    <div style={{ padding: '0.5rem', background: '#eef6ff', borderRadius: '4px', border: '1px solid #cce0ff' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#0056b3' }}>
                                            Konfiguracja nawiertów (Przestrzeń nad {cabinet.id === 'dolna-lodowka-4' ? 'półkami' : cabinet.id === 'dolna-lodowka-3' ? 'szufladami wewnętrznymi' : cabinet.id === 'dolna-lodowka-2' ? 'cargo' : 'lodówką'})
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configAbove?.some(o => o.toLowerCase().includes('drzwi'))}
                                                    onChange={(e) => handleConfigAboveChange('Drzwi', e.target.checked)}
                                                />
                                                Drzwi
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: blockActuatorsFridge ? 0.4 : 1 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configAbove?.includes('Siłowniki')}
                                                    onChange={(e) => handleConfigAboveChange('Siłowniki', e.target.checked)}
                                                    disabled={blockActuatorsFridge}
                                                />
                                                Siłowniki
                                                {blockActuatorsFridge && <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.3rem' }}>(wymaga frontu ≤ 600 mm)</span>}
                                            </label>
                                            <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: (formData.configAbove?.some(o => o.toLowerCase().includes('drzwi')) || formData.configAbove?.includes('Siłowniki')) ? 1 : 0.5 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configAbove?.includes('1 półka')}
                                                        onChange={(e) => handleConfigAboveChange('1 półka', e.target.checked)}
                                                        disabled={!(formData.configAbove?.some(o => o.toLowerCase().includes('drzwi')) || formData.configAbove?.includes('Siłowniki'))}
                                                    />
                                                    1 Półka
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: blockTwoShelvesFridge ? 0.4 : 1 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configAbove?.includes('2 półki')}
                                                        onChange={(e) => handleConfigAboveChange('2 półki', e.target.checked)}
                                                        disabled={!(formData.configAbove?.some(o => o.toLowerCase().includes('drzwi')) || formData.configAbove?.includes('Siłowniki')) || blockTwoShelvesFridge}
                                                    />
                                                    2 Półki
                                                    {blockTwoShelvesFridge && <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.3rem' }}>(wymaga wnęki nad {cabinet.id === 'dolna-lodowka-4' ? 'półkami' : cabinet.id === 'dolna-lodowka-3' ? 'szufladami wewnętrznymi' : cabinet.id === 'dolna-lodowka-2' ? 'cargo' : 'lodówką'} &gt; 60 cm)</span>}
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {cabinet.id === 'dolna-narozna' && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                                        Konfiguracja (Nawierty)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                onChange={(e) => handleConfigUnderChange('Drzwi', e.target.checked)}
                                            />
                                            Drzwi
                                        </label>
                                        <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) ? 1 : 0.5 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(1) ? 1 : 0.5 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('1 półka')}
                                                    onChange={(e) => handleConfigUnderChange('1 półka', e.target.checked)}
                                                    disabled={!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) || !isShelfAllowed(1)}
                                                />
                                                1 Półka
                                            </label>
                                            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.2rem 0' }} />
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Magic Corner')}
                                                    onChange={(e) => handleConfigUnderChange('Magic Corner', e.target.checked)}
                                                    disabled={!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                />
                                                Magic Corner
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Le Mans')}
                                                    onChange={(e) => handleConfigUnderChange('Le Mans', e.target.checked)}
                                                    disabled={!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                />
                                                Le Mans
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {cabinet.id === 'gorna-narozna' && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                                        Konfiguracja (Nawierty)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        {[1, 2, 3, 4, 5].map(num => {
                                            const label = num === 1 ? '1 półka' : (num >= 5 ? `${num} półek` : `${num} półki`);
                                            const labelDisplay = num === 1 ? '1 Półka' : (num >= 5 ? `${num} Półek` : `${num} Półki`);
                                            const allShelfLabels = ['1 półka', '2 półki', '3 półki', '4 półki', '5 półek'];
                                            return (
                                                <label key={num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(num) ? 1 : 0.5 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes(label)}
                                                        onChange={(e) => {
                                                            // Odznacz wszystkie inne opcje półek
                                                            allShelfLabels.forEach(sl => {
                                                                if (sl !== label && formData.configUnder?.includes(sl)) {
                                                                    handleConfigUnderChange(sl, false);
                                                                }
                                                            });
                                                            handleConfigUnderChange(label, e.target.checked);
                                                        }}
                                                        disabled={!isShelfAllowed(num)}
                                                    />
                                                    {labelDisplay}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {cabinet.id === 'dolna-narozna-90' && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                                        Konfiguracja (Nawierty)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.includes('Drzwi łamane')}
                                                onChange={(e) => handleConfigUnderChange('Drzwi łamane', e.target.checked)}
                                            />
                                            Drzwi łamane
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.includes('Para drzwi')}
                                                onChange={(e) => handleConfigUnderChange('Para drzwi', e.target.checked)}
                                            />
                                            Para drzwi
                                        </label>
                                        <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.2rem 0' }} />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(1) ? 1 : 0.5 }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.includes('1 półka')}
                                                onChange={(e) => {
                                                    handleConfigUnderChange('1 półka', e.target.checked);
                                                    if (e.target.checked) {
                                                        handleConfigUnderChange('2 półki', false);
                                                    }
                                                }}
                                                disabled={!isShelfAllowed(1)}
                                            />
                                            1 Półka
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(2) ? 1 : 0.5 }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.includes('2 półki')}
                                                onChange={(e) => {
                                                    handleConfigUnderChange('2 półki', e.target.checked);
                                                    if (e.target.checked) {
                                                        handleConfigUnderChange('1 półka', false);
                                                    }
                                                }}
                                                disabled={!isShelfAllowed(2)}
                                            />
                                            2 Półki
                                        </label>
                                    </div>
                                </div>
                            )}

                            {cabinet.id === 'gorna-narozna-90' && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                                        Konfiguracja (Nawierty)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.includes('Drzwi łamane')}
                                                onChange={(e) => handleConfigUnderChange('Drzwi łamane', e.target.checked)}
                                            />
                                            Drzwi łamane
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.includes('Para drzwi')}
                                                onChange={(e) => handleConfigUnderChange('Para drzwi', e.target.checked)}
                                            />
                                            Para drzwi
                                        </label>
                                        <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.2rem 0' }} />
                                        {[1, 2, 3, 4, 5].map(num => {
                                            const label = num === 1 ? '1 półka' : (num >= 5 ? `${num} półek` : `${num} półki`);
                                            const display = num === 1 ? '1 Półka' : (num >= 5 ? `${num} Półek` : `${num} Półki`);
                                            const allShelfLabels = ['1 półka', '2 półki', '3 półki', '4 półki', '5 półek'];
                                            return (
                                                <label key={num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(num) ? 1 : 0.5 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes(label)}
                                                        onChange={(e) => {
                                                            allShelfLabels.forEach(sl => {
                                                                if (sl !== label && formData.configUnder?.includes(sl)) {
                                                                    handleConfigUnderChange(sl, false);
                                                                }
                                                            });
                                                            handleConfigUnderChange(label, e.target.checked);
                                                        }}
                                                        disabled={!isShelfAllowed(num)}
                                                    />
                                                    {display}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {cabinet.id === 'dolna-zlew' && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                onChange={(e) => handleConfigUnderChange('Drzwi', e.target.checked)}
                                            />
                                            Drzwi
                                        </label>
                                        <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) ? 1 : 0.5 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Mocowania zawiasów z lewej')}
                                                    onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z lewej', e.target.checked)}
                                                    disabled={!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                />
                                                Mocowania zawiasów z lewej
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Mocowania zawiasów z prawej')}
                                                    onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z prawej', e.target.checked)}
                                                    disabled={!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                />
                                                Mocowania zawiasów z prawej
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(1) ? 1 : 0.5 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('1 półka')}
                                                    onChange={(e) => handleConfigUnderChange('1 półka', e.target.checked)}
                                                    disabled={!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) || !isShelfAllowed(1)}
                                                />
                                                1 Półka
                                            </label>
                                        </div>
                                        <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.2rem 0' }} />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.includes('1 szuflada')}
                                                onChange={(e) => handleConfigUnderChange('1 szuflada', e.target.checked)}
                                            />
                                            1 Szuflada
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.includes('2 szuflady (główna + wewnętrzna)')}
                                                onChange={(e) => handleConfigUnderChange('2 szuflady (główna + wewnętrzna)', e.target.checked)}
                                            />
                                            2 Szuflady (główna + wewnętrzna)
                                        </label>
                                    </div>
                                </div>
                            )}
                            {cabinet.id.startsWith('gorna-') && cabinet.id !== 'gorna-narozna' && cabinet.id !== 'gorna-narozna-gleboka' && cabinet.id !== 'gorna-narozna-90' && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                                        Konfiguracja (Nawierty)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                onChange={(e) => handleConfigUnderChange('Drzwi', e.target.checked)}
                                            />
                                            Drzwi
                                        </label>
                                        <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) ? 1 : 0.5 }}>
                                            <div style={{ opacity: blockHingesForDoubleDoors || formData.configUnder?.includes('Siłowniki') ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('Mocowania zawiasów z lewej')}
                                                        onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z lewej', e.target.checked)}
                                                        disabled={!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) || blockHingesForDoubleDoors || formData.configUnder?.includes('Siłowniki')}
                                                    />
                                                    Mocowania zawiasów z lewej
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('Mocowania zawiasów z prawej')}
                                                        onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z prawej', e.target.checked)}
                                                        disabled={!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) || blockHingesForDoubleDoors || formData.configUnder?.includes('Siłowniki')}
                                                    />
                                                    Mocowania zawiasów z prawej
                                                </label>
                                            </div>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: blockActuatorsUpper ? 0.4 : 1 }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.includes('Siłowniki')}
                                                onChange={(e) => handleConfigUnderChange('Siłowniki', e.target.checked)}
                                                disabled={blockActuatorsUpper}
                                            />
                                            Siłowniki
                                            {blockActuatorsUpper && <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.3rem' }}>(wymaga wys. ≤ 600 mm)</span>}
                                        </label>
                                        <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.2rem 0' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: (formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) || formData.configUnder?.includes('Siłowniki')) ? 1 : 0.5 }}>
                                            {[1, 2, 3, 4, 5].filter(num => {
                                                if (!cabinet.configurationOptions) return true;
                                                const label = num === 1 ? '1 półka' : (num >= 5 ? `${num} półek` : `${num} półki`);
                                                return cabinet.configurationOptions.some(opt => opt.toLowerCase() === label.toLowerCase());
                                            }).map(num => {
                                                const label = num === 1 ? '1 półka' : (num >= 5 ? `${num} półek` : `${num} półki`);
                                                const display = num === 1 ? '1 Półka' : (num >= 5 ? `${num} Półek` : `${num} Półki`);
                                                const allShelfLabels = ['1 półka', '2 półki', '3 półki', '4 półki', '5 półek'];
                                                return (
                                                    <label key={num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(num) ? 1 : 0.5 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.configUnder?.includes(label)}
                                                            onChange={(e) => {
                                                                allShelfLabels.forEach(sl => {
                                                                    if (sl !== label && formData.configUnder?.includes(sl)) {
                                                                        handleConfigUnderChange(sl, false);
                                                                    }
                                                                });
                                                                handleConfigUnderChange(label, e.target.checked);
                                                            }}
                                                            disabled={(!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) && !formData.configUnder?.includes('Siłowniki')) || !isShelfAllowed(num)}
                                                        />
                                                        {display}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {cabinet.id === 'gorna-narozna-gleboka' && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                                        Konfiguracja (Nawierty)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                onChange={(e) => handleConfigUnderChange('Drzwi', e.target.checked)}
                                            />
                                            Drzwi
                                        </label>
                                        <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) ? 1 : 0.5 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('1 półka')}
                                                    onChange={(e) => handleConfigUnderChange('1 półka', e.target.checked)}
                                                    disabled={!formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                />
                                                1 Półka
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {cabinet.id !== 'dolna-piekarnik' && !cabinet.id.startsWith('dolna-lodowka') && cabinet.id !== 'dolna-narozna' && cabinet.id !== 'dolna-narozna-90' && cabinet.id !== 'dolna-zlew' && !cabinet.id.startsWith('gorna-') && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        {/* Drzwi */}
                                        {!cabinet.id.startsWith('gorna-') && (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))}
                                                    onChange={(e) => handleConfigUnderChange('Drzwi', e.target.checked)}
                                                />
                                                Drzwi
                                            </label>
                                        )}
                                        {/* Mocowania zawiasów (only when Drzwi is selected) */}
                                        {formData.configUnder?.some(o => o.toLowerCase().includes('drzwi')) && (
                                            <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: blockHingesForDoubleDoors ? 0.5 : 1 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('Mocowania zawiasów z lewej')}
                                                        onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z lewej', e.target.checked)}
                                                        disabled={blockHingesForDoubleDoors}
                                                    />
                                                    Mocowania zawiasów z lewej
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('Mocowania zawiasów z prawej')}
                                                        onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z prawej', e.target.checked)}
                                                        disabled={blockHingesForDoubleDoors}
                                                    />
                                                    Mocowania zawiasów z prawej
                                                </label>
                                            </div>
                                        )}
                                        <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.2rem 0' }} />

                                        {/* Półki (zależne od Drzwi dla dolnych, domyślne dla górnych) */}
                                        <div style={{ marginLeft: !cabinet.id.startsWith('gorna-') ? '1.5rem' : '0', display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: (cabinet.id.startsWith('gorna-') || formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))) ? 1 : 0.5 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(1) ? 1 : 0.5 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('1 półka')}
                                                    onChange={(e) => handleConfigUnderChange('1 półka', e.target.checked)}
                                                    disabled={(!cabinet.id.startsWith('gorna-') && !formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))) || !isShelfAllowed(1)}
                                                />
                                                1 Półka
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(2) ? 1 : 0.5 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('2 półki')}
                                                    onChange={(e) => handleConfigUnderChange('2 półki', e.target.checked)}
                                                    disabled={(!cabinet.id.startsWith('gorna-') && !formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))) || !isShelfAllowed(2)}
                                                />
                                                2 Półki
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isShelfAllowed(3) ? 1 : 0.5 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('3 półki')}
                                                    onChange={(e) => handleConfigUnderChange('3 półki', e.target.checked)}
                                                    disabled={(!cabinet.id.startsWith('gorna-') && !formData.configUnder?.some(o => o.toLowerCase().includes('drzwi'))) || !isShelfAllowed(3)}
                                                />
                                                3 Półki
                                            </label>
                                        </div>

                                        {/* Szuflady (Tylko dla dolnych, wykluczają się z drzwiami) */}
                                        {!cabinet.id.startsWith('gorna-') && !cabinet.id.includes('narozna') && (
                                            <>
                                                <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.2rem 0' }} />
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('1 szuflada')}
                                                        onChange={(e) => handleConfigUnderChange('1 szuflada', e.target.checked)}
                                                    />
                                                    1 Szuflada
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('2 szuflady')}
                                                        onChange={(e) => handleConfigUnderChange('2 szuflady', e.target.checked)}
                                                    />
                                                    2 Szuflady
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('3 szuflady')}
                                                        onChange={(e) => handleConfigUnderChange('3 szuflady', e.target.checked)}
                                                    />
                                                    3 Szuflady
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('3 szuflady (2 wysokie jedna niska)')}
                                                        onChange={(e) => handleConfigUnderChange('3 szuflady (2 wysokie jedna niska)', e.target.checked)}
                                                    />
                                                    3 Szuflady (2 wysokie jedna niska)
                                                </label>
                                            </>
                                        )}

                                        {filteredOptions.length > 0 && filteredOptions.filter(opt => !['Drzwi', 'Para drzwi', '1 półka', '2 półki', '3 półki', '4 półki', '1 szuflada', '2 szuflady', '3 szuflady', '3 szuflady (2 wysokie jedna niska)', 'Siłowniki'].includes(opt)).map(opt => (
                                            <React.Fragment key={opt}>
                                                <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: '0.2rem 0' }} />
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes(opt)}
                                                        onChange={(e) => handleConfigUnderChange(opt, e.target.checked)}
                                                    />
                                                    {opt}
                                                </label>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {cabinet.id === 'dolna-piekarnik' && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {/* Oven Base Height */}
                                    <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                                        <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '0.5rem' }}>Baza Słupka Piekarnikowego</h3>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Wysokość dolnej przestrzeni bazy (mm)</label>
                                        <select
                                            value={formData.ovenBaseHeight || 720}
                                            onChange={handleOvenBaseHeightChange}
                                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
                                        >
                                            <option value={720}>720</option>
                                            <option value={760}>760</option>
                                            <option value={780}>780</option>
                                        </select>
                                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.4rem', marginBottom: 0 }}>
                                            Ta opcja definiuje gdzie zacznie się główna dolna podpora piekarnika.  Wybór opcji w formularzu "Obniżenie piekarnika" odejmie od tego wymiaru na dole 140 mm w razie potrzeby.
                                        </p>
                                    </div>

                                    {/* Oven Height */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                            Wysokość wnęki na piekarnik (mm)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.ovenSpaceHeight}
                                            onChange={handleOvenHeightChange}
                                            style={{ width: '100%', padding: '0.2rem', backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                                            disabled={true}
                                        />
                                    </div>

                                    {/* Microwave Height */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                            Wysokość wnęki na mikrofalówkę (mm)
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                                            <input
                                                type="range"
                                                min={380}
                                                max={600}
                                                step={10}
                                                value={formData.microwaveSpaceHeight || 380}
                                                onChange={handleMicrowaveHeightChange}
                                                style={{ width: '100%', cursor: 'pointer', margin: 0, padding: 0, outline: 'none' }}
                                            />
                                            <input
                                                type="number"
                                                min={380}
                                                max={600}
                                                value={formData.microwaveSpaceHeight || 380}
                                                onChange={handleMicrowaveHeightChange}
                                                style={{ width: '100%', padding: '0.2rem' }}
                                            />
                                        </div>
                                    </div>

                                    {/* --- 1. Główna konfiguracja nawiertów --- */}
                                    <div style={{ padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#444' }}>
                                            Główna konfiguracja nawiertów
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Mocowania zawiasów z lewej')}
                                                    onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z lewej', e.target.checked)}
                                                />
                                                Mocowania zawiasów z lewej
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Mocowania zawiasów z prawej')}
                                                    onChange={(e) => handleConfigUnderChange('Mocowania zawiasów z prawej', e.target.checked)}
                                                />
                                                Mocowania zawiasów z prawej
                                            </label>
                                        </div>
                                    </div>

                                    {/* --- 2. Konfiguracja nawiertów (Przestrzeń nad piekarnikiem) --- */}
                                    <div style={{ padding: '0.5rem', background: '#eef6ff', borderRadius: '4px', border: '1px solid #cce0ff' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#0056b3' }}>
                                            Konfiguracja nawiertów (Przestrzeń nad piekarnikiem)
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configAbove?.some(o => o.toLowerCase().includes('drzwi'))}
                                                    onChange={(e) => handleConfigAboveChange('Drzwi', e.target.checked)}
                                                />
                                                Drzwi
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: blockActuatorsOven ? 0.4 : 1 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configAbove?.includes('Siłowniki')}
                                                    onChange={(e) => handleConfigAboveChange('Siłowniki', e.target.checked)}
                                                    disabled={blockActuatorsOven}
                                                />
                                                Siłowniki
                                                {blockActuatorsOven && <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.3rem' }}>(wymaga wys. ≤ 600 mm)</span>}
                                            </label>
                                            <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: (formData.configAbove?.some(o => o.toLowerCase().includes('drzwi')) || formData.configAbove?.includes('Siłowniki')) ? 1 : 0.5 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configAbove?.includes('1 półka') || formData.configAbove?.includes('1 Półka')}
                                                        onChange={(e) => handleConfigAboveChange('1 półka', e.target.checked)}
                                                        disabled={!(formData.configAbove?.some(o => o.toLowerCase().includes('drzwi')) || formData.configAbove?.includes('Siłowniki'))}
                                                    />
                                                    1 Półka
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: blockTwoShelvesAbove ? 0.4 : 1 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configAbove?.includes('2 półki') || formData.configAbove?.includes('2 Półki')}
                                                        onChange={(e) => handleConfigAboveChange('2 półki', e.target.checked)}
                                                        disabled={!(formData.configAbove?.some(o => o.toLowerCase().includes('drzwi')) || formData.configAbove?.includes('Siłowniki')) || blockTwoShelvesAbove}
                                                    />
                                                    2 Półki
                                                    {blockTwoShelvesAbove && <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.3rem' }}>(wysokość wnęki &lt; 45 cm)</span>}
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- 3. Konfiguracja nawiertów (Przestrzeń pod piekarnikiem) --- */}
                                    <div style={{ padding: '0.5rem', background: '#fdf4ea', borderRadius: '4px', border: '1px solid #fbd38d' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9c4221' }}>
                                            Konfiguracja nawiertów (Przestrzeń pod piekarnikiem)
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c05621', fontWeight: '500' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Obniżenie piekarnika o 1 szufladę (14 cm)')}
                                                    onChange={(e) => handleConfigUnderChange('Obniżenie piekarnika o 1 szufladę (14 cm)', e.target.checked)}
                                                />
                                                Obniżenie piekarnika o 1 szufladę (14 cm)
                                            </label>
                                            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #fbd38d', margin: '0.4rem 0' }} />
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('Drzwi')}
                                                    onChange={(e) => handleConfigUnderChange('Drzwi', e.target.checked)}
                                                />
                                                Drzwi
                                            </label>
                                            <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', opacity: formData.configUnder?.includes('Drzwi') ? 1 : 0.5 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('1 półka')}
                                                        onChange={(e) => handleConfigUnderChange('1 półka', e.target.checked)}
                                                        disabled={!formData.configUnder?.includes('Drzwi')}
                                                    />
                                                    1 Półka
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.configUnder?.includes('2 półki')}
                                                        onChange={(e) => handleConfigUnderChange('2 półki', e.target.checked)}
                                                        disabled={!formData.configUnder?.includes('Drzwi')}
                                                    />
                                                    2 Półki
                                                </label>
                                            </div>
                                            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #fbd38d', margin: '0.4rem 0' }} />
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.configUnder?.includes('3 szuflady (2 wysokie jedna niska)') || formData.configUnder?.includes('3 Szuflady (2 wysokie jedna niska)')}
                                                    onChange={(e) => handleConfigUnderChange('3 szuflady (2 wysokie jedna niska)', e.target.checked)}
                                                />
                                                3 Szuflady (2 wysokie jedna niska)
                                            </label>
                                        </div>
                                    </div>

                                </div>
                            )}
                            <div style={{ background: '#fafafa', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #ddd' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.hasFronts || false}
                                        onChange={handleFormFrontsToggle}
                                        style={{ transform: 'scale(1.2)' }}
                                    />
                                    Fronty zewętrzne (Drzwi / Szuflady)
                                </label>

                                {formData.hasFronts && (
                                    <div style={{ marginTop: '0.8rem', paddingLeft: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Wybierz dekor frontu:</label>
                                        <select
                                            value={formData.frontMaterial}
                                            onChange={handleFormFrontsMaterialChange}
                                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
                                        >
                                            {FRONT_MATERIALS.map(m => (
                                                <option key={m.value} value={m.value}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className={styles.elementsList} style={{ marginBottom: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
                                <div style={{ padding: '0.5rem', background: '#f9f9f9', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    Lista Elementów (Automatyczna)
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <tbody>
                                        {/* Grupa Korpus */}
                                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                                            <td colSpan={2} style={{ padding: '0.3rem 0.5rem', fontWeight: 'bold', fontSize: '0.8rem', color: '#555' }}>
                                                ELEMENTY KORPUSU (Płyta 18mm / HDF 3mm)
                                            </td>
                                        </tr>
                                        {formData.elements.filter(el => el.type !== 'front').map((el) => {
                                            let dimensions = "";
                                            const name = el.name.toLowerCase();

                                            // Format based on element type
                                            if (name.includes('bok')) {
                                                dimensions = `${el.height} x ${el.depth}`;
                                            } else if (name.includes('wieniec')) {
                                                if (name.includes('pionowy')) {
                                                    dimensions = `${el.width} x ${el.height}`;
                                                } else {
                                                    dimensions = `${el.width} x ${el.depth}`;
                                                }
                                            } else if (name.includes('plecy')) {
                                                dimensions = `${el.height} x ${el.width}`;
                                            } else if (name.includes('blenda')) {
                                                dimensions = `${el.height} x ${el.width}`;
                                            } else if (name.includes('listwa')) {
                                                dimensions = `${el.width} x ${el.height}`;
                                            } else {
                                                dimensions = `${el.width || el.height} x ${el.depth || el.width}`;
                                            }

                                            return (
                                                <tr key={el.id} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '0.5rem' }}>{el.name}</td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#666' }}>
                                                        {dimensions} mm
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {/* Grupa Fronty */}
                                        {formData.elements.filter(el => el.type === 'front').length > 0 && (
                                            <>
                                                <tr style={{ backgroundColor: '#f0f0f0' }}>
                                                    <td colSpan={2} style={{ padding: '0.3rem 0.5rem', fontWeight: 'bold', fontSize: '0.8rem', color: '#555', borderTop: '2px solid #ddd' }}>
                                                        FRONTY ZEWNĘTRZNE ({formData.frontMaterial})
                                                    </td>
                                                </tr>
                                                {formData.elements.filter(el => el.type === 'front').map((el) => {
                                                    return (
                                                        <tr key={el.id} style={{ borderBottom: '1px solid #eee', backgroundColor: '#fcfcfc' }}>
                                                            <td style={{ padding: '0.5rem' }}>{el.name}</td>
                                                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#0066cc', fontWeight: 'bold' }}>
                                                                {el.width} x {el.height} mm
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.summary}>
                                <p><strong>Kosztorys:</strong></p>
                                <p>Korpus ({calculation.totalM2Body.toFixed(3)} m²): {calculation.boardCost.toFixed(2)} PLN</p>
                                <p>Plecy ({calculation.totalM2Back.toFixed(3)} m²): {calculation.backCost.toFixed(2)} PLN</p>
                                <p>Nogi ({calculation.legsCount} szt.): {calculation.legsCost.toFixed(2)} PLN</p>
                                <p className={styles.total}>Razem: {calculation.total.toFixed(2)} PLN</p>
                            </div>

                            <div className={styles.actions}>
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Anuluj
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Zapisz / Dodaj do koszyka
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
