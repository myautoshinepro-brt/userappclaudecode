const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  _transporter = nodemailer.createTransport({
    host,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user, pass },
  });
  return _transporter;
}

async function sendOtpEmail(toEmail, otp, userName, expiresMinutes) {
  const t = getTransporter();
  if (!t) {
    console.log('📧 OTP email skipped — SMTP not configured');
    return false;
  }

  const from = process.env.SMTP_FROM || `"SparkWash" <${process.env.SMTP_USER}>`;

  const html = `
<!DOCTYPE html><html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px">

    <div style="background:linear-gradient(135deg,#1e40af,#0369a1);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">🚿</div>
      <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">SparkWash</div>
      <div style="color:#bfdbfe;font-size:12px;margin-top:4px">India's smartest car wash booking</div>
    </div>

    <div style="background:#fff;padding:28px 24px;border-radius:0 0 16px 16px;box-shadow:0 4px 12px rgba(0,0,0,.08)">
      <h2 style="margin:0 0 6px;font-size:18px;color:#0f172a">Your Login OTP</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:13px">
        Hi <strong>${userName || 'there'}</strong>! Use the code below to log in to SparkWash.
      </p>

      <div style="background:#eff6ff;border:2px dashed #93c5fd;border-radius:14px;padding:24px;text-align:center;margin-bottom:20px">
        <div style="font-size:11px;color:#3b82f6;font-weight:700;letter-spacing:1px;margin-bottom:8px">ONE-TIME PASSWORD</div>
        <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#1e40af;font-family:monospace">${otp}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:10px">Expires in ${expiresMinutes} minutes</div>
      </div>

      <div style="background:#fef9c3;border-radius:10px;padding:12px 14px;margin-bottom:20px;font-size:12px;color:#92400e">
        🔒 Never share this OTP with anyone. SparkWash will never call and ask for it.
      </div>

      <div style="text-align:center;font-size:11px;color:#9ca3af;line-height:1.6">
        If you didn't request this, simply ignore this email.<br>
        SparkWash · Powered by technology, driven by cleanliness
      </div>
    </div>

  </div>
</body></html>`;

  try {
    await t.sendMail({
      from,
      to:      toEmail,
      subject: `${otp} is your SparkWash OTP`,
      html,
    });
    console.log(`📧 OTP email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`📧 Failed to send OTP email to ${toEmail}:`, err.message);
    return false;
  }
}

module.exports = { sendOtpEmail };
