/** Monta o texto único usado em contratos/impressões. */
export function composeEmergencyContact(parts: {
  name?: string
  relation?: string
  phone?: string
}) {
  const name = parts.name?.trim() ?? ''
  const relation = parts.relation?.trim() ?? ''
  const phone = parts.phone?.trim() ?? ''
  const who = name && relation ? `${name} (${relation})` : name || relation
  if (who && phone) return `${who} — ${phone}`
  return who || phone || ''
}

/**
 * Converte texto legado ("Nome (parentesco) — telefone") nos campos
 * estruturados. Retorna null se o formato não for reconhecido.
 */
export function parseEmergencyContact(raw: string): {
  name: string
  relation: string
  phone: string
} | null {
  const text = raw.trim()
  if (!text) return null

  const full = text.match(
    /^(.+?)\s*\(([^)]+)\)\s*[—\-–]\s*(.+)$/u,
  )
  if (full) {
    return {
      name: full[1].trim(),
      relation: full[2].trim(),
      phone: full[3].trim(),
    }
  }

  const withRelation = text.match(/^(.+?)\s*\(([^)]+)\)$/u)
  if (withRelation) {
    return {
      name: withRelation[1].trim(),
      relation: withRelation[2].trim(),
      phone: '',
    }
  }

  return null
}
