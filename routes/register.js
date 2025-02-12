// /routes/register.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const prisma = new PrismaClient();
const router = express.Router();

// Set up Nodemailer transporter for sending OTP emails
const transporter = nodemailer.createTransport({
  service: "gmail", // or use a custom SMTP server
  auth: {
    user: "shoesizeconvert@gmail.com", // Replace with your email
    pass: "wrjq emkl ucon roed",  // Replace with your email password or app password
  },
});

// In-memory OTP storage (for demonstration purposes). In production, use Redis or a database.
let otpStore = {}; // { email: { otp: '123456', createdAt: <timestamp> } }

const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes expiration time

// Generate OTP function
const generateOtp = () => crypto.randomInt(100000, 999999).toString(); // 6-digit OTP

// Register route: Handle user registration and send OTP email
router.post("/", async (req, res) => {
  const { name, email, phoneNumber, password } = req.body;

  try {
    // Check if user already exists with the provided email or phone number
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phoneNumber: phoneNumber }
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User with this email or phone number already exists" });
    }

    // Create a new user in the database
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        password, // In production, hash the password using bcrypt or another hashing library
      },
    });

    // Generate a new OTP
    const otp = generateOtp();

    // Store OTP with the current time
    otpStore[email] = { otp, createdAt: Date.now() };

    // Send OTP email using Nodemailer
    await transporter.sendMail({
      from: '"Your Service" <your-email@gmail.com>',
      to: email,
      subject: "Your OTP Code",
      html: `<p>Your OTP code is: <strong>${otp}</strong></p>`, // HTML content with OTP
    });

    // Send success response with message
    res.status(200).json({
      message: "Registration successful. Please check your email for OTP.",
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "An error occurred while registering the user." });
  }
});

module.exports = router;
