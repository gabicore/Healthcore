import { handleRouteError, apiOk } from '@/lib/api'
import { requireSession } from '@/lib/auth/session'
import { getMe } from '@/lib/auth/services/user-service'

export async function GET() {
  try {
    const session = await requireSession()
    const user = await getMe(session.user.id)
    return apiOk(user)
  } catch (error) {
    return handleRouteError(error)
  }
}
