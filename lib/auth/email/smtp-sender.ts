import nodemailer from 'nodemailer'

import type { EmailPayload, EmailSender } from '@/lib/auth/email/types'

type SmtpConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
  secure?: boolean
}

export class SmtpEmailSender implements EmailSender {
  private readonly transporter: nodemailer.Transporter
  private readonly from: string

  constructor(config: SmtpConfig) {
    this.from = config.from
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    })
  }

  async send(payload: EmailPayload): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
  }
}
