
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../middleware/authMiddleware");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @route   POST /api/appointments/add
 * @desc    Add a new appointment (Protected by API Key)
 */
router.post("/add", authenticateAPIKey, async (req, res) => {
  try {
    const {
      doctorId, patientId, consultationFee, vat, promoCode,
      consultationType, paymentMethod, directorReference
    } = req.body;

    // Validate doctor and patient existence
    const doctorExists = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctorExists) return res.status(400).json({ error: "Doctor not found" });

    const patientExists = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patientExists) return res.status(400).json({ error: "Patient not found" });

    // Convert enum values to uppercase to match Prisma enum definitions
    const consultationTypeEnum = consultationType ? consultationType.toUpperCase() : undefined;
    const paymentMethodEnum = paymentMethod ? paymentMethod.toUpperCase() : undefined;

    const newAppointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId,
        consultationFee: parseFloat(consultationFee),
        vat: parseFloat(vat),
        promoCode: promoCode || null,
        consultationType: consultationTypeEnum, // e.g., "PHYSICAL" or "VIDEO_CALL"
        paymentMethod: paymentMethodEnum,         // e.g., "BKASH", "BANK", or "REFERENCE"
        directorReference: directorReference || null,
        status: "Pending",
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
 * @desc    Get all appointments (Protected by API Key)
 */
router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { doctor: true, patient: true },
    });
    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   GET /api/appointments/:id
 * @desc    Get single appointment details (Protected by API Key)
 */
router.get("/:id", authenticateAPIKey, async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { doctor: true, patient: true },
    });

    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    res.status(200).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   PUT /api/appointments/edit/:id
 * @desc    Update appointment details (Protected by API Key)
 */
router.put("/edit/:id", authenticateAPIKey, async (req, res) => {
  try {
    const {
      doctorId, patientId, consultationFee, vat, promoCode,
      consultationType, paymentMethod, directorReference, status
    } = req.body;

    // Convert enum values to uppercase, if provided
    const consultationTypeEnum = consultationType ? consultationType.toUpperCase() : undefined;
    const paymentMethodEnum = paymentMethod ? paymentMethod.toUpperCase() : undefined;

    // Build update object
    const updateData = {
      doctorId: doctorId || undefined,
      patientId: patientId || undefined,
      consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
      vat: vat ? parseFloat(vat) : undefined,
      promoCode: promoCode || undefined,
      consultationType: consultationTypeEnum,
      paymentMethod: paymentMethodEnum,
      directorReference: directorReference || undefined,
      status: status || "Pending",
    };

    // Ensure ID is trimmed properly
    const appointmentId = req.params.id.trim();

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!existingAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Perform update
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
    });

    res.status(200).json({ message: "Appointment updated successfully", appointment: updatedAppointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   DELETE /api/appointments/delete/:id
 * @desc    Delete an appointment (Protected by API Key)
 */
router.delete("/delete/:id", authenticateAPIKey, async (req, res) => {
  try {
    await prisma.appointment.delete({
      where: { id: req.params.id }
    });

    res.status(200).json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
