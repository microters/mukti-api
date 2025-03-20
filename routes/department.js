const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const router = express.Router();

// --------------------------------------------------------
// HELPER FUNCTION: Generate SEO-Friendly Slug from a Given Text
// --------------------------------------------------------
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric characters with hyphens
    .replace(/^-+|-+$/g, '');     // Remove leading and trailing hyphens
};

// --------------------------------------------------------
// MULTER CONFIGURATION: For handling file uploads
// --------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });
router.use("/uploads", express.static("uploads"));

// --------------------------------------------------------
// 1) CREATE DEPARTMENT (POST)
// --------------------------------------------------------
router.post(
  "/",
  authenticateAPIKey,
  upload.single("icon"),
  async (req, res) => {
    try {
      let { translations } = req.body;
      if (typeof translations === "string") {
        translations = JSON.parse(translations);
      }
      if (!translations || typeof translations !== "object") {
        return res.status(400).json({ error: "Invalid translations format" });
      }

      // Get the provided slug (if any) and the English title from translations
      const providedSlug = req.body.slug;
      const englishTitle =
        translations.en && translations.en.title ? translations.en.title : "";

      // Use the provided slug (after formatting) if available; otherwise, generate from the English title
      const slug =
        providedSlug && providedSlug.trim() !== ""
          ? generateSlug(providedSlug)
          : generateSlug(englishTitle);

      // Determine the icon path if a file is uploaded
      const iconPath = req.file ? `/uploads/${req.file.filename}` : null;

      const newDepartment = await prisma.department.create({
        data: {
          translations,
          icon: iconPath,
          slug,
        },
      });

      return res.status(201).json({
        message: "Department created successfully",
        department: newDepartment,
      });
    } catch (error) {
      console.error("❌ Error creating department:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// --------------------------------------------------------
// 2) GET ALL DEPARTMENTS (GET)
// --------------------------------------------------------
router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    const { lang = "en" } = req.query;
    const departments = await prisma.department.findMany();

    const response = departments.map((dep) => {
      let parsed = dep.translations;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (err) {
          parsed = {};
        }
      }
      return {
        id: dep.id,
        translations: parsed,
        slug: dep.slug,
        icon: dep.icon || null,
        createdAt: dep.createdAt,
        updatedAt: dep.updatedAt,
      };
    });
    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching departments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --------------------------------------------------------
// 3) GET SINGLE DEPARTMENT (GET) by ID
// --------------------------------------------------------
router.get("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = "en" } = req.query;
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    let parsed = department.translations;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (err) {
        parsed = {};
      }
    }
    const translatedData = parsed[lang] || parsed["en"] || {};
    res.json({
      id: department.id,
      translations: translatedData,
      slug: department.slug,
      icon: department.icon,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    });
  } catch (error) {
    console.error("❌ Error fetching department:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --------------------------------------------------------
// 4) GET SINGLE DEPARTMENT BY SLUG
// --------------------------------------------------------
router.get("/slug/:slug", authenticateAPIKey, async (req, res) => {
  try {
    const { slug } = req.params;
    // Use findFirst to query by slug since the slug field may not be unique in your schema
    const department = await prisma.department.findFirst({
      where: { slug },
    });
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    let parsed = department.translations;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (err) {
        parsed = {};
      }
    }

    res.status(200).json({
      id: department.id,
      translations: parsed,
      slug: department.slug,
      icon: department.icon,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching department by slug:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --------------------------------------------------------
// 5) UPDATE DEPARTMENT (PUT)
// --------------------------------------------------------
router.put(
  "/:id",
  authenticateAPIKey,
  upload.single("icon"),
  async (req, res) => {
    try {
      const { id } = req.params;
      let { translations } = req.body;
      if (typeof translations === "string") {
        translations = JSON.parse(translations);
      }

      const existingDepartment = await prisma.department.findUnique({ where: { id } });
      if (!existingDepartment) {
        return res.status(404).json({ error: "Department not found" });
      }

      let existingTrans = existingDepartment.translations;
      if (typeof existingTrans === "string") {
        existingTrans = JSON.parse(existingTrans || "{}");
      }
      const mergedTranslations = { ...existingTrans, ...translations };

      // Get provided slug and generate it accordingly
      const providedSlug = req.body.slug;
      const englishTitle =
        mergedTranslations.en && mergedTranslations.en.title
          ? mergedTranslations.en.title
          : "";
      const slug =
        providedSlug && providedSlug.trim() !== ""
          ? generateSlug(providedSlug)
          : generateSlug(englishTitle);

      const iconPath = req.file
        ? `/uploads/${req.file.filename}`
        : existingDepartment.icon;

      const updatedDepartment = await prisma.department.update({
        where: { id },
        data: {
          translations: mergedTranslations,
          icon: iconPath,
          slug,
        },
      });

      res.json({
        message: "Department updated successfully",
        department: updatedDepartment,
      });
    } catch (error) {
      console.error("❌ Error updating department:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// --------------------------------------------------------
// 6) DELETE DEPARTMENT (DELETE)
// --------------------------------------------------------
router.delete("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const existingDepartment = await prisma.department.findUnique({ where: { id } });
    if (!existingDepartment) {
      return res.status(404).json({ error: "Department not found" });
    }
    await prisma.department.delete({ where: { id } });
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting department:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
