import type { Evolution } from '@/lib/data'

export const EVOLUTION_SPECIALTIES = [
  'Pilates',
  'Fisioterapia',
  'Massoterapia',
  'Auriculoterapia',
] as const

export const EVOLUTION_COMPLAINTS = [
  'Sem queixas',
  'Dor',
  'Rigidez',
  'Limitação de movimento',
  'Tensão muscular',
  'Melhora dos sintomas',
  'Piora dos sintomas',
  'Outro',
] as const

export const EVOLUTION_ASSESSMENTS = [
  'Quadro estável',
  'Melhora clínica',
  'Piora clínica',
  'Mobilidade preservada',
  'Mobilidade reduzida',
  'Boa evolução',
  'Necessita reavaliação',
  'Outro',
] as const

export const EVOLUTION_RESPONSES = [
  'Excelente resposta',
  'Boa resposta',
  'Resposta parcial',
  'Sem alterações',
  'Piora dos sintomas',
  'Outro',
] as const

export const EVOLUTION_ORIENTATIONS = [
  'Exercícios domiciliares',
  'Repouso relativo',
  'Aplicar gelo',
  'Aplicar calor',
  'Evitar esforço',
  'Manter hidratação',
  'Retorno conforme agendamento',
  'Outro',
] as const

export const EVOLUTION_NEXT_PLANS = [
  'Manter tratamento',
  'Progressão do tratamento',
  'Reavaliar',
  'Alta',
  'Encaminhamento',
  'Outro',
] as const

export const EVOLUTION_ADVERSE_EVENTS = [
  'Nenhuma',
  'Dor intensa',
  'Tontura',
  'Mal-estar',
  'Reação adversa',
  'Outro',
] as const

export type EvolutionAdverseEvent = (typeof EVOLUTION_ADVERSE_EVENTS)[number]

const PACK_PREFIX = '<!--studioflow-evolution-v1-->'

export type EvolutionProcedureItem = {
  id?: string
  name: string
  notes: string
}

export type EvolutionExercisesPack = {
  items: EvolutionProcedureItem[]
  /** Observações gerais dos procedimentos (ou texto legado). */
  notes: string
}

export type EvolutionSelectPack = {
  option: string
  other: string
}

export type EvolutionClinicalPack = {
  option: string
  other: string
  observations: string
}

export type EvolutionConductPack = {
  /** Multi-seleção de orientações padronizadas. */
  orientationItems: string[]
  orientationOther: string
  nextPlan: string
  nextPlanOther: string
  adverseEvent: EvolutionAdverseEvent | string
  adverseEventOther: string
  time: string
  durationMinutes: string
  specialty: string
}

function isPack(raw: string) {
  return raw.startsWith(PACK_PREFIX)
}

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function encodePack<T>(value: T): string {
  return `${PACK_PREFIX}${JSON.stringify(value)}`
}

export function emptyConductPack(
  overrides: Partial<EvolutionConductPack> = {},
): EvolutionConductPack {
  return {
    orientationItems: [],
    orientationOther: '',
    nextPlan: '',
    nextPlanOther: '',
    adverseEvent: 'Nenhuma',
    adverseEventOther: '',
    time: '',
    durationMinutes: '',
    specialty: '',
    ...overrides,
  }
}

export function emptyExercisesPack(
  overrides: Partial<EvolutionExercisesPack> = {},
): EvolutionExercisesPack {
  return {
    items: [],
    notes: '',
    ...overrides,
  }
}

export function emptySelectPack(
  overrides: Partial<EvolutionSelectPack> = {},
): EvolutionSelectPack {
  return { option: '', other: '', ...overrides }
}

export function emptyClinicalPack(
  overrides: Partial<EvolutionClinicalPack> = {},
): EvolutionClinicalPack {
  return { option: '', other: '', observations: '', ...overrides }
}

function normalizeOrientationItems(
  parsed: Partial<EvolutionConductPack> & { orientations?: unknown },
): { items: string[]; other: string } {
  if (Array.isArray(parsed.orientationItems)) {
    return {
      items: parsed.orientationItems.filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      ),
      other: parsed.orientationOther ?? '',
    }
  }
  // Legado: orientations como string única
  if (typeof parsed.orientations === 'string' && parsed.orientations.trim()) {
    const text = parsed.orientations.trim()
    const known = EVOLUTION_ORIENTATIONS.filter((o) => o !== 'Outro')
    if (known.includes(text as (typeof known)[number])) {
      return { items: [text], other: '' }
    }
    return { items: ['Outro'], other: text }
  }
  return { items: [], other: parsed.orientationOther ?? '' }
}

export function parseConduct(raw: string | null | undefined): EvolutionConductPack {
  const text = raw ?? ''
  if (isPack(text)) {
    const parsed = parseJsonSafe<
      Partial<EvolutionConductPack> & { orientations?: unknown }
    >(text.slice(PACK_PREFIX.length))
    if (parsed && typeof parsed === 'object') {
      const orients = normalizeOrientationItems(parsed)
      const nextPlan = parsed.nextPlan ?? ''
      const knownPlans = EVOLUTION_NEXT_PLANS as readonly string[]
      // Legado: nextPlan era texto livre
      const nextPlanIsKnown = knownPlans.includes(nextPlan)
      return emptyConductPack({
        orientationItems: orients.items,
        orientationOther: orients.other,
        nextPlan: nextPlanIsKnown
          ? nextPlan
          : nextPlan
            ? 'Outro'
            : '',
        nextPlanOther: nextPlanIsKnown
          ? (parsed.nextPlanOther ?? '')
          : nextPlan || (parsed.nextPlanOther ?? ''),
        adverseEvent: parsed.adverseEvent || 'Nenhuma',
        adverseEventOther: parsed.adverseEventOther ?? '',
        time: parsed.time ?? '',
        durationMinutes: parsed.durationMinutes ?? '',
        specialty: parsed.specialty ?? '',
      })
    }
  }
  // Legado: campo "Condutas" inteiro
  if (text.trim()) {
    const knownPlans = EVOLUTION_NEXT_PLANS as readonly string[]
    if (knownPlans.includes(text.trim())) {
      return emptyConductPack({ nextPlan: text.trim() })
    }
    return emptyConductPack({ nextPlan: 'Outro', nextPlanOther: text })
  }
  return emptyConductPack()
}

export function serializeConduct(value: EvolutionConductPack): string {
  return encodePack({
    orientationItems: value.orientationItems,
    orientationOther: value.orientationOther,
    nextPlan: value.nextPlan,
    nextPlanOther: value.nextPlanOther,
    adverseEvent: value.adverseEvent || 'Nenhuma',
    adverseEventOther: value.adverseEventOther,
    time: value.time,
    durationMinutes: value.durationMinutes,
    specialty: value.specialty,
  })
}

export function parseExercises(
  raw: string | null | undefined,
): EvolutionExercisesPack {
  const text = raw ?? ''
  if (isPack(text)) {
    const parsed = parseJsonSafe<Partial<EvolutionExercisesPack>>(
      text.slice(PACK_PREFIX.length),
    )
    if (parsed && typeof parsed === 'object') {
      const items = Array.isArray(parsed.items)
        ? parsed.items
            .filter(
              (item): item is EvolutionProcedureItem =>
                Boolean(item) &&
                typeof item === 'object' &&
                typeof (item as EvolutionProcedureItem).name === 'string',
            )
            .map((item) => ({
              id: item.id,
              name: item.name,
              notes: item.notes ?? '',
            }))
        : []
      return emptyExercisesPack({
        items,
        notes: parsed.notes ?? '',
      })
    }
  }
  return emptyExercisesPack({ notes: text })
}

export function serializeExercises(value: EvolutionExercisesPack): string {
  return encodePack({
    items: value.items.map((item) => ({
      id: item.id,
      name: item.name,
      notes: item.notes,
    })),
    notes: value.notes,
  })
}

export function parseSelectField(
  raw: string | null | undefined,
  knownOptions: readonly string[],
): EvolutionSelectPack {
  const text = raw ?? ''
  if (isPack(text)) {
    const parsed = parseJsonSafe<Partial<EvolutionSelectPack>>(
      text.slice(PACK_PREFIX.length),
    )
    if (parsed && typeof parsed === 'object') {
      return emptySelectPack({
        option: parsed.option ?? '',
        other: parsed.other ?? '',
      })
    }
  }
  if (!text.trim()) return emptySelectPack()
  if (knownOptions.includes(text.trim())) {
    return emptySelectPack({ option: text.trim() })
  }
  return emptySelectPack({ option: 'Outro', other: text })
}

export function serializeSelectField(value: EvolutionSelectPack): string {
  return encodePack({
    option: value.option,
    other: value.other,
  })
}

export function parseClinicalField(
  raw: string | null | undefined,
): EvolutionClinicalPack {
  const text = raw ?? ''
  if (isPack(text)) {
    const parsed = parseJsonSafe<Partial<EvolutionClinicalPack>>(
      text.slice(PACK_PREFIX.length),
    )
    if (parsed && typeof parsed === 'object') {
      return emptyClinicalPack({
        option: parsed.option ?? '',
        other: parsed.other ?? '',
        observations: parsed.observations ?? '',
      })
    }
  }
  if (!text.trim()) return emptyClinicalPack()
  if ((EVOLUTION_ASSESSMENTS as readonly string[]).includes(text.trim())) {
    return emptyClinicalPack({ option: text.trim() })
  }
  return emptyClinicalPack({ observations: text })
}

export function serializeClinicalField(value: EvolutionClinicalPack): string {
  return encodePack({
    option: value.option,
    other: value.other,
    observations: value.observations,
  })
}

/** Preview curto para histórico. */
export function evolutionComplaintPreview(raw: string): string {
  const packValue = parseSelectField(raw, EVOLUTION_COMPLAINTS)
  if (!packValue.option) return ''
  if (packValue.option === 'Outro') {
    return packValue.other.trim() || 'Outro'
  }
  return packValue.option
}

/** Número da sessão (1 = mais antiga) com base na data crescente. */
export function sessionNumberFor(
  evolutionId: string,
  evolutions: Pick<Evolution, 'id' | 'date'>[],
): number {
  const chronological = [...evolutions].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date)
    if (byDate !== 0) return byDate
    return a.id.localeCompare(b.id)
  })
  const index = chronological.findIndex((e) => e.id === evolutionId)
  return index >= 0 ? index + 1 : chronological.length
}

/** Evolução cronologicamente anterior (mais recente entre as mais antigas). */
export function previousEvolution(
  evolutionId: string,
  evolutions: Evolution[],
): Evolution | null {
  const chronological = [...evolutions].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date)
    if (byDate !== 0) return byDate
    return a.id.localeCompare(b.id)
  })
  const index = chronological.findIndex((e) => e.id === evolutionId)
  if (index <= 0) return null
  return chronological[index - 1] ?? null
}

/**
 * Campos a copiar ao duplicar a evolução anterior:
 * procedimentos, orientações e próxima conduta.
 */
export function fieldsFromPrevious(previous: Evolution): Pick<
  Evolution,
  'exercises' | 'conduct'
> {
  const prevConduct = parseConduct(previous.conduct)
  return {
    exercises: previous.exercises,
    conduct: serializeConduct({
      ...emptyConductPack(),
      orientationItems: prevConduct.orientationItems,
      orientationOther: prevConduct.orientationOther,
      nextPlan: prevConduct.nextPlan,
      nextPlanOther: prevConduct.nextPlanOther,
    }),
  }
}

/** Preserva meta do conduct atual e aplica orientações/plano da anterior. */
export function mergeDuplicatedConduct(
  currentConductRaw: string,
  previous: Evolution,
): string {
  const current = parseConduct(currentConductRaw)
  const prev = parseConduct(previous.conduct)
  return serializeConduct({
    ...current,
    orientationItems: prev.orientationItems,
    orientationOther: prev.orientationOther,
    nextPlan: prev.nextPlan,
    nextPlanOther: prev.nextPlanOther,
  })
}

export function currentTimeHHMM(date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
