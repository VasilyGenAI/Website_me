let successPopupTimeout = null;
const uiLang = getUiLang();
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
window.prefillService = prefillService;
window.prefillServiceFromTrigger = prefillServiceFromTrigger;

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

  bindDirectPackageTriggers();
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

function prefillService(selectedPackage) {
  if (!selectedPackage) {
    return false;
  }

  writeSelectedPackage(selectedPackage);
  scrollToContactForm();
  return false;
}

function prefillServiceFromTrigger(trigger) {
  if (!(trigger instanceof Element)) {
    return false;
  }

  return prefillService(trigger.getAttribute('data-package-request') || '');
}

function bindDirectPackageTriggers() {
  const packageTriggers = document.querySelectorAll('[data-package-request]');

  packageTriggers.forEach((trigger) => {
    if (!(trigger instanceof HTMLElement)) {
      return;
    }

    if (trigger.dataset.prefillBound === 'true') {
      return;
    }

    if (trigger instanceof HTMLAnchorElement && !trigger.getAttribute('href')) {
      trigger.setAttribute('href', '#coaching');
    }

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      prefillServiceFromTrigger(trigger);
    });

    trigger.dataset.prefillBound = 'true';
  });
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
