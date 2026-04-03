"use server";

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  business: string;
  message?: string;
}

export async function sendContactFormAction(data: ContactFormData) {
  try {
    console.log("=== NEW CONTACT FORM SUBMISSION ===");
    console.log("Name:", data.name);
    console.log("Email:", data.email);
    console.log("Phone:", data.phone || "Not provided");
    console.log("Business:", data.business);
    console.log("Message:", data.message || "No message");
    console.log("====================================");

    // TODO: Integrate with a mail provider (e.g. Resend, SendGrid)
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'Telio Web <system@telio.sk>',
    //   to: 'info@telio.sk',
    //   subject: `Nová správa od: ${data.name} (${data.business})`,
    //   text: `Meno: ${data.name}\nEmail: ${data.email}\nTel: ${data.phone}\nBiznis: ${data.business}\n\nSpráva:\n${data.message}`
    // });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return { success: true };
  } catch (error) {
    console.error("Contact form error:", error);
    return { success: false, error: "Nepodarilo sa odoslať formulár. Skúste to prosím neskôr." };
  }
}
