import type { EmailPayload, EmailSender } from '@/lib/auth/email/types'

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(payload: EmailPayload): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `Falha ao enviar e-mail (Resend ${response.status}): ${body || response.statusText}`,
      )
    }
  }
}
