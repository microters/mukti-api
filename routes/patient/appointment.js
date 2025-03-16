const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../../middleware/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// 📌 Create a new Patient Appointment
router.post("/", authenticateAPIKey, async (req, res) => {
  const { patientName, phone, departmentId, doctorId, day } = req.body;

  // Validate required fields
  if (!patientName || !phone || !departmentId || !doctorId || !day) {
    return res.status(400).json({ error: "All fields are required!" });
  }

  // Log the received IDs for debugging
  console.log("Received IDs:", { departmentId, doctorId });

  try {
    // Fetch the department and doctor using the UUID strings directly
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    console.log("Fetched department:", department);
    console.log("Fetched doctor:", doctor);

    // Check if both department and doctor exist
    if (!department || !doctor) {
      return res.status(404).json({ error: "Department or Doctor not found" });
    }

    // Extract the name values from the translations, defaulting to English if available
    const departmentName =
      (department.translations &&
        department.translations.en &&
        department.translations.en.name) ||
      "N/A";
    const doctorName =
      (doctor.translations &&
        doctor.translations.en &&
        doctor.translations.en.name) ||
      "N/A";

    // Create the appointment using the fetched names
    const newAppointment = await prisma.patientAppointment.create({
      data: {
        patientName,
        phone,
        day,
        departmentName, // Use the extracted department name
        doctorName,     // Use the extracted doctor name
      },
    });

    res.status(201).json({
      message: "Successfully booked appointment!",
      appointment: newAppointment,
    });
  } catch (error) {
    console.error("❌ Error creating new appointment:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 Fetch all Patient Appointments (including Doctor & Department names)
router.get("/", authenticateAPIKey, async (req, res) => {
  try {
    const appointments = await prisma.patientAppointment.findMany({
      include: {
        department: { select: { name: true } }, // Retrieve Department name
        doctor: { select: { name: true } }, // Retrieve Doctor name
      },
      orderBy: { createdAt: "desc" }, // Show the most recent appointments first
    });

    // Process the data to display names instead of IDs
    const formattedAppointments = appointments.map((appointment) => ({
      id: appointment.id,
      patientName: appointment.patientName,
      phone: appointment.phone,
      department: appointment.department?.name || "N/A", // Department name
      doctor: appointment.doctor?.name || "N/A", // Doctor name
      day: appointment.day,
      createdAt: appointment.createdAt,
    }));

    res.json({
      message: "Appointments fetched successfully!",
      appointments: formattedAppointments,
    });
  } catch (error) {
    console.error("❌ Error fetching appointments:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 Fetch a specific Patient Appointment
router.get("/:id", authenticateAPIKey, async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await prisma.patientAppointment.findUnique({
      where: { id },
      include: {
        department: { select: { name: true } }, // Retrieve Department name
        doctor: { select: { name: true } }, // Retrieve Doctor name
      },
    });

    if (!appointment) {
      return res
        .status(404)
        .json({ error: "Patient appointment not found" });
    }

    // Display names instead of IDs
    const formattedAppointment = {
      id: appointment.id,
      patientName: appointment.patientName,
      phone: appointment.phone,
      department: appointment.department?.name || "N/A",
      doctor: appointment.doctor?.name || "N/A",
      day: appointment.day,
      createdAt: appointment.createdAt,
    };

    res.json(formattedAppointment);
  } catch (error) {
    console.error("❌ Error fetching appointment:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 Update a Patient Appointment
router.put("/:id", authenticateAPIKey, async (req, res) => {
  const { id } = req.params;
  const { patientName, phone, departmentId, doctorId, day } = req.body;

  try {
    // Check if the appointment exists
    const existingAppointment = await prisma.patientAppointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      return res
        .status(404)
        .json({ error: "Patient appointment not found" });
    }

    // Update the appointment
    const updatedAppointment = await prisma.patientAppointment.update({
      where: { id },
      data: {
        patientName,
        phone,
        departmentId,
        doctorId,
        day,
        updatedAt: new Date(), // Track the update time
      },
    });

    res.json({
      message: "Patient appointment updated successfully!",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("❌ Error updating appointment:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 Delete a Patient Appointment
router.delete("/:id", authenticateAPIKey, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the appointment exists
    const existingAppointment = await prisma.patientAppointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      return res
        .status(404)
        .json({ error: "Patient appointment not found" });
    }

    await prisma.patientAppointment.delete({ where: { id } });

    res.json({ message: "Patient appointment deleted successfully!" });
  } catch (error) {
    console.error("❌ Error deleting appointment:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
