import Groq from "groq-sdk";
import { i18n } from './i18n.ts';

// --- DOM Element Selection ---
const imageUploadInput = document.getElementById('image-upload') as HTMLInputElement;
const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const removeImageBtn = document.getElementById('remove-image-btn') as HTMLButtonElement;
const uploadLabel = document.querySelector('.upload-label') as HTMLLabelElement;
const styleSelect = document.getElementById('style-select') as HTMLSelectElement;
const langSelect = document.getElementById('lang-select') as HTMLSelectElement;
const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;
const btnText = document.querySelector('.btn-text') as HTMLSpanElement;
const loader = document.querySelector('.loader') as HTMLDivElement;
const resultText = document.getElementById('result-text') as HTMLParagraphElement;
const errorText = document.getElementById('error-text') as HTMLParagraphElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const copyBtnText = document.querySelector('.copy-btn-text') as HTMLSpanElement;
const readAloudBtn = document.getElementById('read-aloud-btn') as HTMLButtonElement;
const readAloudBtnText = document.querySelector('.read-aloud-btn-text') as HTMLSpanElement;
const speakerIcon = document.querySelector('.speaker-icon') as SVGElement;
const stopIcon = document.querySelector('.stop-icon') as SVGElement;
const langToggle = document.getElementById('lang-toggle') as HTMLButtonElement;


// --- State ---
let imageBase64: string | null = null;
let imageMimeType: string | null = null;
let isSpeaking = false;
let voicesCache: SpeechSynthesisVoice[] = [];

// --- Groq API Initialization ---
let groq: any | null = null;
function ensureGroq(): void {
  if (groq) return;
  let key = '';
  try {
    key = sessionStorage.getItem('groq_api_key') || '';
  } catch {}
  if (!key) {
    key = window.prompt('Bitte trage deinen Groq API Key ein (wird nur in dieser Sitzung gespeichert):', '') || '';
    if (key) {
      try { sessionStorage.setItem('groq_api_key', key); } catch {}
    }
  }
  groq = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
}
const model = 'meta-llama/llama-4-scout-17b-16e-instruct';

// --- Functions ---

/**
 * Converts a File object to a Base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the Base64 string.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Toggles the UI into a loading state.
 * @param isLoading Whether the app is currently loading.
 */
function setLoading(isLoading: boolean): void {
  analyzeBtn.disabled = isLoading;
  loader.classList.toggle('hidden', !isLoading);
  btnText.textContent = isLoading ? i18n.t('analyzing') : i18n.t('analyze_button');
  if (isLoading) {
    resultText.textContent = '';
    errorText.classList.add('hidden');
    errorText.textContent = '';
    copyBtn.classList.add('hidden');
    readAloudBtn.classList.add('hidden');
    stopAudio();
  }
}

/**
 * Handles the selection of an image file.
 */
async function handleImageSelection(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    try {
      const dataUrl = await fileToBase64(file);
      const parts = dataUrl.split(',');
      const mimeTypePart = parts[0].match(/:(.*?);/);
      if (!mimeTypePart || !parts[1]) {
        throw new Error("Invalid data URL format.");
      }
      
      imageMimeType = mimeTypePart[1];
      imageBase64 = parts[1];
      
      imagePreview.src = dataUrl;
      imagePreviewContainer.classList.remove('hidden');
      uploadLabel.classList.add('hidden');
      analyzeBtn.disabled = false;
      resultText.textContent = i18n.t('result_ready');
      errorText.classList.add('hidden');
      copyBtn.classList.add('hidden');
      readAloudBtn.classList.add('hidden');
      stopAudio();
    } catch (error) {
      console.error("Error processing image:", error);
      showError(i18n.t('error_image_process'));
    }
  }
}

/**
 * Resets the image selection UI.
 */
function resetImageSelection(): void {
    imageBase64 = null;
    imageMimeType = null;
    imagePreview.src = '';
    imageUploadInput.value = ''; // Reset file input
    imagePreviewContainer.classList.add('hidden');
    uploadLabel.classList.remove('hidden');
    analyzeBtn.disabled = true;
    resultText.textContent = i18n.t('result_placeholder');
    errorText.classList.add('hidden');
    copyBtn.classList.add('hidden');
    readAloudBtn.classList.add('hidden');
    stopAudio();
}

/**
 * Displays an error message to the user.
 * @param message The error message to display.
 */
function showError(message: string): void {
    errorText.textContent = message;
    errorText.classList.remove('hidden');
    copyBtn.classList.add('hidden');
    readAloudBtn.classList.add('hidden');
    stopAudio();
}

/**
 * Handles the click event for the copy button.
 */
async function handleCopyClick(): Promise<void> {
    if (resultText.innerText) {
        try {
            await navigator.clipboard.writeText(resultText.innerText);
            copyBtnText.textContent = i18n.t('copy_success');
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtnText.textContent = i18n.t('copy_button');
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            copyBtnText.textContent = i18n.t('copy_error');
             setTimeout(() => {
                copyBtnText.textContent = i18n.t('copy_button');
            }, 2000);
        }
    }
}

// --- Text-to-Speech Functions ---

/** Stops the current audio playback and resets the UI. */
function stopAudio(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
  readAloudBtn.disabled = false;
  readAloudBtn.classList.remove('speaking');
  speakerIcon.classList.remove('hidden');
  stopIcon.classList.add('hidden');
  readAloudBtnText.textContent = i18n.t('read_aloud');
}

// Preload voices (some browsers populate asynchronously)
if ('speechSynthesis' in window) {
  const loadVoices = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
  window.speechSynthesis.onvoiceschanged = loadVoices;
  // Try immediate load too
  loadVoices();
}

/**
 * Waits until speech synthesis voices are populated (or timeout elapses)
 */
async function waitForVoices(maxWaitMs = 4500): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return [];
  let voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    voicesCache = voices;
    return voices;
  }
  return new Promise(resolve => {
    const start = Date.now();
    const handler = () => {
      voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        voicesCache = voices;
        resolve(voices);
      } else if (Date.now() - start > maxWaitMs) {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(voices || []);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Poll a few times as some browsers won't fire the event reliably
    const poll = () => {
      voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        voicesCache = voices;
        resolve(voices);
      } else if (Date.now() - start <= maxWaitMs) {
        setTimeout(poll, 150);
      } else {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(voices || []);
      }
    };
    setTimeout(poll, 50);
  });
}

/**
 * Pick the best available voice for a given BCP-47 lang code (e.g., 'ru-RU')
 */
function getBestVoice(langCode: string): SpeechSynthesisVoice | undefined {
  if (!('speechSynthesis' in window)) return undefined;
  const voices = voicesCache.length ? voicesCache : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return undefined;

  const lc = (langCode || '').toLowerCase();
  const primary = lc.split('-')[0];

  // Strong match: exact langCode
  const exact = voices.filter(v => (v.lang || '').toLowerCase() === lc);
  if (exact.length) {
    // Prefer local service or Microsoft voices on Windows
    const ms = exact.find(v => v.name.toLowerCase().includes('microsoft'));
    if (ms) return ms;
    const local = exact.find(v => (v as any).localService);
    if (local) return local;
    return exact[0];
  }

  // Fallback: primary language match (e.g., 'ru')
  const primaryMatches = voices.filter(v => (v.lang || '').toLowerCase().startsWith(primary));
  if (primaryMatches.length) {
    const ms = primaryMatches.find(v => v.name.toLowerCase().includes('microsoft'));
    if (ms) return ms;
    const local = primaryMatches.find(v => (v as any).localService);
    if (local) return local;
    return primaryMatches[0];
  }

  return undefined;
}

/**
 * Cleans response text from unwanted special characters and formatting artifacts
 * while preserving content-related punctuation and symbols.
 */
function cleanResponseText(text: string): string {
  return text
    // Remove markdown-style formatting that shouldn't appear in final output
    .replace(/^\*\*.*?\*\*:?\s*/gm, '') // Remove **bold headings**: at line start
    .replace(/\*\*(.*?)\*\*/g, '$1') // Convert **bold** to plain text
    .replace(/\*(.*?)\*/g, '$1') // Convert *italic* to plain text
    .replace(/`(.*?)`/g, '$1') // Remove backticks from inline code
    
    // Remove prompt artifacts and meta characters
    .replace(/^\s*[-•\*]{2,}\s*/gm, '') // Remove multiple bullet chars at line start
    .replace(/^\s*[=#]{2,}.*$/gm, '') // Remove markdown headers (## ###)
    .replace(/^\s*\d+\.\s*\*\*/gm, '- ') // Convert "1. **" to bullet point
    
    // Clean up excessive punctuation (preserve single instances)
    .replace(/\.{3,}/g, '...') // Normalize ellipsis
    .replace(/!{2,}/g, '!') // Remove multiple exclamation marks
    .replace(/\?{2,}/g, '?') // Remove multiple question marks
    .replace(/:{2,}/g, ':') // Remove multiple colons
    
    // Clean up whitespace and line breaks
    .replace(/[ \t]+/g, ' ') // Normalize spaces
    .replace(/\n{3,}/g, '\n\n') // Limit to max 2 consecutive line breaks
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    
    // Remove common AI response prefixes/suffixes
    .replace(/^(hier ist|here is|this is|das ist|based on|according to).*?:/i, '')
    .replace(/\b(laut (dem )?bild|according to the image|in the image|im bild)\b/gi, '')
    
    // Clean up remaining artifacts
    .replace(/^\s*[-•\*]\s*$/gm, '') // Remove empty bullet points
    .replace(/\n\s*\n\s*\n/g, '\n\n'); // Normalize line breaks again
}

/**
 * Ensures the model output matches the selected target language by doing light heuristics
 * and, if necessary, rephrasing instructions inline to request translation-only output.
 * Note: This does not call the network again; it only does minimal filtering/guarding.
 */
async function ensureTargetLanguage(
  text: string,
  outputLanguage: string,
  targetAudience: string,
  langConfig: { code: string; summaryPrefix?: string }
): Promise<string> {
  const isCyrillic = /[\u0400-\u04FF]/; // Russian alphabet range
  const isLatin = /[A-Za-z]/;

  if (outputLanguage === 'Русский') {
    // If most lines are Latin-script, strip likely German meta-leads and keep Russian content
    const lines = text.split(/\r?\n+/);
    const cleaned = lines
      .map(l => l.trim())
      .filter(l => l.length > 0)
      // Drop common German meta prefixes if present
      .filter(l => !/^(-\s*)?(Das Bild enthält|Bitte senden Sie|Ich bitte Sie|Sehr geehrte Damen und Herren|Kündigung)/i.test(l))
      // Keep lines that contain Cyrillic or look like translated content
      .filter(l => isCyrillic.test(l) || !isLatin.test(l) || /[-•]/.test(l));
    if (cleaned.length > 0) return cleaned.join('\n');
  } else if (outputLanguage === 'English') {
    const lines = text.split(/\r?\n+/);
    const cleaned = lines
      .map(l => l.trim())
      .filter(l => l.length > 0)
      // Drop common German meta prefixes
      .filter(l => !/^(-\s*)?(Das Bild enthält|Bitte senden Sie|Ich bitte Sie|Sehr geehrte Damen und Herren|Kündigung)/i.test(l));
    if (cleaned.length > 0) return cleaned.join('\n');
  }

  return text;
}

/** Handles the click event for the read aloud button. */
async function handleReadAloudClick(): Promise<void> {
  const textToRead = resultText.innerText;
  if (!textToRead || textToRead === i18n.t('result_placeholder') || textToRead === i18n.t('result_ready')) {
      return;
  }

  // Use browser's speech synthesis API
  if ('speechSynthesis' in window) {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      stopAudio();
      return;
    }

  const utterance = new SpeechSynthesisUtterance(textToRead);

  // Use the same dropdown as the rest of the app
  const outputLanguage = langSelect?.value || 'Deutsch';
  const langCfg = getLanguageConfig(outputLanguage, styleSelect?.value || '');
  utterance.lang = langCfg.code;

    // Ensure voices are loaded, then choose a best matching voice
    await waitForVoices();
    // Recalculate cache after loading
    voicesCache = window.speechSynthesis.getVoices();
    const voice = getBestVoice(langCfg.code) ||
      // Fallbacks by common Russian voice names on Windows/Chrome
      voicesCache.find(v => /irina|oksana|russian|русск|yandex|google.*ru/i.test(`${v.name} ${v.voiceURI}`));
  if (voice) utterance.voice = voice;

    // Diagnostics in console to help identify voice selection issues
    try {
      console.log('[TTS] Desired lang:', langCfg.code, 'OutputLanguage:', outputLanguage);
      console.log('[TTS] Selected voice:', voice ? { name: voice.name, lang: voice.lang, localService: (voice as any).localService, voiceURI: voice.voiceURI } : null);
      console.log('[TTS] Available voices:', (voicesCache || []).map(v => ({ name: v.name, lang: v.lang, localService: (v as any).localService, voiceURI: v.voiceURI })));
    } catch {}

    // If Russian requested but no Russian voice matched, warn and stop instead of speaking with wrong voice
    if (outputLanguage === 'Русский' && (!voice || !(voice.lang || '').toLowerCase().startsWith('ru'))) {
      console.warn('[TTS] No Russian voice found on this system/browser. The browser may fallback to a default (German) voice. Install a Russian speech voice and restart the browser.');
      showError('Keine russische TTS-Stimme gefunden. Bitte installiere eine russische Sprachsynthese (Windows: Einstellungen → Zeit & Sprache → Sprache & Region → Sprache hinzufügen: Russisch → Sprachpaket inkl. Sprachsynthese) und starte den Browser neu.');
      return;
    }
    
    utterance.onstart = () => {
      isSpeaking = true;
      readAloudBtn.classList.add('speaking');
      speakerIcon.classList.add('hidden');
      stopIcon.classList.remove('hidden');
      readAloudBtnText.textContent = i18n.t('read_stop');
    };
    
    utterance.onend = () => {
      stopAudio();
    };
    
    utterance.onerror = () => {
      showError(i18n.t('error_speech_failed'));
      stopAudio();
    };
    
    window.speechSynthesis.speak(utterance);
  } else {
    showError(i18n.t('error_speech_unsupported'));
  }
}


/**
 * Gets language-specific configuration for prompts and processing
 */
function getLanguageConfig(outputLanguage: string, targetAudience: string) {
  const langMap: Record<string, { code: string, instructions: string, styleDefinitions: string, summaryPrefix: string }> = {
    'Deutsch': {
      code: 'de-DE',
      instructions: 'Gib den vereinfachten Text aus. Wenn "Einfache Zusammenfassung" gewählt ist, BEGINNE die Ausgabe exakt mit: "Hier ist eine Einfache Zusammenfassung:" (mit genau dieser Schreibweise). Füge keine zweite Überschrift oder Einleitung hinzu. In allen anderen Fällen: keine zusätzlichen Kommentare oder Einleitungen.',
      styleDefinitions: `
        *   **Wenn "Einfache Zusammenfassung" gewählt wurde:** Erkläre genau, was im Bildtext steht, und fasse alle wichtigen Kernaussagen zusammen. Nutze leicht verständliche deutsche Sprache und kurze, klare Sätze. Wo sinnvoll, zitiere markante Schlüsselbegriffe wörtlich. Beginne die Ausgabe exakt mit: "Hier ist eine Einfache Zusammenfassung:".
        *   **Wenn "Wichtigste Kernaussagen" gewählt wurde:** Gib NUR 3–5 Stichpunkte in deutscher Sprache aus, ohne Einleitung, ohne Abschluss. Jeder Punkt beginnt mit „- " und besteht aus 1–2 kurzen, informativen Sätzen.
      `,
      summaryPrefix: 'Hier ist eine Einfache Zusammenfassung:'
    },
    'English': {
      code: 'en-US',
      instructions: 'Provide the simplified text. If "Einfache Zusammenfassung" is chosen, BEGIN the output exactly with: "Here is a Simple Summary:" (with exactly this spelling). Do not add a second heading or introduction. In all other cases: no additional comments or introductions.',
      styleDefinitions: `
        *   **If "Einfache Zusammenfassung" was chosen:** Explain exactly what the image text says and summarize all important key points. Use easily understandable English and short, clear sentences. Where appropriate, quote key terms verbatim. Begin the output exactly with: "Here is a Simple Summary:".
        *   **If "Wichtigste Kernaussagen" was chosen:** Provide ONLY 3–5 bullet points in English, without introduction, without conclusion. Each point begins with "- " and consists of 1–2 short, informative sentences.
      `,
      summaryPrefix: 'Here is a Simple Summary:'
    },
    'Русский': {
      code: 'ru-RU',
      instructions: 'КРИТИЧЕСКИ ВАЖНО: Весь ваш ответ должен быть ТОЛЬКО на русском языке! Никогда не используйте немецкие фразы типа "Hier ist eine Einfache Zusammenfassung". Если выбрано "Einfache Zusammenfassung", начните ТОЛЬКО с: "Вот простое резюме:" - никаких других заголовков! Если выбрано "Wichtigste Kernaussagen", дайте только пункты списка без всяких введений.',
      styleDefinitions: `
        *   **Если выбран стиль "Einfache Zusammenfassung":** ЗАБУДЬТЕ о немецких фразах! Начните ТОЛЬКО с "Вот простое резюме:" и объясните содержание изображения простым русским языком. Используйте короткие, понятные предложения. ЗАПРЕЩЕНО использовать "Hier ist eine Einfache Zusammenfassung" или любые немецкие слова!
        *   **Если выбран стиль "Wichtigste Kernaussagen":** Дайте ТОЛЬКО 3-5 пунктов на русском языке. Каждый пункт начинается с "- " и содержит 1-2 информативных предложения. НЕ пишите "Das Bild enthält" или другие немецкие фразы - пишите сразу суть на русском!
      `,
      summaryPrefix: 'Вот простое резюме:'
    }
  };

  // Fallback to German if language not found
  return langMap[outputLanguage] || langMap['Deutsch'];
}

/**
 * Main function to call the Groq API and analyze the image.
 */
async function analyzeImage(): Promise<void> {
  if (!imageBase64 || !imageMimeType) {
    showError(i18n.t('error_no_image'));
    return;
  }

  setLoading(true);
  // Ensure Groq client is initialized with a key
  ensureGroq();

  const targetAudience = styleSelect.value;
  const outputLanguage = langSelect.value;
  const langConfig = getLanguageConfig(outputLanguage, targetAudience);
  
  let prompt = '';
  
  if (outputLanguage === 'Русский') {
    prompt = `
      **РОЛЬ:**
      Вы - блестящий ИИ-ассистент, способный читать и понимать текст на изображениях. Ваша главная задача - анализировать сложную информацию и делать её понятной для всех. Вы действуете как мост между сложным профессиональным жаргоном и повседневным языком.

      **ЗАДАЧА:**
      1.  **Распознавание текста (OCR):** Выполните точное распознавание текста на прикрепленном изображении.
      2.  **Анализ и упрощение:** Проанализируйте распознанный текст и упростите его содержание согласно выбранной пользователем [ЦЕЛЕВАЯ_ГРУППА/СТИЛЬ].
      3.  **Перевод и вывод:** Предоставьте результат исключительно на выбранном [ЯЗЫКЕ_ВЫВОДА].

      **ВХОДНЫЕ ДАННЫЕ:**
      1.  **[ИЗОБРАЖЕНИЕ]:** (Фото пользователя передается в API здесь)
      2.  **[ЦЕЛЕВАЯ_ГРУППА/СТИЛЬ]:** ${targetAudience}
      3.  **[ЯЗЫК_ВЫВОДА]:** ${outputLanguage}

      **ИНСТРУКЦИИ ПО ОБРАБОТКЕ:**
      *   Ваш первый приоритет - точное извлечение текста с изображения. Игнорируйте нерелевантные элементы изображения.
      *   Точно опишите, что написано на изображении и как структурирован текст (например, заголовки, абзацы, списки, таблицы, диаграммы, числа/единицы, метки). Где полезно, цитируйте короткие важные отрывки дословно в кавычках.
      *   Точно адаптируйте стиль, тональность и сложность вашего ответа к выбранной [ЦЕЛЕВОЙ_ГРУППЕ/СТИЛЮ].
      *   Вывод должен быть полным и безошибочным на выбранном [ЯЗЫКЕ_ВЫВОДА].
      *   Выдайте упрощенный текст. Если выбрано "Einfache Zusammenfassung", НАЧНИТЕ вывод точно с: "Вот простое резюме:" (именно с такой формулировкой). Если выбрано "Wichtigste Kernaussagen", НАЧНИТЕ СРАЗУ с первого пункта "- " - НЕТ введения, никаких "Изображение содержит", никаких мета-описаний. Во всех остальных случаях: никаких дополнительных комментариев или введений.
      *   Важно: Ключевые утверждения должны относиться исключительно к тексту на изображении. Содержимое из этого промпта (например, заголовки "ЗАДАЧА", "ИНСТРУКЦИИ ПО ОБРАБОТКЕ", "ОПРЕДЕЛЕНИЯ ЦЕЛЕВЫХ ГРУПП/СТИЛЕЙ", термины вроде "Распознавание текста (OCR)") НИКОГДА не должно появляться как ключевое утверждение.

      **ОПРЕДЕЛЕНИЯ ЦЕЛЕВЫХ ГРУПП/СТИЛЕЙ:**
      *   **Если выбрано "Einfache Zusammenfassung":** Объясните точно, что написано в тексте изображения, и обобщите все важные ключевые утверждения. Используйте легко понятный русский язык и короткие, ясные предложения. Где уместно, цитируйте ключевые термины или короткие фразы дословно. Начните вывод точно с: "Вот простое резюме:" и не добавляйте второго заголовка.
      *   **Если выбрано "Wichtigste Kernaussagen":** НАЧНИТЕ СРАЗУ с пунктов! Дайте ТОЛЬКО 3-5 пунктов, БЕЗ любого введения типа "Изображение содержит" или "Текст включает". Каждый пункт начинается прямо с "- " и содержит 1-2 коротких, информативных предложения с конкретными фактами из содержимого изображения. ЗАПРЕЩЕНО: мета-описания, заголовки, введения, объяснения о самом изображении. Пишите прямо содержимое, а не о содержимом!
    `;
  } else if (outputLanguage === 'English') {
    prompt = `
      **ROLE:**
      You are a brilliant AI assistant with the ability to read and understand text in images. Your main task is to analyze complex information and make it understandable for everyone. You act as a bridge between complicated technical jargon and everyday language.

      **TASK:**
      1.  **Text Recognition (OCR):** Perform precise text recognition on the attached image.
      2.  **Analysis & Simplification:** Analyze the recognized text and simplify its content according to the user's chosen [TARGET_AUDIENCE/STYLE].
      3.  **Translation & Output:** Provide the result exclusively in the chosen [OUTPUT_LANGUAGE].

      **INPUTS:**
      1.  **[IMAGE]:** (The user's uploaded photo will be passed to the API here)
      2.  **[TARGET_AUDIENCE/STYLE]:** ${targetAudience}
      3.  **[OUTPUT_LANGUAGE]:** ${outputLanguage}

      **PROCESSING INSTRUCTIONS:**
      *   Your first priority is accurate capture of text from the image. Ignore irrelevant image elements.
      *   Describe precisely what the image text says and how the text is structured (e.g. headings, paragraphs, lists, tables, diagrams, numbers/units, labels). Where helpful, quote short, important text passages verbatim in quotation marks.
      *   Adapt style, tone, and complexity of your response exactly to the chosen [TARGET_AUDIENCE/STYLE].
      *   The output must be complete and error-free in the chosen [OUTPUT_LANGUAGE].
      *   Provide the simplified text. If "Einfache Zusammenfassung" is chosen, BEGIN the output exactly with: "Here is a Simple Summary:" (with exactly this spelling). If "Wichtigste Kernaussagen" is chosen, START IMMEDIATELY with the first bullet point "- " - NO introduction, no "The image contains", no meta-descriptions. In all other cases: no additional comments or introductions.
      *   Important: The key points may only refer to the text in the image. Content from this prompt (e.g. headings "TASK", "PROCESSING INSTRUCTIONS", "TARGET AUDIENCE DEFINITIONS", terms like "Text Recognition (OCR)") must NEVER appear as key points.

      **TARGET AUDIENCE/STYLE DEFINITIONS:**
      *   **If "Einfache Zusammenfassung" was chosen:** Explain exactly what the image text says and summarize all important key points. Use easily understandable English and short, clear sentences. Where appropriate, quote key terms or short phrases verbatim. Begin the output exactly with: "Here is a Simple Summary:" and add no second heading.
      *   **If "Wichtigste Kernaussagen" was chosen:** START IMMEDIATELY with the bullet points! Provide ONLY 3-5 bullet points, WITHOUT any introduction like "The image contains" or "The text includes". Each point begins directly with "- " and contains 1-2 short, informative sentences with concrete facts from the image content. FORBIDDEN: meta-descriptions, headings, introductions, explanations about the image itself. Write the content directly, not about the content!
    `;
  } else {
    // German (default) - ORIGINAL BEWÄHRTES PROMPT
    prompt = `
      **ROLLE:**
      Du bist ein brillanter KI-Assistent mit der Fähigkeit, Text in Bildern zu lesen und zu verstehen. Deine Hauptaufgabe ist es, komplexe Informationen zu analysieren und sie für jeden verständlich zu machen. Du agierst als Brücke zwischen kompliziertem Fachjargon und alltäglicher Sprache.

      **AUFGABE:**
      1.  **Texterkennung (OCR):** Führe eine präzise Texterkennung auf dem angehängten Bild durch.
      2.  **Analyse & Vereinfachung:** Analysiere den erkannten Text und vereinfache seinen Inhalt gemäß der vom Nutzer gewählten [ZIELGRUPPE/STIL].
      3.  **Übersetzung & Ausgabe:** Gib das Ergebnis ausschließlich in der gewählten [AUSGABESPRACHE] aus.

      **INPUTS:**
      1.  **[BILD]:** (Das vom Nutzer aufgenommene Foto wird hier an die API übergeben)
      2.  **[ZIELGRUPPE/STIL]:** ${targetAudience}
      3.  **[AUSGABESPRACHE]:** ${outputLanguage}

      **ANWEISUNGEN FÜR DIE VERARBEITUNG:**
      *   Deine erste Priorität ist die genaue Erfassung des Textes aus dem Bild. Ignoriere irrelevante Bildelemente.
      *   Beschreibe präzise, was im Bild steht und wie der Text strukturiert ist (z. B. Überschriften, Absätze, Listen, Tabellen, Diagramme, Zahlen/Einheiten, Labels). Wo hilfreich, zitiere kurze, wichtige Textstellen wörtlich in Anführungszeichen.
      *   Passe Stil, Tonalität und Komplexität deiner Antwort exakt an die gewählte [ZIELGRUPPE/STIL] an.
      *   Die Ausgabe muss vollständig und fehlerfrei in der gewählten [AUSGABESPRACHE] sein.
      *   Gib den vereinfachten Text aus. Wenn "Einfache Zusammenfassung" gewählt ist, BEGINNE die Ausgabe exakt mit: "Hier ist eine Einfache Zusammenfassung:" (mit genau dieser Schreibweise). Wenn "Wichtigste Kernaussagen" gewählt ist, BEGINNE SOFORT mit dem ersten Stichpunkt "- " - KEINE Einleitung, kein "Das Bild enthält", keine Meta-Beschreibung. In allen anderen Fällen: keine zusätzlichen Kommentare oder Einleitungen.
      *   Wichtig: Die Kernaussagen dürfen sich ausschließlich auf den Text im Bild beziehen. Inhalte aus diesem Prompt (z. B. die Überschriften "AUFGABE", "ANWEISUNGEN FÜR DIE VERARBEITUNG", "DEFINITIONEN DER ZIELGRUPPEN/STILE", Begriffe wie "Texterkennung (OCR)") dürfen NIEMALS als Kernaussage erscheinen.

      **DEFINITIONEN DER ZIELGRUPPEN/STILE:**
      *   **Wenn "Einfache Zusammenfassung" gewählt wurde:** Erkläre genau, was im Bildtext steht, und fasse alle wichtigen Kernaussagen zusammen. Nutze leicht verständliche Sprache (einfache/leichte Sprache) und kurze, klare Sätze. Wo sinnvoll, zitiere markante Schlüsselbegriffe oder kurze Phrasen wörtlich. Beginne die Ausgabe exakt mit: "Hier ist eine Einfache Zusammenfassung:" und füge keine zweite Überschrift hinzu.
      *   **Wenn "Wichtigste Kernaussagen" gewählt wurde:** BEGINNE SOFORT mit den Stichpunkten! Gib NUR 3–5 Stichpunkte aus, OHNE jede Einleitung wie "Das Bild enthält" oder "Der Text beinhaltet". Jeder Punkt beginnt direkt mit „- " und enthält 1–2 kurze, informative Sätze mit konkreten Fakten aus dem Bildinhalt. VERBOTEN: Meta-Beschreibungen, Überschriften, Einleitungen, Erklärungen über das Bild selbst. Schreibe direkt die Inhalte, nicht über die Inhalte!
    `;
  }

  // Debug: Show what prompt is being used
  console.log('Using prompt for language:', outputLanguage, 'with config:', langConfig);
  console.log('Final prompt:', prompt);
  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${imageMimeType};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      model: model,
      temperature: 0.3,
      max_tokens: 1024
    });
    
  let responseText = (response.choices[0]?.message?.content || '').trim();

  // Clean up unwanted special characters and artifacts
  responseText = cleanResponseText(responseText);

  // Ensure final text is in the selected output language (fallback translation if mixed)
  responseText = await ensureTargetLanguage(responseText, outputLanguage, targetAudience, langConfig);

    // Safeguard & cleanup for "Einfache Zusammenfassung" (language-aware)
    if (targetAudience === 'Einfache Zusammenfassung') {
      // Entferne generische Überschriften wie "Zusammenfassung", "Summary", "Резюме" in der ersten Zeile
      const lines = responseText.split(/\r?\n/);
      const firstLine = (lines[0] || '').trim();
      if (/(zusammenfassung|summary|резюме)/i.test(firstLine)) {
        lines.shift();
        responseText = lines.join('\n').trim();
      }

      // Präfix je nach Sprache sicherstellen
      const prefix = langConfig.summaryPrefix || 'Hier ist eine Einfache Zusammenfassung:';
      if (!responseText.toLowerCase().startsWith(prefix.toLowerCase())) {
        responseText = `${prefix}\n\n${responseText}`;
      }
    }

    // Post-processing for "Wichtigste Kernaussagen": normalize to bullets and enforce 3–5 items
    if (targetAudience === 'Wichtigste Kernaussagen') {
      // Split into lines, keep only non-empty, trim bullets
      let lines = responseText
        .split(/\r?\n+/)
        .map(l => l.replace(/^[-•\*]\s*/, '').trim())
        .filter(l => l.length > 0);

  // Remove lines that echo prompt meta in multiple languages (DE/EN/RU)
  const metaPattern = /(texterkennung|\bocr\b|aufgabe|anweisungen|definitionen|inputs|rolle|task|instructions|definitions|role|input|входные|задача|инструкции|определения|роль)/i;
      lines = lines.filter(l => !metaPattern.test(l));

      // If the model returned paragraphs, attempt to split sentences
      if (lines.length <= 1) {
        lines = responseText
          .split(/(?<=[\.\!\?])\s+/)
          .map(s => s.trim())
          .filter(Boolean);
      }

      // Limit to 3–5 items (allow slightly more detailed bullets via 1–2 sentences)
      if (lines.length > 5) lines = lines.slice(0, 5);
      if (lines.length < 3 && lines.length > 0) {
        // keep as-is (between 1-2) rather than fabricate points
      }

      responseText = lines.map(l => `- ${l}`).join('\n');
    }

    resultText.innerHTML = responseText.replace(/\n/g, '<br>');
    if (responseText) {
        copyBtn.classList.remove('hidden');
        readAloudBtn.classList.remove('hidden');
    }

  } catch (error) {
    console.error("Error calling Groq API:", error);
    showError(i18n.t('error_analysis'));
  } finally {
    setLoading(false);
  }
}


// --- Event Listeners ---
imageUploadInput.addEventListener('change', handleImageSelection);
removeImageBtn.addEventListener('click', resetImageSelection);
analyzeBtn.addEventListener('click', analyzeImage);
copyBtn.addEventListener('click', handleCopyClick);
readAloudBtn.addEventListener('click', handleReadAloudClick);
langToggle?.addEventListener('click', () => {
  i18n.toggleLanguage();
});