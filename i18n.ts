// Internationalization module for German/Russian
export type Language = 'de' | 'ru';

export const translations = {
  de: {
    // Login page
    login_title: 'Anmeldung',
    login_subtitle: 'Bitte melden Sie sich an, um die Anwendung zu nutzen.',
    username: 'Benutzername',
    password: 'Passwort',
    login_button: 'Anmelden',
    login_error_config: 'Konfiguration fehlt. Bitte wenden Sie sich an den Administrator.',
    login_error_invalid: 'Ungültige Zugangsdaten.',
    login_error_failed: 'Anmeldung fehlgeschlagen.',
    
    // Main app
    app_title: 'Klartext Kamera',
    app_subtitle: 'Komplexe Texte fotografieren und sofort verständlich erklärt bekommen.',
    upload_label: 'Bild hochladen / Foto aufnehmen',
    style_label: 'Zielgruppe/Stil',
    language_label: 'Ausgabesprache',
    analyze_button: 'Analysieren',
    analyzing: 'Analysiere...',
    result_title: 'Ergebnis',
    copy_button: 'Kopieren',
    copy_success: 'Kopiert!',
    copy_error: 'Fehler',
    read_aloud: 'Vorlesen',
    read_stop: 'Stopp',
    read_loading: 'Lade...',
    
    // Result messages
    result_ready: 'Das Bild ist zur Analyse bereit.',
    result_placeholder: 'Das Ergebnis der Analyse wird hier angezeigt.',
    error_no_image: 'Bitte wählen Sie zuerst ein Bild aus.',
    error_image_process: 'Das Bild konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.',
    error_analysis: 'Bei der Analyse des Bildes ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
    error_speech_failed: 'Sprachausgabe fehlgeschlagen.',
    error_speech_unsupported: 'Sprachausgabe wird in diesem Browser nicht unterstützt.',
    
    // Style options
    style_key_points: 'Wichtigste Kernaussagen',
    style_simple_summary: 'Einfache Zusammenfassung',
    
    // Output languages
    lang_german: 'Deutsch',
    lang_english: 'English',
    lang_french: 'Français',
    lang_spanish: 'Español',
    lang_italian: 'Italiano',
    lang_russian: 'Русский',
    
    // UI controls
    ui_language_toggle: 'RU'
  },
  
  ru: {
    // Login page
    login_title: 'Вход в систему',
    login_subtitle: 'Пожалуйста, войдите в систему, чтобы использовать приложение.',
    username: 'Имя пользователя',
    password: 'Пароль',
    login_button: 'Войти',
    login_error_config: 'Отсутствует конфигурация. Обратитесь к администратору.',
    login_error_invalid: 'Неверные учетные данные.',
    login_error_failed: 'Ошибка входа в систему.',
    
    // Main app
    app_title: 'Ясный Текст Камера',
    app_subtitle: 'Фотографируйте сложные тексты и получайте понятные объяснения.',
    upload_label: 'Загрузить изображение / Сделать фото',
    style_label: 'Целевая аудитория/Стиль',
    language_label: 'Язык вывода',
    analyze_button: 'Анализировать',
    analyzing: 'Анализирую...',
    result_title: 'Результат',
    copy_button: 'Копировать',
    copy_success: 'Скопировано!',
    copy_error: 'Ошибка',
    read_aloud: 'Прочитать вслух',
    read_stop: 'Стоп',
    read_loading: 'Загружаю...',
    
    // Result messages
    result_ready: 'Изображение готово к анализу.',
    result_placeholder: 'Результат анализа будет отображен здесь.',
    error_no_image: 'Пожалуйста, сначала выберите изображение.',
    error_image_process: 'Не удалось обработать изображение. Попробуйте еще раз.',
    error_analysis: 'Произошла ошибка при анализе изображения. Повторите попытку позже.',
    error_speech_failed: 'Ошибка воспроизведения речи.',
    error_speech_unsupported: 'Воспроизведение речи не поддерживается в этом браузере.',
    
    // Style options
    style_key_points: 'Основные тезисы',
    style_simple_summary: 'Простое резюме',
    
    // Output languages
    lang_german: 'Немецкий',
    lang_english: 'Английский',
    lang_french: 'Французский',
    lang_spanish: 'Испанский',
    lang_italian: 'Итальянский',
    lang_russian: 'Русский',
    
    // UI controls
    ui_language_toggle: 'DE'
  }
};

class I18n {
  private currentLang: Language = 'de';
  
  constructor() {
    // Load saved language or default to German
    const saved = localStorage.getItem('app_language') as Language;
    if (saved && (saved === 'de' || saved === 'ru')) {
      this.currentLang = saved;
    }
  }
  
  getCurrentLanguage(): Language {
    return this.currentLang;
  }
  
  setLanguage(lang: Language) {
    this.currentLang = lang;
    localStorage.setItem('app_language', lang);
    this.updateDOM();
  }
  
  toggleLanguage() {
    const newLang: Language = this.currentLang === 'de' ? 'ru' : 'de';
    this.setLanguage(newLang);
  }
  
  t(key: keyof typeof translations.de): string {
    return translations[this.currentLang][key] || translations.de[key] || key;
  }
  
  private updateDOM() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n') as keyof typeof translations.de;
      if (key) {
        if (el.tagName === 'INPUT' && (el as HTMLInputElement).placeholder !== undefined) {
          (el as HTMLInputElement).placeholder = this.t(key);
        } else if (el.tagName === 'OPTION') {
          (el as HTMLOptionElement).textContent = this.t(key);
        } else {
          el.textContent = this.t(key);
        }
      }
    });
    
    // Update language toggle button
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = this.t('ui_language_toggle');
    }
    
    // Update document title
    if (document.title.includes('Klartext') || document.title.includes('Ясный')) {
      document.title = this.currentLang === 'de' 
        ? 'Klartext Kamera' 
        : 'Ясный Текст Камера';
    }
    if (document.title.includes('Login') || document.title.includes('Вход')) {
      document.title = this.currentLang === 'de' 
        ? 'Login — Klartext Kamera' 
        : 'Вход — Ясный Текст Камера';
    }
  }
}

export const i18n = new I18n();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  i18n.setLanguage(i18n.getCurrentLanguage());
});