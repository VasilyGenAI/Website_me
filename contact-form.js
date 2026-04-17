const uiLang = getUiLang();
const PRICING_LABELS = {
  de: { more: 'Mehr', less: 'Weniger' },
  en: { more: 'More', less: 'Less' },
  uk: { more: 'Більше', less: 'Менше' },
};
let pricingBound = false;
let packageButtonsBound = false;

initializeContactAndPricing();
document.addEventListener('schob:content-updated', initializeContactAndPricing);

function initializeContactAndPricing() {
  const contactForm = document.getElementById('contact-form');
  const contactNext = document.getElementById('contact-next');
  const contactUrl = document.getElementById('contact-url');
  const contactSuccess = document.getElementById('contact-success');
  const contactService = document.getElementById('contact-service');
  const contactMessage = document.getElementById('contact-message');
  const pricingToggleButtons = Array.from(document.querySelectorAll('[data-pricing-toggle]'));
  const pricingDetails = Array.from(document.querySelectorAll('.pricing-card__details'));
  const packageRequestButtons = Array.from(document.querySelectorAll('[data-package-request]'));

  if (contactForm && contactNext && contactUrl) {
    const successUrl = new URL(window.location.href);
    successUrl.searchParams.set('contact', 'success');
    successUrl.hash = 'coaching';

    contactNext.value = successUrl.toString();
    contactUrl.value = window.location.href;

    const params = new URLSearchParams(window.location.search);
    if (params.get('contact') === 'success' && contactSuccess) {
      contactSuccess.hidden = false;

      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('contact');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }

  if (pricingToggleButtons.length) {
    setPricingExpanded(false, pricingDetails, pricingToggleButtons);

    if (!pricingBound) {
      document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-pricing-toggle]');
        if (!button) {
          return;
        }

        const liveButtons = Array.from(document.querySelectorAll('[data-pricing-toggle]'));
        const liveDetails = Array.from(document.querySelectorAll('.pricing-card__details'));
        const isExpanded = button.getAttribute('aria-expanded') === 'true';

        setPricingExpanded(!isExpanded, liveDetails, liveButtons);
      });
      pricingBound = true;
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

function setPricingExpanded(expanded, pricingDetails, pricingToggleButtons) {
  pricingDetails.forEach((details) => {
    details.hidden = !expanded;
  });

  pricingToggleButtons.forEach((button) => {
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? PRICING_LABELS[uiLang].less : PRICING_LABELS[uiLang].more;
  });
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
