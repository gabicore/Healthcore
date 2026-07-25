import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

/**
 * Diagnóstico temporário de conexão (não expõe a senha).
 * Remover após o deploy estabilizar.
 * GET /api/health/db
 */
export async function GET() {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    return NextResponse.json(
      {
        ok: false,
        error: 'DATABASE_URL não definida no ambiente',
      },
      { status: 500 },
    )
  }

  let parsed: { host: string; user: string; db: string; port: string }
  try {
    const u = new URL(raw.replace(/^mysql:\/\//, 'http://'))
    parsed = {
      host: u.hostname,
      user: decodeURIComponent(u.username),
      db: u.pathname.replace(/^\//, ''),
      port: u.port || '3306',
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'DATABASE_URL inválida (não foi possível fazer parse)',
        hint: 'Se a senha tem @ # : /, encode na URL (%40 para @)',
      },
      { status: 500 },
    )
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      ...parsed,
      hint:
        parsed.host === 'localhost' || parsed.host === '127.0.0.1'
          ? 'Host local — formato esperado no deploy Hostinger'
          : 'No deploy Hostinger use host localhost (não srvXXX.hstgr.io)',
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        ...parsed,
        error: error instanceof Error ? error.message : 'Falha na conexão',
        hint:
          'Se a senha contém @, na URL use %40. No servidor Hostinger o host deve ser localhost.',
      },
      { status: 500 },
    )
  }
}
