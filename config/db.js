const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: "108.181.202.123",         
  user: "mhnazmul_todoproject",         
  password: "KLS3+5Xs9K_9", 
  database: "mhnazmul_todoproject",     
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  } else {
    console.log("Connected to MySQL Database.");
  }
});

module.exports = db;
