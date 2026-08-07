'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { InlineField } from '@/components/students/inline-field'
import {
  CLINICAL_ALERT_SUGGESTIONS,
  formatClinicalAlert,
  isSameClinicalAlert,
  normalizeClinicalAlertInput,
  parseClinicalAlerts,
} from '@/lib/clinical-alerts'
import type { Student } from '@/lib/data'
import type { UpdateStudentInput } from '@/lib/validations/student'

type ClinicalHistoryPanelProps = {
  student: Student
  onUpdateField: <K extends keyof Student>(key: K, value: Student[K]) => void
}

function upsertAlert(current: string[], raw: string): string[] {
  const label = normalizeClinicalAlertInput(raw)
  if (!label) return parseClinicalAlerts(current)
  const existing = parseClinicalAlerts(current)
  if (existing.some((a) => isSameClinicalAlert(a, label))) {
    return existing
  }
  return [...existing, label]
}

function removeAlert(current: string[], label: string): string[] {
  return parseClinicalAlerts(current).filter(
    (a) => !isSameClinicalAlert(a, label),
  )
}

export function ClinicalHistoryPanel({
  student,
  onUpdateField,
}: ClinicalHistoryPanelProps) {
  const alerts = parseClinicalAlerts(student.clinicalAlerts)
  const [writingOther, setWritingOther] = useState(false)
  const [otherText, setOtherText] = useState('')
  const availableSuggestions = CLINICAL_ALERT_SUGGESTIONS.filter(
    (suggestion) => !alerts.some((a) => isSameClinicalAlert(a, suggestion)),
  )

  function saveAlerts(next: string[]) {
    onUpdateField('clinicalAlerts', next)
  }

  function resetOther() {
    setWritingOther(false)
    setOtherText('')
  }

  function addOther() {
    const next = upsertAlert(alerts, otherText)
    if (next.length === alerts.length) return
    saveAlerts(next)
    resetOther()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Alertas clínicos</CardTitle>
          <CardDescription>
            Destaques críticos que podem alterar a conduta antes do atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {alerts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {alerts.map((alert) => (
                <Badge
                  key={alert}
                  variant="outline"
                  className="gap-1 border-transparent bg-chart-3/20 pr-1 font-normal text-chart-3"
                >
                  {formatClinicalAlert(alert)}
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-chart-3/20"
                    aria-label={`Remover alerta ${alert}`}
                    onClick={() => saveAlerts(removeAlert(alerts, alert))}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}

          {writingOther ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Descreva o alerta crítico"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addOther()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    resetOther()
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!otherText.trim()}
                  onClick={addOther}
                >
                  <Plus data-icon="inline-start" />
                  Adicionar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetOther}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline" size="sm">
                    <Plus data-icon="inline-start" />
                    Adicionar alerta
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="min-w-56">
                {availableSuggestions.length > 0 ? (
                  <>
                    <DropdownMenuGroup>
                      {availableSuggestions.map((suggestion) => (
                        <DropdownMenuItem
                          key={suggestion}
                          onClick={() =>
                            saveAlerts(upsertAlert(alerts, suggestion))
                          }
                        >
                          {suggestion}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      setWritingOther(true)
                      setOtherText('')
                    }}
                  >
                    Outro alerta crítico…
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condições de saúde</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <InlineField
              label="Patologias"
              value={student.pathologies}
              type="textarea"
              onSave={(v) => onUpdateField('pathologies', v)}
            />
            <InlineField
              label="Alergias"
              value={student.allergies}
              type="textarea"
              onSave={(v) => onUpdateField('allergies', v)}
            />
            <InlineField
              label="Medicamentos"
              value={student.medications}
              type="textarea"
              onSave={(v) => onUpdateField('medications', v)}
            />
            <InlineField
              label="Cirurgias"
              value={student.surgeries}
              type="textarea"
              onSave={(v) => onUpdateField('surgeries', v)}
            />
            <InlineField
              label="Implantes / dispositivos"
              value={student.implants}
              type="textarea"
              placeholder="Prótese, marcapasso, DIU, pinos, placas…"
              onSave={(v) => onUpdateField('implants', v)}
              className="sm:col-span-2"
            />
            <InlineField
              label="Restrições"
              value={student.restrictions}
              type="textarea"
              onSave={(v) => onUpdateField('restrictions', v)}
            />
            <InlineField
              label="Lesões"
              value={student.injuries}
              type="textarea"
              onSave={(v) => onUpdateField('injuries', v)}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hábitos de vida</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <InlineField
              label="Atividade física"
              value={student.physicalActivity}
              type="textarea"
              onSave={(v) => onUpdateField('physicalActivity', v)}
            />
            <InlineField
              label="Hidratação"
              value={student.hydration}
              type="textarea"
              onSave={(v) => onUpdateField('hydration', v)}
            />
            <InlineField
              label="Tabagismo"
              value={student.smoking}
              type="textarea"
              onSave={(v) => onUpdateField('smoking', v)}
            />
            <InlineField
              label="Etilismo"
              value={student.alcoholUse}
              type="textarea"
              onSave={(v) => onUpdateField('alcoholUse', v)}
            />
            <InlineField
              label="Profissão"
              value={student.profession}
              onSave={(v) => onUpdateField('profession', v)}
            />
            <InlineField
              label="Carga horária de trabalho"
              value={student.workHours}
              placeholder="Ex.: 8h/dia"
              onSave={(v) => onUpdateField('workHours', v)}
            />
            <InlineField
              label="Postura / ocupação"
              value={student.workPosture}
              type="textarea"
              placeholder="Ex.: sentada em computador, fica em pé…"
              onSave={(v) => onUpdateField('workPosture', v)}
              className="sm:col-span-2"
            />
            <InlineField
              label="Sono — horas por noite"
              value={student.sleepHours}
              placeholder="Ex.: 6–7h"
              onSave={(v) => onUpdateField('sleepHours', v)}
            />
            <InlineField
              label="Sono — qualidade"
              value={student.sleepQuality}
              type="textarea"
              onSave={(v) => onUpdateField('sleepQuality', v)}
            />
            <InlineField
              label="Insônia"
              value={student.insomnia}
              type="textarea"
              onSave={(v) => onUpdateField('insomnia', v)}
              className="sm:col-span-2"
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico terapêutico</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <InlineField
              label="Tratamentos anteriores"
              value={student.previousTreatments}
              type="textarea"
              onSave={(v) => onUpdateField('previousTreatments', v)}
            />
            <InlineField
              label="Frequência dos tratamentos anteriores"
              value={student.previousTreatmentFrequency}
              type="textarea"
              placeholder="Ex.: 2x por semana"
              onSave={(v) => onUpdateField('previousTreatmentFrequency', v)}
            />
            <InlineField
              label="Resultados obtidos"
              value={student.treatmentResults}
              type="textarea"
              onSave={(v) => onUpdateField('treatmentResults', v)}
            />
            <InlineField
              label="Interrupções do tratamento"
              value={student.treatmentInterruptions}
              type="textarea"
              onSave={(v) => onUpdateField('treatmentInterruptions', v)}
            />
            <InlineField
              label="Resposta aos tratamentos"
              value={student.treatmentResponse}
              type="textarea"
              onSave={(v) => onUpdateField('treatmentResponse', v)}
            />
            <InlineField
              label="Motivo da alta"
              value={student.dischargeReason}
              type="textarea"
              onSave={(v) => onUpdateField('dischargeReason', v)}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>
            Referências a exames e laudos (texto ou links)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <InlineField
              label="Exames"
              value={student.exams}
              type="textarea"
              onSave={(v) => onUpdateField('exams', v)}
            />
            <InlineField
              label="Laudos"
              value={student.medicalReports}
              type="textarea"
              onSave={(v) => onUpdateField('medicalReports', v)}
            />
            <InlineField
              label="Ressonâncias"
              value={student.mriExams}
              type="textarea"
              onSave={(v) => onUpdateField('mriExams', v)}
            />
            <InlineField
              label="Radiografias"
              value={student.xrayExams}
              type="textarea"
              onSave={(v) => onUpdateField('xrayExams', v)}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

/** Tipagem auxiliar para patches de histórico clínico. */
export type ClinicalHistoryUpdateKey = Extract<
  keyof UpdateStudentInput,
  | 'pathologies'
  | 'allergies'
  | 'medications'
  | 'surgeries'
  | 'implants'
  | 'clinicalAlerts'
  | 'physicalActivity'
  | 'hydration'
  | 'smoking'
  | 'alcoholUse'
  | 'profession'
  | 'workHours'
  | 'workPosture'
  | 'sleepHours'
  | 'sleepQuality'
  | 'insomnia'
  | 'previousTreatments'
  | 'previousTreatmentFrequency'
  | 'treatmentResults'
  | 'treatmentInterruptions'
  | 'treatmentResponse'
  | 'dischargeReason'
  | 'restrictions'
  | 'injuries'
  | 'exams'
  | 'medicalReports'
  | 'mriExams'
  | 'xrayExams'
>
