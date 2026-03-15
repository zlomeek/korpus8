"use client";

import { Cabinet, CabinetElement } from "@/data/cabinets";
import { calculateCabinet, PricingSettings } from "@/lib/calculate";
import { useState, useEffect } from "react";
import styles from "./CabinetForm.module.css";

interface CustomCabinetFormProps {
    settings: PricingSettings;
    onClose: () => void;
    onAddToCart: (cabinet: Cabinet, calculation: any) => void;
}

const defaultCabinet: Cabinet = {
    id: "",
    name: "Moja Szafka",
    width: 600,
    height: 720,
    depth: 510,
    elements: [
        { id: "bok-lewy", name: "Bok lewy", height: 720, depth: 510 },
        { id: "bok-prawy", name: "Bok prawy", height: 720, depth: 510 },
        { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 510 }, // 600 - 36
        { id: "wieniec-gorny", name: "Wieniec górny", width: 564, depth: 510 },
        { id: "plecy", name: "Plecy", width: 596, height: 716 } // 600 - 4, 720 - 4
    ]
};

export default function CustomCabinetForm({ settings, onClose, onAddToCart }: CustomCabinetFormProps) {
    const [formData, setFormData] = useState<Cabinet>({ ...defaultCabinet, id: `custom-${Date.now()}` });
    const [calculation, setCalculation] = useState(calculateCabinet(defaultCabinet, settings));

    const [newElement, setNewElement] = useState({ name: "Nowy element", width: 500, depth: 500 });
    const [showAddElement, setShowAddElement] = useState(false);


    useEffect(() => {
        setCalculation(calculateCabinet(formData, settings));
    }, [formData, settings]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, name: e.target.value }));
    };

    const handleMasterDimChange = (field: 'width' | 'height' | 'depth', value: number) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            const updatedElements = updated.elements.map(el => {
                // Bok 
                if (el.name.toLowerCase().includes("bok")) {
                    return {
                        ...el,
                        height: updated.height,
                        depth: updated.depth
                    };
                }
                // Wieniec 
                if (el.name.toLowerCase().includes("wieniec")) {
                    return {
                        ...el,
                        width: Number((updated.width - 36).toFixed(1)),
                        depth: updated.depth
                    };
                }
                // Plecy 
                if (el.name.toLowerCase().includes("plecy")) {
                    return {
                        ...el,
                        width: Number((updated.width - 4).toFixed(1)),
                        height: Number((updated.height - 4).toFixed(1))
                    };
                }
                return el;
            });

            return { ...updated, elements: updatedElements };
        });
    };

    const handleElementChange = (index: number, field: keyof CabinetElement, value: number | string) => {
        setFormData(prev => {
            const newElements = [...prev.elements];
            newElements[index] = { ...newElements[index], [field]: value };
            return { ...prev, elements: newElements };
        });
    };

    const handleAddElement = () => {
        setFormData(prev => ({
            ...prev,
            elements: [
                ...prev.elements,
                {
                    id: `el-${Date.now()}`,
                    name: newElement.name,
                    width: newElement.width || 0,
                    depth: newElement.depth || 0
                }
            ]
        }));
        setShowAddElement(false);
        setNewElement({ name: "Nowy element", width: 500, depth: 500 });
    };

    const removeElement = (index: number) => {
        setFormData(prev => {
            const newElements = prev.elements.filter((_, i) => i !== index);
            return { ...prev, elements: newElements };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddToCart(formData, calculation);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <h2>Stwórz własną szafkę</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nazwa szafki</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={handleNameChange}
                            className="input"
                            style={{ width: '100%', padding: '0.5rem' }}
                        />
                    </div>

                    <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #bae6fd' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '0.5rem' }}>Wymiary Korpusu (Master)</h3>
                        <div className={styles.grid} style={{ marginBottom: 0 }}>
                            <label>
                                Szerokość (mm)
                                <input
                                    type="number"
                                    value={formData.width}
                                    onChange={(e) => handleMasterDimChange('width', Number(e.target.value))}
                                />
                            </label>
                            <label>
                                Wysokość (mm)
                                <input
                                    type="number"
                                    value={formData.height}
                                    onChange={(e) => handleMasterDimChange('height', Number(e.target.value))}
                                />
                            </label>
                            <label>
                                Głębokość (mm)
                                <input
                                    type="number"
                                    value={formData.depth}
                                    onChange={(e) => handleMasterDimChange('depth', Number(e.target.value))}
                                />
                            </label>
                        </div>
                    </div>

                    <div className={styles.elementsList} style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Lista Elementów</h3>
                        {formData.elements.map((el, index) => (
                            <div key={el.id} className={styles.elementRow} style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <strong>{el.name}</strong>
                                    <button type="button" onClick={() => removeElement(index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Usuń</button>
                                </div>
                                <div className={styles.grid} style={{ marginBottom: 0 }}>
                                    {el.width !== undefined && (
                                        <label>
                                            Szerokość (mm)
                                            <input
                                                type="number"
                                                value={el.width}
                                                onChange={(e) => handleElementChange(index, 'width', Number(e.target.value))}
                                            />
                                        </label>
                                    )}
                                    {el.height !== undefined && (
                                        <label>
                                            Wysokość (mm)
                                            <input
                                                type="number"
                                                value={el.height}
                                                onChange={(e) => handleElementChange(index, 'height', Number(e.target.value))}
                                            />
                                        </label>
                                    )}
                                    {el.depth !== undefined && (
                                        <label>
                                            Głębokość (mm)
                                            <input
                                                type="number"
                                                value={el.depth}
                                                onChange={(e) => handleElementChange(index, 'depth', Number(e.target.value))}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {!showAddElement ? (
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddElement(true)} style={{ width: '100%', marginBottom: '1rem' }}>
                            + Dodaj element
                        </button>
                    ) : (
                        <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                            <h4>Dodaj nowy element</h4>
                            <div className={styles.grid}>
                                <label style={{ gridColumn: '1 / -1' }}>
                                    Nazwa
                                    <input type="text" value={newElement.name} onChange={(e) => setNewElement({ ...newElement, name: e.target.value })} />
                                </label>
                                <label>
                                    Szerokość (mm)
                                    <input type="number" value={newElement.width} onChange={(e) => setNewElement({ ...newElement, width: Number(e.target.value) })} />
                                </label>
                                <label>
                                    Głębokość (mm)
                                    <input type="number" value={newElement.depth} onChange={(e) => setNewElement({ ...newElement, depth: Number(e.target.value) })} />
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-primary" onClick={handleAddElement}>Dodaj</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddElement(false)}>Anuluj</button>
                            </div>
                        </div>
                    )}

                    <div className={styles.summary}>
                        <p><strong>Kosztorys:</strong></p>
                        <p>Korpus: {calculation.boardCost.toFixed(2)} PLN</p>
                        <p>Plecy: {calculation.backCost.toFixed(2)} PLN</p>
                        <p>Nogi ({calculation.legsCount} szt.): {calculation.legsCost.toFixed(2)} PLN</p>
                        <p className={styles.total}>Razem: {calculation.total.toFixed(2)} PLN</p>
                    </div>

                    <div className={styles.actions}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Anuluj
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Dodaj do koszyka
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
