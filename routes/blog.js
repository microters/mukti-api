const express = require("express");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const authenticateAPIKey = require("../middleware/authMiddleware");

const prisma = new PrismaClient();
const router = express.Router();

// -------------------
// Ensure uploads folder exists
// -------------------
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log(`Created uploads folder at ${uploadDir}`);
}

// -------------------
// Multer configuration for image uploads
// -------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Only images (jpeg, jpg, png) are allowed"));
};

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Limit file size to 5MB
  fileFilter,
});

// -------------------
// POST (Create a new category)
// -------------------
router.post("/category", authenticateAPIKey, upload.single("image"), async (req, res) => {
  try {
    const { translations } = req.body;

    // Ensure translations is a valid object
    if (!translations || typeof translations !== "object") {
      return res.status(400).json({ error: "Invalid translations format" });
    }

    const image = req.file ? req.file.filename : null;

    const newCategory = await prisma.category.create({
      data: {
        translations, // Store translations for multiple languages
        image, // Store image file name
      },
    });

    return res.status(201).json({ message: "Category created successfully", category: newCategory });
  } catch (error) {
    console.error("❌ Error creating category:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------
// POST (Create a new blog with multi-language support)
// -------------------
router.post("/add", authenticateAPIKey, upload.single("image"), async (req, res) => {
  try {
    let { translations, categories } = req.body;

    // Parse translations from the incoming request
    translations = JSON.parse(translations);

    // Ensure translations is a valid object
    if (!translations || typeof translations !== "object") {
      return res.status(400).json({ error: "Invalid translations format" });
    }

    // Handle image upload
    const image = req.file ? req.file.filename : null;

    // Ensure categories is an array
    const categoryIds = Array.isArray(categories) ? categories : JSON.parse(categories);

    // Check if categories exist in the database
    const existingCategories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
    });

    if (existingCategories.length !== categoryIds.length) {
      return res.status(400).json({ error: "One or more categories not found" });
    }

    const newBlog = await prisma.blog.create({
      data: {
        translations,
        image,
        categories: {
          connect: existingCategories.map((cat) => ({ id: cat.id })),
        },
      },
    });

    return res.status(201).json({
      message: "Blog created successfully",
      blog: newBlog,
    });
  } catch (error) {
    console.error("❌ Error creating blog:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});



// -------------------
// GET all blogs
// -------------------
router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    const blogs = await prisma.blog.findMany();
    res.status(200).json(blogs);
  } catch (error) {
    console.error("Error in GET /api/blogs:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------
// GET a single blog by ID
// -------------------
router.get("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const blog = await prisma.blog.findUnique({
      where: { id: req.params.id },
    });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.status(200).json(blog);
  } catch (error) {
    console.error("Error in GET /api/blog/:id:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------
// PUT (Update a blog with translations)
// -------------------
router.put("/edit/:id", authenticateAPIKey, upload.single("image"), async (req, res) => {
  try {
    const blogId = req.params.id.trim();
    const { translations, categories } = req.body;

    const existingBlog = await prisma.blog.findUnique({ where: { id: blogId } });
    if (!existingBlog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Use new image if uploaded, otherwise keep the old one
    const image = req.file ? req.file.filename : existingBlog.image;

    // Merge the new translations with the existing translations
    const updatedTranslations = { ...existingBlog.translations, ...translations };

    // Ensure categories is an array
    const categoryIds = Array.isArray(categories) ? categories : JSON.parse(categories);

    // Check if categories exist in the database
    const existingCategories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
    });

    if (existingCategories.length !== categoryIds.length) {
      return res.status(400).json({ error: "One or more categories not found" });
    }

    const updatedBlog = await prisma.blog.update({
      where: { id: blogId },
      data: {
        translations: updatedTranslations,
        image,
        categories: {
          connect: existingCategories.map((cat) => ({ id: cat.id })),
        },
      },
    });

    res.status(200).json({
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    console.error("Error in PUT /api/blog/edit/:id:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------
// DELETE a blog
// -------------------
router.delete("/delete/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBlog = await prisma.blog.delete({ where: { id } });
    res.status(200).json({ message: "Blog deleted successfully", blog: deletedBlog });
  } catch (error) {
    console.error("Error in DELETE /api/blog/delete/:id:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
