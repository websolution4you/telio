import { ImageResponse } from "next/og";

export const alt = "Telio — AI hlasový asistent pre firmy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #050b12 0%, #11152a 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "80px",
        textAlign: "center",
        width: "100%",
      }}
    >
      <div style={{ color: "#00ffd1", display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: 8 }}>
        TELIO
      </div>
      <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1.1, marginTop: 32 }}>
        AI hlasový asistent pre firmy
      </div>
      <div style={{ color: "#b7c1cc", display: "flex", fontSize: 32, marginTop: 32 }}>
        Zdvihne každý hovor. Rezervuje 24/7.
      </div>
    </div>,
    size,
  );
}
