
  import transporter from "../config/mailer";

  // On ajoute 'export' directement devant la fonction
  export const sendWelcomeEmail = async (userEmail: string, code: string) => {
  const mailOptions = {
    from: '"Mon API WhatsApp" <DevcodeApiWhatsapp@gmail.com>',
    to: userEmail,
    subject: 'Bienvenue dans votre API_Whatsapp - Code de vérification',
    html: `
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        
        <!-- Header bleu -->
        <div style="background-color: #4f46e5; padding: 30px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px;">Devcode Camer</h1>
        </div>

        <!-- Corps de l'email -->
        <div style="padding: 30px;">
          <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #000;">Activez votre compte</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Merci de rejoindre <strong>notre Api de vente d'sms whatsapp</strong>. Voici votre code de vérification pour activer votre compte :
          </p>

          <!-- Zone du code -->
          <div style="background-color: #f3f4f6; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <span style="font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #111827;">${code}</span>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            Ce code est valable <strong>5 minutes</strong>. Si vous n'avez pas demandé ce code, ignorez cet email.
          </p>
        </div>

      </div>
    </div>
    `,
  };

    return transporter.sendMail(mailOptions);
  };
 
  // Ajouter ces deux fonctions dans votre emailService.ts existant

export async function sendTicketCreatedEmail(
  to: string,
  ticket: { ticketRef: string; subject: string; priority: string; date: string; userName: string; userEmail: string }
) {
  await transporter.sendMail({
    from:    `"WabaPlatform Support" <${process.env.MAIL_USER}>`,
    to,
    subject: `🎫 Nouveau ticket ${ticket.ticketRef} — ${ticket.subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#1a56db">Nouveau ticket de support</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;color:#6b7280">Référence</td><td style="padding:8px;font-weight:bold">${ticket.ticketRef}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Sujet</td><td style="padding:8px">${ticket.subject}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Priorité</td><td style="padding:8px">${ticket.priority}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Date</td><td style="padding:8px">${ticket.date}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Client</td><td style="padding:8px">${ticket.userName}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Email</td><td style="padding:8px">${ticket.userEmail}</td></tr>
        </table>
        <h5 style="color:#1a56db">Consultez vos ticket dans la plateforme </h5>
        
      </div>
    `,
  });
}

export async function sendTicketReplyEmail(
  to: string,
  ticket: { ticketRef: string; subject: string; userName: string }
) {
  await transporter.sendMail({
    from:    `"WabaPlatform Support" <${process.env.MAIL_USER}>`,
    to,
    subject: `💬 Réponse à votre ticket ${ticket.ticketRef}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#1a56db">Bonjour ${ticket.userName},</h2>
        <p>L'équipe support a répondu à votre ticket <strong>${ticket.ticketRef}</strong> : <em>${ticket.subject}</em>.</p>
        <h5 style="color:#1a56db"> Veillez consulter vos ticket dans la plateforme </h5>
      </div>
    `,
  });
}
