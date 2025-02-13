const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'shoesizeconvert@gmail.com',  // Replace with your email
    pass: 'wrjq emkl ucon roed',  // Replace with your email password
  },
});

// Password Reset Request (For sending reset link)
router.post('/', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save the token to the passwordReset table
    await prisma.passwordReset.create({
      data: {
        email,
        token: resetToken,
        createdAt: new Date(),
        expiresAt: expiresAt,
      },
    });

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Error in forgot-password route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Password Reset (For updating password after token validation)
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const passwordResetRecord = await prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!passwordResetRecord) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email: passwordResetRecord.email },
      data: { password: hashedPassword },
    });

    await prisma.passwordReset.delete({
      where: { token },
    });

    res.status(200).json({ message: 'Password reset successfully!' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password.' });
  }
});

module.exports = router;
