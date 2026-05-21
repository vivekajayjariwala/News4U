const Mailjet = require('node-mailjet');
const config = require('../config/env');

console.log('Mailjet config loaded:', !!config.mailjet.apiKey, !!config.mailjet.secretKey);

const mailjet = Mailjet.apiConnect(
  config.mailjet.apiKey,
  config.mailjet.secretKey
);

async function sendVerificationEmail(email, verificationToken) {
  console.log('sendVerificationEmail called for:', email);
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=${verificationToken}`;
  console.log('Verification URL:', verificationUrl);

  const request = mailjet
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@yourdomain.com', // Replace with your verified sender email
            Name: 'NewsForU',
          },
          To: [
            {
              Email: email,
              Name: email,
            },
          ],
          Subject: 'Verify Your Email - NEWS 4 U',
          TextPart: `Welcome to NEWS 4 U! Please verify your email by clicking the link: ${verificationUrl}`,
          HTMLPart: `
            <div style="font-family: sans-serif; color: #333;">
                <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; font-size: 30px; font-weight: 900; letter-spacing: -0.05em; color: #000;">Welcome to NEWS 4 U!</span>
                <p>Please verify your email address to complete your registration.</p>
                <a href="${verificationUrl}" style="color: #007bff; text-decoration: none;">Verify Email</a>
                <p>If you didn't create an account, please ignore this email.</p>
            </div>
            `,
        },
      ],
    });

  try {
    const result = await request;
    console.log('Email sent successfully:', result.body);
    return result.body;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

async function sendWeeklyAlertsEmail(email, alertsData) {
  console.log('sendWeeklyAlertsEmail called for:', email);

  let htmlContent = `
    <div style="font-family: sans-serif; color: #333;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; font-size: 30px; font-weight: 900; letter-spacing: -0.05em; color: #000;">NEWS 4 U Weekly Alerts</span>
        <p>Here are the most recent articles for your alert categories:</p>
        <ul>
  `;

  alertsData.forEach(alert => {
    htmlContent += `
      <li>
        <strong>${alert.topic}</strong><br>
        <a href="${alert.article.url}" style="color: #007bff; text-decoration: none;">${alert.article.title}</a><br>
        <small>Published: ${new Date(alert.article.published_at).toLocaleDateString()}</small>
      </li>
    `;
  });

  htmlContent += `
        </ul>
        <p>Stay informed with NEWS 4 U!</p>
    </div>
  `;

  const request = mailjet
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'noreply@yourdomain.com',
            Name: 'NewsForU',
          },
          To: [
            {
              Email: email,
              Name: email,
            },
          ],
          Subject: 'Your Weekly News Alerts - NEWS 4 U',
          TextPart: `Your weekly news alerts from NEWS 4 U. Check your email for the latest articles in your alert categories.`,
          HTMLPart: htmlContent,
        },
      ],
    });

  try {
    const result = await request;
    console.log('Weekly alerts email sent successfully:', result.body);
    return result.body;
  } catch (error) {
    console.error('Error sending weekly alerts email:', error);
    throw error;
  }
}

module.exports = {
  sendVerificationEmail,
  sendWeeklyAlertsEmail,
};