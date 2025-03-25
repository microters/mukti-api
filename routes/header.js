const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const prisma = new PrismaClient();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Unique file name using current timestamp
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Serve static files from the uploads folder
router.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * @route   GET /api/header
 * @desc    Get the header content
 */
router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    const header = await prisma.header.findUnique({
      where: { id: 1 },
    });
    if (!header) return res.status(404).json({ error: "Header not found" });
    res.status(200).json(header);
  } catch (error) {
    console.error("❌ Error fetching header:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   POST /api/header/add
 * @desc    Create a new header (only if not exists)
 *         Accepts JSON body for translations with menus included. Image upload is optional.
 */
router.post(
  "/add",
  authenticateAPIKey,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "contactIcon", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Parse JSON data from a field named 'data'
      if (!req.body.data) {
        return res.status(400).json({ error: "No data provided" });
      }
      
      const { translations } = JSON.parse(req.body.data);
      
      if (!translations || typeof translations !== "object") {
        return res.status(400).json({ error: "Invalid translations data" });
      }
      
      // Validate that translations contains menus for each language
      for (const lang in translations) {
        if (!translations[lang].menus || !Array.isArray(translations[lang].menus)) {
          return res.status(400).json({ error: `Invalid or missing menus for language: ${lang}` });
        }
      }

      // Check if header already exists
      const existingHeader = await prisma.header.findUnique({ where: { id: 1 } });
      if (existingHeader) {
        return res
          .status(400)
          .json({ error: "Header already exists. Use PUT to update." });
      }

      // If logo or contactIcon files are uploaded, get their paths
      const logoFile = req.files?.logo ? `/uploads/${req.files.logo[0].filename}` : null;
      const contactIconFile = req.files?.contactIcon ? `/uploads/${req.files.contactIcon[0].filename}` : null;

      const newHeader = await prisma.header.create({
        data: {
          translations, // translations now include menus for each language
          logo: logoFile,
          contactIcon: contactIconFile,
        },
      });
      res.status(201).json(newHeader);
    } catch (error) {
      console.error("❌ Error creating header:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * @route   PUT /api/header
 * @desc    Update the header content including translations with embedded menus, and images.
 *         For images, if new files are uploaded, update their paths.
 */
router.put(
  "/",
  authenticateAPIKey,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "contactIcon", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.body.data) {
        return res.status(400).json({ error: "No data provided" });
      }
      
      // Parse JSON data from a field named 'data'
      const { translations } = JSON.parse(req.body.data);
      
      if (!translations || typeof translations !== "object") {
        return res.status(400).json({ error: "Invalid translations data" });
      }
      
      // Validate that translations contains menus for each language
      for (const lang in translations) {
        if (!translations[lang].menus || !Array.isArray(translations[lang].menus)) {
          return res.status(400).json({ error: `Invalid or missing menus for language: ${lang}` });
        }
      }

      // Prepare update data
      let updateData = { translations };

      // Check if new logo is uploaded, update the logo path
      if (req.files?.logo) {
        const logoFile = `/uploads/${req.files.logo[0].filename}`;
        updateData.logo = logoFile;
      }

      // Check if new contactIcon is uploaded, update the contactIcon path
      if (req.files?.contactIcon) {
        const contactIconFile = `/uploads/${req.files.contactIcon[0].filename}`;
        updateData.contactIcon = contactIconFile;
      }

      const updatedHeader = await prisma.header.update({
        where: { id: 1 },
        data: updateData,
      });
      res.status(200).json(updatedHeader);
    } catch (error) {
      console.error("❌ Error updating header:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = router;