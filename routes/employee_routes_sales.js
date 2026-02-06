// import { Router } from "express";
// import { getEmployeeById } from "../controllers/employee.controller.js";

// import {
//   checkPunchInStatus,
//   getMonthlyAttendance,
//   verifyBranchPunch,
// } from "../controllers/punchingeoController.js";

// const {   checkPunchInStatus,
//   getMonthlyAttendance,
//   verifyBranchPunch, } = require( "../../models/punchingeoController_sales");



// const {   checkPunchInStatus,
//   getMonthlyAttendance,
//   verifyBranchPunch, } = require( "../models/punchingeoController_sales");

const punchInController = require( "../models/punchingeoController_sales");

const  employeeController = require("../models/employee_controller_sales");

const express = require('express');


//add...
const router = express.Router();

router.get("/getEmployeeById/:employee_code", employeeController.getEmployeeById);
router.post("/punch-in", punchInController.verifyBranchPunch);
router.get("/check-punch", punchInController.checkPunchInStatus);
router.get("/monthly-attendance", punchInController.getMonthlyAttendance);



module.exports =   router;
