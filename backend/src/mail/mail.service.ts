import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class MailService {
  private logger = new Logger('MailService')
  private apiKey = process.env.RESEND_API_KEY
  private from = process.env.MAIL_FROM || 'Board Live <onboarding@resend.dev>'

  async send(to: string, subject: string, html: string) {
    if (!this.apiKey) {
      this.logger.warn(`[email non envoyé, RESEND_API_KEY non configuré] À: ${to} — ${subject}`)
      return { sent: false }
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, html }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        this.logger.error(`Échec envoi email à ${to}: ${res.status} ${body}`)
        return { sent: false }
      }
      this.logger.log(`Email envoyé à ${to}: ${subject}`)
      return { sent: true }
    } catch (err) {
      this.logger.error(`Échec envoi email à ${to}`, err as Error)
      return { sent: false }
    }
  }

  async sendBoardInvite(to: string, boardTitle: string, inviterName: string, accountExists: boolean) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const link = accountExists ? `${frontendUrl}/boards` : `${frontendUrl}/login`
    const action = accountExists
      ? `${inviterName} vient de t'ajouter au tableau "${boardTitle}" sur Board Live.`
      : `${inviterName} t'invite à rejoindre le tableau "${boardTitle}" sur Board Live. Crée un compte avec cette adresse email pour y accéder.`

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#111;">Board Live</h2>
        <p style="color:#333; font-size: 15px; line-height: 1.6;">${action}</p>
        <a href="${link}" style="display:inline-block; margin-top:12px; background:#8b5cf6; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:600;">
          ${accountExists ? 'Ouvrir le tableau' : "Créer mon compte"}
        </a>
      </div>
    `
    return this.send(to, `Invitation au tableau "${boardTitle}"`, html)
  }

  async sendPasswordReset(to: string, resetLink: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#111;">Board Live</h2>
        <p style="color:#333; font-size: 15px; line-height: 1.6;">
          Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous (valable 1 heure).
          Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.
        </p>
        <a href="${resetLink}" style="display:inline-block; margin-top:12px; background:#8b5cf6; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:600;">
          Réinitialiser mon mot de passe
        </a>
      </div>
    `
    return this.send(to, 'Réinitialisation de ton mot de passe', html)
  }
}
