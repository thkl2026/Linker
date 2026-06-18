import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type Contractor, type MasterData, type ReferralAttachment } from '@/shared/api/settingsApi'
import { useUiStore } from '@/store/uiStore'

interface ContractorRegisterModalProps {
  open: boolean
  onClose: () => void
  masterData: MasterData
  onSuccess?: (newContractor: Contractor) => void
}

function formatBizNo(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

const BANK_LIST: { group: string; banks: string[] }[] = [
  { group: '시중은행', banks: ['KB국민은행', '신한은행', '우리은행', '하나은행', 'NH농협은행', 'IBK기업은행', 'KDB산업은행', 'SC제일은행', '한국씨티은행', '카카오뱅크', '케이뱅크', '토스뱅크', '수협은행', '전북은행', '광주은행', '경남은행', 'DGB대구은행', '부산은행', '제주은행', '우체국'] },
  { group: '증권사', banks: ['미래에셋증권', '삼성증권', 'NH투자증권', '한국투자증권', 'KB증권', '신한투자증권', '하나증권', '키움증권', '대신증권', '메리츠증권'] },
  { group: '저축은행', banks: ['SBI저축은행', 'OK저축은행', '페퍼저축은행', '한국투자저축은행', '다올저축은행'] },
]

function combineBankAccount(bank: string, account: string): string {
  if (!bank) return account
  if (!account) return bank
  return `${bank} ${account}`
}

const ATTACH_LABELS = ['사업자등록증', '통장사본', '계약서', '기타'] as const

export function ContractorRegisterModal({ open, onClose, masterData, onSuccess }: ContractorRegisterModalProps) {
  const [name, setName] = useState('')
  const [registrationNo, setRegistrationNo] = useState('')
  const [phone, setPhone] = useState('')
  const [bank, setBank] = useState('')
  const [account, setAccount] = useState('')
  const [attachments, setAttachments] = useState<ReferralAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingLabel, setPendingLabel] = useState<string>(ATTACH_LABELS[0])

  const { addToast } = useUiStore()
  const qc = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const newContractor: Contractor = {
        name: name.trim(),
        registrationNo: registrationNo.replace(/\D/g, ''),
        phone: phone.trim(),
        bankAccount: combineBankAccount(bank, account.trim()),
        attachments,
        contacts: [],
      }

      // 기존 리스트에 추가
      const existingList = masterData.contractors ?? []
      const updatedList = [...existingList, newContractor]

      await settingsApi.saveMasterData({
        ...masterData,
        contractors: updatedList,
      })

      return newContractor;
    },
    onSuccess: (newContractor) => {
      addToast('주사업자가 신규 등록되었습니다.', 'success')
      qc.invalidateQueries({ queryKey: ['settings'] })
      if (onSuccess) {
        onSuccess(newContractor)
      }
      onClose()
    },
    onError: () => {
      addToast('주사업자 등록에 실패했습니다.', 'error')
    },
  })

  if (!open) return null

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const res = await settingsApi.analyzeContractorDocument(file, pendingLabel)
      const att = { key: res.data.key, name: res.data.name }
      setAttachments(prev => [...prev, att])

      let autoFilled = false
      if (res.data.registrationNo) {
        setRegistrationNo(formatBizNo(res.data.registrationNo))
        autoFilled = true
      }
      if (res.data.phone) {
        setPhone(res.data.phone)
        autoFilled = true
      }
      if (res.data.bankName) {
        setBank(res.data.bankName)
        autoFilled = true
      }
      if (res.data.bankAccount) {
        setAccount(res.data.bankAccount)
        autoFilled = true
      }

      if (autoFilled) {
        addToast('AI가 문서에서 정보를 자동 입력했습니다.', 'success')
      }
    } catch {
      addToast('파일 분석 및 업로드에 실패했습니다.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAttachment = (key: string) => {
    setAttachments(prev => prev.filter(a => a.key !== key))
  }

  const handleDownloadAttachment = async (key: string) => {
    try {
      const res = await settingsApi.getAttachmentDownloadUrl(key)
      window.open(res.data.url, '_blank')
    } catch {
      addToast('파일 다운로드에 실패했습니다.', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-border/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/10">
          <div>
            <h3 className="text-lg font-black tracking-tight text-primary">주사업자 신규 등록</h3>
            <p className="text-xs text-primary/40 mt-1">프로젝트에 참여하는 주사업자 회사 정보를 신규 등록합니다.</p>
          </div>
          <button onClick={onClose} className="text-xl text-primary/30 hover:text-primary">&times;</button>
        </div>

        <div className="space-y-5">
          {/* 회사명 */}
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-2 ml-1">회사명 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: (주)씽클레어"
              className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
            />
          </div>

          {/* 사업자등록번호 & 전화번호 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-2 ml-1">사업자등록번호</label>
              <input
                type="text"
                value={registrationNo}
                onChange={e => setRegistrationNo(formatBizNo(e.target.value))}
                placeholder="000-00-00000"
                className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-primary/40 uppercase mb-2 ml-1">전화번호</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="02-1234-5678"
                className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
              />
            </div>
          </div>

          {/* 계좌번호 정보 */}
          <div>
            <label className="block text-[11px] font-black text-primary/40 uppercase mb-2 ml-1">정산 계좌 정보</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={bank}
                onChange={e => setBank(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-secondary transition-all bg-white"
              >
                <option value="">은행 선택</option>
                {BANK_LIST.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.banks.map(b => <option key={b} value={b}>{b}</option>)}
                  </optgroup>
                ))}
              </select>
              <input
                type="text"
                value={account}
                onChange={e => setAccount(e.target.value)}
                placeholder="계좌번호 (- 제외)"
                className="col-span-2 w-full bg-background border border-border/50 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-secondary transition-all"
              />
            </div>
          </div>

          {/* 첨부파일 (AI 분석) */}
          <div className="p-5 bg-surface border border-border/30 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-primary/40 uppercase ml-1">AI 서류 분석 및 첨부파일</label>
              <p className="text-[10px] text-primary/30">사업자등록증/통장사본 업로드 시 AI가 자동 입력합니다.</p>
            </div>

            <div className="space-y-2">
              {attachments.map(att => (
                <div key={att.key} className="flex items-center justify-between p-2.5 bg-white border border-border/20 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(att.key)}
                    className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline truncate max-w-[280px]"
                  >
                    📎 {att.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(att.key)}
                    className="text-primary/30 hover:text-danger text-xs transition-colors px-2 py-1"
                  >
                    삭제
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 mt-2">
                <select
                  value={pendingLabel}
                  onChange={e => setPendingLabel(e.target.value)}
                  className="bg-white border border-border/50 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-secondary transition-all"
                >
                  {ATTACH_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1 py-2 bg-secondary/5 border border-secondary/20 text-secondary text-xs font-black rounded-xl hover:bg-secondary hover:text-white transition-all disabled:opacity-40"
                >
                  {uploading ? 'AI 서류 분석 중...' : '+ 파일 첨부 (AI 자동 완성)'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8 pt-4 border-t border-border/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-border/50 text-sm font-bold text-primary/60 hover:bg-primary/5 transition-all"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => mutate()}
            disabled={isPending || !name.trim()}
            className="flex-1 py-3 rounded-2xl bg-secondary text-white text-sm font-black hover:bg-secondary/90 transition-all disabled:opacity-50"
          >
            {isPending ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  )
}
