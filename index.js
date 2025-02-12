const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// const bodyParser = require("body-parser");

const doctorRoutes = require("./routes/doctor");
const patientRoutes = require("./routes/patient");
const appoinmentRoutes = require("./routes/appointment");
const authRoutes = require("./routes/authRoutes");
const registerRoutes = require("./routes/register"); // Import the register routes
const verifyOtpRoutes = require("./routes/verifyOtp"); // Import the verify OTP routes



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Enable CORS for Next.js Frontend
const corsOptions = {
  origin: "http://localhost:3000", // ✅ Adjust this for production
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
};

app.use(cors(corsOptions));

// ✅ Middleware
app.use(express.json()); // Ensure JSON parsing
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

// ✅ Routes
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/appointment", appoinmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/register", registerRoutes);  // Register the /register route
app.use("/api/verify-otp", verifyOtpRoutes); // Register the /verify-otp route
// ✅ Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
