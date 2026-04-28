// functions/submit-application.js
//
// Cloudflare Pages Function that receives the beta-application form POST,
// validates it, and forwards it to hello@specstage.com via Resend.
//
// Routes automatically as POST /submit-application by virtue of its path.
// Requires the env var RESEND_API_KEY (set in Cloudflare Pages dashboard).

const ALLOWED_ORIGINS = [
  'https://www.specstage.com',
  'https://specstage.com',
];

const FIELD_LIMIT = 4000; // characters per field — anything longer is suspect

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Origin check — block obvious cross-site posting
  const origin = request.headers.get('origin') || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return jsonResponse({ ok: false, error: 'Disallowed origin.' }, 403);
  }

  // Parse form data
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: 'Could not parse submission.' }, 400);
  }

  // Honeypot — bots fill _gotcha; humans don't.
  // Return 200 ok so the bot thinks it succeeded.
  if (formData.get('_gotcha')) {
    return jsonResponse({ ok: true }, 200);
  }

  const email = (formData.get('email') || '').toString().trim();
  const q1    = (formData.get('UFGS project types') || '').toString().trim();
  const q2    = (formData.get('Tailoring frequency') || '').toString().trim();
  const q3    = (formData.get('SpecsIntact use') || '').toString().trim();
  const q4    = (formData.get('Test section') || '').toString().trim();

  if (!email || !q1 || !q2 || !q3 || !q4) {
    return jsonResponse({ ok: false, error: 'All fields are required.' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ ok: false, error: 'Please provide a valid email address.' }, 400);
  }

  for (const v of [q1, q2, q3, q4]) {
    if (v.length > FIELD_LIMIT) {
      return jsonResponse(
        { ok: false, error: `One or more fields exceed the ${FIELD_LIMIT} character limit.` },
        400
      );
    }
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse(
      { ok: false, error: 'Mail service not configured. Please email hello@specstage.com directly.' },
      503
    );
  }

  // Plain-text body for the email — easy to read in any client
  const text = [
    'New beta application received.',
    '',
    `From: ${email}`,
    '',
    '1. What type of UFGS projects do you work on?',
    q1,
    '',
    '2. How often do you tailor specifications?',
    q2,
    '',
    '3. Do you currently use SpecsIntact?',
    q3,
    '',
    '4. One section to test with SpecStage:',
    q4,
    '',
    '---',
    'Sent from the request-access form on www.specstage.com.',
    'Reply directly to this email to respond to the applicant.',
  ].join('\n');

  // Minimal HTML version for clients that prefer HTML
  const html = `
    <p><strong>New beta application received.</strong></p>
    <p><strong>From:</strong> ${escapeHtml(email)}</p>
    <p><strong>1. UFGS project types:</strong><br>${escapeHtml(q1).replace(/\n/g, '<br>')}</p>
    <p><strong>2. Tailoring frequency:</strong><br>${escapeHtml(q2).replace(/\n/g, '<br>')}</p>
    <p><strong>3. SpecsIntact use:</strong><br>${escapeHtml(q3).replace(/\n/g, '<br>')}</p>
    <p><strong>4. Section to test:</strong><br>${escapeHtml(q4).replace(/\n/g, '<br>')}</p>
    <hr>
    <p style="color:#888;font-size:12px">Sent from the request-access form on www.specstage.com. Reply directly to respond to the applicant.</p>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SpecStage Site <noreply@specstage.com>',
        to: ['hello@specstage.com'],
        reply_to: email,
        subject: `SpecStage beta application — ${email}`,
        text,
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text().catch(() => '');
      console.error('Resend send failed', resendRes.status, detail);
      return jsonResponse(
        { ok: false, error: 'Could not deliver your application right now. Please email hello@specstage.com directly.' },
        502
      );
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error('submit-application unexpected error', err);
    return jsonResponse(
      { ok: false, error: 'A server error occurred. Please email hello@specstage.com directly.' },
      500
    );
  }
}

// Reject other methods explicitly
export async function onRequest(context) {
  return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405, {
    'Allow': 'POST',
  });
}
