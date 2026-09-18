export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        popit: {
          purple: "#7928CA",
          accent: "#FF0080",
          yellow: "#FFDF00",
          dark: "#0F1016",
          card: "#181A20",
        },
      },
      animation: {
        "pulse-fast": "pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-short": "bounce 0.4s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

