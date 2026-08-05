// Camada de dados de exemplo do HealthCore.
// Estruturada como um SaaS multiempresa: cada estúdio (tenant) acessa apenas seus próprios dados.
// Nesta primeira versão navegável os dados são estáticos; a persistência real será conectada depois.

export type StudioProfile = {
  id: string
  name: string
  owner: string
  email: string
  phone: string
  cnpj: string
  address: string
  plan: 'Essencial' | 'Profissional' | 'Studio'
}

export type PaymentStatus = 'pago' | 'pendente' | 'atrasado'
export type PaymentMethod = 'PIX' | 'Cartão de crédito' | 'Boleto' | 'Dinheiro'
export type Sex = 'Feminino' | 'Masculino' | 'Outro'
export type Weekday =
  | 'Segunda'
  | 'Terça'
  | 'Quarta'
  | 'Quinta'
  | 'Sexta'
  | 'Sábado'

export type AttendanceStatus =
  | 'agendada'
  | 'presente'
  | 'falta'
  | 'reposicao'
  | 'cancelada'

export type PlanPeriod = 'mensal' | 'trimestral' | 'semestral'
export type PlanFrequency = 1 | 2 | 3

export type PlanKind = 'mensalidade' | 'pacote' | 'avulso'

export const planKindLabel: Record<PlanKind, string> = {
  mensalidade: 'Mensalidade',
  pacote: 'Pacote',
  avulso: 'Avulso',
}

export type Plan = {
  id: string
  name: string
  kind: PlanKind
  period: PlanPeriod
  frequency: PlanFrequency
  frequencyLabel: string
  price: number
  sessionsTotal?: number | null
}

export type Professional = {
  id: string
  name: string
  role: string
  registration: string
  email: string
}

export type StudioHour = {
  weekday: Weekday
  open: string
  close: string
  closed: boolean
}

export type PhysicalAssessment = {
  id: string
  date: string
  weight: number
  /** Altura em centímetros. */
  height: number
  bodyFat?: number
  muscleMass?: number
  measures: {
    armRight: number
    armLeft: number
    chest: number
    waist: number
    abdomen: number
    hip: number
    thighRight: number
    thighLeft: number
    calfRight: number
    calfLeft: number
  }
}

export type Evolution = {
  id: string
  date: string
  professional: string
  clinical: string
  complaints: string
  improvements: string
  exercises: string
  conduct: string
}

export type EvolutionPhoto = {
  id: string
  date: string
  label: string
  url: string
}

export type Payment = {
  id: string
  reference: string // mês de referência
  dueDate: string
  amount: number
  status: PaymentStatus
  method?: PaymentMethod
  paidAt?: string
}

export type ContractStatus =
  | 'rascunho'
  | 'pendente_assinatura'
  | 'ativo'
  | 'encerrado'
  | 'cancelado'

export type ContractHistoryEntry = {
  at: string
  action: string
  by: string
}

export type ContractVersion = {
  version: number
  changedAt: string
  summary: string
}

export type ContractSignatureInfo = {
  id: string
  signerName: string
  signatureImage: string
  signedAt: string
  validationCode: string
  documentHash: string
  contractVersion: number
}

/** Contrato vinculado ao histórico do aluno (não é módulo isolado). */
export type Contract = {
  id: string
  studentId: string
  number: string
  planId: string
  /** Snapshot do nome do plano na vigência. */
  planLabel: string
  startDate: string
  endDate: string
  status: ContractStatus
  monthlyValue: number
  discountPercent: number
  discountNote?: string
  dueDay: number
  paymentMethod: PaymentMethod
  financialResponsible: string
  lateFeePercent: number
  interestPercent: number
  clauses: string[]
  signedAt?: string
  signatureName?: string
  /** Token público para /assinar-contrato/:token (somente se ainda pendente). */
  signingToken?: string
  /** Código público de validação após assinatura. */
  validationCode?: string
  electronicSignature?: ContractSignatureInfo
  version: number
  previousVersions: ContractVersion[]
  history: ContractHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export const contractStatusLabel: Record<ContractStatus, string> = {
  rascunho: 'Rascunho',
  pendente_assinatura: 'Pendente de assinatura',
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
}

export const defaultContractClauses = [
  `O presente contrato tem como objeto a prestação de serviços de treinamento em grupo oferecidos pelo CONTRATADO ao ALUNO, conforme o plano e as condições estabelecidas neste documento, com foco em emagrecimento, alongamento, condicionamento físico e qualidade de vida.`,
  `O CONTRATADO compromete-se a:

• Desenvolver e supervisionar os treinamentos de acordo com os objetivos do ALUNO;
• Respeitar as normas de segurança e saúde durante a execução dos treinos;
• Comparecer pontualmente às sessões de treinamento, salvo casos de força maior ou imprevistos, comunicando previamente o ALUNO sempre que possível.`,
  `O ALUNO compromete-se a:

• Comparecer às aulas nos dias e horários previamente agendados;
• Informar ao CONTRATADO qualquer problema de saúde, lesão ou limitação física que possa comprometer a execução dos exercícios;
• Seguir as orientações fornecidas pelo CONTRATADO durante a realização dos treinos.`,
  `Em caso de necessidade de cancelamento ou reagendamento de uma sessão, o ALUNO deverá comunicar o CONTRATADO com antecedência mínima de 4 (quatro) horas.

Cancelamentos realizados fora desse prazo ou sem aviso prévio poderão implicar na cobrança integral da sessão.

A reposição deverá ocorrer em até 30 (trinta) dias, contados da data da aula cancelada, conforme disponibilidade de agenda do CONTRATADO.`,
  `O pagamento do valor final da mensalidade deverá ser realizado na data de vencimento constante nas Condições deste contrato.

O atraso no pagamento poderá acarretar a suspensão das aulas até a regularização dos valores pendentes.`,
  `O presente contrato poderá ser rescindido por qualquer das partes mediante comunicação prévia por escrito.

Os valores referentes aos serviços já prestados permanecerão devidos, não havendo restituição de valores relativos às aulas efetivamente realizadas.`,
  `O ALUNO declara estar ciente de que a prática de atividades físicas exige o fornecimento de informações verdadeiras sobre seu estado de saúde, comprometendo-se a comunicar qualquer alteração que possa interferir na realização dos exercícios.

A eventual tolerância de qualquer das partes quanto ao descumprimento de quaisquer obrigações previstas neste contrato não constituirá renúncia de direito, nem alteração das condições aqui estabelecidas.

Ao assinar este documento, as partes declaram que leram, compreenderam e concordam com todas as condições e cláusulas nele previstas.`,
]

export type ExpenseCategory =
  | 'aluguel'
  | 'contas'
  | 'pessoal'
  | 'material'
  | 'software'
  | 'outros'

export type ExpenseStatus = 'pago' | 'pendente'

export type Expense = {
  id: string
  name: string
  category: ExpenseCategory
  amount: number
  dueDay: number
  status: ExpenseStatus
  paidAt?: string
  recurring: boolean
  notes?: string
}

export type ScheduleSlot = {
  weekday: Weekday
  time: string
  /** Início da vigência (ISO date). Ausente = sempre válido (legado). */
  effectiveFrom?: string
  /** Fim da vigência inclusive. Null/ausente = ainda vigente. */
  effectiveTo?: string | null
}

export type Student = {
  id: string
  name: string
  birthDate: string
  sex: Sex
  cpf: string
  phone: string
  email: string
  cep: string
  street: string
  addressNumber: string
  neighborhood: string
  city: string
  state: string
  address: string
  emergencyName: string
  emergencyRelation: string
  emergencyPhone: string
  /** Texto composto para contratos/impressão. */
  emergencyContact: string
  active: boolean
  /** Tem contrato assinado (ativo) governando plano/financeiro/agenda. */
  hasActiveContract: boolean
  /** Rótulo do plano do contrato ativo, se houver. */
  activePlanLabel?: string
  since: string
  // Dados clínicos
  objective: string
  pathologies: string
  injuries: string
  surgeries: string
  restrictions: string
  medications: string
  notes: string
  usesPilates?: boolean
  usesClinic?: boolean
  // Financeiro
  planId: string
  /** Valor cobrado do aluno (após desconto individual). */
  monthlyValue: number
  /** Desconto percentual individual do aluno (0–100). */
  discountPercent: number
  dueDay: number
  paymentMethod: PaymentMethod
  // Agenda fixa
  schedule: ScheduleSlot[]
  // Históricos
  assessments: PhysicalAssessment[]
  evolutions: Evolution[]
  photos: EvolutionPhoto[]
  payments: Payment[]
}

export const studio: StudioProfile = {
  id: 'studio-1',
  name: 'Studio Balnório',
  owner: 'Cristina Tenório',
  email: 'contato@studioequilibrio.com.br',
  phone: '(11) 96869-2393',
  cnpj: '12.345.678/0001-90',
  address: 'Rua das Flores, 120 — Pinheiros, São Paulo/SP',
  plan: 'Profissional',
}

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  aluguel: 'Aluguel',
  contas: 'Contas',
  pessoal: 'Pessoal',
  material: 'Material',
  software: 'Software',
  outros: 'Outros',
}

/** Gastos fixos e contas do estúdio (mock mensal). */
export const expenses: Expense[] = [
  {
    id: 'exp1',
    name: 'Aluguel do espaço',
    category: 'aluguel',
    amount: 4500,
    dueDay: 10,
    status: 'pago',
    paidAt: '2026-07-08',
    recurring: true,
  },
  {
    id: 'exp2',
    name: 'Energia elétrica',
    category: 'contas',
    amount: 420,
    dueDay: 15,
    status: 'pendente',
    recurring: true,
  },
  {
    id: 'exp3',
    name: 'Água',
    category: 'contas',
    amount: 145,
    dueDay: 12,
    status: 'pago',
    paidAt: '2026-07-11',
    recurring: true,
  },
  {
    id: 'exp4',
    name: 'Internet / telefone',
    category: 'contas',
    amount: 189,
    dueDay: 20,
    status: 'pendente',
    recurring: true,
  },
  {
    id: 'exp5',
    name: 'Contabilidade',
    category: 'outros',
    amount: 350,
    dueDay: 5,
    status: 'pago',
    paidAt: '2026-07-04',
    recurring: true,
  },
  {
    id: 'exp6',
    name: 'Material de limpeza',
    category: 'material',
    amount: 180,
    dueDay: 25,
    status: 'pendente',
    recurring: true,
  },
  {
    id: 'exp7',
    name: 'Assinatura HealthCore',
    category: 'software',
    amount: 149,
    dueDay: 1,
    status: 'pago',
    paidAt: '2026-07-01',
    recurring: true,
  },
  {
    id: 'exp8',
    name: 'Repasse profissionais (estimado)',
    category: 'pessoal',
    amount: 3200,
    dueDay: 28,
    status: 'pendente',
    recurring: true,
    notes: 'Baseado na grade da semana',
  },
]

export const plans: Plan[] = [
  // 1 aula por semana
  {
    id: 'sem-1x',
    kind: 'mensalidade',
    name: 'Semestral · 1 aula por semana',
    period: 'semestral',
    frequency: 1,
    frequencyLabel: '1 aula por semana',
    price: 280,
  },
  {
    id: 'tri-1x',
    kind: 'mensalidade',
    name: 'Trimestral · 1 aula por semana',
    period: 'trimestral',
    frequency: 1,
    frequencyLabel: '1 aula por semana',
    price: 300,
  },
  {
    id: 'men-1x',
    kind: 'mensalidade',
    name: 'Mensal · 1 aula por semana',
    period: 'mensal',
    frequency: 1,
    frequencyLabel: '1 aula por semana',
    price: 360,
  },
  // 2 aulas por semana
  {
    id: 'sem-2x',
    kind: 'mensalidade',
    name: 'Semestral · 2 aulas por semana',
    period: 'semestral',
    frequency: 2,
    frequencyLabel: '2 aulas por semana',
    price: 350,
  },
  {
    id: 'tri-2x',
    kind: 'mensalidade',
    name: 'Trimestral · 2 aulas por semana',
    period: 'trimestral',
    frequency: 2,
    frequencyLabel: '2 aulas por semana',
    price: 380,
  },
  {
    id: 'men-2x',
    kind: 'mensalidade',
    name: 'Mensal · 2 aulas por semana',
    period: 'mensal',
    frequency: 2,
    frequencyLabel: '2 aulas por semana',
    price: 400,
  },
  // 3 aulas por semana
  {
    id: 'sem-3x',
    kind: 'mensalidade',
    name: 'Semestral · 3 aulas por semana',
    period: 'semestral',
    frequency: 3,
    frequencyLabel: '3 aulas por semana',
    price: 400,
  },
  {
    id: 'tri-3x',
    kind: 'mensalidade',
    name: 'Trimestral · 3 aulas por semana',
    period: 'trimestral',
    frequency: 3,
    frequencyLabel: '3 aulas por semana',
    price: 420,
  },
  {
    id: 'men-3x',
    kind: 'mensalidade',
    name: 'Mensal · 3 aulas por semana',
    period: 'mensal',
    frequency: 3,
    frequencyLabel: '3 aulas por semana',
    price: 450,
  },
]

export const planPeriodLabel: Record<PlanPeriod, string> = {
  semestral: 'Semestral',
  trimestral: 'Trimestral',
  mensal: 'Mensal',
}

/** Ordem de exibição da tabela de preços. */
export const planPeriodsOrdered: PlanPeriod[] = [
  'semestral',
  'trimestral',
  'mensal',
]

export const planFrequencies: PlanFrequency[] = [1, 2, 3]

export function planFrequencyLabel(frequency: number): string {
  if (frequency === 1) return '1 aula por semana'
  return `${frequency} aulas por semana`
}

export function findPlanByFrequencyAndPeriod(
  list: Plan[],
  frequency: number,
  period: PlanPeriod,
): Plan | undefined {
  return list.find((p) => p.frequency === frequency && p.period === period)
}

export function formatPlanModalityLabel(
  plan: Pick<Plan, 'period' | 'frequency' | 'frequencyLabel'>,
): string {
  return `${plan.frequencyLabel || planFrequencyLabel(plan.frequency)} · ${
    planPeriodLabel[plan.period]
  }`
}

export function plansByPeriod(period: PlanPeriod) {
  return plans.filter((p) => p.period === period)
}

export const professionals: Professional[] = [
  {
    id: 'prof1',
    name: 'Dra. Camila Rezende',
    role: 'Fisioterapeuta',
    registration: 'CREFITO 123456-F',
    email: 'camila@studioequilibrio.com.br',
  },
  {
    id: 'prof2',
    name: 'Rafael Monteiro',
    role: 'Instrutor de Pilates',
    registration: 'CREF 045678-G/SP',
    email: 'rafael@studioequilibrio.com.br',
  },
  {
    id: 'prof3',
    name: 'Juliana Castro',
    role: 'Fisioterapeuta',
    registration: 'CREFITO 789012-F',
    email: 'juliana@studioequilibrio.com.br',
  },
]

export const studioHours: StudioHour[] = [
  { weekday: 'Segunda', open: '07:00', close: '19:00', closed: false },
  { weekday: 'Terça', open: '07:00', close: '19:00', closed: false },
  { weekday: 'Quarta', open: '07:00', close: '19:00', closed: false },
  { weekday: 'Quinta', open: '07:00', close: '19:00', closed: false },
  { weekday: 'Sexta', open: '07:00', close: '19:00', closed: false },
  { weekday: 'Sábado', open: '07:00', close: '11:00', closed: false },
]

/** Substitui os horários de funcionamento em memória (Configurações). */
export function replaceStudioHours(hours: StudioHour[]) {
  studioHours.splice(
    0,
    studioHours.length,
    ...hours.map((h) => ({
      weekday: h.weekday,
      open: h.open,
      close: h.close,
      closed: Boolean(h.closed),
    })),
  )
}

export function getStudioHour(weekday: Weekday): StudioHour | undefined {
  return studioHours.find((h) => h.weekday === weekday)
}

/**
 * Slot permitido se o dia não estiver fechado e o horário estiver em [open, close).
 * Ex.: close 19:00 permite 18:00, não 19:00.
 */
export function slotFitsStudioHour(
  hour: Pick<StudioHour, 'open' | 'close' | 'closed'> | null | undefined,
  time: string,
): boolean {
  if (!hour || hour.closed) return false
  return time >= hour.open && time < hour.close
}

export function isWithinStudioHours(weekday: Weekday, time: string): boolean {
  return slotFitsStudioHour(getStudioHour(weekday), time)
}

export const weekdays: Weekday[] = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
]

/** Capacidade máxima de alunos por horário. */
export let SLOT_CAPACITY = 4

export function setSlotCapacity(value: number) {
  SLOT_CAPACITY = Math.min(12, Math.max(1, Math.round(value) || 1))
  return SLOT_CAPACITY
}
export const morningSlots: string[] = ['07:00', '08:00', '09:00', '10:00']
export const afternoonSlots: string[] = ['15:00', '16:00', '17:00', '18:00']

/** Substitui a grade em memória pelos horários persistidos (Configurações). */
export function replaceScheduleSlots(
  slots: { time: string; period: 'manha' | 'tarde'; capacity?: number }[],
) {
  const morning = slots
    .filter((s) => s.period === 'manha')
    .map((s) => s.time)
    .sort()
  const afternoon = slots
    .filter((s) => s.period === 'tarde')
    .map((s) => s.time)
    .sort()
  morningSlots.splice(0, morningSlots.length, ...morning)
  afternoonSlots.splice(0, afternoonSlots.length, ...afternoon)

  const capacity = slots.find((s) => typeof s.capacity === 'number')?.capacity
  if (capacity != null) setSlotCapacity(capacity)
}

export function getTimeSlots(): string[] {
  return [...morningSlots, ...afternoonSlots]
}

/** Alias dinâmico — sempre reflete morningSlots + afternoonSlots. */
export function timeSlotsList() {
  return getTimeSlots()
}
export type TimePeriod = 'manha' | 'tarde'

export function getTimePeriod(time: string): TimePeriod | null {
  if (morningSlots.includes(time)) return 'manha'
  if (afternoonSlots.includes(time)) return 'tarde'
  return null
}

/** Horários da grade disponíveis no dia, respeitando funcionamento do estúdio. */
export function availableSlotsForWeekday(weekday: Weekday): string[] {
  const hour = getStudioHour(weekday)
  if (!hour || hour.closed) return []
  return getTimeSlots().filter((time) => slotFitsStudioHour(hour, time))
}

function normalizeTimeInput(raw: string): string | null {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Renomeia um horário da grade (manhã/tarde) e propaga para
 * agendas fixas dos alunos e ledger de presença.
 */
export function renameScheduleSlot(
  oldTime: string,
  nextRaw: string,
): { ok: true; time: string } | { ok: false; error: string } {
  const newTime = normalizeTimeInput(nextRaw)
  if (!newTime) return { ok: false, error: 'Use o formato HH:MM' }
  if (newTime === oldTime) return { ok: true, time: oldTime }

  const all = getTimeSlots()
  if (!all.includes(oldTime)) {
    return { ok: false, error: 'Horário não encontrado na grade' }
  }
  if (all.includes(newTime)) {
    return { ok: false, error: 'Este horário já existe na grade' }
  }

  const morningIndex = morningSlots.indexOf(oldTime)
  if (morningIndex >= 0) morningSlots[morningIndex] = newTime
  const afternoonIndex = afternoonSlots.indexOf(oldTime)
  if (afternoonIndex >= 0) afternoonSlots[afternoonIndex] = newTime

  for (const student of students) {
    for (const slot of student.schedule) {
      if (slot.time === oldTime) slot.time = newTime
    }
  }

  remapAttendanceLedgerTimes(oldTime, newTime)

  return { ok: true, time: newTime }
}

export function addTimeSlot(
  period: TimePeriod,
  rawTime?: string,
): { ok: true; time: string } | { ok: false; error: string } {
  const slots = period === 'manha' ? morningSlots : afternoonSlots
  const fallback =
    period === 'manha'
      ? `0${7 + slots.length}:00`.slice(-5)
      : `${15 + slots.length}:00`
  const time = normalizeTimeInput(rawTime ?? fallback)
  if (!time) return { ok: false, error: 'Use o formato HH:MM' }
  if (getTimeSlots().includes(time)) {
    return { ok: false, error: 'Este horário já existe na grade' }
  }
  slots.push(time)
  slots.sort()
  return { ok: true, time }
}

export function removeTimeSlot(
  time: string,
): { ok: true } | { ok: false; error: string } {
  const inUse = students.some((s) => s.schedule.some((slot) => slot.time === time))
  if (inUse) {
    return {
      ok: false,
      error: 'Horário em uso na agenda fixa de pessoas',
    }
  }
  const morningIndex = morningSlots.indexOf(time)
  if (morningIndex >= 0) {
    if (morningSlots.length <= 1) {
      return { ok: false, error: 'Mantenha ao menos um horário na manhã' }
    }
    morningSlots.splice(morningIndex, 1)
    return { ok: true }
  }
  const afternoonIndex = afternoonSlots.indexOf(time)
  if (afternoonIndex >= 0) {
    if (afternoonSlots.length <= 1) {
      return { ok: false, error: 'Mantenha ao menos um horário na tarde' }
    }
    afternoonSlots.splice(afternoonIndex, 1)
    return { ok: true }
  }
  return { ok: false, error: 'Horário não encontrado' }
}

function assessment(
  id: string,
  date: string,
  weight: number,
  height: number,
  m: PhysicalAssessment['measures'],
  bodyFat?: number,
  muscleMass?: number,
): PhysicalAssessment {
  // Dados legados em metros (< 3) passam a cm.
  const heightCm =
    height > 0 && height < 3 ? Math.round(height * 1000) / 10 : height
  return { id, date, weight, height: heightCm, bodyFat, muscleMass, measures: m }
}

export const students: Student[] = [
  {
    id: 's1',
    name: 'Ana Beatriz Souza',
    birthDate: '1990-07-28',
    sex: 'Feminino',
    cpf: '123.456.789-01',
    phone: '(11) 99123-4567',
    email: 'ana.souza@email.com',
    cep: '05410-000',
    street: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    address: 'Rua das Acácias, 245 — Pinheiros, São Paulo/SP',
    emergencyName: 'Marcos Souza',
    emergencyRelation: 'marido',
    emergencyPhone: '(11) 99888-1122',
    emergencyContact: 'Marcos Souza (marido) — (11) 99888-1122',
    active: true,
    hasActiveContract: true,
    since: '2024-02-10',
    objective: 'Fortalecimento do core e alívio de dor lombar crônica.',
    pathologies: 'Hérnia de disco L4-L5, escoliose leve.',
    injuries: 'Estiramento lombar em 2023.',
    surgeries: 'Nenhuma.',
    restrictions: 'Evitar flexão de tronco com carga.',
    medications: 'Relaxante muscular em crises.',
    notes: 'Trabalha muitas horas sentada. Prefere aulas pela manhã.',
    planId: 'sem-2x',
    monthlyValue: 315,
    discountPercent: 10,
    dueDay: 10,
    paymentMethod: 'PIX',
    schedule: [
      { weekday: 'Segunda', time: '08:00' },
      { weekday: 'Quarta', time: '08:00' },
    ],
    assessments: [
      assessment(
        'a1',
        '2024-02-12',
        68,
        1.65,
        {
          armRight: 28,
          armLeft: 27.5,
          chest: 89,
          waist: 74,
          abdomen: 82,
          hip: 98,
          thighRight: 56,
          thighLeft: 55.5,
          calfRight: 36,
          calfLeft: 35.5,
        },
        30,
        24,
      ),
      assessment(
        'a2',
        '2024-05-14',
        66.5,
        1.65,
        {
          armRight: 28.5,
          armLeft: 28,
          chest: 88,
          waist: 72,
          abdomen: 79,
          hip: 97,
          thighRight: 56.5,
          thighLeft: 56,
          calfRight: 36,
          calfLeft: 36,
        },
        28,
        25,
      ),
      assessment(
        'a3',
        '2024-09-03',
        65,
        1.65,
        {
          armRight: 29,
          armLeft: 28.5,
          chest: 87,
          waist: 70,
          abdomen: 76,
          hip: 96,
          thighRight: 57,
          thighLeft: 57,
          calfRight: 36.5,
          calfLeft: 36,
        },
        26.5,
        26,
      ),
    ],
    evolutions: [
      {
        id: 'e1',
        date: '2024-09-02',
        professional: 'Dra. Camila Rezende',
        clinical: 'Redução significativa da dor lombar ao final do dia.',
        complaints: 'Leve desconforto ao acordar.',
        improvements: 'Maior estabilidade do core e mobilidade de quadril.',
        exercises: 'Series de The Hundred, Roll Up assistido e Bridging.',
        conduct: 'Progredir carga na próxima sessão.',
      },
      {
        id: 'e2',
        date: '2024-07-18',
        professional: 'Dra. Camila Rezende',
        clinical: 'Boa evolução na consciência corporal.',
        complaints: 'Dor lombar 4/10 após longos períodos sentada.',
        improvements: 'Melhora na respiração diafragmática.',
        exercises: 'Alongamento de cadeia posterior e mobilidade torácica.',
        conduct: 'Manter frequência de 2x na semana.',
      },
    ],
    photos: [
      { id: 'ph1', date: '2024-02-12', label: 'Avaliação inicial', url: '/evolution-posture-side-view-neutral-studio.jpg' },
      { id: 'ph2', date: '2024-09-03', label: '6 meses', url: '/evolution-posture-side-view-improved-studio.jpg' },
    ],
    payments: [
      { id: 'pay1', reference: 'Maio/2026', dueDate: '2026-05-10', amount: 350, status: 'pago', method: 'PIX', paidAt: '2026-05-09' },
      { id: 'pay2', reference: 'Junho/2026', dueDate: '2026-06-10', amount: 350, status: 'pago', method: 'PIX', paidAt: '2026-06-08' },
      { id: 'pay3', reference: 'Julho/2026', dueDate: '2026-07-10', amount: 350, status: 'pendente' },
    ],
  },
  {
    id: 's2',
    name: 'Carlos Eduardo Lima',
    birthDate: '1978-11-15',
    sex: 'Masculino',
    cpf: '234.567.890-12',
    phone: '(11) 98456-7788',
    email: 'cadu.lima@email.com',
    cep: '01402-000',
    street: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    address: 'Av. Rebouças, 1200 — Jardim Paulista, São Paulo/SP',
    emergencyName: 'Fernanda Lima',
    emergencyRelation: 'esposa',
    emergencyPhone: '(11) 99777-3344',
    emergencyContact: 'Fernanda Lima (esposa) — (11) 99777-3344',
    active: true,
    hasActiveContract: true,
    since: '2023-08-22',
    objective: 'Reabilitação de joelho pós-cirúrgico e ganho de força.',
    pathologies: 'Condromalácia patelar grau II.',
    injuries: 'Ruptura de LCA em 2022.',
    surgeries: 'Reconstrução de LCA (jan/2023).',
    restrictions: 'Evitar impacto e agachamento profundo.',
    medications: 'Anti-inflamatório conforme necessidade.',
    notes: 'Corredor amador, deseja retornar às corridas com segurança.',
    planId: 'sem-3x',
    monthlyValue: 400,
    discountPercent: 0,
    dueDay: 5,
    paymentMethod: 'Cartão de crédito',
    schedule: [
      { weekday: 'Terça', time: '18:00' },
      { weekday: 'Quinta', time: '18:00' },
      { weekday: 'Sexta', time: '07:00' },
    ],
    assessments: [
      assessment('a4', '2023-09-01', 84, 1.8, {
        armRight: 34,
        armLeft: 33.5,
        chest: 102,
        waist: 92,
        abdomen: 95,
        hip: 104,
        thighRight: 58,
        thighLeft: 61,
        calfRight: 38,
        calfLeft: 39,
      }, 24, 34),
      assessment('a5', '2024-03-01', 81, 1.8, {
        armRight: 35,
        armLeft: 35,
        chest: 103,
        waist: 88,
        abdomen: 90,
        hip: 103,
        thighRight: 60,
        thighLeft: 61,
        calfRight: 39,
        calfLeft: 39,
      }, 21, 36),
    ],
    evolutions: [
      {
        id: 'e3',
        date: '2024-10-10',
        professional: 'Rafael Monteiro',
        clinical: 'Simetria de força entre os membros quase completa.',
        complaints: 'Sem queixas de dor.',
        improvements: 'Ganho de propriocepção e equilíbrio unipodal.',
        exercises: 'Fortalecimento de quadríceps e trabalho excêntrico.',
        conduct: 'Iniciar transição para corrida leve.',
      },
    ],
    photos: [],
    payments: [
      { id: 'pay4', reference: 'Junho/2026', dueDate: '2026-06-05', amount: 400, status: 'pago', method: 'Cartão de crédito', paidAt: '2026-06-05' },
      { id: 'pay5', reference: 'Julho/2026', dueDate: '2026-07-05', amount: 400, status: 'atrasado' },
    ],
  },
  {
    id: 's3',
    name: 'Mariana Oliveira',
    birthDate: '1995-03-05',
    sex: 'Feminino',
    cpf: '345.678.901-23',
    phone: '(11) 99555-2211',
    email: 'mari.oliveira@email.com',
    cep: '05435-000',
    street: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    address: 'Rua Harmonia, 88 — Vila Madalena, São Paulo/SP',
    emergencyName: 'Sônia Oliveira',
    emergencyRelation: 'mãe',
    emergencyPhone: '(11) 99666-8899',
    emergencyContact: 'Sônia Oliveira (mãe) — (11) 99666-8899',
    active: true,
    hasActiveContract: true,
    since: '2025-01-15',
    objective: 'Melhora de postura e condicionamento geral.',
    pathologies: 'Cervicalgia tensional.',
    injuries: 'Nenhuma.',
    surgeries: 'Nenhuma.',
    restrictions: 'Nenhuma relevante.',
    medications: 'Nenhum.',
    notes: 'Designer, passa longos períodos ao computador.',
    planId: 'sem-1x',
    monthlyValue: 280,
    discountPercent: 0,
    dueDay: 15,
    paymentMethod: 'PIX',
    schedule: [{ weekday: 'Quinta', time: '18:00' }],
    assessments: [
      assessment('a6', '2025-01-20', 59, 1.68, {
        armRight: 26,
        armLeft: 25.5,
        chest: 84,
        waist: 68,
        abdomen: 72,
        hip: 94,
        thighRight: 54,
        thighLeft: 54,
        calfRight: 34,
        calfLeft: 34,
      }, 25),
    ],
    evolutions: [
      {
        id: 'e4',
        date: '2025-03-06',
        professional: 'Juliana Castro',
        clinical: 'Diminuição da tensão cervical relatada.',
        complaints: 'Rigidez no final do expediente.',
        improvements: 'Mobilidade escapular.',
        exercises: 'Mobilidade torácica e ativação de estabilizadores.',
        conduct: 'Orientar pausas ativas no trabalho.',
      },
    ],
    photos: [],
    payments: [
      { id: 'pay6', reference: 'Junho/2026', dueDate: '2026-06-15', amount: 280, status: 'pago', method: 'PIX', paidAt: '2026-06-14' },
      { id: 'pay7', reference: 'Julho/2026', dueDate: '2026-07-15', amount: 280, status: 'pendente' },
    ],
  },
  {
    id: 's4',
    name: 'Roberto Nunes',
    birthDate: '1965-07-25',
    sex: 'Masculino',
    cpf: '456.789.012-34',
    phone: '(11) 98123-9090',
    email: 'roberto.nunes@email.com',
    cep: '05422-000',
    street: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    address: 'Rua dos Pinheiros, 500 — Pinheiros, São Paulo/SP',
    emergencyName: 'Clara Nunes',
    emergencyRelation: 'filha',
    emergencyPhone: '(11) 99321-4455',
    emergencyContact: 'Clara Nunes (filha) — (11) 99321-4455',
    active: true,
    hasActiveContract: true,
    since: '2024-06-01',
    objective: 'Manutenção da mobilidade e prevenção de quedas.',
    pathologies: 'Artrose de quadril, hipertensão controlada.',
    injuries: 'Nenhuma recente.',
    surgeries: 'Prótese de quadril direito (2021).',
    restrictions: 'Amplitude de quadril limitada, sem impacto.',
    medications: 'Anti-hipertensivo diário.',
    notes: 'Aposentado, muito assíduo. Gosta de acompanhar a evolução.',
    planId: 'tri-2x',
    monthlyValue: 380,
    discountPercent: 0,
    dueDay: 20,
    paymentMethod: 'Boleto',
    schedule: [
      { weekday: 'Segunda', time: '09:00' },
      { weekday: 'Quarta', time: '09:00' },
    ],
    assessments: [
      assessment('a7', '2024-06-05', 88, 1.74, {
        armRight: 32,
        armLeft: 31.5,
        chest: 106,
        waist: 98,
        abdomen: 102,
        hip: 106,
        thighRight: 55,
        thighLeft: 56,
        calfRight: 37,
        calfLeft: 37,
      }, 28),
    ],
    evolutions: [
      {
        id: 'e5',
        date: '2024-10-30',
        professional: 'Dra. Camila Rezende',
        clinical: 'Melhora do equilíbrio e da marcha.',
        complaints: 'Leve rigidez matinal no quadril.',
        improvements: 'Maior confiança ao subir escadas.',
        exercises: 'Equilíbrio, mobilidade de quadril e fortalecimento de glúteos.',
        conduct: 'Manter programa e reavaliar em 3 meses.',
      },
    ],
    photos: [],
    payments: [
      { id: 'pay8', reference: 'Junho/2026', dueDate: '2026-06-20', amount: 380, status: 'pago', method: 'Boleto', paidAt: '2026-06-19' },
      { id: 'pay9', reference: 'Julho/2026', dueDate: '2026-07-20', amount: 380, status: 'pendente' },
    ],
  },
  {
    id: 's5',
    name: 'Fernanda Alves',
    birthDate: '1988-08-02',
    sex: 'Feminino',
    cpf: '567.890.123-45',
    phone: '(11) 99888-7766',
    email: 'fernanda.alves@email.com',
    cep: '05408-000',
    street: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    address: 'Rua Cardeal Arcoverde, 300 — Pinheiros, São Paulo/SP',
    emergencyName: 'Paulo Alves',
    emergencyRelation: 'irmão',
    emergencyPhone: '(11) 99444-2211',
    emergencyContact: 'Paulo Alves (irmão) — (11) 99444-2211',
    active: true,
    hasActiveContract: true,
    since: '2024-11-04',
    objective: 'Pilates na gravidez — bem-estar e preparo para o parto.',
    pathologies: 'Gestação de 24 semanas.',
    injuries: 'Nenhuma.',
    surgeries: 'Nenhuma.',
    restrictions: 'Sem decúbito dorsal prolongado, sem abdominais tradicionais.',
    medications: 'Suplementação pré-natal.',
    notes: 'Liberação médica em dia. Acompanhar sinais de fadiga.',
    planId: 'men-2x',
    monthlyValue: 400,
    discountPercent: 0,
    dueDay: 5,
    paymentMethod: 'PIX',
    schedule: [
      { weekday: 'Terça', time: '10:00' },
      { weekday: 'Sexta', time: '10:00' },
    ],
    assessments: [
      assessment('a8', '2024-11-06', 64, 1.62, {
        armRight: 27,
        armLeft: 27,
        chest: 90,
        waist: 82,
        abdomen: 92,
        hip: 100,
        thighRight: 55,
        thighLeft: 55,
        calfRight: 35,
        calfLeft: 35,
      }),
    ],
    evolutions: [
      {
        id: 'e6',
        date: '2025-02-14',
        professional: 'Juliana Castro',
        clinical: 'Boa adaptação ao programa gestacional.',
        complaints: 'Desconforto lombar ocasional.',
        improvements: 'Fortalecimento de assoalho pélvico.',
        exercises: 'Respiração, mobilidade pélvica e fortalecimento leve.',
        conduct: 'Reduzir amplitude conforme avanço gestacional.',
      },
    ],
    photos: [],
    payments: [
      { id: 'pay10', reference: 'Junho/2026', dueDate: '2026-06-05', amount: 400, status: 'pago', method: 'PIX', paidAt: '2026-06-03' },
      { id: 'pay11', reference: 'Julho/2026', dueDate: '2026-07-05', amount: 400, status: 'atrasado' },
    ],
  },
  {
    id: 's6',
    name: 'Juliana Prado',
    birthDate: '1992-11-20',
    sex: 'Feminino',
    cpf: '678.901.234-56',
    phone: '(11) 99222-1010',
    email: 'juliana.prado@email.com',
    cep: '05406-000',
    street: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    address: 'Rua Teodoro Sampaio, 900 — Pinheiros, São Paulo/SP',
    emergencyName: 'Renato Prado',
    emergencyRelation: 'pai',
    emergencyPhone: '(11) 99123-0099',
    emergencyContact: 'Renato Prado (pai) — (11) 99123-0099',
    active: false,
    hasActiveContract: false,
    since: '2023-03-10',
    objective: 'Condicionamento físico e emagrecimento.',
    pathologies: 'Nenhuma.',
    injuries: 'Tendinite no ombro (resolvida).',
    surgeries: 'Nenhuma.',
    restrictions: 'Nenhuma.',
    medications: 'Nenhum.',
    notes: 'Contrato pausado desde set/2025. Retorno previsto.',
    planId: 'men-1x',
    monthlyValue: 360,
    discountPercent: 0,
    dueDay: 10,
    paymentMethod: 'PIX',
    schedule: [],
    assessments: [
      assessment('a9', '2023-03-15', 72, 1.7, {
        armRight: 29,
        armLeft: 28.5,
        chest: 90,
        waist: 78,
        abdomen: 84,
        hip: 100,
        thighRight: 57,
        thighLeft: 57,
        calfRight: 36,
        calfLeft: 36,
      }, 32, 27),
    ],
    evolutions: [],
    photos: [],
    payments: [
      { id: 'pay12', reference: 'Abril/2026', dueDate: '2026-04-10', amount: 360, status: 'pago', method: 'PIX', paidAt: '2026-04-10' },
    ],
  },
  {
    id: 's7',
    name: 'Pedro Henrique Costa',
    birthDate: '2000-12-01',
    sex: 'Masculino',
    cpf: '789.012.345-67',
    phone: '(11) 98765-4321',
    email: 'pedro.costa@email.com',
    cep: '05416-000',
    street: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    address: 'Rua Fradique Coutinho, 150 — Vila Madalena, São Paulo/SP',
    emergencyName: 'Luiza Costa',
    emergencyRelation: 'mãe',
    emergencyPhone: '(11) 99555-6677',
    emergencyContact: 'Luiza Costa (mãe) — (11) 99555-6677',
    active: true,
    hasActiveContract: true,
    since: '2025-07-18',
    objective: 'Correção postural e fortalecimento após lesão esportiva.',
    pathologies: 'Lombalgia mecânica.',
    injuries: 'Entorse de tornozelo (2025).',
    surgeries: 'Nenhuma.',
    restrictions: 'Cuidado com apoio unipodal à esquerda.',
    medications: 'Nenhum.',
    notes: 'Atleta de vôlei universitário.',
    planId: 'tri-3x',
    monthlyValue: 420,
    discountPercent: 0,
    dueDay: 18,
    paymentMethod: 'PIX',
    schedule: [
      { weekday: 'Segunda', time: '17:00' },
      { weekday: 'Quarta', time: '17:00' },
      { weekday: 'Sexta', time: '17:00' },
    ],
    assessments: [
      assessment('a10', '2025-07-20', 76, 1.85, {
        armRight: 31,
        armLeft: 31,
        chest: 96,
        waist: 80,
        abdomen: 82,
        hip: 98,
        thighRight: 58,
        thighLeft: 57,
        calfRight: 38,
        calfLeft: 37,
      }, 15, 34),
    ],
    evolutions: [
      {
        id: 'e7',
        date: '2025-10-01',
        professional: 'Rafael Monteiro',
        clinical: 'Boa recuperação do tornozelo, sem instabilidade.',
        complaints: 'Sem queixas.',
        improvements: 'Ganho de força e controle motor.',
        exercises: 'Pliometria leve e estabilização de core.',
        conduct: 'Liberar retorno gradual aos treinos de quadra.',
      },
    ],
    photos: [],
    payments: [
      { id: 'pay13', reference: 'Junho/2026', dueDate: '2026-06-18', amount: 420, status: 'pago', method: 'PIX', paidAt: '2026-06-17' },
      { id: 'pay14', reference: 'Julho/2026', dueDate: '2026-07-18', amount: 420, status: 'pago', method: 'PIX', paidAt: '2026-07-24' },
    ],
  },
  {
    id: 's8',
    name: 'Beatriz Ramos',
    birthDate: '1983-07-30',
    sex: 'Feminino',
    cpf: '890.123.456-78',
    phone: '(11) 99010-2030',
    email: 'bia.ramos@email.com',
    cep: '05433-000',
    street: '',
    addressNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    address: 'Rua Girassol, 42 — Vila Madalena, São Paulo/SP',
    emergencyName: 'Diego Ramos',
    emergencyRelation: 'marido',
    emergencyPhone: '(11) 99080-1020',
    emergencyContact: 'Diego Ramos (marido) — (11) 99080-1020',
    active: true,
    hasActiveContract: true,
    since: '2024-09-12',
    objective: 'Alívio de dores por fibromialgia e qualidade de vida.',
    pathologies: 'Fibromialgia.',
    injuries: 'Nenhuma.',
    surgeries: 'Nenhuma.',
    restrictions: 'Respeitar limite de dor, evitar sobrecarga.',
    medications: 'Antidepressivo e analgésico conforme prescrição.',
    notes: 'Responde bem a exercícios de baixa intensidade e alongamento.',
    planId: 'sem-2x',
    monthlyValue: 350,
    discountPercent: 0,
    dueDay: 25,
    paymentMethod: 'Cartão de crédito',
    schedule: [
      { weekday: 'Terça', time: '15:00' },
      { weekday: 'Quinta', time: '15:00' },
    ],
    assessments: [
      assessment('a11', '2024-09-15', 70, 1.66, {
        armRight: 29,
        armLeft: 29,
        chest: 92,
        waist: 80,
        abdomen: 86,
        hip: 102,
        thighRight: 57,
        thighLeft: 57,
        calfRight: 36,
        calfLeft: 36,
      }, 33),
    ],
    evolutions: [
      {
        id: 'e8',
        date: '2025-01-20',
        professional: 'Dra. Camila Rezende',
        clinical: 'Relato de noites de sono melhores.',
        complaints: 'Dores difusas em dias de estresse.',
        improvements: 'Maior disposição e amplitude de movimento.',
        exercises: 'Alongamento global e respiração.',
        conduct: 'Manter intensidade leve e regularidade.',
      },
    ],
    photos: [],
    payments: [
      { id: 'pay15', reference: 'Junho/2026', dueDate: '2026-06-25', amount: 350, status: 'pago', method: 'Cartão de crédito', paidAt: '2026-06-24' },
      { id: 'pay16', reference: 'Julho/2026', dueDate: '2026-07-25', amount: 350, status: 'pago', method: 'Cartão de crédito', paidAt: '2026-07-24' },
    ],
  },
  {
    id: 's-exemplo',
    name: 'Helena Duarte Nogueira',
    birthDate: '1987-03-14',
    sex: 'Feminino',
    cpf: '456.789.123-45',
    phone: '(11) 98765-4321',
    email: 'helena.nogueira@email.com',
    cep: '05422-001',
    street: 'Rua Teodoro Sampaio',
    addressNumber: '1820',
    neighborhood: 'Pinheiros',
    city: 'São Paulo',
    state: 'SP',
    address: 'Rua Teodoro Sampaio, 1820 — Pinheiros, São Paulo/SP',
    emergencyName: 'Ricardo Nogueira',
    emergencyRelation: 'esposo',
    emergencyPhone: '(11) 99654-3210',
    emergencyContact: 'Ricardo Nogueira (esposo) — (11) 99654-3210',
    active: true,
    hasActiveContract: true,
    activePlanLabel: 'Semestral · 2 aulas por semana',
    since: '2025-01-15',
    usesPilates: true,
    usesClinic: true,
    objective:
      'Fortalecimento global no Pilates e reabilitação fisioterapêutica de ombro direito pós-tendinopatia.',
    pathologies:
      'Tendinopatia do supraespinhal (ombro D), cervicalgia crônica, leve hipercifose torácica.',
    injuries:
      'Lesão por esforço repetitivo no ombro direito (2024). Entorse de tornozelo esquerdo em 2021.',
    surgeries: 'Nenhuma.',
    restrictions:
      'Evitar elevação acima de 90° com carga no ombro D nas primeiras semanas; progressão orientada pela fisioterapeuta.',
    medications:
      'Analgésico sob demanda em crises; uso eventual de anti-inflamatório conforme orientação médica.',
    notes:
      'Perfil exemplo completo (Pilates + Fisioterapia). Designer gráfica, passa muitas horas no computador. Prefere Pilates às terças/quintas e fisioterapia às sextas pela manhã.',
    planId: 'sem-2x',
    monthlyValue: 350,
    discountPercent: 0,
    dueDay: 15,
    paymentMethod: 'PIX',
    schedule: [
      { weekday: 'Terça', time: '09:00' },
      { weekday: 'Quinta', time: '09:00' },
    ],
    assessments: [
      assessment(
        'a-ex1',
        '2025-01-20',
        62.5,
        1.68,
        {
          armRight: 27,
          armLeft: 27.5,
          chest: 86,
          waist: 71,
          abdomen: 78,
          hip: 96,
          thighRight: 54,
          thighLeft: 54.5,
          calfRight: 34.5,
          calfLeft: 35,
        },
        28,
        23.5,
      ),
      assessment(
        'a-ex2',
        '2025-07-15',
        61,
        1.68,
        {
          armRight: 28,
          armLeft: 28,
          chest: 85,
          waist: 69,
          abdomen: 75,
          hip: 95,
          thighRight: 55,
          thighLeft: 55,
          calfRight: 35,
          calfLeft: 35,
        },
        25.5,
        25,
      ),
      assessment(
        'a-ex3',
        '2026-01-20',
        60.5,
        1.68,
        {
          armRight: 28.5,
          armLeft: 28.5,
          chest: 85,
          waist: 68,
          abdomen: 74,
          hip: 94.5,
          thighRight: 55.5,
          thighLeft: 55.5,
          calfRight: 35,
          calfLeft: 35,
        },
        24,
        26,
      ),
    ],
    evolutions: [
      {
        id: 'e-ex1',
        date: '2026-07-22',
        professional: 'Dra. Camila Rezende',
        clinical:
          'Sessão de fisioterapia: redução da dor no ombro D (EVA 2/10). Boa adesão aos exercícios domiciliares.',
        complaints: 'Leve tensão cervical ao final do expediente.',
        improvements:
          'Amplitude de abdução e flexão do ombro D próximas do lado contralateral.',
        exercises:
          'Isometria de manguito, scaption com elástico leve, mobilização escapular e alongamento peitoral.',
        conduct:
          'Manter fisioterapia 1x/semana e Pilates 2x/semana; liberar progressão de carga no Reformer sob supervisão.',
      },
      {
        id: 'e-ex2',
        date: '2026-07-17',
        professional: 'Rafael Monteiro',
        clinical:
          'Aula de Pilates: boa estabilização de core; ombro D sem queixa durante séries adaptadas.',
        complaints: 'Cansaço leve em extensão de tronco.',
        improvements: 'Controle de respiração e alinhamento pélvico.',
        exercises:
          'Footwork, Hundred modificado, Side Kick Series e Bridging com foco em glúteos.',
        conduct: 'Incluir variação de braços sem elevação forçada acima da linha dos olhos.',
      },
      {
        id: 'e-ex3',
        date: '2026-06-10',
        professional: 'Dra. Camila Rezende',
        clinical:
          'Avaliação de retorno: quadro inflamatório estabilizado; liberada para intensificar Pilates.',
        complaints: 'Dor residual 3/10 em movimentos rápidos de alcance.',
        improvements: 'Força de manguito e propriocepção melhoradas.',
        exercises: 'Protocolo de reabilitação fase 3 + alongamento cervical.',
        conduct: 'Reavaliação em 45 dias; manter gelo pós-esforço se necessário.',
      },
    ],
    photos: [
      {
        id: 'ph-ex1',
        date: '2025-01-20',
        label: 'Avaliação inicial — postura',
        url: '/evolution-posture-side-view-neutral-studio.jpg',
      },
      {
        id: 'ph-ex2',
        date: '2025-07-15',
        label: '6 meses — postura',
        url: '/evolution-posture-side-view-improved-studio.jpg',
      },
      {
        id: 'ph-ex3',
        date: '2026-01-20',
        label: '1 ano — ombro / postura',
        url: '/evolution-posture-side-view-improved-studio.jpg',
      },
    ],
    payments: [
      {
        id: 'pay-ex1',
        reference: 'Maio/2026',
        dueDate: '2026-05-15',
        amount: 350,
        status: 'pago',
        method: 'PIX',
        paidAt: '2026-05-14',
      },
      {
        id: 'pay-ex2',
        reference: 'Junho/2026',
        dueDate: '2026-06-15',
        amount: 350,
        status: 'pago',
        method: 'PIX',
        paidAt: '2026-06-13',
      },
      {
        id: 'pay-ex3',
        reference: 'Julho/2026',
        dueDate: '2026-07-15',
        amount: 350,
        status: 'pago',
        method: 'PIX',
        paidAt: '2026-07-15',
      },
      {
        id: 'pay-ex4',
        reference: 'Agosto/2026',
        dueDate: '2026-08-15',
        amount: 350,
        status: 'pendente',
      },
    ],
  },
]

// ------- Contratos (vinculados ao aluno) -------

export const contracts: Contract[] = [
  {
    id: 'c-s1-2026',
    studentId: 's1',
    number: '#2026-001',
    planId: 'sem-2x',
    planLabel: 'Semestral · 2x / semana',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    status: 'ativo',
    monthlyValue: 315,
    discountPercent: 10,
    discountNote: 'Desconto fidelidade',
    dueDay: 10,
    paymentMethod: 'PIX',
    financialResponsible: 'Marcos Souza (marido)',
    lateFeePercent: 2,
    interestPercent: 1,
    clauses: [...defaultContractClauses],
    signedAt: '2025-12-20',
    signatureName: 'Ana Beatriz Souza',
    version: 2,
    previousVersions: [
      {
        version: 1,
        changedAt: '2025-12-18',
        summary: 'Rascunho inicial do semestre',
      },
    ],
    history: [
      {
        at: '2025-12-18',
        action: 'Contrato criado (rascunho)',
        by: 'Dra. Camila Rezende',
      },
      {
        at: '2025-12-20',
        action: 'Assinado digitalmente',
        by: 'Ana Beatriz Souza',
      },
      {
        at: '2026-01-01',
        action: 'Contrato ativado',
        by: 'Sistema',
      },
    ],
    createdAt: '2025-12-18',
    updatedAt: '2026-01-01',
  },
  {
    id: 'c-s1-2025',
    studentId: 's1',
    number: '#2025-014',
    planId: 'sem-2x',
    planLabel: 'Semestral · 2x / semana',
    startDate: '2025-07-01',
    endDate: '2025-12-31',
    status: 'encerrado',
    monthlyValue: 350,
    discountPercent: 0,
    dueDay: 10,
    paymentMethod: 'PIX',
    financialResponsible: 'Marcos Souza (marido)',
    lateFeePercent: 2,
    interestPercent: 1,
    clauses: [...defaultContractClauses],
    signedAt: '2025-06-25',
    signatureName: 'Ana Beatriz Souza',
    version: 1,
    previousVersions: [],
    history: [
      {
        at: '2025-06-25',
        action: 'Assinado e ativado',
        by: 'Ana Beatriz Souza',
      },
      {
        at: '2025-12-31',
        action: 'Contrato encerrado por término de vigência',
        by: 'Sistema',
      },
    ],
    createdAt: '2025-06-20',
    updatedAt: '2025-12-31',
  },
  {
    id: 'c-s-exemplo-2026',
    studentId: 's-exemplo',
    number: '#2026-EX1',
    planId: 'sem-2x',
    planLabel: 'Semestral · 2 aulas por semana',
    startDate: '2026-01-15',
    endDate: '2026-07-14',
    status: 'ativo',
    monthlyValue: 350,
    discountPercent: 0,
    dueDay: 15,
    paymentMethod: 'PIX',
    financialResponsible: 'Helena Duarte Nogueira',
    lateFeePercent: 2,
    interestPercent: 1,
    clauses: [...defaultContractClauses],
    signedAt: '2026-01-10',
    signatureName: 'Helena Duarte Nogueira',
    version: 1,
    previousVersions: [],
    history: [
      {
        at: '2026-01-08',
        action: 'Contrato criado (rascunho)',
        by: 'Dra. Camila Rezende',
      },
      {
        at: '2026-01-10',
        action: 'Assinado digitalmente',
        by: 'Helena Duarte Nogueira',
      },
      {
        at: '2026-01-15',
        action: 'Contrato ativado',
        by: 'Sistema',
      },
    ],
    createdAt: '2026-01-08',
    updatedAt: '2026-01-15',
  },
  {
    id: 'c-s2-2026',
    studentId: 's2',
    number: '#2026-008',
    planId: 'sem-3x',
    planLabel: 'Semestral · 3x / semana',
    startDate: '2026-02-01',
    endDate: '2026-07-31',
    status: 'ativo',
    monthlyValue: 400,
    discountPercent: 0,
    dueDay: 5,
    paymentMethod: 'Cartão de crédito',
    financialResponsible: 'Carlos Eduardo Lima',
    lateFeePercent: 2,
    interestPercent: 1,
    clauses: [...defaultContractClauses],
    signedAt: '2026-01-28',
    signatureName: 'Carlos Eduardo Lima',
    version: 1,
    previousVersions: [],
    history: [
      {
        at: '2026-01-28',
        action: 'Assinado digitalmente',
        by: 'Carlos Eduardo Lima',
      },
      { at: '2026-02-01', action: 'Contrato ativado', by: 'Sistema' },
    ],
    createdAt: '2026-01-25',
    updatedAt: '2026-02-01',
  },
  {
    id: 'c-s3-2026',
    studentId: 's3',
    number: '#2026-012',
    planId: 'men-1x',
    planLabel: 'Mensal · 1x / semana',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    status: 'pendente_assinatura',
    monthlyValue: 280,
    discountPercent: 0,
    dueDay: 15,
    paymentMethod: 'Boleto',
    financialResponsible: 'Mariana Oliveira',
    lateFeePercent: 2,
    interestPercent: 1,
    clauses: [...defaultContractClauses],
    version: 1,
    previousVersions: [],
    history: [
      {
        at: '2026-06-28',
        action: 'Contrato gerado — aguardando assinatura',
        by: 'Dra. Camila Rezende',
      },
    ],
    createdAt: '2026-06-28',
    updatedAt: '2026-06-28',
  },
  {
    id: 'c-s4-2026',
    studentId: 's4',
    number: '#2026-004',
    planId: 'tri-2x',
    planLabel: 'Trimestral · 2x / semana',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    status: 'ativo',
    monthlyValue: 380,
    discountPercent: 0,
    dueDay: 8,
    paymentMethod: 'PIX',
    financialResponsible: 'Roberto Nunes',
    lateFeePercent: 2,
    interestPercent: 1,
    clauses: [...defaultContractClauses],
    signedAt: '2026-03-25',
    signatureName: 'Roberto Nunes',
    version: 1,
    previousVersions: [],
    history: [
      {
        at: '2026-03-25',
        action: 'Assinado digitalmente',
        by: 'Roberto Nunes',
      },
    ],
    createdAt: '2026-03-20',
    updatedAt: '2026-03-25',
  },
  {
    id: 'c-s5-2026',
    studentId: 's5',
    number: '#2026-015',
    planId: 'men-3x',
    planLabel: 'Mensal · 3x / semana',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    status: 'ativo',
    monthlyValue: 400,
    discountPercent: 0,
    dueDay: 12,
    paymentMethod: 'PIX',
    financialResponsible: 'Fernanda Alves',
    lateFeePercent: 2,
    interestPercent: 1,
    clauses: [...defaultContractClauses],
    signedAt: '2026-06-30',
    signatureName: 'Fernanda Alves',
    version: 1,
    previousVersions: [],
    history: [
      {
        at: '2026-06-30',
        action: 'Assinado e ativado',
        by: 'Fernanda Alves',
      },
    ],
    createdAt: '2026-06-28',
    updatedAt: '2026-06-30',
  },
  {
    id: 'c-s7-2026',
    studentId: 's7',
    number: '#2026-019',
    planId: 'tri-3x',
    planLabel: 'Trimestral · 3x / semana',
    startDate: '2026-05-01',
    endDate: '2026-07-31',
    status: 'rascunho',
    monthlyValue: 420,
    discountPercent: 0,
    dueDay: 20,
    paymentMethod: 'Dinheiro',
    financialResponsible: 'Pedro Henrique Costa',
    lateFeePercent: 2,
    interestPercent: 1,
    clauses: [...defaultContractClauses],
    version: 1,
    previousVersions: [],
    history: [
      {
        at: '2026-07-20',
        action: 'Rascunho criado para renovação',
        by: 'Rafael Monteiro',
      },
    ],
    createdAt: '2026-07-20',
    updatedAt: '2026-07-20',
  },
  {
    id: 'c-s8-2025',
    studentId: 's8',
    number: '#2025-022',
    planId: 'sem-2x',
    planLabel: 'Semestral · 2x / semana',
    startDate: '2025-08-01',
    endDate: '2026-01-31',
    status: 'cancelado',
    monthlyValue: 350,
    discountPercent: 0,
    dueDay: 25,
    paymentMethod: 'Cartão de crédito',
    financialResponsible: 'Beatriz Ramos',
    lateFeePercent: 2,
    interestPercent: 1,
    clauses: [...defaultContractClauses],
    signedAt: '2025-07-28',
    signatureName: 'Beatriz Ramos',
    version: 1,
    previousVersions: [],
    history: [
      {
        at: '2025-07-28',
        action: 'Assinado digitalmente',
        by: 'Beatriz Ramos',
      },
      {
        at: '2026-01-10',
        action: 'Contrato rescindido a pedido da pessoa',
        by: 'Dra. Camila Rezende',
      },
    ],
    createdAt: '2025-07-25',
    updatedAt: '2026-01-10',
  },
]

export function getContract(id: string) {
  return contracts.find((c) => c.id === id)
}

export function getStudentContracts(studentId: string) {
  return contracts
    .filter((c) => c.studentId === studentId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
}

function todayIsoStamp() {
  return toIsoDate(new Date())
}

export function patchContract(
  id: string,
  patch: Partial<Omit<Contract, 'id' | 'studentId'>>,
  historyAction?: string,
): Contract | null {
  const index = contracts.findIndex((c) => c.id === id)
  if (index < 0) return null
  const current = contracts[index]
  const next: Contract = {
    ...current,
    ...patch,
    clauses: patch.clauses ? [...patch.clauses] : [...current.clauses],
    previousVersions: patch.previousVersions
      ? patch.previousVersions.map((v) => ({ ...v }))
      : current.previousVersions.map((v) => ({ ...v })),
    history: patch.history
      ? patch.history.map((h) => ({ ...h }))
      : current.history.map((h) => ({ ...h })),
    updatedAt: todayIsoStamp(),
  }
  if (historyAction) {
    next.history = [
      {
        at: todayIsoStamp(),
        action: historyAction,
        by: studio.owner,
      },
      ...next.history,
    ]
  }
  contracts[index] = next
  return next
}

export function sendContractForSignature(id: string) {
  return patchContract(
    id,
    { status: 'pendente_assinatura' },
    'Enviado para assinatura eletrônica',
  )
}

export function renewContract(id: string): Contract | null {
  const current = getContract(id)
  if (!current) return null
  const startIso = toIsoDate(new Date())
  const plan = getPlan(current.planId)
  const endIso = contractEndDateForPeriod(
    startIso,
    plan?.period ?? 'semestral',
  )
  const year = new Date().getFullYear()
  const seq = String(contracts.length + 1).padStart(3, '0')
  const renewed: Contract = {
    ...current,
    id: `c-${current.studentId}-${Date.now()}`,
    number: `#${year}-${seq}`,
    startDate: startIso,
    endDate: endIso,
    status: 'rascunho',
    signedAt: undefined,
    signatureName: undefined,
    version: 1,
    previousVersions: [
      {
        version: current.version,
        changedAt: todayIsoStamp(),
        summary: `Renovação a partir de ${current.number}`,
      },
      ...current.previousVersions,
    ],
    history: [
      {
        at: todayIsoStamp(),
        action: `Renovação criada a partir de ${current.number}`,
        by: studio.owner,
      },
    ],
    createdAt: todayIsoStamp(),
    updatedAt: todayIsoStamp(),
  }
  contracts.unshift(renewed)
  patchContract(
    current.id,
    { status: current.status === 'ativo' ? 'encerrado' : current.status },
    `Encerrado por renovação (${renewed.number})`,
  )
  return renewed
}

export function rescindContract(id: string) {
  return patchContract(
    id,
    { status: 'cancelado' },
    'Contrato rescindido',
  )
}

/** Remove o contrato do histórico do aluno (exclusão definitiva no MVP). */
export function removeContract(id: string): boolean {
  const index = contracts.findIndex((c) => c.id === id)
  if (index < 0) return false
  contracts.splice(index, 1)
  return true
}

// ------- Campanhas (comunicação / marketing) -------

export type CampaignType =
  | 'aniversarios'
  | 'eventos'
  | 'promocoes'
  | 'marketing'
  | 'whatsapp'
  | 'email'
  | 'fidelizacao'
  | 'reativacao'

export type CampaignChannel = 'whatsapp' | 'email' | 'sms' | 'interno'

export type CampaignStatus =
  | 'rascunho'
  | 'agendada'
  | 'em_andamento'
  | 'pausada'
  | 'finalizada'

export type CampaignAudience =
  | 'todos'
  | 'ativos'
  | 'inativos'
  | 'aniversariantes'
  | 'inadimplentes'
  | 'responsaveis'

export type CampaignAttachment = {
  id: string
  name: string
  kind: 'image' | 'pdf'
}

export type CampaignStats = {
  sent: number
  opened: number
  clicked: number
  converted: number
}

export type CampaignAutomation =
  | 'aniversario'
  | 'lembrete'
  | 'pos_venda'
  | 'reativacao'

export type Campaign = {
  id: string
  name: string
  type: CampaignType
  channel: CampaignChannel
  audience: CampaignAudience
  audienceLabel: string
  startDate: string
  endDate?: string
  scheduledAt?: string
  status: CampaignStatus
  messageTemplate: string
  variables: string[]
  attachments: CampaignAttachment[]
  automation?: CampaignAutomation | null
  stats: CampaignStats
  createdAt: string
  updatedAt: string
}

export const campaignTypeLabel: Record<CampaignType, string> = {
  aniversarios: 'Aniversários',
  eventos: 'Eventos',
  promocoes: 'Promoções',
  marketing: 'Marketing',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  fidelizacao: 'Fidelização',
  reativacao: 'Reativação',
}

export const campaignChannelLabel: Record<CampaignChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  sms: 'SMS',
  interno: 'Aviso interno',
}

export const campaignStatusLabel: Record<CampaignStatus, string> = {
  rascunho: 'Rascunho',
  agendada: 'Agendada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
}

export const campaignAudienceLabel: Record<CampaignAudience, string> = {
  todos: 'Todas as pessoas',
  ativos: 'Pessoas ativas',
  inativos: 'Pessoas inativas',
  aniversariantes: 'Aniversariantes do mês',
  inadimplentes: 'Inadimplentes',
  responsaveis: 'Responsáveis financeiros',
}

export const campaignAutomationLabel: Record<CampaignAutomation, string> = {
  aniversario: 'Aniversários',
  lembrete: 'Lembretes',
  pos_venda: 'Pós-venda',
  reativacao: 'Reativação',
}

export type CampaignMessageTemplate = {
  id: string
  name: string
  body: string
}

export const campaignMessageTemplates: CampaignMessageTemplate[] = [
  {
    id: 'tpl-birthday',
    name: 'Aniversário',
    body: 'Olá, {{nome}}! A equipe do {{estudio}} deseja um feliz aniversário 🎂. Seu plano {{modalidade}} continua te esperando com carinho.',
  },
  {
    id: 'tpl-promo',
    name: 'Promoção',
    body: 'Oi, {{nome}}! Tem promoção especial no {{estudio}} para o plano {{modalidade}}. Fale conosco e garanta sua vaga.',
  },
  {
    id: 'tpl-reactivation',
    name: 'Reativação',
    body: 'Sentimos sua falta, {{nome}}! Que tal retomar as aulas de {{modalidade}}? Temos horários abertos esta semana.',
  },
  {
    id: 'tpl-reminder',
    name: 'Lembrete de aula',
    body: 'Oi, {{nome}}! Lembrete: sua aula de {{modalidade}} está agendada. Qualquer dúvida, responda esta mensagem.',
  },
]

export const campaignVariableHints = [
  '{{nome}}',
  '{{estudio}}',
  '{{modalidade}}',
  '{{responsavel}}',
  '{{vencimento}}',
]

export const campaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Aniversariantes de julho',
    type: 'aniversarios',
    channel: 'whatsapp',
    audience: 'aniversariantes',
    audienceLabel: 'Aniversariantes do mês',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    status: 'em_andamento',
    messageTemplate: campaignMessageTemplates[0].body,
    variables: ['{{nome}}', '{{estudio}}', '{{modalidade}}'],
    attachments: [
      { id: 'att-1', name: 'card-aniversario.jpg', kind: 'image' },
    ],
    automation: 'aniversario',
    stats: { sent: 12, opened: 10, clicked: 4, converted: 2 },
    createdAt: '2026-06-28',
    updatedAt: '2026-07-20',
  },
  {
    id: 'camp-2',
    name: 'Workshop de postura',
    type: 'eventos',
    channel: 'email',
    audience: 'ativos',
    audienceLabel: 'Pessoas ativas',
    startDate: '2026-08-05',
    scheduledAt: '2026-08-01T09:00',
    status: 'agendada',
    messageTemplate:
      'Olá, {{nome}}! No dia 12/08 teremos um workshop de postura no {{estudio}}. Reserve sua vaga respondendo este e-mail.',
    variables: ['{{nome}}', '{{estudio}}'],
    attachments: [
      { id: 'att-2', name: 'convite-workshop.pdf', kind: 'pdf' },
    ],
    automation: 'lembrete',
    stats: { sent: 0, opened: 0, clicked: 0, converted: 0 },
    createdAt: '2026-07-18',
    updatedAt: '2026-07-22',
  },
  {
    id: 'camp-3',
    name: 'Promo trimestral 15%',
    type: 'promocoes',
    channel: 'whatsapp',
    audience: 'responsaveis',
    audienceLabel: 'Responsáveis financeiros',
    startDate: '2026-07-10',
    endDate: '2026-07-25',
    status: 'finalizada',
    messageTemplate: campaignMessageTemplates[1].body,
    variables: ['{{nome}}', '{{estudio}}', '{{modalidade}}'],
    attachments: [],
    stats: { sent: 28, opened: 22, clicked: 11, converted: 5 },
    createdAt: '2026-07-08',
    updatedAt: '2026-07-25',
  },
  {
    id: 'camp-4',
    name: 'Reativação — pessoas inativas',
    type: 'reativacao',
    channel: 'email',
    audience: 'inativos',
    audienceLabel: 'Pessoas inativas',
    startDate: '2026-07-15',
    status: 'pausada',
    messageTemplate: campaignMessageTemplates[2].body,
    variables: ['{{nome}}', '{{modalidade}}'],
    attachments: [],
    automation: 'reativacao',
    stats: { sent: 6, opened: 3, clicked: 1, converted: 0 },
    createdAt: '2026-07-12',
    updatedAt: '2026-07-21',
  },
  {
    id: 'camp-5',
    name: 'Lembrete de mensalidade',
    type: 'marketing',
    channel: 'email',
    audience: 'inadimplentes',
    audienceLabel: 'Inadimplentes',
    startDate: '2026-07-20',
    status: 'rascunho',
    messageTemplate:
      'Olá, {{responsavel}}! Identificamos pendência referente a {{nome}} ({{modalidade}}). Vencimento: {{vencimento}}. Podemos ajudar?',
    variables: [
      '{{responsavel}}',
      '{{nome}}',
      '{{modalidade}}',
      '{{vencimento}}',
    ],
    attachments: [],
    automation: 'pos_venda',
    stats: { sent: 0, opened: 0, clicked: 0, converted: 0 },
    createdAt: '2026-07-19',
    updatedAt: '2026-07-19',
  },
]

export function getCampaign(id: string) {
  return campaigns.find((c) => c.id === id)
}

export function listCampaigns() {
  return [...campaigns].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

function campaignStamp() {
  return toIsoDate(new Date())
}

export function createCampaign(
  input: Partial<Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>> & {
    name: string
  },
): Campaign {
  const type = input.type ?? 'marketing'
  const audience = input.audience ?? 'ativos'
  const campaign: Campaign = {
    id: `camp-${Date.now()}`,
    name: input.name.trim(),
    type,
    channel: input.channel ?? 'whatsapp',
    audience,
    audienceLabel:
      input.audienceLabel ?? campaignAudienceLabel[audience],
    startDate: input.startDate ?? campaignStamp(),
    endDate: input.endDate,
    scheduledAt: input.scheduledAt,
    status: input.status ?? 'rascunho',
    messageTemplate:
      input.messageTemplate ?? campaignMessageTemplates[0].body,
    variables: input.variables ?? [...campaignVariableHints.slice(0, 3)],
    attachments: input.attachments?.map((a) => ({ ...a })) ?? [],
    automation: input.automation ?? null,
    stats: { sent: 0, opened: 0, clicked: 0, converted: 0 },
    createdAt: campaignStamp(),
    updatedAt: campaignStamp(),
  }
  campaigns.unshift(campaign)
  return campaign
}

export function patchCampaign(
  id: string,
  patch: Partial<Omit<Campaign, 'id' | 'createdAt'>>,
): Campaign | null {
  const index = campaigns.findIndex((c) => c.id === id)
  if (index < 0) return null
  const current = campaigns[index]
  const audience = patch.audience ?? current.audience
  campaigns[index] = {
    ...current,
    ...patch,
    audience,
    audienceLabel:
      patch.audienceLabel ??
      (patch.audience ? campaignAudienceLabel[audience] : current.audienceLabel),
    variables: patch.variables
      ? [...patch.variables]
      : [...current.variables],
    attachments: patch.attachments
      ? patch.attachments.map((a) => ({ ...a }))
      : current.attachments.map((a) => ({ ...a })),
    stats: patch.stats ? { ...patch.stats } : { ...current.stats },
    updatedAt: campaignStamp(),
  }
  return campaigns[index]
}

export function duplicateCampaign(id: string): Campaign | null {
  const current = getCampaign(id)
  if (!current) return null
  return createCampaign({
    name: `${current.name} (cópia)`,
    type: current.type,
    channel: current.channel,
    audience: current.audience,
    audienceLabel: current.audienceLabel,
    startDate: campaignStamp(),
    status: 'rascunho',
    messageTemplate: current.messageTemplate,
    variables: [...current.variables],
    attachments: current.attachments.map((a) => ({
      ...a,
      id: `att-${Date.now()}-${a.id}`,
    })),
    automation: current.automation,
  })
}

export function scheduleCampaign(id: string, scheduledAt: string) {
  return patchCampaign(id, {
    status: 'agendada',
    scheduledAt,
    startDate: scheduledAt.slice(0, 10),
  })
}

export function pauseCampaign(id: string) {
  return patchCampaign(id, { status: 'pausada' })
}

export function resumeCampaign(id: string) {
  return patchCampaign(id, { status: 'em_andamento' })
}

export function removeCampaign(id: string): boolean {
  const index = campaigns.findIndex((c) => c.id === id)
  if (index < 0) return false
  campaigns.splice(index, 1)
  return true
}

/** Renomeia apenas o nome da campanha. */
export function renameCampaign(id: string, name: string): Campaign | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  return patchCampaign(id, { name: trimmed })
}

export function renameCampaignTemplate(
  id: string,
  name: string,
): CampaignMessageTemplate | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const template = campaignMessageTemplates.find((t) => t.id === id)
  if (!template) return null
  template.name = trimmed
  return template
}

export function removeCampaignTemplate(id: string): boolean {
  if (campaignMessageTemplates.length <= 1) return false
  const index = campaignMessageTemplates.findIndex((t) => t.id === id)
  if (index < 0) return false
  campaignMessageTemplates.splice(index, 1)
  return true
}

export function campaignOpenRate(stats: CampaignStats) {
  if (stats.sent === 0) return 0
  return Math.round((stats.opened / stats.sent) * 100)
}

export function campaignConversionRate(stats: CampaignStats) {
  if (stats.sent === 0) return 0
  return Math.round((stats.converted / stats.sent) * 100)
}

// ------- Helpers -------

export function getStudent(id: string) {
  return students.find((s) => s.id === id)
}

export function getPlan(id: string) {
  return plans.find((p) => p.id === id)
}

export function planName(id: string) {
  return getPlan(id)?.name ?? '—'
}

/** Aplica desconto percentual a um valor base. */
export function priceWithDiscount(basePrice: number, discountPercent = 0) {
  const discount = Math.min(100, Math.max(0, discountPercent))
  return Math.round(basePrice * (1 - discount / 100) * 100) / 100
}

/** Valor cobrado do aluno a partir do plano + desconto individual. */
export function studentChargedValue(
  planOrId: Plan | string | undefined | null,
  discountPercent = 0,
) {
  const plan = typeof planOrId === 'string' ? getPlan(planOrId) : planOrId
  if (!plan) return 0
  return priceWithDiscount(plan.price, discountPercent)
}

// ------- Configurações (estúdio, horários, equipe, planos) -------

export function patchStudio(patch: Partial<StudioProfile>) {
  Object.assign(studio, patch)
  return { ...studio }
}

export function patchStudioHour(
  weekday: Weekday,
  patch: Partial<Pick<StudioHour, 'open' | 'close' | 'closed'>>,
) {
  const hour = studioHours.find((h) => h.weekday === weekday)
  if (!hour) return null
  if (patch.closed !== undefined) {
    hour.closed = patch.closed
  }
  if (patch.open !== undefined) {
    const open = normalizeTimeInput(patch.open)
    if (!open) return null
    hour.open = open
  }
  if (patch.close !== undefined) {
    const close = normalizeTimeInput(patch.close)
    if (!close) return null
    hour.close = close
  }
  return { ...hour }
}

export function getProfessional(id: string) {
  return professionals.find((p) => p.id === id)
}

export function patchProfessional(
  id: string,
  patch: Partial<Omit<Professional, 'id'>>,
) {
  const index = professionals.findIndex((p) => p.id === id)
  if (index < 0) return null
  professionals[index] = { ...professionals[index], ...patch }
  return professionals[index]
}

export function createProfessional(
  input?: Partial<Omit<Professional, 'id'>>,
): Professional {
  const professional: Professional = {
    id: `prof-${Date.now()}`,
    name: input?.name?.trim() || 'Novo profissional',
    role: input?.role?.trim() || 'Profissional',
    registration: input?.registration?.trim() || '—',
    email: input?.email?.trim() || '',
  }
  professionals.push(professional)
  return professional
}

export function removeProfessional(id: string): boolean {
  if (professionals.length <= 1) return false
  const index = professionals.findIndex((p) => p.id === id)
  if (index < 0) return false
  professionals.splice(index, 1)
  return true
}

function frequencyLabelFor(frequency: PlanFrequency) {
  return `${frequency}x / semana` as const
}

export function patchPlan(
  id: string,
  patch: Partial<Omit<Plan, 'id'>>,
): Plan | null {
  const index = plans.findIndex((p) => p.id === id)
  if (index < 0) return null
  const current = plans[index]
  const frequency = (patch.frequency ?? current.frequency) as PlanFrequency
  const period = patch.period ?? current.period
  const name =
    patch.name ??
    (patch.period || patch.frequency
      ? `${planPeriodLabel[period]} · ${frequencyLabelFor(frequency)}`
      : current.name)
  plans[index] = {
    ...current,
    ...patch,
    frequency,
    period,
    name,
    frequencyLabel: frequencyLabelFor(frequency),
    price: patch.price !== undefined ? Math.max(0, patch.price) : current.price,
  }
  const updated = plans[index]
  if (patch.price !== undefined) {
    for (const student of students) {
      if (student.planId === id) {
        student.monthlyValue = studentChargedValue(
          updated,
          student.discountPercent ?? 0,
        )
      }
    }
  }
  return updated
}

export function createPlan(input?: Partial<Omit<Plan, 'id'>>): Plan {
  const period = input?.period ?? 'mensal'
  const frequency = (input?.frequency ?? 1) as PlanFrequency
  const plan: Plan = {
    id: `plan-${Date.now()}`,
    kind: input?.kind ?? 'mensalidade',
    period,
    frequency,
    frequencyLabel: frequencyLabelFor(frequency),
    name:
      input?.name?.trim() ||
      `${planPeriodLabel[period]} · ${frequencyLabelFor(frequency)}`,
    price: input?.price ?? 0,
    sessionsTotal: input?.sessionsTotal ?? null,
  }
  plans.push(plan)
  return plan
}

export function removePlan(id: string): { ok: true } | { ok: false; error: string } {
  if (plans.length <= 1) {
    return { ok: false, error: 'Mantenha ao menos um plano' }
  }
  const inUse = students.some((s) => s.planId === id)
  if (inUse) {
    return { ok: false, error: 'Plano em uso por pessoas cadastradas' }
  }
  const index = plans.findIndex((p) => p.id === id)
  if (index < 0) return { ok: false, error: 'Plano não encontrado' }
  plans.splice(index, 1)
  return { ok: true }
}

/** Frequência semanal permitida pelo plano (1x, 2x ou 3x). */
export function planWeeklyLimit(planId: string): PlanFrequency {
  return getPlan(planId)?.frequency ?? 1
}

/** Semanas contratadas no período do plano (4 semanas/mês). */
export function planPeriodWeeks(period: PlanPeriod): number {
  switch (period) {
    case 'mensal':
      return 4
    case 'trimestral':
      return 12
    case 'semestral':
      return 24
  }
}

/** Meses de vigência conforme o período do plano. */
export function planPeriodMonths(period: PlanPeriod): number {
  switch (period) {
    case 'mensal':
      return 1
    case 'trimestral':
      return 3
    case 'semestral':
      return 6
  }
}

/**
 * Data de término da vigência a partir do início e do período do plano
 * (último dia do período, ex.: 01/01 + semestral → 30/06).
 */
export function contractEndDateForPeriod(
  startIso: string,
  period: PlanPeriod,
): string {
  const start = parseIsoDate(startIso)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  end.setMonth(end.getMonth() + planPeriodMonths(period))
  end.setDate(end.getDate() - 1)
  return toIsoDate(end)
}

/** Total de aulas do plano = semanas do período × frequência semanal. */
export function planTotalClasses(planId: string): number {
  const plan = getPlan(planId)
  if (!plan) return 0
  return planPeriodWeeks(plan.period) * plan.frequency
}

export function planTotalClassesFromPlan(plan: Pick<Plan, 'period' | 'frequency'>) {
  return planPeriodWeeks(plan.period) * plan.frequency
}

/**
 * Semanas do calendário que intersectam o intervalo [fromDate, toDate]
 * (mesma grade usada na geração do histórico).
 */
export function countWeeksOverlappingRange(
  fromDate: string,
  toDate: string,
): number {
  const from = parseIsoDate(fromDate)
  const to = parseIsoDate(toDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return 0
  }
  let cursor = getMonday(from)
  const lastMonday = getMonday(to)
  let weeks = 0
  while (cursor <= lastMonday) {
    const columns = getWeekColumns(cursor)
    if (columns.some((c) => c.iso >= fromDate && c.iso <= toDate)) {
      weeks += 1
    }
    cursor = addDays(cursor, 7)
  }
  return weeks
}

/**
 * Total de aulas fixas na vigência do contrato:
 * semanas reais entre início e fim × frequência semanal do plano.
 * O fim já reflete o período do plano a partir da data de início.
 */
export function contractTotalClasses(input: {
  startDate: string
  endDate: string
  frequency: number
  /** Mantido por compatibilidade; o total contratado não depende da grade. */
  schedule?: ScheduleSlot[]
  planId?: string
}): number {
  const frequency = Math.max(0, input.frequency)
  if (!input.startDate || !input.endDate || input.startDate > input.endDate) {
    return 0
  }
  return countWeeksOverlappingRange(input.startDate, input.endDate) * frequency
}

export function scheduleWithinPlanLimit(
  schedule: ScheduleSlot[],
  planIdOrFrequency: string | number,
) {
  const limit =
    typeof planIdOrFrequency === 'number'
      ? Math.max(0, planIdOrFrequency)
      : planWeeklyLimit(planIdOrFrequency)
  if (schedule.length <= limit) return schedule
  return schedule.slice(0, limit)
}

/** Dia anterior em ISO (YYYY-MM-DD), sem dependência de fuso. */
export function dayBeforeIso(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** Slot vigente na data (inclusive). Sem effectiveFrom = legado sempre válido. */
export function isScheduleSlotActiveOn(slot: ScheduleSlot, dateIso: string) {
  const from = slot.effectiveFrom?.slice(0, 10)
  const to = slot.effectiveTo?.slice(0, 10) || null
  if (from && dateIso < from) return false
  if (to && dateIso > to) return false
  return true
}

/** Slots vigentes em uma data específica. */
export function scheduleSlotsOnDate(schedule: ScheduleSlot[], dateIso: string) {
  return schedule.filter((slot) => isScheduleSlotActiveOn(slot, dateIso))
}

/** Grade atual (sem data de fim). */
export function currentScheduleSlots(schedule: ScheduleSlot[]) {
  return schedule.filter((slot) => !slot.effectiveTo)
}

export type SchedulePeriod = {
  key: string
  effectiveFrom: string
  effectiveTo: string | null
  slots: ScheduleSlot[]
  isCurrent: boolean
}

function weekdayOrder(day: Weekday) {
  const index = weekdays.indexOf(day)
  return index >= 0 ? index : 99
}

/** Ordena slots por dia da semana e horário. */
export function sortScheduleSlots(slots: ScheduleSlot[]) {
  return [...slots].sort((a, b) => {
    const byDay = weekdayOrder(a.weekday) - weekdayOrder(b.weekday)
    if (byDay !== 0) return byDay
    return a.time.localeCompare(b.time)
  })
}

/** Dias únicos do período, na ordem da semana. */
export function periodWeekdays(slots: ScheduleSlot[]) {
  const unique = new Set(slots.map((s) => s.weekday))
  return weekdays.filter((day) => unique.has(day))
}

/** Agrupa slots em períodos de vigência (mesmo from/to). */
export function groupScheduleIntoPeriods(
  schedule: ScheduleSlot[],
): SchedulePeriod[] {
  const map = new Map<string, SchedulePeriod>()
  for (const slot of schedule) {
    const from = slot.effectiveFrom?.slice(0, 10) || '2000-01-01'
    const to = slot.effectiveTo?.slice(0, 10) || null
    const key = `${from}|${to ?? 'open'}`
    const existing = map.get(key)
    if (existing) {
      existing.slots.push(slot)
    } else {
      map.set(key, {
        key,
        effectiveFrom: from,
        effectiveTo: to,
        slots: [slot],
        isCurrent: to == null,
      })
    }
  }

  return [...map.values()]
    .map((period) => ({
      ...period,
      slots: sortScheduleSlots(period.slots),
    }))
    .sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
      return b.effectiveFrom.localeCompare(a.effectiveFrom)
    })
}

function formatSchedulePeriodLabel(period: SchedulePeriod) {
  const from = formatShortDate(period.effectiveFrom)
  if (period.isCurrent || !period.effectiveTo) return `${from} — atual`
  return `${from} — ${formatShortDate(period.effectiveTo)}`
}

export { formatSchedulePeriodLabel }

/** Atualiza o aluno no store em memória (MVP sem banco). */
export function patchStudent(id: string, patch: Partial<Student>) {
  const index = students.findIndex((s) => s.id === id)
  if (index < 0) return null

  const current = students[index]
  const next: Student = {
    ...current,
    ...patch,
    schedule: patch.schedule
      ? patch.schedule.map((s) => ({ ...s }))
      : current.schedule.map((s) => ({ ...s })),
    payments: patch.payments
      ? patch.payments.map((p) => ({ ...p }))
      : current.payments.map((p) => ({ ...p })),
  }

  const planId = next.planId
  // Só corta a agenda quando o plano do cadastro muda — a agenda segue o
  // contrato ativo (sincronizado em syncStudentWithActiveContract).
  if (patch.planId !== undefined) {
    next.schedule = scheduleWithinPlanLimit(next.schedule, planId)
  }

  if (patch.discountPercent !== undefined) {
    next.discountPercent = Math.min(
      100,
      Math.max(0, patch.discountPercent),
    )
  }

  const plan = getPlan(planId)
  const shouldRecalc =
    patch.planId !== undefined || patch.discountPercent !== undefined
  if (shouldRecalc && plan && patch.monthlyValue === undefined) {
    next.monthlyValue = studentChargedValue(plan, next.discountPercent ?? 0)
  }

  students[index] = next
  return next
}

/** Remove o aluno do store em memória (após exclusão na API). */
export function removeStudentFromStore(id: string) {
  const index = students.findIndex((s) => s.id === id)
  if (index < 0) return false
  students.splice(index, 1)
  return true
}

/** Garante que o aluno da API exista no store em memória (agenda/frequência). */
export function upsertStudentInStore(student: Student) {
  const index = students.findIndex((s) => s.id === student.id)
  const clone: Student = {
    ...student,
    schedule: student.schedule.map((s) => ({ ...s })),
    payments: student.payments.map((p) => ({ ...p })),
    assessments: student.assessments.map((a) => ({ ...a })),
    evolutions: student.evolutions.map((e) => ({ ...e })),
    photos: student.photos.map((p) => ({ ...p })),
  }
  if (index < 0) {
    students.push(clone)
    return clone
  }
  students[index] = { ...students[index], ...clone }
  return students[index]
}

/**
 * Substitui o store em memória pelos alunos da API.
 * Evita que mocks legados continuem aparecendo na agenda.
 */
export function replaceStudentsInStore(list: Student[]) {
  students.splice(
    0,
    students.length,
    ...list.map((student) => ({
      ...student,
      schedule: student.schedule.map((s) => ({ ...s })),
      payments: student.payments.map((p) => ({ ...p })),
      assessments: student.assessments.map((a) => ({ ...a })),
      evolutions: student.evolutions.map((e) => ({ ...e })),
      photos: student.photos.map((p) => ({ ...p })),
    })),
  )
  return students
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function age(birthDate: string) {
  const [y, m, d] = birthDate.split('-').map(Number)
  const today = new Date()
  let a = today.getFullYear() - y
  const monthDiff = today.getMonth() + 1 - m
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) a--
  return a
}

/** Menor de idade para fins de responsável financeiro no contrato. */
export function isMinor(birthDate: string) {
  return age(birthDate) < 18
}

/** Calcula IMC a partir do peso (kg) e da altura (cm). */
export function bmi(weight: number, heightCm: number) {
  if (!heightCm || heightCm <= 0) return 0
  const heightM = heightCm / 100
  return +(weight / (heightM * heightM)).toFixed(1)
}

export function bmiLabel(value: number) {
  if (value < 18.5) return 'Abaixo do peso'
  if (value < 25) return 'Peso normal'
  if (value < 30) return 'Sobrepeso'
  return 'Obesidade'
}

export function studentPaymentStatus(student: Student): PaymentStatus {
  if (student.payments.some((p) => p.status === 'atrasado')) return 'atrasado'
  if (student.payments.some((p) => p.status === 'pendente')) return 'pendente'
  return 'pago'
}

export type StudentPaymentRow = {
  student: Student
  payment: Payment
}

export function allPayments(): StudentPaymentRow[] {
  return students.flatMap((student) =>
    student.payments.map((payment) => ({ student, payment })),
  )
}

export function monthlyRevenue(year: number, month: number) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return allPayments()
    .filter(
      (row) =>
        row.payment.status === 'pago' &&
        row.payment.paidAt?.startsWith(prefix),
    )
    .reduce((sum, row) => sum + row.payment.amount, 0)
}

export function todayReceipts(isoDate: string): StudentPaymentRow[] {
  return allPayments().filter(
    (row) =>
      row.payment.status === 'pago' && row.payment.paidAt === isoDate,
  )
}

export function overduePayments(): StudentPaymentRow[] {
  return allPayments().filter((row) => row.payment.status === 'atrasado')
}

export function openPayments(): StudentPaymentRow[] {
  return allPayments().filter(
    (row) =>
      row.payment.status === 'pendente' || row.payment.status === 'atrasado',
  )
}

/** Soma das mensalidades dos alunos ativos (entrada prevista no mês). */
export function expectedStudentRevenue() {
  return students
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.monthlyValue, 0)
}

export function activeStudentsCount() {
  return students.filter((s) => s.active).length
}

export function totalExpenses() {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

export function paidExpensesTotal() {
  return expenses
    .filter((e) => e.status === 'pago')
    .reduce((sum, e) => sum + e.amount, 0)
}

export function pendingExpensesTotal() {
  return expenses
    .filter((e) => e.status === 'pendente')
    .reduce((sum, e) => sum + e.amount, 0)
}

export function expensesByCategory() {
  const map = new Map<ExpenseCategory, number>()
  for (const expense of expenses) {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount)
  }
  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      label: expenseCategoryLabel[category],
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function patchExpense(
  id: string,
  patch: Partial<Expense>,
): Expense | null {
  const index = expenses.findIndex((e) => e.id === id)
  if (index < 0) return null
  expenses[index] = { ...expenses[index], ...patch }
  if ('paidAt' in patch && patch.paidAt === undefined) {
    delete expenses[index].paidAt
  }
  if ('notes' in patch && patch.notes === undefined) {
    delete expenses[index].notes
  }
  return expenses[index]
}

export function setExpenseStatus(
  id: string,
  status: ExpenseStatus,
  paidAt?: string,
): Expense | null {
  if (status === 'pago') {
    return patchExpense(id, {
      status: 'pago',
      paidAt: paidAt ?? toIsoDate(new Date()),
    })
  }
  return patchExpense(id, { status: 'pendente', paidAt: undefined })
}

export function createExpense(input?: Partial<Expense>): Expense {
  const expense: Expense = {
    id: `exp-${Date.now()}`,
    name: input?.name?.trim() || 'Nova conta',
    category: input?.category ?? 'outros',
    amount: input?.amount ?? 0,
    dueDay: Math.min(28, Math.max(1, input?.dueDay ?? 1)),
    status: input?.status ?? 'pendente',
    recurring: input?.recurring ?? true,
    notes: input?.notes,
    paidAt: input?.status === 'pago' ? (input.paidAt ?? toIsoDate(new Date())) : undefined,
  }
  expenses.push(expense)
  return expense
}

export function removeExpense(id: string): boolean {
  const index = expenses.findIndex((e) => e.id === id)
  if (index < 0) return false
  expenses.splice(index, 1)
  return true
}

export function delinquentStudents(): Student[] {
  return students.filter(
    (s) => s.active && studentPaymentStatus(s) === 'atrasado',
  )
}

const shortMonthLabels = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const

/** Receita dos últimos N meses (pagamentos com paidAt no mês). */
export function revenueByMonth(monthsBack = 6, today = new Date()) {
  const points: { month: string; receita: number; key: string }[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    points.push({
      month: shortMonthLabels[d.getMonth()],
      receita: monthlyRevenue(year, month),
      key: `${year}-${String(month).padStart(2, '0')}`,
    })
  }
  return points
}

export function patchPayment(
  studentId: string,
  paymentId: string,
  patch: Partial<Payment>,
): Payment | null {
  const student = getStudent(studentId)
  if (!student) return null
  const payments = student.payments.map((p) => {
    if (p.id !== paymentId) return { ...p }
    const next: Payment = { ...p, ...patch }
    if ('method' in patch && patch.method === undefined) {
      delete next.method
    }
    if ('paidAt' in patch && patch.paidAt === undefined) {
      delete next.paidAt
    }
    return next
  })
  if (!payments.some((p) => p.id === paymentId)) return null
  const updated = patchStudent(studentId, { payments })
  return updated?.payments.find((p) => p.id === paymentId) ?? null
}

export function markPaymentPaid(
  studentId: string,
  paymentId: string,
  method?: PaymentMethod,
  paidAt?: string,
): Payment | null {
  return setPaymentStatus(studentId, paymentId, 'pago', method, paidAt)
}

/**
 * Status, forma e data de pagamento ficam sempre sincronizados:
 * - pago → exige forma + data
 * - pendente/atrasado → limpa forma e data
 */
export function setPaymentStatus(
  studentId: string,
  paymentId: string,
  status: PaymentStatus,
  method?: PaymentMethod,
  paidAt?: string,
): Payment | null {
  const student = getStudent(studentId)
  const payment = student?.payments.find((p) => p.id === paymentId)
  if (!student || !payment) return null

  if (status === 'pago') {
    return patchPayment(studentId, paymentId, {
      status: 'pago',
      paidAt: paidAt ?? payment.paidAt ?? toIsoDate(new Date()),
      method: method ?? payment.method ?? student.paymentMethod,
    })
  }

  return patchPayment(studentId, paymentId, {
    status,
    paidAt: undefined,
    method: undefined,
  })
}

/** Define a forma e confirma o pagamento (status → pago + data). */
export function setPaymentMethod(
  studentId: string,
  paymentId: string,
  method: PaymentMethod,
  paidAt?: string,
): Payment | null {
  const student = getStudent(studentId)
  const payment = student?.payments.find((p) => p.id === paymentId)
  return setPaymentStatus(
    studentId,
    paymentId,
    'pago',
    method,
    paidAt ?? payment?.paidAt,
  )
}

/**
 * Define a data de pagamento.
 * Com data → status pago + forma; sem data → volta para pendente.
 */
export function setPaymentPaidAt(
  studentId: string,
  paymentId: string,
  paidAt: string | null,
): Payment | null {
  if (!paidAt) {
    return setPaymentStatus(studentId, paymentId, 'pendente')
  }
  const student = getStudent(studentId)
  const payment = student?.payments.find((p) => p.id === paymentId)
  if (!student || !payment) return null
  return setPaymentStatus(
    studentId,
    paymentId,
    'pago',
    payment.method ?? student.paymentMethod,
    paidAt,
  )
}

/** Ajusta o status financeiro do aluno pela cobrança mais relevante. */
export function setStudentFinancialStatus(
  studentId: string,
  status: PaymentStatus,
): Student | null {
  const student = getStudent(studentId)
  if (!student || student.payments.length === 0) return null

  const sorted = [...student.payments].sort((a, b) =>
    b.dueDate.localeCompare(a.dueDate),
  )
  const target =
    sorted.find((p) => p.status !== 'pago') ?? sorted[0]

  setPaymentStatus(studentId, target.id, status)
  return getStudent(studentId) ?? null
}

export const paymentStatusOptions: {
  value: PaymentStatus
  label: string
}[] = [
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'atrasado', label: 'Atrasado' },
]

export const paymentMethods: PaymentMethod[] = [
  'PIX',
  'Cartão de crédito',
  'Boleto',
  'Dinheiro',
]

export function nextClass(student: Student): string {
  if (student.schedule.length === 0) return '—'
  const first = [...student.schedule].sort((a, b) =>
    (a.weekday + a.time).localeCompare(b.weekday + b.time),
  )[0]
  return `${first.weekday} · ${first.time}`
}

export function initials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function nextBirthday(birthDate: string) {
  const [, m, d] = birthDate.split('-').map(Number)
  const today = new Date()
  let year = today.getFullYear()
  const thisYear = new Date(year, m - 1, d)
  if (
    thisYear < new Date(today.getFullYear(), today.getMonth(), today.getDate())
  ) {
    year++
  }
  return new Date(year, m - 1, d)
}

export function daysUntilBirthday(birthDate: string) {
  const next = nextBirthday(birthDate)
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((next.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

// ------- Agenda -------

export type ClassSessionType = 'fixa' | 'avulsa' | 'reposicao' | 'experimental'

export type ClassSession = {
  id: string
  studentId: string
  date: string
  weekday: Weekday
  time: string
  status: AttendanceStatus
  type: ClassSessionType
  /** Nome do cliente em aula experimental (ainda sem cadastro completo). */
  guestName?: string
  professionalId?: string
  notes?: string
}

export const classSessionTypeLabel: Record<ClassSessionType, string> = {
  fixa: 'Fixa',
  avulsa: 'Avulsa',
  reposicao: 'Reposição',
  experimental: 'Experimental',
}

/** Nome exibido na grade: aluno cadastrado ou cliente experimental. */
export function sessionParticipantName(session: ClassSession) {
  if (session.guestName?.trim()) return session.guestName.trim()
  return getStudent(session.studentId)?.name ?? 'Cliente experimental'
}

const jsDayToWeekday: Record<number, Weekday | null> = {
  0: null,
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

const weekdayToJsDay: Record<Weekday, number> = {
  Segunda: 1,
  Terça: 2,
  Quarta: 3,
  Quinta: 4,
  Sexta: 5,
  Sábado: 6,
}

export function toIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseIsoDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getWeekdayFromDate(date: Date): Weekday | null {
  return jsDayToWeekday[date.getDay()]
}

/** Retorna a segunda-feira da semana (agenda não inclui domingo). */
export function getMonday(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function addDays(date: Date, days: number) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

export type WeekDayColumn = {
  date: Date
  iso: string
  weekday: Weekday
  dayNumber: number
  monthLabel: string
}

export function getWeekColumns(monday: Date): WeekDayColumn[] {
  return weekdays.map((weekday, index) => {
    const date = addDays(monday, index)
    return {
      date,
      iso: toIsoDate(date),
      weekday,
      dayNumber: date.getDate(),
      monthLabel: date.toLocaleDateString('pt-BR', { month: 'short' }),
    }
  })
}

export function formatWeekRange(monday: Date) {
  const sunday = addDays(monday, 5)
  const sameMonth = monday.getMonth() === sunday.getMonth()
  const start = monday.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: sameMonth ? undefined : 'short',
  })
  const end = sunday.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  return `${start} – ${end}`
}

function defaultStatusForGeneratedSession(): AttendanceStatus {
  // Sem registro explícito de presença, a aula fica agendada —
  // inclusive no passado (não inventar presença ao montar a grade).
  return 'agendada'
}

/** Gera as aulas da semana a partir da grade fixa dos alunos ativos. */
export function buildWeekSessions(monday: Date, today = new Date()): ClassSession[] {
  void today
  const columns = getWeekColumns(monday)
  const sessions: ClassSession[] = []

  for (const student of students) {
    if (!student.active || !student.hasActiveContract) continue
    if (student.schedule.length === 0) continue

    const weekCandidates: ClassSession[] = []
    for (const column of columns) {
      const daySlots = scheduleSlotsOnDate(student.schedule, column.iso)
      for (const slot of daySlots) {
        if (slot.weekday !== column.weekday) continue
        const allowed = availableSlotsForWeekday(slot.weekday)
        if (!allowed.includes(slot.time)) continue
        weekCandidates.push({
          id: `${student.id}-${column.iso}-${slot.time}`,
          studentId: student.id,
          date: column.iso,
          weekday: slot.weekday,
          time: slot.time,
          status: defaultStatusForGeneratedSession(),
          type: 'fixa',
        })
      }
    }

    weekCandidates.sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    )

    const weekLimit = planWeeklyLimit(student.planId)
    sessions.push(
      ...(weekLimit > 0
        ? weekCandidates.slice(0, weekLimit)
        : weekCandidates),
    )
  }

  return sessions.sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  )
}

/**
 * Remonta a semana: grade fixa dos alunos + aulas manuais (reposição/avulsa).
 * Aulas fixas são sempre recalculadas a partir do cadastro dos alunos,
 * preservando status já alterados na UI (presença, falta etc.).
 */
export function mergeWeekSessions(
  monday: Date,
  existing: ClassSession[] = [],
  today = new Date(),
): ClassSession[] {
  const columns = getWeekColumns(monday)
  const weekDates = new Set(columns.map((c) => c.iso))

  const fixed = buildWeekSessions(monday, today)
  const existingFixed = new Map(
    existing
      .filter((s) => s.type === 'fixa')
      .map((s) => [`${s.studentId}|${s.date}|${s.time}`, s]),
  )

  // Overrides persistidos no ledger (ex.: presença marcada no perfil do aluno)
  for (const record of attendanceLedger) {
    if (record.type !== 'fixa' || !weekDates.has(record.date)) continue
    existingFixed.set(`${record.studentId}|${record.date}|${record.time}`, record)
  }

  const mergedFixed = fixed.map((session) => {
    const prev = existingFixed.get(
      `${session.studentId}|${session.date}|${session.time}`,
    )
    if (!prev) return session
    return {
      ...session,
      status: prev.status,
      notes: prev.notes,
      professionalId: prev.professionalId,
    }
  })

  const fixedKeys = new Set(
    mergedFixed.map((s) => `${s.studentId}|${s.date}|${s.time}`),
  )

  const manualFromExisting = existing.filter(
    (s) =>
      s.type !== 'fixa' &&
      !fixedKeys.has(`${s.studentId}|${s.date}|${s.time}`),
  )
  const manualFromLedger = attendanceLedger.filter(
    (s) =>
      s.type !== 'fixa' &&
      weekDates.has(s.date) &&
      !fixedKeys.has(`${s.studentId}|${s.date}|${s.time}`) &&
      !manualFromExisting.some((m) => m.id === s.id),
  )

  return [...mergedFixed, ...manualFromExisting, ...manualFromLedger].sort(
    (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  )
}

export function countActiveInSlot(
  sessions: ClassSession[],
  date: string,
  time: string,
) {
  return sessions.filter(
    (s) =>
      s.date === date &&
      s.time === time &&
      s.status !== 'cancelada',
  ).length
}

export function isSlotFull(
  sessions: ClassSession[],
  date: string,
  time: string,
) {
  return countActiveInSlot(sessions, date, time) >= SLOT_CAPACITY
}

export function weekdayJsDay(weekday: Weekday) {
  return weekdayToJsDay[weekday]
}

/**
 * Aulas do dia a partir da mesma grade da Agenda:
 * horários fixos dos alunos + reposições/avulsas do ledger.
 */
export function getDaySessions(date = new Date()): ClassSession[] {
  const weekday = getWeekdayFromDate(date)
  if (!weekday) return []

  const monday = getMonday(date)
  const iso = toIsoDate(date)
  return mergeWeekSessions(monday, [], date)
    .filter((s) => s.date === iso && s.status !== 'cancelada')
    .sort(
      (a, b) =>
        a.time.localeCompare(b.time) ||
        a.studentId.localeCompare(b.studentId),
    )
}

/**
 * Última evolução de cada aluno da grade do dia, na ordem da agenda.
 * Um aluno com mais de uma aula no dia aparece uma vez (primeiro horário).
 */
export function getDayLatestEvolutions(date = new Date()) {
  const sessions = getDaySessions(date)
  const seen = new Set<string>()
  const rows: {
    student: Student
    evolution: Evolution | null
    time: string
    session: ClassSession
  }[] = []

  for (const session of sessions) {
    if (seen.has(session.studentId)) continue
    seen.add(session.studentId)
    const student = getStudent(session.studentId)
    if (!student) continue
    const evolution =
      student.evolutions
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
    rows.push({ student, evolution, time: session.time, session })
  }

  return rows
}

/** Aulas experimentais do dia (clientes em teste / sem plano). */
export function getDayExperimentalSessions(date = new Date()) {
  return getDaySessions(date).filter((s) => s.type === 'experimental')
}

export function formatWeekdayLabel(weekday: Weekday) {
  return weekday === 'Sábado' ? 'Sábado' : `${weekday}-feira`
}

// ------- Presença / frequência do aluno -------

/** Ledger compartilhado: overrides de status + reposições/avulsas/experimentais. */
const attendanceLedger: ClassSession[] = []

function seedDemoExperimentalSession() {
  const today = new Date()
  const weekday = getWeekdayFromDate(today)
  if (!weekday) return
  const slots = availableSlotsForWeekday(weekday)
  const time = slots.includes('09:00')
    ? '09:00'
    : slots.includes('10:00')
      ? '10:00'
      : slots[0]
  if (!time) return
  attendanceLedger.push({
    id: 'exp-demo-1',
    studentId: 'guest-exp-demo',
    guestName: 'Juliana Mendes',
    date: toIsoDate(today),
    weekday,
    time,
    status: 'agendada',
    type: 'experimental',
    notes: 'Aula experimental — indicação de amiga',
    professionalId: professionals[0]?.id,
  })
}

seedDemoExperimentalSession()

function remapAttendanceLedgerTimes(oldTime: string, newTime: string) {
  for (const session of attendanceLedger) {
    if (session.time === oldTime) session.time = newTime
  }
}

export function upsertAttendanceSession(session: ClassSession) {
  const index = attendanceLedger.findIndex((s) => s.id === session.id)
  if (index >= 0) {
    attendanceLedger[index] = session
  } else {
    const bySlot = attendanceLedger.findIndex(
      (s) =>
        s.studentId === session.studentId &&
        s.date === session.date &&
        s.time === session.time &&
        s.type === session.type,
    )
    if (bySlot >= 0) {
      attendanceLedger[bySlot] = session
    } else {
      if (
        session.status !== 'cancelada' &&
        !isWithinStudioHours(session.weekday, session.time)
      ) {
        throw new Error('Estúdio fechado neste dia ou horário')
      }
      attendanceLedger.push(session)
    }
  }
  return session
}

export function setAttendanceStatus(
  session: ClassSession,
  status: AttendanceStatus,
) {
  return upsertAttendanceSession({ ...session, status })
}

export function removeAttendanceSession(id: string) {
  const index = attendanceLedger.findIndex((s) => s.id === id)
  if (index < 0) return false
  attendanceLedger.splice(index, 1)
  return true
}

/** Experimentais da semana (ledger + lista da grade). */
export function getWeekExperimentalSessions(
  monday: Date,
  existing: ClassSession[] = [],
  today = new Date(),
) {
  return mergeWeekSessions(monday, existing, today).filter(
    (s) => s.type === 'experimental',
  )
}

export function getStudentAttendanceHistory(
  studentId: string,
  weeksBackOrOptions: number | StudentAttendanceHistoryOptions = 8,
  todayArg = new Date(),
): ClassSession[] {
  const options: StudentAttendanceHistoryOptions =
    typeof weeksBackOrOptions === 'number'
      ? { weeksBack: weeksBackOrOptions }
      : weeksBackOrOptions
  const today = options.today ?? todayArg
  const todayIso = toIsoDate(today)

  const mockStudent = getStudent(studentId)
  // Agenda explícita vazia = não gerar histórico a partir do mock.
  const schedule =
    options.schedule !== undefined
      ? options.schedule
      : (mockStudent?.schedule ?? [])
  const planId = options.planId ?? mockStudent?.planId
  const weeklyLimit = options.weeklyLimit

  let fromIso = options.fromDate
  let toIso = options.toDate

  if (!fromIso || !toIso) {
    const weeksBack = options.weeksBack ?? 8
    const monday = getMonday(today)
    const oldest = addDays(monday, -7 * (weeksBack - 1))
    fromIso = fromIso ?? toIsoDate(oldest)
    toIso = toIso ?? todayIso
  }

  // Não gera aulas antes do início nem depois do fim do período informado.
  if (fromIso > toIso) {
    return []
  }

  // Grade atual precisa ter a frequência do plano para liberar o histórico.
  if (schedule.length === 0) {
    return []
  }
  const activeSlots = currentScheduleSlots(schedule)
  if (weeklyLimit != null && activeSlots.length < weeklyLimit) {
    return []
  }
  if (weeklyLimit == null && activeSlots.length === 0) {
    return []
  }

  const generated = buildFixedSessionsForSchedule({
    studentId,
    schedule,
    planId,
    weeklyLimit,
    fromDate: fromIso,
    toDate: toIso,
    today,
  })

  const byKey = new Map<string, ClassSession>(
    generated.map((s) => [`${s.studentId}|${s.date}|${s.time}`, s]),
  )

  // Extras do banco primeiro; o ledger local sobrescreve (ações de presença).
  for (const record of options.extraSessions ?? []) {
    if (record.studentId !== studentId) continue
    // Histórico do contrato atual: ignora aulas/reposições fora da vigência.
    if (record.date < fromIso || record.date > toIso) continue
    if (record.type === 'fixa') {
      const key = `${record.studentId}|${record.date}|${record.time}`
      if (byKey.has(key)) {
        const base = byKey.get(key)!
        byKey.set(key, {
          ...base,
          id: record.id,
          status: record.status,
          notes: record.notes,
          professionalId: record.professionalId,
        })
      } else {
        byKey.set(key, record)
      }
      continue
    }
    // Reposição/avulsa nunca substitui aula fixa — chave própria.
    const key = `${record.studentId}|${record.type}|${record.id}|${record.date}|${record.time}`
    byKey.set(key, record)
  }

  for (const record of attendanceLedger) {
    if (record.studentId !== studentId) continue
    if (record.date < fromIso || record.date > toIso) continue
    if (record.type === 'fixa') {
      const key = `${record.studentId}|${record.date}|${record.time}`
      if (byKey.has(key)) {
        const base = byKey.get(key)!
        byKey.set(key, {
          ...base,
          status: record.status,
          notes: record.notes,
          professionalId: record.professionalId,
        })
      } else {
        byKey.set(key, record)
      }
      continue
    }
    const key = `${record.studentId}|${record.type}|${record.id}|${record.date}|${record.time}`
    byKey.set(key, record)
  }

  return [...byKey.values()].sort((a, b) =>
    `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
  )
}

export type StudentAttendanceHistoryOptions = {
  weeksBack?: number
  schedule?: ScheduleSlot[]
  planId?: string
  /** Limite semanal explícito (evita depender do store mock de planos). */
  weeklyLimit?: number
  /** Início do histórico (ex.: data de início do contrato). */
  fromDate?: string
  /** Fim do histórico para aulas fixas (ex.: fim do contrato ou hoje). */
  toDate?: string
  /** Sessões extras (ex.: reposições persistidas no banco). */
  extraSessions?: ClassSession[]
  today?: Date
}

/** Gera aulas fixas de um aluno entre duas datas, a partir da agenda semanal. */
export function buildFixedSessionsForSchedule(input: {
  studentId: string
  schedule: ScheduleSlot[]
  planId?: string
  /** Preferir ao planId quando a frequência real do contrato/plano for conhecida. */
  weeklyLimit?: number
  fromDate: string
  toDate: string
  today?: Date
}): ClassSession[] {
  const from = parseIsoDate(input.fromDate)
  const to = parseIsoDate(input.toDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return []
  }

  const weekLimit =
    input.weeklyLimit != null
      ? Math.max(0, input.weeklyLimit)
      : input.planId
        ? planWeeklyLimit(input.planId)
        : null

  const sessions: ClassSession[] = []
  let cursor = getMonday(from)
  const lastMonday = getMonday(to)

  while (cursor <= lastMonday) {
    const columns = getWeekColumns(cursor)
    const weekCandidates: ClassSession[] = []

    for (const column of columns) {
      if (column.iso < input.fromDate || column.iso > input.toDate) continue
      const daySlots = scheduleSlotsOnDate(input.schedule, column.iso)
      for (const slot of daySlots) {
        if (slot.weekday !== column.weekday) continue
        const allowed = availableSlotsForWeekday(slot.weekday)
        if (!allowed.includes(slot.time)) continue
        weekCandidates.push({
          id: `${input.studentId}-${column.iso}-${slot.time}`,
          studentId: input.studentId,
          date: column.iso,
          weekday: slot.weekday,
          time: slot.time,
          status: defaultStatusForGeneratedSession(),
          type: 'fixa',
        })
      }
    }

    weekCandidates.sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    )

    // Na semana da troca de grade, não ultrapassa a frequência do contrato:
    // aulas já geradas pela grade antiga (ex.: Seg+Qua) contam; a nova grade
    // (ex.: Qua+Sex) só entra nos dias restantes se ainda houver saldo na semana.
    const weekSessions =
      weekLimit == null
        ? weekCandidates
        : weekCandidates.slice(0, weekLimit)

    sessions.push(...weekSessions)
    cursor = addDays(cursor, 7)
  }

  return sessions.sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  )
}

export function getAttendanceStats(sessions: ClassSession[], today = new Date()) {
  const todayIso = toIsoDate(today)
  const past = sessions.filter(
    (s) => s.date <= todayIso && s.status !== 'cancelada',
  )
  // Só presença confirmada conta — inclusive em aulas de reposição.
  const presentes = past.filter((s) => s.status === 'presente').length
  const faltas = past.filter((s) => s.status === 'falta').length
  const reposicoes = sessions.filter((s) => s.type === 'reposicao').length
  const agendadas = sessions.filter((s) => s.status === 'agendada').length
  const total = past.length
  const rate = total === 0 ? 0 : Math.round((presentes / total) * 100)

  return {
    total,
    presentes,
    faltas,
    reposicoes,
    agendadas,
    rate,
  }
}

const weekdayChartLabel: Record<Weekday, string> = {
  Segunda: 'Seg',
  Terça: 'Ter',
  Quarta: 'Qua',
  Quinta: 'Qui',
  Sexta: 'Sex',
  Sábado: 'Sáb',
}

/** Presenças e faltas por dia, a partir da grade real da semana. */
export function buildWeeklyAttendanceChart(
  monday: Date,
  existing: ClassSession[] = [],
  today = new Date(),
) {
  const sessions = mergeWeekSessions(monday, existing, today)
  return getWeekColumns(monday).map((column) => {
    const daySessions = sessions.filter(
      (s) => s.date === column.iso && s.status !== 'cancelada',
    )
    return {
      day: weekdayChartLabel[column.weekday],
      date: column.iso,
      weekday: column.weekday,
      presencas: daySessions.filter((s) => s.status === 'presente').length,
      faltas: daySessions.filter((s) => s.status === 'falta').length,
    }
  })
}

/**
 * Reposições permitidas = aulas fixas com falta/cancelamento − reposições efetivas.
 * Reposição com falta/cancelamento não consome crédito e pode ser reagendada.
 * Opcionalmente limitado à vigência do contrato atual.
 */
export function getMakeupAllowance(
  sessions: ClassSession[],
  range?: { fromDate?: string; toDate?: string | null },
) {
  const inContract = (s: ClassSession) => {
    if (range?.fromDate && s.date < range.fromDate) return false
    if (range?.toDate && s.date > range.toDate) return false
    return true
  }
  const scoped = sessions.filter(inContract)
  const missedSessions = scoped
    .filter(
      (s) =>
        s.type === 'fixa' &&
        (s.status === 'falta' || s.status === 'cancelada'),
    )
    .slice()
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  /** Reposições que ainda precisam de nova data (falta/cancelamento). */
  const failedMakeups = scoped
    .filter(
      (s) =>
        s.type === 'reposicao' &&
        (s.status === 'falta' || s.status === 'cancelada'),
    )
    .slice()
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  /** Só reposições agendadas ou com presença contam como crédito usado. */
  const usedSessions = scoped
    .filter(
      (s) =>
        s.type === 'reposicao' &&
        (s.status === 'agendada' || s.status === 'presente'),
    )
    .slice()
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const missed = missedSessions.length
  const used = usedSessions.length
  const remaining = Math.max(0, missed - used)
  // FIFO: as primeiras faltas/cancelamentos são cobertas pelas reposições efetivas.
  const pendingMissed = missedSessions.slice(used)
  const coveredMissed = missedSessions.slice(0, used)
  const makeupByMissedId: Record<string, ClassSession> = {}
  coveredMissed.forEach((missed, index) => {
    const makeup = usedSessions[index]
    if (makeup) makeupByMissedId[missed.id] = makeup
  })

  return {
    missed,
    used,
    remaining,
    pendingMissed,
    coveredMissed,
    failedMakeups,
    makeups: usedSessions,
    makeupByMissedId,
  }
}

export function createMakeupSession(input: {
  studentId: string
  date: string
  time: string
  notes?: string
  professionalId?: string
}): ClassSession | null {
  const weekday = getWeekdayFromDate(parseIsoDate(input.date))
  if (!weekday) return null
  if (!availableSlotsForWeekday(weekday).includes(input.time)) return null

  return upsertAttendanceSession({
    id: `reposicao-${input.studentId}-${input.date}-${input.time}-${Date.now()}`,
    studentId: input.studentId,
    date: input.date,
    weekday,
    time: input.time,
    status: 'agendada',
    type: 'reposicao',
    notes: input.notes,
    professionalId: input.professionalId,
  })
}
