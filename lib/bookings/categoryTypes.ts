export type AdminReservationCategory = {
  id: string;
  name: string;
  color: string;
  border: string;
  isSystem: boolean;
  hasPlayerField: boolean;
  sortOrder: number;
};

export const DEFAULT_ADMIN_CATEGORIES: AdminReservationCategory[] = [
  {
    id: "maintenance",
    name: "Údržba kurtov",
    color: "#FFC9C9",
    border: "#F29E9E",
    isSystem: true,
    hasPlayerField: false,
    sortOrder: 1,
  },
  {
    id: "admin_reservation",
    name: "Rezervácia Admin",
    color: "#FFFF33",
    border: "#E6E600",
    isSystem: true,
    hasPlayerField: true,
    sortOrder: 2,
  },
  {
    id: "training",
    name: "Tréningy",
    color: "#F4CDE4",
    border: "#EAAECF",
    isSystem: true,
    hasPlayerField: true,
    sortOrder: 3,
  },
];

// Helper to calculate slightly darker border from a hex color
export function calculateBorderColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) - 25;
  let g = ((num >> 8) & 0x00ff) - 25;
  let b = (num & 0x0000ff) - 25;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}
