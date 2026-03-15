import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className="container">
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <h1 className="title">Kalkulator Korpusów Meblowych</h1>
        <p>Proste narzędzie do wyceny szafek.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <Link href="/cabinets" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Przejdź do kalkulatora
          </Link>
          <Link href="/room-planner" className="btn btn-secondary" style={{ textDecoration: 'none', background: '#10b981', color: 'white', border: 'none' }}>
            Planer 3D (BETA)
          </Link>
        </div>
      </div>
    </main>
  );
}
