const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  // Fresh transporter each call — avoids stale cached connections after restarts.
  return nodemailer.createTransport({
    host,
    port:       parseInt(process.env.SMTP_PORT  || '587', 10),
    secure:     process.env.SMTP_SECURE      === 'true',
    requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
    auth:       { user, pass },
  });
}

// ── Wash-done order summary email ──────────────────────────────
async function sendWashDoneEmail(booking, center) {
  const t = getTransporter();
  if (!t) {
    console.log('📧 Email skipped — SMTP not configured (set SMTP_HOST/USER/PASS in .env)');
    return;
  }

  const to = booking.customer_email;
  if (!to) {
    console.log(`📧 Email skipped for ${booking.booking_ref} — no customer email on file`);
    return;
  }

  const collectAmount = Math.max(0,
    (booking.package_price || 0) - (booking.app_discount || 0) - (booking.center_discount || 0)
  );

  const washIcon  = { water:'💧', dry:'🧴', steam:'💨', d2d:'🚗' }[booking.wash_type] || '🚿';
  const washLabel = { water:'Water Wash', dry:'Dry Wash', steam:'Steam Wash', d2d:'Door-to-Door' }[booking.wash_type] || booking.wash_type;

  const discountRows = [
    booking.app_discount > 0
      ? `<tr><td style="padding:6px 0;color:#166534">🎁 SparkWash offer</td><td style="text-align:right;color:#166534">-₹${booking.app_discount}</td></tr>`
      : '',
    booking.center_discount > 0
      ? `<tr><td style="padding:6px 0;color:#1d4ed8">🏢 Center offer</td><td style="text-align:right;color:#1d4ed8">-₹${booking.center_discount}</td></tr>`
      : '',
  ].join('');

  const ratingSection = booking.rating
    ? `<div style="text-align:center;margin:24px 0">
         <div style="font-size:13px;color:#6b7280;margin-bottom:6px">Your rating</div>
         <div style="font-size:28px;letter-spacing:4px">${'⭐'.repeat(booking.rating)}</div>
       </div>`
    : `<div style="text-align:center;margin:24px 0;padding:16px;background:#f9fafb;border-radius:10px">
         <div style="font-size:13px;color:#6b7280">Enjoyed the wash? Drop us a rating next time! 😊</div>
       </div>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">🚿</div>
      <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">SparkWash</div>
      <div style="color:#94a3b8;font-size:12px;margin-top:4px">Your car is sparkling clean!</div>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;box-shadow:0 4px 12px rgba(0,0,0,.08)">

      <!-- Greeting -->
      <h2 style="margin:0 0 4px;font-size:18px;color:#0f172a">✅ Wash Complete!</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px">
        Hi <strong>${booking.customer_name}</strong>, your car wash at <strong>${center.name}</strong> is done.
      </p>

      <!-- Booking ref chip -->
      <div style="background:#f0f9ff;border-radius:8px;padding:10px 14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:#64748b;font-weight:600">BOOKING REF</span>
        <span style="font-size:14px;font-weight:800;color:#0369a1">${booking.booking_ref}</span>
      </div>

      <!-- Details card -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px">
        <div style="background:#f8fafc;padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:.5px">WASH DETAILS</div>
        <div style="padding:14px 16px;display:grid;gap:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:#6b7280">${washIcon} Wash type</span>
            <span style="font-weight:600">${washLabel}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:#6b7280">📦 Package</span>
            <span style="font-weight:600">${booking.package_name}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:#6b7280">🚗 Vehicle</span>
            <span style="font-weight:600">${booking.vehicle_plate}${booking.vehicle_model ? ' · ' + booking.vehicle_model : ''}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:#6b7280">🕐 Slot</span>
            <span style="font-weight:600">${booking.slot_time} · ${booking.slot_date}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:#6b7280">📍 Center</span>
            <span style="font-weight:600">${center.name}</span>
          </div>
        </div>
      </div>

      <!-- Price breakdown -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px">
        <div style="background:#f8fafc;padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:.5px">AMOUNT SUMMARY</div>
        <div style="padding:14px 16px">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:6px 0;color:#374151">Package price</td><td style="text-align:right;color:#374151">₹${booking.package_price}</td></tr>
            ${discountRows}
            <tr><td colspan="2" style="padding:6px 0"><hr style="border:none;border-top:1px dashed #e5e7eb;margin:4px 0"></td></tr>
            <tr>
              <td style="padding:6px 0;font-weight:700;font-size:15px;color:#0369a1">💵 Paid at center</td>
              <td style="text-align:right;font-weight:800;font-size:17px;color:#0369a1">₹${collectAmount}</td>
            </tr>
          </table>
        </div>
      </div>

      ${ratingSection}

      <!-- Footer note -->
      <div style="text-align:center;font-size:11px;color:#9ca3af;line-height:1.6;margin-top:8px">
        Thank you for using SparkWash! 🚗✨<br>
        Questions? Contact ${center.name} · ${center.mobile || ''}
      </div>
    </div>

    <!-- Bottom -->
    <div style="text-align:center;padding:16px;font-size:10px;color:#9ca3af">
      SparkWash · Powered by technology, driven by cleanliness
    </div>
  </div>
</body>
</html>`;

  const from = process.env.SMTP_FROM || `"SparkWash" <${process.env.SMTP_USER}>`;

  try {
    const info = await t.sendMail({
      from,
      to,
      subject: `✅ Wash complete — ${booking.booking_ref} | ${booking.package_name}`,
      html,
    });
    console.log(`📧 Order summary email sent to ${to} (${info.messageId})`);
  } catch (err) {
    console.error(`📧 Failed to send email to ${to}:`, err.message);
  }
}

// ── Application approval / rejection email ────────────────────
async function sendApplicationStatusEmail(app, status) {
  const t = getTransporter();
  if (!t) {
    console.log(`📧 Application ${status} email skipped — SMTP not configured`);
    return;
  }
  if (!app.email) {
    console.log(`📧 Application ${status} email skipped — no email for ${app.name}`);
    return;
  }

  const isApproved = status === 'approved';
  const html = `
<!DOCTYPE html><html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px">
    <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">${isApproved ? '✅' : '❌'}</div>
      <div style="color:#fff;font-size:22px;font-weight:800">SparkWash</div>
      <div style="color:#94a3b8;font-size:12px;margin-top:4px">Center Registration Update</div>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;box-shadow:0 4px 12px rgba(0,0,0,.08)">
      <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">${isApproved ? '🎉 Application Approved!' : '❌ Application Not Approved'}</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px">
        Dear <strong>${app.owner_name}</strong>,<br><br>
        ${isApproved
          ? `We are excited to inform you that your center <strong>${app.name}</strong> has been <strong>approved</strong> on SparkWash!`
          : `We regret to inform you that your center application for <strong>${app.name}</strong> could not be approved at this time.`}
      </p>
      ${isApproved ? `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="font-size:13px;color:#14532d;line-height:1.8">
          ✅ Your center is now <strong>live on SparkWash</strong><br>
          📱 Login using your mobile: <strong>${app.mobile}</strong><br>
          🚀 Start accepting customer bookings today!
        </div>
      </div>` : `
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="font-size:13px;color:#7f1d1d;line-height:1.8">
          ${app.notes ? `📝 Reason: ${app.notes}<br>` : ''}
          You may re-apply with updated information on the SparkWash center app.
        </div>
      </div>`}
      <div style="text-align:center;font-size:11px;color:#9ca3af;line-height:1.6;margin-top:8px">
        Questions? Reach out to SparkWash support.<br>
        SparkWash · Powered by technology, driven by cleanliness
      </div>
    </div>
  </div>
</body></html>`;

  const from    = process.env.SMTP_FROM || `"SparkWash" <${process.env.SMTP_USER}>`;
  const subject = isApproved
    ? `✅ Your SparkWash center is approved — ${app.name}`
    : `SparkWash center application update — ${app.name}`;

  try {
    const info = await t.sendMail({ from, to: app.email, subject, html });
    console.log(`📧 Application ${status} email sent to ${app.email} (${info.messageId})`);
  } catch (err) {
    console.error(`📧 Failed to send application ${status} email:`, err.message);
  }
}

// ── OTP email ─────────────────────────────────────────────────
async function sendOtpEmail(toEmail, otp, name, expiresMinutes) {
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
    <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">🚿</div>
      <div style="color:#fff;font-size:22px;font-weight:800">SparkWash Center</div>
      <div style="color:#94a3b8;font-size:12px;margin-top:4px">Center Management Portal</div>
    </div>
    <div style="background:#fff;padding:28px 24px;border-radius:0 0 16px 16px;box-shadow:0 4px 12px rgba(0,0,0,.08)">
      <h2 style="margin:0 0 6px;font-size:18px;color:#0f172a">Your Login OTP</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:13px">
        Hi <strong>${name || 'there'}</strong>! Use the code below to log in to the SparkWash Center portal.
      </p>
      <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:14px;padding:24px;text-align:center;margin-bottom:20px">
        <div style="font-size:11px;color:#16a34a;font-weight:700;letter-spacing:1px;margin-bottom:8px">ONE-TIME PASSWORD</div>
        <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#15803d;font-family:monospace">${otp}</div>
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
    await t.sendMail({ from, to: toEmail, subject: `${otp} is your SparkWash Center OTP`, html });
    console.log(`📧 OTP email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`📧 Failed to send OTP email to ${toEmail}:`, err.message);
    return false;
  }
}

module.exports = { sendWashDoneEmail, sendApplicationStatusEmail, sendOtpEmail };
