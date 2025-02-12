// /config/nodemailerConfig.js
const nodemailer = require('nodemailer');

// Set up your transporter (e.g., using Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use a custom SMTP server
  auth: {
    user: 'shoesizeconvert@gmail.com', // Replace with your email
    pass: 'wrjq emkl ucon roed',  // Replace with your email password or app password
  },
});

module.exports = transporter;
