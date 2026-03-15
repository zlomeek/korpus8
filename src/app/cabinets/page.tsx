"use client";

import { useState } from "react";
import { cabinetTemplates, Cabinet } from "@/data/cabinets";
import CabinetCard from "@/components/CabinetCard";
import CabinetForm from "@/components/CabinetForm";
import CustomCabinetForm from "@/components/CustomCabinetForm";
import Cart from "@/components/Cart";
import AdminPanel from "@/components/AdminPanel";
import { CalculationResult, defaultPricingSettings, PricingSettings } from "@/lib/calculate";

export default function CabinetsPage() {
    const [editingCabinet, setEditingCabinet] = useState<Cabinet | null>(null);
    const [isCreatingCustom, setIsCreatingCustom] = useState(false);
    const [pricingSettings, setPricingSettings] = useState<PricingSettings>(defaultPricingSettings);

    const handleEdit = (cabinet: Cabinet) => {
        setEditingCabinet(cabinet);
    };

    const handleAddToCart = (cabinet: Cabinet, calculation: CalculationResult) => {
        const cartItem = {
            id: `${cabinet.id}-${Date.now()}`,
            cabinet,
            calculation,
        };

        const existingCart = JSON.parse(localStorage.getItem("cart") || "[]");
        const newCart = [...existingCart, cartItem];
        localStorage.setItem("cart", JSON.stringify(newCart));

        // Dispatch event to update Cart component
        window.dispatchEvent(new Event("cartUpdated"));

        setEditingCabinet(null);
        setIsCreatingCustom(false);
    };
    const lowerCabinets = cabinetTemplates.filter(c => c.id.startsWith('dolna-') && !c.id.includes('lodowka') && !c.id.includes('piekarnik'));
    const upperCabinets = cabinetTemplates.filter(c => c.id.startsWith('gorna-'));
    const tallCabinets = cabinetTemplates.filter(c => c.id.startsWith('dolna-lodowka') || c.id === 'dolna-piekarnik');

    return (
        <main className="container">
            <AdminPanel
                settings={pricingSettings}
                onSettingsChange={setPricingSettings}
            />

            <h1 className="title">Wybierz szafkę</h1>

            <div style={{ marginBottom: "2rem", textAlign: "right" }}>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsCreatingCustom(true)}
                >
                    + Stwórz własną szafkę
                </button>
            </div>
            <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ marginBottom: '1rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', color: '#333' }}>Szafki dolne</h2>
                <div className="card-grid">
                    {lowerCabinets.map((cabinet) => (
                        <CabinetCard
                            key={cabinet.id}
                            cabinet={cabinet}
                            settings={pricingSettings}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ marginBottom: '1rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', color: '#333' }}>Szafki górne</h2>
                <div className="card-grid">
                    {upperCabinets.map((cabinet) => (
                        <CabinetCard
                            key={cabinet.id}
                            cabinet={cabinet}
                            settings={pricingSettings}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ marginBottom: '1rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', color: '#333' }}>Słupki</h2>
                <div className="card-grid">
                    {tallCabinets.map((cabinet) => (
                        <CabinetCard
                            key={cabinet.id}
                            cabinet={cabinet}
                            settings={pricingSettings}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            </div>

            <Cart settings={pricingSettings} />

            {
                editingCabinet && (
                    <CabinetForm
                        cabinet={editingCabinet}
                        settings={pricingSettings}
                        onClose={() => setEditingCabinet(null)}
                        onAddToCart={handleAddToCart}
                    />
                )
            }

            {
                isCreatingCustom && (
                    <CustomCabinetForm
                        settings={pricingSettings}
                        onClose={() => setIsCreatingCustom(false)}
                        onAddToCart={handleAddToCart}
                    />
                )
            }
        </main >
    );
}
