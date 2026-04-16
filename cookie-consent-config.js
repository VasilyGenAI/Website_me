const COOKIE_NAME = 'schob_cookie_consent';
const COOKIE_MAX_AGE_DAYS = 180;
const GA_MEASUREMENT_ID = document.body.dataset.gaMeasurementId || '';
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
      <p class="cookie-banner__eyebrow">Cookies & Analytics</p>
      <h2>Du entscheidest, welche Cookies aktiv sind.</h2>
      <p>
        Wir verwenden ein notwendiges Consent-Cookie und optional Google Analytics, um zu verstehen,
        wie Besucher die Website nutzen. Deine Auswahl kannst du jederzeit wieder ändern.
      </p>
      <div class="cookie-banner__actions">
        <button class="button button--ghost" type="button" data-cookie-action="accept-necessary">Nur notwendige</button>
        <button class="button button--ghost" type="button" data-open-cookie-settings>Einstellungen</button>
        <button class="button button--primary" type="button" data-cookie-action="accept-all">Alle akzeptieren</button>
      </div>
    </div>
  `;

  const modal = document.createElement('div');
  modal.className = 'cookie-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="cookie-modal__backdrop" data-cookie-action="close-modal"></div>
    <div class="cookie-modal__dialog card-glass" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
      <button class="cookie-modal__close" type="button" data-cookie-action="close-modal">Schließen</button>
      <p class="eyebrow eyebrow--dark">Cookie-Einstellungen</p>
      <h2 id="cookie-settings-title">Wähle deine Cookie-Kategorien</h2>
      <p class="cookie-modal__intro">
        Notwendige Cookies sichern die Grundfunktion der Website. Google Analytics wird nur aktiviert,
        wenn du ausdrücklich zustimmst.
      </p>

      <section class="cookie-category">
        <div class="cookie-category__header">
          <div>
            <p class="cookie-category__title">Notwendige Cookies</p>
            <p>Erforderlich, damit der Cookie-Banner deine Auswahl speichern kann.</p>
          </div>
          <label class="cookie-toggle" aria-label="Notwendige Cookies aktiviert">
            <input type="checkbox" checked disabled>
            <span aria-hidden="true"></span>
          </label>
        </div>
        <details>
          <summary>Weitere Informationen</summary>
          <ul>
            <li><strong>schob_cookie_consent</strong>, 6 Monate, speichert deine Auswahl im Cookie-Banner.</li>
          </ul>
        </details>
      </section>

      <section class="cookie-category">
        <div class="cookie-category__header">
          <div>
            <p class="cookie-category__title">Google Analytics</p>
            <p>Optional, um Seitenaufrufe und Nutzungsmuster auszuwerten.</p>
          </div>
          <label class="cookie-toggle" aria-label="Google Analytics aktivieren">
            <input id="cookie-analytics-toggle" type="checkbox">
            <span aria-hidden="true"></span>
          </label>
        </div>
        <details>
          <summary>Weitere Informationen</summary>
          <ul>
            <li><strong>_ga</strong>, 2 Jahre, unterscheidet Nutzerinnen und Nutzer.</li>
            <li><strong>_ga_*</strong>, 2 Jahre, speichert den Sitzungsstatus.</li>
            <li><strong>_gid</strong>, 24 Stunden, erkennt Nutzerinnen und Nutzer für einen Tag.</li>
            <li><strong>_gat_*</strong>, 1 Minute, drosselt die Anforderungsrate.</li>
          </ul>
        </details>
      </section>

      <div class="cookie-modal__actions">
        <button class="button button--ghost" type="button" data-cookie-action="accept-necessary">Nur notwendige</button>
        <button class="button button--ghost" type="button" data-cookie-action="save-preferences">Auswahl speichern</button>
        <button class="button button--primary" type="button" data-cookie-action="accept-all">Alle akzeptieren</button>
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
