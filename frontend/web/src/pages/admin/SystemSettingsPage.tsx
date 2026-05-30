import { useState } from 'react'
import { HelpPanel, HelpButton } from '@/shared/components/HelpPanel'
import { helpSystemSettings } from '@/shared/help/helpContent'

export function SystemSettingsPage() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-primary">시스템 설정</h1>
        <HelpButton onClick={() => setShowHelp(true)} />
      </div>
      <p className="text-sm text-primary/50 mb-8">공지사항, 계약서 템플릿, 약관, 역할별 권한 설정</p>
      <div className="bg-white rounded-2xl border border-border/50 p-12 flex items-center justify-center">
        <p className="text-primary/30 font-medium">구현 예정</p>
      </div>
      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} content={helpSystemSettings} />
    </div>
  )
}
