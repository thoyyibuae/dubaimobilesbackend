// import pool from "../db/connection.js";


const pool = require('../config/database');
// const pool = require('../');


function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDateReadableIST(date) {
  try {
    const opts = {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    };
    const formatted = new Intl.DateTimeFormat("en-US", opts).format(date);
    return `${formatted} IST`;
  } catch (e) {
    const d = new Date(date.getTime() + 5.5 * 3600 * 1000);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[d.getUTCMonth()];
    const day = String(d.getUTCDate()).padStart(2, "0");
    const year = d.getUTCFullYear();
    let hour = d.getUTCHours();
    const minute = String(d.getUTCMinutes()).padStart(2, "0");
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${month} ${day}, ${year}, ${hour}:${minute} ${ampm} IST`;
  }
}

exports.verifyBranchPunch = async (req, res) => {

// export const verifyBranchPunch = async (req, res) => {
  try {
    const { empCode, currentLat, currentLong, branchName, punch_status } =
      req.body;

    if (
      !empCode ||
      !currentLat ||
      !currentLong ||
      !branchName ||
      !punch_status
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // const branch = await pool.query(
    //   `SELECT * FROM admin_app_branch WHERE LOWER(name)=LOWER($1) LIMIT 1`,
    //   [branchName]
    // );
   

  const branch = await pool.query(
      `SELECT * FROM branches WHERE LOWER(name)=LOWER($1) LIMIT 1`,
      [branchName]
    );

    
    if (branch.rows.length === 0) {
      return res.status(404).json({ message: "Branch not found" });
    }
    const b = branch.rows[0];

    const distance = calculateDistance(
      parseFloat(currentLat),
      parseFloat(currentLong),
      parseFloat(b.latitude),
      parseFloat(b.longitude)
    );

    if (distance > b.geofence_radius_m) {
      return res.status(200).json({
        status: "failed",
        message: "You are out of the geofence radius",
      });
    }

    const now = new Date();
    const punchData = {
      type: punch_status,
      time: now.toISOString(),
      readable_time: formatDateReadableIST(now),
      lat: parseFloat(currentLat),
      long: parseFloat(currentLong),
      distance,
    };

    const today = await pool.query(
      `SELECT * FROM emp_attendance
       WHERE employee_code=$1 AND attendance_date = CURRENT_DATE
       LIMIT 1`,
      [empCode]
    );

    if (today.rows.length === 0) {
      await pool.query(
        `INSERT INTO emp_attendance
         (employee_code, branch_name, attendance_date, punches)
         VALUES($1, $2, CURRENT_DATE, $3)`,
        [empCode, branchName, JSON.stringify([punchData])]
      );

      return res.json({
        status: "success",
        message: `Punch-${punch_status} saved (new record created)`,
      });
    }

    let existingPunches = today.rows[0].punches;
    if (!Array.isArray(existingPunches)) {
      existingPunches = [];
    }

    existingPunches = existingPunches.filter((p) => p.type !== punch_status);
    existingPunches.push(punchData);
    existingPunches.sort((a, b) => new Date(a.time) - new Date(b.time));

    await pool.query(
      `UPDATE emp_attendance
       SET punches = $1::jsonb
       WHERE employee_code=$2 AND attendance_date = CURRENT_DATE`,
      [JSON.stringify(existingPunches), empCode]
    );

    return res.json({
      status: "success",
      message: `Punch-${punch_status} added to today's record`,
    });
  } catch (err) {
    console.error("Punch error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.checkPunchInStatus = async (req, res) => {
// export const checkPunchInStatus = async (req, res) => {
  try {
    const { employee_code, date } = req.query;
    if (!employee_code || !date) {
      return res.status(400).json({
        success: false,
        message: "employee_code and date are required",
      });
    }

    const result = await pool.query(
      `SELECT * FROM emp_attendance
       WHERE employee_code=$1 AND attendance_date=$2
       LIMIT 1`,
      [employee_code, date]
    );

    if (result.rows.length === 0) {
      return res.json({
        punched_in: false,
        message: "No punch data found for this date",
      });
    }

    const record = result.rows[0];
    let punches = record.punches;

    if (!Array.isArray(punches)) punches = [];

    punches = punches.map((p) => {
      if (!p) return p;
      if (!p.readable_time && p.time) {
        try {
          const parsed = new Date(p.time);
          return { ...p, readable_time: formatDateReadableIST(parsed) };
        } catch (e) {
          return p;
        }
      }
      return p;
    });

    const punchedIn = punches.some((p) => p && p.type === "IN");

    return res.json({
      punched_in: punchedIn,
      attendance: {
        id: record.id,
        employee_code: record.employee_code,
        branch_name: record.branch_name,
        attendance_date: record.attendance_date,
        punches: punches,
        created_at: record.created_at,
      },
    });
  } catch (err) {
    console.error("Error checking punch status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMonthlyAttendance = async (req, res) => {
// export const getMonthlyAttendance = async (req, res) => {
  try {
    const { employee_code, month, year } = req.query;

    if (!employee_code || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "employee_code, month, and year are required",
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12",
      });
    }

    if (yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        message: "Year must be between 2000 and 2100",
      });
    }

    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    const endDate = new Date(yearNum, monthNum, 0).toISOString().split("T")[0];

    const result = await pool.query(
      `SELECT
         id,
         employee_code,
         branch_name,
         attendance_date,
         punches,
         created_at
       FROM emp_attendance
       WHERE employee_code = $1
         AND attendance_date >= $2
         AND attendance_date <= $3
       ORDER BY attendance_date DESC`,
      [employee_code, startDate, endDate]
    );

    const attendanceRecords = result.rows.map((record) => {
      let punches = record.punches;

      if (!Array.isArray(punches)) punches = [];

      punches = punches.map((punch) => {
        if (!punch) return punch;
        if (!punch.readable_time && punch.time) {
          try {
            const parsed = new Date(punch.time);
            return {
              ...punch,
              readable_time: formatDateReadableIST(parsed),
            };
          } catch (e) {
            return punch;
          }
        }
        return punch;
      });

      return {
        id: record.id,
        employee_code: record.employee_code,
        branch_name: record.branch_name,
        attendance_date: record.attendance_date,
        punches: punches,
        created_at: record.created_at,
        total_punches: punches.length,
        first_punch_in: punches.find((p) => p && p.type === "IN") || null,
        last_punch_out:
          punches.filter((p) => p && p.type === "OUT").pop() || null,
        work_duration: calculateWorkDuration(punches),
      };
    });

    return res.json({
      success: true,
      employee_code: employee_code,
      month: monthNum,
      year: yearNum,
      total_records: attendanceRecords.length,
      attendance: attendanceRecords,
    });
  } catch (err) {
    console.error("Error fetching monthly attendance:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

function calculateWorkDuration(punches) {
  if (!Array.isArray(punches) || punches.length === 0) {
    return "0 hours";
  }

  let totalMinutes = 0;
  let lastPunchIn = null;

  const sortedPunches = [...punches].sort(
    (a, b) => new Date(a.time) - new Date(b.time)
  );

  for (const punch of sortedPunches) {
    if (punch.type === "IN") {
      lastPunchIn = new Date(punch.time);
    } else if (punch.type === "OUT" && lastPunchIn) {
      const punchOut = new Date(punch.time);
      const diffMs = punchOut - lastPunchIn;
      totalMinutes += diffMs / (1000 * 60);
      lastPunchIn = null;
    }
  }

  if (lastPunchIn) {
    const now = new Date();
    const diffMs = now - lastPunchIn;
    totalMinutes += diffMs / (1000 * 60);
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);

  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} hours`;
  } else {
    return `${hours} hours ${minutes} minutes`;
  }
}
