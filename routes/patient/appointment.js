const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../../middleware/authMiddleware");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @route   POST /api/appointments/add
 * @desc    Add a new appointment (Protected by API Key)
 */
router.post("/add", authenticateAPIKey, async (req, res) => {
  try {
    const {
      doctorId,
      doctorName,
      patientId,
      patientName,
      mobileNumber,
      scheduleId,
      serialNumber,
      weight,
      age,
      bloodGroup,
      consultationFee,
      paymentMethod,
      reason,
      address,
      isNewPatient, // new patient flag
    } = req.body;

    // Required fields check
    if (!doctorId || !doctorName || !mobileNumber || !patientName) {
      return res.status(400).json({ error: "Doctor id, doctor name, patient name, and mobile number are required" });
    }

    let finalPatientId = patientId;

    // If new patient or no patientId, create a new patient (with user)
    if (isNewPatient || !patientId) {
      const newPatient = await prisma.patient.create({
        data: {
          name: patientName,
          phoneNumber: mobileNumber,
          user: {
            create: {
             
              name: patientName,       // Setting patient name as user name
              mobile: mobileNumber,    // Adding mobile as user field
            },
          },
        },
      });

      finalPatientId = newPatient.id;  // Assign the newly created patient's id
    }

    const newAppointment = await prisma.appointment.create({
      data: {
        doctorId,
        doctorName,
        patientId: finalPatientId,
        patientName,
        mobileNumber,
        scheduleId: scheduleId || undefined,
        serialNumber: serialNumber ? parseInt(serialNumber) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        age: age ? parseInt(age) : undefined,
        bloodGroup: bloodGroup ? bloodGroup.replace("+", "_POSITIVE").replace("-", "_NEGATIVE") : undefined,
        consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
        paymentMethod: paymentMethod ? paymentMethod.toUpperCase() : undefined,
        reason: reason || undefined,
        address: address || undefined,
      },
      include: {
        doctor: true,
        patient: true,
        schedule: true,
      },
    });

    res.status(201).json({ message: "Appointment added successfully", appointment: newAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
