import { useQuery } from '@tanstack/react-query'
import { contractApi } from '@/shared/api/contractApi'
import { useState } from 'react'

/**
 * 정산 현황 목록 — contractId를 입력받아 정산 내역 표시 (Phase 5)
 */
export function SettlementListPage() {
  const [contractId, setContractId] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const { data: settlements, isLoading } = useQuery({
    queryKey: ['settlements', activeId],
    queryFn: () => contractApi.listSettlements(activeId!),
    enabled: !!activeId,
  })

  const STATUS_COLOR: Record<string, string> = {
    DRAFT:    'bg-yellow-50 text-yellow-700',
    APPROVED: 'bg-blue-50 text-blue-700',
    PAID:     'bg-green-50 text-green-700',
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-6">정산 현황</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="계약 UUID"
          value={contractId}
          onChange={e => setContractId(e.target.value)}
          className="flex-1 max-w-sm border border-amber-200 rounded-xl px-4 py-2 text-sm"
        />
        <button
          onClick={() => contractId.trim() && setActiveId(contractId.trim())}
          className="px-4 py-2 bg-amber-900 text-white text-sm rounded-xl hover:bg-amber-800"
        >
          조회
        </button>
      </div>

      {isLoading && <p className="text-info/60">로딩 중…</p>}

      {settlements && (
        <div className="space-y-3">
          {settlements.length === 0 && (
            <p className="text-sm text-gray-400">정산 내역이 없습니다.</p>
          )}
          {settlements.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-semibold text-gray-800">{s.settlementMonth}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  총 {s.totalHours}h · 총액 ₩{s.grossAmount?.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  실지급 ₩{s.netAmount?.toLocaleString()}
                </p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLOR[s.status] ?? 'bg-gray-50 text-gray-600'}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
