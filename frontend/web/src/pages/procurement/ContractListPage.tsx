import { useState } from 'react'
import { ContractDashboardPage } from './ContractDashboardPage'

/**
 * 계약 목록 라우트 페이지 — ProjectSelector를 통해 ContractDashboardPage로 진입
 */
export function ContractListPage() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [input, setInput] = useState('')

  if (projectId) return <ContractDashboardPage projectId={projectId} />

  return (
    <main className="p-8 max-w-md">
      <h2 className="text-xl font-semibold text-primary mb-4">프로젝트 선택</h2>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="프로젝트 UUID"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 border border-amber-200 rounded-xl px-4 py-2 text-sm"
        />
        <button
          onClick={() => input.trim() && setProjectId(input.trim())}
          className="px-4 py-2 bg-amber-900 text-white text-sm rounded-xl hover:bg-amber-800"
        >
          이동
        </button>
      </div>
    </main>
  )
}
