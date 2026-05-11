const express    = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

/**
 * POST /api/test/send-email
 * Body: { toEmail, subject, message }
 *
 * Fires a raw nodemailer send so we can confirm the SMTP connection
 * is alive independently of the OTP flow.
 */
router.post('/send-email', async (req, res) => {
  const { toEmail, subject, message } = req.body || {};

  if (!toEmail) return res.status(400).json({ error: 'toEmail required' });

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`📧 TEST: SMTP config — host=${host} port=${process.env.SMTP_PORT || '587'} user=${user} secure=${process.env.SMTP_SECURE} requireTLS=${process.env.SMTP_REQUIRE_TLS}`);

  if (!host || !user || !pass) {
    console.error('📧 TEST: SMTP environment variables are not fully set (SMTP_HOST / SMTP_USER / SMTP_PASS)');
    return res.status(500).json({ error: 'SMTP not configured — check SMTP_HOST, SMTP_USER, SMTP_PASS env vars' });
  }

  const transporter = nodemailer.createTransport({
    host,
    port:       parseInt(process.env.SMTP_PORT || '587', 10),
    secure:     process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
    auth:       { user, pass },
  });

  try {
    console.log(`📧 TEST: Attempting to send test email to ${toEmail}...`);
    const info = await transporter.sendMail({
      from:    process.env.SMTP_FROM || `"SparkWash" <${user}>`,
      to:      toEmail,
      subject: subject || 'Test Email from SparkWash',
      text:    message || 'This is a test email to verify SMTP configuration.',
    });
    console.log(`📧 TEST: Email sent successfully! Message ID: ${info.messageId}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error(`📧 TEST: Failed to send email:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
