export type ServiceCategory =
  | 'pilates'
  | 'fisioterapia'
  | 'massoterapia'
  | 'auriculoterapia'
  | 'avaliacao'
  | 'experimental'
  | 'outro'

export type ClinicalAttendanceStatus =
  | 'agendada'
  | 'realizada'
  | 'falta'
  | 'cancelada'

export type StudioService = {
  id: string
  name: string
  category: ServiceCategory
  durationMinutes: number
  price: number
  professionalId?: string
  requiresInitialAssessment: boolean
  requiresEvolution: boolean
  active: boolean
}

export type ClinicalAttendance = {
  id: string
  studentId: string
  studentName?: string
  serviceId: string
  serviceName?: string
  serviceCategory?: ServiceCategory
  professionalId: string
  date: string
  weekday:
    | 'Segunda'
    | 'Terça'
    | 'Quarta'
    | 'Quinta'
    | 'Sexta'
    | 'Sábado'
  time: string
  durationMinutes: number
  status: ClinicalAttendanceStatus
  notes?: string
}

export type InventoryProduct = {
  id: string
  name: string
  category: string
  lot: string
  expiresAt?: string | null
  quantity: number
  minQuantity: number
  supplier: string
}

export const serviceCategoryLabel: Record<ServiceCategory, string> = {
  pilates: 'Pilates',
  fisioterapia: 'Fisioterapia',
  massoterapia: 'Massoterapia',
  auriculoterapia: 'Auriculoterapia',
  avaliacao: 'Avaliação',
  experimental: 'Experimental',
  outro: 'Outro',
}

export const clinicalAttendanceStatusLabel: Record<
  ClinicalAttendanceStatus,
  string
> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  falta: 'Falta',
  cancelada: 'Cancelada',
}
