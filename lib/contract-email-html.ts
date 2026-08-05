import type { Contract, PlanPeriod, StudioProfile } from '@/lib/data'
import {
  formatCurrency,
  formatShortDate,
  isMinor,
  planPeriodMonths,
  toIsoDate,
} from '@/lib/data'

export type ContractEmailStudent = {
  name: string
  birthDate: string
  cpf: string
  phone: string
  email: string
  cep?: string
  street?: string
  addressNumber?: string
  neighborhood?: string
  city?: string
  state?: string
  address?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function studentAddress(student: ContractEmailStudent) {
  return (
    student.address?.trim() ||
    [
      [student.street, student.addressNumber].filter(Boolean).join(', '),
      student.neighborhood,
      [student.city, student.state].filter(Boolean).join('/'),
      student.cep,
    ]
      .filter(Boolean)
      .join(' — ') ||
    '—'
  )
}

function clausesDocument(clauses: string[]) {
  return clauses.join('\n\n').trim()
}

export function buildContractEmailHtml(input: {
  contract: Contract
  student: ContractEmailStudent
  studio: StudioProfile | null
  planPrice: number
  planPeriod?: PlanPeriod | null
  signingUrl?: string
}) {
  const { contract, student, studio, planPrice, planPeriod, signingUrl } = input
  const studioName = studio?.name ?? 'Estúdio'
  const generatedBy = studio?.owner?.trim() || '—'
  const studentIsMinor = isMinor(student.birthDate)
  const months = planPeriod ? planPeriodMonths(planPeriod) : null
  const vigenciaLabel = [
    `${formatShortDate(contract.startDate)} a ${formatShortDate(contract.endDate)}`,
    months ? `${months} ${months === 1 ? 'mês' : 'meses'}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const discountLabel =
    contract.discountPercent > 0
      ? `${contract.discountPercent}%`
      : 'Não aplicável'
  const arquivo = clausesDocument(contract.clauses)
  const signatureLabel = studentIsMinor
    ? contract.financialResponsible || student.name
    : student.name
  const signatureRole = studentIsMinor
    ? 'RESPONSÁVEL / CONTRATANTE'
    : 'CONTRATANTE'
  const body = arquivo
    ? escapeHtml(arquivo).replaceAll('\n', '<br/>')
    : 'Não há texto no arquivo do contrato.'
  const signingBlock = signingUrl
    ? `<p style="margin:12px 0;padding:12px;border:1px solid #222;background:#f7f7f7;font-size:11pt;">
  Para assinar eletronicamente, acesse:<br/>
  <a href="${escapeHtml(signingUrl)}">${escapeHtml(signingUrl)}</a>
</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.35;color:#111;max-width:720px;margin:0 auto;padding:16px;">
  <p>Olá ${escapeHtml(student.name)},</p>
  <p>Segue o contrato <strong>${escapeHtml(contract.number)}</strong> para sua conferência.</p>
  ${signingBlock}
  <hr style="border:none;border-top:1px solid #ccc;margin:16px 0;" />

  <h1 style="font-size:12pt;text-align:center;text-transform:uppercase;letter-spacing:0.03em;">Contrato de prestação de serviços</h1>

  <p style="font-size:11pt;">
    Pelo presente instrumento particular, as partes abaixo qualificadas celebram
    o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas
    e condições seguintes.
  </p>

  <h2 style="font-size:11pt;text-transform:uppercase;border-bottom:1px solid #222;padding-bottom:2px;">I — Qualificação das partes</h2>
  <p style="font-size:10pt;margin:4px 0;"><strong>Contratado</strong><br/>
  Nome: ${escapeHtml(studioName)}<br/>
  Responsável: ${escapeHtml(studio?.owner || '—')}<br/>
  CNPJ: ${escapeHtml(studio?.cnpj || '—')}<br/>
  Endereço: ${escapeHtml(studio?.address || '—')}<br/>
  Telefone: ${escapeHtml(studio?.phone || '—')}<br/>
  E-mail: ${escapeHtml(studio?.email || '—')}
  </p>
  <p style="font-size:10pt;margin:4px 0;"><strong>Contratante</strong><br/>
  Aluno: ${escapeHtml(student.name)}<br/>
  CPF: ${escapeHtml(student.cpf || '—')}<br/>
  Nascimento: ${escapeHtml(formatShortDate(student.birthDate))}<br/>
  Endereço: ${escapeHtml(studentAddress(student))}<br/>
  Telefone: ${escapeHtml(student.phone || '—')}<br/>
  E-mail: ${escapeHtml(student.email || '—')}
  ${
    studentIsMinor
      ? `<br/>Responsável financeiro: ${escapeHtml(contract.financialResponsible)}`
      : ''
  }
  </p>

  <h2 style="font-size:11pt;text-transform:uppercase;border-bottom:1px solid #222;padding-bottom:2px;">II — Condições comerciais</h2>
  <p style="font-size:10pt;margin:4px 0;">
  Plano / modalidade: ${escapeHtml(contract.planLabel)}<br/>
  Vigência: ${escapeHtml(vigenciaLabel)}<br/>
  Valor do plano: ${escapeHtml(formatCurrency(planPrice))}<br/>
  Desconto: ${escapeHtml(discountLabel)}<br/>
  Valor final mensal: ${escapeHtml(formatCurrency(contract.monthlyValue))}<br/>
  Dia de vencimento: Dia ${contract.dueDay}<br/>
  Forma de pagamento: ${escapeHtml(contract.paymentMethod)}<br/>
  Multa / juros: ${contract.lateFeePercent}% / ${contract.interestPercent}% a.m.
  </p>

  <h2 style="font-size:11pt;text-transform:uppercase;border-bottom:1px solid #222;padding-bottom:2px;">III — Cláusulas contratuais</h2>
  <div style="font-size:10pt;text-align:justify;">${body}</div>

  <p style="font-size:10pt;margin-top:12px;">
    E, por estarem justas e contratadas, as partes firmam o presente instrumento
    em duas vias de igual teor e forma, para um só efeito.
  </p>

  <p style="font-size:10pt;margin-top:24px;text-align:center;">
    _______________________________<br/><strong>${escapeHtml(studioName)}</strong><br/>CONTRATADO
  </p>
  <p style="font-size:10pt;margin-top:24px;text-align:center;">
    _______________________________<br/><strong>${escapeHtml(signatureLabel)}</strong><br/>${signatureRole}
  </p>

  <p style="font-size:8pt;color:#444;text-align:center;margin-top:20px;border-top:1px solid #999;padding-top:8px;">
    Documento gerado por ${escapeHtml(generatedBy)} em ${escapeHtml(formatShortDate(toIsoDate(new Date())))}.
  </p>
</body>
</html>`
}

export function buildContractEmailText(input: {
  contract: Contract
  student: ContractEmailStudent
  studio: StudioProfile | null
  planPrice: number
  planPeriod?: PlanPeriod | null
  signingUrl?: string
}) {
  const { contract, student, studio, planPrice, planPeriod, signingUrl } = input
  const months = planPeriod ? planPeriodMonths(planPeriod) : null
  const vigenciaLabel = [
    `${formatShortDate(contract.startDate)} a ${formatShortDate(contract.endDate)}`,
    months ? `${months} ${months === 1 ? 'mês' : 'meses'}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return [
    `Olá ${student.name},`,
    '',
    `Segue o contrato ${contract.number} para sua conferência.`,
    ...(signingUrl
      ? ['', `Para assinar eletronicamente, acesse:`, signingUrl]
      : []),
    '',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS',
    '',
    `Contratado: ${studio?.name ?? '—'}`,
    `Responsável: ${studio?.owner ?? '—'}`,
    `CNPJ: ${studio?.cnpj || '—'}`,
    '',
    `Contratante: ${student.name}`,
    `CPF: ${student.cpf || '—'}`,
    '',
    `Plano: ${contract.planLabel}`,
    `Vigência: ${vigenciaLabel}`,
    `Valor do plano: ${formatCurrency(planPrice)}`,
    `Valor final mensal: ${formatCurrency(contract.monthlyValue)}`,
    `Dia de vencimento: ${contract.dueDay}`,
    `Forma de pagamento: ${contract.paymentMethod}`,
    '',
    'Cláusulas:',
    clausesDocument(contract.clauses) || '—',
    '',
    studio?.name ?? 'HealthCore',
  ].join('\n')
}
