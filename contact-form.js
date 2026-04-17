let successPopupTimeout = null;
let packageClickStorageBound = false;
const uiLang = getUiLang();
const PACKAGE_STORAGE_KEY = 'schob_selected_package';
const PACKAGE_MATCHES = {
  home: {
    de: {
      s: 'Paket S: Das Kickstart-Setup',
      m: 'Paket M: Der MVP-Builder',
      l: 'Paket L: Der Solo-Founder Companion',
    },
    en: {
      s: 'Package S: The Kickstart Setup',
      m: 'Package M: The MVP Builder',
      l: 'Package L: The Solo-Founder Companion',
    },
    uk: {
      s: 'Пакет S: Стартовий сетап',
      m: 'Пакет M: MVP Builder',
      l: 'Пакет L: Solo-Founder Companion',
    },
  },
  website: {
    de: {
      s: 'Paket S: Der digitale Schnellstarter',
      m: 'Paket M: Das Business-Fundament',
    },
    en: {
      s: 'Package S: The Digital Quickstart',
      m: 'Package M: The Business Foundation',
    },
    uk: {
      s: 'Пакет S: Швидкий цифровий старт',
      m: 'Пакет M: Бізнес-фундамент',
    },
  },
  startup: {
    de: {
      s: 'Paket S: Der Strategie-Kompass',
      m: 'Paket M: Das Gründungs-Intensiv',
      l: 'Paket L: Der Startup Companion',
    },
    en: {
      s: 'Package S: The Strategy Compass',
      m: 'Package M: The Founder Intensive',
      l: 'Package L: The Startup Companion',
    },
    uk: {
      s: 'Пакет S: Стратегічний компас',
      m: 'Пакет M: Інтенсив запуску',
      l: 'Пакет L: Startup Companion',
    },
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
  const contactService = document.getElementById('contact-service');

  if (contactForm && contactNext && contactUrl) {
    const successUrl = new URL(window.location.href);
    successUrl.searchParams.set('contact', 'success');
    successUrl.hash = 'coaching';

    contactNext.value = successUrl.toString();
    contactUrl.value = window.location.href;

    const params = new URLSearchParams(window.location.search);
    if (params.get('contact') === 'success' && contactSuccess) {
      contactSuccess.hidden = true;
      showSuccessPopup();

      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('contact');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }

  applySelectedPackage(contactService);
  bindPackageRequestStorage();
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

function applySelectedPackage(contactService) {
  if (!contactService) {
    return;
  }

  const selectedPackage = window.sessionStorage.getItem(PACKAGE_STORAGE_KEY);

  if (!selectedPackage) {
    return;
  }

  writeSelectedPackage(selectedPackage);
}

function bindPackageRequestStorage() {
  if (packageClickStorageBound) {
    return;
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-package-request]');

    if (!trigger) {
      return;
    }

    const selectedPackage = resolvePackageSelection(trigger);

    if (selectedPackage) {
      event.preventDefault();
      window.sessionStorage.setItem(PACKAGE_STORAGE_KEY, selectedPackage);
      fillAndScrollToContact(selectedPackage);
    }
  });

  packageClickStorageBound = true;
}

function fillAndScrollToContact(selectedPackage) {
  const liveContactForm = document.getElementById('contact-form');
  const liveContactMessage = document.getElementById('contact-message');

  if (selectedPackage) {
    writeSelectedPackage(selectedPackage);
  }

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

function resolvePackageSelection(trigger) {
  const pricingCard = trigger.closest('.pricing-card');
  const cardTone = getPricingCardTone(pricingCard, trigger);
  const pageKey = getCurrentPageKey();
  const languagePackages = PACKAGE_MATCHES[pageKey]?.[uiLang];

  if (cardTone && languagePackages?.[cardTone]) {
    return languagePackages[cardTone];
  }

  const packageValueField = pricingCard?.querySelector('.pricing-card__package-value');

  if (packageValueField instanceof HTMLInputElement && packageValueField.value) {
    return packageValueField.value;
  }

  return trigger.getAttribute('data-package-request');
}

function getPricingCardTone(pricingCard, trigger) {
  const classSource = [
    pricingCard?.className || '',
    trigger.className || '',
  ].join(' ');

  if (classSource.includes('--s')) {
    return 's';
  }

  if (classSource.includes('--m')) {
    return 'm';
  }

  if (classSource.includes('--l')) {
    return 'l';
  }

  return '';
}

function getCurrentPageKey() {
  return document.body.dataset.page || 'home';
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
