// const express = require("express");
// const { PrismaClient } = require("@prisma/client");
// const authenticateAPIKey = require("../middleware/authMiddleware");

// const prisma = new PrismaClient();
// const router = express.Router();

// /**
//  * @route   POST /api/doctor/add
//  * @desc    Add a new doctor with multi-language support
//  */
// router.post("/add", authenticateAPIKey, async (req, res) => {
//   try {
//     console.log("Received Data:", req.body); // Debugging জন্য লগ

//     const {
//       email, profilePhoto, translations, 
//       memberships = [], awards = [], 
//       treatments = [], conditions = [], schedule = [], faqs = []
//     } = req.body;

//     // 🔹 Email Check
//     if (!email) {
//       return res.status(400).json({ error: "Email is required" });
//     }

//     // 🔹 Check if doctor exists
//     const existingDoctor = await prisma.doctor.findUnique({ where: { email } });

//     if (existingDoctor) {
//       return res.status(400).json({ error: "A doctor with this email already exists." });
//     }

//     // ✅ Ensure translations field is an object
//     if (!translations || typeof translations !== "object") {
//       return res.status(400).json({ error: "Translations must be a valid JSON object." });
//     }

//     // ✅ Create new doctor with translations JSON field
//     const newDoctor = await prisma.doctor.create({
//       data: {
//         email,
//         profilePhoto: profilePhoto || null,
//         translations, // ✅ Save all data inside `translations`
//       }
//     });

//     res.status(201).json({ message: "Doctor added successfully", doctor: newDoctor });
//   } catch (error) {
//     console.error("❌ Error adding doctor:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });





// /**
//  * @route   GET /api/doctor
//  * @desc    Get all doctors with language filtering
//  */


// router.get("/", authenticateAPIKey, async (req, res) => {
//   try {
//     const { lang = "en" } = req.query;

//     // ✅ **Get all doctors with all relations**
//     const doctors = await prisma.doctor.findMany({
//       include: {
//         memberships: true,
//         awards: true,
//         treatments: true,
//         conditions: true,
//         schedule: true,
//         faqs: true
//       }
//     });

//     // ✅ **Map Data for translation support**
//     const response = doctors.map(doc => ({
//       id: doc.id,
//       name: doc.name?.[lang] || doc.name?.["en"],  // Use optional chaining to avoid errors
//       designation: doc.designation?.[lang] || doc.designation?.["en"],  // Check if designation exists
//       department: doc.department?.[lang] || doc.department?.["en"],  // Check if department exists
//       shortBio: doc.shortBio ? doc.shortBio[lang] || doc.shortBio["en"] : null,  // Check if shortBio exists
//       contactNumber: doc.contactNumber?.[lang] || doc.contactNumber?.["en"],  // Ensure contactNumber exists
//       contactNumberSerial: doc.contactNumberSerial?.[lang] || doc.contactNumberSerial?.["en"],  // Ensure contactNumberSerial exists
//       gender: doc.gender?.[lang] || doc.gender?.["en"],  // Ensure gender exists
//       avgConsultationTime: doc.avgConsultationTime?.[lang] || doc.avgConsultationTime?.["en"],  // Ensure avgConsultationTime exists
//       yearsOfExperience: doc.yearsOfExperience?.[lang] || doc.yearsOfExperience?.["en"],  // Ensure yearsOfExperience exists
//       profilePhoto: doc.profilePhoto,
//       email: doc.email,
//       appointmentFee: doc.appointmentFee,
//       followUpFee: doc.followUpFee
//     }));
    

//     res.status(200).json(response);
//   } catch (error) {
//     console.error("Error fetching doctors:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// /**
//  * @route   GET /api/doctors/:id
//  * @desc    Get a single doctor by ID with language support
//  */

// router.get("/:id", authenticateAPIKey, async (req, res) => {
//   try {
//     const { lang = "en" } = req.query;
//     const { id } = req.params;

//     // ✅ **Find doctor by ID with all relations**
//     const doctor = await prisma.doctor.findUnique({
//       where: { id },
//       include: {
//         memberships: true,
//         awards: true,
//         treatments: true,
//         conditions: true,
//         schedule: true,
//         faqs: true
//       }
//     });

//     if (!doctor) {
//       return res.status(404).json({ error: "Doctor not found" });
//     }

//     // ✅ **Format the response with translation support**
//     const response = {
//       id: doctor.id,
//       name: doctor.name[lang] || doctor.name["en"],
//       designation: doctor.designation[lang] || doctor.designation["en"],
//       department: doctor.department[lang] || doctor.department["en"],
//       shortBio: doctor.shortBio ? doctor.shortBio[lang] || doctor.shortBio["en"] : null,
//       contactNumber: doctor.contactNumber[lang] || doctor.contactNumber["en"],
//       contactNumberSerial: doctor.contactNumberSerial[lang] || doctor.contactNumberSerial["en"],
//       gender: doctor.gender[lang] || doctor.gender["en"],
//       avgConsultationTime: doctor.avgConsultationTime[lang] || doctor.avgConsultationTime["en"],
//       yearsOfExperience: doctor.yearsOfExperience[lang] || doctor.yearsOfExperience["en"],
//       profilePhoto: doctor.profilePhoto,
//       email: doctor.email,
//       appointmentFee: doctor.appointmentFee,
//       followUpFee: doctor.followUpFee,

//       // ✅ **Include memberships, awards, treatments, conditions, schedule, faqs**
//       memberships: doctor.memberships.map(mem => ({ name: mem.name[lang] || mem.name["en"] })),
//       awardsAchievements: doctor.awards.map(award => ({ title: award.title[lang] || award.title["en"] })),
//       treatmentsList: doctor.treatments.map(treatment => ({ name: treatment.name[lang] || treatment.name["en"] })),
//       conditionsList: doctor.conditions.map(condition => ({ name: condition.name[lang] || condition.name["en"] })),
//       schedule: doctor.schedule.map(sch => ({ day: sch.day, startTime: sch.startTime, endTime: sch.endTime })),
//       faqs: doctor.faqs.map(faq => ({ question: faq.question[lang] || faq.question["en"], answer: faq.answer[lang] || faq.answer["en"] }))
//     };
// console.log(response);

//     res.status(200).json(response);
//   } catch (error) {
//     console.error("Error fetching doctor:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// /**
//  * @route   PUT /api/doctor/edit/:id
//  * @desc    Update doctor details with multi-language support
//  */
// router.put("/edit/:id", authenticateAPIKey, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       name, designation, department, shortBio, contactNumber, contactNumberSerial,
//       gender, profilePhoto, email, appointmentFee, followUpFee,
//       patientAttended, avgConsultationTime, academicQualiFication, yearsOfExperience,
//       memberships = [], awardsAchievements = [], treatmentsList = [],
//       conditionsList = [], schedule = [], faqs = []
//     } = req.body;

//     // 🔹 Check if the doctor exists
//     const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
//     if (!existingDoctor) {
//       return res.status(404).json({ error: "Doctor not found" });
//     }

//     // 🔹 Update doctor data
//     const updatedDoctor = await prisma.doctor.update({
//       where: { id },
//       data: {
//         name, designation, department, shortBio,
//         contactNumber, contactNumberSerial, gender,
//         profilePhoto, email,
//         appointmentFee: parseFloat(appointmentFee),
//         followUpFee: parseFloat(followUpFee),
//         patientAttended: parseInt(patientAttended),
//         avgConsultationTime, academicQualiFication,
//         yearsOfExperience: parseInt(yearsOfExperience),

//         memberships: { deleteMany: {}, create: memberships.map(mem => ({ name: mem.name })) },
//         awards: { deleteMany: {}, create: awardsAchievements.map(award => ({ title: award.title })) },
//         treatments: { deleteMany: {}, create: treatmentsList.map(treatment => ({ name: treatment.name })) },
//         conditions: { deleteMany: {}, create: conditionsList.map(condition => ({ name: condition.name })) },
//         schedule: { deleteMany: {}, create: schedule.map(sch => ({ day: sch.day, startTime: sch.startTime, endTime: sch.endTime })) },
//         faqs: { deleteMany: {}, create: faqs.map(faq => ({ question: faq.question, answer: faq.answer })) }
//       }
//     });

//     res.status(200).json({ message: "Doctor updated successfully", doctor: updatedDoctor });
//   } catch (error) {
//     console.error("Error updating doctor:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// /**
//  * @route   DELETE /api/doctor/delete/:id
//  * @desc    Delete a doctor by ID
//  */
// router.delete("/delete/:id", authenticateAPIKey, async (req, res) => {
//   try {
//     const { id } = req.params;

//     const existingDoctor = await prisma.doctor.findUnique({ where: { id } });

//     if (!existingDoctor) {
//       return res.status(404).json({ error: "Doctor not found" });
//     }

//     await prisma.doctor.delete({ where: { id } });

//     res.status(200).json({ message: "Doctor deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting doctor:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// module.exports = router;
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @route   POST /api/doctor/add
 * @desc    Add a new doctor with multi-language support
 */
router.post("/add", authenticateAPIKey, async (req, res) => {
  try {
    console.log("Received Data:", req.body);

    const { email, profilePhoto, translations, memberships = [], awards = [], treatments = [], conditions = [], schedule = [], faqs = [] } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!translations || typeof translations !== "object") return res.status(400).json({ error: "Translations must be a valid JSON object." });

    const existingDoctor = await prisma.doctor.findUnique({ where: { email } });
    if (existingDoctor) return res.status(400).json({ error: "A doctor with this email already exists." });

    const newDoctor = await prisma.doctor.create({
      data: {
        email,
        profilePhoto: profilePhoto || null,
        translations,
        memberships: { create: memberships.map(m => ({ name: m.name })) },
        awards: { create: awards.map(a => ({ title: a.title })) },
        treatments: { create: treatments.map(t => ({ name: t.name })) },
        conditions: { create: conditions.map(c => ({ name: c.name })) },
        schedule: { create: schedule.map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })) },
        faqs: { create: faqs.map(f => ({ question: f.question, answer: f.answer })) }
      },
      include: {
        memberships: true,
        awards: true,
        treatments: true,
        conditions: true,
        schedule: true,
        faqs: true
      }
    });

    console.log("✅ Doctor Added:", newDoctor);
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
        faqs: true
      }
    });

    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    res.status(200).json({
      id: doctor.id,
      email: doctor.email,
      profilePhoto: doctor.profilePhoto,
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

    if (!translations || typeof translations !== "object") return res.status(400).json({ error: "Translations must be a valid JSON object." });

    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) return res.status(404).json({ error: "Doctor not found" });

    const updatedDoctor = await prisma.doctor.update({
      where: { id },
      data: {
        translations,
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
        faqs: true
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
