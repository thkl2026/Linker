import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractApi, Contract, Timesheet } from '@/shared/api/contractApi'
import { useUiStore } from '@/store/uiStore'

interface Props {
  projectId: string
}

/**
 * Procurement 대시보드 — 계약 목록 + 타임시트 승인/반려 + 정산 생성 (Phase 4)
 */
export function ContractDashboardPage({ projectId }: Props) {
  const qc = useQueryClient()
  const { addToast } = useUiStore()
  const [activeContractId, setActiveContractId] = useState<string | null>(null)
  const [settlementMonth, setSettlementMonth] = useState('')

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', projectId],
    queryFn: () => contractApi.listByProject(projectId),
  })

  const { data: timesheets } = useQuery({
    queryKey: ['timesheets', activeContractId],
    queryFn: () => contractApi.listTimesheets(activeContractId!, 'SUBMITTED'),
    enabled: !!activeContractId,
  })

  const { data: settlements } = useQuery({
    queryKey: ['settlements', activeContractId],
    queryFn: () => contractApi.listSettlements(activeContractId!),
    enabled: !!activeContractId,
  })

  const signMutation = useMutation({
    mutationFn: (id: string) => contractApi.signContract(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts', projectId] })
      addToast('계약 서명 완료 (PDF 생성됨)', 'success')
    },
    onError: () => addToast('서명 처리 실패', 'error'),
  })

  const approveTsMutation = useMutation({
    mutationFn: (id: string) => contractApi.approveTimesheet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets', activeContractId] })
      addToast('타임시트 승인 완료', 'success')
    },
    onError: () => addToast('타임시트 승인 실패', 'error'),
  })

  const rejectTsMutation = useMutation({
    mutationFn: (id: string) => contractApi.rejectTimesheet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets', activeContractId] })
      addToast('타임시트 반려 완료', 'success')
    },
    onError: () => addToast('타임시트 반려 실패', 'error'),
  })

  const settleMutation = useMutation({
    mutationFn: () => contractApi.generateSettlement(activeContractId!, settlementMonth),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements', activeContractId] })
      addToast('정산 초안 생성 완료', 'success')
      setSettlementMonth('')
    },
    onError: () => addToast('정산 생성 실패', 'error'),
  })

  const approveSettleMutation = useMutation({
    mutationFn: (id: string) => contractApi.approveSettlement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements', activeContractId] })
      addToast('정산 승인 완료', 'success')
    },
    onError: () => addToast('정산 승인 실패', 'error'),
  })

  const downloadPdf = async (contractId: string) => {
    const resp = await contractApi.downloadPdf(contractId)
    const url = window.URL.createObjectURL(new Blob([resp.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `contract-${contractId}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const STATUS_COLOR: Record<string, string> = {
    DRAFT: 'text-yellow-700 bg-yellow-50',
    SIGNED: 'text-green-700 bg-green-50',
    EXPIRED: 'text-gray-600 bg-gray-50',
    TERMINATED: 'text-red-700 bg-red-50',
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-6">계약 관리</h1>

      {isLoading && <p className="text-info/60">로딩 중…</p>}

      <div className="grid grid-cols-3 gap-6">

        {/* 계약 목록 */}
        <div className="col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">계약 목록</h2>
          {(contracts ?? []).map((c: Contract) => (
            <button
              key={c.id}
              onClick={() => setActiveContractId(c.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                activeContractId === c.id
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-200 bg-white hover:border-amber-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 truncate">{c.id.slice(0, 8)}…</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-sm font-semibold mt-1">₩{c.unitPrice?.toLocaleString()}만/월</p>
              <div className="flex gap-2 mt-2">
                {c.status === 'DRAFT' && (
                  <button
                    onClick={e => { e.stopPropagation(); signMutation.mutate(c.id) }}
                    disabled={signMutation.isPending}
                    className="text-xs px-2 py-1 bg-amber-900 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50"
                  >
                    서명
                  </button>
                )}
                {c.status === 'SIGNED' && (
                  <button
                    onClick={e => { e.stopPropagation(); downloadPdf(c.id) }}
                    className="text-xs px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    PDF
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 상세 패널 */}
        {activeContractId && (
          <div className="col-span-2 space-y-6">

            {/* 타임시트 승인 대기 */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                타임시트 승인 대기
              </h2>
              {timesheets?.length === 0 && (
                <p className="text-sm text-gray-400">대기 중인 타임시트가 없습니다.</p>
              )}
              <div className="space-y-2">
                {(timesheets ?? []).map((ts: Timesheet) => (
                  <div key={ts.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{ts.workDate} · {ts.hoursWorked}h</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ts.workDescription || '내용 없음'}</p>
                      {ts.aiAnomalyFlag && (
                        <span className="text-xs text-red-600 font-medium">⚠ AI 이상 감지</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveTsMutation.mutate(ts.id)}
                        disabled={approveTsMutation.isPending}
                        className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => rejectTsMutation.mutate(ts.id)}
                        disabled={rejectTsMutation.isPending}
                        className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        반려
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 정산 */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">정산</h2>
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={settlementMonth}
                  onChange={e => setSettlementMonth(e.target.value)}
                  placeholder="YYYY-MM-01"
                  className="border border-amber-200 rounded-xl px-3 py-2 text-sm"
                />
                <button
                  onClick={() => settleMutation.mutate()}
                  disabled={settleMutation.isPending || !settlementMonth}
                  className="px-4 py-2 bg-amber-900 text-white text-sm rounded-xl hover:bg-amber-800 disabled:opacity-50"
                >
                  {settleMutation.isPending ? '생성 중…' : '정산 생성'}
                </button>
              </div>
              <div className="space-y-2">
                {(settlements ?? []).map(s => (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{s.settlementMonth} · {s.totalHours}h</p>
                      <p className="text-xs text-gray-500">
                        총액 ₩{s.grossAmount?.toLocaleString()} → 실지급 ₩{s.netAmount?.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.status === 'PAID' ? 'bg-green-50 text-green-700' :
                        s.status === 'APPROVED' ? 'bg-blue-50 text-blue-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>{s.status}</span>
                      {s.status === 'DRAFT' && (
                        <button
                          onClick={() => approveSettleMutation.mutate(s.id)}
                          disabled={approveSettleMutation.isPending}
                          className="text-xs px-3 py-1.5 bg-amber-900 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50"
                        >
                          승인
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
