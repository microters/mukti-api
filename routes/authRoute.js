

// const express = require("express");
// const { PrismaClient } = require("@prisma/client");
// const { sendOTP } = require("../services/otpService");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");
// // authRoute.js
// const jwt = require("jsonwebtoken");
// require("dotenv").config();



// const prisma = new PrismaClient();
// const router = express.Router();

// // ✅ CORS Middleware to Allow Frontend (3000) & Dashboard (3001)
// router.use(
//   cors({
//     origin: ["http://localhost:3000", "http://localhost:3001"], // Allow frontend & dashboard
//     credentials: true, // Allow sending cookies
//   })
// );
// router.use(cookieParser());

// /* ──────────────────────────────────────────────
//  ✅ Send OTP for Registration
// ────────────────────────────────────────────── */
// router.post("/send-otp", async (req, res) => {
//   const { mobileNumber } = req.body;

//   if (!mobileNumber) return res.status(400).json({ error: "Mobile number is required" });

//   try {
//     const result = await sendOTP(mobileNumber);
//     res.json(result);
//   } catch (error) {
//     res.status(500).json({ status: "failed", message: error.message });
//   }
// });

// /* ──────────────────────────────────────────────
//  ✅ Register User After OTP Verification
// ────────────────────────────────────────────── */
// router.post("/register", async (req, res) => {
//   const { name, mobile, otp } = req.body;

//   if (!name || !mobile || !otp) {
//     return res.status(400).json({ error: "Name, Mobile & OTP required" });
//   }

//   try {
//     const otpRecord = await prisma.oTP.findFirst({
//       where: { mobile, otp, isUsed: false, expiresAt: { gte: new Date() } },
//     });

//     if (!otpRecord) return res.status(400).json({ error: "Invalid or expired OTP" });

//     // ✅ Register User in DB
//     const user = await prisma.user.create({ data: { name, mobile } });

//     await prisma.oTP.update({ where: { id: otpRecord.id }, data: { isUsed: true } });

//     res.json({ status: "success", message: "User registered successfully", user });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to register user" });
//   }
// });

// /* ──────────────────────────────────────────────
//  ✅ Login User with OTP & Set HTTP-Only Cookie
// ────────────────────────────────────────────── */


// /* ──────────────────────────────────────────────
//  ✅ Logout User & Clear Cookie
// ────────────────────────────────────────────── */
// router.post("/logout", (req, res) => {
//   res.clearCookie("authToken", {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
//   });
//   res.json({ status: "success", message: "Logged out successfully" });
// });



// // Middleware
// router.use(cors({ origin: "http://localhost:3000", credentials: true }));
// router.use(cookieParser());

// // 📌 Generate JWT Token Function
// const generateToken = (user) => {
//   return jwt.sign({ userId: user.id, mobile: user.mobile }, process.env.JWT_SECRET, { expiresIn: "7d" });
// };



// router.post("/login", async (req, res) => {
//   const { mobile, otp } = req.body;

//   if (!mobile || !otp) {
//     return res.status(400).json({ error: "Mobile and OTP required" });
//   }

//   try {
//     const otpRecord = await prisma.oTP.findFirst({
//       where: { mobile, otp, isUsed: false, expiresAt: { gte: new Date() } },
//     });

//     if (!otpRecord) {
//       return res.status(400).json({ error: "Invalid or expired OTP" });
//     }

//     const user = await prisma.user.findUnique({ where: { mobile } });

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     await prisma.oTP.update({
//       where: { id: otpRecord.id },
//       data: { isUsed: true },
//     });

//     const token = jwt.sign(
//       { userId: user.id, mobile: user.mobile },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     res.json({ status: "success", token, user });
//   } catch (error) {
//     res.status(500).json({ error: "Login failed" });
//   }
// });

// // 📌 Middleware to Verify JWT
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];
//   console.log(token);
  

//   if (!token) {
//     return res.status(401).json({ error: "Access Denied. No Token Provided!" });
//   }

//   try {
//     const verified = jwt.verify(token, process.env.JWT_SECRET);
//     console.log(verified);
    
//     req.user = verified;
//     next();
//   } catch (error) {
//     console.error("JWT Verification Error:", error);
//     return res.status(403).json({ error: "Invalid or Expired Token!" });
//   }
// };


// // 📌 Protected Profile Route
// router.get("/profile",authenticateToken, async (req, res) => {
//   try {
//     const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
//     console.log(user);
    
//     if (!user) return res.status(404).json({ error: "User not found" });

//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ error: "Server error" });
//   }
// });






// module.exports = router;
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { sendOTP } = require("../services/otpService");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const prisma = new PrismaClient();
const router = express.Router();

// ✅ CORS Middleware to Allow Frontend (3000) & Dashboard (3001)
router.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"], // Allow frontend & dashboard
    credentials: true, // Allow sending cookies
  })
);
router.use(cookieParser());

/* ──────────────────────────────────────────────
 ✅ Send OTP for Registration
────────────────────────────────────────────── */
router.post("/send-otp", async (req, res) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) return res.status(400).json({ error: "Mobile number is required" });

  try {
    const result = await sendOTP(mobileNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
});

/* ──────────────────────────────────────────────
 ✅ Register User After OTP Verification
────────────────────────────────────────────── */
router.post("/register", async (req, res) => {
  const { name, mobile, otp } = req.body;

  if (!name || !mobile || !otp) {
    return res.status(400).json({ error: "Name, Mobile & OTP required" });
  }

  try {
    const otpRecord = await prisma.oTP.findFirst({
      where: { mobile, otp, isUsed: false, expiresAt: { gte: new Date() } },
    });

    if (!otpRecord) return res.status(400).json({ error: "Invalid or expired OTP" });

    // ✅ Register User in DB
    const user = await prisma.user.create({ data: { name, mobile } });

    await prisma.oTP.update({ where: { id: otpRecord.id }, data: { isUsed: true } });

    res.json({ status: "success", message: "User registered successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Failed to register user" });
  }
});

/* ──────────────────────────────────────────────
 ✅ Login User with OTP & Set HTTP-Only Cookie
────────────────────────────────────────────── */
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
      { userId: user.id, mobile: user.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ status: "success", token, user });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

/* ──────────────────────────────────────────────
 ✅ Logout User & Clear Cookie
────────────────────────────────────────────── */
router.post("/logout", (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ status: "success", message: "Logged out successfully" });
});

// 📌 Middleware to Verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log(token);

  if (!token) {
    return res.status(401).json({ error: "Access Denied. No Token Provided!" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log(verified);
    req.user = verified;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(403).json({ error: "Invalid or Expired Token!" });
  }
};

// 📌 Protected Profile Route
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    console.log(user);
    
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
