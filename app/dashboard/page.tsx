"use client";

export default function DashboardIndexPage() {
    return (
        <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "1rem" }}>
                Vyberte projekt
            </h1>
            <p style={{ color: "var(--text-muted)", marginBottom: "3rem", fontSize: "1rem" }}>
                Tento rozcestník je dočasný a nahradí ho neskôr tenant login flow.
            </p>

            <div style={{ display: "flex", gap: "1.5rem" }}>
                {/* Pizza Dashboard */}
                <a
                    href="/dashboard/pizza"
                    style={{
                        background: "rgba(0, 255, 209, 0.1)",
                        border: "1px solid var(--cyan)",
                        borderRadius: "16px",
                        padding: "2rem",
                        width: "280px",
                        textDecoration: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        transition: "all 0.2s",
                        cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(0, 255, 209, 0.2)";
                        e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(0, 255, 209, 0.1)";
                        e.currentTarget.style.transform = "translateY(0)";
                    }}
                >
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🍕</div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--cyan)", marginBottom: "0.5rem" }}>
                        Dashboard Pizza
                    </h2>
                    <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", textAlign: "center", margin: 0 }}>
                        Reálne dáta pre pizzeria tenant, prepojené s pizza databázou.
                    </p>
                </a>

                {/* Taxi Dashboard */}
                <a
                    href="/dashboard/taxi"
                    style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px",
                        padding: "2rem",
                        width: "280px",
                        textDecoration: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        transition: "all 0.2s",
                        cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                        e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                        e.currentTarget.style.transform = "translateY(0)";
                    }}
                >
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚕</div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
                        Dashboard Taxi
                    </h2>
                    <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textAlign: "center", margin: 0 }}>
                        Pripravené na napojenie reálnych taxi dát. Placeholder mód.
                    </p>
                </a>
            </div>
        </div>
    );
}
