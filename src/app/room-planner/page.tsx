"use client";

import { useState } from "react";
import RoomPlanner from "@/components/RoomPlanner/RoomPlanner";

export default function RoomPlannerPage() {
    const [roomDimensions, setRoomDimensions] = useState<{ width: number; depth: number; height: number } | null>(null);

    const [formState, setFormState] = useState({
        width: 3000,
        depth: 3000,
        height: 2500
    });

    if (roomDimensions) {
        return <RoomPlanner roomDimensions={roomDimensions} onReset={() => setRoomDimensions(null)} />;
    }

    return (
        <main className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <h1 className="title" style={{ marginBottom: '2rem' }}>Kreator Pomieszczeń 3D</h1>

            <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
                <p style={{ marginBottom: '1.5rem', color: '#555', textAlign: 'center' }}>
                    Podaj parametry techniczne ścian pokoju, w którym chcesz umieścić swoje szafki z koszyka.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 'bold' }}>
                        Szerokość pokoju (mm)
                        <input
                            type="number"
                            min={1000}
                            max={10000}
                            step={100}
                            value={formState.width}
                            onChange={(e) => setFormState({ ...formState, width: Number(e.target.value) })}
                            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 'bold' }}>
                        Głębokość pokoju (mm)
                        <input
                            type="number"
                            min={1000}
                            max={10000}
                            step={100}
                            value={formState.depth}
                            onChange={(e) => setFormState({ ...formState, depth: Number(e.target.value) })}
                            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 'bold' }}>
                        Wysokość pomieszczenia (mm)
                        <input
                            type="number"
                            min={2000}
                            max={4000}
                            step={10}
                            value={formState.height}
                            onChange={(e) => setFormState({ ...formState, height: Number(e.target.value) })}
                            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    </label>
                </div>

                <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => setRoomDimensions(formState)}
                >
                    Wygeneruj pokój
                </button>
            </div>
        </main>
    );
}
