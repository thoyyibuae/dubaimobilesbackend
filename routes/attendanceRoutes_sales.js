// import express from 'express';
const express = require('express');
const router = express.Router();

// const getAttendance = require('../../controller/attendanceController_sales');

// const getAttendance = require('../models/attendanceController_sales');

// import { getAttendance } from '../controllers/attendanceController';

const attendanceController = require('../models/attendanceController_sales');


// router.get('/attendance', getAttendance);

router.get("/attendance", attendanceController.getAttendance);



module.exports = router;

// export default router;
