const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { sendOTP } = require("../services/otpService");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const prisma = new PrismaClient();
const router = express.Router();

// CORS Middleware to Allow Frontend (3000) & Dashboard (3001)
router.use(
  cors({
    origin: ["http://localhost:3000", "https://dashboard-muktidigital.netlify.app"],
    credentials: true,
  })
);
router.use(cookieParser());

// Check if user exists by mobile number
router.get("/check-user", async (req, res) => {
  const { mobile } = req.query;

  if (!mobile) {
    return res.status(400).json({ error: "Mobile number is required" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { mobile }
    });

    res.json({ exists: !!existingUser });
  } catch (error) {
    console.error("Error checking user existence:", error);
    res.status(500).json({ error: "Failed to check user existence" });
  }
});

// Send OTP for Registration
router.post("/send-otp", async (req, res) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) return res.status(400).json({ error: "Mobile number is required" });

  try {
    const isRegistration = req.query.registration === "true" || req.headers["x-registration"] === "true";
    
    if (isRegistration) {
      const existingUser = await prisma.user.findUnique({
        where: { mobile: mobileNumber }
      });
      
      if (existingUser) {
        return res.status(409).json({ 
          status: "failed", 
          message: "This mobile number is already registered. Please login instead." 
        });
      }
    }

    const result = await sendOTP(mobileNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
});

// Register User After OTP Verification
router.post("/register", async (req, res) => {
  const { name, mobile, otp } = req.body;

  if (!name || !mobile || !otp) {
    return res.status(400).json({ error: "Name, Mobile & OTP required" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { mobile }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: "This mobile number is already registered. Please login instead." 
      });
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: { mobile, otp, isUsed: false, expiresAt: { gte: new Date() } },
    });

    if (!otpRecord) return res.status(400).json({ error: "Invalid or expired OTP" });

    // Register User in DB
    const user = await prisma.user.create({ 
      data: { 
        name, 
        mobile,
        role: "user"  // Default role
      } 
    });

    await prisma.oTP.update({ 
      where: { id: otpRecord.id }, 
      data: { isUsed: true } 
    });

    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id, 
        mobile: user.mobile,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ 
      status: "success", 
      message: "User registered successfully", 
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Login User with OTP
router.post("/login", async (req, res) => {
  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({ error: "Mobile and OTP required" });
  }

  try {
    const otpRecord = await prisma.oTP.findFirst({
      where: { mobile, otp, isUsed: false, expiresAt: { gte: new Date() } },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const user = await prisma.user.findUnique({ where: { mobile } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    const token = jwt.sign(
      { 
        userId: user.id, 
        mobile: user.mobile,
        role: user.role || "user"
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ 
      status: "success", 
      token, 
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role || "user"
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout User
router.post("/logout", (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ status: "success", message: "Logged out successfully" });
});

// Middleware to Verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access Denied. No Token Provided!" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(403).json({ error: "Invalid or Expired Token!" });
  }
};

// Protected Profile Route
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
        profilePhoto: true,
        patients: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        }
      }
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;