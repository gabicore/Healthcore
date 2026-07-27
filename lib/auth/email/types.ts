export type EmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailSender {
  send(payload: EmailPayload): Promise<void>
}
