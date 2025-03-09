const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config();

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (mobileNumber) => {
  const otp = generateOTP();
  const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

  try {
    // Save OTP in the database
    await prisma.oTP.upsert({
      where: { mobile: mobileNumber },
      update: { otp, expiresAt: expiryTime, isUsed: false },
      create: { mobile: mobileNumber, otp, expiresAt: expiryTime },
    });

    console.log(`✅ OTP ${otp} stored for ${mobileNumber}`);

    // MiM SMS API Request Data
    const smsData = {
      UserName: process.env.MIM_SMS_USERNAME,
      Apikey: process.env.MIM_SMS_APIKEY,
      MobileNumber: mobileNumber,
      CampaignId: "null",
      SenderName: process.env.MIM_SMS_SENDER_NAME,
      TransactionType: "T",
      Message: `Your OTP is: ${otp}. Valid for 5 minutes.`,
    };

    console.log("📤 Sending OTP via MiM SMS API:", smsData);

    // Call MiM SMS API
    const response = await axios.post("https://api.mimsms.com/api/SmsSending/SMS", smsData, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("📥 MiM SMS API Response:", response.data);

    if (response.data.statusCode !== "200") {
      console.error("❌ MiM SMS API Error:", response.data);
      throw new Error(`MiM SMS Error: ${response.data.responseResult}`);
    }

    return { status: "success", message: "OTP sent successfully!", responseData: response.data };
  } catch (error) {
    console.error("❌ Error sending OTP:", error.response?.data || error.message);
    throw new Error("Failed to send OTP.");
  }
};

module.exports = { sendOTP };
