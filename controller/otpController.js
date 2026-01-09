
const dotenv = require("dotenv");
const unirest = require("unirest");
const { v4: uuidv4 } = require("uuid");
const { admin, db } = require("../firebase");
const { Pool } = require("pg");
const jwt = require('jsonwebtoken');

dotenv.config();

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
});

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_SENDER_ID = process.env.FAST2SMS_SENDER_ID;

const otpStore = new Map();

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000);
}

exports.sendOtp = async (req, res) => {
 
  try {
    const { phoneNumber, name, companyName } = req.body;

    if (!phoneNumber || !name || !companyName) {
      return res.status(400).json({
        success: false,
        message: "Phone number, name & companyName are required",
      });
    }

    // ✅ FIRST: Check if phone number exists in PostgreSQL users table
    const userCheckQuery = `
      SELECT id, name, email, role, status 
      FROM users 
      WHERE personal_number = $1 OR official_number = $1
      LIMIT 1
    `;
    
    const userResult = await pool.query(userCheckQuery, [phoneNumber]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Phone number not registered in system",
        code: "USER_NOT_FOUND"
      });
    }

    const user = userResult.rows[0];
    
    // Check if user is active
    if (!user.status) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Contact administrator.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    const verificationId = uuidv4();
    const otp = generateOtp();

    console.log('API KEY:', FAST2SMS_API_KEY);
     const reqFast2Sms = unirest("POST", "https://www.fast2sms.com/dev/bulkV2");
    reqFast2Sms.headers({
      authorization: FAST2SMS_API_KEY,
      "Content-Type": "application/json",
    });

    reqFast2Sms.form({
      sender_id: FAST2SMS_SENDER_ID,
      message: "202600",
      variables_values: `${name}|${otp}`,
      route: "dlt",
      numbers: phoneNumber,
    });

  reqFast2Sms.end(async (response) => {
  try {
    if (response.error) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    const result = response.body;

    if (result.return === true) {

      otpStore.set(verificationId, {
        otp,
        phoneNumber,
        companyName,
        userId: user.id,
        timestamp: Date.now(),
      });

      // 🔐 Firestore write (safe now)
      try {
        await db
          .collection("clients_otp_usage")
          .doc(companyName)
          .set(
            {
              otpSent: admin.firestore.FieldValue.increment(1),
              lastOtpSentTime: new Date(),
            },
            { merge: true }
          );
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        // ❗ Do NOT crash app
      }

      return res.status(200).json({
        success: true,
        verificationId,
        message: "OTP sent successfully",
        userExists: true,
        name: user.name,
        role: user.role,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });

  } catch (err) {
    console.error("OTP callback error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

    //Simulate successful OTP sending for testing


  } catch (error) {
    console.log(error)
    console.error("Send OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//verify
exports. verifyOtp = async (req, res) => {
  try {
    console.log("Verify OTP request body:", req.body);

    const { verificationId, otp, companyName } = req.body;

    // 1️⃣ Validate input
    if (!verificationId || !otp || !companyName) {
      return res.status(400).json({
        success: false,
        message: "Verification ID, OTP & companyName required",
      });
    }


    // 2️⃣ Get OTP from memory
    const storedData = otpStore.get(verificationId);

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification ID",
      });
    }

    // 3️⃣ Check OTP expiry (5 mins)
    if (Date.now() - storedData.timestamp > 5 * 60 * 1000) {
      otpStore.delete(verificationId);
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    // 4️⃣ Validate OTP
    if (storedData.otp !== parseInt(otp, 10)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // OTP verified – delete it
    otpStore.delete(verificationId);

    // 5️⃣ Fetch user from PostgreSQL
    const userQuery = `
      SELECT 
        id,
        name,
        email,
        role,
        personal_number,
        official_number,
        branch_id,
        status,
        user_image,
        id_document,
        id_proof_images,
        salary,
        date_of_birth,
        join_date,
        created_at,
        updated_at
      FROM users 
      WHERE id = $1
    `;

    const userResult = await pool.query(userQuery, [storedData.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    // 6️⃣ Format dates
    const formattedUser = {
      ...user,
      date_of_birth: user.date_of_birth
        ? new Date(user.date_of_birth).toISOString().split("T")[0]
        : null,
      join_date: user.join_date
        ? new Date(user.join_date).toISOString()
        : null,
      created_at: new Date(user.created_at).toISOString(),
      updated_at: new Date(user.updated_at).toISOString(),
    };

    // 7️⃣ Firestore logging (NON-BLOCKING)
    try {
      await db
        .collection("clients_otp_usage")
        .doc(companyName)
        .set(
          {
            otpVerified: admin.firestore.FieldValue.increment(1),
            lastVerifiedTime: new Date(),
          },
          { merge: true }
        );
    } catch (firestoreError) {
      console.error("Firestore OTP verify log failed:", firestoreError);
      // ❗ Do not stop login
    }

    // 8️⃣ Create JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        branch_id: user.branch_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 9️⃣ Success response
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: formattedUser,
      session: {
        userId: user.id,
        phoneNumber: storedData.phoneNumber,
        companyName,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
