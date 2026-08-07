'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { ActiveBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineField } from '@/components/students/inline-field'
import { composeAddress, lookupCep } from '@/lib/cep'
import { composeEmergencyContact } from '@/lib/emergency-contact'
import { formatShortDate, type Sex, type Student, bmi, bmiLabel } from '@/lib/data'
import { maskCep, maskCpf, maskPhone, onlyDigits } from '@/lib/masks'
import { cn } from '@/lib/utils'
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from '@/lib/validations/student'
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'

const weightImcChartConfig = {
  peso: { label: 'Peso (kg)', color: 'var(--chart-1)' },
  imc: { label: 'IMC', color: 'var(--chart-2)' },
} satisfies ChartConfig

const sexes: Sex[] = ['Feminino', 'Masculino', 'Outro']

type PersonalDataForm = {
  name: string
  birthDate: string
  sex: Sex
  cpf: string
  phone: string
  email: string
  profession: string
  convenio: boolean
  convenioCarteirinha: string
  convenioProduto: string
  cep: string
  street: string
  addressNumber: string
  neighborhood: string
  city: string
  state: string
  emergencyName: string
  emergencyRelation: string
  emergencyPhone: string
}

type FieldKey = keyof PersonalDataForm
type FieldErrors = Partial<Record<FieldKey, string>>

const FIELD_LABELS: Record<FieldKey, string> = {
  name: 'Nome completo',
  birthDate: 'Nascimento',
  sex: 'Sexo',
  cpf: 'CPF',
  phone: 'Telefone',
  email: 'E-mail',
  profession: 'Profissão',
  convenio: 'Convênio',
  convenioCarteirinha: 'Nº da carteirinha',
  convenioProduto: 'Produto',
  cep: 'CEP',
  street: 'Rua',
  addressNumber: 'Número',
  neighborhood: 'Bairro',
  city: 'Cidade',
  state: 'UF',
  emergencyName: 'Contato de emergência',
  emergencyRelation: 'Parentesco',
  emergencyPhone: 'Telefone de emergência',
}

const emptyForm = (): PersonalDataForm => ({
  name: '',
  birthDate: '',
  sex: 'Feminino',
  cpf: '',
  phone: '',
  email: '',
  profession: '',
  convenio: false,
  convenioCarteirinha: '',
  convenioProduto: '',
  cep: '',
  street: '',
  addressNumber: '',
  neighborhood: '',
  city: '',
  state: '',
  emergencyName: '',
  emergencyRelation: '',
  emergencyPhone: '',
})

type PersonalDataPanelProps = {
  student?: Student
  hasSignedContract?: boolean
  mode?: 'edit' | 'create'
  onSave?: (patch: UpdateStudentInput) => Promise<unknown>
  onCreate?: (input: CreateStudentInput) => Promise<unknown>
  onCancelCreate?: () => void
  onUpdateNotes?: (notes: string) => void
}

function toForm(student: Student): PersonalDataForm {
  return {
    name: student.name,
    birthDate: student.birthDate,
    sex: student.sex,
    cpf: student.cpf,
    phone: student.phone,
    email: student.email,
    profession: student.profession ?? '',
    convenio: Boolean(student.convenio),
    convenioCarteirinha: student.convenioCarteirinha ?? '',
    convenioProduto: student.convenioProduto ?? '',
    cep: student.cep,
    street: student.street,
    addressNumber: student.addressNumber,
    neighborhood: student.neighborhood,
    city: student.city,
    state: student.state,
    emergencyName: student.emergencyName,
    emergencyRelation: student.emergencyRelation,
    emergencyPhone: student.emergencyPhone,
  }
}

function validatePersonalData(form: PersonalDataForm): FieldErrors {
  const errors: FieldErrors = {}

  if (form.name.trim().length < 2) {
    errors.name = form.name.trim()
      ? 'Informe o nome completo'
      : 'Preencha este campo'
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate.trim())) {
    errors.birthDate = 'Preencha este campo'
  }
  if (!form.sex.trim()) {
    errors.sex = 'Selecione o sexo'
  }
  if (onlyDigits(form.cpf).length !== 11) {
    errors.cpf = form.cpf.trim()
      ? 'CPF incompleto'
      : 'Preencha este campo'
  }
  if (onlyDigits(form.phone).length < 10) {
    errors.phone = form.phone.trim()
      ? 'Telefone incompleto'
      : 'Preencha este campo'
  }
  if (!form.email.trim()) {
    errors.email = 'Preencha este campo'
  } else if (!form.email.trim().includes('@')) {
    errors.email = 'E-mail inválido'
  }
  if (onlyDigits(form.cep).length !== 8) {
    errors.cep = form.cep.trim() ? 'CEP incompleto' : 'Preencha este campo'
  }
  if (!form.street.trim()) errors.street = 'Preencha este campo'
  if (!form.addressNumber.trim()) errors.addressNumber = 'Preencha este campo'
  if (!form.neighborhood.trim()) errors.neighborhood = 'Preencha este campo'
  if (!form.city.trim()) errors.city = 'Preencha este campo'
  if (form.state.trim().length !== 2) {
    errors.state = form.state.trim() ? 'UF inválida' : 'Preencha este campo'
  }
  if (!form.emergencyName.trim()) {
    errors.emergencyName = 'Preencha este campo'
  }
  if (!form.emergencyRelation.trim()) {
    errors.emergencyRelation = 'Preencha este campo'
  }
  if (onlyDigits(form.emergencyPhone).length < 10) {
    errors.emergencyPhone = form.emergencyPhone.trim()
      ? 'Telefone incompleto'
      : 'Preencha este campo'
  }

  return errors
}

function buildPayload(form: PersonalDataForm) {
  const address = composeAddress(form)
  const emergencyContact = composeEmergencyContact({
    name: form.emergencyName,
    relation: form.emergencyRelation,
    phone: form.emergencyPhone,
  })
  return {
    name: form.name.trim(),
    birthDate: form.birthDate.trim(),
    sex: form.sex,
    cpf: form.cpf,
    phone: form.phone,
    email: form.email.trim(),
    profession: form.profession.trim(),
    convenio: form.convenio,
    convenioCarteirinha: form.convenio ? form.convenioCarteirinha.trim() : '',
    convenioProduto: form.convenio ? form.convenioProduto.trim() : '',
    cep: form.cep,
    street: form.street.trim(),
    addressNumber: form.addressNumber.trim(),
    neighborhood: form.neighborhood.trim(),
    city: form.city.trim(),
    state: form.state.trim().toUpperCase(),
    address,
    emergencyName: form.emergencyName.trim(),
    emergencyRelation: form.emergencyRelation.trim(),
    emergencyPhone: form.emergencyPhone.trim(),
    emergencyContact,
    usesPilates: true,
    usesClinic: true,
  }
}

function ReadOnlyField({
  label,
  value,
  className,
}: {
  label: string
  value: string | null | undefined
  className?: string
}) {
  const text = typeof value === 'string' ? value : value == null ? '' : String(value)
  const empty = !text.trim()
  return (
    <div className={cn('flex flex-col gap-0.5 py-2', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-sm break-words whitespace-pre-wrap',
          empty ? 'italic text-muted-foreground' : 'text-foreground',
        )}
      >
        {empty ? '—' : text}
      </dd>
    </div>
  )
}

export function PersonalDataPanel({
  student,
  hasSignedContract = false,
  mode = 'edit',
  onSave,
  onCreate,
  onCancelCreate,
  onUpdateNotes,
}: PersonalDataPanelProps) {
  const isCreate = mode === 'create'
  const [editing, setEditing] = useState(isCreate)
  const [form, setForm] = useState<PersonalDataForm>(() =>
    student ? toForm(student) : emptyForm(),
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isCreate || !student) return
    if (!editing) {
      setForm(toForm(student))
      setFieldErrors({})
    }
  }, [student, editing, isCreate])

  function startEdit() {
    if (!student) return
    setForm(toForm(student))
    setFieldErrors({})
    setEditing(true)
  }

  function cancelEdit() {
    if (isCreate) {
      onCancelCreate?.()
      return
    }
    if (!student) return
    setForm(toForm(student))
    setFieldErrors({})
    setEditing(false)
  }

  function clearFieldError(key: FieldKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function update<K extends FieldKey>(key: K, value: PersonalDataForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    clearFieldError(key)
  }

  function updateAddressPart<
    K extends
      | 'street'
      | 'addressNumber'
      | 'neighborhood'
      | 'city'
      | 'state'
      | 'cep',
  >(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    clearFieldError(key)
  }

  async function handleCepChange(raw: string) {
    const masked = maskCep(raw)
    setForm((prev) => ({
      ...prev,
      cep: masked,
      addressNumber: '',
    }))
    clearFieldError('cep')
    clearFieldError('addressNumber')
    if (onlyDigits(masked).length !== 8) return

    const found = await lookupCep(masked)
    if (!found) {
      toast.info('CEP não localizado', {
        description: 'Preencha rua, bairro, cidade, UF e o número.',
      })
      return
    }

    setForm((prev) => ({
      ...prev,
      street: found.street || prev.street,
      addressNumber: '',
      neighborhood: found.neighborhood || prev.neighborhood,
      city: found.city || prev.city,
      state: found.state || prev.state,
    }))
    clearFieldError('street')
    clearFieldError('neighborhood')
    clearFieldError('city')
    clearFieldError('state')
    toast.success('Endereço preenchido pelo CEP', {
      description: 'Informe o número do endereço.',
    })
  }

  async function handleSave() {
    if (saving) return

    const errors = validatePersonalData(form)
    setFieldErrors(errors)

    const missingKeys = Object.keys(errors) as FieldKey[]
    if (missingKeys.length > 0) {
      const labels = missingKeys.map(
        (key) =>
          (FIELD_LABELS as Partial<Record<FieldKey, string>>)[key] ?? key,
      )
      toast.error('Preencha os campos obrigatórios', {
        description:
          labels.length <= 4
            ? labels.join(', ')
            : `${labels.slice(0, 3).join(', ')} e mais ${labels.length - 3}`,
      })
      const firstId = fieldDomId(missingKeys[0])
      if (firstId) {
        document.getElementById(firstId)?.focus()
      }
      return
    }

    setSaving(true)
    try {
      const payload = buildPayload(form)
      if (isCreate) {
        if (!onCreate) throw new Error('Cadastro indisponível')
        await onCreate(payload)
        toast.success('Pessoa cadastrada')
      } else {
        if (!onSave) throw new Error('Salvar indisponível')
        await onSave(payload)
        toast.success('Dados pessoais atualizados')
        setEditing(false)
        setFieldErrors({})
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isCreate
            ? 'Não foi possível cadastrar a pessoa'
            : 'Não foi possível salvar os dados',
      )
    } finally {
      setSaving(false)
    }
  }

  function fieldDomId(key: FieldKey): string | null {
    const map: Partial<Record<FieldKey, string>> = {
      name: 'personal-name',
      birthDate: 'personal-birth',
      cpf: 'personal-cpf',
      phone: 'personal-phone',
      email: 'personal-email',
      profession: 'personal-profession',
      convenio: 'personal-convenio',
      convenioCarteirinha: 'personal-convenio-carteirinha',
      convenioProduto: 'personal-convenio-produto',
      cep: 'personal-cep',
      addressNumber: 'personal-number',
      street: 'personal-street',
      neighborhood: 'personal-neighborhood',
      city: 'personal-city',
      state: 'personal-state',
      emergencyName: 'personal-emergency-name',
      emergencyRelation: 'personal-emergency-relation',
      emergencyPhone: 'personal-emergency-phone',
    }
    return map[key] ?? null
  }

  const latestAssessment = !isCreate && student
    ? [...student.assessments].sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined
  const latestImc = latestAssessment
    ? bmi(latestAssessment.weight, latestAssessment.height)
    : null
  const assessmentSeries =
    !isCreate && student
      ? [...student.assessments]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((a) => ({
            date: formatShortDate(a.date).slice(0, 5),
            peso: a.weight,
            imc: bmi(a.weight, a.height),
          }))
      : []

  return (
    <div className="flex flex-col gap-4">
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-end gap-2 space-y-0">
        {editing ? (
          <>
            {Object.keys(fieldErrors).length > 0 ? (
              <p className="mr-auto text-xs text-destructive">
                Campos destacados precisam ser preenchidos.
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving
                ? isCreate
                  ? 'Cadastrando…'
                  : 'Salvando…'
                : isCreate
                  ? 'Cadastrar pessoa'
                  : 'Salvar'}
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" onClick={startEdit}>
            <Pencil data-icon="inline-start" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <FieldGroup className="gap-4">
            <Field data-invalid={!!fieldErrors.name || undefined}>
              <FieldLabel htmlFor="personal-name">Nome completo</FieldLabel>
              <Input
                id="personal-name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                aria-invalid={!!fieldErrors.name || undefined}
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field data-invalid={!!fieldErrors.birthDate || undefined}>
                <FieldLabel htmlFor="personal-birth">Nascimento</FieldLabel>
                <Input
                  id="personal-birth"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => update('birthDate', e.target.value)}
                  aria-invalid={!!fieldErrors.birthDate || undefined}
                />
                <FieldError>{fieldErrors.birthDate}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.sex || undefined}>
                <FieldLabel>Sexo</FieldLabel>
                <Select
                  value={form.sex}
                  onValueChange={(v) => {
                    if (v) update('sex', v as Sex)
                  }}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!fieldErrors.sex || undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {sexes.map((sex) => (
                        <SelectItem key={sex} value={sex}>
                          {sex}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError>{fieldErrors.sex}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.cpf || undefined}>
                <FieldLabel htmlFor="personal-cpf">CPF</FieldLabel>
                <Input
                  id="personal-cpf"
                  value={form.cpf}
                  onChange={(e) => update('cpf', maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  aria-invalid={!!fieldErrors.cpf || undefined}
                />
                <FieldError>{fieldErrors.cpf}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.phone || undefined}>
                <FieldLabel htmlFor="personal-phone">Telefone</FieldLabel>
                <Input
                  id="personal-phone"
                  value={form.phone}
                  onChange={(e) => update('phone', maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                  aria-invalid={!!fieldErrors.phone || undefined}
                />
                <FieldError>{fieldErrors.phone}</FieldError>
              </Field>
              <Field
                className="sm:col-span-2"
                data-invalid={!!fieldErrors.email || undefined}
              >
                <FieldLabel htmlFor="personal-email">E-mail</FieldLabel>
                <Input
                  id="personal-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="email@exemplo.com"
                  aria-invalid={!!fieldErrors.email || undefined}
                />
                <FieldError>{fieldErrors.email}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="personal-profession">Profissão</FieldLabel>
                <Input
                  id="personal-profession"
                  value={form.profession}
                  onChange={(e) => update('profession', e.target.value)}
                  placeholder="Ex.: professora, aposentada"
                />
              </Field>
              <Field>
                <FieldLabel>Convênio</FieldLabel>
                <Select
                  value={form.convenio ? 'sim' : 'nao'}
                  onValueChange={(v) => {
                    const next = v === 'sim'
                    setForm((prev) => ({
                      ...prev,
                      convenio: next,
                      convenioCarteirinha: next ? prev.convenioCarteirinha : '',
                      convenioProduto: next ? prev.convenioProduto : '',
                    }))
                  }}
                >
                  <SelectTrigger className="w-full" id="personal-convenio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="nao">Não</SelectItem>
                      <SelectItem value="sim">Sim</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {form.convenio ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="personal-convenio-carteirinha">
                      Nº da carteirinha
                    </FieldLabel>
                    <Input
                      id="personal-convenio-carteirinha"
                      value={form.convenioCarteirinha}
                      onChange={(e) =>
                        update('convenioCarteirinha', e.target.value)
                      }
                      placeholder="Número da carteirinha"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="personal-convenio-produto">
                      Produto
                    </FieldLabel>
                    <Input
                      id="personal-convenio-produto"
                      value={form.convenioProduto}
                      onChange={(e) =>
                        update('convenioProduto', e.target.value)
                      }
                      placeholder="Ex.: Unimed Empresarial"
                    />
                  </Field>
                </>
              ) : null}
              <Field data-invalid={!!fieldErrors.cep || undefined}>
                <FieldLabel htmlFor="personal-cep">CEP</FieldLabel>
                <Input
                  id="personal-cep"
                  value={form.cep}
                  onChange={(e) => void handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  inputMode="numeric"
                  aria-invalid={!!fieldErrors.cep || undefined}
                />
                <FieldError>{fieldErrors.cep}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Situação</FieldLabel>
                <div className="flex h-8 items-center">
                  <ActiveBadge active={hasSignedContract} />
                </div>
              </Field>
              <Field>
                <FieldLabel>Cadastrado desde</FieldLabel>
                <Input
                  readOnly
                  value={
                    hasSignedContract && student
                      ? formatShortDate(student.since)
                      : '—'
                  }
                  className="bg-muted"
                />
              </Field>
              <Field data-invalid={!!fieldErrors.addressNumber || undefined}>
                <FieldLabel htmlFor="personal-number">Número</FieldLabel>
                <Input
                  id="personal-number"
                  value={form.addressNumber}
                  onChange={(e) =>
                    updateAddressPart('addressNumber', e.target.value)
                  }
                  placeholder="Ex.: 609"
                  aria-invalid={!!fieldErrors.addressNumber || undefined}
                />
                <FieldError>{fieldErrors.addressNumber}</FieldError>
              </Field>
              <Field
                className="sm:col-span-2 lg:col-span-3"
                data-invalid={!!fieldErrors.street || undefined}
              >
                <FieldLabel htmlFor="personal-street">Rua</FieldLabel>
                <Input
                  id="personal-street"
                  value={form.street}
                  onChange={(e) => updateAddressPart('street', e.target.value)}
                  placeholder="Nome da rua"
                  aria-invalid={!!fieldErrors.street || undefined}
                />
                <FieldError>{fieldErrors.street}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.neighborhood || undefined}>
                <FieldLabel htmlFor="personal-neighborhood">Bairro</FieldLabel>
                <Input
                  id="personal-neighborhood"
                  value={form.neighborhood}
                  onChange={(e) =>
                    updateAddressPart('neighborhood', e.target.value)
                  }
                  aria-invalid={!!fieldErrors.neighborhood || undefined}
                />
                <FieldError>{fieldErrors.neighborhood}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.city || undefined}>
                <FieldLabel htmlFor="personal-city">Cidade</FieldLabel>
                <Input
                  id="personal-city"
                  value={form.city}
                  onChange={(e) => updateAddressPart('city', e.target.value)}
                  aria-invalid={!!fieldErrors.city || undefined}
                />
                <FieldError>{fieldErrors.city}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.state || undefined}>
                <FieldLabel htmlFor="personal-state">UF</FieldLabel>
                <Input
                  id="personal-state"
                  value={form.state}
                  onChange={(e) =>
                    updateAddressPart(
                      'state',
                      e.target.value.toUpperCase().slice(0, 2),
                    )
                  }
                  placeholder="SP"
                  maxLength={2}
                  aria-invalid={!!fieldErrors.state || undefined}
                />
                <FieldError>{fieldErrors.state}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.emergencyName || undefined}>
                <FieldLabel htmlFor="personal-emergency-name">
                  Contato de emergência
                </FieldLabel>
                <Input
                  id="personal-emergency-name"
                  value={form.emergencyName}
                  onChange={(e) => update('emergencyName', e.target.value)}
                  placeholder="Nome completo"
                  aria-invalid={!!fieldErrors.emergencyName || undefined}
                />
                <FieldError>{fieldErrors.emergencyName}</FieldError>
              </Field>
              <Field
                data-invalid={!!fieldErrors.emergencyRelation || undefined}
              >
                <FieldLabel htmlFor="personal-emergency-relation">
                  Parentesco
                </FieldLabel>
                <Input
                  id="personal-emergency-relation"
                  value={form.emergencyRelation}
                  onChange={(e) =>
                    update('emergencyRelation', e.target.value)
                  }
                  placeholder="Ex.: mãe, cônjuge"
                  aria-invalid={!!fieldErrors.emergencyRelation || undefined}
                />
                <FieldError>{fieldErrors.emergencyRelation}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.emergencyPhone || undefined}>
                <FieldLabel htmlFor="personal-emergency-phone">
                  Telefone de emergência
                </FieldLabel>
                <Input
                  id="personal-emergency-phone"
                  value={form.emergencyPhone}
                  onChange={(e) =>
                    update('emergencyPhone', maskPhone(e.target.value))
                  }
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                  aria-invalid={!!fieldErrors.emergencyPhone || undefined}
                />
                <FieldError>{fieldErrors.emergencyPhone}</FieldError>
              </Field>
            </div>
          </FieldGroup>
        ) : student ? (
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnlyField label="Nome completo" value={student.name} />
            <ReadOnlyField
              label="Data de nascimento"
              value={formatShortDate(student.birthDate)}
            />
            <ReadOnlyField label="Sexo" value={student.sex} />
            <ReadOnlyField label="CPF" value={student.cpf} />
            <ReadOnlyField label="Telefone" value={student.phone} />
            <ReadOnlyField label="E-mail" value={student.email} />
            <ReadOnlyField label="Profissão" value={student.profession} />
            <ReadOnlyField
              label="Convênio"
              value={student.convenio ? 'Sim' : 'Não'}
            />
            {student.convenio ? (
              <>
                <ReadOnlyField
                  label="Nº da carteirinha"
                  value={student.convenioCarteirinha}
                />
                <ReadOnlyField
                  label="Produto"
                  value={student.convenioProduto}
                />
              </>
            ) : null}
            <ReadOnlyField label="CEP" value={student.cep} />
            <div className="flex flex-col gap-0.5 py-2">
              <dt className="text-xs text-muted-foreground">Situação</dt>
              <dd className="flex items-center pt-1">
                <ActiveBadge active={hasSignedContract} />
              </dd>
            </div>
            <ReadOnlyField
              label="Cadastrado desde"
              value={
                hasSignedContract ? formatShortDate(student.since) : '—'
              }
            />
            <ReadOnlyField
              label="Rua"
              value={student.street}
              className="sm:col-span-2"
            />
            <ReadOnlyField label="Número" value={student.addressNumber} />
            <ReadOnlyField label="Bairro" value={student.neighborhood} />
            <ReadOnlyField label="Cidade" value={student.city} />
            <ReadOnlyField label="UF" value={student.state} />
            <ReadOnlyField
              label="Contato de emergência"
              value={student.emergencyName}
            />
            <ReadOnlyField
              label="Parentesco"
              value={student.emergencyRelation}
            />
            <ReadOnlyField
              label="Telefone de emergência"
              value={student.emergencyPhone}
            />
          </dl>
        ) : null}
      </CardContent>
    </Card>

    {!isCreate && student && onUpdateNotes ? (
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <InlineField
              label="Observações"
              value={student.notes}
              type="textarea"
              onSave={onUpdateNotes}
              className="py-0 [&_dt]:sr-only"
            />
          </dl>
        </CardContent>
      </Card>
    ) : null}

    {!isCreate && student ? (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Visão geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Peso atual</span>
                <span className="text-2xl font-semibold">
                  {latestAssessment ? `${latestAssessment.weight} kg` : '—'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">IMC</span>
                <span className="text-2xl font-semibold">{latestImc ?? '—'}</span>
                {latestImc != null ? (
                  <span className="text-xs text-muted-foreground">
                    {bmiLabel(latestImc)}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  Gordura / Massa muscular
                </span>
                <span className="text-2xl font-semibold">
                  {latestAssessment?.bodyFat
                    ? `${latestAssessment.bodyFat}%`
                    : '—'}
                  {latestAssessment?.muscleMass ? (
                    <span className="text-base font-normal text-muted-foreground">
                      {' '}
                      · {latestAssessment.muscleMass} kg
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {assessmentSeries.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>Evolução de peso e IMC</CardTitle>
              <CardDescription>
                Histórico das avaliações registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={weightImcChartConfig}
                className="h-[240px] w-full"
              >
                <LineChart
                  data={assessmentSeries}
                  margin={{ left: 4, right: 8, top: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
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
    ) : null}
    </div>
  )
}
