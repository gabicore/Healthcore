import type { EmailPayload, EmailSender } from '@/lib/auth/email/types'

/** Fallback de desenvolvimento: não entrega na caixa de entrada. */
export class ConsoleEmailSender implements EmailSender {
  async send(payload: EmailPayload): Promise<void> {
    console.info('[email:console]', {
      to: payload.to,
      subject: payload.subject,
      text: payload.text ?? payload.html,
    })
  }
}

export const emailSender: EmailSender = new ConsoleEmailSender()
