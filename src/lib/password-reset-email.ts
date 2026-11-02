const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendPasswordResetCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("PASSWORD_RESET_EMAIL_NOT_CONFIGURED");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your DYO password reset code",
      text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("Password reset email provider rejected the request", response.status, details);
    throw new Error("PASSWORD_RESET_EMAIL_FAILED");
  }
}
