import { useEffect } from 'react'

export interface HelpSection {
  title: string
  items: string[]
}

export interface HelpContent {
  title: string
  description: string
  sections: HelpSection[]
}

interface HelpPanelProps {
  open: boolean
  onClose: () => void
  content: HelpContent
}

export function HelpPanel({ open, onClose, content }: HelpPanelProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* 배경 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}

      {/* 슬라이드 패널 */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/30 bg-surface/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <span className="text-sm font-black text-primary">도움말</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-border/30 text-primary/40 hover:text-primary transition-colors text-sm">✕</button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 화면 제목 + 설명 */}
          <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
            <h3 className="text-sm font-black text-primary mb-1">{content.title}</h3>
            <p className="text-xs text-primary/60 leading-relaxed">{content.description}</p>
          </div>

          {/* 섹션별 내용 */}
          {content.sections.map((section, i) => (
            <div key={i}>
              <h4 className="text-xs font-black text-primary/40 uppercase tracking-wider mb-2">{section.title}</h4>
              <ul className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-primary/70 leading-relaxed">
                    <span className="text-secondary shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-border/20 text-[10px] text-primary/30 text-center">
          문의: 시스템 관리자에게 연락하세요
        </div>
      </div>
    </>
  )
}

/** 페이지 헤더에 붙이는 도움말 버튼 */
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-28 py-2.5 rounded-xl border border-border text-sm font-semibold text-primary/70 hover:bg-surface transition-colors"
    >
      ? 도움말
    </button>
  )
}
