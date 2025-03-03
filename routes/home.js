const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// GET /homepage - একক Homepage (id = 1) সহ সব সেকশন রিটার্ন করা
router.get('/', async (req, res) => {
  try {
    const homepage = await prisma.homepage.findUnique({
      where: { id: 1 },
      include: {
        heroSection: true,
        featuresSection: true,
        aboutSection: true,
        appointmentSection: true,
        whyChooseUsSection: true,
        downloadAppSection: true,
        appointmentProcess: true,
      },
    });

    if (!homepage) {
      return res.status(404).json({ message: 'Homepage not found' });
    }
    res.json(homepage);
  } catch (error) {
    console.error('Error fetching homepage:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /homepage
 * - হোমপেজ রেকর্ড তৈরি করবে, যদি পূর্বে না থাকে (id = 1)
 * - Multer এর মাধ্যমে ফাইল আপলোড হবে।
 * - এখানে, সব সেকশনের টেক্সট ডাটা ইংরেজি (en) কী এর অধীনে সংরক্ষিত হবে।
 */
router.post(
  '/',
  upload.fields([
    { name: 'heroBackgroundImage', maxCount: 1 },
    { name: 'aboutImages', maxCount: 4 },
    { name: 'appointmentImage', maxCount: 1 },
    { name: 'downloadAppImage', maxCount: 1 },
    { name: 'whyChooseUsImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const existingHomepage = await prisma.homepage.findUnique({ where: { id: 1 } });
      if (existingHomepage) {
        return res.status(400).json({ message: 'Homepage already exists. Use PUT to update.' });
      }

      // Parse JSON data from request body (expecting plain data)
      const heroSectionData = req.body.heroSection ? JSON.parse(req.body.heroSection) : {};
      const featuresSectionData = req.body.featuresSection ? JSON.parse(req.body.featuresSection) : {};
      const aboutSectionData = req.body.aboutSection ? JSON.parse(req.body.aboutSection) : {};
      const appointmentSectionData = req.body.appointmentSection ? JSON.parse(req.body.appointmentSection) : {};
      const whyChooseUsSectionData = req.body.whyChooseUsSection ? JSON.parse(req.body.whyChooseUsSection) : {};
      const downloadAppSectionData = req.body.downloadAppSection ? JSON.parse(req.body.downloadAppSection) : {};
      const appointmentProcessData = req.body.appointmentProcess ? JSON.parse(req.body.appointmentProcess) : {};

      // Attach file paths
      if (req.files['heroBackgroundImage']) {
        heroSectionData.backgroundImage = req.files['heroBackgroundImage'][0].path;
      }
      if (req.files['aboutImages']) {
        aboutSectionData.images = req.files['aboutImages'].map(file => file.path);
      }
      if (req.files['appointmentImage']) {
        appointmentSectionData.image = req.files['appointmentImage'][0].path;
      }
      if (req.files['downloadAppImage']) {
        downloadAppSectionData.image = req.files['downloadAppImage'][0].path;
      }
      if (req.files['whyChooseUsImage']) {
        whyChooseUsSectionData.image = req.files['whyChooseUsImage'][0].path;
      }

      // Wrap each section's data under "en" key (default language)
      const newHomepage = await prisma.homepage.create({
        data: {
          id: 1,
          heroSection: Object.keys(heroSectionData).length
            ? { create: { translations: { en: heroSectionData } } }
            : undefined,
          featuresSection: Object.keys(featuresSectionData).length
            ? { create: { translations: { en: featuresSectionData } } }
            : undefined,
          aboutSection: Object.keys(aboutSectionData).length
            ? { create: { translations: { en: aboutSectionData } } }
            : undefined,
          appointmentSection: Object.keys(appointmentSectionData).length
            ? { create: { translations: { en: appointmentSectionData } } }
            : undefined,
          whyChooseUsSection: Object.keys(whyChooseUsSectionData).length
            ? { create: { translations: { en: whyChooseUsSectionData } } }
            : undefined,
          downloadAppSection: Object.keys(downloadAppSectionData).length
            ? { create: { translations: { en: downloadAppSectionData } } }
            : undefined,
          appointmentProcess: Object.keys(appointmentProcessData).length
            ? { create: { translations: { en: appointmentProcessData } } }
            : undefined,
        },
        include: {
          heroSection: true,
          featuresSection: true,
          aboutSection: true,
          appointmentSection: true,
          whyChooseUsSection: true,
          downloadAppSection: true,
          appointmentProcess: true,
        },
      });
      res.status(201).json(newHomepage);
    } catch (error) {
      console.error('Error creating homepage:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * PUT /homepage/:section
 * - নির্দিষ্ট সেকশনের অনুবাদ আপডেট করবে।
 * - Request Body: { language: "en" or "bn", translations: { key: value, ... } }
 * - ইমেজ সম্পর্কিত key (backgroundImage, image, images) বাদ দেওয়া হবে।
 */
router.put('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const { language, translations } = req.body;

    if (!language || !translations) {
      return res.status(400).json({ message: 'Missing language or translations data' });
    }

    const allowedSections = [
      'heroSection',
      'featuresSection',
      'aboutSection',
      'appointmentSection',
      'whyChooseUsSection',
      'downloadAppSection',
      'appointmentProcess'
    ];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ message: 'Invalid section name' });
    }

    // Get existing homepage with the specific section
    const homepage = await prisma.homepage.findUnique({
      where: { id: 1 },
      include: { [section]: true }
    });

    if (!homepage || !homepage[section]) {
      return res.status(404).json({ message: `${section} data not found` });
    }

    // Remove image keys if present
    const newTranslations = { ...translations };
    delete newTranslations.backgroundImage;
    delete newTranslations.image;
    delete newTranslations.images;

    // Merge with current translations for the given language
    const currentTranslations = homepage[section].translations || {};
    currentTranslations[language] = {
      ...currentTranslations[language],
      ...newTranslations
    };

    const updateData = {};
    updateData[section] = { update: { translations: currentTranslations } };

    const updatedHomepage = await prisma.homepage.update({
      where: { id: 1 },
      data: updateData,
      include: { [section]: true }
    });

    res.json(updatedHomepage[section]);
  } catch (error) {
    console.error('Error updating homepage section:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
