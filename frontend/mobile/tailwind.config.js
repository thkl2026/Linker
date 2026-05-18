/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:    '#451A03',
        secondary:  '#B45309',
        accent:     '#FDE68A',
        background: '#FFFBEB',
        surface:    '#FFF8F0',
        border:     '#D6C4A8',
        success:    '#166534',
        warning:    '#D97706',
        danger:     '#991B1B',
        info:       '#1E293B',
      },
      fontFamily: {
        sans: ['Pretendard'],
      },
      minHeight: {
        touch: 44,   // 최소 터치 영역 44px (UI 표준)
      },
      minWidth: {
        touch: 44,
      },
    },
  },
  plugins: [],
}
