// routes/schedule.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/schedule/:scheduleId/timeslots
// This endpoint returns all time slots for the given schedule
router.get("/:scheduleId/timeslots", authenticateAPIKey, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    // Ensure that you have defined a model "TimeSlot" in your Prisma schema.
    const timeSlots = await prisma.timeSlot.findMany({
      where: { scheduleId: scheduleId },
      select: { id: true, start: true, end: true, isBooked: true },
    });
    res.status(200).json(timeSlots);
  } catch (error) {
    console.error("Error fetching time slots:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
