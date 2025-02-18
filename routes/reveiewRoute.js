// routes/reviewRoutes.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");
const prisma = new PrismaClient();
const router = express.Router();

// GET all reviews
router.get("/", authenticateAPIKey,async (req, res) => {
  try {
    const reviews = await prisma.review.findMany();
    res.status(200).json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

// POST a new review
router.post("/",authenticateAPIKey, async (req, res) => {
  const { name, role, image, rating, reviewText } = req.body;
  try {
    const review = await prisma.review.create({
      data: {
        name,
        role,
        image,
        rating,
        reviewText,
      },
    });
    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating review" });
  }
});

// PUT to update a review
router.put("/:id",authenticateAPIKey, async (req, res) => {
  const { id } = req.params;
  const { name, role, image, rating, reviewText } = req.body;
  try {
    const updatedReview = await prisma.review.update({
      where: { id: parseInt(id) },
      data: { name, role, image, rating, reviewText },
    });
    res.status(200).json(updatedReview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating review" });
  }
});

// DELETE a review
router.delete("/:id",authenticateAPIKey, async (req, res) => {
  const { id } = req.params;
  try {
    const deletedReview = await prisma.review.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting review" });
  }
});

module.exports = router;
