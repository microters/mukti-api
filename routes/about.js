const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 📁 Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const uploadAboutImages = upload.fields([
  { name: "heroImage", maxCount: 1 },
  { name: "callbackImage", maxCount: 1 },
  { name: "tabs", maxCount: 10 },
]);

// ✅ POST About API
router.post("/", uploadAboutImages, async (req, res) => {
  try {
    const {
      language = "en",
      title,
      subtitle,
      tabs,
    } = req.body;

    const heroImage = req.files["heroImage"]?.[0]?.filename;
    const callbackImage = req.files["callbackImage"]?.[0]?.filename;
    const tabImages = req.files["tabs"] || [];

    let parsedTabs = [];
    if (tabs) {
      parsedTabs = JSON.parse(tabs);
    }

    parsedTabs = parsedTabs.map((tab, idx) => ({
      ...tab,
      image: tabImages[idx] ? `/uploads/${tabImages[idx].filename}` : null,
    }));

    const newData = {
      [language]: {
        heroImage: heroImage ? `/uploads/${heroImage}` : null,
        callbackImage: callbackImage ? `/uploads/${callbackImage}` : null,
        whoWeAre: {
          title,
          subtitle,
          tabs: parsedTabs,
        },
      },
    };

    const existing = await prisma.aboutPage.findUnique({ where: { id: 1 } });

    if (existing) {
      const updated = await prisma.aboutPage.update({
        where: { id: 1 },
        data: {
          translations: {
            ...existing.translations,
            ...newData,
          },
        },
      });
      return res.json({ success: true, message: "About page updated", data: updated });
    } else {
      const created = await prisma.aboutPage.create({
        data: {
          id: 1,
          translations: newData,
        },
      });
      return res.json({ success: true, message: "About page created", data: created });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});
router.get("/", async (req, res) => {
    try {
      const data = await prisma.aboutPage.findUnique({ where: { id: 1 } });
      res.json({ success: true, data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to load" });
    }
  });
  
module.exports = router;
