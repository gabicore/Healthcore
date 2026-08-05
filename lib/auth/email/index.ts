import { ConsoleEmailSender } from '@/lib/auth/email/console-sender'
import { ResendEmailSender } from '@/lib/auth/email/resend-sender'
import { SmtpEmailSender } from '@/lib/auth/email/smtp-sender'
import type { EmailSender } from '@/lib/auth/email/types'

export type EmailTransport = 'resend' | 'smtp' | 'console'

function defaultFrom() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    'HealthCore <onboarding@resend.dev>'
  )
}

export function resolveEmailTransport(): EmailTransport {
  if (process.env.RESEND_API_KEY?.trim()) return 'resend'
  if (process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim()) {
    return 'smtp'
  }
  return 'console'
}

export function createEmailSender(): EmailSender {
  const transport = resolveEmailTransport()
  const from = defaultFrom()

  if (transport === 'resend') {
    return new ResendEmailSender(process.env.RESEND_API_KEY!.trim(), from)
  }

  if (transport === 'smtp') {
    const port = Number(process.env.SMTP_PORT || 465)
    return new SmtpEmailSender({
      host: process.env.SMTP_HOST!.trim(),
      port,
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS ?? '',
      from,
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : port === 465,
    })
  }

  return new ConsoleEmailSender()
}

export const emailSender = createEmailSender()
