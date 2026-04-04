"use server";

import { Resend } from 'resend';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  business: string;
  message?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactFormAction(data: ContactFormData) {
  try {
    console.log("=== NEW CONTACT FORM SUBMISSION ===");
    console.log("Name:", data.name);
    console.log("Email:", data.email);
    console.log("Phone:", data.phone || "Not provided");
    console.log("Business:", data.business);
    console.log("Message:", data.message || "No message");
    console.log("====================================");

    // Send email via Resend
    const targetEmail = process.env.CONTACT_EMAIL || 'info@telio.sk';
    const { data: resData, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: targetEmail,
      replyTo: data.email,
      subject: `Nová správa od: ${data.name} (${data.business})`,
      text: `Meno: ${data.name}\nEmail: ${data.email}\nTel: ${data.phone || "Nezadané"}\nBiznis: ${data.business}\n\nSpráva:\n${data.message || "Bez správy"}`
    });

    if (error) {
        console.error("Resend delivery error:", error);
        // Dočasne pridávame surovú chybu pre debugging
        return { success: false, error: `Chyba Resend: ${error.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error("Contact form general error:", error);
    return { success: false, error: "Vyskytla sa neočakávaná chyba pri odosielaní." };
  }
}
