/** Helpers seguros para o browser (sem Node crypto). */

export function formatShortDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function appBaseUrlClient() {
  if (typeof window !== 'undefined') return window.location.origin
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  )
}

export function validationUrlForCode(code: string) {
  return `${appBaseUrlClient()}/validar-contrato/${encodeURIComponent(code)}`
}
