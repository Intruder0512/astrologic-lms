// Seeds the course catalogue for ICAS (Purushottamanand Ashram).
// IMPORTANT: per the official ICAS chapter registry (icasindia.org/ICAS/Centres.html),
// this chapter is registered to teach ONLY Jyotish Praveena and Jyotish Visharada,
// both Online and Direct Classroom. Do not add Vastu, Nakshatra, Hasta Rekha, Nadi,
// or Jyotish Bhushan courses here without first confirming the chapter has been
// registered to teach them - those belong to other chapters (e.g. Lucknow-II).
require('dotenv').config();
const { connectDB, waitForConnection } = require('../config/db');
const Course = require('../models/Course');

const courses = [
  {
    title: 'Jyotish Praveena',
    courseCode: 'LKO3-JP-101',
    category: 'astrology',
    level: 'beginner',
    shortDescription: 'Foundational certificate course in Vedic astrology — the entry point into classical Jyotish.',
    description:
      'Jyotish Praveena is the entry point into classical Vedic astrology, covering the zodiac, planets, houses and the fundamentals of chart (kundli) reading. Taught under the Indian Council of Astrological Sciences syllabus, it builds the vocabulary and method every later course depends on. Available online and in direct classroom sessions at our Purushottamanand Ashram centre.',
    learningOutcomes: [
      'Read a basic birth chart (kundli) and identify planetary placements',
      'Understand the twelve houses (bhava) and twelve zodiac signs (rashi)',
      'Interpret basic planetary aspects (drishti) and common yogas',
      'Apply foundational principles taught in classical Jyotish texts',
    ],
    mode: 'hybrid',
    durationWeeks: 12,
    totalSessions: 24,
    sessionDurationMinutes: 90,
    fee: 8000,
    certificateOffered: true,
    certificateRules: 'Certified by the Indian Council of Astrological Sciences (Regd.), Chennai, on successful completion of coursework and examination.',
    language: 'both',
    status: 'published',
  },
  {
    title: 'Jyotish Visharada',
    courseCode: 'LKO3-JV-201',
    category: 'astrology',
    level: 'intermediate',
    shortDescription: 'Advanced certificate course — deeper chart analysis, dasha systems and prediction.',
    description:
      'Jyotish Visharada builds on Jyotish Praveena with advanced dasha (planetary period) systems, divisional charts (varga), and predictive techniques. Students learn to analyse charts for career, marriage, health and the timing of life events. Available online and in direct classroom sessions at our Purushottamanand Ashram centre.',
    learningOutcomes: [
      'Apply Vimshottari Dasha and other timing systems to a chart',
      'Work with divisional charts (varga) for deeper analysis',
      'Deliver structured predictions across career, marriage and health',
      'Read and apply principles from classical astrological texts',
    ],
    eligibility: 'Completion of Jyotish Praveena (ICAS) or equivalent foundational knowledge, subject to faculty assessment.',
    mode: 'hybrid',
    durationWeeks: 16,
    totalSessions: 32,
    sessionDurationMinutes: 90,
    fee: 12000,
    certificateOffered: true,
    certificateRules: 'Certified by the Indian Council of Astrological Sciences (Regd.), Chennai, on successful completion of coursework and examination.',
    language: 'both',
    status: 'published',
  },
];

const seed = async () => {
  connectDB();
  await waitForConnection();

  let created = 0;
  let updated = 0;

  for (const courseData of courses) {
    const existing = await Course.findOne({ courseCode: courseData.courseCode });
    if (existing) {
      await Course.updateOne({ courseCode: courseData.courseCode }, courseData);
      updated++;
      continue;
    }
    await Course.create(courseData);
    created++;
  }

  console.log(`Course seed complete: ${created} created, ${updated} updated to match latest content.`);
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
