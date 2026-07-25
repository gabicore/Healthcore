export async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Falha na requisição',
    )
  }
  return data as T
}
