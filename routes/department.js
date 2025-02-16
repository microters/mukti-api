// routes/departmentRoutes.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @route POST /api/department
 * @desc  Create a new department with multi-language translations
 */
router.post("/", authenticateAPIKey, async (req, res) => {
  try {
    const { translations } = req.body;
    if (!translations || typeof translations !== "object") {
      return res
        .status(400)
        .json({ error: "translations must be a valid JSON object." });
    }

    const newDepartment = await prisma.department.create({
      data: {
        translations, // e.g. { en: { name: "Cardiology" }, bn: { name: "কার্ডিওলজি" } }
      },
    });

    res.status(201).json({ message: "Department created successfully", newDepartment });
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/department
 * @desc  Get all departments
 */
router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    const { lang = "en" } = req.query;
    const departments = await prisma.department.findMany();

    // Return in chosen language:
    const response = departments.map((dep) => ({
      id: dep.id,
      translations: dep.translations[lang] || dep.translations["en"] || {},
      createdAt: dep.createdAt,
      updatedAt: dep.updatedAt,
    }));
    res.json(response);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/department/:id
 * @desc  Get single department by ID
 */
router.get("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = "en" } = req.query;
    const dep = await prisma.department.findUnique({ where: { id } });
    if (!dep) return res.status(404).json({ error: "Department not found" });

    res.json({
      id: dep.id,
      translations: dep.translations[lang] || dep.translations["en"] || {},
      createdAt: dep.createdAt,
      updatedAt: dep.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching department:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route PUT /api/department/:id
 * @desc  Update department translations
 */
router.put("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { translations } = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Department not found" });

    const updatedTranslations = { ...existing.translations };
    for (const lang in translations) {
      updatedTranslations[lang] = {
        ...(updatedTranslations[lang] || {}),
        ...translations[lang],
      };
    }

    const updatedDep = await prisma.department.update({
      where: { id },
      data: {
        translations: updatedTranslations,
      },
    });

    res.json({ message: "Department updated", department: updatedDep });
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route DELETE /api/department/:id
 * @desc  Delete department
 */
router.delete("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Department not found" });

    await prisma.department.delete({ where: { id } });
    res.json({ message: "Department deleted" });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
