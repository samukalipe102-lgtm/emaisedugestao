/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/index.html", "./src/renderer/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // Design system — SaaS institucional
        canvas: "#F8FAFC", // fundo principal cinza-gelo
        card: "#FFFFFF", // cards branco puro
        line: "#E2E8F0", // bordas sutis
        ink: {
          900: "#0F172A", // azul marinho institucional
          800: "#1E293B",
          700: "#334155",
          600: "#475569",
          500: "#64748B",
          400: "#94A3B8",
        },
        navy: "#1E3A8A", // índigo institucional
        royal: "#2563EB", // botão primário azul royal
        // badges semânticos suaves
        emerald: {
          soft: "#ECFDF5",
          DEFAULT: "#10B981",
          ink: "#047857",
        },
        amber: {
          soft: "#FFFBEB",
          DEFAULT: "#F59E0B",
          ink: "#B45309",
        },
        danger: {
          soft: "#FEF2F2",
          DEFAULT: "#EF4444",
          ink: "#B91C1C",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
        pop: "0 10px 30px -10px rgba(15, 23, 42, 0.25)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
