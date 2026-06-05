import { Resend } from 'resend'
import {
  getResendFromAddress,
  isResendConfigured,
  logEmailDebug,
} from '@/lib/email-config'

export type { EmailConfigStatus } from '@/lib/email-config'
export { getEmailConfigStatus, isEmailDebugEnabled, isResendConfigured } from '@/lib/email-config'

// Client Resend instancié paresseusement (évite erreur au build si clé absente).
let resendClient: Resend | null = null
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

async function sendEmail(params: {
  context: string
  to: string
  subject: string
  html: string
}): Promise<void> {
  const from = getResendFromAddress()

  if (!isResendConfigured()) {
    console.warn(`[email:${params.context}] RESEND_API_KEY absente — email non envoyé vers ${params.to}`)
    logEmailDebug(params.context, { skipped: true, to: params.to })
    return
  }

  logEmailDebug(params.context, { sending: true, to: params.to, from, subject: params.subject })

  const { data, error } = await getResend().emails.send({
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  })

  if (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: string }).message)
        : String(error)
    console.error(`[email:${params.context}] Erreur Resend:`, error)
    logEmailDebug(params.context, { failed: true, error: message })
    throw new Error(`Erreur Resend: ${message}`)
  }

  console.log(`[email:${params.context}] Envoyé à ${params.to}`, data?.id ? `(id: ${data.id})` : '')
  logEmailDebug(params.context, { sent: true, messageId: data?.id })
}

export async function sendInvitationEmail(
  to: string,
  workspaceName: string,
  token: string,
  inviterEmail?: string | null
): Promise<void> {
  const link = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invitations/${token}`
  const inviter = inviterEmail ? `${inviterEmail} vous a invité` : 'Vous êtes invité(e)'

  await sendEmail({
    context: 'invitation',
    to,
    subject: `Invitation à rejoindre ${workspaceName}`,
    html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f;">
          <div style="background: #1a1a1a; border-bottom: 1px solid #2a2a2a; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">NexKeep</h1>
            <p style="color: #a1a1aa; margin: 8px 0 0 0; font-size: 14px;">Invitation à collaborer</p>
          </div>
          <div style="padding: 32px 24px; background: #0f0f0f;">
            <p style="color: #ffffff; line-height: 1.6; font-size: 14px;">
              ${inviter} à rejoindre l'organisation <strong>${workspaceName}</strong> sur NexKeep.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${link}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 14px; font-weight: 600;">
                Rejoindre l'organisation
              </a>
            </div>
            <p style="color: #71717a; font-size: 13px; line-height: 1.5;">
              Si vous n'avez pas encore de compte, vous pourrez en créer un via ce lien.
            </p>
          </div>
          <div style="background: #1a1a1a; border-top: 1px solid #2a2a2a; padding: 20px 24px; text-align: center;">
            <p style="color: #71717a; margin: 0; font-size: 12px;">Email automatique - NexKeep</p>
          </div>
        </div>
      `,
  })
}

export async function sendReimbursementConfirmation(
  requesterEmail: string,
  requesterName: string,
  requestId: string
): Promise<void> {
  await sendEmail({
    context: 'reimbursement-confirmation',
    to: requesterEmail,
    subject: 'Confirmation de votre demande de remboursement',
    html: `
        <head>
          <style>
            .im { color: #ffffff !important; }
            p { color: #ffffff !important; }
            span { color: #ffffff !important; }
          </style>
        </head>
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f;">
          <div style="background: #1a1a1a; border-bottom: 1px solid #2a2a2a; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em;">NexKeep</h1>
            <p style="color: #a1a1aa; margin: 8px 0 0 0; font-size: 14px; font-weight: 400;">Confirmation de demande de remboursement</p>
          </div>
          
          <div style="padding: 32px 24px; background: #0f0f0f;">
            <h2 style="color: #ffffff; margin-bottom: 16px; font-size: 18px; font-weight: 600;">Bonjour ${requesterName},</h2>
            
            <p style="color: #ffffff !important; line-height: 1.6; margin-bottom: 24px; font-size: 14px;">
              <span style="color: #ffffff !important;">Votre demande de remboursement a été enregistrée avec succès.</span><br>
              <span style="color: #ffffff; font-weight: 500;">Référence : ${requestId}</span>
            </p>
            
            <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #22c55e; margin: 0 0 12px 0; font-size: 14px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 8px;">✓</span> Prochaines étapes
              </h3>
              <ul style="color: #a1a1aa; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.5;">
                <li style="margin-bottom: 4px;">Vérification de votre demande (2-3 jours ouvrés)</li>
                <li style="margin-bottom: 4px;">Validation des documents fournis</li>
                <li style="margin-bottom: 4px;">Effectuation du remboursement</li>
                <li>Notification de paiement</li>
              </ul>
            </div>
            
            <p style="color: #a1a1aa; line-height: 1.6; font-size: 14px; margin-bottom: 24px;">
              Nous vous tiendrons informé(e) de l'avancement de votre demande par email.
            </p>
            
            <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px;">
              <h4 style="color: #3b82f6; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Support</h4>
              <p style="color: #a1a1aa; margin: 0; font-size: 13px; line-height: 1.4;">
                Pour toute question, contactez-nous en mentionnant votre référence : 
                <span style="color: #ffffff; font-weight: 500;">${requestId}</span>
              </p>
            </div>
          </div>
          
          <div style="background: #1a1a1a; border-top: 1px solid #2a2a2a; padding: 20px 24px; text-align: center;">
            <p style="color: #71717a; margin: 0; font-size: 12px;">
              Email automatique - NexKeep
            </p>
          </div>
        </div>
      `,
  })
}

export async function sendAdminNotification(
  requesterName: string,
  requesterEmail: string,
  amount: number,
  description: string,
  requestId: string,
  budgetOwnerEmail: string
): Promise<void> {
  await sendEmail({
    context: 'reimbursement-admin',
    to: budgetOwnerEmail,
    subject: `Nouvelle demande de remboursement pour votre budget - ${requesterName}`,
    html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f;">
          <div style="background: #1a1a1a; border-bottom: 1px solid #2a2a2a; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em;">NexKeep</h1>
            <p style="color: #a1a1aa; margin: 8px 0 0 0; font-size: 14px; font-weight: 400;">Nouvelle demande de remboursement</p>
          </div>
          
          <div style="padding: 32px 24px; background: #0f0f0f;">
            <h2 style="color: #ffffff; margin-bottom: 16px; font-size: 18px; font-weight: 600;">Nouvelle demande reçue</h2>
            
            <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #3b82f6; margin: 0; font-size: 14px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 8px;">📧</span> Cette demande concerne votre budget personnel
              </p>
            </div>
            
            <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <h3 style="color: #ffffff; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Détails de la demande</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; font-weight: 500; width: 30%;">Nom</td>
                  <td style="padding: 12px 0; color: #ffffff; font-size: 14px; border-bottom: 1px solid #2a2a2a;">${requesterName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; font-weight: 500;">Email</td>
                  <td style="padding: 12px 0; color: #ffffff; font-size: 14px; border-bottom: 1px solid #2a2a2a;">${requesterEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; font-weight: 500;">Montant</td>
                  <td style="padding: 12px 0; color: #22c55e; font-size: 14px; font-weight: 600; border-bottom: 1px solid #2a2a2a;">${amount.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; font-weight: 500;">Description</td>
                  <td style="padding: 12px 0; color: #ffffff; font-size: 14px; border-bottom: 1px solid #2a2a2a;">${description}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #a1a1aa; font-size: 14px; font-weight: 500;">Référence</td>
                  <td style="padding: 12px 0; color: #ffffff; font-size: 14px; font-weight: 500;">${requestId}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/reimbursements" 
                 style="background: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 14px; font-weight: 600; transition: background-color 0.2s;">
                Gérer dans NexKeep
              </a>
            </div>
          </div>
          
          <div style="background: #1a1a1a; border-top: 1px solid #2a2a2a; padding: 20px 24px; text-align: center;">
            <p style="color: #71717a; margin: 0; font-size: 12px;">
              Email automatique - NexKeep
            </p>
          </div>
        </div>
      `,
  })
}
