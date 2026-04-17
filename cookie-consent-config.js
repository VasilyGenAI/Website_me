const COOKIE_NAME = 'schob_cookie_consent';
const COOKIE_MAX_AGE_DAYS = 180;
const GA_MEASUREMENT_ID = document.body.dataset.gaMeasurementId || '';
const uiLang = getUiLang();
const COOKIE_TEXT = {
  de: {
    bannerEyebrow: 'Cookies & Analytics',
    bannerTitle: 'Du entscheidest, welche Cookies aktiv sind.',
    bannerText: 'Wir verwenden ein notwendiges Consent-Cookie und optional Google Analytics, um zu verstehen, wie Besucher die Website nutzen. Deine Auswahl kannst du jederzeit wieder ändern.',
    acceptNecessary: 'Nur notwendige',
    settings: 'Einstellungen',
    acceptAll: 'Alle akzeptieren',
    close: 'Schließen',
    modalEyebrow: 'Cookie-Einstellungen',
    modalTitle: 'Wähle deine Cookie-Kategorien',
    modalIntro: 'Notwendige Cookies sichern die Grundfunktion der Website. Google Analytics wird nur aktiviert, wenn du ausdrücklich zustimmst.',
    necessaryTitle: 'Notwendige Cookies',
    necessaryText: 'Erforderlich, damit der Cookie-Banner deine Auswahl speichern kann.',
    necessaryAria: 'Notwendige Cookies aktiviert',
    moreInfo: 'Weitere Informationen',
    analyticsTitle: 'Google Analytics',
    analyticsText: 'Optional, um Seitenaufrufe und Nutzungsmuster auszuwerten.',
    analyticsAria: 'Google Analytics aktivieren',
    savePreferences: 'Auswahl speichern',
    necessaryCookieInfo: '<strong>schob_cookie_consent</strong>, 6 Monate, speichert deine Auswahl im Cookie-Banner.',
    analyticsCookieInfo: [
      '<strong>_ga</strong>, 2 Jahre, unterscheidet Nutzerinnen und Nutzer.',
      '<strong>_ga_*</strong>, 2 Jahre, speichert den Sitzungsstatus.',
      '<strong>_gid</strong>, 24 Stunden, erkennt Nutzerinnen und Nutzer für einen Tag.',
      '<strong>_gat_*</strong>, 1 Minute, drosselt die Anforderungsrate.',
    ],
  },
  en: {
    bannerEyebrow: 'Cookies & Analytics',
    bannerTitle: 'You decide which cookies stay active.',
    bannerText: 'We use one essential consent cookie and optional Google Analytics to understand how visitors use the website. You can change your choice at any time.',
    acceptNecessary: 'Necessary only',
    settings: 'Settings',
    acceptAll: 'Accept all',
    close: 'Close',
    modalEyebrow: 'Cookie settings',
    modalTitle: 'Choose your cookie categories',
    modalIntro: 'Necessary cookies secure the basic functionality of the website. Google Analytics is only activated if you explicitly consent.',
    necessaryTitle: 'Necessary cookies',
    necessaryText: 'Required so the cookie banner can remember your selection.',
    necessaryAria: 'Necessary cookies enabled',
    moreInfo: 'More information',
    analyticsTitle: 'Google Analytics',
    analyticsText: 'Optional, used to evaluate page views and usage patterns.',
    analyticsAria: 'Enable Google Analytics',
    savePreferences: 'Save selection',
    necessaryCookieInfo: '<strong>schob_cookie_consent</strong>, 6 months, stores your selection in the cookie banner.',
    analyticsCookieInfo: [
      '<strong>_ga</strong>, 2 years, distinguishes users.',
      '<strong>_ga_*</strong>, 2 years, stores session status.',
      '<strong>_gid</strong>, 24 hours, recognizes users for one day.',
      '<strong>_gat_*</strong>, 1 minute, throttles request rates.',
    ],
  },
  uk: {
    bannerEyebrow: 'Cookies та Analytics',
    bannerTitle: 'Ви вирішуєте, які cookies будуть активні.',
    bannerText: 'Я використовую один обов’язковий cookie для збереження згоди та опційно Google Analytics, щоб розуміти, як відвідувачі користуються сайтом. Ви можете змінити свій вибір у будь-який момент.',
    acceptNecessary: 'Лише необхідні',
    settings: 'Налаштування',
    acceptAll: 'Прийняти все',
    close: 'Закрити',
    modalEyebrow: 'Налаштування cookie',
    modalTitle: 'Оберіть категорії cookie',
    modalIntro: 'Необхідні cookies забезпечують базову роботу сайту. Google Analytics активується лише після вашої прямої згоди.',
    necessaryTitle: 'Необхідні cookies',
    necessaryText: 'Потрібні, щоб банер cookie міг зберегти ваш вибір.',
    necessaryAria: 'Необхідні cookies увімкнені',
    moreInfo: 'Детальніше',
    analyticsTitle: 'Google Analytics',
    analyticsText: 'Необов’язково, для аналізу переглядів сторінок і моделей використання.',
    analyticsAria: 'Увімкнути Google Analytics',
    savePreferences: 'Зберегти вибір',
    necessaryCookieInfo: '<strong>schob_cookie_consent</strong>, 6 місяців, зберігає ваш вибір у банері cookie.',
    analyticsCookieInfo: [
      '<strong>_ga</strong>, 2 роки, розрізняє користувачів.',
      '<strong>_ga_*</strong>, 2 роки, зберігає стан сесії.',
      '<strong>_gid</strong>, 24 години, розпізнає користувачів протягом одного дня.',
      '<strong>_gat_*</strong>, 1 хвилина, обмежує частоту запитів.',
    ],
  },
};
const t = COOKIE_TEXT[uiLang];
const defaultConsent = {
  necessary: true,
  analytics: false,
  updatedAt: null,
};

const cookieUi = createCookieUi();
const consent = getStoredConsent();

window.SchobCookieConsent = {
  openPreferences,
};

document.body.append(cookieUi.banner, cookieUi.modal);
bindCookieEvents();

if (consent) {
  syncUi(consent);
  applyConsent(consent);
} else {
  showBanner();
}

function bindCookieEvents() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-cookie-settings]');
    if (trigger) {
      event.preventDefault();
      openPreferences();
      return;
    }

    const action = event.target.closest('[data-cookie-action]');
    if (!action) {
      return;
    }

    const type = action.getAttribute('data-cookie-action');

    if (type === 'accept-all') {
      saveConsent({
        necessary: true,
        analytics: true,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (type === 'accept-necessary') {
      saveConsent({
        necessary: true,
        analytics: false,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (type === 'save-preferences') {
      saveConsent({
        necessary: true,
        analytics: cookieUi.analyticsInput.checked,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (type === 'close-modal') {
      closePreferences();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePreferences();
    }
  });
}

function createCookieUi() {
  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.hidden = true;
  banner.innerHTML = `
    <div class="cookie-banner__panel">
      <p class="cookie-banner__eyebrow">${t.bannerEyebrow}</p>
      <h2>${t.bannerTitle}</h2>
      <p>
        ${t.bannerText}
      </p>
      <div class="cookie-banner__actions">
        <button class="button button--ghost" type="button" data-cookie-action="accept-necessary">${t.acceptNecessary}</button>
        <button class="button button--ghost" type="button" data-open-cookie-settings>${t.settings}</button>
        <button class="button button--primary" type="button" data-cookie-action="accept-all">${t.acceptAll}</button>
      </div>
    </div>
  `;

  const modal = document.createElement('div');
  modal.className = 'cookie-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="cookie-modal__backdrop" data-cookie-action="close-modal"></div>
    <div class="cookie-modal__dialog card-glass" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
      <button class="cookie-modal__close" type="button" data-cookie-action="close-modal">${t.close}</button>
      <p class="eyebrow eyebrow--dark">${t.modalEyebrow}</p>
      <h2 id="cookie-settings-title">${t.modalTitle}</h2>
      <p class="cookie-modal__intro">
        ${t.modalIntro}
      </p>

      <section class="cookie-category">
        <div class="cookie-category__header">
          <div>
            <p class="cookie-category__title">${t.necessaryTitle}</p>
            <p>${t.necessaryText}</p>
          </div>
          <label class="cookie-toggle" aria-label="${t.necessaryAria}">
            <input type="checkbox" checked disabled>
            <span aria-hidden="true"></span>
          </label>
        </div>
        <details>
          <summary>${t.moreInfo}</summary>
          <ul>
            <li>${t.necessaryCookieInfo}</li>
          </ul>
        </details>
      </section>

      <section class="cookie-category">
        <div class="cookie-category__header">
          <div>
            <p class="cookie-category__title">${t.analyticsTitle}</p>
            <p>${t.analyticsText}</p>
          </div>
          <label class="cookie-toggle" aria-label="${t.analyticsAria}">
            <input id="cookie-analytics-toggle" type="checkbox">
            <span aria-hidden="true"></span>
          </label>
        </div>
        <details>
          <summary>${t.moreInfo}</summary>
          <ul>
            ${t.analyticsCookieInfo.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </details>
      </section>

      <div class="cookie-modal__actions">
        <button class="button button--ghost" type="button" data-cookie-action="accept-necessary">${t.acceptNecessary}</button>
        <button class="button button--ghost" type="button" data-cookie-action="save-preferences">${t.savePreferences}</button>
        <button class="button button--primary" type="button" data-cookie-action="accept-all">${t.acceptAll}</button>
      </div>
    </div>
  `;

  return {
    banner,
    modal,
    analyticsInput: modal.querySelector('#cookie-analytics-toggle'),
  };
}

function openPreferences() {
  const storedConsent = getStoredConsent() || defaultConsent;

  cookieUi.analyticsInput.checked = Boolean(storedConsent.analytics);
  cookieUi.modal.hidden = false;
  document.body.classList.add('cookie-modal-open');
}

function closePreferences() {
  cookieUi.modal.hidden = true;
  document.body.classList.remove('cookie-modal-open');
}

function showBanner() {
  cookieUi.banner.hidden = false;
}

function hideBanner() {
  cookieUi.banner.hidden = true;
}

function saveConsent(nextConsent) {
  const normalizedConsent = {
    necessary: true,
    analytics: Boolean(nextConsent.analytics),
    updatedAt: nextConsent.updatedAt || new Date().toISOString(),
  };

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(normalizedConsent))}; max-age=${COOKIE_MAX_AGE_DAYS * 24 * 60 * 60}; path=/; SameSite=Lax`;

  syncUi(normalizedConsent);
  applyConsent(normalizedConsent);
  hideBanner();
  closePreferences();
}

function syncUi(currentConsent) {
  cookieUi.analyticsInput.checked = Boolean(currentConsent.analytics);
}

function getStoredConsent() {
  const storedValue = getCookie(COOKIE_NAME);

  if (!storedValue) {
    return null;
  }

  try {
    return {
      ...defaultConsent,
      ...JSON.parse(decodeURIComponent(storedValue)),
      necessary: true,
    };
  } catch {
    return null;
  }
}

function getCookie(name) {
  const entry = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`));

  return entry ? entry.split('=').slice(1).join('=') : '';
}

function applyConsent(currentConsent) {
  if (currentConsent.analytics) {
    enableAnalytics();
    return;
  }

  disableAnalytics();
}

function enableAnalytics() {
  if (!GA_MEASUREMENT_ID || window.__schobAnalyticsLoaded) {
    if (GA_MEASUREMENT_ID) {
      window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
    }
    return;
  }

  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  const analyticsScript = document.createElement('script');
  analyticsScript.async = true;
  analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  analyticsScript.onload = () => {
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
    });
  };

  document.head.appendChild(analyticsScript);
  window.__schobAnalyticsLoaded = true;
}

function disableAnalytics() {
  if (GA_MEASUREMENT_ID) {
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  }

  for (const name of document.cookie.split('; ').map((entry) => entry.split('=')[0])) {
    if (/^_ga($|_)/.test(name) || /^_gid$/.test(name) || /^_gat/.test(name)) {
      expireCookie(name);
    }
  }
}

function expireCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
  document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}`;

  if (location.hostname.includes('.')) {
    const rootDomain = location.hostname.split('.').slice(-2).join('.');
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${rootDomain}`;
  }
}

function getUiLang() {
  const lang = document.documentElement.lang.toLowerCase();

  if (lang.startsWith('en')) {
    return 'en';
  }

  if (lang.startsWith('uk')) {
    return 'uk';
  }

  return 'de';
}
