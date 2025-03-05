const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();

const prisma = new PrismaClient();

// -------------------------
// ✅ CREATE PAGE (Optimized)
// -------------------------
router.post("/add", async (req, res) => {
  try {
    const { name, slug, translations } = req.body;

    if (!name || !slug || !translations) {
      return res.status(400).json({ error: "Name, Slug, and Translations are required" });
    }

    // ✅ Create Page in DB
    const newPage = await prisma.page.create({
      data: { name, slug, translations }
    });

    res.status(201).json({ message: "Page created successfully", page: newPage });
  } catch (error) {
    console.error("❌ Error creating page:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------------
// ✅ GET ALL PAGES (Paginated + Optimized)
// -------------------------
router.get("/", async (req, res) => {
    try {
      const { page = 1, limit = 10, search = "" } = req.query;
      const offset = (page - 1) * limit;
  
      // ✅ Ensure `search` is applied only when provided
      const searchCondition =
        search.trim() !== ""
          ? {
              OR: [
                { slug: { contains: search } }, // ✅ MySQL does not support `mode: "insensitive"`
                { name: { contains: search } },
              ],
            }
          : {}; // ✅ If no search, apply empty condition
  
      // ✅ Fetch paginated pages
      const pages = await prisma.page.findMany({
        where: searchCondition,
        orderBy: { createdAt: "desc" },
        skip: Number(offset),
        take: Number(limit),
      });
  
      // ✅ Get total count for pagination
      const totalPages = await prisma.page.count({ where: searchCondition });
  
      res.status(200).json({
        pages,
        currentPage: Number(page),
        totalPages: Math.ceil(totalPages / limit),
      });
    } catch (error) {
      console.error("❌ Error fetching pages:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

// -------------------------
// ✅ GET SINGLE PAGE 
// -------------------------
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Query optimized with Indexed ID Lookup
    const page = await prisma.page.findUnique({ where: { id: Number(id) } });

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    res.status(200).json(page);
  } catch (error) {
    console.error("❌ Error fetching page:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------------
// ✅ UPDATE PAGE (Optimized)
// -------------------------
router.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, translations } = req.body;

    // ✅ Query optimized with Indexed ID Lookup
    const updatedPage = await prisma.page.update({
      where: { id: Number(id) },
      data: { name, slug, translations }
    });

    res.status(200).json({ message: "Page updated successfully", page: updatedPage });
  } catch (error) {
    console.error("❌ Error updating page:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------------
// ✅ DELETE PAGE (Optimized)
// -------------------------
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Query optimized with Indexed ID Lookup
    const deletedPage = await prisma.page.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: "Page deleted successfully", page: deletedPage });
  } catch (error) {
    console.error("❌ Error deleting page:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
