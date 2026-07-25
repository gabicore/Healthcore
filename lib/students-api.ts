import type { Student } from '@/lib/data'
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from '@/lib/validations/student'

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Falha na requisição',
    )
  }
  return data as T
}

export async function fetchStudents(params?: {
  q?: string
  active?: boolean
}): Promise<Student[]> {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.active !== undefined) search.set('active', String(params.active))
  const qs = search.toString()
  const response = await fetch(`/api/alunos${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  })
  return parseJson<Student[]>(response)
}

export async function fetchStudent(id: string): Promise<Student> {
  const response = await fetch(`/api/alunos/${id}`, { cache: 'no-store' })
  return parseJson<Student>(response)
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<Student> {
  const response = await fetch('/api/alunos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Student>(response)
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput,
): Promise<Student> {
  const response = await fetch(`/api/alunos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Student>(response)
}

export async function deactivateStudent(id: string): Promise<Student> {
  const response = await fetch(`/api/alunos/${id}`, { method: 'DELETE' })
  return parseJson<Student>(response)
}
