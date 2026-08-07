'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  History,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  HeartPulse,
  Plus,
  Ruler,
  Trash2,
  User,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'

import { InlineField } from '@/components/students/inline-field'
import { DeleteStudentDialog } from '@/components/students/delete-student-dialog'
import { ClinicalHistoryPanel } from '@/components/students/clinical-history-panel'
import { PersonalDataPanel } from '@/components/students/personal-data-panel'
import { StudentHistoryPanel } from '@/components/students/student-history-panel'
import { StudentAttendancePanel } from '@/components/students/student-attendance'
import { StudentContractsPanel } from '@/components/students/student-contracts'
import { StudentFixedScheduleCard } from '@/components/students/student-fixed-schedule-card'
import { PageHeader } from '@/components/page-header'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActiveBadge, PaymentStatusSelect } from '@/components/status-badges'
import {
  type Contract,
  type Evolution,
  type Payment,
  type PaymentMethod,
  type PhysicalAssessment,
  type ScheduleSlot,
  type Student,
  age,
  bmi,
  bmiLabel,
  contractEndDateForPeriod,
  formatCurrency,
  formatShortDate,
  patchStudent,
  upsertStudentInStore,
  paymentMethods,
  planPeriodLabel,
  planPeriodMonths,
  contractTotalClasses,
  replaceScheduleSlots,
  replaceStudioHours,
  studentChargedValue,
  studentPaymentStatus,
  type PaymentStatus,
  type Plan,
  type Professional,
} from '@/lib/data'
import {
  createAssessment as createAssessmentApi,
  deleteAssessment as deleteAssessmentApi,
  updateAssessment as updateAssessmentApi,
} from '@/lib/assessments-api'
import {
  createEvolution as createEvolutionApi,
  deleteEvolution as deleteEvolutionApi,
  updateEvolution as updateEvolutionApi,
} from '@/lib/evolutions-api'
import { updatePayment } from '@/lib/payments-api'
import { fetchPlans, fetchProfessionals, fetchStudioHours, fetchTimeSlots } from '@/lib/settings-api'
import { fetchStudentContracts } from '@/lib/contracts-api'
import { fetchClinicalAttendances } from '@/lib/clinical-attendances-api'
import { fetchStudent, updateStudent } from '@/lib/students-api'
import type { UpdateStudentInput } from '@/lib/validations/student'
import {
  studentActiveSpecialtyLabel,
  studentHealthHighlights,
} from '@/lib/student-header-summary'
import {
  assessmentTypes,
  type AssessmentType,
} from '@/lib/validations/assessment'
import { fetchServices } from '@/lib/services-api'
import type { ServiceCategory, StudioService } from '@/lib/clinic-types'
import {
  EVOLUTION_ADVERSE_EVENTS,
  EVOLUTION_ASSESSMENTS,
  EVOLUTION_COMPLAINTS,
  EVOLUTION_NEXT_PLANS,
  EVOLUTION_ORIENTATIONS,
  EVOLUTION_RESPONSES,
  currentTimeHHMM,
  emptyConductPack,
  evolutionComplaintPreview,
  mergeDuplicatedConduct,
  parseClinicalField,
  parseConduct,
  parseExercises,
  parseSelectField,
  previousEvolution,
  serializeClinicalField,
  serializeConduct,
  serializeExercises,
  serializeSelectField,
  sessionNumberFor,
  type EvolutionConductPack,
  type EvolutionProcedureItem,
} from '@/lib/evolution-record'

const measureLabels: { key: string; label: string }[] = [
  { key: 'armRight', label: 'Braço direito' },
  { key: 'armLeft', label: 'Braço esquerdo' },
  { key: 'chest', label: 'Peitoral' },
  { key: 'waist', label: 'Cintura' },
  { key: 'abdomen', label: 'Abdômen' },
  { key: 'hip', label: 'Quadril' },
  { key: 'thighRight', label: 'Coxa direita' },
  { key: 'thighLeft', label: 'Coxa esquerda' },
  { key: 'calfRight', label: 'Panturrilha direita' },
  { key: 'calfLeft', label: 'Panturrilha esquerda' },
]

const paymentOptions = [
  { value: 'PIX', label: 'PIX' },
  { value: 'Cartão de crédito', label: 'Cartão de crédito' },
  { value: 'Boleto', label: 'Boleto' },
  { value: 'Dinheiro', label: 'Dinheiro' },
]

export function StudentProfile({
  student: initial,
  initialTab = 'dados',
}: {
  student: Student
  initialTab?: string
}) {
  const router = useRouter()
  const [student, setStudent] = useState(initial)
  const [plans, setPlans] = useState<Plan[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [clinicCategories, setClinicCategories] = useState<ServiceCategory[]>(
    [],
  )
  const [assessmentIndex, setAssessmentIndex] = useState(0)
  const [evolutionIndex, setEvolutionIndex] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    upsertStudentInStore(initial)
  }, [initial])

  useEffect(() => {
    upsertStudentInStore(student)
  }, [student])

  useEffect(() => {
    void fetchPlans()
      .then(setPlans)
      .catch(() => {
        toast.error('Não foi possível carregar os planos')
      })
    void Promise.all([fetchTimeSlots(), fetchStudioHours()])
      .then(([slots, hours]) => {
        replaceScheduleSlots(slots)
        replaceStudioHours(hours)
      })
      .catch(() => {
        /* agenda fixa usa grade/horários padrão se a API falhar */
      })
  }, [])

  function refreshStudentFromApi() {
    void fetchStudent(student.id)
      .then((updated) => {
        setStudent(updated)
        patchStudent(student.id, updated) || upsertStudentInStore(updated)
      })
      .catch(() => {
        /* mantém estado local se a API falhar */
      })
  }

  function loadContracts() {
    void fetchStudentContracts(student.id)
      .then((list) => {
        setContracts(list)
        // Após listar contratos, recarrega o aluno se houver contrato assinado.
        if (list.some((c) => c.status === 'ativo')) {
          refreshStudentFromApi()
        }
      })
      .catch(() => {
        /* vigência/agenda usam plano do cadastro se a API falhar */
      })
  }

  useEffect(() => {
    loadContracts()
  }, [student.id])

  useEffect(() => {
    let cancelled = false
    void fetchClinicalAttendances({ studentId: student.id })
      .then((list) => {
        if (cancelled) return
        const categories = [
          ...new Set(
            list
              .filter((a) => a.status !== 'cancelada')
              .map((a) => a.serviceCategory)
              .filter((c): c is ServiceCategory => Boolean(c)),
          ),
        ]
        setClinicCategories(categories)
      })
      .catch(() => {
        if (!cancelled) setClinicCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [student.id])

  const planById = useMemo(
    () => new Map(plans.map((p) => [p.id, p])),
    [plans],
  )
  const getPlan = (id: string) => planById.get(id)
  const planName = (id: string) => getPlan(id)?.name ?? '—'
  const planOptions = plans.map((p) => ({
    value: p.id,
    label: `${planPeriodLabel[p.period]} · ${p.frequencyLabel} — ${formatCurrency(p.price)}`,
  }))

  /** Contrato assinado (ativo) — sem ele, financeiro e agenda ficam vazios. */
  const governingContract = useMemo(
    () => contracts.find((c) => c.status === 'ativo') ?? null,
    [contracts],
  )
  const hasSignedContract = Boolean(governingContract)

  const effectivePlanId = governingContract?.planId ?? ''
  const effectivePlan = effectivePlanId ? getPlan(effectivePlanId) : undefined
  const effectiveWeeklyLimit = effectivePlan?.frequency ?? null
  const effectiveMonthlyValue = governingContract?.monthlyValue
  const effectiveDiscountPercent = governingContract?.discountPercent
  const effectiveDueDay = governingContract?.dueDay
  const effectivePaymentMethod = governingContract?.paymentMethod
  const contractSourceLabel = governingContract ? 'contrato ativo' : null

  const planVigencia = useMemo(() => {
    if (!governingContract) return null
    return {
      startDate: governingContract.startDate,
      endDate: governingContract.endDate,
    }
  }, [governingContract])

  const planVigenciaHint = useMemo(() => {
    if (!governingContract) return null
    const plan = plans.find((p) => p.id === governingContract.planId)
    if (!plan) return null
    const months = planPeriodMonths(plan.period)
    const total = contractTotalClasses({
      startDate: governingContract.startDate,
      endDate: governingContract.endDate,
      frequency: plan.frequency,
    })
    return `${months} ${months === 1 ? 'mês' : 'meses'} · ${total} aulas`
  }, [governingContract, plans])

  const sortedAssessments = useMemo(
    () =>
      student.assessments
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
    [student.assessments],
  )

  const sortedEvolutions = useMemo(
    () =>
      student.evolutions.slice().sort((a, b) => {
        const byDate = b.date.localeCompare(a.date)
        if (byDate !== 0) return byDate
        return b.id.localeCompare(a.id)
      }),
    [student.evolutions],
  )

  useEffect(() => {
    if (assessmentIndex > sortedAssessments.length - 1) {
      setAssessmentIndex(Math.max(0, sortedAssessments.length - 1))
    }
  }, [sortedAssessments.length, assessmentIndex])

  useEffect(() => {
    if (evolutionIndex > sortedEvolutions.length - 1) {
      setEvolutionIndex(Math.max(0, sortedEvolutions.length - 1))
    }
  }, [sortedEvolutions.length, evolutionIndex])

  async function persistProfile(patch: UpdateStudentInput) {
    try {
      const updated = await updateStudent(student.id, patch)
      setStudent(updated)
      // Mantém o mock em memória sincronizado para módulos ainda não migrados
      patchStudent(student.id, updated) || upsertStudentInStore(updated)
      return updated
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar as alterações',
      )
      return null
    }
  }

  function updateField<K extends keyof Student>(key: K, value: Student[K]) {
    setStudent((prev) => ({ ...prev, [key]: value }))
    void persistProfile({ [key]: value } as UpdateStudentInput)
  }

  function syncStudent(patch: Partial<Student>) {
    setStudent((prev) => ({ ...prev, ...patch }))
    const apiPatch: UpdateStudentInput = {}
    const keys: (keyof UpdateStudentInput)[] = [
      'name',
      'birthDate',
      'sex',
      'cpf',
      'phone',
      'email',
      'cep',
      'street',
      'addressNumber',
      'neighborhood',
      'city',
      'state',
      'address',
      'emergencyName',
      'emergencyRelation',
      'emergencyPhone',
      'emergencyContact',
      'since',
      'objective',
      'pathologies',
      'injuries',
      'surgeries',
      'restrictions',
      'medications',
      'allergies',
      'implants',
      'clinicalAlerts',
      'physicalActivity',
      'smoking',
      'alcoholUse',
      'hydration',
      'workPosture',
      'workHours',
      'sleepHours',
      'sleepQuality',
      'insomnia',
      'previousTreatments',
      'previousTreatmentFrequency',
      'treatmentResults',
      'treatmentInterruptions',
      'treatmentResponse',
      'dischargeReason',
      'exams',
      'medicalReports',
      'mriExams',
      'xrayExams',
      'notes',
      'profession',
      'planId',
      'monthlyValue',
      'discountPercent',
      'dueDay',
      'paymentMethod',
      'schedule',
    ]
    for (const key of keys) {
      if (key in patch) {
        ;(apiPatch as Record<string, unknown>)[key] = patch[key as keyof Student]
      }
    }
    if (Object.keys(apiPatch).length > 0) {
      void persistProfile(apiPatch)
    }
  }

  function syncPaymentInState(updated: Payment) {
    setStudent((prev) => ({
      ...prev,
      payments: prev.payments.map((p) =>
        p.id === updated.id ? updated : p,
      ),
    }))
  }

  async function updateEvolution(id: string, patch: Partial<Evolution>) {
    const previous = student.evolutions.find((e) => e.id === id)
    setStudent((prev) => ({
      ...prev,
      evolutions: prev.evolutions.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    }))
    try {
      const updated = await updateEvolutionApi(student.id, id, patch)
      setStudent((prev) => ({
        ...prev,
        evolutions: prev.evolutions.map((e) =>
          e.id === updated.id ? updated : e,
        ),
      }))
    } catch (error) {
      if (previous) {
        setStudent((prev) => ({
          ...prev,
          evolutions: prev.evolutions.map((e) =>
            e.id === id ? previous : e,
          ),
        }))
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a evolução',
      )
    }
  }

  async function addEvolution() {
    if (!hasSignedContract) {
      toast.error('Contrato ativo necessário', {
        description: 'Assine um contrato ativo antes de registrar evoluções.',
      })
      return
    }
    try {
      const activeSpecialty = studentActiveSpecialtyLabel({
        hasActivePilatesContract: hasSignedContract,
        clinicCategories,
      })
      const defaultSpecialty =
        activeSpecialty !== 'Sem especialidade ativa'
          ? activeSpecialty.split(' · ')[0] ?? ''
          : ''
      const created = await createEvolutionApi(student.id, {
        conduct: serializeConduct(
          emptyConductPack({
            time: currentTimeHHMM(),
            specialty: defaultSpecialty,
            adverseEvent: 'Nenhuma',
          }),
        ),
      })
      setStudent((prev) => ({
        ...prev,
        evolutions: [created, ...prev.evolutions],
      }))
      setEvolutionIndex(0)
      toast.success('Nova evolução adicionada', {
        description: 'Preencha a queixa do dia e os demais blocos clínicos.',
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível adicionar a evolução',
      )
    }
  }

  async function removeEvolution(id: string) {
    const previous = student.evolutions
    setStudent((prev) => ({
      ...prev,
      evolutions: prev.evolutions.filter((e) => e.id !== id),
    }))
    setEvolutionIndex(0)
    try {
      await deleteEvolutionApi(student.id, id)
      toast.success('Evolução removida')
    } catch (error) {
      setStudent((prev) => ({ ...prev, evolutions: previous }))
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível remover a evolução',
      )
    }
  }

  async function updateAssessment(
    id: string,
    patch: Partial<Omit<PhysicalAssessment, 'measures'>> & {
      measures?: Partial<PhysicalAssessment['measures']>
    },
  ) {
    const previous = student.assessments.find((a) => a.id === id)
    setStudent((prev) => ({
      ...prev,
      assessments: prev.assessments.map((a) =>
        a.id === id
          ? {
              ...a,
              ...patch,
              measures: patch.measures
                ? { ...a.measures, ...patch.measures }
                : a.measures,
            }
          : a,
      ),
    }))
    try {
      const updated = await updateAssessmentApi(student.id, id, patch)
      setStudent((prev) => ({
        ...prev,
        assessments: prev.assessments.map((a) =>
          a.id === updated.id ? updated : a,
        ),
      }))
    } catch (error) {
      if (previous) {
        setStudent((prev) => ({
          ...prev,
          assessments: prev.assessments.map((a) =>
            a.id === id ? previous : a,
          ),
        }))
      }
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a avaliação',
      )
    }
  }

  async function addAssessment() {
    if (!hasSignedContract) {
      toast.error('Contrato ativo necessário', {
        description: 'Assine um contrato ativo antes de registrar avaliações.',
      })
      return
    }
    try {
      const hasInicial = student.assessments.some(
        (a) => (a.assessmentType ?? 'Inicial') === 'Inicial',
      )
      const created = await createAssessmentApi(student.id, {
        assessmentType: hasInicial ? 'Reavaliação' : 'Inicial',
      })
      setStudent((prev) => ({
        ...prev,
        assessments: [created, ...prev.assessments],
      }))
      setAssessmentIndex(0)
      toast.success('Nova avaliação adicionada', {
        description: 'Preencha a queixa principal e os demais blocos clínicos.',
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível adicionar a avaliação',
      )
    }
  }

  async function removeAssessment(id: string) {
    const previous = student.assessments
    setStudent((prev) => ({
      ...prev,
      assessments: prev.assessments.filter((a) => a.id !== id),
    }))
    setAssessmentIndex(0)
    try {
      await deleteAssessmentApi(student.id, id)
      toast.success('Avaliação removida')
    } catch (error) {
      setStudent((prev) => ({ ...prev, assessments: previous }))
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível remover a avaliação',
      )
    }
  }

  async function registerSchedulePeriod(
    slots: ScheduleSlot[],
    effectiveFrom: string,
  ) {
    const updated = await persistProfile({
      schedule: slots.map((s) => ({
        weekday: s.weekday,
        time: s.time,
      })),
      scheduleEffectiveFrom: effectiveFrom,
    })
    return Boolean(updated)
  }

  async function deleteSchedulePeriod(
    effectiveFrom: string,
    effectiveTo: string | null,
  ) {
    const updated = await persistProfile({
      deleteSchedulePeriod: {
        effectiveFrom,
        effectiveTo,
      },
    })
    return Boolean(updated)
  }

  const currentAssessment = sortedAssessments[assessmentIndex]
  const currentEvolution = sortedEvolutions[evolutionIndex]

  const healthHighlights = useMemo(
    () => studentHealthHighlights(student),
    [student.clinicalAlerts],
  )

  const specialtyLabel = studentActiveSpecialtyLabel({
    hasActivePilatesContract: hasSignedContract,
    clinicCategories,
  })

  const headerMetaParts = [
    `${age(student.birthDate)} anos`,
    student.profession?.trim() || null,
    specialtyLabel,
  ].filter(Boolean) as string[]

  return (
    <>
      <PageHeader
        title={student.name}
        description={
          <div className="flex flex-col gap-1.5">
            <p className="truncate">{headerMetaParts.join(' · ')}</p>
            {healthHighlights.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {healthHighlights.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="max-w-full truncate border-transparent bg-chart-3/20 font-normal text-chart-3"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        }
      >
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 data-icon="inline-start" />
          Excluir
        </Button>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/alunos" />}
        >
          Voltar
        </Button>
      </PageHeader>

      <DeleteStudentDialog
        open={deleteOpen}
        studentId={student.id}
        studentName={student.name}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push('/alunos')}
      />

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
            if (value === 'agenda' || value === 'financeiro') {
              loadContracts()
            }
          }}
          className="gap-4"
        >
          <div className="overflow-x-auto overflow-y-hidden pb-1">
            <TabsList variant="line" className="w-max">
              <TabsTrigger value="dados">
                <User data-icon="inline-start" />
                Dados pessoais
              </TabsTrigger>
              <TabsTrigger value="clinico">
                <HeartPulse data-icon="inline-start" />
                Histórico clínico
              </TabsTrigger>
              <TabsTrigger value="avaliacoes">
                <Ruler data-icon="inline-start" />
                Avaliações
              </TabsTrigger>
              <TabsTrigger value="evolucao">
                <ClipboardList data-icon="inline-start" />
                Evolução
              </TabsTrigger>
              <TabsTrigger value="financeiro">
                <Wallet data-icon="inline-start" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="contratos">
                <FileText data-icon="inline-start" />
                Contratos
              </TabsTrigger>
              <TabsTrigger value="agenda">
                <CalendarClock data-icon="inline-start" />
                Agenda
              </TabsTrigger>
              <TabsTrigger value="historico">
                <History data-icon="inline-start" />
                Histórico
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dados">
            <PersonalDataPanel
              student={student}
              hasSignedContract={hasSignedContract}
              onUpdateNotes={(notes) => updateField('notes', notes)}
              onSave={async (patch) => {
                const updated = await persistProfile(patch)
                if (!updated) {
                  throw new Error('Não foi possível salvar os dados')
                }
                return updated
              }}
            />
          </TabsContent>

          <TabsContent value="clinico">
            <ClinicalHistoryPanel
              student={student}
              onUpdateField={updateField}
            />
          </TabsContent>

          <TabsContent value="avaliacoes" className="flex flex-col gap-4">
            {student.assessments.length === 0 ? (
              <EmptyState
                icon={<Ruler className="size-6" />}
                title="Nenhuma avaliação registrada"
                description="Registre a primeira avaliação para montar o prontuário clínico."
                headerAction={
                  <Button
                    size="sm"
                    onClick={addAssessment}
                    disabled={!hasSignedContract}
                    title={
                      hasSignedContract
                        ? undefined
                        : 'Assine um contrato ativo para registrar avaliações'
                    }
                  >
                    <Plus data-icon="inline-start" />
                    Nova avaliação
                  </Button>
                }
              />
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>Avaliação</CardTitle>
                      {assessmentIndex === 0 ? (
                        <Badge>Mais recente</Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {sortedAssessments.length > 1 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={assessmentIndex === 0}
                            onClick={() =>
                              setAssessmentIndex((i) => Math.max(0, i - 1))
                            }
                            aria-label="Avaliação mais recente"
                          >
                            <ChevronLeft />
                          </Button>
                          <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">
                            {assessmentIndex + 1} / {sortedAssessments.length}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={
                              assessmentIndex >= sortedAssessments.length - 1
                            }
                            onClick={() =>
                              setAssessmentIndex((i) =>
                                Math.min(sortedAssessments.length - 1, i + 1),
                              )
                            }
                            aria-label="Avaliação anterior"
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={addAssessment}
                        disabled={!hasSignedContract}
                        title={
                          hasSignedContract
                            ? undefined
                            : 'Assine um contrato ativo para registrar avaliações'
                        }
                      >
                        <Plus data-icon="inline-start" />
                        Nova avaliação
                      </Button>
                      {currentAssessment ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            void removeAssessment(currentAssessment.id)
                          }
                          aria-label="Remover avaliação"
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {currentAssessment ? (
                      <AssessmentSlide
                        assessment={currentAssessment}
                        assessments={student.assessments}
                        onUpdate={updateAssessment}
                      />
                    ) : null}

                    {sortedAssessments.length > 1 ? (
                      <div className="mt-5 flex items-center justify-center gap-1.5">
                        {sortedAssessments.map((a, i) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setAssessmentIndex(i)}
                            aria-label={`Ir para avaliação ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                              i === assessmentIndex
                                ? 'w-6 bg-primary'
                                : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                            }`}
                          />
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="evolucao" className="flex flex-col gap-4">
            {student.evolutions.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="size-6" />}
                title="Nenhuma evolução registrada"
                description="As anotações clínicas aparecerão aqui em ordem cronológica."
                headerAction={
                  <Button
                    size="sm"
                    onClick={addEvolution}
                    disabled={!hasSignedContract}
                    title={
                      hasSignedContract
                        ? undefined
                        : 'Assine um contrato ativo para registrar evoluções'
                    }
                  >
                    <Plus data-icon="inline-start" />
                    Nova evolução
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>Evolução</CardTitle>
                      {evolutionIndex === 0 ? (
                        <Badge>Mais recente</Badge>
                      ) : null}
                      {currentEvolution ? (
                        <Badge variant="outline">
                          Sessão{' '}
                          {sessionNumberFor(
                            currentEvolution.id,
                            student.evolutions,
                          )}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {sortedEvolutions.length > 1 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={evolutionIndex === 0}
                            onClick={() =>
                              setEvolutionIndex((i) => Math.max(0, i - 1))
                            }
                            aria-label="Evolução mais recente"
                          >
                            <ChevronLeft />
                          </Button>
                          <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">
                            {evolutionIndex + 1} / {sortedEvolutions.length}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={
                              evolutionIndex >= sortedEvolutions.length - 1
                            }
                            onClick={() =>
                              setEvolutionIndex((i) =>
                                Math.min(sortedEvolutions.length - 1, i + 1),
                              )
                            }
                            aria-label="Evolução anterior"
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          !currentEvolution ||
                          evolutionIndex !== 0 ||
                          !previousEvolution(
                            currentEvolution.id,
                            student.evolutions,
                          )
                        }
                        onClick={() => {
                          if (!currentEvolution || evolutionIndex !== 0) return
                          const prev = previousEvolution(
                            currentEvolution.id,
                            student.evolutions,
                          )
                          if (!prev) {
                            toast.error(
                              'Não há evolução anterior para duplicar',
                            )
                            return
                          }
                          void updateEvolution(currentEvolution.id, {
                            exercises: prev.exercises,
                            conduct: mergeDuplicatedConduct(
                              currentEvolution.conduct,
                              prev,
                            ),
                          })
                          toast.success('Evolução anterior duplicada', {
                            description:
                              'Procedimentos, orientações e próxima conduta copiados.',
                          })
                        }}
                        title={
                          evolutionIndex !== 0
                            ? 'Disponível apenas na evolução mais recente'
                            : currentEvolution &&
                                previousEvolution(
                                  currentEvolution.id,
                                  student.evolutions,
                                )
                              ? 'Copia procedimentos, orientações e próxima conduta'
                              : 'Não há evolução anterior'
                        }
                      >
                        Duplicar evolução anterior
                      </Button>
                      <Button
                        size="sm"
                        onClick={addEvolution}
                        disabled={!hasSignedContract}
                        title={
                          hasSignedContract
                            ? undefined
                            : 'Assine um contrato ativo para registrar evoluções'
                        }
                      >
                        <Plus data-icon="inline-start" />
                        Nova evolução
                      </Button>
                      {currentEvolution ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            void removeEvolution(currentEvolution.id)
                          }
                          aria-label="Remover evolução"
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {currentEvolution ? (
                      <EvolutionSlide
                        evolution={currentEvolution}
                        evolutions={student.evolutions}
                        defaultSpecialty={
                          specialtyLabel !== 'Sem especialidade ativa'
                            ? specialtyLabel.split(' · ')[0] ?? ''
                            : ''
                        }
                        onUpdate={updateEvolution}
                      />
                    ) : null}

                    {sortedEvolutions.length > 1 ? (
                      <div className="mt-5 flex items-center justify-center gap-1.5">
                        {sortedEvolutions.map((e, i) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => setEvolutionIndex(i)}
                            aria-label={`Ir para evolução ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                              i === evolutionIndex
                                ? 'w-6 bg-primary'
                                : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                            }`}
                          />
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-base">Histórico</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1">
                    {sortedEvolutions.map((e, i) => {
                      const session = sessionNumberFor(e.id, student.evolutions)
                      const preview =
                        evolutionComplaintPreview(e.complaints) ||
                        'Sem queixa registrada'
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setEvolutionIndex(i)}
                          className={`rounded-lg px-3 py-2 text-left transition-colors ${
                            i === evolutionIndex
                              ? 'bg-muted'
                              : 'hover:bg-muted/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-medium">
                              Sessão {session}
                              {i === 0 ? (
                                <Badge
                                  variant="outline"
                                  className="px-1.5 py-0 text-[10px] font-normal"
                                >
                                  Mais recente
                                </Badge>
                              ) : null}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatShortDate(e.date)}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {preview}
                          </p>
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="financeiro" className="flex flex-col gap-4">
            {!hasSignedContract ? (
              <EmptyState
                icon={<Wallet className="size-6" />}
                title="Nenhuma informação financeira"
                description="Os dados de plano e cobrança aparecem após a assinatura do contrato."
              />
            ) : (
              <>
            <Card>
              <CardContent>
                <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-0.5 py-2">
                    <dt className="text-xs text-muted-foreground">
                      Plano ({contractSourceLabel})
                    </dt>
                    <dd className="text-sm font-medium">
                      {governingContract!.planLabel ||
                        planName(effectivePlanId)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 py-2">
                    <dt className="text-xs text-muted-foreground">
                      Valor do plano
                    </dt>
                    <dd className="text-sm tabular-nums">
                      {formatCurrency(
                        getPlan(effectivePlanId)?.price ?? 0,
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 py-2">
                    <dt className="text-xs text-muted-foreground">Vigência</dt>
                    <dd className="text-sm">
                      {planVigencia ? (
                        <>
                          <span className="tabular-nums">
                            {formatShortDate(planVigencia.startDate)} —{' '}
                            {formatShortDate(planVigencia.endDate)}
                          </span>
                          {planVigenciaHint ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {planVigenciaHint}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 py-2">
                    <dt className="text-xs text-muted-foreground">
                      Desconto (%)
                    </dt>
                    <dd className="text-sm tabular-nums">
                      {effectiveDiscountPercent ?? 0}%
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 py-2">
                    <dt className="text-xs text-muted-foreground">
                      Valor final
                    </dt>
                    <dd className="text-sm font-medium tabular-nums">
                      {formatCurrency(effectiveMonthlyValue ?? 0)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 py-2">
                    <dt className="text-xs text-muted-foreground">
                      Dia de vencimento
                    </dt>
                    <dd className="text-sm">
                      {effectiveDueDay != null
                        ? `Dia ${effectiveDueDay}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 py-2">
                    <dt className="text-xs text-muted-foreground">
                      Forma de pagamento
                    </dt>
                    <dd className="text-sm">
                      {effectivePaymentMethod ?? '—'}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 py-2">
                    <dt className="text-xs text-muted-foreground">
                      Status financeiro
                    </dt>
                    <dd className="flex items-center gap-2 pt-1">
                          <ActiveBadge active={hasSignedContract} />
                      <PaymentStatusSelect
                        value={studentPaymentStatus(student)}
                        aria-label="Status financeiro da pessoa"
                        onChange={(status) => {
                          void (async () => {
                            const sorted = [...student.payments].sort((a, b) =>
                              b.dueDate.localeCompare(a.dueDate),
                            )
                            const target =
                              sorted.find((p) => p.status !== 'pago') ??
                              sorted[0]
                            if (!target) {
                              toast.error(
                                'Não foi possível atualizar o status',
                              )
                              return
                            }
                            try {
                              const updated = await updatePayment(target.id, {
                                status,
                              })
                              syncPaymentInState(updated)
                              toast.success('Status financeiro atualizado', {
                                description:
                                  status === 'pago'
                                    ? 'Pago'
                                    : status === 'pendente'
                                      ? 'Pendente'
                                      : 'Atrasado',
                              })
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : 'Não foi possível atualizar o status',
                              )
                            }
                          })()
                        }}
                      />
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card className="overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Referência</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.payments
                    .slice()
                    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
                    .map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.reference}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatShortDate(p.dueDate)}
                        </TableCell>
                        <TableCell>{formatCurrency(p.amount)}</TableCell>
                        <TableCell>
                          <Select
                            value={
                              p.status === 'pago'
                                ? (p.method ?? student.paymentMethod)
                                : null
                            }
                            onValueChange={(value) => {
                              if (!value) return
                              void (async () => {
                                try {
                                  const updated = await updatePayment(p.id, {
                                    method: value as PaymentMethod,
                                  })
                                  syncPaymentInState(updated)
                                  toast.success(
                                    'Forma, status e data sincronizados',
                                    {
                                      description: `${p.reference} · ${value} · ${formatShortDate(updated.paidAt!)}`,
                                    },
                                  )
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : 'Não foi possível atualizar a forma de pagamento',
                                  )
                                }
                              })()
                            }}
                          >
                            <SelectTrigger
                              size="sm"
                              aria-label={`Forma de ${p.reference}`}
                              className="w-[160px]"
                            >
                              <SelectValue placeholder="Definir forma" />
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectGroup>
                                {paymentMethods.map((method) => (
                                  <SelectItem key={method} value={method}>
                                    {method}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <PaymentStatusSelect
                            value={p.status}
                            aria-label={`Status de ${p.reference}`}
                            onChange={(status: PaymentStatus) => {
                              void (async () => {
                                try {
                                  const updated = await updatePayment(p.id, {
                                    status,
                                  })
                                  syncPaymentInState(updated)
                                  if (status === 'pago') {
                                    toast.success('Pagamento confirmado', {
                                      description: `${p.reference} · ${updated.method} · ${formatShortDate(updated.paidAt!)}`,
                                    })
                                    return
                                  }
                                  toast.success('Status atualizado', {
                                    description: `${p.reference} · ${
                                      status === 'pendente'
                                        ? 'Pendente'
                                        : 'Atrasado'
                                    }`,
                                  })
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : 'Não foi possível atualizar o status',
                                  )
                                }
                              })()
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={
                              p.status === 'pago' ? (p.paidAt ?? '') : ''
                            }
                            onChange={(e) => {
                              const paidAt = e.target.value || null
                              void (async () => {
                                try {
                                  const updated = await updatePayment(p.id, {
                                    paidAt,
                                  })
                                  syncPaymentInState(updated)
                                  if (!paidAt) {
                                    toast.success('Pagamento reaberto', {
                                      description: `${p.reference} · Pendente`,
                                    })
                                    return
                                  }
                                  toast.success(
                                    'Forma, status e data sincronizados',
                                    {
                                      description: `${p.reference} · ${updated.method} · ${formatShortDate(paidAt)}`,
                                    },
                                  )
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : 'Não foi possível atualizar a data',
                                  )
                                }
                              })()
                            }}
                            className="h-7 w-[150px]"
                            aria-label={`Data de pagamento de ${p.reference}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="contratos" className="flex flex-col gap-4">
            <StudentContractsPanel
              student={student}
              onContractsChanged={() => {
                loadContracts()
                refreshStudentFromApi()
              }}
            />
          </TabsContent>

          <TabsContent value="agenda" className="flex flex-col gap-4">
            {!hasSignedContract ? (
              <EmptyState
                icon={<CalendarClock className="size-6" />}
                title="Nenhuma agenda fixa"
                description="Os horários fixos aparecem após a assinatura do contrato."
              />
            ) : (
              <>
                <StudentFixedScheduleCard
                  schedule={student.schedule}
                  weeklyLimit={effectiveWeeklyLimit}
                  contractStart={governingContract!.startDate}
                  contractEnd={governingContract!.endDate}
                  onRegister={registerSchedulePeriod}
                  onDeletePeriod={deleteSchedulePeriod}
                />

                <StudentAttendancePanel
                  studentId={student.id}
                  schedule={student.schedule}
                  planId={effectivePlanId}
                  fallbackPlanId={effectivePlanId}
                  historyFrom={governingContract!.startDate}
                  historyTo={governingContract!.endDate}
                  plans={plans}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="historico" className="flex flex-col gap-4">
            <StudentHistoryPanel student={student} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function ReadOnlyMeta({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="px-1.5 py-1 text-sm font-medium">
        {value.trim() ? value : '—'}
      </dd>
    </div>
  )
}

function EvolutionSlide({
  evolution,
  evolutions,
  defaultSpecialty,
  onUpdate,
}: {
  evolution: Evolution
  evolutions: Evolution[]
  defaultSpecialty: string
  onUpdate: (id: string, patch: Partial<Evolution>) => void | Promise<void>
}) {
  const [services, setServices] = useState<StudioService[]>([])

  const sessionNumber = sessionNumberFor(evolution.id, evolutions)
  const conduct = parseConduct(evolution.conduct)
  const exercises = parseExercises(evolution.exercises)
  const complaint = parseSelectField(evolution.complaints, EVOLUTION_COMPLAINTS)
  const assessment = parseClinicalField(evolution.clinical)
  const response = parseSelectField(evolution.improvements, EVOLUTION_RESPONSES)

  useEffect(() => {
    let cancelled = false
    void fetchServices({ active: true })
      .then((list) => {
        if (!cancelled) setServices(list)
      })
      .catch(() => {
        if (!cancelled) setServices([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const displayTime = conduct.time || currentTimeHHMM()
  const displaySpecialty = conduct.specialty || defaultSpecialty || '—'
  const professional = evolution.professional?.trim() || '—'

  function sectionTitle(title: string) {
    return <p className="text-sm font-medium">{title}</p>
  }

  function saveConduct(patch: Partial<EvolutionConductPack>) {
    void onUpdate(evolution.id, {
      conduct: serializeConduct({ ...conduct, ...patch }),
    })
  }

  function saveExercises(next: {
    items: EvolutionProcedureItem[]
    notes: string
  }) {
    void onUpdate(evolution.id, {
      exercises: serializeExercises(next),
    })
  }

  function toggleProcedure(service: StudioService) {
    const selected = exercises.items.some(
      (item) => item.id === service.id || item.name === service.name,
    )
    if (selected) {
      saveExercises({
        ...exercises,
        items: exercises.items.filter(
          (item) => item.id !== service.id && item.name !== service.name,
        ),
      })
      return
    }
    const items = [
      ...exercises.items,
      { id: service.id, name: service.name, notes: '' },
    ]
    saveExercises({ ...exercises, items })
    if (!conduct.durationMinutes && service.durationMinutes) {
      saveConduct({ durationMinutes: String(service.durationMinutes) })
    }
  }

  function toggleOrientation(option: string) {
    const selected = conduct.orientationItems.includes(option)
    const orientationItems = selected
      ? conduct.orientationItems.filter((item) => item !== option)
      : [...conduct.orientationItems, option]
    saveConduct({
      orientationItems,
      orientationOther:
        option === 'Outro' && selected ? '' : conduct.orientationOther,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {sectionTitle('Cabeçalho')}
        <dl className="grid grid-cols-2 gap-x-3 sm:grid-cols-3 lg:grid-cols-5">
          <ReadOnlyMeta
            label="Data"
            value={formatShortDate(evolution.date)}
          />
          <ReadOnlyMeta label="Hora" value={displayTime} />
          <ReadOnlyMeta label="Profissional" value={professional} />
          <ReadOnlyMeta label="Especialidade" value={displaySpecialty} />
          <ReadOnlyMeta
            label="Número da sessão"
            value={String(sessionNumber)}
          />
        </dl>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        {sectionTitle('Queixa do dia')}
        <InlineField
          label="Queixa do dia"
          value={complaint.option}
          type="select"
          options={EVOLUTION_COMPLAINTS.map((option) => ({
            value: option,
            label: option,
          }))}
          emptyLabel="Selecione a queixa"
          className="py-0 [&_dt]:sr-only"
          onSave={(v) =>
            onUpdate(evolution.id, {
              complaints: serializeSelectField({
                option: v,
                other: v === 'Outro' ? complaint.other : '',
              }),
            })
          }
        />
        {complaint.option === 'Outro' ? (
          <InlineField
            label="Detalhamento"
            value={complaint.other}
            type="textarea"
            placeholder="Descreva a queixa…"
            emptyLabel="Descreva…"
            className="py-0"
            onSave={(v) =>
              onUpdate(evolution.id, {
                complaints: serializeSelectField({
                  option: 'Outro',
                  other: v,
                }),
              })
            }
          />
        ) : null}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        {sectionTitle('Avaliação do dia')}
        <InlineField
          label="Avaliação do dia"
          value={assessment.option}
          type="select"
          options={EVOLUTION_ASSESSMENTS.map((option) => ({
            value: option,
            label: option,
          }))}
          emptyLabel="Selecione a avaliação"
          className="py-0 [&_dt]:sr-only"
          onSave={(v) =>
            onUpdate(evolution.id, {
              clinical: serializeClinicalField({
                ...assessment,
                option: v,
                other: v === 'Outro' ? assessment.other : '',
              }),
            })
          }
        />
        {assessment.option === 'Outro' ? (
          <InlineField
            label="Detalhamento"
            value={assessment.other}
            type="textarea"
            placeholder="Descreva a avaliação…"
            emptyLabel="Descreva…"
            className="py-0"
            onSave={(v) =>
              onUpdate(evolution.id, {
                clinical: serializeClinicalField({
                  ...assessment,
                  option: 'Outro',
                  other: v,
                }),
              })
            }
          />
        ) : null}
        <InlineField
          label="Observações clínicas"
          value={assessment.observations}
          type="textarea"
          placeholder="Achados clínicos do dia (opcional)"
          emptyLabel="Observações livres — clique para preencher"
          className="py-0"
          onSave={(v) =>
            onUpdate(evolution.id, {
              clinical: serializeClinicalField({
                ...assessment,
                observations: v,
              }),
            })
          }
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        {sectionTitle('Procedimentos realizados')}
        {services.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {services.map((service) => {
              const selected = exercises.items.some(
                (item) =>
                  item.id === service.id || item.name === service.name,
              )
              return (
                <Button
                  key={service.id}
                  type="button"
                  size="sm"
                  variant={selected ? 'default' : 'outline'}
                  onClick={() => toggleProcedure(service)}
                >
                  {service.name}
                </Button>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum serviço cadastrado. Cadastre em Clínica → Serviços.
          </p>
        )}
        <InlineField
          label="Observações"
          value={exercises.notes}
          type="textarea"
          placeholder="Observações dos procedimentos (opcional)"
          emptyLabel="Observações opcionais — clique para preencher"
          className="py-0"
          onSave={(v) => saveExercises({ ...exercises, notes: v })}
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        {sectionTitle('Resposta ao tratamento')}
        <InlineField
          label="Resposta ao tratamento"
          value={response.option}
          type="select"
          options={EVOLUTION_RESPONSES.map((option) => ({
            value: option,
            label: option,
          }))}
          emptyLabel="Selecione a resposta"
          className="py-0 [&_dt]:sr-only"
          onSave={(v) =>
            onUpdate(evolution.id, {
              improvements: serializeSelectField({
                option: v,
                other: v === 'Outro' ? response.other : '',
              }),
            })
          }
        />
        {response.option === 'Outro' ? (
          <InlineField
            label="Detalhamento"
            value={response.other}
            type="textarea"
            placeholder="Descreva a resposta…"
            emptyLabel="Descreva…"
            className="py-0"
            onSave={(v) =>
              onUpdate(evolution.id, {
                improvements: serializeSelectField({
                  option: 'Outro',
                  other: v,
                }),
              })
            }
          />
        ) : null}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        {sectionTitle('Orientações')}
        <div className="flex flex-wrap gap-2">
          {EVOLUTION_ORIENTATIONS.map((option) => {
            const selected = conduct.orientationItems.includes(option)
            return (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                onClick={() => toggleOrientation(option)}
              >
                {option}
              </Button>
            )
          })}
        </div>
        {conduct.orientationItems.includes('Outro') ? (
          <InlineField
            label="Outra orientação"
            value={conduct.orientationOther}
            type="textarea"
            placeholder="Descreva a orientação…"
            emptyLabel="Descreva…"
            className="py-0"
            onSave={(v) => saveConduct({ orientationOther: v })}
          />
        ) : null}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        {sectionTitle('Próxima conduta')}
        <InlineField
          label="Próxima conduta"
          value={conduct.nextPlan}
          type="select"
          options={EVOLUTION_NEXT_PLANS.map((option) => ({
            value: option,
            label: option,
          }))}
          emptyLabel="Selecione a próxima conduta"
          className="py-0 [&_dt]:sr-only"
          onSave={(v) =>
            saveConduct({
              nextPlan: v,
              nextPlanOther: v === 'Outro' ? conduct.nextPlanOther : '',
            })
          }
        />
        {conduct.nextPlan === 'Outro' ? (
          <InlineField
            label="Detalhamento"
            value={conduct.nextPlanOther}
            type="textarea"
            placeholder="Descreva a conduta…"
            emptyLabel="Descreva…"
            className="py-0"
            onSave={(v) => saveConduct({ nextPlanOther: v })}
          />
        ) : null}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        {sectionTitle('Intercorrências')}
        <InlineField
          label="Intercorrência"
          value={conduct.adverseEvent || 'Nenhuma'}
          type="select"
          options={EVOLUTION_ADVERSE_EVENTS.map((option) => ({
            value: option,
            label: option,
          }))}
          emptyLabel="Selecione"
          className="py-0 [&_dt]:sr-only"
          onSave={(v) =>
            saveConduct({
              adverseEvent: v,
              adverseEventOther:
                v === 'Outro' ? conduct.adverseEventOther : '',
            })
          }
        />
        {conduct.adverseEvent === 'Outro' ? (
          <InlineField
            label="Detalhamento"
            value={conduct.adverseEventOther}
            type="textarea"
            placeholder="Descreva a intercorrência…"
            emptyLabel="Descreva…"
            className="py-0"
            onSave={(v) => saveConduct({ adverseEventOther: v })}
          />
        ) : null}
      </div>
    </div>
  )
}

function AssessmentSlide({
  assessment,
  assessments,
  onUpdate,
}: {
  assessment: PhysicalAssessment
  assessments: PhysicalAssessment[]
  onUpdate: (
    id: string,
    patch: Partial<Omit<PhysicalAssessment, 'measures'>> & {
      measures?: Partial<PhysicalAssessment['measures']>
    },
  ) => void | Promise<void>
}) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const imcValue = bmi(assessment.weight, assessment.height)
  const painOptions = Array.from({ length: 11 }, (_, i) => ({
    value: String(i),
    label: String(i),
  }))
  const professional = assessment.professional ?? ''
  const assessmentType = assessment.assessmentType ?? 'Inicial'
  const typeOptions = assessmentTypes.filter((type) => {
    if (type === assessmentType) return true
    if (type !== 'Inicial' && type !== 'Alta') return true
    return !assessments.some(
      (other) =>
        other.id !== assessment.id &&
        (other.assessmentType ?? 'Inicial') === type,
    )
  })

  useEffect(() => {
    let cancelled = false
    void fetchProfessionals()
      .then((list) => {
        if (!cancelled) setProfessionals(list)
      })
      .catch(() => {
        if (!cancelled) setProfessionals([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedProfessional =
    professionals.find((p) => p.name === professional) ??
    professionals.find(
      (p) =>
        professional &&
        p.name.toLowerCase() === professional.toLowerCase(),
    ) ??
    null

  const professionalSelectList = (() => {
    if (
      selectedProfessional &&
      !professionals.some((p) => p.id === selectedProfessional.id)
    ) {
      return [selectedProfessional, ...professionals]
    }
    return professionals
  })()

  function sectionTitle(title: string) {
    return <p className="text-sm font-medium">{title}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-x-3 sm:grid-cols-3">
        <InlineField
          label="Data"
          value={assessment.date}
          displayValue={formatShortDate(assessment.date)}
          type="date"
          onSave={(v) => onUpdate(assessment.id, { date: v })}
        />
        <InlineField
          label="Tipo"
          value={assessmentType}
          type="select"
          options={typeOptions.map((t) => ({ value: t, label: t }))}
          onSave={(v) =>
            onUpdate(assessment.id, {
              assessmentType: (v as AssessmentType) || 'Inicial',
            })
          }
        />
        <InlineField
          label="Profissional"
          value={selectedProfessional?.id ?? ''}
          displayValue={professional || undefined}
          type="select"
          options={professionalSelectList.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
          emptyLabel="Selecione"
          onSave={(id) => {
            const next = professionals.find((p) => p.id === id)
            if (!next) return
            void onUpdate(assessment.id, {
              professional: next.name,
            })
          }}
        />
      </dl>

      <Separator />

      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <InlineField
            label="Queixa principal"
            value={assessment.chiefComplaint}
            type="textarea"
            emptyLabel="Obrigatório — clique para preencher"
            className="[&_dt]:font-semibold [&_dt]:text-foreground"
            onSave={(v) => {
              if (!v.trim()) {
                toast.error('Queixa principal é obrigatória')
                return
              }
              void onUpdate(assessment.id, { chiefComplaint: v })
            }}
          />
          <InlineField
            label="Objetivos do tratamento"
            value={assessment.treatmentObjectives}
            type="textarea"
            placeholder="Liste um ou mais objetivos…"
            className="[&_dt]:font-semibold [&_dt]:text-foreground"
            onSave={(v) =>
              onUpdate(assessment.id, { treatmentObjectives: v })
            }
          />
      </dl>

      <Separator />

      <div className="flex flex-col gap-3">
        {sectionTitle('Indicadores')}
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          <InlineField
            label="Peso (kg)"
            value={String(assessment.weight)}
            displayValue={`${assessment.weight} kg`}
            type="number"
            onSave={(v) =>
              onUpdate(assessment.id, { weight: Number(v) || 0 })
            }
          />
          <InlineField
            label="Altura (cm)"
            value={String(assessment.height)}
            displayValue={`${assessment.height} cm`}
            type="number"
            onSave={(v) =>
              onUpdate(assessment.id, { height: Number(v) || 0 })
            }
          />
          <div className="flex flex-col gap-0.5 py-2">
            <dt className="text-xs text-muted-foreground">IMC</dt>
            <dd className="px-1.5 py-1 text-sm font-medium">
              {imcValue} · {bmiLabel(imcValue)}
            </dd>
          </div>
          <InlineField
            label="% Gordura (opcional)"
            value={
              assessment.bodyFat != null ? String(assessment.bodyFat) : ''
            }
            displayValue={
              assessment.bodyFat != null
                ? `${assessment.bodyFat}%`
                : undefined
            }
            type="number"
            emptyLabel="Clique para informar"
            onSave={(v) =>
              onUpdate(assessment.id, {
                bodyFat: v ? Number(v) : undefined,
              })
            }
          />
          <InlineField
            label="Massa muscular kg (opcional)"
            value={
              assessment.muscleMass != null
                ? String(assessment.muscleMass)
                : ''
            }
            displayValue={
              assessment.muscleMass != null
                ? `${assessment.muscleMass} kg`
                : undefined
            }
            type="number"
            emptyLabel="Clique para informar"
            onSave={(v) =>
              onUpdate(assessment.id, {
                muscleMass: v ? Number(v) : undefined,
              })
            }
          />
        </dl>

        <p className="mt-1 text-sm font-medium">Medidas corporais (cm)</p>
        <dl className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-5">
          {measureLabels.map((m) => {
            const key = m.key as keyof PhysicalAssessment['measures']
            const measureValue = assessment.measures[key]
            return (
              <InlineField
                key={m.key}
                label={m.label}
                value={String(measureValue)}
                displayValue={`${measureValue} cm`}
                type="number"
                onSave={(v) =>
                  onUpdate(assessment.id, {
                    measures: { [key]: Number(v) || 0 },
                  })
                }
              />
            )
          })}
        </dl>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        {sectionTitle('Avaliação clínica')}
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <InlineField
            label="Escala de dor (EVA 0 a 10)"
            value={
              assessment.painScale != null ? String(assessment.painScale) : ''
            }
            displayValue={
              assessment.painScale != null
                ? `${assessment.painScale}/10`
                : undefined
            }
            type="select"
            options={painOptions}
            emptyLabel="Clique para informar"
            onSave={(v) =>
              onUpdate(assessment.id, {
                painScale: v === '' ? null : Number(v),
              })
            }
          />
          <InlineField
            label="Região afetada"
            value={assessment.affectedRegion}
            type="textarea"
            onSave={(v) => onUpdate(assessment.id, { affectedRegion: v })}
          />
          <InlineField
            label="Limitações funcionais"
            value={assessment.functionalLimitations}
            type="textarea"
            onSave={(v) =>
              onUpdate(assessment.id, { functionalLimitations: v })
            }
            className="sm:col-span-2"
          />
          <InlineField
            label="Testes realizados"
            value={assessment.testsPerformed}
            type="textarea"
            onSave={(v) => onUpdate(assessment.id, { testsPerformed: v })}
          />
          <InlineField
            label="Resultado dos testes"
            value={assessment.testResults}
            type="textarea"
            onSave={(v) => onUpdate(assessment.id, { testResults: v })}
          />
        </dl>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        {sectionTitle('Plano terapêutico')}
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <InlineField
            label="Frequência semanal"
            value={assessment.weeklyFrequency}
            placeholder="Ex.: 2x por semana"
            onSave={(v) => onUpdate(assessment.id, { weeklyFrequency: v })}
          />
          <InlineField
            label="Quantidade estimada de sessões"
            value={assessment.estimatedSessions}
            placeholder="Ex.: 12"
            onSave={(v) => onUpdate(assessment.id, { estimatedSessions: v })}
          />
          <InlineField
            label="Técnicas previstas"
            value={assessment.plannedTechniques}
            type="textarea"
            onSave={(v) => onUpdate(assessment.id, { plannedTechniques: v })}
            className="sm:col-span-2"
          />
          <InlineField
            label="Orientações"
            value={assessment.guidelines}
            type="textarea"
            onSave={(v) => onUpdate(assessment.id, { guidelines: v })}
          />
          <InlineField
            label="Encaminhamentos"
            value={assessment.referrals}
            type="textarea"
            onSave={(v) => onUpdate(assessment.id, { referrals: v })}
          />
        </dl>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
  headerAction,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  headerAction?: React.ReactNode
}) {
  return (
    <Card>
      {headerAction ? (
        <CardHeader className="flex flex-row items-center justify-end space-y-0">
          {headerAction}
        </CardHeader>
      ) : null}
      <Empty className="py-12">
        <EmptyHeader className="max-w-none items-center text-center">
          <EmptyMedia variant="icon">{icon}</EmptyMedia>
          <EmptyTitle className="text-center">{title}</EmptyTitle>
          <EmptyDescription className="whitespace-nowrap text-center">
            {description}
          </EmptyDescription>
        </EmptyHeader>
        {action ? (
          <div className="mt-4 flex justify-center">{action}</div>
        ) : null}
      </Empty>
    </Card>
  )
}
