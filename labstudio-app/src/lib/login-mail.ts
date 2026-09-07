import nodemailer from 'nodemailer';

export function loginMailConfig() {
  const host = process.env.LABSTUDIO_SMTP_HOST?.trim();
  const user = process.env.LABSTUDIO_SMTP_USER?.trim();
  const pass = process.env.LABSTUDIO_SMTP_PASSWORD;
  const from = process.env.LABSTUDIO_LOGIN_FROM?.trim();
  const port = Number(process.env.LABSTUDIO_SMTP_PORT || 465);
  if (!host || !user || !pass || !from || /[\r\n]/.test(from) || ![465, 587].includes(port)) {
    throw new Error('Secure sign-in is temporarily unavailable. Please contact Lab Studio.');
  }
  return { host, port, secure: port === 465, requireTLS: true, auth: { user, pass }, from };
}

export async function sendLoginCode(email: string, code: string) {
  const { from, ...config } = loginMailConfig();
  const transport = nodemailer.createTransport({
    ...config, tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    await transport.sendMail({ from, to: email, subject: 'Your Lab Studio sign-in code',
      text: `Your Lab Studio sign-in code is ${code}. It expires in 10 minutes and can be used once. Never share this code. If you did not request it, ignore this email.` });
  } finally { transport.close(); }
}
