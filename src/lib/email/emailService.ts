/**
 * Email Service - Send transactional emails via Resend
 */

import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.FROM_EMAIL || 'Life Organizer <noreply@lifeorganizer.app>'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn('Email service not configured (missing RESEND_API_KEY)')
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    })

    if (error) {
      console.error('Failed to send email:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

// Email Templates

export async function sendPaymentFailedEmail(userEmail: string, userName?: string): Promise<boolean> {
  const name = userName || 'there'

  return sendEmail({
    to: userEmail,
    subject: 'Action Required: Payment Failed for Life Organizer',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Failed</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>We were unable to process your payment for your Life Organizer subscription. This could be due to:</p>
              <ul>
                <li>Expired card</li>
                <li>Insufficient funds</li>
                <li>Card declined by your bank</li>
              </ul>
              <p>Please update your payment method to continue enjoying all your premium features.</p>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription" class="button">Update Payment Method</a>
              </p>
              <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Life Organizer. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

export async function sendTrialEndingEmail(
  userEmail: string,
  userName?: string,
  daysRemaining: number = 3
): Promise<boolean> {
  const name = userName || 'there'

  return sendEmail({
    to: userEmail,
    subject: `Your Life Organizer trial ends in ${daysRemaining} days`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px 0; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Trial is Ending Soon</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <div class="highlight">
                <strong>Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}!</strong>
              </div>
              <p>We hope you've been enjoying Life Organizer. Here's what you've accomplished during your trial:</p>
              <ul>
                <li>AI-powered daily planning</li>
                <li>Smart habit tracking</li>
                <li>Meal planning and food scanning</li>
                <li>Personalized insights</li>
              </ul>
              <p>Subscribe now to keep all your data and continue your productivity journey.</p>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription" class="button">Choose a Plan</a>
              </p>
              <p>Questions? We're here to help!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Life Organizer. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

export async function sendSubscriptionCanceledEmail(userEmail: string, userName?: string): Promise<boolean> {
  const name = userName || 'there'

  return sendEmail({
    to: userEmail,
    subject: 'Your Life Organizer subscription has been canceled',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Canceled</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your Life Organizer subscription has been canceled. We're sorry to see you go!</p>
              <p>You'll continue to have access to your premium features until the end of your current billing period.</p>
              <p>Your data will be preserved, and you can resubscribe at any time to regain full access.</p>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription" class="button">Resubscribe</a>
              </p>
              <p>If you have any feedback on how we can improve, we'd love to hear from you.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Life Organizer. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}
