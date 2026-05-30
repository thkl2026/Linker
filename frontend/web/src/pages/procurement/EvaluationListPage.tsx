import { useState } from 'react'
import { HelpPanel, HelpButton } from '@/shared/components/HelpPanel'
import { helpProcurementEvaluation } from '@/shared/help/helpContent'

export function EvaluationListPage() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-primary">평가 목록</h1>
        <HelpButton onClick={() => setShowHelp(true)} />
      </div>
      <p className="text-sm text-primary/50 mb-8">완료된 프로젝트에 대한 전문가 평가 현황</p>
      <div className="bg-white rounded-2xl border border-border/50 p-12 flex items-center justify-center">
        <p className="text-primary/30 font-medium">구현 예정</p>
      </div>
      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} content={helpProcurementEvaluation} />
    </div>
  )
}
