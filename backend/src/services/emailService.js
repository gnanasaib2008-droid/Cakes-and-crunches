const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, html) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = process.env.EMAIL_PORT || 587;

  console.log(`[Email Notification Outbox]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body (Plain): ${text}`);
  console.log(`-----------------------------------`);

  // If no SMTP configured, return mock success
  if (!emailUser || !emailPass) {
    console.log(`[Email Service] Mock email sent successfully (SMTP not configured).`);
    return { mock: true, messageId: 'mock-id-' + Date.now() };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: parseInt(emailPort),
      secure: emailPort == 465, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"Cakes and Crunches Alert" <${emailUser}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`[Email Service] Real email sent successfully. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email Service Error] Failed to send email via SMTP:`, error.message);
    // Do not crash the app, return a degraded state
    return { error: true, message: error.message };
  }
};

module.exports = {
  sendEmail
};
