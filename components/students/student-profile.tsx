'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
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
import { PersonalDataPanel } from '@/components/students/personal-data-panel'
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
  CardDescription,
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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
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
import { fetchPlans, fetchStudioHours, fetchTimeSlots } from '@/lib/settings-api'
import { fetchStudentContracts } from '@/lib/contracts-api'
import { fetchStudent, updateStudent } from '@/lib/students-api'
import type { UpdateStudentInput } from '@/lib/validations/student'

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

const chartConfig = {
  peso: { label: 'Peso (kg)', color: 'var(--chart-1)' },
  imc: { label: 'IMC', color: 'var(--chart-2)' },
} satisfies ChartConfig

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
      student.evolutions
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
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
      'notes',
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

  async function updateEvolution(
    id: string,
    key: keyof Evolution,
    value: string,
  ) {
    const previous = student.evolutions.find((e) => e.id === id)
    setStudent((prev) => ({
      ...prev,
      evolutions: prev.evolutions.map((e) =>
        e.id === id ? { ...e, [key]: value } : e,
      ),
    }))
    try {
      const updated = await updateEvolutionApi(student.id, id, {
        [key]: value,
      })
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
      const created = await createEvolutionApi(student.id)
      setStudent((prev) => ({
        ...prev,
        evolutions: [created, ...prev.evolutions],
      }))
      setEvolutionIndex(0)
      toast.success('Nova evolução adicionada', {
        description: 'Preencha os campos do novo bloco.',
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
      const created = await createAssessmentApi(student.id)
      setStudent((prev) => ({
        ...prev,
        assessments: [created, ...prev.assessments],
      }))
      setAssessmentIndex(0)
      toast.success('Nova avaliação adicionada', {
        description: 'Ajuste data, peso, altura e medidas.',
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

  const assessmentSeries = [...student.assessments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({
      date: formatShortDate(a.date).slice(0, 5),
      peso: a.weight,
      imc: bmi(a.weight, a.height),
    }))
  const latest = sortedAssessments[0]
  const currentAssessment = sortedAssessments[assessmentIndex]
  const currentEvolution = sortedEvolutions[evolutionIndex]

  return (
    <>
      <PageHeader
        title={student.name}
        description={`${age(student.birthDate)} anos · ${
          hasSignedContract
            ? governingContract?.planLabel || planName(effectivePlanId)
            : 'Sem contrato ativo'
        }`}
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
            </TabsList>
          </div>

          <TabsContent value="dados">
            <PersonalDataPanel
              student={student}
              hasSignedContract={hasSignedContract}
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
            <Card>
              <CardHeader>
                <CardTitle>Histórico clínico</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  <InlineField
                    label="Objetivo"
                    value={student.objective}
                    type="textarea"
                    onSave={(v) => updateField('objective', v)}
                  />
                  <InlineField
                    label="Patologias"
                    value={student.pathologies}
                    type="textarea"
                    onSave={(v) => updateField('pathologies', v)}
                  />
                  <InlineField
                    label="Lesões"
                    value={student.injuries}
                    type="textarea"
                    onSave={(v) => updateField('injuries', v)}
                  />
                  <InlineField
                    label="Cirurgias"
                    value={student.surgeries}
                    type="textarea"
                    onSave={(v) => updateField('surgeries', v)}
                  />
                  <InlineField
                    label="Restrições"
                    value={student.restrictions}
                    type="textarea"
                    onSave={(v) => updateField('restrictions', v)}
                  />
                  <InlineField
                    label="Medicamentos"
                    value={student.medications}
                    type="textarea"
                    onSave={(v) => updateField('medications', v)}
                  />
                </dl>
                <Separator className="my-4" />
                <InlineField
                  label="Observações"
                  value={student.notes}
                  type="textarea"
                  onSave={(v) => updateField('notes', v)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="avaliacoes" className="flex flex-col gap-4">
            {student.assessments.length === 0 ? (
              <EmptyState
                icon={<Ruler className="size-6" />}
                title="Nenhuma avaliação registrada"
                description="Registre a primeira avaliação física para acompanhar a evolução."
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
                  <CardHeader className="flex flex-row flex-wrap items-center justify-end gap-3 space-y-0">
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
                  </CardHeader>
                  <CardContent>
                    {currentAssessment ? (
                      <AssessmentSlide
                        assessment={currentAssessment}
                        isLatest={assessmentIndex === 0}
                        onUpdate={updateAssessment}
                        onRemove={removeAssessment}
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

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card>
                    <CardContent className="flex flex-col gap-1 pt-6">
                      <span className="text-sm text-muted-foreground">
                        Peso atual
                      </span>
                      <span className="text-2xl font-semibold">
                        {latest.weight} kg
                      </span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex flex-col gap-1 pt-6">
                      <span className="text-sm text-muted-foreground">IMC</span>
                      <span className="text-2xl font-semibold">
                        {bmi(latest.weight, latest.height)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {bmiLabel(bmi(latest.weight, latest.height))}
                      </span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex flex-col gap-1 pt-6">
                      <span className="text-sm text-muted-foreground">
                        Gordura / Massa muscular
                      </span>
                      <span className="text-2xl font-semibold">
                        {latest.bodyFat ? `${latest.bodyFat}%` : '—'}
                        {latest.muscleMass ? (
                          <span className="text-base font-normal text-muted-foreground">
                            {' '}
                            · {latest.muscleMass} kg
                          </span>
                        ) : null}
                      </span>
                    </CardContent>
                  </Card>
                </div>

                {student.assessments.length > 1 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Evolução de peso e IMC</CardTitle>
                      <CardDescription>
                        Histórico das avaliações registradas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={chartConfig}
                        className="h-[240px] w-full"
                      >
                        <LineChart
                          data={assessmentSeries}
                          margin={{ left: 4, right: 8, top: 8 }}
                        >
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={32}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            dataKey="peso"
                            type="monotone"
                            stroke="var(--color-peso)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            dataKey="imc"
                            type="monotone"
                            stroke="var(--color-imc)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                ) : null}
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
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-end gap-3 space-y-0">
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
                </CardHeader>
                <CardContent>
                  {currentEvolution ? (
                    <EvolutionSlide
                      evolution={currentEvolution}
                      isLatest={evolutionIndex === 0}
                      onUpdate={updateEvolution}
                      onRemove={removeEvolution}
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
                        aria-label="Status financeiro do aluno"
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
                <StudentAttendancePanel
                  studentId={student.id}
                  schedule={student.schedule}
                  planId={effectivePlanId}
                  fallbackPlanId={effectivePlanId}
                  historyFrom={governingContract!.startDate}
                  historyTo={governingContract!.endDate}
                  plans={plans}
                />

                <StudentFixedScheduleCard
                  schedule={student.schedule}
                  weeklyLimit={effectiveWeeklyLimit}
                  contractStart={governingContract!.startDate}
                  contractEnd={governingContract!.endDate}
                  onRegister={registerSchedulePeriod}
                  onDeletePeriod={deleteSchedulePeriod}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function EvolutionSlide({
  evolution,
  isLatest,
  onUpdate,
  onRemove,
}: {
  evolution: Evolution
  isLatest: boolean
  onUpdate: (
    id: string,
    key: keyof Evolution,
    value: string,
  ) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">Evolução</h3>
            {isLatest ? <Badge>Mais recente</Badge> : null}
          </div>
          <InlineField
            label="Data"
            value={evolution.date}
            displayValue={formatShortDate(evolution.date)}
            type="date"
            className="py-0"
            valueClassName="text-base font-semibold"
            onSave={(v) => onUpdate(evolution.id, 'date', v)}
          />
          <InlineField
            label="Profissional"
            value={evolution.professional}
            className="py-0"
            onSave={(v) => onUpdate(evolution.id, 'professional', v)}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(evolution.id)}
          aria-label="Remover evolução"
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>

      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        <InlineField
          label="Evolução clínica"
          value={evolution.clinical}
          type="textarea"
          onSave={(v) => onUpdate(evolution.id, 'clinical', v)}
        />
        <InlineField
          label="Queixas"
          value={evolution.complaints}
          type="textarea"
          onSave={(v) => onUpdate(evolution.id, 'complaints', v)}
        />
        <InlineField
          label="Melhoras"
          value={evolution.improvements}
          type="textarea"
          onSave={(v) => onUpdate(evolution.id, 'improvements', v)}
        />
        <InlineField
          label="Exercícios realizados"
          value={evolution.exercises}
          type="textarea"
          onSave={(v) => onUpdate(evolution.id, 'exercises', v)}
        />
      </dl>
      <Separator />
      <InlineField
        label="Condutas"
        value={evolution.conduct}
        type="textarea"
        onSave={(v) => onUpdate(evolution.id, 'conduct', v)}
      />
    </div>
  )
}

function AssessmentSlide({
  assessment,
  isLatest,
  onUpdate,
  onRemove,
}: {
  assessment: PhysicalAssessment
  isLatest: boolean
  onUpdate: (
    id: string,
    patch: Partial<Omit<PhysicalAssessment, 'measures'>> & {
      measures?: Partial<PhysicalAssessment['measures']>
    },
  ) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
}) {
  const imcValue = bmi(assessment.weight, assessment.height)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">Avaliação</h3>
            {isLatest ? <Badge>Mais recente</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            IMC {imcValue} · {bmiLabel(imcValue)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(assessment.id)}
          aria-label="Remover avaliação"
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>

      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        <InlineField
          label="Data"
          value={assessment.date}
          displayValue={formatShortDate(assessment.date)}
          type="date"
          onSave={(v) => onUpdate(assessment.id, { date: v })}
        />
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

      <Separator />

      <div>
        <p className="mb-1 text-sm font-medium">Medidas corporais (cm)</p>
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
