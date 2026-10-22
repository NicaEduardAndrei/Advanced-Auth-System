import { Resend } from "resend";
import { config } from "./config.js";

const resend = new Resend(config.resendApiKey);

export async function sendOtpEmail(toEmail: string, otpCode: string, purpose: "EMAIL_REGISTER_VERIFY" | "EMAIL_LOGIN_2FA" | "EMAIL_ENABLE_2FA" | "EMAIL_PASSWORD_RESET") {
    let subject = ""
    let title = ""
    if (purpose === "EMAIL_REGISTER_VERIFY") {
        subject = "Verify your email address"
        title = "Welcome! Your verify code is:"
    } else if (purpose === "EMAIL_LOGIN_2FA") {
        subject = "Your 2FA authentification code"
        title = "Your authentification code is:"
    } else if (purpose === "EMAIL_ENABLE_2FA") {
        subject = "Your 2FA authentification code"
        title = "Your authentification code in order to enable 2FA is:"
    } else if (purpose === "EMAIL_PASSWORD_RESET") {
        subject = "Password reset"
        title = "Your password reset code is:"
    } else {
        return { error: true, message: "Invalid purpose" }
    }

    const { data, error } = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: toEmail,
        subject: subject,
        html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>${title}</h2>
      <p style="font-size: 24px; font-weight: bold; color: #4F46E5; letter-spacing: 4px;">
        ${otpCode}
      </p>
      <p>This code expires in 10 minutes.</p>
    </div>
  `
    });

    return { data, error }
}


