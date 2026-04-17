let packageButtonsBound = false;
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

function initializeContactAndPricing() {
  const contactForm = document.getElementById('contact-form');
  const contactNext = document.getElementById('contact-next');
  const contactUrl = document.getElementById('contact-url');
  const contactSuccess = document.getElementById('contact-success');

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

  if (!packageButtonsBound) {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-package-request]');
      if (!button) {
        return;
      }

      const liveContactForm = document.getElementById('contact-form');
      const liveContactService = document.getElementById('contact-service');
      const liveContactMessage = document.getElementById('contact-message');
      const selectedPackage = button.getAttribute('data-package-request');

      if (liveContactService && selectedPackage) {
        liveContactService.value = selectedPackage;
      }

      liveContactForm?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      window.setTimeout(() => {
        if (liveContactService instanceof HTMLElement) {
          liveContactService.focus();
        } else if (liveContactMessage instanceof HTMLElement) {
          liveContactMessage.focus();
        }
      }, 320);
    });
    packageButtonsBound = true;
  }
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
