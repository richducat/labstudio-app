const required = ['DATABASE_URL', 'LABSTUDIO_SESSION_SECRET', 'LABSTUDIO_SMTP_HOST', 'LABSTUDIO_SMTP_USER', 'LABSTUDIO_SMTP_PASSWORD', 'LABSTUDIO_LOGIN_FROM'];
const missing = required.filter(key => !process.env[key]?.trim());
if (missing.length) throw new Error(`Missing release configuration: ${missing.join(', ')}`);
if (process.env.LABSTUDIO_SESSION_SECRET.trim().length < 32) throw new Error('Session secret must contain at least 32 characters.');
if (!['465', '587'].includes(process.env.LABSTUDIO_SMTP_PORT || '465')) throw new Error('SMTP must use TLS on port 465 or STARTTLS on 587.');
if (process.env.VERIFIED_NATIVE_RELEASE !== 'true') throw new Error('Verify the native email-code release before invalidating legacy production sessions.');
console.log('Secure login configuration present; no secret values displayed.');
