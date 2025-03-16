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
    // Unique file name
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Ensure static files are served from the 'public/uploads' directory
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
    const data = JSON.parse(req.body.data); // Parse JSON data
    const { email, translations, memberships = [], awards = [], treatments = [], conditions = [], schedule = [], faqs = [] } = data;
    console.log(translations);
    
    const name = translations?.en?.name || translations?.bn?.name || "unknown";
    const slug = await generateUniqueSlug(name, null); 

    // Extract gender from translations (both English and Bengali)
    const gender = translations?.en?.gender || translations?.bn?.gender;

    // Check gender and set default icon based on gender
    const icon = req.file 
      ? `/uploads/${req.file.filename}` 
      : gender === 'male' 
        ? "/uploads/doctor-placeholder-1.png" 
        : gender === 'female' 
        ? "/uploads/female.png" 
        : "/uploads/doctor-placeholder-1.png"; // Default placeholder if gender is not defined

    console.log(icon);

    // Create new doctor in the database
    const newDoctor = await prisma.doctor.create({
      data: {
        email,
        icon, 
        slug,
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
    console.log(newDoctor);

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
 * @route   GET /api/doctor/slug/:slug
 * @desc    Get a doctor by slug with all related data
 */
router.get("/slug/:slug", authenticateAPIKey, async (req, res) => {
  try {
    const { slug } = req.params;
    const { lang = "en" } = req.query;

    const doctor = await prisma.doctor.findFirst({
      where: { slug },
      include: {
        memberships: true,
        awards: true,
        treatments: true,
        conditions: true,
        schedule: true,
        faqs: true,
      },
    });

    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    res.status(200).json({
      id: doctor.id,
      email: doctor.email,
      slug: doctor.slug,
      icon: doctor.icon,
      translations: doctor.translations[lang] || doctor.translations["en"],
      memberships: doctor.memberships.map(m => m.name),
      awards: doctor.awards.map(a => a.title),
      treatments: doctor.treatments.map(t => t.name),
      conditions: doctor.conditions.map(c => c.name),
      schedule: doctor.schedule.map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })),
      faqs: doctor.faqs.map(f => ({ question: f.question, answer: f.answer })),
    });
  } catch (error) {
    console.error("❌ Error fetching doctor by slug:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   GET /api/doctor/:id
 * @desc    Get a doctor by ID (used for editing)
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
      },
    });

    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    res.status(200).json({
      id: doctor.id,
      email: doctor.email,
      slug: doctor.slug,
      icon: doctor.icon,
      translations: doctor.translations[lang] || doctor.translations["en"],
      memberships: doctor.memberships.map(m => m.name),
      awards: doctor.awards.map(a => a.title),
      treatments: doctor.treatments.map(t => t.name),
      conditions: doctor.conditions.map(c => c.name),
      schedule: doctor.schedule.map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })),
      faqs: doctor.faqs.map(f => ({ question: f.question, answer: f.answer })),
    });
  } catch (error) {
    console.error("❌ Error fetching doctor by id:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   PUT /api/doctor/edit/:id
 * @desc    Update doctor details, including profile photo (if provided)
 */
router.put("/edit/:id", authenticateAPIKey, upload.single("profilePhoto"), async (req, res) => {
  try {
      const { id } = req.params;
      
      // ✅ Parse JSON data from FormData
      const {
          translations, 
          memberships = [], 
          awards = [], 
          treatments = [], 
          conditions = [], 
          schedule = [], 
          faqs = [], 
          slug: newSlug 
      } = JSON.parse(req.body.data);

      // ✅ Check if doctor exists
      const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
      if (!existingDoctor) return res.status(404).json({ error: "Doctor not found" });

      // ✅ Handle profile photo update
      let updatedIcon = existingDoctor.icon; // Keep old image if no new file is uploaded
      if (req.file) {
          // Delete old image if it exists
          if (existingDoctor.icon && existingDoctor.icon.startsWith("/uploads/")) {
              const oldImagePath = path.join(__dirname, "..", existingDoctor.icon);
              if (fs.existsSync(oldImagePath)) {
                  fs.unlinkSync(oldImagePath);
              }
          }
          updatedIcon = `/uploads/${req.file.filename}`;
      }

      // ✅ Update translations
      const updatedTranslations = { ...existingDoctor.translations };
      for (const lang in translations) {
          updatedTranslations[lang] = { 
              ...updatedTranslations[lang], 
              ...translations[lang] 
          };
      }

      // ✅ Update doctor in the database
      const updatedDoctor = await prisma.doctor.update({
          where: { id },
          data: {
              slug: newSlug || existingDoctor.slug,
              icon: updatedIcon, // ✅ Update profile photo
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
router.delete("/delete/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { id } = req.params;

    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    // Delete related records first
    await prisma.appointment.deleteMany({ where: { doctorId: id } });
    await prisma.schedule.deleteMany({ where: { doctorId: id } });
    await prisma.membership.deleteMany({ where: { doctorId: id } });
    await prisma.award.deleteMany({ where: { doctorId: id } });
    await prisma.treatment.deleteMany({ where: { doctorId: id } });
    await prisma.condition.deleteMany({ where: { doctorId: id } });

    // Now delete the doctor
    await prisma.doctor.delete({ where: { id } });

    res.status(200).json({ message: "Doctor deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting doctor:", error);
    res.status(500).json({ error: "Failed to delete doctor" });
  }
});



module.exports = router;
