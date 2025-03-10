const express = require("express");
const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("@prisma/client"); // Correcting Prisma Client import

const prisma = new PrismaClient(); // Initializing PrismaClient
const router = express.Router();

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Update User Profile API
router.put("/update-profile", upload.single("profilePhoto"), async (req, res) => {
  const { name, mobile, username } = req.body;
  const profilePhoto = req.file ? `/uploads/${req.file.filename}` : null; // Save the file path if image uploaded

  try {
    const updatedUser = await prisma.user.update({
      where: { mobile }, // Unique field
      data: {
        name,
        mobile,
        username,
        profilePhoto,
      },
    });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Error updating profile" });
  }
});

module.exports = router;
