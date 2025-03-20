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
      // scheduleId is no longer used.
      serialNumber,
      weight,
      age,
      bloodGroup,
      consultationFee,
      paymentMethod,
      reason,
      address,
      isNewPatient, // new patient flag
      appointmentDate // user-selected appointment date
    } = req.body;

    // Required fields check
    if (!doctorId || !doctorName || !mobileNumber || !patientName || !appointmentDate) {
      return res.status(400).json({ error: "Doctor id, doctor name, patient name, mobile number, and appointment date are required" });
    }

    let finalPatientId = patientId;

    // If new patient or no patientId, check by mobile number
    if (isNewPatient || !patientId) {
      // Look for an existing user with the given mobile number
      const existingUser = await prisma.user.findUnique({
        where: { mobile: mobileNumber },
        include: { patients: true }, // সংশোধিত: "patient" এর পরিবর্তে "patients" ব্যবহার করা হয়েছে
      });

      if (existingUser) {
        // If the user exists and has a linked patient, reuse that patient's id
        if (existingUser.patients && existingUser.patients.length > 0) {
          finalPatientId = existingUser.patients[0].id;
        } else {
          // Otherwise, create a new patient record linked to the existing user
          const newPatient = await prisma.patient.create({
            data: {
              name: patientName,
              phoneNumber: mobileNumber,
              userId: existingUser.id,
            },
          });
          finalPatientId = newPatient.id;
        }
      } else {
        // No user exists with that mobile; create new user and patient
        const newPatient = await prisma.patient.create({
          data: {
            name: patientName,
            phoneNumber: mobileNumber,
            user: {
              create: {
                name: patientName,
                mobile: mobileNumber,
              },
            },
          },
        });
        finalPatientId = newPatient.id;
      }
    }

    // Create the appointment using the appointmentDate provided by the user.
    const newAppointment = await prisma.appointment.create({
      data: {
        doctorId,
        doctorName,
        patientId: finalPatientId,
        patientName,
        mobileNumber,
        appointmentDate, // user-selected appointment date
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
        // schedule not used
      },
    });

    res.status(201).json({ message: "Appointment added successfully", appointment: newAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   GET /api/appointments
 * @desc    Get all appointments
 * @access  Public
 */
router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        doctor: true,
        patient: true,
      },
    });
    res.status(200).json({ appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   PUT /api/appointments/edit/:id
 * @desc    Edit an existing appointment
 * @access  Protected by API Key
 */
router.put("/edit/:id", authenticateAPIKey, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const {
      doctorName,
      patientName,
      mobileNumber,
      serialNumber,
      weight,
      age,
      bloodGroup,
      consultationFee,
      paymentMethod,
      reason,
      address,
      appointmentDate,
    } = req.body;

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        doctorName,
        patientName,
        mobileNumber,
        appointmentDate,
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
      },
    });

    res.status(200).json({ message: "Appointment updated successfully", appointment: updatedAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   DELETE /api/appointments/delete/:id
 * @desc    Delete an existing appointment
 * @access  Protected by API Key
 */
router.delete("/delete/:id", authenticateAPIKey, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const deletedAppointment = await prisma.appointment.delete({
      where: { id: appointmentId },
    });
    res.status(200).json({ message: "Appointment deleted successfully", appointment: deletedAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
