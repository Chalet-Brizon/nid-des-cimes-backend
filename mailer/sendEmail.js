const nodemailer = require("nodemailer");
const path = require("path");

async function sendEmail({ to, subject, text, html }) {
  try {
    // Transporter Gmail sécurisé + compatibilité Windows/Avast
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: "SSLv3"
      }
    });

    // Envoi email
    await transporter.sendMail({
      from: `"Le Nid des Alpes" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: "logo.png",
          path: path.join(process.cwd(), "public", "logo.png"),
          cid: "logo_nid_des_alpes"
        }
      ]
    });

    console.log("📨 Email envoyé à :", to);

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email :", error);
  }
}

export { sendEmail };
