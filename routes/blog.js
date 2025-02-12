const express = require("express");
const { PrismaClient } = require("@prisma/client");
const upload = require("../middleware/uploadMiddleware");
const authenticateAPIKey = require("../middleware/authMiddleware");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @route   POST /api/blogs/add
 * @desc    Create a new blog (Protected by API Key)
 */
router.post("/add", authenticateAPIKey, upload.single("image"), async (req, res) => {
    try {
        const { metaTitle, metaDescription, title, slug, description, content, categories } = req.body;

        // Check if slug already exists
        const existingSlug = await prisma.blog.findUnique({ where: { slug } });
        if (existingSlug) return res.status(400).json({ error: "Slug already exists" });

        // Handle image upload
        const image = req.file ? req.file.filename : null;

        // Create blog entry
        const newBlog = await prisma.blog.create({
            data: {
                metaTitle,
                metaDescription,
                title,
                slug,
                description,
                content,
                image,
                categories: {
                    connect: categories.map(catId => ({ id: catId }))
                }
            }
        });

        res.status(201).json({ message: "Blog created successfully", blog: newBlog });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * @route   GET /api/blogs
 * @desc    Get all blogs (Protected by API Key)
 */
router.get("/", authenticateAPIKey, async (req, res) => {
    try {
        const blogs = await prisma.blog.findMany({
            include: { categories: true }
        });
        res.status(200).json(blogs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * @route   GET /api/blogs/:id
 * @desc    Get a single blog by ID (Protected by API Key)
 */
router.get("/:id", authenticateAPIKey, async (req, res) => {
    try {
        const blog = await prisma.blog.findUnique({
            where: { id: req.params.id },
            include: { categories: true }
        });

        if (!blog) return res.status(404).json({ error: "Blog not found" });

        res.status(200).json(blog);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * @route   PUT /api/blogs/edit/:id
 * @desc    Update a blog (Protected by API Key)
 */
router.put("/edit/:id", authenticateAPIKey, upload.single("image"), async (req, res) => {
    try {
        const { metaTitle, metaDescription, title, slug, description, content, categories } = req.body;

        const blogId = req.params.id.trim();

        // Check if the blog exists
        const existingBlog = await prisma.blog.findUnique({ where: { id: blogId } });
        if (!existingBlog) return res.status(404).json({ error: "Blog not found" });

        const image = req.file ? req.file.filename : existingBlog.image;

        const updateData = {
            metaTitle: metaTitle || existingBlog.metaTitle,
            metaDescription: metaDescription || existingBlog.metaDescription,
            title: title || existingBlog.title,
            slug: slug || existingBlog.slug,
            description: description || existingBlog.description,
            content: content || existingBlog.content,
            image,
            categories: categories ? { set: categories.map(catId => ({ id: catId })) } : undefined,
        };

        const updatedBlog = await prisma.blog.update({
            where: { id: blogId },
            data: updateData,
        });

        res.status(200).json({ message: "Blog updated successfully", blog: updatedBlog });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


/**
 * @route   DELETE /api/blogs/delete/:id
 * @desc    Delete a blog (Protected by API Key)
 */
router.delete("/delete/:id", authenticateAPIKey, async (req, res) => {
    try {
        await prisma.blog.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: "Blog deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
