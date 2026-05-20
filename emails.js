'use strict';
// emails.js — Techofy Cloud · Apple iOS–Inspired Email Templates

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const F  = `-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif`;
const FM = `'SF Mono','Fira Code','Fira Mono','Courier New',monospace`;

// ─── Shared Components ──────────────────────────────────────────────────────────

function htmlShell(inner) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="color-scheme" content="light"/>
<meta name="x-apple-disable-message-reformatting"/>
</head>
<body style="margin:0;padding:0;background:#f2f2f7;font-family:${F};-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2f2f7;">
<tr><td style="padding:40px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.06);">
    ${inner}
  </table>
  <!-- Footer Note -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;margin:0 auto;">
  <tr><td style="padding:20px 0 0;text-align:center;">
    <p style="margin:0;font-family:${F};font-size:11px;color:#aeaeb2;line-height:1.8;">
      © 2025 Techofy Cloud · Enterprise VPS &amp; RDP Hosting<br/>
      <a href="mailto:support@techofy.xyz" style="color:#aeaeb2;text-decoration:none;">support@techofy.xyz</a>
      &nbsp;·&nbsp;
      <a href="https://t.me/Techofy" style="color:#aeaeb2;text-decoration:none;">Telegram</a>
    </p>
  </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/* Minimal brand header — logo wordmark + subtitle only */
function brandHeader(subtitle, accentColor) {
  const accent = accentColor || '#007AFF';
  return `
<tr><td style="padding:32px 36px 28px;border-bottom:1px solid #f2f2f7;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td style="vertical-align:middle;">
        <!-- Wordmark -->
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <div style="width:32px;height:32px;background:${accent};border-radius:8px;display:inline-block;text-align:center;line-height:32px;">
                <span style="font-family:${F};font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-1px;">T</span>
              </div>
            </td>
            <td style="vertical-align:middle;">
              <p style="margin:0;font-family:${F};font-size:16px;font-weight:700;color:#1c1c1e;letter-spacing:-0.3px;">Techofy Cloud</p>
              <p style="margin:0;font-family:${F};font-size:11px;color:#8e8e93;">${subtitle}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</td></tr>`;
}

/* Compact footer inside the card */
function brandFooter() {
  return `
<tr><td style="padding:24px 36px;border-top:1px solid #f2f2f7;text-align:center;">
  <p style="margin:0 0 8px;font-family:${F};font-size:12px;font-weight:600;color:#3a3a3c;">Techofy Cloud</p>
  <p style="margin:0;font-family:${F};font-size:12px;color:#aeaeb2;line-height:1.8;">
    <a href="mailto:support@techofy.xyz" style="color:#007AFF;text-decoration:none;font-weight:500;">support@techofy.xyz</a>
    &nbsp;·&nbsp;
    <a href="https://t.me/Techofy" style="color:#007AFF;text-decoration:none;font-weight:500;">Telegram Support</a>
  </p>
</td></tr>`;
}

/* Hairline divider */
function divider() {
  return `<tr><td style="padding:0 36px;"><div style="height:1px;background:#f2f2f7;"></div></td></tr>`;
}

/* iOS-style filled CTA button */
function ctaButton(href, text, color) {
  const bg = color || '#007AFF';
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td style="padding:6px 0 4px;text-align:center;">
  <a href="${href}"
     style="display:inline-block;background:${bg};color:#ffffff;font-family:${F};font-size:15px;font-weight:600;padding:14px 40px;border-radius:980px;text-decoration:none;letter-spacing:-0.2px;">
    ${text}
  </a>
</td></tr>
</table>`;
}

/* Key–value row inside a table block */
function row(label, value, last) {
  return `
<tr>
  <td style="padding:12px 20px;font-family:${F};font-size:13px;color:#8e8e93;width:38%;${last ? '' : 'border-bottom:1px solid #f2f2f7;'}">${label}</td>
  <td style="padding:12px 20px;font-family:${F};font-size:13px;font-weight:600;color:#1c1c1e;${last ? '' : 'border-bottom:1px solid #f2f2f7;'}">${value}</td>
</tr>`;
}

// ─── 1. OTP EMAIL ──────────────────────────────────────────────────────────────
function otpEmail({ firstName, otp, expiresMin = 10 }) {
  return htmlShell(`
${brandHeader('Email Verification')}

<tr><td style="padding:36px 36px 12px;">
  <p style="margin:0 0 6px;font-family:${F};font-size:26px;font-weight:700;color:#1c1c1e;letter-spacing:-0.6px;">Verify your email</p>
  <p style="margin:0;font-family:${F};font-size:15px;color:#636366;line-height:1.6;">
    Hi <strong style="color:#1c1c1e;">${firstName}</strong>, use the code below to verify your Techofy Cloud account.
  </p>
</td></tr>

<!-- OTP Block -->
<tr><td style="padding:24px 36px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#f2f2f7;border-radius:14px;overflow:hidden;">
    <tr><td style="padding:28px 24px;text-align:center;">
      <p style="margin:0 0 10px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:1.5px;color:#8e8e93;text-transform:uppercase;">One-Time Code</p>
      <p style="margin:0;font-family:${FM};font-size:46px;font-weight:700;letter-spacing:12px;color:#007AFF;text-indent:12px;">${otp}</p>
      <p style="margin:10px 0 0;font-family:${F};font-size:12px;color:#aeaeb2;">Expires in <strong>${expiresMin} minutes</strong> &nbsp;·&nbsp; Single use only</p>
    </td></tr>
  </table>
</td></tr>

<!-- Security Notice -->
<tr><td style="padding:0 36px 36px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#fff8f0;border:1px solid #ffe4c4;border-radius:12px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0;font-family:${F};font-size:13px;color:#7c4a00;line-height:1.6;">
        <strong>Security:</strong> Techofy Cloud will never ask for your OTP via phone, chat, or email. Only enter this code on our website.
      </p>
    </td></tr>
  </table>
</td></tr>

${brandFooter()}
`);
}

// ─── 2. ORDER CONFIRMATION — FREE PLAN ─────────────────────────────────────────
function freeOrderEmail({ firstName, lastName, orderId, planType, planName, planRam, email }) {
  return htmlShell(`
${brandHeader('Order Confirmation')}

<tr><td style="padding:36px 36px 12px;">
  <!-- Status Badge -->
  <p style="margin:0 0 16px;">
    <span style="background:#fff0f5;color:#ff375f;font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.4px;padding:5px 12px;border-radius:980px;border:1px solid rgba(255,55,95,0.2);">Pending Review</span>
  </p>
  <p style="margin:0 0 6px;font-family:${F};font-size:26px;font-weight:700;color:#1c1c1e;letter-spacing:-0.6px;">Order Received</p>
  <p style="margin:0;font-family:${F};font-size:15px;color:#636366;line-height:1.6;">
    Hi <strong style="color:#1c1c1e;">${firstName} ${lastName}</strong>, your free ${planType} request is under review. We're checking your YouTube subscription proof and will provision your server shortly.
  </p>
</td></tr>

<!-- Order Details -->
<tr><td style="padding:24px 36px 0;">
  <p style="margin:0 0 10px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:1.2px;color:#8e8e93;text-transform:uppercase;">Order Summary</p>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="border:1px solid #e5e5ea;border-radius:14px;overflow:hidden;">
    ${row('Order ID',  `<span style="font-family:${FM};font-size:12.5px;">${orderId}</span>`)}
    ${row('Plan',      `${planType} ${planName} — <span style="color:#34c759;font-weight:700;">Free</span>`)}
    ${row('RAM',       planRam)}
    ${row('Email',     `<span style="font-family:${FM};font-size:12px;">${email}</span>`, true)}
  </table>
</td></tr>

<!-- Steps -->
<tr><td style="padding:24px 36px 0;">
  <p style="margin:0 0 14px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:1.2px;color:#8e8e93;text-transform:uppercase;">What Happens Next</p>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td style="width:28px;vertical-align:top;padding-top:1px;">
        <div style="width:20px;height:20px;background:#007AFF;border-radius:980px;text-align:center;line-height:20px;">
          <span style="font-family:${FM};font-size:10px;font-weight:700;color:#fff;">1</span>
        </div>
      </td>
      <td style="padding-bottom:14px;padding-left:10px;font-family:${F};font-size:13px;color:#636366;line-height:1.6;">Our team verifies your YouTube subscription screenshot.</td>
    </tr>
    <tr>
      <td style="width:28px;vertical-align:top;padding-top:1px;">
        <div style="width:20px;height:20px;background:#007AFF;border-radius:980px;text-align:center;line-height:20px;">
          <span style="font-family:${FM};font-size:10px;font-weight:700;color:#fff;">2</span>
        </div>
      </td>
      <td style="padding-bottom:14px;padding-left:10px;font-family:${F};font-size:13px;color:#636366;line-height:1.6;">Once approved, your <strong style="color:#1c1c1e;">${planRam} ${planType}</strong> server is provisioned.</td>
    </tr>
    <tr>
      <td style="width:28px;vertical-align:top;padding-top:1px;">
        <div style="width:20px;height:20px;background:#007AFF;border-radius:980px;text-align:center;line-height:20px;">
          <span style="font-family:${FM};font-size:10px;font-weight:700;color:#fff;">3</span>
        </div>
      </td>
      <td style="padding-left:10px;font-family:${F};font-size:13px;color:#636366;line-height:1.6;">Credentials are sent to this email. Expected: <strong style="color:#1c1c1e;">2–12 hours</strong> after approval.</td>
    </tr>
  </table>
</td></tr>

<!-- CTA -->
<tr><td style="padding:28px 36px 36px;">
  ${ctaButton(`https://techofy.cloud/tracking.html?id=${orderId}`, 'Track Your Order')}
</td></tr>

${brandFooter()}
`);
}

// ─── 3. ORDER CONFIRMATION — PAID PLAN ─────────────────────────────────────────
function paidOrderEmail({ firstName, lastName, orderId, planType, planName, planPrice, planRam, email }) {
  return htmlShell(`
${brandHeader('Order Confirmation')}

<tr><td style="padding:36px 36px 12px;">
  <p style="margin:0 0 16px;">
    <span style="background:#fffbea;color:#ff9500;font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.4px;padding:5px 12px;border-radius:980px;border:1px solid rgba(255,149,0,0.25);">Awaiting Payment</span>
  </p>
  <p style="margin:0 0 6px;font-family:${F};font-size:26px;font-weight:700;color:#1c1c1e;letter-spacing:-0.6px;">Order Received</p>
  <p style="margin:0;font-family:${F};font-size:15px;color:#636366;line-height:1.6;">
    Hi <strong style="color:#1c1c1e;">${firstName} ${lastName}</strong>, your ${planType} order is confirmed. Your server will be live once payment is received.
  </p>
</td></tr>

<!-- Order Details -->
<tr><td style="padding:24px 36px 0;">
  <p style="margin:0 0 10px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:1.2px;color:#8e8e93;text-transform:uppercase;">Order Summary</p>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="border:1px solid #e5e5ea;border-radius:14px;overflow:hidden;">
    ${row('Order ID', `<span style="font-family:${FM};font-size:12.5px;">${orderId}</span>`)}
    ${row('Plan',     `${planType} ${planName}`)}
    ${row('RAM',      planRam)}
    ${row('Email',    `<span style="font-family:${FM};font-size:12px;">${email}</span>`)}
    ${row('Price',    `<span style="font-size:16px;font-weight:700;color:#007AFF;">${planPrice}</span>`, true)}
  </table>
</td></tr>

<!-- Payment Note -->
<tr><td style="padding:20px 36px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#f2f9ff;border:1px solid #c6e2ff;border-radius:12px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 6px;font-family:${F};font-size:13px;font-weight:600;color:#0a4d8c;">Payment Instructions</p>
      <p style="margin:0;font-family:${F};font-size:13px;color:#2c6aa0;line-height:1.7;">
        Payment details will be sent via a separate email shortly. After payment confirmation, your server will be live in <strong>2–6 hours</strong>.<br/>
        Questions? <a href="https://t.me/Techofy" style="color:#007AFF;font-weight:600;text-decoration:none;">Contact us on Telegram →</a>
      </p>
    </td></tr>
  </table>
</td></tr>

<!-- CTA -->
<tr><td style="padding:28px 36px 36px;">
  ${ctaButton(`https://techofy.cloud/tracking.html?id=${orderId}`, 'Track Your Order')}
</td></tr>

${brandFooter()}
`);
}

// ─── 4. SERVER CREDENTIALS EMAIL ───────────────────────────────────────────────
function credentialsEmail({ firstName, lastName, orderId, planType, planName, planRam, ip, username, password }) {
  const connectInstr = planType === 'RDP'
    ? `<tr><td style="padding:18px 20px;border-top:1px solid #f2f2f7;">
        <p style="margin:0 0 8px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:1.2px;color:#8e8e93;text-transform:uppercase;">Connect via RDP</p>
        <p style="margin:0;font-family:${F};font-size:13px;color:#636366;line-height:1.8;">
          <strong style="color:#1c1c1e;">Windows:</strong> Win + R → type <span style="font-family:${FM};background:#f2f2f7;padding:2px 8px;border-radius:5px;font-size:12px;">mstsc</span> → enter IP → log in.<br/>
          <strong style="color:#1c1c1e;">Mac:</strong> Install <strong>Microsoft Remote Desktop</strong> from App Store and add the IP above.
        </p>
      </td></tr>`
    : `<tr><td style="padding:18px 20px;border-top:1px solid #f2f2f7;">
        <p style="margin:0 0 8px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:1.2px;color:#8e8e93;text-transform:uppercase;">Connect via SSH</p>
        <p style="margin:0 0 10px;font-family:${F};font-size:13px;color:#636366;">Open your terminal and run:</p>
        <div style="background:#1c1c1e;border-radius:10px;padding:14px 18px;">
          <span style="font-family:${FM};font-size:13px;color:#34c759;">ssh ${username}@${ip}</span>
        </div>
        <p style="margin:8px 0 0;font-family:${F};font-size:12px;color:#8e8e93;">Enter your password when prompted.</p>
      </td></tr>`;

  return htmlShell(`
${brandHeader('Server Credentials — Confidential', '#34c759')}

<tr><td style="padding:36px 36px 12px;">
  <p style="margin:0 0 16px;">
    <span style="background:#f0fff4;color:#34c759;font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.4px;padding:5px 12px;border-radius:980px;border:1px solid rgba(52,199,89,0.3);">Server Live</span>
  </p>
  <p style="margin:0 0 6px;font-family:${F};font-size:26px;font-weight:700;color:#1c1c1e;letter-spacing:-0.6px;">Your Server is Ready</p>
  <p style="margin:0;font-family:${F};font-size:15px;color:#636366;line-height:1.6;">
    Hi <strong style="color:#1c1c1e;">${firstName} ${lastName}</strong>, your <strong>${planRam} ${planType}</strong> server is live. Save these credentials securely and do not share them with anyone.
  </p>
</td></tr>

<!-- Credentials Block -->
<tr><td style="padding:24px 36px 0;">
  <p style="margin:0 0 10px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:1.2px;color:#8e8e93;text-transform:uppercase;">Access Credentials</p>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="border:1px solid #e5e5ea;border-radius:14px;overflow:hidden;">
    ${row('Order ID',   `<span style="font-family:${FM};font-size:12.5px;">${orderId}</span>`)}
    ${row('Plan',       `${planType} ${planName} — ${planRam}`)}
    ${row('IP Address', `<span style="font-family:${FM};font-size:17px;font-weight:700;color:#34c759;">${ip}</span>`)}
    ${row('Username',   `<span style="font-family:${FM};font-size:14px;font-weight:600;color:#1c1c1e;">${username}</span>`)}
    ${row('Password',   `<span style="font-family:${FM};font-size:14px;font-weight:600;color:#ff375f;">${password}</span>`, true)}
  </table>
</td></tr>

<!-- Connection Instructions -->
<tr><td style="padding:20px 36px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="border:1px solid #e5e5ea;border-radius:14px;overflow:hidden;">
    ${connectInstr}
  </table>
</td></tr>

<!-- Security Warning -->
<tr><td style="padding:20px 36px 36px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#fffbea;border:1px solid #ffe4a0;border-radius:12px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0 0 4px;font-family:${F};font-size:13px;font-weight:600;color:#7c5600;">Security Advisory</p>
      <p style="margin:0;font-family:${F};font-size:13px;color:#a06a00;line-height:1.7;">Change your password immediately after your first login. This email contains sensitive credentials — delete it after saving them to a secure location.</p>
    </td></tr>
  </table>
</td></tr>

${brandFooter()}
`);
}

// ─── 5. PAYMENT DETAILS EMAIL ───────────────────────────────────────────────────
function paymentEmail({ firstName, lastName, orderId, planName, planType, planPrice, amount }) {

  function cryptoRow(label, address, iconColor, bg, borderColor) {
    return `
<tr><td style="padding:6px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${bg};border:1px solid ${borderColor};border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:11px 16px 10px;border-bottom:1px solid ${borderColor};">
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle;padding-right:8px;">
              <div style="width:8px;height:8px;background:${iconColor};border-radius:980px;"></div>
            </td>
            <td style="vertical-align:middle;">
              <span style="font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.4px;color:#1c1c1e;">${label}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 16px 12px;">
        <span style="font-family:${FM};font-size:12px;font-weight:500;color:#3a3a3c;word-break:break-all;line-height:1.5;">${address}</span>
      </td>
    </tr>
  </table>
</td></tr>`;
  }

  return htmlShell(`
${brandHeader('Payment Required', '#5856d6')}

<tr><td style="padding:36px 36px 12px;">
  <p style="margin:0 0 6px;font-family:${F};font-size:26px;font-weight:700;color:#1c1c1e;letter-spacing:-0.6px;">Complete Your Payment</p>
  <p style="margin:0;font-family:${F};font-size:15px;color:#636366;line-height:1.6;">
    Hi <strong style="color:#1c1c1e;">${firstName} ${lastName}</strong>, complete your payment to activate your <strong>${planType} ${planName} Plan</strong>. Send proof after payment and your server goes live in <strong>2–6 hours</strong>.
  </p>
</td></tr>

<!-- Order Summary -->
<tr><td style="padding:24px 36px 0;">
  <p style="margin:0 0 10px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:1.2px;color:#8e8e93;text-transform:uppercase;">Order Summary</p>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="border:1px solid #e5e5ea;border-radius:14px;overflow:hidden;">
    ${row('Order ID',   `<span style="font-family:${FM};font-size:12.5px;">${orderId}</span>`)}
    ${row('Plan',       `${planType} ${planName}`)}
    ${row('Amount Due', `<span style="font-size:18px;font-weight:700;color:#5856d6;">${amount || planPrice}</span>`, true)}
  </table>
</td></tr>

<!-- Payment Methods -->
<tr><td style="padding:24px 36px 0;">
  <p style="margin:0 0 10px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:1.2px;color:#8e8e93;text-transform:uppercase;">Payment Addresses</p>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    ${cryptoRow('USDT — BEP20 (BSC)',      '0xYourBEP20WalletAddressHere',   '#007AFF', '#f0f8ff', '#c6e2ff')}
    ${cryptoRow('USDT — TRC20 (Tron)',     'TYourTRC20WalletAddressHere',    '#34c759', '#f0fff4', '#b9f5cc')}
    ${cryptoRow('USDT — Polygon (MATIC)',  '0xYourPolygonWalletAddressHere', '#5856d6', '#f5f4ff', '#d4d3ff')}
    ${cryptoRow('Litecoin (LTC)',          'LYourLitecoinAddressHere',       '#ff9500', '#fffbea', '#ffe4a0')}
  </table>
</td></tr>

<!-- After Payment -->
<tr><td style="padding:20px 36px 36px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#f2f2f7;border-radius:12px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 8px;font-family:${F};font-size:13px;font-weight:600;color:#1c1c1e;">After Payment</p>
      <p style="margin:0;font-family:${F};font-size:13px;color:#636366;line-height:1.8;">
        Reply to this email with your <strong style="color:#1c1c1e;">payment screenshot + transaction hash</strong>.<br/>
        Or send proof on Telegram: <a href="https://t.me/Techofy" style="color:#007AFF;font-weight:600;text-decoration:none;">@Techofy</a><br/>
        Server will be activated within <strong style="color:#1c1c1e;">2–6 hours</strong> of confirmation.
      </p>
    </td></tr>
  </table>
</td></tr>

${brandFooter()}
`);
}

module.exports = { otpEmail, freeOrderEmail, paidOrderEmail, credentialsEmail, paymentEmail };
