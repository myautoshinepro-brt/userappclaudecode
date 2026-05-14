// ============================================================
// Pitbay — sms.js
// Sends OTP messages via SMS. Supports MSG91 (recommended for India) and
// Twilio. When neither is configured, logs the OTP to console and returns
// success so dev/test flows keep working — the route handler will also
// include the OTP in the response under DEV_MODE so the client can autofill.
// ============================================================

const SMS_PROVIDER = (process.env.SMS_PROVIDER || 'log').toLowerCase();

function _normaliseE164(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return null;
  // Assume Indian numbers if 10 digits and no country code prefix.
  if (digits.length === 10 && /^[6-9]/.test(digits)) return '91' + digits;
  return digits;            // already has country code or is a non-IN number
}

async function _sendViaMsg91(e164, otp, minutes) {
  const authkey   = process.env.MSG91_AUTH_KEY;
  const template  = process.env.MSG91_TEMPLATE_ID;
  if (!authkey || !template) throw new Error('MSG91 not configured');

  // MSG91 has a dedicated OTP API that handles delivery + retries server-side.
  const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(template)}&mobile=${encodeURIComponent(e164)}&otp=${encodeURIComponent(otp)}&otp_expiry=${minutes || 5}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { authkey, 'Content-Type': 'application/json' },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.type === 'error') {
    throw new Error('MSG91 ' + r.status + ' ' + (body.message || body.error || ''));
  }
  return { ok: true, via: 'msg91', requestId: body.request_id };
}

async function _sendViaTwilio(e164, otp, minutes) {
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !auth || !from) throw new Error('Twilio not configured');

  const body = `Your Pitbay verification code is ${otp}. Valid for ${minutes || 5} minutes. Do not share with anyone.`;
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:  'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${auth}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: '+' + e164, Body: body }).toString(),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Twilio ' + r.status + ' ' + (data.message || ''));
  return { ok: true, via: 'twilio', sid: data.sid };
}

/**
 * Send an OTP via SMS. Returns { ok: true, via } on success.
 * Throws on hard failure. Resolves successfully (via: 'log') when no
 * provider is configured — useful so dev / staging flows continue to work
 * without a paid SMS account.
 */
async function sendOtpSms(mobile, otp, minutes = 5) {
  const e164 = _normaliseE164(mobile);
  if (!e164) throw new Error('Invalid mobile number');

  switch (SMS_PROVIDER) {
    case 'msg91':  return _sendViaMsg91(e164, otp, minutes);
    case 'twilio': return _sendViaTwilio(e164, otp, minutes);
    default:
      // No provider configured. Log loudly so the operator notices, then
      // return success — DEV_MODE will include the OTP in the API response
      // for autofill.
      console.log(`📱 [SMS-LOG] OTP for +${e164}: ${otp} (set SMS_PROVIDER + provider creds to enable real SMS)`);
      return { ok: true, via: 'log' };
  }
}

module.exports = { sendOtpSms };
