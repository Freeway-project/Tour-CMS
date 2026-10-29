import { EMAIL_FROM, RESEND_API_KEY } from 'astro:env/server';

/**
 * Transactional email through Resend's HTTP API, with no SDK.
 *
 * The provider is a two-method interface so it can be swapped later. Without a
 * key every send is logged and skipped: a booking must never fail because email
 * is not configured yet.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  /** True when the provider accepted the message. Never throws. */
  send(message: EmailMessage): Promise<boolean>;
}

export interface EmailConfig {
  apiKey: string;
  from: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function createResendProvider(
  config: EmailConfig,
  fetchImpl: typeof fetch = fetch,
): EmailProvider {
  return {
    name: 'resend',
    async send(message: EmailMessage): Promise<boolean> {
      try {
        const response = await fetchImpl(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            from: config.from,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          console.error(
            `[email] Resend rejected "${message.subject}" (${response.status}): ${detail.slice(0, 300)}`,
          );
          return false;
        }

        return true;
      } catch (error) {
        console.error(`[email] Could not send "${message.subject}"`, error);
        return false;
      }
    },
  };
}

/** The configured provider, or null when `RESEND_API_KEY`/`EMAIL_FROM` are unset. */
export function emailConfig(): EmailConfig | null {
  return RESEND_API_KEY && EMAIL_FROM ? { apiKey: RESEND_API_KEY, from: EMAIL_FROM } : null;
}

export interface SendEmailOptions {
  /** Overrides the environment (tests, or a future provider). */
  config?: EmailConfig | null;
  provider?: EmailProvider;
  fetchImpl?: typeof fetch;
}

/**
 * Sends one email and returns whether it went out.
 *
 * Callers treat `false` as "not sent yet" (the booking keeps working); a
 * missing key is a normal, logged skip rather than an error.
 */
export async function sendEmail(
  message: EmailMessage,
  options: SendEmailOptions = {},
): Promise<boolean> {
  const config = options.config === undefined ? emailConfig() : options.config;

  if (!config) {
    console.info(`[email] Skipped "${message.subject}" to ${message.to}: email is not configured.`);
    return false;
  }

  const provider = options.provider ?? createResendProvider(config, options.fetchImpl ?? fetch);

  return provider.send(message);
}
