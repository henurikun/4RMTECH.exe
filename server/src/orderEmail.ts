import nodemailer from 'nodemailer';

export async function sendOrderNotifyEmail(params: { subject: string; text: string; receiptUrl?: string }) {
  const toRaw = process.env.NOTIFY_TO_EMAILS ?? '';
  const recipients = toRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const stamp = new Date().toISOString();

  if (!recipients.length) {
    // eslint-disable-next-line no-console
    console.log(`[order-notify ${stamp}] NOTIFY_TO_EMAILS not set — would send:\n${params.text}`);
    return;
  }

  const host = process.env.SMTP_HOST;
  if (!host) {
    // eslint-disable-next-line no-console
    console.log(`[order-notify ${stamp}] SMTP_HOST not set — would send:\n${params.text}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER != null && process.env.SMTP_USER !== ''
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
        : undefined,
  });

  let attachments:
    | Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
      }>
    | undefined;

  if (params.receiptUrl) {
    try {
      // Download receipt and attach so the store can verify without opening the link.
      const r = await fetch(params.receiptUrl);
      const contentType = r.headers.get('content-type') ?? undefined;
      const arr = await r.arrayBuffer();
      attachments = [
        {
          filename: 'payment-receipt',
          content: Buffer.from(arr),
          contentType,
        },
      ];
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[orderEmail] Failed to attach receipt:', e);
    }
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@localhost',
    to: recipients.join(', '),
    subject: params.subject,
    text: params.text,
    ...(attachments ? { attachments } : {}),
  });
}
