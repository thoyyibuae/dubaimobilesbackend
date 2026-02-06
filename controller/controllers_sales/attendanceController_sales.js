// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc.js";



// import pool from "../db/connection.js";

const { pool } = require("../config/database");



const { dayjs } = require("dayjs");
const { utc } = require("dayjs/plugin/utc");



dayjs.extend(utc);

const MIN_WORK_HOURS = 9;
const FREE_LEAVE_DAYS = 5;
const DOUBLE_DEDUCTION_MULTIPLIER = 2;
const FIXED_MONTH_DAYS =30;

function calculateHours(inPunch, outPunch) {
  const inTime = dayjs.utc(inPunch.time);
  const outTime = dayjs.utc(outPunch.time);
  return outTime.diff(inTime, "hour", true);
}

function validatePunches(punches) {
  if (!punches || punches.length === 0) {
    return { status: "No Punch", hours: 0, isValid: false };
  }

  const hasInPunch = punches.some((p) => p.type === "IN");
  const hasOutPunch = punches.some((p) => p.type === "OUT");

  if (!hasInPunch || !hasOutPunch || punches.length < 2) {
    return { status: "Incomplete Punch", hours: 0, isValid: false };
  }

  const inPunch = punches.find((p) => p.type === "IN");
  const outPunch = [...punches].reverse().find((p) => p.type === "OUT");

  if (!inPunch || !outPunch) {
    return { status: "Incomplete Punch", hours: 0, isValid: false };
  }

  const hoursWorked = calculateHours(inPunch, outPunch);

  if (hoursWorked >= MIN_WORK_HOURS) {
    return { status: "Worked", hours: hoursWorked, isValid: true };
  }

  return { status: "Less than 9 hours", hours: hoursWorked, isValid: false };
}

function calculateDeduction(leaves, perDaySalary) {
  if (leaves <= FREE_LEAVE_DAYS) {
    return leaves * perDaySalary;
  }

  const regularDeduction = FREE_LEAVE_DAYS * perDaySalary;
  const additionalDeduction =
    (leaves - FREE_LEAVE_DAYS) * perDaySalary * DOUBLE_DEDUCTION_MULTIPLIER;

  return regularDeduction + additionalDeduction;
}


exports.getAttendance = async (req, res) => {
// export async function getAttendance(req, res) {
  try {
    const { employee_code, month, year, monthly_salary } = req.query;

    if (!employee_code || !month || !year || !monthly_salary) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: employee_code, month, year, monthly_salary",
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const salaryNum = parseFloat(monthly_salary);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid month. Must be between 1 and 12",
      });
    }

    if (isNaN(yearNum) || yearNum < 2000) {
      return res.status(400).json({
        success: false,
        message: "Invalid year",
      });
    }

    if (isNaN(salaryNum) || salaryNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid monthly_salary. Must be a positive number",
      });
    }

    const startOfMonth = dayjs(
      `${yearNum}-${monthNum.toString().padStart(2, "0")}-01`
    );
    const daysInMonth = FIXED_MONTH_DAYS;

    const result = await pool.query(
      `SELECT attendance_date, punches
       FROM emp_attendance
       WHERE employee_code = $1
       AND EXTRACT(MONTH FROM attendance_date) = $2
       AND EXTRACT(YEAR FROM attendance_date) = $3
       ORDER BY attendance_date`,
      [employee_code, monthNum, yearNum]
    );

    const attendanceRecords = result.rows;

    const attendanceDetails = [];
    let workedDays = 0;
    let leaves = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = dayjs(
        `${yearNum}-${monthNum.toString().padStart(2, "0")}-${day
          .toString()
          .padStart(2, "0")}`
      ).format("YYYY-MM-DD");

      const record = attendanceRecords.find(
        (a) => dayjs(a.attendance_date).format("YYYY-MM-DD") === dateStr
      );

      if (!record) {
        attendanceDetails.push({ date: dateStr, status: "No Punch", hours: 0 });
        leaves++;
        continue;
      }

      const validation = validatePunches(record.punches);

      attendanceDetails.push({
        date: dateStr,
        status: validation.status,
        hours: parseFloat(validation.hours.toFixed(2)),
      });

      if (validation.isValid) {
        workedDays++;
      } else {
        leaves++;
      }
    }

    const perDaySalary = salaryNum / daysInMonth;
    const deduction = calculateDeduction(leaves, perDaySalary);
    const finalSalary = salaryNum - deduction;

    res.json({
      success: true,
      data: {
        employee_code,
        month: monthNum,
        year: yearNum,
        summary: {
          total_days: daysInMonth,
          worked_days: workedDays,
          leave_days: leaves,
          monthly_salary: parseFloat(salaryNum.toFixed(2)),
          per_day_salary: parseFloat(perDaySalary.toFixed(2)),
          total_deduction: parseFloat(deduction.toFixed(2)),
          final_salary: parseFloat(finalSalary.toFixed(2)),
        },
        attendance_details: attendanceDetails,
      },
    });
  } catch (err) {
    console.error("Attendance API Error:", err);

    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { error: err.message }),
    });
  }
}
