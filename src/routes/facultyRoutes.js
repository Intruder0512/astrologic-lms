const express = require('express');
const { getPublishedFaculty } = require('../controllers/facultyController');

const router = express.Router();

router.get('/', getPublishedFaculty);

module.exports = router;
