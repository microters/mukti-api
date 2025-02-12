const express = require('express');
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require('../middleware/authMiddleware');

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @route   POST /api/patient/add
 * @desc    Add a new patient with multi-language support
 */
router.post("/add", authenticateAPIKey, async (req, res) => {
    try {
        const {
            name, phoneNumber, email, gender, bloodGroup, dateOfBirth, age, weight, image
        } = req.body;
        
        // Create new patient
        const newPatient = await prisma.patient.create({
            data: {
                name,  // `name` will be a JSON object with multi-language support
                phoneNumber,  // `phoneNumber` will be a JSON object with multi-language support
                email,
                gender,  // `gender` will be a JSON object with multi-language support
                bloodGroup,  // `bloodGroup` will be a JSON object with multi-language support
                dateOfBirth: new Date(dateOfBirth),
                age,  // `age` will be a JSON object with multi-language support
                weight,  // `weight` will be a JSON object with multi-language support
                image
            }
        });

        res.status(201).json({ message: "Patient added successfully", patient: newPatient });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * @route   GET /api/patient
 * @desc    Get all patients with language filtering
 */
router.get("/", authenticateAPIKey, async (req, res) => {
    try {
        const { lang = "en" } = req.query;

        const patients = await prisma.patient.findMany();

        const response = patients.map(patient => ({
            id: patient.id,
            name: patient.name[lang] || patient.name["en"],
            phoneNumber: patient.phoneNumber[lang] || patient.phoneNumber["en"],
            email: patient.email,
            gender: patient.gender[lang] || patient.gender["en"],
            bloodGroup: patient.bloodGroup[lang] || patient.bloodGroup["en"],
            dateOfBirth: patient.dateOfBirth,
            age: patient.age[lang] || patient.age["en"],
            weight: patient.weight[lang] || patient.weight["en"],
            image: patient.image
        }));

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


/**
 * @route   GET /api/patient/:id
 * @desc    Get a single patient with language support
 */
router.get("/:id", authenticateAPIKey, async (req, res) => {
    try {
        const { lang = "en" } = req.query;

        const patient = await prisma.patient.findUnique({
            where: { id: req.params.id }
        });

        if (!patient) return res.status(404).json({ error: "Patient not found" });

        const response = {
            id: patient.id,
            name: patient.name[lang] || patient.name["en"],
            phoneNumber: patient.phoneNumber[lang] || patient.phoneNumber["en"],
            email: patient.email,
            gender: patient.gender[lang] || patient.gender["en"],
            bloodGroup: patient.bloodGroup[lang] || patient.bloodGroup["en"],
            dateOfBirth: patient.dateOfBirth,
            age: patient.age[lang] || patient.age["en"],
            weight: patient.weight[lang] || patient.weight["en"],
            image: patient.image
        };

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


/**
 * @route   PUT /api/patient/edit/:id
 * @desc    Update patient details with multi-language support
 */
router.put("/edit/:id", authenticateAPIKey, async (req, res) => {
    try {
        const { name, phoneNumber, email, gender, bloodGroup, dateOfBirth, age, weight, image } = req.body;
        const patientId = req.params.id.trim();

        // Check if patient exists
        const existingPatient = await prisma.patient.findUnique({ where: { id: patientId } });
        if (!existingPatient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        // Update patient data
        const updatedPatient = await prisma.patient.update({
            where: { id: patientId },
            data: {
                name: name || existingPatient.name,
                phoneNumber: phoneNumber || existingPatient.phoneNumber,
                email: email || existingPatient.email,
                gender: gender || existingPatient.gender,
                bloodGroup: bloodGroup || existingPatient.bloodGroup,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existingPatient.dateOfBirth,
                age: age || existingPatient.age,
                weight: weight || existingPatient.weight,
                image: image || existingPatient.image
            }
        });

        res.status(200).json({ message: "Patient updated successfully", patient: updatedPatient });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


/**
 * @route   DELETE /api/patient/delete/:id
 * @desc    Delete patient
 */
router.delete("/delete/:id", authenticateAPIKey, async (req, res) => {
    try {
        await prisma.patient.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: "Patient deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


module.exports = router;
