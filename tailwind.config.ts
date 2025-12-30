import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        headline: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
        code: ["monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        status: {
          empty: {
            bg: "hsl(var(--status-empty-bg))",
            text: "hsl(var(--status-empty-text))",
          },
          occupied: {
            bg: "hsl(var(--status-occupied-bg))",
            text: "hsl(var(--status-occupied-text))",
          },
        },
        brand: {
          zomato: "hsl(var(--brand-zomato))",
          swiggy: "hsl(var(--brand-swiggy))",
        },
        chart: {
          online: "hsl(var(--chart-online))",
          pie1: "hsl(var(--chart-pie-1))",
          pie2: "hsl(var(--chart-pie-2))",
          pie3: "hsl(var(--chart-pie-3))",
          pie4: "hsl(var(--chart-pie-4))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: "hsl(var(--primary))",
          "primary-foreground": "hsl(var(--primary-foreground))",
          accent: "hsl(var(--accent))",
          "accent-foreground": "hsl(var(--accent-foreground))",
          border: "hsl(var(--border))",
          ring: "hsl(var(--ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "food-pattern":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Cg fill-opacity='0.15'%3E%3Ctext x='100' y='100' font-size='40'%3E🍕%3C/text%3E%3Ctext x='300' y='50' font-size='40'%3E🍔%3C/text%3E%3Ctext x='500' y='150' font-size='40'%3E🍟%3C/text%3E%3Ctext x='400' y='300' font-size='40'%3E🍕%3C/text%3E%3Ctext x='50' y='400' font-size='40'%3E🍔%3C/text%3E%3Ctext x='250' y='500' font-size='40'%3E🍟%3C/text%3E%3Ctext x='550' y='500' font-size='40'%3E🍕%3C/text%3E%3Ctext x='150' y='200' font-size='40'%3E🍔%3C/text%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;