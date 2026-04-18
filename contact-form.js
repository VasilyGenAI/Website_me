let successPopupTimeout = null;
const uiLang = getUiLang();
const SERVICE_VALUE_MAP = {
  'home-s': {
    de: 'Paket S: Das Kickstart-Setup',
    en: 'Package S: The Kickstart Setup',
    uk: 'Пакет S: Стартовий сетап',
  },
  'home-m': {
    de: 'Paket M: Der MVP-Builder',
    en: 'Package M: The MVP Builder',
    uk: 'Пакет M: MVP Builder',
  },
  'home-l': {
    de: 'Paket L: Der Solo-Founder Companion',
    en: 'Package L: The Solo-Founder Companion',
    uk: 'Пакет L: Solo-Founder Companion',
  },
  'website-s': {
    de: 'Paket S: Der digitale Schnellstarter',
    en: 'Package S: The Digital Quickstart',
    uk: 'Пакет S: Швидкий цифровий старт',
  },
  'website-m': {
    de: 'Paket M: Das Business-Fundament',
    en: 'Package M: The Business Foundation',
    uk: 'Пакет M: Бізнес-фундамент',
  },
  'startup-s': {
    de: 'Paket S: Der Strategie-Kompass',
    en: 'Package S: The Strategy Compass',
    uk: 'Пакет S: Стратегічний компас',
  },
  'startup-m': {
    de: 'Paket M: Das Gründungs-Intensiv',
    en: 'Package M: The Founder Intensive',
    uk: 'Пакет M: Інтенсив запуску',
  },
  'startup-l': {
    de: 'Paket L: Der Startup Companion',
    en: 'Package L: The Startup Companion',
    uk: 'Пакет L: Startup Companion',
  },
};
const SUCCESS_POPUP_TEXT = {
  de: {
    title: 'Danke!',
    message: 'Ich versuche so schnell wie möglich auf deine Anfrage zu reagieren.',
    close: 'Schließen',
  },
  en: {
    title: 'Thank you!',
    message: 'I will try to respond to your request as quickly as possible.',
    close: 'Close',
  },
  uk: {
    title: 'Дякую!',
    message: 'Я постараюся відповісти на ваш запит якомога швидше.',
    close: 'Закрити',
  },
};

initializeContactAndPricing();
document.addEventListener('schob:content-updated', initializeContactAndPricing);

function initializeContactAndPricing() {
  const contactForm = document.getElementById('contact-form');
  const contactNext = document.getElementById('contact-next');
  const contactUrl = document.getElementById('contact-url');
  const contactSuccess = document.getElementById('contact-success');
  const cleanPageUrl = new URL(window.location.href);

  if (contactForm && contactNext && contactUrl) {
    const successUrl = new URL(cleanPageUrl.toString());
    successUrl.searchParams.set('contact', 'success');
    successUrl.hash = 'coaching';

    contactNext.value = successUrl.toString();
    cleanPageUrl.searchParams.delete('contact');
    contactUrl.value = cleanPageUrl.toString();

    const params = new URLSearchParams(window.location.search);
    if (params.get('contact') === 'success' && contactSuccess) {
      contactSuccess.hidden = true;
      showSuccessPopup();

      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('contact');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }

  bindPackageRequestTriggers();
}

function showSuccessPopup() {
  const existingPopup = document.querySelector('.contact-success-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement('aside');
  const content = SUCCESS_POPUP_TEXT[uiLang];

  popup.className = 'contact-success-popup card-glass';
  popup.setAttribute('role', 'status');
  popup.setAttribute('aria-live', 'polite');
  popup.innerHTML = `
    <button class="contact-success-popup__close" type="button" aria-label="${content.close}">×</button>
    <p class="eyebrow eyebrow--dark contact-success-popup__eyebrow">${content.title}</p>
    <p class="contact-success-popup__message">${content.message}</p>
  `;

  const closeButton = popup.querySelector('.contact-success-popup__close');
  closeButton?.addEventListener('click', () => dismissSuccessPopup(popup));

  document.body.appendChild(popup);

  successPopupTimeout = window.setTimeout(() => {
    dismissSuccessPopup(popup);
  }, 10000);
}

function dismissSuccessPopup(popup) {
  if (successPopupTimeout) {
    window.clearTimeout(successPopupTimeout);
    successPopupTimeout = null;
  }

  popup.classList.add('contact-success-popup--closing');
  window.setTimeout(() => {
    popup.remove();
  }, 220);
}

function bindPackageRequestTriggers() {
  const packageTriggers = document.querySelectorAll('[data-service-key]');

  packageTriggers.forEach((trigger) => {
    if (trigger.dataset.serviceBound === 'true') {
      return;
    }

    trigger.addEventListener('click', (event) => {
      event.preventDefault();

      const serviceKey = trigger.getAttribute('data-service-key') || '';
      const selectedPackage = getPackageValueForKey(serviceKey, trigger);

      if (!selectedPackage) {
        return;
      }

      writeSelectedPackage(selectedPackage);
      scrollToContactForm();
    });

    trigger.dataset.serviceBound = 'true';
  });
}

function writeSelectedPackage(selectedPackage) {
  if (!selectedPackage) {
    return;
  }

  const applyValue = () => {
    const liveContactService = document.getElementById('contact-service');

    if (!(liveContactService instanceof HTMLInputElement)) {
      return;
    }

    liveContactService.value = selectedPackage;
    liveContactService.setAttribute('value', selectedPackage);
    liveContactService.dispatchEvent(new Event('input', { bubbles: true }));
    liveContactService.dispatchEvent(new Event('change', { bubbles: true }));
  };

  applyValue();
  window.requestAnimationFrame(applyValue);
  window.setTimeout(applyValue, 80);
  window.setTimeout(applyValue, 260);
}

function getPackageValueForKey(serviceKey, trigger) {
  const serviceValues = SERVICE_VALUE_MAP[serviceKey];

  if (serviceValues?.[uiLang]) {
    return serviceValues[uiLang];
  }

  return trigger.getAttribute('data-package-request') || '';
}

function scrollToContactForm() {
  const liveContactForm = document.getElementById('contact-form');
  const liveContactMessage = document.getElementById('contact-message');

  liveContactForm?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });

  window.setTimeout(() => {
    const liveContactService = document.getElementById('contact-service');

    if (liveContactService instanceof HTMLElement) {
      liveContactService.focus();
      liveContactService.select?.();
    } else if (liveContactMessage instanceof HTMLElement) {
      liveContactMessage.focus();
    }
  }, 320);
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
