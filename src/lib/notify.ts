import { sendEmail, type EmailMessage } from './email/send';

/**
 * Owner notifications.
 *
 * Today the only channel is email. WhatsApp can be added here later as a
 * second channel — every caller already passes a plain-text version of the
 * message — without touching the actions or the webhook.
 */

export interface OwnerNotification {
  /** Plain text, ready for a chat channel such as WhatsApp. */
  text: string;
  /** The email version of the same notification. */
  email: EmailMessage;
}

export async function notifyOwner(notification: OwnerNotification): Promise<boolean> {
  return sendEmail(notification.email);
}
