const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const router = express.Router();

// --------------------------------------------------------
// HELPER FUNCTION: Generate SEO-Friendly Slug from English Title
// --------------------------------------------------------
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric characters with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
};

// --------------------------------------------------------
// MULTER CONFIG
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
    // Unique file name
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Serve the /uploads directory as static if you want
router.use("/uploads", express.static("uploads"));

// --------------------------------------------------------
// 1) CREATE (POST) – with icon and slug generation from English title
// --------------------------------------------------------
router.post(
  "/",
  authenticateAPIKey,
  upload.single("icon"), // Field name "icon"
  async (req, res) => {
    try {
      // translations is likely JSON-stringified from the frontend
      let { translations } = req.body;

      if (typeof translations === "string") {
        translations = JSON.parse(translations);
      }

      if (!translations || typeof translations !== "object") {
        return res.status(400).json({ error: "Invalid translations format" });
      }

      // Generate slug from the English title (assuming translations.en.title exists)
      const englishTitle =
        translations.en && translations.en.title ? translations.en.title : "";
      const slug = generateSlug(englishTitle);

      // If a file is uploaded, store its path
      const iconPath = req.file ? `/uploads/${req.file.filename}` : null;

      // Create new department including the slug field
      const newDepartment = await prisma.department.create({
        data: {
          translations,
          icon: iconPath,
          slug, // SEO-friendly slug based on the English title
        },
      });

      return res
        .status(201)
        .json({ message: "Department created successfully", department: newDepartment });
    } catch (error) {
      console.error("❌ Error creating department:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// --------------------------------------------------------
// 2) GET ALL (GET) – no file upload needed
// --------------------------------------------------------
router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    // Optionally, you can parse the desired language from query
    const { lang = "en" } = req.query;

    const departments = await prisma.department.findMany();

    // Return the entire translations object plus the icon path and slug
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
// 3) GET SINGLE (GET) – no file upload needed
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

    // If you want only the specific language's subfields:
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
// 4) UPDATE (PUT) – with optional icon and slug regeneration
// --------------------------------------------------------
router.put(
  "/:id",
  authenticateAPIKey,
  upload.single("icon"), // If you want to update the icon
  async (req, res) => {
    try {
      const { id } = req.params;
      let { translations } = req.body;

      // Parse translations if they are a string
      if (typeof translations === "string") {
        translations = JSON.parse(translations);
      }

      const existingDepartment = await prisma.department.findUnique({ where: { id } });
      if (!existingDepartment) {
        return res.status(404).json({ error: "Department not found" });
      }

      // Parse existing translations if needed
      let existingTrans = existingDepartment.translations;
      if (typeof existingTrans === "string") {
        existingTrans = JSON.parse(existingTrans || "{}");
      }

      // Merge new translations with existing ones
      const mergedTranslations = { ...existingTrans, ...translations };

      // Generate new slug from the updated English title
      const englishTitle =
        mergedTranslations.en && mergedTranslations.en.title
          ? mergedTranslations.en.title
          : "";
      const slug = generateSlug(englishTitle);

      // If a new file is uploaded, store its path; else keep existing icon path
      const iconPath = req.file
        ? `/uploads/${req.file.filename}`
        : existingDepartment.icon;

      const updatedDepartment = await prisma.department.update({
        where: { id },
        data: {
          translations: mergedTranslations,
          icon: iconPath,
          slug, // Update the slug based on the new English title
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
// 5) DELETE (DELETE) – no file upload needed
// --------------------------------------------------------
router.delete("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;

    const existingDepartment = await prisma.department.findUnique({ where: { id } });
    if (!existingDepartment) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Optionally remove the icon file from disk if you want (example commented out):
    // if (existingDepartment.icon) {
    //   fs.unlinkSync(path.join(__dirname, "..", existingDepartment.icon));
    // }

    await prisma.department.delete({ where: { id } });
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting department:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
