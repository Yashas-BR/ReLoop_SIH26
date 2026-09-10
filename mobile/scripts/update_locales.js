const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, '..', 'i18n', 'locales');

const translations = {
  mr: {
    applyMode: 'अर्ज करा',
    applyAsRecycler: 'रिसायकलर म्हणून अर्ज करा',
    facilityNameLabel: 'सुविधा / कंपनीचे नाव *',
    facilityNamePlaceholder: 'उदाहरण रिसायकलिंग प्रायव्हेट लिमिटेड',
    facilityLocationLabel: 'सुविधेचे ठिकाण *',
    facilityLocationPlaceholder: 'बेंगळुरू, कर्नाटक',
    contactDetailsLabel: 'संपर्क तपशील',
    contactDetailsPlaceholder: 'फोन किंवा ईमेल',
    serviceAreaLabel: 'सेवा क्षेत्र',
    serviceAreaPlaceholder: 'बेंगळुरू शहरी',
    materialsAcceptedLabel: 'स्वीकृत सामग्री *',
    pickupAvailabilityLabel: 'पिकअप उपलब्धता',
    pickupDaily: 'दररोज',
    pickupWeekly: 'साप्ताहिक',
    pickupOnRequest: 'विनंतीवरून',
    applyButton: 'अर्ज सबमिट करा',
    applyingButton: 'सबमिट करत आहे...'
  },
  kn: {
    applyMode: 'ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    applyAsRecycler: 'ಮರುಬಳಕೆದಾರರಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    facilityNameLabel: 'ಸೌಲಭ್ಯ / ಕಂಪನಿಯ ಹೆಸರು *',
    facilityNamePlaceholder: 'ಉದಾಹರಣೆ ಮರುಬಳಕೆ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್',
    facilityLocationLabel: 'ಸೌಲಭ್ಯದ ಸ್ಥಳ *',
    facilityLocationPlaceholder: 'ಬೆಂಗಳೂರು, ಕರ್ನಾಟಕ',
    contactDetailsLabel: 'ಸಂಪರ್ಕ ವಿವರಗಳು',
    contactDetailsPlaceholder: 'ಫೋನ್ ಅಥವಾ ಇಮೇಲ್',
    serviceAreaLabel: 'ಸೇವಾ ಪ್ರದೇಶ',
    serviceAreaPlaceholder: 'ಬೆಂಗಳೂರು ನಗರ',
    materialsAcceptedLabel: 'ಸ್ವೀಕರಿಸಿದ ವಸ್ತುಗಳು *',
    pickupAvailabilityLabel: 'ಪಿಕಪ್ ಲಭ್ಯತೆ',
    pickupDaily: 'ಪ್ರತಿದಿನ',
    pickupWeekly: 'ವಾರಕ್ಕೊಮ್ಮೆ',
    pickupOnRequest: 'ವಿನಂತಿಯ ಮೇರೆಗೆ',
    applyButton: 'ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    applyingButton: 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...'
  },
  ta: {
    applyMode: 'விண்ணப்பிக்கவும்',
    applyAsRecycler: 'மறுசுழற்சியாளராக விண்ணப்பிக்கவும்',
    facilityNameLabel: 'வசதி / நிறுவனத்தின் பெயர் *',
    facilityNamePlaceholder: 'உதாரணம் மறுசுழற்சி பிரைவேட் லிமிடெட்',
    facilityLocationLabel: 'வசதி அமைவிடம் *',
    facilityLocationPlaceholder: 'பெங்களூரு, கர்நாடகா',
    contactDetailsLabel: 'தொடர்பு விவரங்கள்',
    contactDetailsPlaceholder: 'தொலைபேசி அல்லது மின்னஞ்சல்',
    serviceAreaLabel: 'சேவை பகுதி',
    serviceAreaPlaceholder: 'பெங்களூரு நகர்ப்புறம்',
    materialsAcceptedLabel: 'ஏற்றுக்கொள்ளப்பட்ட பொருட்கள் *',
    pickupAvailabilityLabel: 'பிக்கப் கிடைக்கும் தன்மை',
    pickupDaily: 'தினசரி',
    pickupWeekly: 'வாராந்திர',
    pickupOnRequest: 'கோரிக்கையின் பேரில்',
    applyButton: 'விண்ணப்பத்தை சமர்ப்பிக்கவும்',
    applyingButton: 'சமர்ப்பிக்கிறது...'
  },
  te: {
    applyMode: 'దరఖాస్తు చేయండి',
    applyAsRecycler: 'రీసైక్లర్‌గా దరఖాస్తు చేయండి',
    facilityNameLabel: 'సౌకర్యం / కంపెనీ పేరు *',
    facilityNamePlaceholder: 'ఉదాహరణ రీసైక్లింగ్ ప్రైవేట్ లిమిటెಡ್',
    facilityLocationLabel: 'సౌకర్యం స్థానం *',
    facilityLocationPlaceholder: 'బెంగళూరు, కర్ణాటక',
    contactDetailsLabel: 'సంప్రదింపు వివరాలు',
    contactDetailsPlaceholder: 'ఫోన్ లేదా ఇమెయిల్',
    serviceAreaLabel: 'సేవా ప్రాంతం',
    serviceAreaPlaceholder: 'బెంగళూరు అర్బన్',
    materialsAcceptedLabel: 'అంగీకరించిన పదార్థాలు *',
    pickupAvailabilityLabel: 'పికప్ లభ్యత',
    pickupDaily: 'రోజూ',
    pickupWeekly: 'వారానికొకసారి',
    pickupOnRequest: 'అభ్యర్థనపై',
    applyButton: 'దరఖాస్తు సమర్పించండి',
    applyingButton: 'సమర్పిస్తోంది...'
  },
  ml: {
    applyMode: 'അപേക്ഷിക്കുക',
    applyAsRecycler: 'റീസൈക്ലറായി അപേക്ഷിക്കുക',
    facilityNameLabel: 'സൗകര്യം / കമ്പനിയുടെ പേര് *',
    facilityNamePlaceholder: 'ഉദാഹരണം റീസൈക്ലിംഗ് പ്രൈവറ്റ് ലിമിറ്റഡ്',
    facilityLocationLabel: 'സൗകര്യത്തിൻ്റെ സ്ഥാനം *',
    facilityLocationPlaceholder: 'ബംഗളൂരു, കർണാടക',
    contactDetailsLabel: 'ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ',
    contactDetailsPlaceholder: 'ഫോൺ അല്ലെങ്കിൽ ഇമെയിൽ',
    serviceAreaLabel: 'സേവന മേഖല',
    serviceAreaPlaceholder: 'ബംഗളൂരു അർബൻ',
    materialsAcceptedLabel: 'സ്വീകരിച്ച വസ്തുക്കൾ *',
    pickupAvailabilityLabel: 'പിക്കപ്പ് ലഭ്യത',
    pickupDaily: 'ദിവസവും',
    pickupWeekly: 'പ്രതിവാര',
    pickupOnRequest: 'അഭ്യർത്ഥന പ്രകാരം',
    applyButton: 'അപേക്ഷ സമർപ്പിക്കുക',
    applyingButton: 'സമർപ്പിക്കുന്നു...'
  },
  bn: {
    applyMode: 'আবেদন করুন',
    applyAsRecycler: 'রিসাইক্লার হিসাবে আবেদন করুন',
    facilityNameLabel: 'সুবিধা / কোম্পানির নাম *',
    facilityNamePlaceholder: 'উদাহরণ রিসাইক্লিং প্রাইভেট লিমিটেড',
    facilityLocationLabel: 'সুবিধার অবস্থান *',
    facilityLocationPlaceholder: 'বেঙ্গালুরু, কর্ণাটক',
    contactDetailsLabel: 'যোগাযোগের বিবরণ',
    contactDetailsPlaceholder: 'ফোন বা ইমেল',
    serviceAreaLabel: 'পরিষেবা এলাকা',
    serviceAreaPlaceholder: 'বেঙ্গালুরু আরবান',
    materialsAcceptedLabel: 'গৃহীত উপকরণ *',
    pickupAvailabilityLabel: 'পিকআপ উপলব্ধতা',
    pickupDaily: 'প্রতিদিন',
    pickupWeekly: 'সাপ্তাহিক',
    pickupOnRequest: 'অনুরোধে',
    applyButton: 'আবেদন জমা দিন',
    applyingButton: 'জমা দেওয়া হচ্ছে...'
  }
};

for (const [lang, keys] of Object.entries(translations)) {
  const filePath = path.join(localesPath, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.login) data.login = {};
    Object.assign(data.login, keys);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}.json`);
  }
}
