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

  const name              = (formData.get('name') || '').toString().trim();
  const email             = (formData.get('email') || '').toString().trim();
  const organization      = (formData.get('organization') || '').toString().trim();
  const organizationType  = (formData.get('organization-type') || '').toString().trim();
  const ufgsWork          = (formData.get('ufgs-work') || '').toString().trim();
  const specsIntactUse    = (formData.get('specsintact-use') || '').toString().trim();
  const specsIntactNotes  = (formData.get('specsintact-details') || '').toString().trim(); // optional
  const heardFrom         = (formData.get('heard-from') || '').toString().trim();

  // All required fields must be present (specsIntactNotes is optional)
  if (!name || !email || !organization || !organizationType || !ufgsWork || !specsIntactUse || !heardFrom) {
    return jsonResponse({ ok: false, error: 'All required fields must be filled.' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ ok: false, error: 'Please provide a valid email address.' }, 400);
  }

  // Validate organization type against the allow-list
  const allowedOrgTypes = ['A/E firm', 'Construction company', 'Consulting firm', 'Government / military agency', 'Other'];
  if (!allowedOrgTypes.includes(organizationType)) {
    return jsonResponse({ ok: false, error: 'Invalid organization type.' }, 400);
  }
  if (!['Yes', 'No', 'Other'].includes(specsIntactUse)) {
    return jsonResponse({ ok: false, error: 'Invalid SpecsIntact use selection.' }, 400);
  }

  // Cap field lengths to prevent abuse
  const lengthChecks = [
    [name, 200], [email, 200], [organization, 200], [heardFrom, 500],
    [ufgsWork, FIELD_LIMIT], [specsIntactNotes, FIELD_LIMIT],
  ];
  for (const [v, limit] of lengthChecks) {
    if (v.length > limit) {
      return jsonResponse(
        { ok: false, error: `One or more fields exceed the allowed length.` },
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

  // Plain-text body — easy to read in any email client
  const textLines = [
    `New beta application from ${name}.`,
    '',
    `Name:              ${name}`,
    `Email:             ${email}`,
    `Organization:      ${organization}`,
    `Organization type: ${organizationType}`,
    '',
    'UFGS work:',
    ufgsWork,
    '',
    `Currently uses SpecsIntact: ${specsIntactUse}`,
  ];
  if (specsIntactNotes) {
    textLines.push('', 'Notes on workflow:', specsIntactNotes);
  }
  textLines.push(
    '',
    `Heard about us via: ${heardFrom}`,
    '',
    '---',
    'Sent from the request-access form on www.specstage.com.',
    'Reply directly to this email to respond to the applicant.',
  );
  const text = textLines.join('\n');

  // HTML version for clients that prefer it
  const htmlNotesBlock = specsIntactNotes
    ? `<p><strong>Notes on workflow:</strong><br>${escapeHtml(specsIntactNotes).replace(/\n/g, '<br>')}</p>`
    : '';
  const html = `
    <p><strong>New beta application from ${escapeHtml(name)}.</strong></p>
    <table style="border-collapse:collapse;font-size:14px">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Name:</td><td>${escapeHtml(name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Email:</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Organization:</td><td>${escapeHtml(organization)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Type:</td><td>${escapeHtml(organizationType)}</td></tr>
    </table>
    <p><strong>UFGS work:</strong><br>${escapeHtml(ufgsWork).replace(/\n/g, '<br>')}</p>
    <p><strong>Currently uses SpecsIntact:</strong> ${escapeHtml(specsIntactUse)}</p>
    ${htmlNotesBlock}
    <p><strong>Heard about us via:</strong> ${escapeHtml(heardFrom)}</p>
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
        subject: `SpecStage beta application — ${name} (${organizationType})`,
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
