let packageButtonsBound = false;

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
      contactSuccess.hidden = false;

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
