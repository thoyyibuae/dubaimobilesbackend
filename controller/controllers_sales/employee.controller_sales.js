// import pool from "../db/connection.js";

const pool = require("../config/database");



exports.getEmployeeById = async (req, res) => {
// export const getEmployeeById = async (req, res) => {
  try {
    const { employee_code } = req.params;

    const query = `
      SELECT * FROM employees
      WHERE employee_code = $1
      LIMIT 1;
    `;

  
    const result = await pool.query(query, [employee_code]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


