import { parseJson } from '@/lib/api-client'
import type { ClassSession, ScheduleSlot } from '@/lib/data'

export type WeekAgendaStudent = {
  id: string
  name: string
  active: boolean
  planId: string
  schedule: ScheduleSlot[]
  weeklyLimit: number
  contractStart: string
  contractEnd: string
}

export type WeekAgendaResponse = {
  sessions: ClassSession[]
  students: WeekAgendaStudent[]
}

export async function fetchWeekAgenda(
  from: string,
  to: string,
): Promise<WeekAgendaResponse> {
  const search = new URLSearchParams({ from, to })
  const response = await fetch(`/api/agenda?${search.toString()}`, {
    cache: 'no-store',
  })
  return parseJson<WeekAgendaResponse>(response)
}

export async function fetchStudentSessions(
  studentId: string,
  params?: { from?: string; to?: string; types?: string[] },
): Promise<ClassSession[]> {
  const search = new URLSearchParams()
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  if (params?.types?.length) search.set('types', params.types.join(','))
  const qs = search.toString()
  const response = await fetch(
    `/api/alunos/${studentId}/aulas${qs ? `?${qs}` : ''}`,
    { cache: 'no-store' },
  )
  return parseJson<ClassSession[]>(response)
}

export async function createStudentSession(
  studentId: string,
  input: {
    date: string
    time: string
    type?: ClassSession['type']
    status?: ClassSession['status']
    notes?: string
    professionalId?: string
  },
): Promise<ClassSession> {
  const response = await fetch(`/api/alunos/${studentId}/aulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<ClassSession>(response)
}

export async function updateStudentSession(
  studentId: string,
  sessionId: string,
  input: {
    status?: ClassSession['status']
    notes?: string | null
    date?: string
    time?: string
  },
): Promise<ClassSession> {
  const response = await fetch(
    `/api/alunos/${studentId}/aulas/${sessionId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return parseJson<ClassSession>(response)
}

export async function upsertFixedStudentSession(
  studentId: string,
  input: {
    date: string
    time: string
    weekday: ClassSession['weekday']
    status: ClassSession['status']
    notes?: string | null
  },
): Promise<ClassSession> {
  const response = await fetch(`/api/alunos/${studentId}/aulas/fixa`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<ClassSession>(response)
}
