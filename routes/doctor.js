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
    const {
      name, designation, department, shortBio, contactNumber,
      contactNumberSerial, gender, profilePhoto, email,
      appointmentFee, followUpFee, patientAttended, avgConsultationTime,
      academicQualiFication, yearsOfExperience, memberships = [],
      awards = [], treatments = [], conditions = [],
      schedule = [], faqs = []
    } = req.body;

    // Check if a doctor already exists
    const existingDoctor = await prisma.doctor.findUnique({
      where: {
        email: email || undefined, // Only use email if it's provided
        id: id || undefined         // Only use id if it's provided
      }
    });
    if (existingDoctor) {
      return res.status(400).json({ error: "A doctor with this email already exists." });
    }

    // Create new doctor
    const newDoctor = await prisma.doctor.create({
      data: {
        name, designation, department, shortBio, 
        contactNumber, contactNumberSerial, gender, 
        profilePhoto, email,
        appointmentFee: parseFloat(appointmentFee),
        followUpFee: parseFloat(followUpFee),
        patientAttended: parseInt(patientAttended),
        avgConsultationTime,
        academicQualiFication,
        yearsOfExperience: parseInt(yearsOfExperience),
      }
    });

    const doctorId = newDoctor.id;
    console.log(doctorId);
    

    // Insert related data (Memberships, Awards, Treatments, Conditions, etc.)
    if (memberships.length > 0) {
      await Promise.all(memberships.map(mem => 
        prisma.membership.create({
          data: {
            doctorId: newDoctor.id,
            name: mem.name
          }
        })
      ));
    }
    
    if (awards.length > 0) {
      await Promise.all(awards.map(award =>
        prisma.award.create({
          data: {
            doctorId: newDoctor.id,
            title: award.title
          }
        })
      ));
    }
    
    if (treatments.length > 0) {
      await Promise.all(treatments.map(treatment =>
        prisma.treatment.create({
          data: {
            doctorId: newDoctor.id,
            name: treatment.name
          }
        })
      ));
    }
    
    if (conditions.length > 0) {
      await Promise.all(conditions.map(condition =>
        prisma.condition.create({
          data: {
            doctorId: newDoctor.id,
            name: condition.name
          }
        })
      ));
    }
    
    if (schedule.length > 0) {
      await Promise.all(schedule.map(sch =>
        prisma.schedule.create({
          data: {
            doctorId: newDoctor.id,
            day: sch.day,
            startTime: sch.startTime,
            endTime: sch.endTime
          }
        })
      ));
    }
    
    if (faqs.length > 0) {
      await Promise.all(faqs.map(faq =>
        prisma.faq.create({
          data: {
            doctorId: newDoctor.id,
            question: faq.question,
            answer: faq.answer
          }
        })
      ));
    }
    



    // Fetch full doctor details after inserting related data
    const completeDoctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        memberships: true,
        awards: true,
        treatments: true,
        conditions: true,
        schedule: true,
        faqs: true
      }
    });

    res.status(201).json({ message: "Doctor added successfully", doctor: completeDoctor });
  } catch (error) {
    console.error("Error adding doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



/**
 * @route   GET /api/doctor
 * @desc    Get all doctors with language filtering
 */


router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    const { lang = "en" } = req.query;

    // ✅ **Get all doctors with all relations**
    const doctors = await prisma.doctor.findMany({
      include: {
        memberships: true,
        awards: true,
        treatments: true,
        conditions: true,
        schedule: true,
        faqs: true
      }
    });

    // ✅ **Map Data for translation support**
    const response = doctors.map(doc => ({
      id: doc.id,
      name: doc.name?.[lang] || doc.name?.["en"],  // Use optional chaining to avoid errors
      designation: doc.designation?.[lang] || doc.designation?.["en"],  // Check if designation exists
      department: doc.department?.[lang] || doc.department?.["en"],  // Check if department exists
      shortBio: doc.shortBio ? doc.shortBio[lang] || doc.shortBio["en"] : null,  // Check if shortBio exists
      contactNumber: doc.contactNumber?.[lang] || doc.contactNumber?.["en"],  // Ensure contactNumber exists
      contactNumberSerial: doc.contactNumberSerial?.[lang] || doc.contactNumberSerial?.["en"],  // Ensure contactNumberSerial exists
      gender: doc.gender?.[lang] || doc.gender?.["en"],  // Ensure gender exists
      avgConsultationTime: doc.avgConsultationTime?.[lang] || doc.avgConsultationTime?.["en"],  // Ensure avgConsultationTime exists
      yearsOfExperience: doc.yearsOfExperience?.[lang] || doc.yearsOfExperience?.["en"],  // Ensure yearsOfExperience exists
      profilePhoto: doc.profilePhoto,
      email: doc.email,
      appointmentFee: doc.appointmentFee,
      followUpFee: doc.followUpFee
    }));
    

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   GET /api/doctors/:id
 * @desc    Get a single doctor by ID with language support
 */

router.get("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const { lang = "en" } = req.query;
    const { id } = req.params;

    // ✅ **Find doctor by ID with all relations**
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

    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    // ✅ **Format the response with translation support**
    const response = {
      id: doctor.id,
      name: doctor.name[lang] || doctor.name["en"],
      designation: doctor.designation[lang] || doctor.designation["en"],
      department: doctor.department[lang] || doctor.department["en"],
      shortBio: doctor.shortBio ? doctor.shortBio[lang] || doctor.shortBio["en"] : null,
      contactNumber: doctor.contactNumber[lang] || doctor.contactNumber["en"],
      contactNumberSerial: doctor.contactNumberSerial[lang] || doctor.contactNumberSerial["en"],
      gender: doctor.gender[lang] || doctor.gender["en"],
      avgConsultationTime: doctor.avgConsultationTime[lang] || doctor.avgConsultationTime["en"],
      yearsOfExperience: doctor.yearsOfExperience[lang] || doctor.yearsOfExperience["en"],
      profilePhoto: doctor.profilePhoto,
      email: doctor.email,
      appointmentFee: doctor.appointmentFee,
      followUpFee: doctor.followUpFee,

      // ✅ **Include memberships, awards, treatments, conditions, schedule, faqs**
      memberships: doctor.memberships.map(mem => ({ name: mem.name[lang] || mem.name["en"] })),
      awardsAchievements: doctor.awards.map(award => ({ title: award.title[lang] || award.title["en"] })),
      treatmentsList: doctor.treatments.map(treatment => ({ name: treatment.name[lang] || treatment.name["en"] })),
      conditionsList: doctor.conditions.map(condition => ({ name: condition.name[lang] || condition.name["en"] })),
      schedule: doctor.schedule.map(sch => ({ day: sch.day, startTime: sch.startTime, endTime: sch.endTime })),
      faqs: doctor.faqs.map(faq => ({ question: faq.question[lang] || faq.question["en"], answer: faq.answer[lang] || faq.answer["en"] }))
    };
console.log(response);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching doctor:", error);
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
    const {
      name, designation, department, shortBio, contactNumber, contactNumberSerial,
      gender, profilePhoto, email, appointmentFee, followUpFee,
      patientAttended, avgConsultationTime, academicQualiFication, yearsOfExperience,
      memberships = [], awardsAchievements = [], treatmentsList = [],
      conditionsList = [], schedule = [], faqs = []
    } = req.body;

    // 🔹 Check if the doctor exists
    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    // 🔹 Update doctor data
    const updatedDoctor = await prisma.doctor.update({
      where: { id },
      data: {
        name, designation, department, shortBio,
        contactNumber, contactNumberSerial, gender,
        profilePhoto, email,
        appointmentFee: parseFloat(appointmentFee),
        followUpFee: parseFloat(followUpFee),
        patientAttended: parseInt(patientAttended),
        avgConsultationTime, academicQualiFication,
        yearsOfExperience: parseInt(yearsOfExperience),

        memberships: { deleteMany: {}, create: memberships.map(mem => ({ name: mem.name })) },
        awards: { deleteMany: {}, create: awardsAchievements.map(award => ({ title: award.title })) },
        treatments: { deleteMany: {}, create: treatmentsList.map(treatment => ({ name: treatment.name })) },
        conditions: { deleteMany: {}, create: conditionsList.map(condition => ({ name: condition.name })) },
        schedule: { deleteMany: {}, create: schedule.map(sch => ({ day: sch.day, startTime: sch.startTime, endTime: sch.endTime })) },
        faqs: { deleteMany: {}, create: faqs.map(faq => ({ question: faq.question, answer: faq.answer })) }
      }
    });

    res.status(200).json({ message: "Doctor updated successfully", doctor: updatedDoctor });
  } catch (error) {
    console.error("Error updating doctor:", error);
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

    if (!existingDoctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    await prisma.doctor.delete({ where: { id } });

    res.status(200).json({ message: "Doctor deleted successfully" });
  } catch (error) {
    console.error("Error deleting doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
