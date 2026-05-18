/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.9s ease-out forwards',
        'ping-slow': 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      colors: {
        primary:    '#451A03',  // Walnut Brown — 헤더, CTA 버튼, 활성 탭
        secondary:  '#B45309',  // Brass Gold — AI 분석·매칭 강조, FAB
        accent:     '#FDE68A',  // Warm Sand — 선택 상태 강조
        background: '#FFFBEB',  // Cream Paper — 앱 전체 배경
        surface:    '#FFF8F0',  // Ivory — 카드, Bottom Sheet
        border:     '#D6C4A8',  // Beige Line — 구분선
        success:    '#166534',  // Sage Green — 검증 완료, 정산 완료
        warning:    '#D97706',  // Amber — Flagging, 이상 징후
        danger:     '#991B1B',  // Burnt Red — 에러, 계약 해지
        info:       '#1E293B',  // Slate Blue — 일반 공지
      },
      fontFamily: {
        sans:  ['Pretendard', 'sans-serif'],
        serif: ['Noto Serif KR', 'serif'],
      },
      minHeight: {
        touch: '44px',   // 최소 터치 영역 (UI 표준)
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
