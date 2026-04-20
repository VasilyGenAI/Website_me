const THANKS_TEXT = {
  de: {
    title: 'Danke!',
    eyebrow: 'Anfrage gesendet',
    text: 'Ich versuche so schnell wie möglich auf deine Anfrage zu reagieren.',
    back: 'Zurück zur vorherigen Seite',
    home: 'Startseite',
  },
  en: {
    title: 'Thank you!',
    eyebrow: 'Request sent',
    text: 'I will try to respond to your request as quickly as possible.',
    back: 'Back to the previous page',
    home: 'Homepage',
  },
  uk: {
    title: 'Дякую!',
    eyebrow: 'Запит надіслано',
    text: 'Я постараюся відповісти на ваш запит якомога швидше.',
    back: 'Назад до попередньої сторінки',
    home: 'На головну',
  },
};

initializeThankYouPage();

function initializeThankYouPage() {
  const params = new URLSearchParams(window.location.search);
  const lang = getThankYouLanguage(params.get('lang'));
  const content = THANKS_TEXT[lang];
  const from = getSafeFromPath(params.get('from'));
  const backUrl = buildBackUrl(from, lang);
  const homeUrl = buildBackUrl('index.html', lang);

  document.documentElement.lang = lang;
  document.title = `${content.title} | Schob Digital`;

  setText('thanks-eyebrow', content.eyebrow);
  setText('thanks-title', content.title);
  setText('thanks-text', content.text);

  const backLink = document.getElementById('thanks-back');
  const homeLink = document.getElementById('thanks-home');

  if (backLink instanceof HTMLAnchorElement) {
    backLink.textContent = content.back;
    backLink.href = backUrl;
  }

  if (homeLink instanceof HTMLAnchorElement) {
    homeLink.textContent = content.home;
    homeLink.href = homeUrl;
  }
}

function getThankYouLanguage(lang) {
  if (lang === 'en' || lang === 'uk') {
    return lang;
  }

  return 'de';
}

function getSafeFromPath(from) {
  const allowed = new Set([
    'index.html',
    'website-bestellen.html',
    'startup-unterstuetzung.html',
  ]);

  if (from && allowed.has(from)) {
    return from;
  }

  return 'index.html';
}

function buildBackUrl(fileName, lang) {
  const url = new URL(fileName, window.location.href);

  if (lang !== 'de') {
    url.searchParams.set('lang', lang);
  }

  return `${url.pathname.split('/').pop()}${url.search}${url.hash}`;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}
