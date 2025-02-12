const express = require("express");
const router = express.Router();
const admin = require("../firebaseAdmin");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * ✅ Verify OTP and Store User in MySQL
 */
router.post("/verify-otp", async (req, res) => {
  const { phoneNumber, otpToken, name, email } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(otpToken);
    if (decodedToken.phone_number !== phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number mismatch!" });
    }

    let user = await prisma.user.findUnique({ where: { phoneNumber } });

    if (!user) {
      user = await prisma.user.create({
        data: { phoneNumber, name, email },
      });
    }

    return res.status(200).json({
      success: true,
      message: "User authenticated and stored in database!",
      user,
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Invalid OTP", error: error.message });
  }
});

/**
 * ✅ Get All Users
 */
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
});

/**
 * ✅ Get Single User by Phone Number
 */
router.get("/user/:phoneNumber", async (req, res) => {
  const { phoneNumber } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
});

module.exports = router;
