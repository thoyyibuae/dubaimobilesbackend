// import express from 'express';
const express = require('express');
const router = express.Router();

const getAttendance = require('../../controller/controllers_sales/attendanceController_sales');



// import { getAttendance } from '../controllers/attendanceController';



router.get('/attendance', getAttendance);




module.exports = router;

// export default router;
