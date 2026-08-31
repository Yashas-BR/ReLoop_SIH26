import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { announcer } from '../utils/speech';

export const SAFETY_MODULES = [
  {
    id: 'cables',
    icon_danger: '🔥🚫',
    icon_safe: '✂️✅',
    title_en: 'Never Burn Cables in Open Fire',
    title_hi: 'तारों और केबल को कभी आग में न जलाएं',
    title_mr: 'वायर आणि केबल्स कधीही आगीत जाळू नका',
    danger_en: 'Burning plastic wires releases deadly black poison gas (dioxins and lead fumes). Breathing this smoke severely damages your lungs and causes chronic lung illness and cancer.',
    danger_hi: 'केबल को आग लगाने से जानलेवा काला जहरीला धुआं (डाइऑक्सिन और सीसा गैस) निकलता है। यह धुआं सांस के रास्ते फेफड़ों को हमेशा के लिए खराब कर देता है और कैंसर का कारण बनता है।',
    danger_mr: 'केबल्स जाळल्याने अत्यंत विषारी काळा धूर आणि विषारी वायू बाहेर पडतो. हा धूर फुफ्फुसांचे कायमचे नुकसान करतो आणि गंभीर आजार निर्माण करतो.',
    safe_en: 'Safe Method: Use manual or mechanical wire strippers to remove copper. Or sell cables directly with plastic insulation intact to authorized recyclers for certified rates.',
    safe_hi: 'सुरक्षित तरीका: तांबा निकालने के लिए वायर स्ट्रिपर (छीलने वाले औजार) का उपयोग करें या पूरी केबल को प्लास्टिक सहित प्रमाणित रीसाइक्लर को बेचें।',
    safe_mr: 'सुरक्षित मार्ग: तांबे काढण्यासाठी वायर कटर/स्ट्रिपर वापरा किंवा प्लास्टिक कव्हरसह संपूर्ण केबल थेट अधिकृत रिसायकलिंग केंद्राला विका.',
    speech_hi: 'सावधानी नंबर एक: तारों और केबल को आग में कभी न जलाएं। आग लगाने से जानलेवा जहरीला धुआं निकलता है जो फेफड़ों को नष्ट कर देता है। तांबा निकालने के लिए वायर स्ट्रिपर औजार का उपयोग करें।',
    speech_mr: 'सावधानता क्रमांक एक: केबल्स आगीत कधीही जाळू नका. जाळल्याने विषारी धूर निघतो. तांबे वेगळे करण्यासाठी कटर किंवा स्ट्रिपर वापरा.',
    speech_en: 'Rule number one: Never burn cables in open fires. Burning produces deadly toxic fumes. Use mechanical wire strippers or sell insulated wires directly to certified recyclers.',
  },
  {
    id: 'pcbs',
    icon_danger: '🧪🚫',
    icon_safe: '📦✅',
    title_en: 'Never Use Acid on Circuit Boards (PCBs)',
    title_hi: 'सर्किट बोर्ड को तेजाब (एसिड) में न धोएं',
    title_mr: 'सर्किट बोर्ड (PCBs) ॲसिड किंवा तेजाबात टाकू नका',
    danger_en: 'Boiling motherboards in nitric acid or aqua regia causes blinding acid vapor, severe skin burns, and poisons nearby drinking water and soil.',
    danger_hi: 'सोना निकालने के लिए सर्किट बोर्ड पर तेजाब या नाइट्रिक एसिड डालना अत्यंत खतरनाक है। इससे उठने वाली एसिड भाप से आंखें अंधी हो सकती हैं और त्वचा जल जाती है।',
    danger_mr: 'सोने किंवा धातू काढण्यासाठी बोर्डवर ॲसिड टाकल्याने विषारी वाफ निर्माण होते, डोळे निकामी होऊ शकतात आणि त्वचा जळू शकते.',
    safe_en: 'Safe Method: Keep computer and mobile PCBs dry and unbroken in a carton box. Authorized recyclers extract gold, silver, and copper in zero-emission industrial smelters.',
    safe_hi: 'सुरक्षित तरीका: सभी कंप्यूटर और मोबाइल बोर्ड को सूखे डिब्बों में बिना तोड़े रखें। अधिकृत रीसाइक्लर इन्हें बिना प्रदूषण वाली आधुनिक मशीनों से रीसायकल करते हैं।',
    safe_mr: 'सुरक्षित मार्ग: सर्व सर्किट बोर्ड सुक्या खोक्यात न तोडता जमा करा. अधिकृत रिसायकलर आधुनिक यंत्रांद्वारे धातू वेगळे करतात.',
    speech_hi: 'सावधानी नंबर दो: सर्किट बोर्ड को तेजाब में कभी न गलाएं। तेजाब की भाप से आंखें और फेफड़े खराब हो जाते हैं। बोर्ड को बिना तोड़े डिब्बों में भरकर रीसाइक्लर को दें।',
    speech_mr: 'सावधानता क्रमांक दोन: सर्किट बोर्डवर ॲसिड वापरू नका. बोर्ड न तोडता सुरक्षित खोक्यात ठेवून अधिकृत रिसायकलरला द्या.',
    speech_en: 'Rule number two: Never use acid leaching on PCBs. Acid fumes cause blindness and chemical burns. Keep circuit boards intact and sell them to certified recyclers.',
  },
  {
    id: 'batteries_crt',
    icon_danger: '🔨🚫',
    icon_safe: '🛡️✅',
    title_en: 'Never Smash Batteries or Old CRT Screens',
    title_hi: 'बैटरी और पुराने टीवी की स्क्रीन को हथौड़े से न तोड़ें',
    title_mr: 'बॅटऱ्या आणि जुन्या टीव्हीचे काच हातोड्याने फोडू नका',
    danger_en: 'Lithium batteries explode and burst into fire when punctured. Lead-acid batteries splash burning acid. Old CRT glass tubes contain 2-4 kg of poisonous lead and can implode violently.',
    danger_hi: 'लिथियम बैटरी पर हथौड़ा मारने से तेज आग लग जाती है और धमाका होता है। लेड बैटरी से तेजाब छिटक सकता है। पुराने सीआरटी टीवी में 3 किलो जहरीला सीसा (लेड) होता है।',
    danger_mr: 'लिथियम बॅटरीवर आघात झाल्यास स्फोट होतो व आग लागते. जुन्या टीव्हीच्या काचेमध्ये विषारी शिसे असते, जे हवेत पसरते.',
    safe_en: 'Safe Method: Cover battery terminals with tape. Store in dry, shaded containers. Handle CRT monitors with care without cracking the glass.',
    safe_hi: 'सुरक्षित तरीका: बैटरी के सिरों (टर्मिनल) पर टेप लगाएं। उन्हें ठंडी और सूखी जगह पर रखें। पुराने टीवी को बिना कांच तोड़े सुरक्षित रीसाइक्लर तक पहुंचाएं।',
    safe_mr: 'सुरक्षित मार्ग: बॅटरीच्या टोकांवर टेप लावा आणि कोरड्या जागी ठेवा. जुन्या टीव्हीची काच न फोडता सुरक्षितपणे रिसायकलरला द्या.',
    speech_hi: 'सावधानी नंबर तीन: बैटरी और टीवी की स्क्रीन को हथौड़े से कभी न तोड़ें। बैटरी में आग लग सकती है और धमाका हो सकता है। इन्हें बिना तोड़े सुरक्षित रखें।',
    speech_mr: 'सावधानता क्रमांक तीन: बॅटरी व टीव्ही स्क्रीनवर हातोडा मारू नका. यामुळे आग व स्फोट होऊ शकतो. साहित्य सुस्थितीत ठेवा.',
    speech_en: 'Rule number three: Never smash batteries or CRT monitors. Lithium can explode in flames. Keep terminals taped and handle intact.',
  },
];

export const PPE_ITEMS = [
  { icon: '🧤', label_en: 'Heavy Duty Gloves', label_hi: 'मजबूत रबर/चमड़े के दस्ताने', label_mr: 'मजबूत हातमोजे (दस्ताने)' },
  { icon: '😷', label_en: 'Dust & Fume Mask', label_hi: 'धूल व गैस सुरक्षा मास्क', label_mr: 'सुरक्षा मास्क' },
  { icon: '🥾', label_en: 'Closed Safety Boots', label_hi: 'मजबूत सुरक्षा जूते', label_mr: 'सुरक्षा बूट' },
  { icon: '🥽', label_en: 'Eye Safety Goggles', label_hi: 'आंखों का सुरक्षा चश्मा', label_mr: 'सुरक्षा गॉगल (चष्मा)' },
];

export default function SafetyGuidance() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);

  const getLangCode = () => {
    if (currentLang === 'hi') return 'hi-IN';
    if (currentLang === 'mr') return 'mr-IN';
    return 'en-IN';
  };

  const handleReadAloud = (mod) => {
    if (activeSpeakingId === mod.id) {
      announcer.stop();
      setActiveSpeakingId(null);
      return;
    }

    const speechText = currentLang === 'hi' ? mod.speech_hi : currentLang === 'mr' ? mod.speech_mr : mod.speech_en;
    setActiveSpeakingId(mod.id);

    announcer.speakText(speechText, {
      lang: getLangCode(),
      id: mod.id,
      onStart: () => setActiveSpeakingId(mod.id),
      onEnd: () => setActiveSpeakingId(null),
      onError: () => setActiveSpeakingId(null),
    });
  };

  const handleReadAll = () => {
    if (activeSpeakingId === 'all') {
      announcer.stop();
      setActiveSpeakingId(null);
      return;
    }

    const allText = SAFETY_MODULES.map(m =>
      currentLang === 'hi' ? m.speech_hi : currentLang === 'mr' ? m.speech_mr : m.speech_en
    ).join(' ');

    setActiveSpeakingId('all');
    announcer.speakText(allText, {
      lang: getLangCode(),
      id: 'all',
      onStart: () => setActiveSpeakingId('all'),
      onEnd: () => setActiveSpeakingId(null),
      onError: () => setActiveSpeakingId(null),
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-3xl">🦺</span>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
                {currentLang === 'hi'
                  ? 'कबाड़ीवाला स्वास्थ्य एवं सुरक्षा मार्गदर्शन'
                  : currentLang === 'mr'
                  ? 'संकलक आरोग्य व सुरक्षितता मार्गदर्शक'
                  : 'Collector Health & Safety Guidance'}
              </h1>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              {currentLang === 'hi'
                ? 'ई-कचरा व स्क्रैप संग्रह के दौरान अपनी सेहत और परिवार को जहरीले रसायनों और आग से सुरक्षित रखें।'
                : currentLang === 'mr'
                ? 'ई-कचरा गोळा करताना विषारी धूर, ॲसिड आणि आगीपासून स्वतःचे व कुटुंबाचे रक्षण करा.'
                : 'Essential life-saving guidelines to prevent toxic fume inhalation, chemical burns, and explosions.'}
            </p>
          </div>

          {/* Read All Voice Button */}
          <button
            onClick={handleReadAll}
            className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
              activeSpeakingId === 'all'
                ? 'bg-amber-500 text-surface-950 ring-2 ring-amber-300 animate-pulse'
                : 'bg-gradient-to-tr from-brand-600 to-brand-400 text-surface-950 hover:brightness-110 shadow-brand-500/20'
            }`}
          >
            <span className="text-base">{activeSpeakingId === 'all' ? '🔊' : '🔈'}</span>
            <span>
              {activeSpeakingId === 'all'
                ? currentLang === 'hi' ? 'पूरा नियम सुनाया जा रहा है...' : currentLang === 'mr' ? 'ऐकवत आहे...' : 'Reading All Rules...'
                : currentLang === 'hi' ? 'पूरे सुरक्षा नियम बोलकर सुनें 🔊' : currentLang === 'mr' ? 'सर्व नियम ऐका 🔊' : 'Read Full Safety Guide Aloud 🔊'}
            </span>
          </button>
        </div>

        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* PPE Pictorial Quick Bar */}
      <div className="bg-surface-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3 flex items-center gap-2">
          <span>🛡️</span>
          <span>
            {currentLang === 'hi'
              ? 'काम करते समय अनिवार्य सुरक्षा उपकरण (PPE)'
              : currentLang === 'mr'
              ? 'कामाच्या वेळी आवश्यक सुरक्षा साधने'
              : 'Mandatory Personal Protective Gear'}
          </span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PPE_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 flex items-center gap-3 shadow-inner"
            >
              <span className="text-3xl">{item.icon}</span>
              <p className="text-xs font-bold text-slate-200">
                {currentLang === 'hi' ? item.label_hi : currentLang === 'mr' ? item.label_mr : item.label_en}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main 3 Crucial Safety Guidance Cards */}
      <div className="space-y-6">
        {SAFETY_MODULES.map((mod, index) => {
          const isSpeaking = activeSpeakingId === mod.id;
          const title = currentLang === 'hi' ? mod.title_hi : currentLang === 'mr' ? mod.title_mr : mod.title_en;
          const danger = currentLang === 'hi' ? mod.danger_hi : currentLang === 'mr' ? mod.danger_mr : mod.danger_en;
          const safe = currentLang === 'hi' ? mod.safe_hi : currentLang === 'mr' ? mod.safe_mr : mod.safe_en;

          return (
            <div
              key={mod.id}
              className={`bg-surface-900 border-2 rounded-3xl p-6 shadow-xl transition-all relative overflow-hidden ${
                isSpeaking
                  ? 'border-amber-400 ring-2 ring-amber-400/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Speaking indicator top line */}
              {isSpeaking && (
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400 animate-pulse" />
              )}

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-brand-400 font-mono">
                    #{index + 1}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {title}
                  </h2>
                </div>

                {/* Read Aloud Button for this specific card */}
                <button
                  onClick={() => handleReadAloud(mod)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSpeaking
                      ? 'bg-amber-500 text-surface-950 shadow-md shadow-amber-500/30 font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <span>{isSpeaking ? '🔊' : '🔈'}</span>
                  <span>
                    {isSpeaking
                      ? currentLang === 'hi' ? 'सुनाया जा रहा है...' : currentLang === 'mr' ? 'ऐकवत आहे...' : 'Speaking…'
                      : currentLang === 'hi' ? 'यह नियम बोलकर सुनें' : currentLang === 'mr' ? 'हा नियम ऐका' : 'Read This Rule Aloud'}
                  </span>
                </button>
              </div>

              {/* Two Column Grid: Danger vs Safe Method with pictorial representations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Dangerous Practice (Red Box) */}
                <div className="bg-red-950/25 border border-red-500/30 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                    <span className="text-2xl">{mod.icon_danger}</span>
                    <span>
                      {currentLang === 'hi' ? 'खतरा / कभी न करें' : currentLang === 'mr' ? 'धोका / कधीही करू नका' : 'Hazard / Forbidden Practice'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    {danger}
                  </p>
                </div>

                {/* 2. Safe & Profitable Alternative (Green Box) */}
                <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <span className="text-2xl">{mod.icon_safe}</span>
                    <span>
                      {currentLang === 'hi' ? 'सुरक्षित तरीका (पूरा भाव मिलेगा)' : currentLang === 'mr' ? 'सुरक्षित पद्धत (योग्य दर मिळेल)' : 'Safe & Compliant Method'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    {safe}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpline / Emergency Footer Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📞</span>
          <div>
            <p className="font-bold text-white">CPCB / KSPCB E-Waste Hazardous Spill Helpline</p>
            <p className="text-[11px] text-slate-500">Toll Free: 1800-425-0000 • In case of chemical burns, wash with excess water immediately.</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 font-mono text-emerald-400 font-bold">
          CPCB E-Waste Rules 2022
        </span>
      </div>
    </div>
  );
}
