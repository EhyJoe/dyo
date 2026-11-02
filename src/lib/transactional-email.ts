const RESEND_ENDPOINT = "https://api.resend.com/emails";

async function sendEmail(to: string, subject: string, text: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("TRANSACTIONAL_EMAIL_NOT_CONFIGURED");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
    cache: "no-store",
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("Transactional email provider rejected the request", response.status, details);
    throw new Error("TRANSACTIONAL_EMAIL_FAILED");
  }
}

function siteUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function sendWelcomeEmail(email: string, name: string) {
  const loginUrl = siteUrl("/login");
  const greeting = name.trim() || "there";
  const subject = "Welcome to the DYO website";
  const text = `Hello ${greeting},\n\nWelcome to the Diocese of Ibadan North Youth Organization website. Your account is ready. Sign in here: ${loginUrl}\n\nOnce signed in, explore the website to register for programmes, volunteer, view your profile, and take part in other activities.\n\nWe’re glad to have you with us.\nDiocesan Youth Organization`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2e2420;max-width:600px"><h1 style="color:#7b321d">Welcome to DYO, ${escapeHtml(greeting)}!</h1><p>Your account is ready. Sign in to the Diocese of Ibadan North Youth Organization website using the button below.</p><p><a href="${loginUrl}" style="display:inline-block;background:#7b321d;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Sign in to DYO</a></p><p>Once signed in, explore the website to register for programmes, volunteer, view your profile, and take part in other activities.</p><p>We’re glad to have you with us.<br><strong>Diocesan Youth Organization</strong></p></div>`;
  await sendEmail(email, subject, text, html);
}

export async function sendProgrammeRegistrationEmail(email: string, name: string, programmeTitle: string) {
  const programmeUrl = siteUrl("/programmes");
  const greeting = name.trim() || "there";
  const title = programmeTitle.trim() || "the programme";
  const subject = `Registration received: ${title}`;
  const text = `Hello ${greeting},\n\nYour registration for ${title} was successful. You can view your programme details on the website: ${programmeUrl}\n\nIf a programme pass voucher applies, watch your email and check your account on the website. The voucher is expected within 24 hours. Once you receive it, sign in and apply the voucher on the programme page to unlock your programme pass card.\n\nYour “I will be attending” card is available from your registration.\n\nDiocesan Youth Organization`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2e2420;max-width:600px"><h1 style="color:#7b321d">Your registration is confirmed</h1><p>Hello ${escapeHtml(greeting)},</p><p>Your registration for <strong>${escapeHtml(title)}</strong> was successful.</p><p>If a programme pass voucher applies, watch your email and check your account on the website. The voucher is expected within 24 hours. Once you receive it, sign in and apply it on the programme page to unlock your programme pass card.</p><p>Your “I will be attending” card is available from your registration.</p><p><a href="${programmeUrl}" style="display:inline-block;background:#7b321d;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">View programmes</a></p><p>Diocesan Youth Organization</p></div>`;
  await sendEmail(email, subject, text, html);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
}
