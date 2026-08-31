/**
 * Web Speech API (SpeechSynthesis) Utility for Kabadiwala Connect
 * Provides text-to-speech audio feedback for informal scrap collectors.
 */

class PriceVoiceAnnouncer {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.speakingId = null;
  }

  isSupported() {
    return Boolean(this.synth && 'SpeechSynthesisUtterance' in window);
  }

  /**
   * Speak price details for a material in English or Hindi
   *
   * @param {Object} item - { material_name, category, location, buying_price, unit, trend }
   * @param {string} lang - 'en-IN' | 'hi-IN'
   * @param {Function} onStart
   * @param {Function} onEnd
   * @param {Function} onError
   */
  speakPrice(item, lang = 'en-IN', onStart, onEnd, onError) {
    if (!this.isSupported()) {
      if (onError) onError(new Error('Web Speech API is not supported in this browser.'));
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

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
    } else {
      text = `${item.sub_category || item.material_name} in ${item.location || 'Bengaluru'}. Current authorized buying price is ${item.current_buying_price} rupees per ${unitStr}. ${trendText}`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95; // Slightly slower for clear understanding
    utterance.pitch = 1.0;

    // Pick best Indian English / Hindi voice if available
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(
      v => (lang === 'hi-IN' ? v.lang.includes('hi') : v.lang.includes('en-IN') || v.name.includes('India'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.speakingId = item.material_id;
      if (onStart) onStart(item.material_id);
    };

    utterance.onend = () => {
      this.speakingId = null;
      if (onEnd) onEnd(item.material_id);
    };

    utterance.onerror = (e) => {
      this.speakingId = null;
      if (onError) onError(e);
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.speakingId = null;
    }
  }
}

export const announcer = new PriceVoiceAnnouncer();
