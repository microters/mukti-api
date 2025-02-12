// /routes/verifyOtp.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

// In-memory OTP storage (for demo purposes). In production, use Redis or a database.
let otpStore = {}; // { email: { otp: '123456', createdAt: <timestamp> } }

const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes expiration time

// Verify OTP route
router.post("/", async (req, res) => {
  const { email, otp } = req.body;

  // Check if OTP exists in the store
  if (!otpStore[email]) {
    return res.status(400).json({ message: "OTP not found. Please request a new one." });
  }

  const storedOtp = otpStore[email];

  // Check if OTP has expired
  const isExpired = Date.now() - storedOtp.createdAt > OTP_EXPIRATION_TIME;
  if (isExpired) {
    // OTP has expired, delete it from the store
    delete otpStore[email];
    return res.status(400).json({ message: "OTP has expired. Please request a new one." });
  }

  // Verify the OTP
  if (otp === storedOtp.otp) {
    // OTP is correct, you can mark the user as verified in your database (optional)
    console.log(`OTP verified for ${email}`);

    // Optionally, you can mark the user as verified in the database
    // await prisma.user.update({
    //   where: { email },
    //   data: { isVerified: true }, // Add a 'isVerified' field in your user model
    // });

    // Remove the OTP from the store after verification
    delete otpStore[email];

    res.status(200).json({ message: "OTP verified successfully!" });
  } else {
    res.status(400).json({ message: "Invalid OTP. Please try again." });
  }
});

module.exports = router;
