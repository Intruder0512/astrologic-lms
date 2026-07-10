// Seeds the course catalogue to match ICAS's standard certification ladder
// (Praveena -> Visharada -> Acharya/Bhushan) across the astrology, vastu
// and nakshatra tracks. Fees are reasonable placeholders for a Vedic
// astrology certificate program in India - adjust in the admin panel or
// directly in Atlas once real pricing is confirmed.
require('dotenv').config();
const { connectDB, waitForConnection } = require('../config/db');
const Course = require('../models/Course');

const courses = [
  {
    title: 'Jyotish Praveena',
    courseCode: 'JP-101',
    category: 'astrology',
    level: 'beginner',
    shortDescription: 'Basic Astrology Course — the foundation of Vedic Jyotish.',
    description:
      'Jyotish Praveena is the entry point into classical Vedic astrology, covering the zodiac, planets, houses and the fundamentals of chart reading. Designed for complete beginners, it builds the vocabulary and method every later course depends on.',
    learningOutcomes: [
      'Read a basic birth chart (kundli) and identify planetary placements',
      'Understand the twelve houses and twelve zodiac signs',
      'Interpret planetary aspects and basic yogas',
    ],
    mode: 'hybrid',
    durationWeeks: 12,
    totalSessions: 24,
    sessionDurationMinutes: 90,
    fee: 8000,
    certificateOffered: true,
    language: 'both',
    status: 'published',
  },
  {
    title: 'Jyotish Visharada',
    courseCode: 'JV-201',
    category: 'astrology',
    level: 'intermediate',
    shortDescription: 'Advance Astrology Course — deeper chart analysis and prediction.',
    description:
      'Jyotish Visharada builds on Praveena with advanced dasha systems, divisional charts (vargas), and predictive techniques. Students learn to analyse charts for career, marriage, health and timing of events.',
    learningOutcomes: [
      'Apply Vimshottari Dasha and other timing systems',
      'Work with divisional charts (D9, D10 and others)',
      'Deliver structured predictions across life areas',
    ],
    eligibility: 'Completion of Jyotish Praveena or equivalent foundational knowledge.',
    mode: 'hybrid',
    durationWeeks: 16,
    totalSessions: 32,
    sessionDurationMinutes: 90,
    fee: 12000,
    certificateOffered: true,
    language: 'both',
    status: 'published',
  },
  {
    title: 'Jyotish Bhushan',
    courseCode: 'JB-301',
    category: 'astrology',
    level: 'advanced',
    shortDescription: 'Research Program — classical texts and independent chart research.',
    description:
      'Jyotish Bhushan is a research-oriented program for advanced students, working directly with classical texts (Brihat Parashara Hora Shastra, Phaladeepika and others) and conducting independent case studies under faculty supervision.',
    learningOutcomes: [
      'Read and interpret classical Sanskrit astrological texts',
      'Conduct independent chart research with faculty supervision',
      'Present case studies to chapter faculty for review',
    ],
    eligibility: 'Completion of Jyotish Visharada or equivalent.',
    mode: 'hybrid',
    durationWeeks: 20,
    totalSessions: 30,
    sessionDurationMinutes: 120,
    fee: 18000,
    certificateOffered: true,
    language: 'both',
    status: 'published',
  },
  {
    title: 'Nakshatra Praveena',
    courseCode: 'NP-101',
    category: 'nakshatra',
    level: 'beginner',
    shortDescription: 'Foundational course in Nakshatra (lunar mansion) astrology.',
    description:
      'Nakshatra Praveena introduces the 27 lunar mansions and their role in Vedic astrology — character analysis, compatibility (matching) and muhurta (auspicious timing) fundamentals.',
    learningOutcomes: [
      'Identify and interpret all 27 Nakshatras and their padas',
      'Apply Nakshatra-based compatibility matching',
      'Use basic muhurta principles for timing decisions',
    ],
    mode: 'hybrid',
    durationWeeks: 10,
    totalSessions: 20,
    sessionDurationMinutes: 90,
    fee: 7500,
    certificateOffered: true,
    language: 'both',
    status: 'published',
  },
  {
    title: 'Nakshatra Visharada',
    courseCode: 'NV-201',
    category: 'nakshatra',
    level: 'intermediate',
    shortDescription: 'Advanced Nakshatra analysis for prediction and remedial guidance.',
    description:
      'Nakshatra Visharada goes deeper into Nakshatra-based prediction techniques, sub-lord theory, and remedial recommendations drawn from classical sources.',
    learningOutcomes: [
      'Apply sub-lord (Nakshatra) theory to prediction',
      'Recommend classical remedial measures appropriately',
      'Integrate Nakshatra analysis with standard chart reading',
    ],
    eligibility: 'Completion of Nakshatra Praveena or equivalent.',
    mode: 'hybrid',
    durationWeeks: 12,
    totalSessions: 24,
    sessionDurationMinutes: 90,
    fee: 11000,
    certificateOffered: true,
    language: 'both',
    status: 'published',
  },
  {
    title: 'Vastu Praveena',
    courseCode: 'VP-101',
    category: 'vastu',
    level: 'beginner',
    shortDescription: 'Foundational Vastu Shastra for residential and commercial spaces.',
    description:
      'Vastu Praveena covers the principles of Vastu Shastra — directional energy, room placement, and practical corrections for homes and offices, grounded in classical texts.',
    learningOutcomes: [
      'Apply the eight-direction (ashtadikpalaka) framework to a floor plan',
      'Identify common Vastu doshas and their corrections',
      'Advise on room and entrance placement for new construction',
    ],
    mode: 'hybrid',
    durationWeeks: 10,
    totalSessions: 20,
    sessionDurationMinutes: 90,
    fee: 8500,
    certificateOffered: true,
    language: 'both',
    status: 'published',
  },
  {
    title: 'Vastu Acharya',
    courseCode: 'VA-301',
    category: 'vastu',
    level: 'advanced',
    shortDescription: 'Advanced Vastu consultancy practice and site analysis.',
    description:
      'Vastu Acharya prepares students for professional Vastu consultancy — full site analysis, remedial planning without structural demolition, and case documentation.',
    learningOutcomes: [
      'Conduct a full professional Vastu site survey',
      'Design non-structural remedial plans for existing buildings',
      'Document and present a Vastu consultation report',
    ],
    eligibility: 'Completion of Vastu Praveena or equivalent.',
    mode: 'hybrid',
    durationWeeks: 16,
    totalSessions: 28,
    sessionDurationMinutes: 120,
    fee: 15000,
    certificateOffered: true,
    language: 'both',
    status: 'published',
  },
];

const seed = async () => {
  connectDB();
  await waitForConnection();

  let created = 0;
  let skipped = 0;

  for (const courseData of courses) {
    const existing = await Course.findOne({ courseCode: courseData.courseCode });
    if (existing) {
      skipped++;
      continue;
    }
    await Course.create(courseData);
    created++;
  }

  console.log(`Course seed complete: ${created} created, ${skipped} already existed (skipped).`);
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
