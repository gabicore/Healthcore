import type { Student } from '@/lib/data'
import {
  formatClinicalAlert,
  parseClinicalAlerts,
} from '@/lib/clinical-alerts'
import {
  serviceCategoryLabel,
  type ServiceCategory,
} from '@/lib/clinic-types'

/**
 * Alertas clínicos no topo do perfil.
 * Apenas a lista de alertas críticos — sem patologias, alergias ou
 * outros campos clínicos (esses ficam no histórico).
 */
export function studentHealthHighlights(
  student: Pick<Student, 'clinicalAlerts'>,
): string[] {
  return parseClinicalAlerts(student.clinicalAlerts)
    .map((alert) => formatClinicalAlert(alert))
    .filter(Boolean)
}

const SPECIALTY_ORDER: ServiceCategory[] = [
  'pilates',
  'fisioterapia',
  'massoterapia',
  'auriculoterapia',
  'experimental',
  'outro',
]

/** Especialidades ativas (Pilates por contrato; clínicas pelos atendimentos). */
export function studentActiveSpecialtyLabel(input: {
  hasActivePilatesContract: boolean
  clinicCategories?: Array<ServiceCategory | string | null | undefined>
}) {
  const active = new Set<ServiceCategory>()

  if (input.hasActivePilatesContract) {
    active.add('pilates')
  }

  for (const raw of input.clinicCategories ?? []) {
    if (!raw || raw === 'pilates' || raw === 'avaliacao') continue
    if (raw in serviceCategoryLabel) {
      active.add(raw as ServiceCategory)
    }
  }

  const labels = SPECIALTY_ORDER.filter((cat) => active.has(cat)).map(
    (cat) => serviceCategoryLabel[cat],
  )

  if (labels.length === 0) return 'Sem especialidade ativa'
  return labels.join(' · ')
}
