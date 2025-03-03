const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");

const prisma = new PrismaClient();
const router = express.Router();

// --------------------------------------------------------
// 1) CREATE (POST) – Create a new Category
// --------------------------------------------------------
router.post("/", authenticateAPIKey, async (req, res) => {
    try {
      let { translations } = req.body;
  
      // Ensure translations is a valid object
      if (!translations || typeof translations !== "object") {
        return res.status(400).json({ error: "Invalid translations format" });
      }
  
      const newCategory = await prisma.category.create({
        data: { translations },
      });
  
      return res
        .status(201)
        .json({ message: "Category created successfully", category: newCategory });
    } catch (error) {
      console.error("❌ Error creating category:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

// --------------------------------------------------------
// 2) GET ALL (GET) – Fetch all categories
// --------------------------------------------------------
router.get("/", authenticateAPIKey, async (req, res) => {
    try {
      const categories = await prisma.category.findMany();
  
      if (!categories || categories.length === 0) {
        return res.json([]); // ✅ Return an empty array if no categories exist
      }
  
      const response = categories.map((cat) => {
        let parsedTranslations = cat.translations;
  
        if (!parsedTranslations) {
          parsedTranslations = {}; // ✅ Prevents errors if translations are missing
        } else if (typeof parsedTranslations === "string") {
          try {
            parsedTranslations = JSON.parse(parsedTranslations);
          } catch (err) {
            console.error("❌ JSON Parsing Error:", err);
            parsedTranslations = {}; // ✅ Ensure it's always an object
          }
        }
  
        return {
          id: cat.id,
          translations: parsedTranslations,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
        };
      });
  
      res.json(response);
    } catch (error) {
      console.error("❌ Error fetching categories:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  

// --------------------------------------------------------
// 3) GET SINGLE (GET) – Fetch a single category by ID
// --------------------------------------------------------
router.get("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = "en" } = req.query;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    let parsed = category.translations;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (err) {
        parsed = {};
      }
    }

    const translatedData = parsed[lang] || parsed["en"] || {};

    res.json({
      id: category.id,
      translations: translatedData,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  } catch (error) {
    console.error("❌ Error fetching category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --------------------------------------------------------
// 4) UPDATE (PUT) – Update a category
router.put("/:id", authenticateAPIKey, async (req, res) => {
    try {
      const { id } = req.params;
  
      // ✅ `req.body` চেক করুন
      console.log("🔹 Full req.body:", req.body);
  
      let { translations } = req.body;
  
      if (typeof translations === "string") {
        translations = JSON.parse(translations);
      }
  
      const existingCategory = await prisma.category.findUnique({ where: { id } });
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
  
      let existingTrans = existingCategory.translations;
      if (typeof existingTrans === "string") {
        existingTrans = JSON.parse(existingTrans || "{}");
      }
  
      // ✅ `translations` ফিল্ড চেক করুন
      console.log("🔹 Received Translations:", translations);
  
      // ✅ বাংলা ভাষার ডাটা মার্জ করুন
      const mergedTranslations = {
        ...existingTrans,
        ...translations,
      };
  
      console.log("🔹 Merged Translations Before Updating:", mergedTranslations);
  
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: { translations: mergedTranslations },
      });
  
      res.json({
        message: "Category updated successfully",
        category: updatedCategory,
      });
    } catch (error) {
      console.error("❌ Error updating category:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  
  
  

// --------------------------------------------------------
// 5) DELETE (DELETE) – Delete a category
// --------------------------------------------------------
router.delete("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;

    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
