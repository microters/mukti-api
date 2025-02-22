const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const prisma = new PrismaClient();
const router = express.Router();
const fs = require("fs");
const slugify = require("slugify");

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
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
router.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 📌 Function to Generate Unique Slug
const generateUniqueSlug = async (name, existingId = null) => {
  let slug = slugify(name, { lower: true, strict: true });

  let query = { where: { slug } };

  if (existingId) {
    query.where.NOT = { id: existingId }; // ✅ যদি id থাকে, তাহলে সেই ডাক্তার বাদ দিয়ে চেক করবে
  }

  let existingSlug = await prisma.doctor.findFirst(query);

  let counter = 1;
  while (existingSlug) {
    slug = `${slug}-${counter++}`;
    query.where.slug = slug;
    existingSlug = await prisma.doctor.findFirst(query);
  }

  return slug;
};


// 🟢 Add a New Doctor with Image Upload
router.post("/add", authenticateAPIKey, upload.single("profilePhoto"), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    const { email, translations, memberships = [], awards = [], treatments = [], conditions = [], schedule = [], faqs = [] } = data;

    const name = translations?.en?.name || translations?.bn?.name || "unknown";
    const slug = await generateUniqueSlug(name, null);  // ✅ `null` পাঠানো হচ্ছে নতুন ডাটার জন্য
    const icon = req.file ? `/uploads/${req.file.filename}` : "https://placehold.co/100";

    const newDoctor = await prisma.doctor.create({
      data: {
        email,
        slug,
        icon,
        translations,
        memberships: { create: memberships.map(m => ({ name: m.name })) },
        awards: { create: awards.map(a => ({ title: a.title })) },
        treatments: { create: treatments.map(t => ({ name: t.name })) },
        conditions: { create: conditions.map(c => ({ name: c.name })) },
        schedule: { create: schedule.map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })) },
        faqs: { create: faqs.map(f => ({ question: f.question, answer: f.answer })) },
      },
      include: { memberships: true, awards: true, treatments: true, conditions: true, schedule: true, faqs: true },
    });

    res.status(201).json({ message: "Doctor added successfully", doctor: newDoctor });
  } catch (error) {
    console.error("❌ Error adding doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// 🟢 Get All Doctors with Filters, Pagination & Search
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
      include: { memberships: true, awards: true, treatments: true, conditions: true, schedule: true, faqs: true },
      orderBy: sort === "experience" ? { translations: { path: [lang, "yearsOfExperience"], order: "desc" } } : undefined,
    });

    res.status(200).json(doctors);
  } catch (error) {
    console.error("❌ Error fetching doctors:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 🟢 Get a Doctor by ID or Slug
router.get("/:identifier", authenticateAPIKey, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { lang = "en" } = req.query;

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier }] },
      include: { memberships: true, awards: true, treatments: true, conditions: true, schedule: true, faqs: true },
    });

    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    res.status(200).json(doctor);
  } catch (error) {
    console.error("❌ Error fetching doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 🟢 Update Doctor with Editable Slug
router.put("/edit/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { translations, memberships, awards, treatments, conditions, schedule, faqs, slug: newSlug } = req.body;

    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) return res.status(404).json({ error: "Doctor not found" });

    let slug = newSlug || await generateUniqueSlug(translations?.en?.name || translations?.bn?.name || "unknown", id);

    const updatedDoctor = await prisma.doctor.update({
      where: { id },
      data: {
        slug,
        translations,
        memberships: { deleteMany: {}, create: memberships.map(m => ({ name: m.name })) },
        awards: { deleteMany: {}, create: awards.map(a => ({ title: a.title })) },
        treatments: { deleteMany: {}, create: treatments.map(t => ({ name: t.name })) },
        conditions: { deleteMany: {}, create: conditions.map(c => ({ name: c.name })) },
        schedule: { deleteMany: {}, create: schedule.map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })) },
        faqs: { deleteMany: {}, create: faqs.map(f => ({ question: f.question, answer: f.answer })) },
      },
      include: { memberships: true, awards: true, treatments: true, conditions: true, schedule: true, faqs: true },
    });

    res.status(200).json({ message: "Doctor updated successfully", doctor: updatedDoctor });
  } catch (error) {
    console.error("❌ Error updating doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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
