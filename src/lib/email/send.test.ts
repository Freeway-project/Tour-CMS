import { afterEach, describe, expect, it, vi } from 'vitest';

import { createResendProvider, sendEmail, type EmailMessage } from './send';

const message: EmailMessage = {
  to: 'guest@example.com',
  subject: 'Your booking',
  html: '<p>Hello</p>',
  text: 'Hello',
};

const config = { apiKey: 're_test_key', from: 'Bookings <bookings@example.com>' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendEmail', () => {
  it('skips cleanly and never calls fetch when no key is configured', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const fetchMock = vi.fn<typeof fetch>();

    const sent = await sendEmail(message, { config: null, fetchImpl: fetchMock });

    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledOnce();
  });

  it('posts the message to Resend with the configured sender', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response('{"id":"email_1"}', { status: 200 }));

    const sent = await sendEmail(message, { config, fetchImpl: fetchMock });

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer re_test_key');

    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toEqual({
      from: config.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  });

  it('returns false when the provider rejects the message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response('nope', { status: 422 }));

    const sent = await sendEmail(message, { config, fetchImpl: fetchMock });

    expect(sent).toBe(false);
  });

  it('returns false instead of throwing on a network error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockRejectedValue(new Error('offline'));

    const sent = await sendEmail(message, { config, fetchImpl: fetchMock });

    expect(sent).toBe(false);
  });

  it('uses an injected provider instead of the environment', async () => {
    const send = vi.fn(async () => true);
    const sent = await sendEmail(message, {
      config,
      provider: { name: 'test', send },
    });

    expect(sent).toBe(true);
    expect(send).toHaveBeenCalledWith(message);
  });
});

describe('createResendProvider', () => {
  it('exposes a stable provider name', () => {
    const fetchMock = vi.fn<typeof fetch>();
    expect(createResendProvider(config, fetchMock).name).toBe('resend');
  });
});
