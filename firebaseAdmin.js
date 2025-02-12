const admin = require("firebase-admin");
const serviceAccount = require("./muktihostpital-firebase-adminsdk-fbsvc-550e4a1d0c.json"); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
