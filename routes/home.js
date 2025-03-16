// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
// const fs = require('fs');
// const path = require('path');

// // আপলোড ডিরেক্টরি নিশ্চিত করা
// const uploadDir = 'uploads/';
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // মাল্টার কনফিগারেশন
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, 'uploads/'),
//   filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
// });
// const upload = multer({ storage });

// // হেল্পার ফাংশন: JSON ডেটা পার্স করার জন্য
// const safeParse = (fieldName, value) => {
//   try {
//     if (!value) return {};
    
//     if (Array.isArray(value)) {
//       return value.map(item => typeof item === 'string' ? JSON.parse(item) : item);
//     } else if (typeof value === 'string') {
//       return JSON.parse(value);
//     }
//     return value;
//   } catch (err) {
//     console.error(`Error parsing ${fieldName}:`, value, err);
//     throw new Error(`Invalid JSON in ${fieldName} field`);
//   }
// };

// // হেল্পার ফাংশন: অ্যারে কনভার্শন
// const ensureArray = (data, nestedField = null) => {
//   if (!data) return [];
  
//   if (nestedField && data[nestedField] && Array.isArray(data[nestedField])) {
//     return data[nestedField];
//   } else if (nestedField && data[nestedField]) {
//     return [data[nestedField]];
//   } else if (!Array.isArray(data)) {
//     return [data];
//   }
  
//   return data;
// };

// // হেল্পার ফাংশন: ফাইল আপলোড প্রসেস করা
// const processUploadedFiles = (files, prefix, items, itemTemplate = {}) => {
//   const targetFiles = files.filter(file => file.fieldname.startsWith(prefix));
  
//   targetFiles.forEach(file => {
//     const match = file.fieldname.match(new RegExp(`${prefix}(\\d+)`));
//     if (match) {
//       const index = parseInt(match[1]);
//       while (items.length <= index) {
//         items.push({...itemTemplate});
//       }
//       items[index].icon = file.path;
//     }
//   });
  
//   return items;
// };

// // হেল্পার ফাংশন: সিঙ্গেল ইমেজ প্রসেস করা
// const processImage = (files, fieldName) => {
//   const file = files.find(file => file.fieldname === fieldName);
//   return file ? file.path : "";
// };

// // হেল্পার ফাংশন: সেকশন আপডেট করা
// const updateSection = async (sectionName, language, translationData, mergeArrays = false) => {
//   const homepage = await prisma.homepage.findUnique({
//     where: { id: 1 },
//     include: { [sectionName]: true }
//   });
  
//   if (!homepage || !homepage[sectionName]) {
//     throw new Error(`${sectionName} not found`);
//   }
  
//   const currentTranslations = homepage[sectionName].translations || {};
  
//   let updatedTranslations;
//   if (Array.isArray(translationData) && !mergeArrays) {
//     updatedTranslations = {
//       ...currentTranslations,
//       [language]: translationData
//     };
//   } else {
//     const currentData = currentTranslations[language] || {};
//     updatedTranslations = {
//       ...currentTranslations,
//       [language]: {
//         ...currentData,
//         ...translationData
//       }
//     };
//   }
  
//   return prisma.homepage.update({
//     where: { id: 1 },
//     data: {
//       [sectionName]: {
//         update: {
//           translations: updatedTranslations
//         }
//       }
//     },
//     include: { [sectionName]: true }
//   });
// };

// /**
//  * GET / - হোমপেজের সমস্ত সেকশন পাওয়া
//  */
// router.get('/', async (req, res) => {
//   try {
//     const homepage = await prisma.homepage.findUnique({
//       where: { id: 1 },
//       include: {
//         heroSection: true,
//         featuresSection: true,
//         aboutSection: true,
//         appointmentSection: true,
//         whyChooseUsSection: true,
//         downloadAppSection: true,
//         appointmentProcess: true
//       },
//     });

//     if (!homepage) {
//       return res.status(404).json({ message: 'Homepage not found' });
//     }
//     res.json(homepage);
//   } catch (error) {
//     console.error('Error fetching homepage:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// /**
//  * POST / - নতুন হোমপেজ তৈরি করা
//  */
// router.post('/', upload.any(), async (req, res) => {
//   try {
//     console.log('POST /home request received');
//     const existingHomepage = await prisma.homepage.findUnique({ where: { id: 1 } });
//     if (existingHomepage) {
//       return res.status(400).json({ message: 'Homepage already exists. Use PUT to update.' });
//     }

//     // প্রতিটি সেকশনের ডেটা পার্স করা
//     const heroSectionData = safeParse('heroSection', req.body.heroSection);
//     let featuresSectionData = safeParse('featuresSection', req.body.featuresSection);
//     const aboutSectionData = safeParse('aboutSection', req.body.aboutSection);
//     const appointmentSectionData = safeParse('appointmentSection', req.body.appointmentSection);
//     const whyChooseUsSectionData = safeParse('whyChooseUsSection', req.body.whyChooseUsSection);
//     const downloadAppSectionData = safeParse('downloadAppSection', req.body.downloadAppSection);
//     const appointmentProcessData = safeParse('appointmentProcess', req.body.appointmentProcess);

//     // ফিচার সেকশন ডেটা প্রসেস করা
//     featuresSectionData = ensureArray(featuresSectionData, 'features');
//     featuresSectionData = featuresSectionData.map((feature, index) => {
//       const featureIconFile = req.files.find(file => file.fieldname === `featureIcon_${index}`);
//       return {
//         ...feature,
//         icon: featureIconFile ? featureIconFile.path : (feature.icon || "")
//       };
//     });

//     // সার্ভিস আইকন প্রসেস করা (about সেকশন)
//     let services = ensureArray(aboutSectionData.services || {});
//     services = processUploadedFiles(
//       req.files, 
//       'serviceIcon_', 
//       services, 
//       { serviceTitle: "", serviceIcon: "" }
//     );
//     aboutSectionData.services = services;

//     // Why Choose Us সার্ভিস আইকন প্রসেস করা
//     let whyChooseServices = ensureArray(whyChooseUsSectionData.services || {});
//     whyChooseServices = processUploadedFiles(
//       req.files, 
//       'whyChooseServiceIcon_', 
//       whyChooseServices, 
//       { serviceTitle: "", serviceDescription: "", serviceIcon: "" }
//     );
//     whyChooseUsSectionData.services = whyChooseServices;

//     // Appointment Process আইকন প্রসেস করা
//     let appointmentProcesses = ensureArray(appointmentProcessData);
//     appointmentProcesses = processUploadedFiles(
//       req.files, 
//       'appointmentProcessIcon_', 
//       appointmentProcesses, 
//       { title: "", icon: "" }
//     );

//     // হিরো ব্যাকগ্রাউন্ড ইমেজ আটাচ করা
//     heroSectionData.backgroundImage = processImage(req.files, 'heroBackgroundImage');

//     // অ্যাবাউট সেকশন ইমেজ হ্যান্ডেল করা
//     const aboutImages = req.files.filter(file => file.fieldname === 'aboutImages');
//     if (aboutImages.length > 0) {
//       aboutSectionData.images = aboutImages.map(file => file.path);
//     }

//     // অন্যান্য ইমেজ হ্যান্ডেল করা
//     appointmentSectionData.image = processImage(req.files, 'appointmentImage');
//     whyChooseUsSectionData.image = processImage(req.files, 'whyChooseUsImage');
//     downloadAppSectionData.image = processImage(req.files, 'downloadAppImage');

//     // নতুন হোমপেজ রেকর্ড ক্রিয়েট করা
//     const newHomepage = await prisma.homepage.create({
//       data: {
//         id: 1,
//         heroSection: { 
//           create: { translations: { en: heroSectionData } } 
//         },
//         featuresSection: { 
//           create: { translations: { en: featuresSectionData } } 
//         },
//         aboutSection: { 
//           create: { translations: { en: aboutSectionData } } 
//         },
//         appointmentSection: { 
//           create: { translations: { en: appointmentSectionData } } 
//         },
//         whyChooseUsSection: { 
//           create: { translations: { en: whyChooseUsSectionData } } 
//         },
//         downloadAppSection: { 
//           create: { translations: { en: downloadAppSectionData } } 
//         },
//         appointmentProcess: { 
//           create: { translations: { en: appointmentProcesses } } 
//         }
//       },
//       include: {
//         heroSection: true,
//         featuresSection: true,
//         aboutSection: true,
//         appointmentSection: true,
//         whyChooseUsSection: true,
//         downloadAppSection: true,
//         appointmentProcess: true
//       },
//     });

//     res.status(201).json(newHomepage);
//   } catch (error) {
//     console.error('Error creating homepage:', error);
//     res.status(500).json({ error: 'Internal Server Error', details: error.message });
//   }
// });

// /**
//  * PUT /:section - নির্দিষ্ট সেকশন আপডেট করা
//  */
// router.put('/:section', async (req, res) => {
//   try {
//     const { section } = req.params;
//     const { language, translations } = req.body;

//     if (!language || translations === undefined) {
//       return res.status(400).json({ message: 'Missing language or translations data' });
//     }

//     const allowedSections = [
//       'heroSection', 'featuresSection', 'aboutSection', 
//       'appointmentSection', 'whyChooseUsSection', 
//       'downloadAppSection', 'appointmentProcess'
//     ];

//     if (!allowedSections.includes(section)) {
//       return res.status(400).json({ message: 'Invalid section name' });
//     }

//     const mergeArrays = !(['appointmentProcess', 'featuresSection'].includes(section));
//     const updatedHomepage = await updateSection(section, language, translations, mergeArrays);

//     return res.json({
//       message: `${section} updated successfully`,
//       data: updatedHomepage[section]
//     });
//   } catch (error) {
//     console.error('Error updating homepage section:', error);
//     res.status(500).json({ 
//       error: 'Internal Server Error', 
//       details: error.message
//     });
//   }
// });

// // ইমেজ আপলোড এন্ডপয়েন্ট গ্রুপ
// // এই ফাংশন সব আপলোড এন্ডপয়েন্ট তৈরি করবে
// const createImageUploadEndpoint = (route, fieldName, sectionName, imagePath = 'image') => {
//   router.post(route, upload[fieldName.endsWith('Images') ? 'array' : 'single'](fieldName, 4), async (req, res) => {
//     try {
//       const files = req.files || (req.file ? [req.file] : []);
      
//       if (files.length === 0) {
//         return res.status(400).json({ message: `No ${fieldName} uploaded` });
//       }
      
//       const homepage = await prisma.homepage.findUnique({
//         where: { id: 1 },
//         include: { [sectionName]: true }
//       });
      
//       if (!homepage || !homepage[sectionName]) {
//         return res.status(404).json({ message: `${sectionName} not found` });
//       }
      
//       const currentTranslations = homepage[sectionName].translations || {};
//       const currentData = currentTranslations.en || {};
      
//       // আপডেট ডেটা তৈরি
//       const updateData = {
//         ...currentData
//       };
      
//       if (fieldName.endsWith('Images')) {
//         updateData[imagePath] = files.map(file => file.path);
//       } else {
//         updateData[imagePath] = files[0].path;
//       }
      
//       await updateSection(sectionName, 'en', updateData);
      
//       res.status(200).json({ 
//         message: `${fieldName} updated successfully`,
//         imagePath: fieldName.endsWith('Images') ? files.map(file => file.path) : files[0].path
//       });
      
//     } catch (error) {
//       console.error(`Error updating ${fieldName}:`, error);
//       res.status(500).json({ 
//         error: 'Internal Server Error', 
//         details: error.message 
//       });
//     }
//   });
// };

// // সমস্ত ইমেজ আপলোড এন্ডপয়েন্ট তৈরি
// createImageUploadEndpoint('/uploadHeroImage', 'heroBackgroundImage', 'heroSection', 'backgroundImage');
// createImageUploadEndpoint('/uploadAppointmentImage', 'appointmentImage', 'appointmentSection');
// createImageUploadEndpoint('/uploadWhyChooseImage', 'whyChooseUsImage', 'whyChooseUsSection');
// createImageUploadEndpoint('/uploadDownloadAppImage', 'downloadAppImage', 'downloadAppSection');
// createImageUploadEndpoint('/uploadAboutImages', 'aboutImages', 'aboutSection', 'images');

// // আইকন আপলোড এন্ডপয়েন্ট গ্রুপ
// const createIconsUploadEndpoint = (route, prefix, sectionName, itemsField = null, itemTemplate = {}) => {
//   router.post(route, upload.any(), async (req, res) => {
//     try {
//       console.log(`${route} request received`);
      
//       const homepage = await prisma.homepage.findUnique({
//         where: { id: 1 },
//         include: { [sectionName]: true }
//       });
      
//       if (!homepage || !homepage[sectionName]) {
//         return res.status(404).json({ message: `${sectionName} not found` });
//       }
      
//       const icons = req.files.filter(file => file.fieldname.startsWith(prefix));
//       if (icons.length === 0) {
//         return res.status(400).json({ message: 'No icons uploaded' });
//       }
      
//       const currentTranslations = homepage[sectionName].translations || {};
//       let currentItems;
      
//       if (itemsField) {
//         const currentData = currentTranslations.en || {};
//         currentItems = ensureArray(currentData[itemsField] || {});
//       } else {
//         currentItems = ensureArray(currentTranslations.en || {});
//       }
      
//       // আইকন প্রসেস ও আপডেট করা
//       currentItems = processUploadedFiles(req.files, prefix, currentItems, itemTemplate);
      
//       // সেকশন আপডেট
//       let updateData;
//       if (itemsField) {
//         const currentData = currentTranslations.en || {};
//         updateData = {
//           ...currentData,
//           [itemsField]: currentItems
//         };
//       } else {
//         updateData = currentItems;
//       }
      
//       await updateSection(sectionName, 'en', updateData, !itemsField);
      
//       res.status(200).json({ 
//         message: `Icons updated successfully`,
//         items: currentItems
//       });
      
//     } catch (error) {
//       console.error(`Error updating icons:`, error);
//       res.status(500).json({ 
//         error: 'Internal Server Error', 
//         details: error.message
//       });
//     }
//   });
// };

// // সমস্ত আইকন আপলোড এন্ডপয়েন্ট তৈরি
// createIconsUploadEndpoint(
//   '/uploadFeatureIcons', 
//   'featureIcon_', 
//   'featuresSection', 
//   null, 
//   { subtitle: "", title: "", icon: "" }
// );

// createIconsUploadEndpoint(
//   '/uploadServiceIcons', 
//   'serviceIcon_', 
//   'aboutSection', 
//   'services', 
//   { serviceTitle: "", serviceIcon: "" }
// );

// createIconsUploadEndpoint(
//   '/uploadWhyChooseServiceIcons', 
//   'whyChooseServiceIcon_', 
//   'whyChooseUsSection', 
//   'services', 
//   { serviceTitle: "", serviceDescription: "", serviceIcon: "" }
// );

// createIconsUploadEndpoint(
//   '/uploadAppointmentProcessIcons', 
//   'appointmentProcessIcon_', 
//   'appointmentProcess', 
//   null, 
//   { title: "", icon: "" }
// );
  
// module.exports = router;
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// আপলোড ডিরেক্টরি নিশ্চিত করা
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// মাল্টার কনফিগারেশন
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// হেল্পার ফাংশন: JSON ডেটা পার্স করার জন্য
const safeParse = (fieldName, value) => {
  try {
    if (!value) return {};
    
    if (Array.isArray(value)) {
      return value.map(item => typeof item === 'string' ? JSON.parse(item) : item);
    } else if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  } catch (err) {
    console.error(`Error parsing ${fieldName}:`, value, err);
    throw new Error(`Invalid JSON in ${fieldName} field`);
  }
};

// হেল্পার ফাংশন: অ্যারে কনভার্শন
const ensureArray = (data, nestedField = null) => {
  if (!data) return [];
  
  if (nestedField && data[nestedField] && Array.isArray(data[nestedField])) {
    return data[nestedField];
  } else if (nestedField && data[nestedField]) {
    return [data[nestedField]];
  } else if (!Array.isArray(data)) {
    return [data];
  }
  
  return data;
};

// হেল্পার ফাংশন: ফাইল আপলোড প্রসেস করা
const processUploadedFiles = (files, prefix, items, itemTemplate = {}) => {
  const targetFiles = files.filter(file => file.fieldname.startsWith(prefix));
  
  targetFiles.forEach(file => {
    const match = file.fieldname.match(new RegExp(`${prefix}(\\d+)`));
    if (match) {
      const index = parseInt(match[1]);
      while (items.length <= index) {
        items.push({...itemTemplate});
      }
      items[index].icon = file.path;
    }
  });
  
  return items;
};

// হেল্পার ফাংশন: সিঙ্গেল ইমেজ প্রসেস করা
const processImage = (files, fieldName) => {
  const file = files.find(file => file.fieldname === fieldName);
  return file ? file.path : "";
};

// হেল্পার ফাংশন: সেকশন আপডেট করা
const updateSection = async (sectionName, language, translationData, mergeArrays = false) => {
  const homepage = await prisma.homepage.findUnique({
    where: { id: 1 },
    include: { [sectionName]: true }
  });
  
  if (!homepage || !homepage[sectionName]) {
    throw new Error(`${sectionName} not found`);
  }
  
  const currentTranslations = homepage[sectionName].translations || {};
  
  let updatedTranslations;
  if (Array.isArray(translationData) && !mergeArrays) {
    updatedTranslations = {
      ...currentTranslations,
      [language]: translationData
    };
  } else {
    const currentData = currentTranslations[language] || {};
    updatedTranslations = {
      ...currentTranslations,
      [language]: {
        ...currentData,
        ...translationData
      }
    };
  }
  
  return prisma.homepage.update({
    where: { id: 1 },
    data: {
      [sectionName]: {
        update: {
          translations: updatedTranslations
        }
      }
    },
    include: { [sectionName]: true }
  });
};

/**
 * GET / - হোমপেজের সমস্ত সেকশন পাওয়া
 */
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
        appointmentProcess: true
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
 * POST / - নতুন হোমপেজ তৈরি করা
 */
router.post('/', upload.any(), async (req, res) => {
  try {
    console.log('POST /home request received');
    const existingHomepage = await prisma.homepage.findUnique({ where: { id: 1 } });
    if (existingHomepage) {
      return res.status(400).json({ message: 'Homepage already exists. Use PUT to update.' });
    }

    // সিলেক্টেড ল্যাঙ্গুয়েজ আইডি গ্রহণ
    const language = req.query.language || req.body.language || 'en';
    console.log(`Creating homepage with language: ${language}`);

    // প্রতিটি সেকশনের ডেটা পার্স করা
    const heroSectionData = safeParse('heroSection', req.body.heroSection);
    let featuresSectionData = safeParse('featuresSection', req.body.featuresSection);
    const aboutSectionData = safeParse('aboutSection', req.body.aboutSection);
    const appointmentSectionData = safeParse('appointmentSection', req.body.appointmentSection);
    const whyChooseUsSectionData = safeParse('whyChooseUsSection', req.body.whyChooseUsSection);
    const downloadAppSectionData = safeParse('downloadAppSection', req.body.downloadAppSection);
    const appointmentProcessData = safeParse('appointmentProcess', req.body.appointmentProcess);

    // ফিচার সেকশন ডেটা প্রসেস করা
    featuresSectionData = ensureArray(featuresSectionData, 'features');
    featuresSectionData = featuresSectionData.map((feature, index) => {
      const featureIconFile = req.files.find(file => file.fieldname === `featureIcon_${index}`);
      return {
        ...feature,
        icon: featureIconFile ? featureIconFile.path : (feature.icon || "")
      };
    });

    // সার্ভিস আইকন প্রসেস করা (about সেকশন)
    let services = ensureArray(aboutSectionData.services || {});
    services = processUploadedFiles(
      req.files, 
      'serviceIcon_', 
      services, 
      { serviceTitle: "", serviceIcon: "" }
    );
    aboutSectionData.services = services;

    // Why Choose Us সার্ভিস আইকন প্রসেস করা
    let whyChooseServices = ensureArray(whyChooseUsSectionData.services || {});
    whyChooseServices = processUploadedFiles(
      req.files, 
      'whyChooseServiceIcon_', 
      whyChooseServices, 
      { serviceTitle: "", serviceDescription: "", serviceIcon: "" }
    );
    whyChooseUsSectionData.services = whyChooseServices;

    // Appointment Process আইকন প্রসেস করা
    let appointmentProcesses = ensureArray(appointmentProcessData);
    appointmentProcesses = processUploadedFiles(
      req.files, 
      'appointmentProcessIcon_', 
      appointmentProcesses, 
      { title: "", icon: "" }
    );

    // হিরো ব্যাকগ্রাউন্ড ইমেজ আটাচ করা
    heroSectionData.backgroundImage = processImage(req.files, 'heroBackgroundImage');

    // অ্যাবাউট সেকশন ইমেজ হ্যান্ডেল করা
    const aboutImages = req.files.filter(file => file.fieldname === 'aboutImages');
    if (aboutImages.length > 0) {
      aboutSectionData.images = aboutImages.map(file => file.path);
    }

    // অন্যান্য ইমেজ হ্যান্ডেল করা
    appointmentSectionData.image = processImage(req.files, 'appointmentImage');
    whyChooseUsSectionData.image = processImage(req.files, 'whyChooseUsImage');
    downloadAppSectionData.image = processImage(req.files, 'downloadAppImage');

    // নতুন হোমপেজ রেকর্ড ক্রিয়েট করা - সিলেক্টেড ল্যাঙ্গুয়েজ ব্যবহার করে
    const newHomepage = await prisma.homepage.create({
      data: {
        id: 1,
        heroSection: { 
          create: { translations: { [language]: heroSectionData } } 
        },
        featuresSection: { 
          create: { translations: { [language]: featuresSectionData } } 
        },
        aboutSection: { 
          create: { translations: { [language]: aboutSectionData } } 
        },
        appointmentSection: { 
          create: { translations: { [language]: appointmentSectionData } } 
        },
        whyChooseUsSection: { 
          create: { translations: { [language]: whyChooseUsSectionData } } 
        },
        downloadAppSection: { 
          create: { translations: { [language]: downloadAppSectionData } } 
        },
        appointmentProcess: { 
          create: { translations: { [language]: appointmentProcesses } } 
        }
      },
      include: {
        heroSection: true,
        featuresSection: true,
        aboutSection: true,
        appointmentSection: true,
        whyChooseUsSection: true,
        downloadAppSection: true,
        appointmentProcess: true
      },
    });

    res.status(201).json(newHomepage);
  } catch (error) {
    console.error('Error creating homepage:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

/**
 * PUT /:section - নির্দিষ্ট সেকশন আপডেট করা
 */
router.put('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const { language, translations } = req.body;

    if (!language || translations === undefined) {
      return res.status(400).json({ message: 'Missing language or translations data' });
    }

    const allowedSections = [
      'heroSection', 'featuresSection', 'aboutSection', 
      'appointmentSection', 'whyChooseUsSection', 
      'downloadAppSection', 'appointmentProcess'
    ];

    if (!allowedSections.includes(section)) {
      return res.status(400).json({ message: 'Invalid section name' });
    }

    const mergeArrays = !(['appointmentProcess', 'featuresSection'].includes(section));
    const updatedHomepage = await updateSection(section, language, translations, mergeArrays);

    return res.json({
      message: `${section} updated successfully`,
      data: updatedHomepage[section]
    });
  } catch (error) {
    console.error('Error updating homepage section:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message
    });
  }
});

// ইমেজ আপলোড এন্ডপয়েন্ট গ্রুপ
// এই ফাংশন সব আপলোড এন্ডপয়েন্ট তৈরি করবে
const createImageUploadEndpoint = (route, fieldName, sectionName, imagePath = 'image') => {
  router.post(route, upload[fieldName.endsWith('Images') ? 'array' : 'single'](fieldName, 4), async (req, res) => {
    try {
      // রিকোয়েস্ট থেকে ভাষা গ্রহণ (ডিফল্ট: 'en')
      const language = req.query.language || req.body.language || 'en';
      console.log(`Uploading ${fieldName} for language: ${language}`);
      
      const files = req.files || (req.file ? [req.file] : []);
      
      if (files.length === 0) {
        return res.status(400).json({ message: `No ${fieldName} uploaded` });
      }
      
      const homepage = await prisma.homepage.findUnique({
        where: { id: 1 },
        include: { [sectionName]: true }
      });
      
      if (!homepage || !homepage[sectionName]) {
        return res.status(404).json({ message: `${sectionName} not found` });
      }
      
      const currentTranslations = homepage[sectionName].translations || {};
      const currentData = currentTranslations[language] || {};
      
      // আপডেট ডেটা তৈরি
      const updateData = {
        ...currentData
      };
      
      if (fieldName.endsWith('Images')) {
        updateData[imagePath] = files.map(file => file.path);
      } else {
        updateData[imagePath] = files[0].path;
      }
      
      await updateSection(sectionName, language, updateData);
      
      res.status(200).json({ 
        message: `${fieldName} updated successfully for language: ${language}`,
        imagePath: fieldName.endsWith('Images') ? files.map(file => file.path) : files[0].path
      });
      
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message 
      });
    }
  });
};

// সমস্ত ইমেজ আপলোড এন্ডপয়েন্ট তৈরি
createImageUploadEndpoint('/uploadHeroImage', 'heroBackgroundImage', 'heroSection', 'backgroundImage');
createImageUploadEndpoint('/uploadAppointmentImage', 'appointmentImage', 'appointmentSection');
createImageUploadEndpoint('/uploadWhyChooseImage', 'whyChooseUsImage', 'whyChooseUsSection');
createImageUploadEndpoint('/uploadDownloadAppImage', 'downloadAppImage', 'downloadAppSection');
createImageUploadEndpoint('/uploadAboutImages', 'aboutImages', 'aboutSection', 'images');

// আইকন আপলোড এন্ডপয়েন্ট গ্রুপ
const createIconsUploadEndpoint = (route, prefix, sectionName, itemsField = null, itemTemplate = {}) => {
  router.post(route, upload.any(), async (req, res) => {
    try {
      console.log(`${route} request received`);
      
      // রিকোয়েস্ট থেকে ভাষা গ্রহণ (ডিফল্ট: 'en')
      const language = req.query.language || req.body.language || 'en';
      console.log(`Uploading icons for language: ${language}`);
      
      const homepage = await prisma.homepage.findUnique({
        where: { id: 1 },
        include: { [sectionName]: true }
      });
      
      if (!homepage || !homepage[sectionName]) {
        return res.status(404).json({ message: `${sectionName} not found` });
      }
      
      const icons = req.files.filter(file => file.fieldname.startsWith(prefix));
      if (icons.length === 0) {
        return res.status(400).json({ message: 'No icons uploaded' });
      }
      
      const currentTranslations = homepage[sectionName].translations || {};
      let currentItems;
      
      if (itemsField) {
        const currentData = currentTranslations[language] || {};
        currentItems = ensureArray(currentData[itemsField] || {});
      } else {
        currentItems = ensureArray(currentTranslations[language] || {});
      }
      
      // আইকন প্রসেস ও আপডেট করা
      currentItems = processUploadedFiles(req.files, prefix, currentItems, itemTemplate);
      
      // সেকশন আপডেট
      let updateData;
      if (itemsField) {
        const currentData = currentTranslations[language] || {};
        updateData = {
          ...currentData,
          [itemsField]: currentItems
        };
      } else {
        updateData = currentItems;
      }
      
      await updateSection(sectionName, language, updateData, !itemsField);
      
      res.status(200).json({ 
        message: `Icons updated successfully for language: ${language}`,
        items: currentItems
      });
      
    } catch (error) {
      console.error(`Error updating icons:`, error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message
      });
    }
  });
};

// সমস্ত আইকন আপলোড এন্ডপয়েন্ট তৈরি
createIconsUploadEndpoint(
  '/uploadFeatureIcons', 
  'featureIcon_', 
  'featuresSection', 
  null, 
  { subtitle: "", title: "", icon: "" }
);

createIconsUploadEndpoint(
  '/uploadServiceIcons', 
  'serviceIcon_', 
  'aboutSection', 
  'services', 
  { serviceTitle: "", serviceIcon: "" }
);

createIconsUploadEndpoint(
  '/uploadWhyChooseServiceIcons', 
  'whyChooseServiceIcon_', 
  'whyChooseUsSection', 
  'services', 
  { serviceTitle: "", serviceDescription: "", serviceIcon: "" }
);

createIconsUploadEndpoint(
  '/uploadAppointmentProcessIcons', 
  'appointmentProcessIcon_', 
  'appointmentProcess', 
  null, 
  { title: "", icon: "" }
);

/**
 * POST /copy-translations - একটি ভাষার ডেটা থেকে অন্য ভাষায় কপি করার এন্ডপয়েন্ট
 * Body: { sourceLanguage: 'en', targetLanguage: 'bn' }
 */
router.post('/copy-translations', async (req, res) => {
  try {
    const { sourceLanguage, targetLanguage } = req.body;
    
    if (!sourceLanguage || !targetLanguage) {
      return res.status(400).json({ message: 'Missing sourceLanguage or targetLanguage' });
    }
    
    const homepage = await prisma.homepage.findUnique({
      where: { id: 1 },
      include: {
        heroSection: true,
        featuresSection: true,
        aboutSection: true,
        appointmentSection: true,
        whyChooseUsSection: true,
        downloadAppSection: true,
        appointmentProcess: true
      },
    });
    
    if (!homepage) {
      return res.status(404).json({ message: 'Homepage not found' });
    }
    
    // সব সেকশনের জন্য লুপ
    const sections = [
      'heroSection', 'featuresSection', 'aboutSection', 
      'appointmentSection', 'whyChooseUsSection', 
      'downloadAppSection', 'appointmentProcess'
    ];
    
    for (const section of sections) {
      if (homepage[section]) {
        const translations = homepage[section].translations || {};
        
        // উৎস ভাষার ডেটা আছে কিনা চেক
        if (translations[sourceLanguage]) {
          // টার্গেট ভাষায় কপি করা
          await updateSection(
            section, 
            targetLanguage, 
            translations[sourceLanguage], 
            false // পুরো ডেটা প্রতিস্থাপন করা
          );
        }
      }
    }
    
    res.status(200).json({ 
      message: `Successfully copied all sections from ${sourceLanguage} to ${targetLanguage}`
    });
  } catch (error) {
    console.error('Error copying translations:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message
    });
  }
});
  
module.exports = router;