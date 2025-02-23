const express = require('express');
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require('../middleware/authMiddleware');
const multer = require("multer");
const path = require("path");

const prisma = new PrismaClient();
const router = express.Router();

// Set up multer for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Define the folder to save the file
    },
    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname);  // Get file extension
        const fileName = Date.now() + fileExtension;  // Make the file name unique
        cb(null, fileName);  // Save the file with the new unique name
    }
});
const upload = multer({ storage: storage });

// POST route to add a new patient with image upload
router.post("/add", authenticateAPIKey, upload.single('image'), async (req, res) => {
    try {
        const {
            name, phoneNumber, email, gender, bloodGroup, dateOfBirth, age, weight
        } = req.body;

        // Handle the image file
        const image = req.file ? req.file.path : null;  // If file is uploaded, store the file path

        // Create new patient
        const newPatient = await prisma.patient.create({
            data: {
                name,
                phoneNumber,
                email,
                gender,
                bloodGroup,
                dateOfBirth: new Date(dateOfBirth),
                age,
                weight,
                image // Save the file path in the database
            }
        });

        res.status(201).json({ message: "Patient added successfully", patient: newPatient });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get all patients
router.get("/", authenticateAPIKey, async (req, res) => {
    try {
        const patients = await prisma.patient.findMany();
        const response = patients.map(patient => ({
            id: patient.id,
            name: patient.name,
            phoneNumber: patient.phoneNumber,
            email: patient.email,
            gender: patient.gender,
            bloodGroup: patient.bloodGroup,
            dateOfBirth: patient.dateOfBirth,
            age: patient.age,
            weight: patient.weight,
            image: patient.image // This will be the image URL or file path
        }));

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get patient by ID
router.get("/:id", authenticateAPIKey, async (req, res) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { id: req.params.id }
        });

        if (!patient) return res.status(404).json({ error: "Patient not found" });

        const response = {
            id: patient.id,
            name: patient.name,
            phoneNumber: patient.phoneNumber,
            email: patient.email,
            gender: patient.gender,
            bloodGroup: patient.bloodGroup,
            dateOfBirth: patient.dateOfBirth,
            age: patient.age,
            weight: patient.weight,
            image: patient.image
        };

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update patient details
router.put("/edit/:id", authenticateAPIKey, upload.single('image'), async (req, res) => {
    try {
        const { name, phoneNumber, email, gender, bloodGroup, dateOfBirth, age, weight } = req.body;
        const patientId = req.params.id.trim();

        const existingPatient = await prisma.patient.findUnique({ where: { id: patientId } });
        if (!existingPatient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        const image = req.file ? req.file.path : existingPatient.image;  // Update image if new one is uploaded

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
                image: image // Save the new image file path if uploaded
            }
        });

        res.status(200).json({ message: "Patient updated successfully", patient: updatedPatient });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Delete patient
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
