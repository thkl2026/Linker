export function getApiErrorDetail(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as any).response?.data?.detail
    if (typeof res === 'string' && res) return res
  }
  return fallback
}
