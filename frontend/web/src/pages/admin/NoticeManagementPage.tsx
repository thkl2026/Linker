import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUiStore } from '@/store/uiStore'
import {
  noticeApi,
  NOTICE_CATEGORIES,
  type Notice,
  type CreateNoticeRequest,
} from '@/shared/api/noticeApi'

// ── 카테고리 배지 ────────────────────────────────────────────────────────────
const CAT_STYLE: Record<string, string> = {
  '운영/시스템':   'bg-secondary/10 text-secondary',
  '비즈니스/정책': 'bg-primary/10 text-primary',
  '가이드/교육':   'bg-success/10 text-success',
}

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${CAT_STYLE[cat] ?? 'bg-border/30 text-primary/50'}`}>
      {cat}
    </span>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')
}

// ── 상세 모달 ────────────────────────────────────────────────────────────────
function DetailModal({
  notice, onClose, onEdit, onDelete, onToggleHidden, onTogglePinned,
}: {
  notice: Notice
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleHidden: () => void
  onTogglePinned: () => void
}) {
  return (
    <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-10"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-background w-full max-w-4xl max-h-[80vh] rounded-[40px] shadow-2xl border border-white/50 flex flex-col overflow-hidden">
        <div className="px-12 py-8 bg-white border-b border-border/20 flex justify-between items-start">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CategoryBadge cat={notice.category} />
              {notice.pinned && <span className="text-sm">📌</span>}
              {notice.hidden && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/5 text-primary/40">숨김</span>}
              <span className="text-xs text-primary/40 font-bold">
                작성일: {fmtDate(notice.createdAt)} · 조회수: {notice.viewCount.toLocaleString()}
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">{notice.title}</h3>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                {notice.authorName.charAt(0)}
              </div>
              <span className="text-xs font-medium text-primary/60">{notice.authorName}</span>
            </div>
          </div>
          <button onClick={onClose}
            className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-danger hover:text-white transition-all shrink-0">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-12 py-10 custom-scrollbar">
          <div className="text-sm text-primary/80 leading-relaxed whitespace-pre-wrap">{notice.content}</div>
        </div>

        <div className="px-12 py-6 bg-white border-t border-border/20 flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={onDelete}
              className="px-5 py-2 bg-background border border-border/30 rounded-xl text-xs font-bold hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-all">
              삭제
            </button>
            <button onClick={onToggleHidden}
              className="px-5 py-2 bg-background border border-border/30 rounded-xl text-xs font-bold hover:bg-white transition-all">
              {notice.hidden ? '표시하기' : '숨기기'}
            </button>
            <button onClick={onTogglePinned}
              className="px-5 py-2 bg-background border border-border/30 rounded-xl text-xs font-bold hover:bg-white transition-all">
              {notice.pinned ? '고정 해제' : '📌 고정'}
            </button>
          </div>
          <button onClick={onEdit}
            className="px-8 py-3 bg-secondary text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all">
            수정하기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 작성/수정 모달 ──────────────────────────────────────────────────────────
function EditModal({
  initial, onClose, onSave,
}: {
  initial: Partial<Notice> | null
  onClose: () => void
  onSave: (req: CreateNoticeRequest) => void
}) {
  const [form, setForm] = useState<CreateNoticeRequest>({
    title:      initial?.title      ?? '',
    content:    initial?.content    ?? '',
    category:   initial?.category   ?? NOTICE_CATEGORIES[0],
    pinned:     initial?.pinned     ?? false,
    authorName: initial?.authorName ?? '관리자',
  })

  const isEdit = !!initial?.id
  const inputCls = 'w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-secondary transition-all'

  return (
    <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-10"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-background w-full max-w-3xl max-h-[85vh] rounded-[40px] shadow-2xl border border-white/50 flex flex-col overflow-hidden">
        <div className="px-12 py-8 bg-white border-b border-border/20 flex justify-between items-center">
          <h3 className="text-xl font-black">{isEdit ? '공지사항 수정' : '신규 공지 작성'}</h3>
          <button onClick={onClose}
            className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-danger hover:text-white transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-12 py-8 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-primary/40 uppercase mb-2 ml-1 tracking-widest">카테고리</label>
            <div className="flex gap-2">
              {NOTICE_CATEGORIES.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, category: c }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${form.category === c ? 'bg-secondary text-white border-secondary shadow-md' : 'bg-white border-border/50 text-primary/50 hover:border-secondary/50'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-primary/40 uppercase mb-2 ml-1 tracking-widest">제목 *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputCls} placeholder="공지사항 제목을 입력하세요" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-primary/40 uppercase mb-2 ml-1 tracking-widest">내용 *</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={12}
              className="w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-secondary transition-all resize-none"
              placeholder="공지사항 내용을 입력하세요" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-primary/40 uppercase mb-2 ml-1 tracking-widest">작성자</label>
              <input value={form.authorName} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
                className={inputCls} placeholder="관리자" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, pinned: !f.pinned }))}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${form.pinned ? 'bg-secondary' : 'bg-border/50'}`}>
                  <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 ${form.pinned ? 'right-1' : 'left-1'}`} />
                </button>
                <span className="text-sm font-bold text-primary/70">📌 상단 고정</span>
              </label>
            </div>
          </div>
        </div>

        <div className="px-12 py-6 bg-white border-t border-border/20 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-6 py-3 bg-background border border-border/30 rounded-xl text-sm font-bold hover:bg-white transition-all">
            취소
          </button>
          <button onClick={() => { if (form.title.trim() && form.content.trim()) onSave(form) }}
            disabled={!form.title.trim() || !form.content.trim()}
            className="px-10 py-3 bg-secondary text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100">
            {isEdit ? '저장하기' : '등록하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export function NoticeManagementPage() {
  const { addToast } = useUiStore()
  const qc = useQueryClient()

  const [category, setCategory]     = useState('')
  const [keyword, setKeyword]       = useState('')
  const [page, setPage]             = useState(0)
  const [selected, setSelected]     = useState<Notice | null>(null)
  const [editTarget, setEditTarget] = useState<Partial<Notice> | null | false>(false)

  const { data: statsData } = useQuery({
    queryKey: ['notices', 'stats'],
    queryFn: () => noticeApi.stats().then(r => r.data),
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['notices', 'list', category, keyword, page],
    queryFn: () => noticeApi.list({ category: category || undefined, keyword: keyword || undefined, page, size: 10 }).then(r => r.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notices'] })
  }

  const createMutation = useMutation({
    mutationFn: (req: CreateNoticeRequest) => noticeApi.create(req),
    onSuccess: () => { addToast('공지가 등록되었습니다.', 'success'); invalidate(); setEditTarget(false) },
    onError: () => addToast('등록에 실패했습니다.', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: CreateNoticeRequest }) =>
      noticeApi.update(id, req),
    onSuccess: (res) => {
      addToast('공지가 수정되었습니다.', 'success')
      invalidate()
      setEditTarget(false)
      setSelected(res.data)
    },
    onError: () => addToast('수정에 실패했습니다.', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => noticeApi.delete(id),
    onSuccess: () => { addToast('공지가 삭제되었습니다.', 'success'); invalidate(); setSelected(null) },
    onError: () => addToast('삭제에 실패했습니다.', 'error'),
  })

  const toggleHiddenMutation = useMutation({
    mutationFn: (id: string) => noticeApi.toggleHidden(id),
    onSuccess: (_, id) => {
      invalidate()
      if (selected?.id === id) setSelected(s => s ? { ...s, hidden: !s.hidden } : s)
    },
  })

  const togglePinnedMutation = useMutation({
    mutationFn: (id: string) => noticeApi.togglePinned(id),
    onSuccess: (_, id) => {
      invalidate()
      if (selected?.id === id) setSelected(s => s ? { ...s, pinned: !s.pinned } : s)
    },
  })

  const notices     = listData?.content ?? []
  const totalPages  = listData?.totalPages ?? 1
  const totalItems  = listData?.totalElements ?? 0
  const stats       = statsData

  function handleRowClick(n: Notice) {
    noticeApi.getById(n.id).then(r => setSelected(r.data))
  }

  return (
    <div className="p-10 space-y-8 bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight">공지사항 관리</h2>
          <p className="text-xs text-primary/40 mt-0.5">Linker 플랫폼의 주요 공지 및 안내 사항을 체계적으로 관리합니다.</p>
        </div>
        <button onClick={() => setEditTarget({})}
          className="px-6 py-3 bg-primary text-white rounded-2xl text-sm font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
          + 신규 공지 작성
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: '전체 공지', value: stats?.total ?? 0, icon: '📢', color: 'text-primary' },
          { label: '고정 공지', value: stats?.pinned ?? 0, icon: '📌', color: 'text-secondary' },
          { label: '이번 달 신규', value: stats?.thisMonth ?? 0, icon: '✨', color: 'text-success' },
        ].map(s => (
          <div key={s.label} className="bg-white p-8 rounded-[32px] border border-border/20 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
            <div className="w-16 h-16 rounded-2xl bg-background flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
              {s.icon}
            </div>
            <div>
              <p className="text-[11px] font-black text-primary/40 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 필터 + 검색 */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/20 shadow-sm">
          {[{ id: '', label: '전체' }, ...NOTICE_CATEGORIES.map(c => ({ id: c, label: c }))].map(tab => (
            <button key={tab.id}
              onClick={() => { setCategory(tab.id); setPage(0) }}
              className={`px-6 py-2.5 text-xs font-bold rounded-xl transition-all ${category === tab.id ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-primary/50 hover:bg-white hover:text-secondary'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-96">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/30">🔍</span>
          <input value={keyword} onChange={e => { setKeyword(e.target.value); setPage(0) }}
            placeholder="공지사항 제목, 내용 또는 작성자 검색..."
            className="w-full pl-12 pr-5 py-4 bg-white border border-border/20 rounded-[20px] text-sm focus:outline-none focus:ring-4 focus:ring-secondary/5 transition-all shadow-sm" />
        </div>
      </div>

      {/* 목록 테이블 */}
      <div className="bg-white rounded-[40px] border border-border/20 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-background/30 border-b border-border/10">
              <th className="px-10 py-6 text-[10px] font-black text-primary/40 uppercase tracking-widest">번호</th>
              <th className="px-4 py-6 text-[10px] font-black text-primary/40 uppercase tracking-widest">카테고리</th>
              <th className="px-4 py-6 text-[10px] font-black text-primary/40 uppercase tracking-widest">제목</th>
              <th className="px-4 py-6 text-[10px] font-black text-primary/40 uppercase tracking-widest">작성자</th>
              <th className="px-4 py-6 text-[10px] font-black text-primary/40 uppercase tracking-widest text-center">작성일</th>
              <th className="px-4 py-6 text-[10px] font-black text-primary/40 uppercase tracking-widest text-center">조회수</th>
              <th className="px-10 py-6 text-right text-[10px] font-black text-primary/40 uppercase tracking-widest">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/5">
            {isLoading ? (
              <tr><td colSpan={7} className="px-10 py-32 text-center text-sm text-primary/30 font-medium italic">Data Loading...</td></tr>
            ) : notices.length === 0 ? (
              <tr><td colSpan={7} className="px-10 py-32 text-center text-sm text-primary/30 font-medium italic">No notices found.</td></tr>
            ) : notices.map((n, idx) => (
              <tr key={n.id}
                onClick={() => handleRowClick(n)}
                className={`group cursor-pointer transition-all hover:bg-background/50 ${n.pinned ? 'bg-secondary/[0.02]' : ''} ${n.hidden ? 'opacity-50' : ''}`}>
                <td className="px-10 py-6">
                  {n.pinned
                    ? <span className="text-xl animate-bounce-slow">📌</span>
                    : <span className="text-xs text-primary/40 font-bold">{totalItems - (page * 10) - idx}</span>
                  }
                </td>
                <td className="px-4 py-6"><CategoryBadge cat={n.category} /></td>
                <td className="px-4 py-6">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm group-hover:text-secondary transition-colors ${n.pinned ? 'font-bold text-primary' : 'font-medium text-primary/80'}`}>
                      {n.title}
                    </span>
                    {n.hidden && <span className="px-1.5 py-0.5 bg-primary/5 text-primary/30 text-[9px] font-black rounded uppercase tracking-tighter">Hidden</span>}
                  </div>
                </td>
                <td className="px-4 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-xs font-black text-primary/60 border border-primary/5">
                      {n.authorName.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-primary/70">{n.authorName}</span>
                  </div>
                </td>
                <td className="px-4 py-6 text-xs text-primary/40 text-center font-medium">{fmtDate(n.createdAt)}</td>
                <td className="px-4 py-6 text-xs text-primary/40 text-center font-black">{n.viewCount.toLocaleString()}</td>
                <td className="px-10 py-6 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button onClick={() => setEditTarget(n)}
                      className="w-9 h-9 flex items-center justify-center text-primary/40 hover:text-secondary hover:bg-secondary/5 rounded-xl transition-all" title="수정">
                      ✏️
                    </button>
                    <button onClick={() => { if(confirm('정말 삭제하시겠습니까?')) deleteMutation.mutate(n.id) }}
                      className="w-9 h-9 flex items-center justify-center text-primary/40 hover:text-danger hover:bg-danger/5 rounded-xl transition-all" title="삭제">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-6">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="w-12 h-12 rounded-2xl bg-white border border-border/20 flex items-center justify-center text-primary/30 hover:bg-background hover:text-secondary transition-all disabled:opacity-20 disabled:pointer-events-none shadow-sm">
            ⟨
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className={`w-12 h-12 rounded-2xl font-black text-sm transition-all ${i === page ? 'bg-secondary text-white shadow-xl shadow-secondary/30 scale-110' : 'bg-white border border-border/20 text-primary/40 hover:border-secondary hover:text-secondary shadow-sm'}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="w-12 h-12 rounded-2xl bg-white border border-border/20 flex items-center justify-center text-primary/30 hover:bg-background hover:text-secondary transition-all disabled:opacity-20 disabled:pointer-events-none shadow-sm">
            ⟩
          </button>
        </div>
      )}

      {/* 상세 모달 */}
      {selected && (
        <DetailModal
          notice={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditTarget(selected); setSelected(null) }}
          onDelete={() => deleteMutation.mutate(selected.id)}
          onToggleHidden={() => toggleHiddenMutation.mutate(selected.id)}
          onTogglePinned={() => togglePinnedMutation.mutate(selected.id)}
        />
      )}

      {/* 작성/수정 모달 */}
      {editTarget !== false && (
        <EditModal
          initial={editTarget}
          onClose={() => setEditTarget(false)}
          onSave={req => {
            if (editTarget && 'id' in editTarget && editTarget.id) {
              updateMutation.mutate({ id: editTarget.id, req })
            } else {
              createMutation.mutate(req)
            }
          }}
        />
      )}
    </div>
  )
}
