const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes

// ✅ Verify OTP Route
router.post("/", async (req, res) => {
  const { email, otp } = req.body;

  console.log(`🟢 Received Email: ${email}`);
  console.log(`🟢 Received OTP: ${otp}`);

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  // ✅ Fetch OTP from Database
  const storedOtpData = await prisma.oTP.findUnique({
    where: { email },
  });

  if (!storedOtpData) {
    return res.status(400).json({ message: "OTP not found. Please request a new one." });
  }

  const { otp: storedOtp, createdAt, name, phoneNumber, password } = storedOtpData;

  // ✅ Check if OTP has expired
  const isExpired = new Date() - new Date(createdAt) > OTP_EXPIRATION_TIME;
  if (isExpired) {
    await prisma.oTP.delete({ where: { email } }); // Remove expired OTP
    return res.status(400).json({ message: "OTP expired. Please request a new one." });
  }

  // ✅ Verify OTP
  if (otp === storedOtp) {
    // ✅ Check if user exists before updating
    let existingUser = await prisma.user.findUnique({ where: { email } });

    if (!existingUser) {
      // ✅ If user does NOT exist, create it with all required fields
      existingUser = await prisma.user.create({
        data: { name, email, phoneNumber, password, isVerified: true },
      });
    } else {
      // ✅ If user EXISTS, update verification status
      await prisma.user.update({
        where: { email },
        data: { isVerified: true },
      });
    }

    await prisma.oTP.delete({ where: { email } }); // ✅ Remove OTP after verification

    return res.status(200).json({ message: "User verified successfully!", user: existingUser });
  } else {
    return res.status(400).json({ message: "Invalid OTP. Please try again." });
  }
});

module.exports = router;
