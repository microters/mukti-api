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
// POST (Create a new blog) -> NO CATEGORY
// -------------------
router.post("/add", authenticateAPIKey, upload.single("image"), async (req, res) => {
  try {
    let { translations } = req.body;
    translations = JSON.parse(translations);

    if (!translations || typeof translations !== "object") {
      return res.status(400).json({ error: "Invalid translations format" });
    }

    // Create a new blog WITHOUT category
    const newBlog = await prisma.blog.create({
      data: {
        translations,
        image: req.file ? req.file.filename : null,
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
// GET a single blog by SLUG
// Example: /api/blogs/slug/my-awesome-post
// -------------------
router.get("/slug/:slug", authenticateAPIKey, async (req, res) => {
  try {
    const { slug } = req.params;
    
    // 1) Get all blogs
    const allBlogs = await prisma.blog.findMany();

    // 2) Try to find a blog whose translations.en.slug or translations.bn.slug matches
    const matchingBlog = allBlogs.find((blog) => {
      try {
        const parsed = typeof blog.translations === "string"
          ? JSON.parse(blog.translations)
          : blog.translations;
        
        // Check both English and Bangla slugs if you want
        const enSlug = parsed?.en?.slug;
        const bnSlug = parsed?.bn?.slug;

        return enSlug === slug || bnSlug === slug;
      } catch (err) {
        // If JSON parse fails or no slug found, skip
        return false;
      }
    });

    if (!matchingBlog) {
      return res.status(404).json({ error: "Blog not found by slug" });
    }

    res.status(200).json(matchingBlog);
  } catch (error) {
    console.error("Error in GET /api/blogs/slug/:slug:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------
// PUT (Update a blog) -> NO CATEGORY
// -------------------
router.put("/edit/:id", authenticateAPIKey, upload.single("image"), async (req, res) => {
  try {
    const blogId = req.params.id.trim();
    let { translations } = req.body;

    console.log("Received Translations Data:", translations); // Debugging

    if (typeof translations === "string") {
      translations = JSON.parse(translations);
    }

    // Update the blog with new translations
    const updatedBlog = await prisma.blog.update({
      where: { id: blogId },
      data: {
        translations,
        image: req.file ? req.file.filename : undefined,
      },
    });

    console.log("Updated Blog Data:", updatedBlog); // Debugging
    res.status(200).json({ message: "Blog updated successfully", blog: updatedBlog });
  } catch (error) {
    console.error("❌ Error updating blog:", error.message);
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
