// import { Router } from "express";
// import { getEmployeeById } from "../controllers/employee.controller.js";

// import {
//   checkPunchInStatus,
//   getMonthlyAttendance,
//   verifyBranchPunch,
// } from "../controllers/punchingeoController.js";

const {   checkPunchInStatus,
  getMonthlyAttendance,
  verifyBranchPunch, } = require( "../../controller/controllers_sales/punchingeoController_sales.js");

const  getEmployeeById = require("../../controller/controllers_sales/employee.controller_sales.js");

const express = require('express');


//add...
const router = express.Router();

router.get("/getEmployeeById/:employee_code", getEmployeeById);
router.post("/punch-in", verifyBranchPunch);
router.get("/check-punch", checkPunchInStatus);
router.get("/monthly-attendance", getMonthlyAttendance);


module.exports =   router;
