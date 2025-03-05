const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

const router = express.Router();

// ✅ Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Azure API Config
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_REGION;

// ===============================
// ✅ Train Custom Voice API
// ===============================
router.post("/train-voice", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const endpoint = `https://${AZURE_REGION}.customvoice.api.speech.microsoft.com/api/texttospeech/v3.1-preview1/voices/add`;

    const formData = {
      name: "MyCustomVoice",
      description: "Custom trained voice",
      locale: "en-US",
      properties: {
        VoiceData: fs.readFileSync(req.file.path).toString("base64"),
      },
    };

    const response = await axios.post(endpoint, formData, {
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "application/json",
      },
    });

    res.json({ message: "✅ Voice training started successfully!", data: response.data });
  } catch (error) {
    console.error("❌ Error training voice:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to train voice" });
  }
});

// ===============================
// ✅ Generate Voice API
// ===============================
router.post("/generate-voice", async (req, res) => {
  try {
    const { text, voiceId = "MyCustomVoice" } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const endpoint = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `
      <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
        <voice name='${voiceId}'>${text}</voice>
      </speak>
    `;

    const response = await axios.post(endpoint, ssml, {
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
      },
      responseType: "arraybuffer",
    });

    const audioBuffer = Buffer.from(response.data, "binary");
    const audioFileName = `output_${Date.now()}.mp3`;
    const audioFilePath = path.join(__dirname, "../uploads", audioFileName);

    fs.writeFileSync(audioFilePath, audioBuffer);

    res.json({ message: "✅ Voice generated successfully!", audioUrl: `http://localhost:5000/uploads/${audioFileName}` });
  } catch (error) {
    console.error("❌ Error generating voice:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate voice" });
  }
});

// ✅ Serve Audio Files
router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

module.exports = router;
