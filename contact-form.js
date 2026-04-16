const contactForm = document.getElementById('contact-form');
const contactNext = document.getElementById('contact-next');
const contactUrl = document.getElementById('contact-url');
const contactSuccess = document.getElementById('contact-success');

if (contactForm && contactNext && contactUrl) {
  const successUrl = new URL(window.location.href);
  successUrl.searchParams.set('contact', 'success');
  successUrl.hash = 'kontakt';

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
