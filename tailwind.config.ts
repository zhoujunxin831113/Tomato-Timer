import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '1024px',
    },
    extend: {
      colors: {
        focus: 'var(--color-focus)',
        'focus-hover': 'var(--color-focus-hover)',
        'short-break': 'var(--color-short-break)',
        'long-break': 'var(--color-long-break)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        page: 'var(--color-bg)',
        card: 'var(--color-card)',
        ink: 'var(--color-text)',
        muted: 'var(--color-text-secondary)',
        line: 'var(--color-border)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        primary: 'var(--shadow-primary)',
      },
      fontSize: {
        timer: ['var(--font-size-timer)', { lineHeight: '1' }],
        'timer-mobile': ['var(--font-size-timer-mobile)', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
