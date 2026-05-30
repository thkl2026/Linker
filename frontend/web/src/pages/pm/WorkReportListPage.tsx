import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import axiosInstance from '@/shared/api/axiosInstance'
import { HelpPanel, HelpButton } from '@/shared/components/HelpPanel'
import { helpWorkReport } from '@/shared/help/helpContent'

interface WorkReport {
  id: string
  contractId: string
  talentId: string
  reportDate: string
  content: string
  riskLevel: string | null
  sentimentScore: number | null
  riskSummary: string | null
  createdAt: string
}

const workReportApi = {
  listByContract: (contractId: string) =>
    axiosInstance.get<WorkReport[]>(`/api/v1/work-reports/by-contract/${contractId}`).then(r => r.data),
}

const RISK_COLOR: Record<string, string> = {
  LOW:    'bg-green-50 text-green-700',
  MEDIUM: 'bg-yellow-50 text-yellow-700',
  HIGH:   'bg-red-50 text-red-700',
}

/**
 * 업무 보고 목록 페이지 — AI 리스크 분석 결과 포함 (Phase 5)
 */
export function WorkReportListPage() {
  const [contractId, setContractId] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const { data: reports, isLoading } = useQuery({
    queryKey: ['work-reports', activeId],
    queryFn: () => workReportApi.listByContract(activeId!),
    enabled: !!activeId,
  })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">업무 보고</h1>
        <HelpButton onClick={() => setShowHelp(true)} />
      </div>

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

      <div className="space-y-4">
        {(reports ?? []).map(r => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="font-medium text-gray-800">{r.reportDate}</p>
              {r.riskLevel && (
                <div className="flex items-center gap-2">
                  {r.riskLevel === 'HIGH' && (
                    <span className="text-xs text-red-600 font-semibold">⚠ RISK ALERT</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLOR[r.riskLevel] ?? 'bg-gray-50 text-gray-600'}`}>
                    {r.riskLevel}
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{r.content}</p>
            {r.riskSummary && (
              <div className="mt-3 p-3 bg-red-50 rounded-xl">
                <p className="text-xs text-red-700 font-medium">AI 리스크 요약</p>
                <p className="text-xs text-red-600 mt-1">{r.riskSummary}</p>
              </div>
            )}
            {r.sentimentScore !== null && (
              <p className="text-xs text-gray-400 mt-2">
                감성 점수: {r.sentimentScore?.toFixed(2)}
              </p>
            )}
          </div>
        ))}
        {reports?.length === 0 && (
          <p className="text-sm text-gray-400">업무 보고가 없습니다.</p>
        )}
      </div>
      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} content={helpWorkReport} />
    </div>
  )
}
