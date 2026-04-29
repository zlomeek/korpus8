"use client";

import React from "react";
import { Cabinet } from "@/data/cabinets";
import { calculateCabinet, defaultPricingSettings, CalculationResult } from "@/lib/calculate";
import { PlacedCabinet } from "./RoomPlanner";

interface CartItem {
    uuid: string;
    cabinet: Cabinet;
    calc: CalculationResult;
}

interface CartPanelProps {
    placedCabinets: PlacedCabinet[];
    onClose: () => void;
}

const fmt = (n: number) =>
    n.toLocaleString("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 2 });

const fmtM2 = (n: number) =>
    n.toLocaleString("pl-PL", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " m²";

function CabinetRow({ item, index }: { item: CartItem; index: number }) {
    const [expanded, setExpanded] = React.useState(false);
    const { cabinet, calc } = item;
    const c = cabinet as any;

    const label = [cabinet.width, cabinet.height, cabinet.depth].join("×");
    const isBlat = cabinet.id.startsWith("blat-");

    return (
        <div style={{
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            transition: "background 0.15s",
        }}>
            {/* Row Header */}
            <div
                onClick={() => setExpanded(e => !e)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 16px",
                    cursor: "pointer",
                    background: expanded ? "rgba(255,255,255,0.04)" : "transparent",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = expanded ? "rgba(255,255,255,0.04)" : "transparent")}
            >
                {/* Index badge */}
                <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#374151", color: "#9ca3af",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
                }}>
                    {index + 1}
                </div>

                {/* Name + dims */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: "0.82rem", fontWeight: 600, color: "#f3f4f6",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {cabinet.name}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 1 }}>
                        {label} mm
                        {c.configUnder?.length > 0 && ` · ${c.configUnder.join(", ")}`}
                    </div>
                </div>

                {/* Price */}
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#4ade80", flexShrink: 0 }}>
                    {fmt(calc.total)}
                </div>

                {/* Chevron */}
                <div style={{
                    fontSize: "0.7rem", color: "#6b7280", flexShrink: 0,
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                }}>▼</div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div style={{
                    padding: "8px 16px 12px 48px",
                    background: "rgba(0,0,0,0.2)",
                    fontSize: "0.76rem",
                    color: "#9ca3af",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                }}>
                    {!isBlat && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Płyta ({fmtM2(calc.totalM2Body)})</span>
                                <span style={{ color: "#d1d5db" }}>{fmt(calc.boardCost)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Plecy ({fmtM2(calc.totalM2Back)})</span>
                                <span style={{ color: "#d1d5db" }}>{fmt(calc.backCost)}</span>
                            </div>
                            {calc.legsCount > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Nóżki ({calc.legsCount} szt.)</span>
                                    <span style={{ color: "#d1d5db" }}>{fmt(calc.legsCost)}</span>
                                </div>
                            )}
                        </>
                    )}
                    {isBlat && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Blat ({fmtM2(calc.totalM2Body)})</span>
                            <span style={{ color: "#d1d5db" }}>{fmt(calc.boardCost)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function CartPanel({ placedCabinets, onClose }: CartPanelProps) {
    const items: CartItem[] = placedCabinets.map(pc => ({
        uuid: pc.uuid,
        cabinet: pc.cabinet,
        calc: calculateCabinet(pc.cabinet, defaultPricingSettings),
    }));

    // Summary totals
    const totalPrice = items.reduce((s, i) => s + i.calc.total, 0);
    const totalM2Body = items.reduce((s, i) => s + i.calc.totalM2Body, 0);
    const totalM2Back = items.reduce((s, i) => s + i.calc.totalM2Back, 0);
    const totalLegs = items.reduce((s, i) => s + i.calc.legsCount, 0);

    // Group by type for summary badge counts
    const lowerCount = items.filter(i => i.cabinet.id.startsWith("dolna-")).length;
    const upperCount = items.filter(i => i.cabinet.id.startsWith("gorna-")).length;
    const blatCount = items.filter(i => i.cabinet.id.startsWith("blat-")).length;
    const tallCount = items.filter(i =>
        i.cabinet.id.includes("lodowka") || (i.cabinet.id.includes("piekarnik") && !i.cabinet.id.includes("podblatowa"))
    ).length;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 3000,
                    background: "rgba(0,0,0,0.45)",
                    backdropFilter: "blur(2px)",
                }}
            />

            {/* Sliding Panel */}
            <div style={{
                position: "fixed",
                top: 0, right: 0,
                height: "100vh",
                width: "380px",
                zIndex: 3001,
                background: "#18181b",
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                boxShadow: "-12px 0 40px rgba(0,0,0,0.6)",
                animation: "slideInRight 0.25s ease",
            }}>
                <style>{`
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to   { transform: translateX(0);    opacity: 1; }
                    }
                `}</style>

                {/* Header */}
                <div style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#111827",
                }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: "1.2rem" }}>🛒</span>
                            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
                                Wycena projektu
                            </span>
                            <span style={{
                                background: "#374151", color: "#9ca3af",
                                fontSize: "0.72rem", fontWeight: 700,
                                padding: "2px 7px", borderRadius: 999,
                            }}>
                                {items.length} szafek
                            </span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 3 }}>
                            {lowerCount > 0 && `${lowerCount} dolnych`}
                            {upperCount > 0 && `${lowerCount > 0 ? " · " : ""}${upperCount} górnych`}
                            {tallCount > 0 && ` · ${tallCount} słupków`}
                            {blatCount > 0 && ` · ${blatCount} blatów`}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 30, height: 30,
                            borderRadius: "50%",
                            border: "none",
                            background: "rgba(255,255,255,0.06)",
                            color: "#9ca3af",
                            cursor: "pointer",
                            fontSize: "1rem",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                    >
                        ×
                    </button>
                </div>

                {/* Pricing legend */}
                <div style={{
                    padding: "8px 16px",
                    background: "rgba(74, 222, 128, 0.04)",
                    borderBottom: "1px solid rgba(74, 222, 128, 0.1)",
                    fontSize: "0.7rem",
                    color: "#6b7280",
                    display: "flex",
                    gap: 14,
                }}>
                    <span>Płyta: <b style={{ color: "#9ca3af" }}>200 zł/m²</b></span>
                    <span>Plecy: <b style={{ color: "#9ca3af" }}>30 zł/m²</b></span>
                    <span>Nóżka: <b style={{ color: "#9ca3af" }}>4 zł/szt.</b></span>
                    <span>Blat: <b style={{ color: "#9ca3af" }}>250 zł/m²</b></span>
                </div>

                {/* Cabinet list */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {items.length === 0 ? (
                        <div style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", height: "60%",
                            color: "#4b5563", fontSize: "0.9rem", gap: 12,
                        }}>
                            <span style={{ fontSize: "2.5rem" }}>🪑</span>
                            <span>Dodaj szafki do planera</span>
                        </div>
                    ) : (
                        items.map((item, i) => (
                            <CabinetRow key={item.uuid} item={item} index={i} />
                        ))
                    )}
                </div>

                {/* Summary Footer */}
                {items.length > 0 && (
                    <div style={{
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        background: "#111827",
                    }}>
                        {/* Detail rows */}
                        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "#6b7280" }}>
                                <span>Płyta łącznie</span>
                                <span>{fmtM2(totalM2Body)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "#6b7280" }}>
                                <span>Plecy łącznie</span>
                                <span>{fmtM2(totalM2Back)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "#6b7280" }}>
                                <span>Nóżki łącznie</span>
                                <span>{totalLegs} szt.</span>
                            </div>
                        </div>

                        {/* Big total */}
                        <div style={{
                            margin: "0 16px 16px",
                            padding: "14px 18px",
                            background: "linear-gradient(135deg, rgba(74,222,128,0.12), rgba(16,185,129,0.08))",
                            border: "1px solid rgba(74,222,128,0.25)",
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}>
                            <div>
                                <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 2 }}>
                                    Łączna wartość projektu
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#4b5563" }}>
                                    {items.length} elementów
                                </div>
                            </div>
                            <div style={{
                                fontSize: "1.5rem",
                                fontWeight: 800,
                                color: "#4ade80",
                                letterSpacing: "-0.5px",
                            }}>
                                {fmt(totalPrice)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
