const express = require("express");
const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const router = express.Router();

const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "shoesizeconvert@gmail.com",
    pass: "wrjq emkl ucon roed",
  },
});

// ✅ REGISTER USER: Store OTP & Send Email (POST)
router.post("/", async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
  
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
  
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
  
      // Hash the password before storing it
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Generate OTP
      const otp = generateOtp();
  
      // Save OTP and user data in the database
      await prisma.oTP.upsert({
        where: { email },
        update: {
          otp,
          createdAt: new Date(),
          name,
          phoneNumber,
          password: hashedPassword, // Store the hashed password
        },
        create: {
          email,
          otp,
          createdAt: new Date(),
          name,
          phoneNumber,
          password: hashedPassword, // Store the hashed password
        },
      });
  

    // ✅ Send OTP via Email
    await transporter.sendMail({
      from: '"Your Service" <shoesizeconvert@gmail.com>',
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
    });

    res.status(200).json({ message: "OTP sent successfully!" });
  } catch (error) {
    console.error("❌ Error during registration:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ✅ VERIFY OTP (POST)
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

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

  const { otp: storedOtp, createdAt } = storedOtpData;

  // ✅ Check if OTP has expired
  const isExpired = new Date() - new Date(createdAt) > OTP_EXPIRATION_TIME;
  if (isExpired) {
    await prisma.oTP.delete({ where: { email } }); // Remove expired OTP
    return res.status(400).json({ message: "OTP expired. Please request a new one." });
  }

  // ✅ Verify OTP
  if (otp === storedOtp) {
    // ✅ Save the user in the database
    const newUser = await prisma.user.create({
      data: { email, isVerified: true },
    });

    await prisma.oTP.delete({ where: { email } }); // ✅ Remove OTP after verification

    return res.status(200).json({ message: "User verified successfully!", user: newUser });
  } else {
    return res.status(400).json({ message: "Invalid OTP. Please try again." });
  }
});

// ✅ GET ALL USERS (GET)
router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// ✅ GET SINGLE USER BY ID (GET/:id)
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
});

// ✅ UPDATE USER DETAILS (PUT/:id)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phoneNumber, password } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email, phoneNumber, password },
    });

    res.status(200).json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
});

// ✅ DELETE USER (DELETE/:id)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id },
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user" });
  }
});

module.exports = router;
