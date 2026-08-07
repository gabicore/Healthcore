/**
 * Alertas clínicos padrão — só situações que exigem atenção imediata
 * do profissional antes do atendimento (não patologias comuns).
 */
export const CLINICAL_ALERT_SUGGESTIONS = [
  'Gestante',
  'Puerpério',
  'Uso de anticoagulantes',
  'Uso de imunossupressores',
  'Marcapasso',
  'Cardiopatia importante',
  'Hipertensão não controlada',
  'Epilepsia',
  'Fratura recente',
  'Pós-operatório recente',
  'Restrição médica importante',
  'Doença infectocontagiosa',
  'Prótese/Implante',
  'Mobilidade reduzida',
  'Necessita acompanhante',
] as const

/** Texto normalizado para comparar e mapear rótulos legados. */
export function clinicalAlertKey(value: string) {
  return value
    .replace(/\p{Extended_Pictographic}/gu, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const CANONICAL_BY_KEY = new Map(
  CLINICAL_ALERT_SUGGESTIONS.map((label) => [clinicalAlertKey(label), label]),
)

/** Códigos/rótulos antigos → alerta canônico atual. */
const LEGACY_ALERT_KEY: Record<string, string> = {
  gestante: clinicalAlertKey('Gestante'),
  anticoagulante: clinicalAlertKey('Uso de anticoagulantes'),
  marcapasso: clinicalAlertKey('Marcapasso'),
  epilepsia: clinicalAlertKey('Epilepsia'),
  restricao_medica: clinicalAlertKey('Restrição médica importante'),
  'restricao medica': clinicalAlertKey('Restrição médica importante'),
  'restricao medica importante': clinicalAlertKey(
    'Restrição médica importante',
  ),
  'uso de anticoagulante': clinicalAlertKey('Uso de anticoagulantes'),
  'uso de anticoagulantes': clinicalAlertKey('Uso de anticoagulantes'),
  protese: clinicalAlertKey('Prótese/Implante'),
  implante: clinicalAlertKey('Prótese/Implante'),
  'protese/implante': clinicalAlertKey('Prótese/Implante'),
}

function resolveCanonicalLabel(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const direct = CANONICAL_BY_KEY.get(clinicalAlertKey(trimmed))
  if (direct) return direct

  const legacyKey = LEGACY_ALERT_KEY[clinicalAlertKey(trimmed)]
  if (legacyKey) {
    return CANONICAL_BY_KEY.get(legacyKey) ?? trimmed
  }

  // Remove emoji residual de dados já salvos, mantendo o texto.
  const withoutEmoji = trimmed
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!withoutEmoji) return ''

  const fromStripped = CANONICAL_BY_KEY.get(clinicalAlertKey(withoutEmoji))
  return fromStripped ?? withoutEmoji
}

export function formatClinicalAlert(value: string) {
  return resolveCanonicalLabel(value)
}

export function parseClinicalAlerts(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const label = formatClinicalAlert(item)
    if (!label) continue
    const key = clinicalAlertKey(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(label)
  }
  return result
}

export function normalizeClinicalAlertInput(value: string) {
  return formatClinicalAlert(value)
}

export function isSameClinicalAlert(a: string, b: string) {
  return clinicalAlertKey(a) === clinicalAlertKey(b)
}
