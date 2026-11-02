import { formatTorontoDate, formatTorontoTime } from '../datetime';
import { formatCad } from '../format';
import { isPlaceholder } from '../placeholder';
import type { SiteSettings } from '../types';

/**
 * Email templates as plain functions.
 *
 * Each returns `{ subject, html, text }` so the provider only has to deliver
 * it. Every business detail (name, phone, WhatsApp, address, policy) comes from
 * `site_settings`; nothing about the business is hard-coded here.
 *
 * Inline CSS only, a single column and a max width of 560px: that is what email
 * clients reliably support on a phone.
 */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface BookingEmailData {
  settings: SiteSettings;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  tourTitle: string;
  packageName: string;
  startsAt: string;
  adults: number;
  children: number;
  seniors: number;
  pickupName: string | null;
  pickupAddress: string | null;
  pickupTime: string | null;
  addons: ReadonlyArray<{ name: string; quantity: number; unitCents: number }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  /** Private confirmation link (`/booking/confirmed?ref=…&t=…`). */
  bookingUrl: string;
  /** Owner-only link to the booking in `/admin`. */
  adminUrl: string;
  overbooked?: boolean;
}

/** The owner alert for a payment that landed on a cancelled/refunded booking. */
export interface PaymentAlertEmailData {
  settings: SiteSettings;
  reference: string;
  adminUrl: string;
}

export interface InquiryEmailData {
  settings: SiteSettings;
  tourTitle: string;
  packageName: string;
  preferredDate: string;
  groupSize: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  message: string | null;
  adminUrl: string;
}

/** Escapes text for HTML. Every customer-supplied value goes through this. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `+1 (416) 555-0142` → `https://wa.me/14165550142`. */
export function whatsappHref(number: string): string {
  return `https://wa.me/${number.replace(/[^\d]/g, '')}`;
}

/** `+1 (416) 555-0142` → `tel:+14165550142`. */
export function telHref(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, '')}`;
}

function peopleSummary(data: Pick<BookingEmailData, 'adults' | 'children' | 'seniors'>): string {
  const parts = [
    data.adults > 0 ? `${data.adults} ${data.adults === 1 ? 'adult' : 'adults'}` : '',
    data.children > 0 ? `${data.children} ${data.children === 1 ? 'child' : 'children'}` : '',
    data.seniors > 0 ? `${data.seniors} ${data.seniors === 1 ? 'senior' : 'seniors'}` : '',
  ].filter((part) => part.length > 0);

  const total = data.adults + data.children + data.seniors;
  return `${parts.join(', ')} (${total} ${total === 1 ? 'person' : 'people'})`;
}

function whenText(startsAt: string): string {
  return `${formatTorontoDate(startsAt)} at ${formatTorontoTime(startsAt)} (Toronto time)`;
}

function pickupText(data: BookingEmailData): string {
  if (!data.pickupName && !data.pickupTime) return 'We will confirm your pickup with you';

  const place = [data.pickupName, data.pickupAddress].filter((part) => Boolean(part)).join(' — ');
  return data.pickupTime ? `${place} at ${data.pickupTime}` : place;
}

function layout(settings: SiteSettings, body: string): string {
  // Fields the owner has not filled in yet (`TODO: …`) never reach a customer.
  const contactLine = [
    escapeHtml(settings.name),
    real(settings.address) ? escapeHtml(settings.address) : '',
    real(settings.phone)
      ? `<a href="${escapeHtml(telHref(settings.phone))}" style="color:#6b7280;">${escapeHtml(
          settings.phone,
        )}</a>`
      : '',
  ]
    .filter((part) => part.length > 0)
    .join(' · ');

  return `<!doctype html>
<html lang="en-CA">
  <body style="margin:0;padding:0;background-color:#f4f3ef;">
    <div style="padding:24px 12px;">
      <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1f2933;">
${body}
      </div>
      <p style="max-width:560px;margin:16px auto 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;text-align:center;">
        ${contactLine}
      </p>
    </div>
  </body>
</html>`;
}

const H1 = 'margin:0 0 12px;font-size:24px;line-height:1.25;color:#1f2933;';
const H2 = 'margin:24px 0 8px;font-size:17px;line-height:1.3;color:#1f2933;';
const P = 'margin:0 0 12px;';
const MUTED = 'margin:0 0 12px;color:#6b7280;font-size:14px;';
const BUTTON =
  'display:inline-block;padding:12px 20px;border-radius:999px;background-color:#0f766e;color:#ffffff;font-weight:600;text-decoration:none;';

function details(rows: ReadonlyArray<readonly [string, string]>): string {
  const body = rows
    .map(
      ([label, value]) => `<tr>
          <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:14px;vertical-align:top;width:40%;">${escapeHtml(
            label,
          )}</td>
          <td style="padding:6px 0;font-size:14px;vertical-align:top;">${value}</td>
        </tr>`,
    )
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">${body}</table>`;
}

function real(value: string | null | undefined): value is string {
  return !isPlaceholder(value);
}

function joinChoices(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}`;
}

function contactBlock(settings: SiteSettings): string {
  const parts: string[] = [];
  if (real(settings.phone)) {
    parts.push(
      `call <a href="${escapeHtml(telHref(settings.phone))}" style="color:#0f766e;">${escapeHtml(
        settings.phone,
      )}</a>`,
    );
  }
  if (real(settings.whatsapp)) {
    parts.push(
      `WhatsApp <a href="${escapeHtml(whatsappHref(settings.whatsapp))}" style="color:#0f766e;">${escapeHtml(
        settings.whatsapp,
      )}</a>`,
    );
  }
  if (real(settings.email)) {
    parts.push(
      `email <a href="mailto:${escapeHtml(settings.email)}" style="color:#0f766e;">${escapeHtml(
        settings.email,
      )}</a>`,
    );
  }
  if (parts.length === 0) return `<p style="${P}">Reply to this email and we will help.</p>`;

  const sentence = joinChoices(parts);
  return `<p style="${P}">${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.</p>`;
}

function contactText(settings: SiteSettings): string {
  const parts = [
    real(settings.phone) ? `call ${settings.phone}` : '',
    real(settings.whatsapp) ? `WhatsApp ${settings.whatsapp}` : '',
    real(settings.email) ? `email ${settings.email}` : '',
  ].filter((part) => part.length > 0);
  if (parts.length === 0) return 'Reply to this email and we will help.';

  const sentence = joinChoices(parts);
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

function footerText(settings: SiteSettings): string {
  return real(settings.address) ? `${settings.name} · ${settings.address}` : settings.name;
}

function cancellationHtml(settings: SiteSettings): string {
  if (!real(settings.cancellationPolicy)) return '';
  return `<h2 style="${H2}">Cancellation policy</h2>
      <p style="${P}">${escapeHtml(settings.cancellationPolicy)}</p>`;
}

function cancellationText(settings: SiteSettings): string[] {
  if (!real(settings.cancellationPolicy)) return [];
  return ['Cancellation policy:', settings.cancellationPolicy, ''];
}

function addonLines(data: BookingEmailData): string {
  if (data.addons.length === 0) return '';

  const items = data.addons
    .map(
      (addon) =>
        `<li style="margin:0 0 4px;">${escapeHtml(addon.name)} × ${addon.quantity} — ${escapeHtml(
          formatCad(addon.unitCents * addon.quantity),
        )}</li>`,
    )
    .join('');

  return `<h2 style="${H2}">Extras</h2><ul style="margin:0 0 12px;padding-left:20px;font-size:14px;">${items}</ul>`;
}

/** 1. Customer booking confirmation. */
export function customerBookingConfirmation(data: BookingEmailData): EmailContent {
  const subject = `You're booked: ${data.tourTitle} (${data.reference})`;

  const html = layout(
    data.settings,
    `<h1 style="${H1}">You're booked!</h1>
      <p style="${P}">Hi ${escapeHtml(data.customerName)}, thank you for booking with ${escapeHtml(
        data.settings.name,
      )}. Your seats are confirmed.</p>
      ${details([
        ['Booking reference', `<strong>${escapeHtml(data.reference)}</strong>`],
        ['Tour', escapeHtml(`${data.tourTitle} — ${data.packageName}`)],
        ['Date and time', escapeHtml(whenText(data.startsAt))],
        ['People', escapeHtml(peopleSummary(data))],
        ['Pickup', escapeHtml(pickupText(data))],
        ['Subtotal', escapeHtml(formatCad(data.subtotalCents))],
        ['HST 13%', escapeHtml(formatCad(data.taxCents))],
        ['Total including HST', `<strong>${escapeHtml(formatCad(data.totalCents))}</strong>`],
      ])}
      ${addonLines(data)}
      <p style="${P}">
        <a href="${escapeHtml(data.bookingUrl)}" style="${BUTTON}">View your booking</a>
      </p>
      <p style="${MUTED}">Keep this link private: it opens your booking details.</p>
      ${cancellationHtml(data.settings)}
      <h2 style="${H2}">Questions?</h2>
      ${contactBlock(data.settings)}`,
  );

  const text = [
    `You're booked!`,
    '',
    `Hi ${data.customerName}, thank you for booking with ${data.settings.name}. Your seats are confirmed.`,
    '',
    `Booking reference: ${data.reference}`,
    `Tour: ${data.tourTitle} — ${data.packageName}`,
    `Date and time: ${whenText(data.startsAt)}`,
    `People: ${peopleSummary(data)}`,
    `Pickup: ${pickupText(data)}`,
    `Subtotal: ${formatCad(data.subtotalCents)}`,
    `HST 13%: ${formatCad(data.taxCents)}`,
    `Total including HST: ${formatCad(data.totalCents)}`,
    ...(data.addons.length > 0
      ? [
          '',
          'Extras:',
          ...data.addons.map(
            (addon) =>
              `- ${addon.name} × ${addon.quantity} — ${formatCad(addon.unitCents * addon.quantity)}`,
          ),
        ]
      : []),
    '',
    `View your booking: ${data.bookingUrl}`,
    'Keep this link private: it opens your booking details.',
    '',
    ...cancellationText(data.settings),
    'Questions?',
    contactText(data.settings),
    '',
    footerText(data.settings),
  ].join('\n');

  return { subject, html, text };
}

/** 2. Owner alert for a new (paid) booking. */
export function ownerBookingAlert(data: BookingEmailData): EmailContent {
  const overbooked = data.overbooked === true;
  const subject = `${overbooked ? 'OVERBOOKED — ' : ''}New booking ${data.reference}: ${
    data.tourTitle
  }`;

  const phone = data.customerPhone;
  const phoneHtml = phone
    ? `<a href="${escapeHtml(telHref(phone))}" style="color:#0f766e;">${escapeHtml(
        phone,
      )}</a> · <a href="${escapeHtml(whatsappHref(phone))}" style="color:#0f766e;">WhatsApp</a>`
    : 'Not given';

  const html = layout(
    data.settings,
    `<h1 style="${H1}">${overbooked ? 'OVERBOOKED — new payment' : 'New booking'}</h1>
      ${
        overbooked
          ? `<p style="margin:0 0 12px;padding:12px;border-radius:8px;background-color:#fef2f2;color:#991b1b;font-weight:600;">This booking was paid after its hold expired and someone else took the seats. Call the customer.</p>`
          : ''
      }
      ${details([
        ['Reference', `<strong>${escapeHtml(data.reference)}</strong>`],
        ['Customer', escapeHtml(data.customerName)],
        [
          'Email',
          `<a href="mailto:${escapeHtml(data.customerEmail)}" style="color:#0f766e;">${escapeHtml(
            data.customerEmail,
          )}</a>`,
        ],
        ['Phone', phoneHtml],
        ['Tour', escapeHtml(`${data.tourTitle} — ${data.packageName}`)],
        ['Date and time', escapeHtml(whenText(data.startsAt))],
        ['People', escapeHtml(peopleSummary(data))],
        ['Pickup', escapeHtml(pickupText(data))],
        ['Total', `<strong>${escapeHtml(formatCad(data.totalCents))}</strong>`],
        ['Notes', data.notes ? escapeHtml(data.notes) : '—'],
      ])}
      <p style="${P}">
        <a href="${escapeHtml(data.adminUrl)}" style="${BUTTON}">Open in the admin</a>
      </p>`,
  );

  const text = [
    overbooked ? 'OVERBOOKED — new payment' : 'New booking',
    overbooked
      ? 'This booking was paid after its hold expired and someone else took the seats. Call the customer.'
      : '',
    '',
    `Reference: ${data.reference}`,
    `Customer: ${data.customerName}`,
    `Email: ${data.customerEmail}`,
    `Phone: ${phone ?? 'Not given'}`,
    `Tour: ${data.tourTitle} — ${data.packageName}`,
    `Date and time: ${whenText(data.startsAt)}`,
    `People: ${peopleSummary(data)}`,
    `Pickup: ${pickupText(data)}`,
    `Total: ${formatCad(data.totalCents)}`,
    `Notes: ${data.notes ?? '—'}`,
    '',
    `Admin: ${data.adminUrl}`,
    '',
    footerText(data.settings),
  ]
    .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
    .join('\n');

  return { subject, html, text };
}

/**
 * Owner alert when Stripe is not configured: no payment has been taken, so the
 * owner must arrange one. The `PAYMENT NEEDED` subject prefix makes it stand
 * out from a normal booking alert.
 */
export function ownerBookingPaymentNeeded(data: BookingEmailData): EmailContent {
  const subject = `PAYMENT NEEDED — New booking ${data.reference}: ${data.tourTitle}`;

  const phone = data.customerPhone;
  const phoneHtml = phone
    ? `<a href="${escapeHtml(telHref(phone))}" style="color:#0f766e;">${escapeHtml(
        phone,
      )}</a> · <a href="${escapeHtml(whatsappHref(phone))}" style="color:#0f766e;">WhatsApp</a>`
    : 'Not given';

  const html = layout(
    data.settings,
    `<h1 style="${H1}">PAYMENT NEEDED — new booking</h1>
      <p style="margin:0 0 12px;padding:12px;border-radius:8px;background-color:#fef3c7;color:#92400e;font-weight:600;">No payment has been taken. Contact the customer to arrange payment, then mark the booking paid in the admin.</p>
      ${details([
        ['Reference', `<strong>${escapeHtml(data.reference)}</strong>`],
        ['Customer', escapeHtml(data.customerName)],
        [
          'Email',
          `<a href="mailto:${escapeHtml(data.customerEmail)}" style="color:#0f766e;">${escapeHtml(
            data.customerEmail,
          )}</a>`,
        ],
        ['Phone', phoneHtml],
        ['Tour', escapeHtml(`${data.tourTitle} — ${data.packageName}`)],
        ['Date and time', escapeHtml(whenText(data.startsAt))],
        ['People', escapeHtml(peopleSummary(data))],
        ['Pickup', escapeHtml(pickupText(data))],
        ['Total', `<strong>${escapeHtml(formatCad(data.totalCents))}</strong>`],
        ['Notes', data.notes ? escapeHtml(data.notes) : '—'],
      ])}
      <p style="${P}">
        <a href="${escapeHtml(data.adminUrl)}" style="${BUTTON}">Open in the admin</a>
      </p>`,
  );

  const text = [
    'PAYMENT NEEDED — new booking',
    'No payment has been taken. Contact the customer to arrange payment, then mark the booking paid in the admin.',
    '',
    `Reference: ${data.reference}`,
    `Customer: ${data.customerName}`,
    `Email: ${data.customerEmail}`,
    `Phone: ${phone ?? 'Not given'}`,
    `Tour: ${data.tourTitle} — ${data.packageName}`,
    `Date and time: ${whenText(data.startsAt)}`,
    `People: ${peopleSummary(data)}`,
    `Pickup: ${pickupText(data)}`,
    `Total: ${formatCad(data.totalCents)}`,
    `Notes: ${data.notes ?? '—'}`,
    '',
    `Admin: ${data.adminUrl}`,
    '',
    footerText(data.settings),
  ].join('\n');

  return { subject, html, text };
}

/**
 * Customer acknowledgement when payment is arranged manually: the request is
 * saved and the seats are held, but no money has changed hands yet.
 */
export function customerBookingRequestReceived(data: BookingEmailData): EmailContent {
  const subject = `We've received your booking request (${data.reference})`;

  const html = layout(
    data.settings,
    `<h1 style="${H1}">We've received your booking request</h1>
      <p style="${P}">Hi ${escapeHtml(data.customerName)}, thank you for your booking request with ${escapeHtml(
        data.settings.name,
      )}. Your seats are held while we contact you to arrange payment.</p>
      ${details([
        ['Booking reference', `<strong>${escapeHtml(data.reference)}</strong>`],
        ['Tour', escapeHtml(`${data.tourTitle} — ${data.packageName}`)],
        ['Date and time', escapeHtml(whenText(data.startsAt))],
        ['People', escapeHtml(peopleSummary(data))],
        ['Pickup', escapeHtml(pickupText(data))],
        ['Subtotal', escapeHtml(formatCad(data.subtotalCents))],
        ['HST 13%', escapeHtml(formatCad(data.taxCents))],
        ['Total including HST', `<strong>${escapeHtml(formatCad(data.totalCents))}</strong>`],
      ])}
      ${addonLines(data)}
      <p style="${P}">We will contact you to arrange payment and confirm the final details. No payment has been taken yet.</p>
      <p style="${P}">
        <a href="${escapeHtml(data.bookingUrl)}" style="${BUTTON}">View your booking request</a>
      </p>
      <p style="${MUTED}">Keep this link private: it opens your booking details.</p>
      <h2 style="${H2}">Questions?</h2>
      ${contactBlock(data.settings)}`,
  );

  const text = [
    `We've received your booking request`,
    '',
    `Hi ${data.customerName}, thank you for your booking request with ${data.settings.name}. Your seats are held while we contact you to arrange payment.`,
    '',
    `Booking reference: ${data.reference}`,
    `Tour: ${data.tourTitle} — ${data.packageName}`,
    `Date and time: ${whenText(data.startsAt)}`,
    `People: ${peopleSummary(data)}`,
    `Pickup: ${pickupText(data)}`,
    `Subtotal: ${formatCad(data.subtotalCents)}`,
    `HST 13%: ${formatCad(data.taxCents)}`,
    `Total including HST: ${formatCad(data.totalCents)}`,
    ...(data.addons.length > 0
      ? [
          '',
          'Extras:',
          ...data.addons.map(
            (addon) =>
              `- ${addon.name} × ${addon.quantity} — ${formatCad(addon.unitCents * addon.quantity)}`,
          ),
        ]
      : []),
    '',
    'We will contact you to arrange payment and confirm the final details. No payment has been taken yet.',
    '',
    `View your booking request: ${data.bookingUrl}`,
    'Keep this link private: it opens your booking details.',
    '',
    'Questions?',
    contactText(data.settings),
    '',
    footerText(data.settings),
  ].join('\n');

  return { subject, html, text };
}

/**
 * Owner alert for a payment that arrived on a cancelled or refunded booking.
 * The payment cannot be applied, so the owner has to refund or reinstate it.
 */
export function ownerPaymentNeedsAttention(data: PaymentAlertEmailData): EmailContent {
  const subject = `Payment received for a cancelled booking ${data.reference}`;

  const html = layout(
    data.settings,
    `<h1 style="${H1}">Payment received for a cancelled booking</h1>
      <p style="${P}">Payment received for a cancelled booking <strong>${escapeHtml(
        data.reference,
      )}</strong> — refund or reinstate it.</p>
      <p style="${P}">
        <a href="${escapeHtml(data.adminUrl)}" style="${BUTTON}">Open in the admin</a>
      </p>`,
  );

  const text = [
    `Payment received for a cancelled booking ${data.reference} — refund or reinstate it.`,
    '',
    `Admin: ${data.adminUrl}`,
    '',
    footerText(data.settings),
  ].join('\n');

  return { subject, html, text };
}

/** 3. Owner alert for a new private-tour request. */
export function ownerInquiryAlert(data: InquiryEmailData): EmailContent {
  const subject = `New private tour request: ${data.tourTitle} (${data.preferredDate})`;

  const phone = data.customerPhone;
  const phoneHtml = phone
    ? `<a href="${escapeHtml(telHref(phone))}" style="color:#0f766e;">${escapeHtml(
        phone,
      )}</a> · <a href="${escapeHtml(whatsappHref(phone))}" style="color:#0f766e;">WhatsApp</a>`
    : 'Not given';

  const html = layout(
    data.settings,
    `<h1 style="${H1}">New private tour request</h1>
      ${details([
        ['Customer', escapeHtml(data.customerName)],
        [
          'Email',
          `<a href="mailto:${escapeHtml(data.customerEmail)}" style="color:#0f766e;">${escapeHtml(
            data.customerEmail,
          )}</a>`,
        ],
        ['Phone', phoneHtml],
        ['Tour', escapeHtml(data.tourTitle)],
        ['Vehicle', escapeHtml(data.packageName)],
        ['Preferred date', escapeHtml(formatTorontoDate(`${data.preferredDate}T12:00:00Z`))],
        ['Group size', `${data.groupSize} ${data.groupSize === 1 ? 'person' : 'people'}`],
        ['Message', data.message ? escapeHtml(data.message) : '—'],
      ])}
      <p style="${P}">
        <a href="${escapeHtml(data.adminUrl)}" style="${BUTTON}">Open in the admin</a>
      </p>`,
  );

  const text = [
    'New private tour request',
    '',
    `Customer: ${data.customerName}`,
    `Email: ${data.customerEmail}`,
    `Phone: ${phone ?? 'Not given'}`,
    `Tour: ${data.tourTitle}`,
    `Vehicle: ${data.packageName}`,
    `Preferred date: ${formatTorontoDate(`${data.preferredDate}T12:00:00Z`)}`,
    `Group size: ${data.groupSize}`,
    `Message: ${data.message ?? '—'}`,
    '',
    `Admin: ${data.adminUrl}`,
    '',
    footerText(data.settings),
  ].join('\n');

  return { subject, html, text };
}

/** 4. Customer acknowledgement of a private-tour request. */
export function customerInquiryReceived(data: InquiryEmailData): EmailContent {
  const subject = `We got your request — ${data.settings.name}`;

  const html = layout(
    data.settings,
    `<h1 style="${H1}">We got your request</h1>
      <p style="${P}">Hi ${escapeHtml(data.customerName)}, thank you for asking about a private tour.
      We will reply by email within one business day to confirm the details and payment.</p>
      ${details([
        ['Tour', escapeHtml(data.tourTitle)],
        ['Vehicle', escapeHtml(data.packageName)],
        ['Preferred date', escapeHtml(formatTorontoDate(`${data.preferredDate}T12:00:00Z`))],
        ['Group size', `${data.groupSize} ${data.groupSize === 1 ? 'person' : 'people'}`],
      ])}
      <p style="${P}">No payment has been taken.</p>
      <h2 style="${H2}">Questions?</h2>
      ${contactBlock(data.settings)}`,
  );

  const text = [
    'We got your request',
    '',
    `Hi ${data.customerName}, thank you for asking about a private tour. We will reply by email within one business day to confirm the details and payment.`,
    '',
    `Tour: ${data.tourTitle}`,
    `Vehicle: ${data.packageName}`,
    `Preferred date: ${formatTorontoDate(`${data.preferredDate}T12:00:00Z`)}`,
    `Group size: ${data.groupSize}`,
    '',
    'No payment has been taken.',
    '',
    'Questions?',
    contactText(data.settings),
    '',
    footerText(data.settings),
  ].join('\n');

  return { subject, html, text };
}
