const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateAPIKey = require("../../middleware/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// 📌 নতুন Patient Appointment তৈরি করা
router.post("/", authenticateAPIKey, async (req, res) => {
    const { patientName, phone, departmentId, doctorId, day } = req.body;

    if (!patientName || !phone || !departmentId || !doctorId || !day) {
        return res.status(400).json({ error: "সব ফিল্ড প্রয়োজনীয়!" });
    }

    try {
        const newAppointment = await prisma.patientAppointment.create({
            data: {
                patientName,
                phone,
                departmentId,
                doctorId,
                day,
            },
        });

        res.status(201).json({
            message: "অ্যাপয়েন্টমেন্ট সফলভাবে বুক করা হয়েছে!",
            appointment: newAppointment
        });
    } catch (error) {
        console.error("❌ নতুন অ্যাপয়েন্টমেন্ট তৈরি করার সময় সমস্যা:", error);
        res.status(500).json({ error: "সার্ভার ত্রুটি" });
    }
});

// 📌 সব Patient Appointments দেখানো (Doctor & Department নাম সহ)
router.get("/", authenticateAPIKey, async (req, res) => {
    try {
        const appointments = await prisma.patientAppointment.findMany({
            include: {
                department: { select: { name: true } }, // ✅ Department Name আনবে
                doctor: { select: { name: true } }, // ✅ Doctor Name আনবে
            },
            orderBy: { createdAt: "desc" }, // ✅ সর্বশেষ অ্যাপয়েন্টমেন্ট আগে দেখাবে
        });

        // ✅ ডাটাকে প্রসেস করে ID এর পরিবর্তে নাম দেখানো হবে
        const formattedAppointments = appointments.map(appointment => ({
            id: appointment.id,
            patientName: appointment.patientName,
            phone: appointment.phone,
            department: appointment.department?.name || "N/A", // ✅ Department Name
            doctor: appointment.doctor?.name || "N/A", // ✅ Doctor Name
            day: appointment.day,
            createdAt: appointment.createdAt,
        }));

        res.json({ message: "Appointments fetched successfully!", appointments: formattedAppointments });
    } catch (error) {
        console.error("❌ অ্যাপয়েন্টমেন্ট ফেচ করতে সমস্যা:", error.message);
        res.status(500).json({ error: "সার্ভার ত্রুটি" });
    }
});

// 📌 নির্দিষ্ট একটি Patient Appointment ফেচ করা
router.get("/:id", authenticateAPIKey, async (req, res) => {
    const { id } = req.params;

    try {
        const appointment = await prisma.patientAppointment.findUnique({
            where: { id },
            include: {
                department: { select: { name: true } }, // ✅ Department Name আনবে
                doctor: { select: { name: true } }, // ✅ Doctor Name আনবে
            },
        });

        if (!appointment) {
            return res.status(404).json({ error: "Patient appointment খুঁজে পাওয়া যায়নি" });
        }

        // ✅ ID এর পরিবর্তে নাম দেখানো হবে
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
        console.error("❌ অ্যাপয়েন্টমেন্ট ফেচ করতে সমস্যা:", error.message);
        res.status(500).json({ error: "সার্ভার ত্রুটি" });
    }
});

// 📌 Patient Appointment আপডেট করা
router.put("/:id", authenticateAPIKey, async (req, res) => {
    const { id } = req.params;
    const { patientName, phone, departmentId, doctorId, day } = req.body;

    try {
        // ✅ চেক করা হচ্ছে অ্যাপয়েন্টমেন্ট আছে কিনা
        const existingAppointment = await prisma.patientAppointment.findUnique({
            where: { id },
        });

        if (!existingAppointment) {
            return res.status(404).json({ error: "Patient appointment খুঁজে পাওয়া যায়নি" });
        }

        // ✅ অ্যাপয়েন্টমেন্ট আপডেট
        const updatedAppointment = await prisma.patientAppointment.update({
            where: { id },
            data: {
                patientName,
                phone,
                departmentId,
                doctorId,
                day,
                updatedAt: new Date(), // ✅ আপডেট সময় ট্র্যাক করা
            },
        });

        res.json({
            message: "Patient appointment সফলভাবে আপডেট হয়েছে!",
            appointment: updatedAppointment,
        });
    } catch (error) {
        console.error("❌ অ্যাপয়েন্টমেন্ট আপডেট করতে সমস্যা:", error.message);
        res.status(500).json({ error: "সার্ভার ত্রুটি" });
    }
});

// 📌 Patient Appointment ডিলিট করা
router.delete("/:id", authenticateAPIKey, async (req, res) => {
    const { id } = req.params;

    try {
        // ✅ চেক করা হচ্ছে অ্যাপয়েন্টমেন্ট আছে কিনা
        const existingAppointment = await prisma.patientAppointment.findUnique({
            where: { id },
        });

        if (!existingAppointment) {
            return res.status(404).json({ error: "Patient appointment খুঁজে পাওয়া যায়নি" });
        }

        await prisma.patientAppointment.delete({ where: { id } });

        res.json({ message: "Patient appointment সফলভাবে ডিলিট হয়েছে!" });
    } catch (error) {
        console.error("❌ অ্যাপয়েন্টমেন্ট ডিলিট করতে সমস্যা:", error.message);
        res.status(500).json({ error: "সার্ভার ত্রুটি" });
    }
});

module.exports = router;
