"use client";

import { useEffect, useState } from "react";
import styles from "./Cart.module.css";
import { Cabinet } from "@/data/cabinets";
import { CalculationResult, PricingSettings, calculateCabinet } from "@/lib/calculate";

interface CartItem {
    id: string;
    cabinet: Cabinet;
    // stored calculation might be stale, we will recalculate
    calculation: CalculationResult;
}

interface CartProps {
    settings: PricingSettings;
}

export default function Cart({ settings }: CartProps) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const loadCart = () => {
            const saved = localStorage.getItem("cart");
            if (saved) {
                setItems(JSON.parse(saved));
            }
        };

        loadCart();

        window.addEventListener("storage", loadCart);
        window.addEventListener("cartUpdated", loadCart);

        return () => {
            window.removeEventListener("storage", loadCart);
            window.removeEventListener("cartUpdated", loadCart);
        };
    }, []);

    // Recalculate totals based on current settings
    const recalculatedItems = items.map(item => ({
        ...item,
        currentCalculation: calculateCabinet(item.cabinet, settings)
    }));

    const total = recalculatedItems.reduce((sum, item) => sum + item.currentCalculation.total, 0);

    const removeItem = (id: string) => {
        const newItems = items.filter(item => item.id !== id);
        setItems(newItems);
        localStorage.setItem("cart", JSON.stringify(newItems));
        window.dispatchEvent(new Event("cartUpdated"));
    };

    const clearCart = () => {
        setItems([]);
        localStorage.removeItem("cart");
        window.dispatchEvent(new Event("cartUpdated"));
    }

    if (!isOpen) {
        return (
            <button className={styles.floatingBtn} onClick={() => setIsOpen(true)}>
                Koszyk ({items.length}) - {total.toFixed(2)} PLN
            </button>
        );
    }

    return (
        <div className={styles.cartOverlay}>
            <div className={styles.cartPanel}>
                <div className={styles.header}>
                    <h2>Koszyk</h2>
                    <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>×</button>
                </div>

                {items.length === 0 ? (
                    <p>Twój koszyk jest pusty.</p>
                ) : (
                    <div className={styles.list}>
                        {recalculatedItems.map((item) => (
                            <div key={item.id} className={styles.item}>
                                <div className={styles.itemHeader}>
                                    <strong>{item.cabinet.name}</strong>
                                    <button onClick={() => removeItem(item.id)} className={styles.removeBtn}>Usuń</button>
                                </div>
                                <div className={styles.itemDetails}>
                                    Wymiary: {item.cabinet.width}x{item.cabinet.height}x{item.cabinet.depth} mm
                                </div>
                                {(item.cabinet as any).configuration && (
                                    <div className={styles.itemDetails}>
                                        Konfiguracja: {(item.cabinet as any).configuration}
                                    </div>
                                )}
                                <div className={styles.itemDetails}>
                                    Korpus: {item.currentCalculation.totalM2Body.toFixed(3)}m² | Plecy: {item.currentCalculation.totalM2Back.toFixed(3)}m²
                                </div>
                                <div className={styles.itemDetails}>
                                    Nogi: {item.currentCalculation.legsCount} szt.
                                </div>
                                <div className={styles.itemPrice}>
                                    {item.currentCalculation.total.toFixed(2)} PLN
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.footer}>
                    <div className={styles.totalRow}>
                        <span>Razem:</span>
                        <span>{total.toFixed(2)} PLN</span>
                    </div>
                    {items.length > 0 && (
                        <button className="btn btn-secondary" onClick={clearCart} style={{ width: '100%', marginTop: '1rem' }}>
                            Wyczyść koszyk
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
