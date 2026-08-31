/**
 * Web Speech API (SpeechSynthesis) Utility for Kabadiwala Connect
 * Provides text-to-speech audio feedback for informal scrap collectors in English, Hindi, and Marathi.
 */

class VoiceAnnouncer {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.speakingId = null;
  }

  isSupported() {
    return Boolean(this.synth && 'SpeechSynthesisUtterance' in window);
  }

  /**
   * Speak arbitrary text in selected language (en-IN, hi-IN, mr-IN)
   */
  speakText(text, options = {}) {
    const { lang = 'en-IN', id = 'general', onStart, onEnd, onError } = options;

    if (!this.isSupported()) {
      console.warn('Web Speech API is not supported in this browser environment.');
      if (onError) onError(new Error('Web Speech API not supported'));
      return;
    }

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.92; // Slightly slower, clear tone for low-literacy users
    utterance.pitch = 1.0;

    // Pick best matching voice
    if (this.synth.getVoices) {
      const voices = this.synth.getVoices();
      const langPrefix = lang.split('-')[0];
      const preferredVoice = voices.find(v => v.lang.startsWith(langPrefix) || v.lang.includes(lang));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.onstart = () => {
      this.speakingId = id;
      if (onStart) onStart(id);
    };

    utterance.onend = () => {
      this.speakingId = null;
      if (onEnd) onEnd(id);
    };

    utterance.onerror = (e) => {
      this.speakingId = null;
      if (onError) onError(e);
    };

    this.synth.speak(utterance);
  }

  /**
   * Speak price details for a material
   */
  speakPrice(item, options = {}) {
    const { lang = 'en-IN', onStart, onEnd, onError } = options;
    const matId = item.material_id || item.id;

    let text = '';
    const unitStr = item.unit === 'kg' ? 'kilogram' : item.unit;
    const trendText =
      item.price_trend === 'rising'
        ? 'Price trend is rising.'
        : item.price_trend === 'falling'
        ? 'Price trend is falling.'
        : 'Price is stable.';

    if (lang === 'hi-IN') {
      const trendHi =
        item.price_trend === 'rising'
          ? 'बाजार में तेजी है।'
          : item.price_trend === 'falling'
          ? 'बाजार में मंदी है।'
          : 'भाव स्थिर है।';
      text = `${item.sub_category || item.material_name} का भाव ${item.location || 'बेंगलुरु'} में: खरीद दर ${item.current_buying_price} रुपये प्रति ${item.unit === 'kg' ? 'किलो' : item.unit} है। ${trendHi}`;
    } else if (lang === 'mr-IN') {
      const trendMr =
        item.price_trend === 'rising'
          ? 'बाजार भाव वाढत आहे.'
          : item.price_trend === 'falling'
          ? 'बाजार भाव कमी होत आहे.'
          : 'दर स्थिर आहे.';
      text = `${item.sub_category || item.material_name} चे दर ${item.location || 'बेंगलुरु'} मध्ये: खरेदी भाव ${item.current_buying_price} रुपये प्रति ${item.unit === 'kg' ? 'किलो' : item.unit} आहे. ${trendMr}`;
    } else {
      text = `${item.sub_category || item.material_name} in ${item.location || 'Bengaluru'}. Current authorized buying price is ${item.current_buying_price} rupees per ${unitStr}. ${trendText}`;
    }

    this.speakText(text, { lang, id: matId, onStart, onEnd, onError });
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.speakingId = null;
    }
  }
}

export const announcer = new VoiceAnnouncer();
