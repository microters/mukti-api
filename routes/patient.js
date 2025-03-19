// const express = require('express');
// const { PrismaClient } = require('@prisma/client');
// const authenticateToken = require('../middleware/authMiddleware');
// const multer = require('multer');
// const path = require('path');

// const prisma = new PrismaClient();
// const router = express.Router();

// // Multer configuration for image upload
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/');
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//     }
// });
// const upload = multer({ 
//     storage: storage,
//     limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
// });

// // Add Patient
// router.post('/add', authenticateToken, upload.single('image'), async (req, res) => {
//     try {
//         // Log entire request for debugging
//         console.log('Request Body:', req.body);
//         console.log('Request File:', req.file);
//         console.log('Authenticated User:', req.user);

//         const { 
//             name, 
//             phoneNumber, 
//             email, 
//             gender, 
//             bloodGroup, 
//             dateOfBirth, 
//             age, 
//             weight,
//             height,
//             medicalHistory
//         } = req.body;

//         // Validate required fields
//         if (!name || !phoneNumber) {
//             return res.status(400).json({ error: "Name and phone number are required" });
//         }

//         // Ensure user is authenticated
//         if (!req.user || !req.user.userId) {
//             return res.status(401).json({ error: "User not authenticated" });
//         }

//         // Get user ID from authenticated request
//         const userId = req.user.userId;

//         // Verify user exists
//         const user = await prisma.user.findUnique({
//             where: { id: userId }
//         });

//         if (!user) {
//             return res.status(404).json({ error: "User not found" });
//         }

//         // Handle image upload
//         const image = req.file ? req.file.path : null;

//         // Create patient data
//         const patientData = {
//             name,
//             phoneNumber,
//             email: email || null,
//             gender: gender || null,
//             bloodGroup: bloodGroup || null,
//             dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
//             age: age || null,
//             weight: weight || null,
//             height: height || null,
//             medicalHistory: medicalHistory || null,
//             image: image,
//             userId: user.id
//         };

//         // Create new patient
//         const newPatient = await prisma.patient.create({
//             data: patientData
//         });

//         res.status(201).json({ 
//             message: "Patient added successfully", 
//             patient: newPatient 
//         });
//     } catch (error) {
//         console.error('Error in patient creation:', error);
//         res.status(500).json({ 
//             error: "Internal Server Error", 
//             details: error.message 
//         });
//     }
// });


// // Get Patients for a User
// router.get('/', authenticateToken, async (req, res) => {
//     try {
//         const userId = req.user.userId;

//         // Get all patients for this user
//         const patients = await prisma.patient.findMany({
//             where: { userId: userId },
//             orderBy: { createdAt: 'desc' }
//         });

//         res.status(200).json(patients);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ 
//             error: "Internal Server Error", 
//             details: error.message 
//         });
//     }
// });

// // Get Single Patient
// router.get('/:id', authenticateToken, async (req, res) => {
//     try {
//         const { id } = req.params;
//         const userId = req.user.userId;

//         const patient = await prisma.patient.findFirst({
//             where: { 
//                 id: id,
//                 userId: userId 
//             }
//         });

//         if (!patient) {
//             return res.status(404).json({ error: "Patient not found" });
//         }

//         res.status(200).json(patient);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ 
//             error: "Internal Server Error", 
//             details: error.message 
//         });
//     }
// });

// // Update Patient
// router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
//     try {
//         const { id } = req.params;
//         const userId = req.user.userId;

//         const { 
//             name, 
//             phoneNumber, 
//             email, 
//             gender, 
//             bloodGroup, 
//             dateOfBirth, 
//             age, 
//             weight,
//             height,
//             medicalHistory
//         } = req.body;

//         // Check patient exists and belongs to user
//         const existingPatient = await prisma.patient.findFirst({
//             where: { 
//                 id: id,
//                 userId: userId 
//             }
//         });

//         if (!existingPatient) {
//             return res.status(404).json({ error: "Patient not found" });
//         }

//         // Prepare update data
//         const updateData = {
//             name: name || existingPatient.name,
//             phoneNumber: phoneNumber || existingPatient.phoneNumber,
//             email: email || existingPatient.email,
//             gender: gender || existingPatient.gender,
//             bloodGroup: bloodGroup || existingPatient.bloodGroup,
//             dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existingPatient.dateOfBirth,
//             age: age || existingPatient.age,
//             weight: weight || existingPatient.weight,
//             height: height || existingPatient.height,
//             medicalHistory: medicalHistory || existingPatient.medicalHistory
//         };

//         // Update image if new one is uploaded
//         if (req.file) {
//             updateData.image = req.file.path;
//         }

//         const updatedPatient = await prisma.patient.update({
//             where: { id: id },
//             data: updateData
//         });

//         res.status(200).json({ 
//             message: "Patient updated successfully", 
//             patient: updatedPatient 
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ 
//             error: "Internal Server Error", 
//             details: error.message 
//         });
//     }
// });

// // Delete Patient
// router.delete('/:id', authenticateToken, async (req, res) => {
//     try {
//         const { id } = req.params;
//         const userId = req.user.userId;

//         // Check patient exists and belongs to user
//         const existingPatient = await prisma.patient.findFirst({
//             where: { 
//                 id: id,
//                 userId: userId 
//             }
//         });

//         if (!existingPatient) {
//             return res.status(404).json({ error: "Patient not found" });
//         }

//         await prisma.patient.delete({ 
//             where: { id: id } 
//         });

//         res.status(200).json({ 
//             message: "Patient deleted successfully" 
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ 
//             error: "Internal Server Error", 
//             details: error.message 
//         });
//     }
// });

// module.exports = router;

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateAPIKey = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const router = express.Router();

// Multer configuration for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/patients');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `patient-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
        }
    }
});

// Add Patient Route
router.post('/add', authenticateAPIKey, upload.single('image'), async (req, res) => {
    try {
        const { 
            name, 
            phoneNumber, 
            email, 
            gender, 
            bloodGroup, 
            dateOfBirth, 
            age, 
            weight,
            height,
            medicalHistory
        } = req.body;

        // Validate required fields
        if (!name || !phoneNumber) {
            return res.status(400).json({ error: "Name and phone number are required" });
        }

        // Check if patient already exists with this phone number
        const existingPatient = await prisma.patient.findFirst({
            where: { phoneNumber: phoneNumber },
            include: { user: true }
        });

        // If patient already exists, return error
        if (existingPatient) {
            return res.status(400).json({ 
                error: "Patient with this phone number already exists",
                existingPatient: {
                    id: existingPatient.id,
                    name: existingPatient.name,
                    userId: existingPatient.userId
                }
            });
        }

        // Create or find user
        let user = await prisma.user.findUnique({
            where: { mobile: phoneNumber }
        });

        // If user doesn't exist, create a new user
        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: name,
                    mobile: phoneNumber,
                    email: email || null,
                    role: 'patient'
                }
            });
        }

        // Handle image upload
        const image = req.file 
            ? `/uploads/patients/${path.basename(req.file.path)}` 
            : null;

        // Create patient data
        const patientData = {
            name,
            phoneNumber,
            email: email || null,
            gender: gender || null,
            bloodGroup: bloodGroup || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            age: age || null,
            weight: weight || null,
            height: height || null,
            medicalHistory: medicalHistory || null,
            image: image,
            userId: user.id
        };

        // Create new patient
        const newPatient = await prisma.patient.create({
            data: patientData,
            include: {
                user: true
            }
        });

        res.status(201).json({ 
            message: "Patient added successfully", 
            patient: newPatient,
            userCreated: !user.id,
            status: 'success'
        });

    } catch (error) {
        console.error('Error in patient creation:', error);
        
        // Handle unique constraint violations
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                error: "A patient with this information already exists",
                details: error.message,
                status: 'error'
            });
        }

        res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message,
            status: 'error'
        });
    }
});

// Get Patients
router.get('/', authenticateAPIKey, async (req, res) => {
    try {
        const patients = await prisma.patient.findMany({
            include: {
                user: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(patients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message 
        });
    }
});

module.exports = router;