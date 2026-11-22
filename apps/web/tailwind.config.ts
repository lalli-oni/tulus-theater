import type { Config } from 'tailwindcss';

// Palette: old-theater charcoal, dark violet + emerald accents, restrained neon.
// Text colours were chosen for WCAG AA contrast on `ink`/`charcoal` surfaces.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0d',
        charcoal: { DEFAULT: '#141418', raised: '#1b1b22', line: '#2a2a35' },
        violet: { deep: '#2a1a4a', DEFAULT: '#6d3fc4', glow: '#a78bfa' },
        emerald: { deep: '#0d3b2e', DEFAULT: '#1f9d6e', glow: '#4ade9a' },
        parchment: { DEFAULT: '#e8e4f0', muted: '#a9a5b8' },
        blood: '#d9506b',
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neonViolet: '0 0 0 1px #6d3fc4, 0 0 12px -2px #a78bfa66',
        neonEmerald: '0 0 0 1px #1f9d6e, 0 0 12px -2px #4ade9a55',
      },
    },
  },
  plugins: [],
} satisfies Config;
