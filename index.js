const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// const bodyParser = require("body-parser");

const doctorRoutes = require("./routes/doctor");
const departmentRoutes = require("./routes/department");
const patientRoutes = require("./routes/patient");
const appoinmentRoutes = require("./routes/admin/appointment");
const patientAppointmentRoutes = require("./routes/patient/appointment");
const reveiewRoute = require("./routes/reveiewRoute");
const authRoutes = require("./routes/authRoute");
const registerRoutes = require("./routes/register"); // Import the register routes
const verifyOtpRoutes = require("./routes/verifyOtp"); // Import the verify OTP routes
const loginRoutes = require("./routes/login"); // Import the verify OTP routes
const forgotRoutes = require("./routes/forgot-password"); // Import the verify OTP routes
const scheduleRoutes=require("./routes/schedule")
const homeRoutes=require("./routes/home")
const blogRoutes=require("./routes/blog")
const categoryRoutes=require("./routes/categories")
const pageRoutes=require("./routes/page")
const voiceRoutes=require("./routes/voiceclone")
const userRoute=require("./routes/userRoutes")


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use("/uploads", express.static("uploads"));
// ✅ Enable CORS for Next.js Frontend
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001"],// ✅ Adjust this for production
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
  // allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ✅ Middleware
app.use(express.json()); // Ensure JSON parsing
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

// ✅ Routes
app.use("/api/doctor", doctorRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/appointment", appoinmentRoutes);
app.use("/api/patient/appointment", patientAppointmentRoutes);
app.use("/api/reviews", reveiewRoute);
app.use("/api/auth", authRoutes);
app.use("/api/register", registerRoutes);  // Register the /register route
app.use("/api/verify-otp", verifyOtpRoutes); // Register the /verify-otp route
app.use("/api/login", loginRoutes);  // Register the /register route
app.use("/api/forgot-password", forgotRoutes); // Register the /verify-otp route
app.use("/api/schedule", scheduleRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/page", pageRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/user", userRoute);
// ✅ Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
