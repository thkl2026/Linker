import { useEffect, useState } from 'react'

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
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 패널이 닫히면 검색어 초기화
  useEffect(() => { if (!open) setQuery('') }, [open])

  const q = query.trim().toLowerCase()
  const filteredSections = q
    ? content.sections
        .map(s => ({
          title: s.title,
          items: s.items.filter(it => it.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)),
        }))
        .filter(s => s.items.length > 0)
    : content.sections

  const hasResults = filteredSections.length > 0

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

        {/* 검색 */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 gap-2 focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-secondary/30 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="도움말 검색"
              className="flex-1 bg-transparent text-xs text-primary placeholder:text-gray-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-primary text-xs shrink-0">✕</button>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* 화면 제목 + 설명 (검색 중에는 숨김) */}
          {!q && (
            <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
              <h3 className="text-sm font-black text-primary mb-1">{content.title}</h3>
              <p className="text-xs text-primary/60 leading-relaxed">{content.description}</p>
            </div>
          )}

          {/* 섹션별 내용 */}
          {hasResults ? (
            filteredSections.map((section, i) => (
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
            ))
          ) : (
            <p className="text-xs text-primary/30 text-center py-8">검색 결과가 없습니다.</p>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-border/20 text-[10px] text-primary/30 text-center">
          문의: 시스템 관리자에게 연락하세요
        </div>
      </div>
    </>
  )
}

/** 페이지 헤더에 붙이는 도움말 버튼 — 원형 물음표 아이콘 */
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="도움말"
      className="w-[1.6rem] h-[1.6rem] rounded-full border border-border text-primary/50 hover:text-primary hover:bg-surface flex items-center justify-center text-xs font-bold transition-colors shrink-0"
    >
      ?
    </button>
  )
}
