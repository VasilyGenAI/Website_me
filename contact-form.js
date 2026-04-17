const contactForm = document.getElementById('contact-form');
const contactNext = document.getElementById('contact-next');
const contactUrl = document.getElementById('contact-url');
const contactSuccess = document.getElementById('contact-success');
const contactService = document.getElementById('contact-service');
const contactMessage = document.getElementById('contact-message');
const pricingToggleButtons = document.querySelectorAll('[data-pricing-toggle]');
const pricingDetails = document.querySelectorAll('.pricing-card__details');
const packageRequestButtons = document.querySelectorAll('[data-package-request]');

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

function setPricingExpanded(expanded) {
  pricingDetails.forEach((details) => {
    details.hidden = !expanded;
  });

  pricingToggleButtons.forEach((button) => {
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Weniger' : 'Mehr';
  });
}

setPricingExpanded(false);

pricingToggleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    setPricingExpanded(!isExpanded);
  });
});

packageRequestButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedPackage = button.getAttribute('data-package-request');

    if (contactService && selectedPackage) {
      contactService.value = selectedPackage;
    }

    contactForm?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    window.setTimeout(() => {
      if (contactService instanceof HTMLElement) {
        contactService.focus();
      } else if (contactMessage instanceof HTMLElement) {
        contactMessage.focus();
      }
    }, 320);
  });
});
