// src/backend/budgeting/alerts.js

const nodemailer = require('nodemailer'); // For sending email notifications
const twilio = require('twilio'); // For sending SMS notifications (optional)

// Configure email transport using Nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail', // Use your email service provider
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app password
  },
});

// Configure Twilio for SMS notifications (optional)
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send an email alert to the user.
 * @param {string} userEmail - The email address of the user.
 * @param {string} category - The budget category.
 * @param {number} spent - The amount spent.
 * @param {number} limit - The budget limit.
 */
const sendEmailAlert = (userEmail, category, spent, limit) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Budget Alert',
    text: `You have spent ${spent} in the ${category} category, which is approaching your limit of ${limit}.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.error('Error sending email:', error);
    }
    console.log('Email sent:', info.response);
  });
};

/**
 * Send an SMS alert to the user (optional).
 * @param {string} userPhone - The phone number of the user.
 * @param {string} category - The budget category.
 * @param {number} spent - The amount spent.
 * @param {number} limit - The budget limit.
 */
const sendSmsAlert = (userPhone, category, spent, limit) => {
  const message = `Alert: You have spent ${spent} in ${category}, approaching your limit of ${limit}.`;

  twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
    to: userPhone,
  })
  .then(message => console.log('SMS sent:', message.sid))
  .catch(error => console.error('Error sending SMS:', error));
};

/**
 * Send an alert when the user approaches or exceeds their budget limit.
 * @param {string} userId - The ID of the user.
 * @param {string} category - The budget category.
 * @param {number} spent - The amount spent.
 * @param {number} limit - The budget limit.
 */
const sendAlert = (userId, category, spent, limit) => {
  // Fetch user contact information from the database (mocked here)
  const user = {
    email: 'user@example.com', // Replace with actual user email from the database
    phone: '+1234567890', // Replace with actual user phone number from the database
  };

  // Send alerts
  sendEmailAlert(user.email, category, spent, limit);
  sendSmsAlert(user.phone, category, spent, limit);
};

module.exports = {
  sendAlert,
};
