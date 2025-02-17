const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");

// Multer for file uploads
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const router = express.Router();

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
// 1) CREATE (POST) – with icon
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
        // parse string if necessary
        translations = JSON.parse(translations);
      }

      if (!translations || typeof translations !== "object") {
        return res.status(400).json({ error: "Invalid translations format" });
      }

      // If a file is uploaded, store path
      const iconPath = req.file ? `/uploads/${req.file.filename}` : null;

      // Create new department
      const newDepartment = await prisma.department.create({
        data: {
          translations,
          icon: iconPath,
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
    // If you want default language, you can parse it from query
    const { lang = "en" } = req.query;

    const departments = await prisma.department.findMany();

    // Return the entire translations object plus the icon path
    const response = departments.map((dep) => {
      // parse JSON if stored as string
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
// 4) UPDATE (PUT) – with optional icon
// --------------------------------------------------------
router.put(
  "/:id",
  authenticateAPIKey,
  upload.single("icon"), // If you want to update icon
  async (req, res) => {
    try {
      const { id } = req.params;
      let { translations } = req.body;

      // parse translations if string
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

      // Merge new translations with existing
      const mergedTranslations = { ...existingTrans, ...translations };

      // If a new file is uploaded, store path, else keep existing
      const iconPath = req.file
        ? `/uploads/${req.file.filename}`
        : existingDepartment.icon;

      const updatedDepartment = await prisma.department.update({
        where: { id },
        data: {
          translations: mergedTranslations,
          icon: iconPath,
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

    // Optionally remove the icon file from disk if you want
    // fs.unlinkSync(`.${existingDepartment.icon}`)...

    await prisma.department.delete({ where: { id } });
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting department:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
