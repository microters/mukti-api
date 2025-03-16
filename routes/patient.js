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

        // Validate required fields
        if (!name || !phoneNumber) {
            return res.status(400).json({ error: "Name and phone number are required fields" });
        }

        // Handle the image file
        const image = req.file ? req.file.path : "";  // If file is uploaded, store the file path

        // Create patient data with all required fields with default values
        const patientData = {
            name,
            phoneNumber,
            email: email || "",
            gender: gender || "",
            bloodGroup: bloodGroup || "",
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(), // Default to current date if not provided
            age: age || "",
            weight: weight || "",
            image: image || ""
        };

        // Create new patient
        const newPatient = await prisma.patient.create({
            data: patientData
        });

        res.status(201).json({ message: "Patient added successfully", patient: newPatient });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Get all patients
router.get("/", authenticateAPIKey, async (req, res) => {
    try {
        const patients = await prisma.patient.findMany();
        res.status(200).json(patients);
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
        res.status(200).json(patient);
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

        // Validate required fields if they are being updated
        if (name === "" || phoneNumber === "") {
            return res.status(400).json({ error: "Name and phone number cannot be empty" });
        }

        // Prepare update data
        const updateData = {};
        
        // Only include fields that are provided in the request
        if (name !== undefined) updateData.name = name;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (email !== undefined) updateData.email = email || "";
        if (gender !== undefined) updateData.gender = gender || "";
        if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup || "";
        if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
        if (age !== undefined) updateData.age = age || "";
        if (weight !== undefined) updateData.weight = weight || "";
        
        // Update image if new one is uploaded
        if (req.file) {
            updateData.image = req.file.path;
        }

        const updatedPatient = await prisma.patient.update({
            where: { id: patientId },
            data: updateData
        });

        res.status(200).json({ message: "Patient updated successfully", patient: updatedPatient });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
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