const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const uploadFooterFields = upload.fields([
  { name: "footerLogo", maxCount: 1 },
  { name: "contactLogo", maxCount: 1 },
]);

// POST or Update Footer (ID always = 1)
router.post("/", uploadFooterFields, async (req, res) => {
  try {
    const {
      language = "en",
      description,
      contact,
      sections,
      copyright,
      socialLinks,
      listItems,
    } = req.body;

    const footerLogo = req.files["footerLogo"]?.[0]?.filename;
    const contactLogo = req.files["contactLogo"]?.[0]?.filename;

    const parsedContact = JSON.parse(contact || '{}');
    const parsedSections = JSON.parse(sections || '{}');
    const parsedSocialLinks = JSON.parse(socialLinks || '{}');
    const parsedListItems = JSON.parse(listItems || '[]');

    const newFooterData = {
      [language]: {
        footerLogo: footerLogo ? `/uploads/${footerLogo}` : null,
        description,
        contact: {
          ...parsedContact,
          logo: contactLogo ? `/uploads/${contactLogo}` : parsedContact.logo || null,
        },
        sections: parsedSections,
        copyright,
        socialLinks: parsedSocialLinks,
        listItems: parsedListItems,
      },
    };

    const existing = await prisma.footer.findUnique({ where: { id: 1 } });

    if (existing) {
      const updated = await prisma.footer.update({
        where: { id: 1 },
        data: {
          translations: {
            ...existing.translations,
            ...newFooterData,
          },
        },
      });
      return res.json({ success: true, message: "Footer updated", data: updated });
    } else {
      const created = await prisma.footer.create({
        data: {
          id: 1,
          translations: newFooterData,
        },
      });
      return res.json({ success: true, message: "Footer created", data: created });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// GET Footer Data
router.get("/", async (req, res) => {
  try {
    const footer = await prisma.footer.findUnique({ where: { id: 1 } });
    if (!footer) {
      return res.status(404).json({ success: false, message: "Footer not found" });
    }
    res.json(footer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
