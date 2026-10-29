import { describe, expect, it } from 'vitest';

import { siteSettings } from '../../data/fixtures';
import { formatCad } from '../format';
import {
  customerBookingConfirmation,
  customerInquiryReceived,
  escapeHtml,
  ownerBookingAlert,
  ownerInquiryAlert,
  telHref,
  whatsappHref,
  type BookingEmailData,
  type InquiryEmailData,
} from './templates';

const booking: BookingEmailData = {
  settings: siteSettings,
  reference: 'TN-ABC123',
  customerName: 'Alex Guest',
  customerEmail: 'alex@example.com',
  customerPhone: '+1 (416) 555-0199',
  notes: 'One folding wheelchair',
  tourTitle: 'Niagara Falls Day Tour from Toronto',
  packageName: 'Day tour',
  startsAt: '2026-11-10T13:00:00Z',
  adults: 2,
  children: 1,
  seniors: 0,
  pickupName: '55 York St, downtown Toronto',
  pickupAddress: '55 York St, Toronto, ON M5J 1R7',
  pickupTime: '07:45',
  addons: [{ name: 'Wine tasting', quantity: 2, unitCents: 2500 }],
  subtotalCents: 32220,
  taxCents: 4189,
  totalCents: 36409,
  bookingUrl: 'https://torontoniagara.ca/booking/confirmed?ref=TN-ABC123&t=abc123',
  adminUrl: 'https://torontoniagara.ca/admin/bookings/booking-id',
  overbooked: false,
};

const inquiry: InquiryEmailData = {
  settings: siteSettings,
  tourTitle: 'Private Niagara Falls Tour',
  packageName: 'Sprinter van, up to 6 people',
  preferredDate: '2026-11-20',
  groupSize: 4,
  customerName: 'Sam Guest',
  customerEmail: 'sam@example.com',
  customerPhone: '+1 (416) 555-0188',
  message: 'Two children, one stroller',
  adminUrl: 'https://torontoniagara.ca/admin/inquiries',
};

describe('escapeHtml', () => {
  it('escapes every HTML-sensitive character', () => {
    expect(escapeHtml(`<script>alert("x & 'y'")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x &amp; &#39;y&#39;&quot;)&lt;/script&gt;',
    );
  });
});

describe('link helpers', () => {
  it('builds tel and WhatsApp links from a formatted number', () => {
    expect(telHref('+1 (416) 555-0142')).toBe('tel:+14165550142');
    expect(whatsappHref('+1 (416) 555-0142')).toBe('https://wa.me/14165550142');
  });
});

describe('customerBookingConfirmation', () => {
  it('includes the reference, the total and the private link', () => {
    const email = customerBookingConfirmation(booking);

    expect(email.subject).toContain('TN-ABC123');
    expect(email.subject).toContain(booking.tourTitle);
    expect(email.html).toContain('TN-ABC123');
    expect(email.html).toContain(formatCad(booking.totalCents));
    expect(email.text).toContain(formatCad(booking.totalCents));
    expect(email.html).toContain(escapeHtml(booking.bookingUrl));
    expect(email.text).toContain(booking.bookingUrl);
  });

  it('uses the business details from site settings', () => {
    const email = customerBookingConfirmation(booking);

    expect(email.html).toContain(escapeHtml(siteSettings.name));
    expect(email.html).toContain(escapeHtml(siteSettings.phone));
    expect(email.html).toContain(escapeHtml(siteSettings.address));
    expect(email.html).toContain(escapeHtml(siteSettings.cancellationPolicy));
    expect(email.text).toContain(siteSettings.email);
  });

  it('shows the pickup place and time', () => {
    const email = customerBookingConfirmation(booking);

    expect(email.html).toContain('55 York St, downtown Toronto');
    expect(email.html).toContain('07:45');
  });

  it('escapes every customer-supplied value', () => {
    const email = customerBookingConfirmation({
      ...booking,
      customerName: '<script>alert("name")</script>',
      addons: [{ name: '<b>Free</b> wine', quantity: 1, unitCents: 0 }],
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<b>Free</b>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('&lt;b&gt;Free&lt;/b&gt;');
  });
});

describe('ownerBookingAlert', () => {
  it('includes the customer, total, tel/WhatsApp links and admin link', () => {
    const email = ownerBookingAlert(booking);

    expect(email.subject).toBe(`New booking TN-ABC123: ${booking.tourTitle}`);
    expect(email.html).toContain('Alex Guest');
    expect(email.html).toContain(formatCad(booking.totalCents));
    expect(email.html).toContain('tel:+14165550199');
    expect(email.html).toContain('https://wa.me/14165550199');
    expect(email.html).toContain(booking.adminUrl);
  });

  it('marks the subject when the booking is overbooked', () => {
    const email = ownerBookingAlert({ ...booking, overbooked: true });

    expect(email.subject.startsWith('OVERBOOKED — ')).toBe(true);
    expect(email.html).toContain('OVERBOOKED');
  });

  it('escapes the customer name, email and notes', () => {
    const email = ownerBookingAlert({
      ...booking,
      customerName: '<script>alert(1)</script>',
      customerEmail: '"><script>alert(2)</script>@example.com',
      notes: '<iframe src=x></iframe>',
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<iframe');
  });
});

describe('inquiry templates', () => {
  it('owner alert includes the request and uses settings contact details', () => {
    const email = ownerInquiryAlert(inquiry);

    expect(email.subject).toContain('Private Niagara Falls Tour');
    expect(email.html).toContain('Sam Guest');
    expect(email.html).toContain('4');
    expect(email.html).toContain('tel:+14165550188');
    expect(email.html).toContain(inquiry.adminUrl);
    expect(email.text).toContain(siteSettings.name);
  });

  it('customer acknowledgement uses the business name and details', () => {
    const email = customerInquiryReceived(inquiry);

    expect(email.subject).toContain(siteSettings.name);
    expect(email.html).toContain(escapeHtml(siteSettings.name));
    expect(email.html).toContain(escapeHtml(siteSettings.whatsapp));
    expect(email.text).toContain('No payment has been taken.');
  });

  it('escapes a customer message in both inquiry emails', () => {
    const attack = { ...inquiry, message: '<script>alert("msg")</script>' };

    expect(ownerInquiryAlert(attack).html).not.toContain('<script>');
    expect(ownerInquiryAlert(attack).html).toContain('&lt;script&gt;');
    expect(customerInquiryReceived(attack).html).not.toContain('<script>');
  });
});
