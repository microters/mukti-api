const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const prisma = new PrismaClient();
const router = express.Router();
const fs = require("fs");
// 📌 Multer Configuration (File Upload)
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


// Ensure static files are served from the 'public/uploads' directory
router.use("/uploads", express.static(path.join(__dirname, "uploads")));





// 🟢 Add a New Doctor with Image Upload
router.post("/add", authenticateAPIKey, upload.single("profilePhoto"), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data); // Parse JSON data
    const { email, translations, memberships = [], awards = [], treatments = [], conditions = [], schedule = [], faqs = [] } = data;

    // Check if profile photo exists, otherwise set default
    const icon = req.file ? `/uploads/${req.file.filename}` : "https://placehold.co/100"; // Use `icon` instead of `profilePhoto`
console.log(icon);

    // Create new doctor in the database
    const newDoctor = await prisma.doctor.create({
      data: {
        email,
        icon,  // Use icon to store the profile photo path
        translations,
        memberships: { create: memberships.map(m => ({ name: m.name })) },
        awards: { create: awards.map(a => ({ title: a.title })) },
        treatments: { create: treatments.map(t => ({ name: t.name })) },
        conditions: { create: conditions.map(c => ({ name: c.name })) },
        schedule: { create: schedule.map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })) },
        faqs: { create: faqs.map(f => ({ question: f.question, answer: f.answer })) },
      },
      include: {
        memberships: true,
        awards: true,
        treatments: true,
        conditions: true,
        schedule: true,
        faqs: true
       
      },
    });

    res.status(201).json({ message: "Doctor added successfully", doctor: newDoctor });
  } catch (error) {
    console.error("❌ Error adding doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




/**
 * @route   GET /api/doctor
 * @desc    Get all doctors with filters, pagination & language support
 * @query   ?lang=en | ?page=1&limit=10 | ?search=John | ?department=Cardiology
 */
router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    const { lang = "en", page = 1, limit = 10, search = "", department = "", sort = "" } = req.query;
    const skip = (page - 1) * limit;

    const filters = {};
    if (search) {
      filters.OR = [
        { translations: { path: ["en", "name"], string_contains: search } },
        { translations: { path: ["bn", "name"], string_contains: search } }
      ];
    }
    if (department) {
      filters.translations = { path: [lang, "department"], equals: department };
    }

    const doctors = await prisma.doctor.findMany({
      where: filters,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        memberships: true,
        awards: true,
        treatments: true,
        conditions: true,
        schedule: true,
        faqs: true
        
      },
      orderBy: sort === "experience" ? { translations: { path: [lang, "yearsOfExperience"], order: "desc" } } : undefined
    });

    res.status(200).json(doctors);
  } catch (error) {
    console.error("❌ Error fetching doctors:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   GET /api/doctor/:id
 * @desc    Get a doctor by ID with all related data
 */
router.get("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = "en" } = req.query;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        memberships: true,
        awards: true,
        treatments: true,
        conditions: true,
        schedule: true,
        faqs: true,
        
      }
    });

    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    res.status(200).json({
      id: doctor.id,
      email: doctor.email,
      icon: doctor.icon,
      translations: doctor.translations[lang] || doctor.translations["en"],
      memberships: doctor.memberships.map(m => m.name),
      awards: doctor.awards.map(a => a.title),
      treatments: doctor.treatments.map(t => t.name),
      conditions: doctor.conditions.map(c => c.name),
      schedule: doctor.schedule.map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })),
      faqs: doctor.faqs.map(f => ({ question: f.question, answer: f.answer }))
    });
 
    
  } catch (error) {
    console.error("❌ Error fetching doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   PUT /api/doctor/edit/:id
 * @desc    Update doctor details with multi-language support
 */
router.put("/edit/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { translations, memberships, awards, treatments, conditions, schedule, faqs } = req.body;

    if (!translations || typeof translations !== "object") {
      return res.status(400).json({ error: "Translations must be a valid JSON object." });
    }

    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) return res.status(404).json({ error: "Doctor not found" });

    // আগের ট্রান্সলেশন ডাটা ধরে রেখে নতুন ভাষা যোগ করা হবে
    const updatedTranslations = { ...existingDoctor.translations };

    for (const lang in translations) {
      updatedTranslations[lang] = {
        ...updatedTranslations[lang], // আগের ডাটা সংরক্ষণ
        ...translations[lang], // নতুন ডাটা আপডেট
      };
    }

    const updatedDoctor = await prisma.doctor.update({
      where: { id },
      data: {
        translations: updatedTranslations,
        memberships: { deleteMany: {}, create: memberships.map(m => ({ name: m.name })) },
        awards: { deleteMany: {}, create: awards.map(a => ({ title: a.title })) },
        treatments: { deleteMany: {}, create: treatments.map(t => ({ name: t.name })) },
        conditions: { deleteMany: {}, create: conditions.map(c => ({ name: c.name })) },
        schedule: { deleteMany: {}, create: schedule.map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })) },
        faqs: { deleteMany: {}, create: faqs.map(f => ({ question: f.question, answer: f.answer })) }
      },
      include: {
        memberships: true,
        awards: true,
        treatments: true,
        conditions: true,
        schedule: true,
        faqs: true,
        
      }
    });

    res.status(200).json({ message: "Doctor updated successfully", doctor: updatedDoctor });
  } catch (error) {
    console.error("❌ Error updating doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   DELETE /api/doctor/delete/:id
 * @desc    Delete a doctor by ID
 */
router.delete("/delete/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;

    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) return res.status(404).json({ error: "Doctor not found" });

    await prisma.doctor.delete({ where: { id } });

    res.status(200).json({ message: "Doctor deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
