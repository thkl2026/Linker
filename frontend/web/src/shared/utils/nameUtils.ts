// CJK Unified Ideographs (한자) 범위 — 한글·영문은 포함하지 않음
const CJK_PATTERN = /[一-鿿㐀-䶿豈-﫿]/g

// 한글 이름 우선 표시. 한자 제거 후 빈 문자열이면 영문 이름 → 원본 이름 순으로 fallback.
export function displayName(name: string | null | undefined, nameEn?: string | null): string {
  const cleaned = name ? name.replace(CJK_PATTERN, '').trim() : ''
  if (cleaned) return cleaned
  if (nameEn?.trim()) return nameEn.trim()
  return name?.trim() || ''
}
