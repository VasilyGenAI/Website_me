const supportedLanguages = new Set(['de', 'en', 'uk']);
const currentLanguage = getCurrentLanguage();
const currentPage = document.body.dataset.page || 'home';

document.documentElement.lang = currentLanguage;
document.documentElement.dataset.lang = currentLanguage;
window.localStorage.setItem('schob_site_language', currentLanguage);

rewriteInternalLinks();
updateLanguageSwitcher();
if (currentLanguage !== 'de') {
  applyCommonLanguageUi();
  applyPageLanguageUi();
}
upgradePricingDetails();
ensurePricingPackageValues();
decoratePackageRequestLinks();
rewriteInternalLinks();
document.dispatchEvent(new CustomEvent('schob:content-updated', {
  detail: {
    page: currentPage,
    language: currentLanguage,
  },
}));

function applyCommonLanguageUi() {
  const navLabels = {
    de: ['KI-Lernen', 'Website bestellen', 'Startup Unterstützung', 'Impressum', 'Datenschutz'],
    en: ['Learn AI', 'Order a Website', 'Startup Support', 'Legal Notice', 'Privacy'],
    uk: ['AI-навчання', 'Замовити сайт', 'Підтримка стартапу', 'Дані', 'Конфіденційність'],
  };

  const navAria = {
    de: 'Hauptnavigation',
    en: 'Main navigation',
    uk: 'Головна навігація',
  };

  const footerAria = {
    de: 'Footer Navigation',
    en: 'Footer navigation',
    uk: 'Навігація в підвалі',
  };

  const socialAria = {
    de: 'Social Media Links',
    en: 'Social media links',
    uk: 'Посилання на соцмережі',
  };

  setNodeText('.site-nav a', navLabels[currentLanguage]);
  setNodeText('.footer-nav a', navLabels[currentLanguage]);
  setText('.footer-cookie-link', {
    de: 'Cookie-Einstellungen',
    en: 'Cookie settings',
    uk: 'Налаштування cookie',
  }[currentLanguage]);
  setAttr('.site-nav', 'aria-label', navAria[currentLanguage]);
  setAttr('.footer-nav', 'aria-label', footerAria[currentLanguage]);
  setAttr('.footer-socials', 'aria-label', socialAria[currentLanguage]);
  setAttr('.language-switcher', 'aria-label', {
    de: 'Sprachauswahl',
    en: 'Language switcher',
    uk: 'Перемикач мови',
  }[currentLanguage]);
}

function applyPageLanguageUi() {
  const pageHandlers = {
    home: applyHomeTranslations,
    website: applyWebsiteTranslations,
    startup: applyStartupTranslations,
    privacy: applyPrivacyTranslations,
    imprint: applyImprintTranslations,
  };

  const handler = pageHandlers[currentPage];
  if (handler) {
    handler();
  }
}

function applyHomeTranslations() {
  const t = {
    de: {
      title: 'Schob Digital | Dein Startup ohne Agenturen und ohne Chaos',
      description: 'Schob Digital hilft ambitionierten Solo-Gründern dabei, ihre App mit KI-Systemen, klarem Workflow und weniger Bürokratie sicher aufzubauen.',
      cta: 'Starten',
      heroCopy: `
        <p class="eyebrow">Dein Weg in die Unabhängigkeit</p>
        <h1>Dein Startup. Ohne Agenturen. <span class="brand__accent">Ohne Chaos.</span></h1>
        <p class="lead">
          Mache dich unabhängig vom 9-to-5-System. Mit den richtigen KI-Systemen baust du als Solo-Gründer deine eigene App, meisterst die Bürokratie und holst dir die Kontrolle über deine Zeit zurück.
        </p>
        <div class="hero__actions">
          <a class="button button--primary" href="#coaching">Gespräch buchen</a>
          <a class="button button--ghost" href="#pillars">Mehr erfahren</a>
        </div>
      `,
      heroAlt: 'Vasily Schob - Gründer',
      heroNote: '<span>Vasily Schob</span><span>Solo-Gründer</span>',
      socialLabel: 'Gebaut mit',
      pillarsHeading: `
        <p class="eyebrow">Die drei Säulen</p>
        <h2>Keine teuren <span class="brand__accent">Anfängerfehler</span></h2>
        <p>Ich kenne die echten Schmerzpunkte der Unternehmensführung. Richte deine drei wesentlichen Säulen richtig ein, bevor du Jahre und Zehntausende Euros verlierst.</p>
      `,
      pillarsGrid: `
        <article class="surface-card offer-card">
          <p class="offer-card__index">01</p>
          <a class="offer-card__image-link" href="startup-unterstuetzung.html" aria-label="Zur Seite Startup Unterstützung">
            <img class="offer-card__image" src="Photos/amt.JPG" alt="Legal und Bürokratie">
          </a>
          <h3>Legal &amp; Bürokratie</h3>
          <p>Ein falsches Kreuz beim Finanzamt kostet tausende Euro. Lerne souverän an echten Praxisbeispielen, wie du steuerliche Hürden und die Gewerbeanmeldung fehlerfrei nimmst.</p>
        </article>
        <article class="surface-card offer-card">
          <p class="offer-card__index">02</p>
          <img class="offer-card__image" src="Photos/falle.JPG" alt="Kostenfalle">
          <h3>Die 80.000 € Falle</h3>
          <p>Vermeide Cloud-Kostenfallen. Ich baue dein Tech-Fundament als MVP sicher und offline-first. Keine geleakten API-Keys, keine Hackerangriffe über Nacht.</p>
        </article>
        <article class="surface-card offer-card">
          <p class="offer-card__index">03</p>
          <img class="offer-card__image" src="Photos/design.JPG" alt="Design und Launch">
          <h3>Design &amp; Launch</h3>
          <p>Spare dir 1.000 € für externe Grafiker. Ich bringe dir Figma-Grundlagen bei für Interfaces, die überzeugen. Meistere deinen App-Store-Release so wie ich beim ersten Versuch.</p>
        </article>
      `,
      portfolioHeading: `
        <p class="eyebrow">Portfolio</p>
        <h2>Was bereits <span class="brand__accent">entstanden</span> ist</h2>
        <p>Hier siehst du vier konkrete Projekte, die zeigen, wie sich mein Workflow in echte Produkte, Websites und deutlich schnellere Umsetzungszeiten übersetzt.</p>
      `,
      portfolioGrid: `
        <article class="surface-card offer-card">
          <p class="offer-card__index">01</p>
          <img class="offer-card__image" src="Photos/Screen1.png" alt="Misjudged App Screenshot">
          <h3><a class="portfolio-link" href="https://vasilygenai.github.io/misjudged.app/index.html" target="_blank" rel="noopener noreferrer">Misjudged</a> App</h3>
          <p>Ich habe mit großer Unterstützung von KI eine React-Native-App entwickelt und dafür über 1,5 Jahre parallel zu Studium und Werkstudentenjob gearbeitet. Genau diese Erfahrung sorgt heute dafür, dass ich einen App-MVP in 24 Stunden planen und umsetzen kann, weil ich jeden relevanten Prozess aus der Praxis kenne.</p>
        </article>
        <article class="surface-card offer-card">
          <p class="offer-card__index">02</p>
          <img class="offer-card__image" src="Photos/Screen2.png" alt="Misjudged Web Screenshot">
          <h3><a class="portfolio-link" href="https://vasilygenai.github.io/misjudged.app/index.html" target="_blank" rel="noopener noreferrer">Misjudged</a> Web</h3>
          <p>Für die App habe ich zusätzlich eine kompakte Website gebaut, damit Besucher in wenigen Sekunden verstehen, worum es geht. Die technische Umsetzung stand schnell, am meisten Zeit floss in Datenschutz und rechtliche Konsistenz, damit die Seite sauber, nachvollziehbar und gesetzeskonform live gehen konnte.</p>
        </article>
        <article class="surface-card offer-card">
          <p class="offer-card__index">03</p>
          <img class="offer-card__image" src="Photos/Screen3.png" alt="Diese Website Screenshot">
          <h3>Diese Website</h3>
          <p>Diese Website habe ich innerhalb eines Tages umgesetzt. Weil Impressum, Datenschutz und Cookie-Logik durch vorhandene Erfahrung deutlich schneller gingen, lag der Fokus diesmal vor allem auf Marketing, Struktur und Designqualität.</p>
        </article>
        <article class="surface-card offer-card">
          <p class="offer-card__index">04</p>
          <a class="offer-card__image-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer" aria-label="Meetli öffnen">
            <img class="offer-card__image" src="https://image.thum.io/get/width/1200/https://www.meetli.ch/" alt="Meetli Website Screenshot">
          </a>
          <h3><a class="portfolio-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer">Meetli</a></h3>
          <p>Meetli habe ich im Rahmen eines Kurses an der Universität Zürich entwickelt. Dort habe ich meine ersten fundierten Web-Erfahrungen gesammelt und früh gelernt, wie Nutzerführung, Seitenstruktur und saubere Umsetzung zusammenwirken.</p>
        </article>
      `,
      workflowIntro: `
        <p class="eyebrow">KI-Workflow</p>
        <h2>Der <span class="brand__accent">KI-Werkzeugkasten</span></h2>
        <p>Das Internet will dir direkt teure KI-Abos verscherbeln. Mein Ansatz? Ein klarer 4-Stufen-Workflow. Volle Power ohne 100€-Abo-Fallen und maximal skalierbar.</p>
        <div class="hero__actions">
          <a class="button button--primary" href="#coaching">Workflow lernen</a>
        </div>
      `,
      workflowSteps: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Der IDE-Hack</h3><p>Vergiss mühsame Textfelder im Browser. Wir integrieren ChatGPT direkt in deine Entwicklungsumgebung mit vollem Projektkontext, fast null Fehlern und maximaler Effizienz.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Risikofreies Setup</h3><p>Bevor du Geld ausgibst, richten wir deinen professionellen Entwickler-Workflow anhand starker, kostenloser Alternativen im Cursor-Stil ein.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Der Profi-Editor</h3><p>Wenn das System sitzt, wechseln wir zu Cursor. Wir nutzen Free-Trials strategisch, sodass du extrem weit kommst, ohne den ersten Euro zu blechen.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Die KI-Endstufe</h3><p>Claude ist der ultimative Editor-Boss, bringt aber Kostenfallen von bis zu 1.000 € im Jahr mit sich. Ich zeige dir, wie du die Modelle sicher und gezielt bei Engpässen nutzt.</p></article>
      `,
      pricingHeading: `
        <p class="eyebrow">Pricing</p>
        <h2>Wähle das Paket, das zu deinem <span class="brand__accent">aktuellen Stand</span> passt</h2>
        <p>Vom sauberen Setup bis zur engen 1:1-Begleitung als Solo-Founder: Jedes Paket ist darauf ausgelegt, dich schneller ins Machen zu bringen und teure Umwege zu vermeiden.</p>
      `,
      pricingGrid: getHomePricing('de'),
      contactIntro: `
        <p class="eyebrow">Dein Weg in die Freiheit</p>
        <h2>Hol dir den Kompass für deinen Start.</h2>
        <p>Wähle den Support, der zu deinem Tempo passt. Vom 1-Stunden-Setup über das MVP-Intensiv bis zur monatlichen Begleitung als Solo-Founder.</p>
        <div class="contact-direct">
          <a class="contact-direct__link" href="mailto:schobvasily.digital@gmail.com">schobvasily.digital@gmail.com</a>
          <a class="contact-direct__link" href="tel:+4915678301732">+49 156 78301732</a>
        </div>
      `,
      footerCopy: 'Hilft ambitionierten Solo-Gründern durch den Dschungel der Gründung: von der ersten Zeile Code bis zum gefürchteten Brief vom Finanzamt.',
      form: {
        subject: 'Neue Anfrage über Schob Digital',
        labels: ['Name', 'E-Mail', 'Unternehmen', 'Service', 'Wobei brauchst du gerade konkret Unterstützung?'],
        placeholder: 'Welches Paket interessiert dich?',
        consent: 'Ich stimme zu, dass meine Angaben zur Bearbeitung meiner Anfrage verarbeitet werden. Weitere Informationen stehen in der <a href="datenschutz.html">Datenschutzerklärung</a>.',
        submit: 'Starten',
        success: 'Danke, deine Nachricht wurde erfolgreich versendet.',
      },
    },
    en: {
      title: 'Schob Digital | Your startup without agencies and without chaos',
      description: 'Schob Digital helps ambitious solo founders build their app with AI systems, a clear workflow, and less bureaucracy.',
      cta: 'Get started',
      heroCopy: `
        <p class="eyebrow">Your path to independence</p>
        <h1>Your startup. Without agencies. <span class="brand__accent">Without chaos.</span></h1>
        <p class="lead">Break free from the 9-to-5 system. With the right AI systems, you can build your own app as a solo founder, handle the bureaucracy, and take back control of your time.</p>
        <div class="hero__actions">
          <a class="button button--primary" href="#coaching">Book a call</a>
          <a class="button button--ghost" href="#pillars">Learn more</a>
        </div>
      `,
      heroAlt: 'Vasily Schob - founder',
      heroNote: '<span>Vasily Schob</span><span>Solo founder</span>',
      socialLabel: 'Built with',
      pillarsHeading: `
        <p class="eyebrow">The three pillars</p>
        <h2>No expensive <span class="brand__accent">beginner mistakes</span></h2>
        <p>I know the real pain points of building a company. Set up your three critical pillars correctly before you lose years and tens of thousands of euros.</p>
      `,
      pillarsGrid: `
        <article class="surface-card offer-card">
          <p class="offer-card__index">01</p>
          <a class="offer-card__image-link" href="startup-unterstuetzung.html" aria-label="Go to Startup Support">
            <img class="offer-card__image" src="Photos/amt.JPG" alt="Legal and bureaucracy">
          </a>
          <h3>Legal &amp; Bureaucracy</h3>
          <p>One wrong box on a tax form can cost thousands. Learn, through real examples, how to handle registration steps and tax-related hurdles with confidence.</p>
        </article>
        <article class="surface-card offer-card">
          <p class="offer-card__index">02</p>
          <img class="offer-card__image" src="Photos/falle.JPG" alt="Cost trap">
          <h3>The €80,000 trap</h3>
          <p>Avoid cloud cost disasters. I build your tech foundation as a secure, offline-first MVP. No leaked API keys, no overnight security panic.</p>
        </article>
        <article class="surface-card offer-card">
          <p class="offer-card__index">03</p>
          <img class="offer-card__image" src="Photos/design.JPG" alt="Design and launch">
          <h3>Design &amp; Launch</h3>
          <p>Skip the extra €1,000 for outside design help. I teach you the Figma basics for interfaces that actually convert and help you launch cleanly.</p>
        </article>
      `,
      portfolioHeading: `
        <p class="eyebrow">Portfolio</p>
        <h2>What has already <span class="brand__accent">been built</span></h2>
        <p>These four projects show how my workflow turns into real products, websites, and much faster execution timelines.</p>
      `,
      portfolioGrid: `
        <article class="surface-card offer-card"><p class="offer-card__index">01</p><img class="offer-card__image" src="Photos/Screen1.png" alt="Misjudged app screenshot"><h3><a class="portfolio-link" href="https://vasilygenai.github.io/misjudged.app/index.html" target="_blank" rel="noopener noreferrer">Misjudged</a> App</h3><p>I built a React Native app with major AI support while studying and working part-time. That experience is why I can now plan and ship an app MVP in 24 hours.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">02</p><img class="offer-card__image" src="Photos/Screen2.png" alt="Misjudged website screenshot"><h3><a class="portfolio-link" href="https://vasilygenai.github.io/misjudged.app/index.html" target="_blank" rel="noopener noreferrer">Misjudged</a> Web</h3><p>I also built a compact website for the app so visitors understand the value in seconds. The technical setup was fast, while privacy and legal consistency took the most attention.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">03</p><img class="offer-card__image" src="Photos/Screen3.png" alt="This website screenshot"><h3>This website</h3><p>I built this website in a single day. Because legal pages and cookie logic were already structured, I could focus on messaging, structure, and premium design quality.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">04</p><a class="offer-card__image-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer" aria-label="Open Meetli"><img class="offer-card__image" src="https://image.thum.io/get/width/1200/https://www.meetli.ch/" alt="Meetli website screenshot"></a><h3><a class="portfolio-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer">Meetli</a></h3><p>I developed Meetli in a course at the University of Zurich. That was where I built my first solid foundation in website structure, user flow, and clean execution.</p></article>
      `,
      workflowIntro: `
        <p class="eyebrow">AI workflow</p>
        <h2>The <span class="brand__accent">AI toolbox</span></h2>
        <p>The internet wants to sell you expensive AI subscriptions right away. My approach is different: a clear four-step workflow with full power and no pointless subscription traps.</p>
        <div class="hero__actions"><a class="button button--primary" href="#coaching">Learn the workflow</a></div>
      `,
      workflowSteps: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>The IDE hack</h3><p>Forget slow browser text fields. We integrate ChatGPT directly into your development environment with full project context and maximum efficiency.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Low-risk setup</h3><p>Before you spend money, we build a professional developer workflow around strong free alternatives in a Cursor-style setup.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>The pro editor</h3><p>Once the system is stable, we move to Cursor and use trials strategically so you get very far before paying anything.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>The final AI layer</h3><p>Claude is powerful, but it can become expensive fast. I show you how to use top models safely and only when they actually add value.</p></article>
      `,
      pricingHeading: `
        <p class="eyebrow">Pricing</p>
        <h2>Choose the package that fits your <span class="brand__accent">current stage</span></h2>
        <p>From a clean setup to close 1:1 support as a solo founder, each package is designed to help you move faster without expensive detours.</p>
      `,
      pricingGrid: getHomePricing('en'),
      contactIntro: `
        <p class="eyebrow">Your way to freedom</p>
        <h2>Get the compass for your start.</h2>
        <p>Choose the level of support that matches your pace: from a focused setup session to an MVP intensive or ongoing founder support.</p>
        <div class="contact-direct">
          <a class="contact-direct__link" href="mailto:schobvasily.digital@gmail.com">schobvasily.digital@gmail.com</a>
          <a class="contact-direct__link" href="tel:+4915678301732">+49 156 78301732</a>
        </div>
      `,
      footerCopy: 'Helping ambitious solo founders navigate the founder jungle: from the first line of code to the scary tax office letter.',
      form: {
        subject: 'New request via Schob Digital',
        labels: ['Name', 'Email', 'Company', 'Service', 'What do you currently need support with?'],
        placeholder: 'Which package are you interested in?',
        consent: 'I agree that my information may be processed to handle my request. More details are available in the <a href="datenschutz.html">privacy policy</a>.',
        submit: 'Get started',
        success: 'Thanks, your message was sent successfully.',
      },
    },
    uk: {
      title: 'Schob Digital | Ваш стартап без агентств і без хаосу',
      description: 'Schob Digital допомагає амбітним solo-founder запускати застосунки завдяки AI-системам, чіткому процесу та меншій бюрократії.',
      cta: 'Почати',
      heroCopy: `
        <p class="eyebrow">Ваш шлях до незалежності</p>
        <h1>Ваш стартап. Без агентств. <span class="brand__accent">Без хаосу.</span></h1>
        <p class="lead">Станьте незалежними від системи 9-to-5. Завдяки правильним AI-системам ви як solo-founder зможете створити власний застосунок, пройти бюрократію та повернути собі контроль над часом.</p>
        <div class="hero__actions">
          <a class="button button--primary" href="#coaching">Забронювати дзвінок</a>
          <a class="button button--ghost" href="#pillars">Дізнатися більше</a>
        </div>
      `,
      heroAlt: 'Василь Шоб - засновник',
      heroNote: '<span>Vasily Schob</span><span>Solo-founder</span>',
      socialLabel: 'Створено з',
      pillarsHeading: `
        <p class="eyebrow">Три опори</p>
        <h2>Без дорогих <span class="brand__accent">помилок новачка</span></h2>
        <p>Я добре знаю реальні больові точки запуску бізнесу. Налаштуйте три ключові опори правильно ще до того, як втратите роки та десятки тисяч євро.</p>
      `,
      pillarsGrid: `
        <article class="surface-card offer-card"><p class="offer-card__index">01</p><a class="offer-card__image-link" href="startup-unterstuetzung.html" aria-label="До сторінки підтримки стартапу"><img class="offer-card__image" src="Photos/amt.JPG" alt="Право та бюрократія"></a><h3>Право &amp; бюрократія</h3><p>Одна помилка у формі для податкової може коштувати тисячі. На реальних прикладах я покажу, як упевнено пройти реєстрацію та типові податкові бар’єри.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">02</p><img class="offer-card__image" src="Photos/falle.JPG" alt="Пастка витрат"><h3>Пастка на 80 000 €</h3><p>Уникайте дорогих cloud-помилок. Я будую технічний фундамент MVP безпечно та з фокусом на контроль витрат.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">03</p><img class="offer-card__image" src="Photos/design.JPG" alt="Дизайн і запуск"><h3>Дизайн &amp; запуск</h3><p>Не витрачайте зайві гроші на зовнішніх дизайнерів. Я покажу вам базу Figma та допоможу вийти в реліз професійно й без хаосу.</p></article>
      `,
      portfolioHeading: `
        <p class="eyebrow">Портфоліо</p>
        <h2>Що вже <span class="brand__accent">створено</span></h2>
        <p>Ці чотири проєкти показують, як мій підхід перетворюється на реальні продукти, сайти та значно швидшу реалізацію.</p>
      `,
      portfolioGrid: `
        <article class="surface-card offer-card"><p class="offer-card__index">01</p><img class="offer-card__image" src="Photos/Screen1.png" alt="Скриншот застосунку Misjudged"><h3><a class="portfolio-link" href="https://vasilygenai.github.io/misjudged.app/index.html" target="_blank" rel="noopener noreferrer">Misjudged</a> App</h3><p>Я створив React Native застосунок із великою підтримкою AI паралельно з навчанням і роботою. Саме цей досвід дозволяє мені сьогодні планувати й запускати MVP застосунку за 24 години.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">02</p><img class="offer-card__image" src="Photos/Screen2.png" alt="Скриншот сайту Misjudged"><h3><a class="portfolio-link" href="https://vasilygenai.github.io/misjudged.app/index.html" target="_blank" rel="noopener noreferrer">Misjudged</a> Web</h3><p>Для застосунку я також створив компактний сайт, щоб відвідувачі за кілька секунд розуміли цінність продукту. Найбільше уваги тут вимагали конфіденційність і юридична чистота.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">03</p><img class="offer-card__image" src="Photos/Screen3.png" alt="Скриншот цього сайту"><h3>Цей сайт</h3><p>Цей сайт я реалізував за один день. Оскільки логіка cookies та юридичні тексти вже були структуровані, я зміг зосередитися на маркетингу, структурі та якості дизайну.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">04</p><a class="offer-card__image-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer" aria-label="Відкрити Meetli"><img class="offer-card__image" src="https://image.thum.io/get/width/1200/https://www.meetli.ch/" alt="Скриншот сайту Meetli"></a><h3><a class="portfolio-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer">Meetli</a></h3><p>Meetli я розробив у межах курсу в Університеті Цюриха. Саме там я заклав перший міцний фундамент у структурі сайтів, логіці користувацького шляху та чистій реалізації.</p></article>
      `,
      workflowIntro: `
        <p class="eyebrow">AI-процес</p>
        <h2><span class="brand__accent">AI-інструментарій</span></h2>
        <p>Інтернет намагається одразу продати вам дорогі AI-підписки. Мій підхід інший: чіткий процес із чотирьох кроків, максимум користі й мінімум зайвих витрат.</p>
        <div class="hero__actions"><a class="button button--primary" href="#coaching">Вивчити процес</a></div>
      `,
      workflowSteps: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>IDE-хак</h3><p>Замість повільних текстових полів у браузері ми інтегруємо ChatGPT прямо в середовище розробки з повним контекстом проєкту.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Безпечний старт</h3><p>Перш ніж витрачати гроші, ми будуємо професійний workflow на основі сильних безкоштовних альтернатив.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Професійний редактор</h3><p>Коли система стоїть міцно, ми переходимо до Cursor і використовуємо trial-періоди стратегічно.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Фінальний AI-рівень</h3><p>Claude дуже потужний, але легко стає дорогим. Я покажу, як використовувати топ-моделі безпечно й лише там, де вони реально дають перевагу.</p></article>
      `,
      pricingHeading: `
        <p class="eyebrow">Пакети</p>
        <h2>Оберіть пакет, який відповідає вашому <span class="brand__accent">поточному етапу</span></h2>
        <p>Від чистого стартового налаштування до тісної 1:1-підтримки для solo-founder — кожен пакет створений, щоб ви рухалися швидше та без дорогих обхідних шляхів.</p>
      `,
      pricingGrid: getHomePricing('uk'),
      contactIntro: `
        <p class="eyebrow">Ваш шлях до свободи</p>
        <h2>Отримайте компас для вашого старту.</h2>
        <p>Оберіть формат підтримки під ваш темп: від стартового сетапу до інтенсиву для MVP або довшого супроводу для засновника.</p>
        <div class="contact-direct">
          <a class="contact-direct__link" href="mailto:schobvasily.digital@gmail.com">schobvasily.digital@gmail.com</a>
          <a class="contact-direct__link" href="tel:+4915678301732">+49 156 78301732</a>
        </div>
      `,
      footerCopy: 'Допомагаю амбітним solo-founder пройти джунглі запуску: від першого рядка коду до листа з податкової.',
      form: {
        subject: 'Новий запит через Schob Digital',
        labels: ['Ім’я', 'Email', 'Компанія', 'Сервіс', 'У чому саме вам зараз потрібна допомога?'],
        placeholder: 'Який пакет вас цікавить?',
        consent: 'Я погоджуюся, що мої дані можуть оброблятися для відповіді на мій запит. Детальніше в <a href="datenschutz.html">політиці конфіденційності</a>.',
        submit: 'Почати',
        success: 'Дякую, ваше повідомлення успішно надіслано.',
      },
    },
  }[currentLanguage];

  applyMeta(t.title, t.description);
  setText('.site-header__cta', t.cta);
  setHTML('.hero__copy', t.heroCopy);
  setAttr('.hero__image', 'alt', t.heroAlt);
  setHTML('.hero__note', t.heroNote);
  setText('.social-proof__label', t.socialLabel);
  setHTML('#pillars .section-heading', t.pillarsHeading);
  setHTML('#pillars .offer-grid', t.pillarsGrid);
  setHTML('#portfolio .section-heading', t.portfolioHeading);
  setHTML('#portfolio .offer-grid', t.portfolioGrid);
  setHTML('#workflow .method-intro', t.workflowIntro);
  setHTML('#workflow .method-steps', t.workflowSteps);
  setHTML('#pricing .section-heading', t.pricingHeading);
  setHTML('#pricing .pricing-grid', t.pricingGrid);
  setHTML('#coaching .contact-panel__intro', t.contactIntro);
  setText('.footer-copy', t.footerCopy);
  applyFormTranslations(t.form);
}

function applyWebsiteTranslations() {
  const t = {
    de: {
      title: 'Website bestellen | Schob Digital',
      description: 'Schob Digital baut Landingpages und Business-Websites mit AI-Speed, sauberem Code und rechtssicherem deutschen Fundament.',
      cta: 'Projekt anfragen',
      heroCopy: `
        <p class="eyebrow">Website bestellen</p>
        <h1>High-End Websites. AI-Speed. <span class="brand__accent">Deutsche Präzision.</span></h1>
        <p class="lead">Ich baue Landingpages und Business-Websites in Rekordzeit, inklusive rechtssicherem Fundament. Mit der Schob-Methode geht deine Seite schneller professionell und konvertierend online.</p>
        <div class="hero__actions"><a class="button button--primary" href="#coaching">Projekt anfragen</a><a class="button button--ghost" href="#services">Mehr erfahren</a></div>
      `,
      heroAlt: 'Website Preview von Schob Digital',
      heroNote: '<span>Schob-Methode</span><span>Websites live in Rekordzeit</span>',
      socialLabel: 'Gebaut mit',
      servicesHeading: `<p class="eyebrow">Services</p><h2>Was ich für dich <span class="brand__accent">löse</span></h2><p>Von der schnellen Landingpage bis zur sauberen Business-Website mit legalem Fundament: Ich kombiniere Design, Technik und deutsche Sorgfalt in einem klaren Workflow.</p>`,
      servicesGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Landing Pages &amp; Funnels</h3><p>Verkaufsstarke Einzelseiten, optimiert für Conversion, starke Performance und ein mobiles Erlebnis, das sofort professionell wirkt.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Komplexe Business-Pages</h3><p>Strukturierte Mehrseiter mit sauberem Code und einer Architektur, die mit deinem Unternehmen mitwächst.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Legal Compliance &amp; Cookies</h3><p>Cookie-Banner, Impressum und Datenschutzerklärung nach deutschem Standard, damit dein Auftritt rechtlich sauber online geht.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Tracking &amp; Google Analytics</h3><p>Auf Wunsch binde ich Google Analytics datenschutzkonform an, damit du Herkunft, Verhalten und Conversion sauber messen kannst.</p></article>
      `,
      portfolioHeading: `<p class="eyebrow">Portfolio</p><h2>Digitale Architektur, die <span class="brand__accent">funktioniert</span></h2><p>Von meiner eigenen App-Plattform bis hin zu performanten Landingpages auf GitHub: Ich liefere sauberen Code und modernes Design mit hoher Umsetzungsgeschwindigkeit.</p>`,
      portfolioGrid: `
        <article class="surface-card offer-card"><p class="offer-card__index">01</p><img class="offer-card__image" src="Photos/Screen3.png" alt="Landingpage von Schob Digital"><h3>Schob Digital</h3><p>Diese Website zeigt, wie schnell aus einer Idee eine hochwertige Verkaufsseite mit klarer Struktur, starkem Messaging und rechtlicher Basis werden kann.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">02</p><img class="offer-card__image" src="Photos/Screen2.png" alt="Misjudged Website Screenshot"><h3><a class="portfolio-link" href="https://vasilygenai.github.io/misjudged.app/index.html" target="_blank" rel="noopener noreferrer">Misjudged</a> Web</h3><p>Eine fokussierte Website für meine App, gebaut für schnelle Orientierung, starke Visuals und einen klaren ersten Eindruck.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">03</p><img class="offer-card__image" src="Photos/Screen1.png" alt="Misjudged App Plattform Screenshot"><h3>App-Plattform</h3><p>Mein eigenes Produkt hat mich gelehrt, wie Design, Technologie und Business-Logik ineinandergreifen. Genau deshalb baue ich Websites nicht nur hübsch, sondern unternehmerisch sinnvoll.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">04</p><a class="offer-card__image-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer" aria-label="Meetli öffnen"><img class="offer-card__image" src="https://image.thum.io/get/width/1200/https://www.meetli.ch/" alt="Meetli Website Screenshot"></a><h3><a class="portfolio-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer">Meetli</a></h3><p>Meetli habe ich im Rahmen eines Kurses an der Universität Zürich entwickelt. Dort habe ich meine ersten fundierten Web-Erfahrungen gesammelt und früh gelernt, wie Nutzerführung, Seitenstruktur und saubere Umsetzung zusammenwirken.</p></article>
      `,
      aboutIntro: `<p class="eyebrow">About</p><h2>Praxiserfahrung als Gründer. <span class="brand__accent">Präzision aus der Konzernwelt.</span></h2><p>Ich bin selbst Unternehmer und habe mein eigenes digitales Produkt erfolgreich auf den Markt gebracht. Den Weg, vor dem du gerade stehst, bin ich also bereits gegangen.</p><p>Durch mein Studium und meine Erfahrung bei Accenture und CHECK24 arbeite ich verantwortungsbewusst, datenschutzkonform und mit klarem Business-Fokus.</p>`,
      aboutGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Gründerperspektive</h3><p>Ich kenne die Fragen hinter der Website: Was bringt Umsatz, was braucht man zuerst und welche Lösung skaliert sauber mit?</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Rechtliches Grundverständnis</h3><p>Bei Impressum, Datenschutz, Cookie-Logik und Tracking entscheide ich nicht aus dem Bauch, sondern mit fundiertem Verständnis für deutsche Rahmenbedingungen.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Konzernqualität</h3><p>Meine Arbeit in datengetriebenen Umfeldern hat mir präzise Prozesse, saubere Standards und einen hohen Qualitätsanspruch mitgegeben.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Business-Fokus</h3><p>Das Ziel ist nie nur eine schöne Website, sondern eine Seite, die Vertrauen aufbaut und Anfragen erzeugt.</p></article>
      `,
      workflowIntro: `<p class="eyebrow">Workflow</p><h2>KI-Speed für den Code. <span class="brand__accent">Handarbeit für deine Sicherheit.</span></h2><p>Ich nutze High-End-KI-Workflows mit Gemini, Cursor und Claude, um die Entwicklungszeit deiner Website massiv zu verkürzen. So bekommst du Agentur-Qualität schneller und deutlich effizienter.</p><p>Der entscheidende Unterschied: Ich prüfe jede Zeile manuell. Gerade sensible Inhalte wie das rechtliche Setup formuliere ich selbst.</p>`,
      workflowGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Figma als Startpunkt</h3><p>Jede gute Website braucht zuerst eine klare visuelle Richtung. Deshalb starte ich mit Struktur und Layout.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>KI für Geschwindigkeit</h3><p>Gemini, Cursor und Claude beschleunigen die Umsetzung massiv, besonders bei Struktur, Komponenten und Frontend-Routine.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Menschliche Qualitätskontrolle</h3><p>Ich kontrolliere die Ausgabe manuell und prüfe kritisch alle Bereiche, die für Conversion, Datenschutz und Vertrauen relevant sind.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Livegang ohne Chaos</h3><p>Von Domain-Anbindung über Impressum bis zum Cookie-Banner wird alles so vorbereitet, dass deine Website sauber online gehen kann.</p></article>
      `,
      pricingHeading: `<p class="eyebrow">Pricing</p><h2>Transparente <span class="brand__accent">Pakete</span></h2><p>Für schnellen Markteintritt oder ein solides Fundament: Du weißt vorab, was enthalten ist und welches Setup zu dir passt.</p>`,
      pricingGrid: getWebsitePricing('de'),
      contactIntro: `<p class="eyebrow">Projektstart</p><h2>Erzähl mir, was deine Website leisten soll.</h2><p>Ob schnelle Landingpage oder saubere Business-Website: Ich schaue mit dir auf Ziel, Umfang und die sinnvollste Lösung für deinen aktuellen Stand.</p><div class="contact-direct"><a class="contact-direct__link" href="mailto:schobvasily.digital@gmail.com">schobvasily.digital@gmail.com</a><a class="contact-direct__link" href="tel:+4915678301732">+49 156 78301732</a></div>`,
      footerCopy: 'Saubere Websites, rechtssicheres Fundament und ein moderner AI-Workflow, damit dein Auftritt schneller online und professionell wirkt.',
      form: {
        subject: 'Neue Website-Anfrage über Schob Digital',
        labels: ['Name', 'E-Mail', 'Unternehmen', 'Service', 'Welche Art von Website brauchst du gerade konkret?'],
        placeholder: 'Welches Paket oder Projekt interessiert dich?',
        consent: 'Ich stimme zu, dass meine Angaben zur Bearbeitung meiner Anfrage verarbeitet werden. Weitere Informationen stehen in der <a href="datenschutz.html">Datenschutzerklärung</a>.',
        submit: 'Projekt anfragen',
        success: 'Danke, deine Nachricht wurde erfolgreich versendet.',
      },
    },
    en: {
      title: 'Order a Website | Schob Digital',
      description: 'Schob Digital builds landing pages and business websites with AI speed, clean code, and a legally solid German foundation.',
      cta: 'Request project',
      heroCopy: `<p class="eyebrow">Order a website</p><h1>High-end websites. AI speed. <span class="brand__accent">German precision.</span></h1><p class="lead">I build landing pages and business websites at record speed, including a legally solid foundation. With the Schob method, your site goes live faster and performs like a professional sales asset.</p><div class="hero__actions"><a class="button button--primary" href="#coaching">Request project</a><a class="button button--ghost" href="#services">Learn more</a></div>`,
      heroAlt: 'Website preview by Schob Digital',
      heroNote: '<span>Schob method</span><span>Websites live in record time</span>',
      socialLabel: 'Built with',
      servicesHeading: `<p class="eyebrow">Services</p><h2>What I <span class="brand__accent">solve for you</span></h2><p>From fast landing pages to structured business websites with a legal foundation, I combine design, engineering, and German precision in one clear workflow.</p>`,
      servicesGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Landing pages &amp; funnels</h3><p>High-converting single pages optimized for speed, clarity, mobile performance, and stronger conversions.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Complex business pages</h3><p>Structured multi-page websites with clean code and an architecture that can grow with your company.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Legal compliance &amp; cookies</h3><p>Cookie banner, legal notice, and privacy policy aligned with German standards so your site can go live cleanly.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Tracking &amp; Google Analytics</h3><p>If needed, I connect Google Analytics in a privacy-aware way so you can measure traffic, behavior, and conversion reliably.</p></article>
      `,
      portfolioHeading: `<p class="eyebrow">Portfolio</p><h2>Digital architecture that <span class="brand__accent">works</span></h2><p>From my own app platform to performance-focused landing pages on GitHub, I deliver clean code and modern design with strong execution speed.</p>`,
      portfolioGrid: `
        <article class="surface-card offer-card"><p class="offer-card__index">01</p><img class="offer-card__image" src="Photos/Screen3.png" alt="Schob Digital landing page"><h3>Schob Digital</h3><p>This website shows how quickly an idea can turn into a premium sales page with strong structure, clean messaging, and legal clarity.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">02</p><img class="offer-card__image" src="Photos/Screen2.png" alt="Misjudged website screenshot"><h3><a class="portfolio-link" href="https://vasilygenai.github.io/misjudged.app/index.html" target="_blank" rel="noopener noreferrer">Misjudged</a> Web</h3><p>A focused website for my app, built for fast orientation, strong visuals, and a clear first impression.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">03</p><img class="offer-card__image" src="Photos/Screen1.png" alt="Misjudged app platform screenshot"><h3>App platform</h3><p>My own product taught me how design, technology, and business logic work together. That is why I build websites to perform, not just to look nice.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">04</p><a class="offer-card__image-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer" aria-label="Open Meetli"><img class="offer-card__image" src="https://image.thum.io/get/width/1200/https://www.meetli.ch/" alt="Meetli website screenshot"></a><h3><a class="portfolio-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer">Meetli</a></h3><p>I developed Meetli during a course at the University of Zurich. It gave me my first solid foundation in user flow, page structure, and clean website execution.</p></article>
      `,
      aboutIntro: `<p class="eyebrow">About</p><h2>Founder experience. <span class="brand__accent">Precision shaped by enterprise work.</span></h2><p>I am an entrepreneur myself and have already brought my own digital product to market successfully. I know the path you are facing because I have walked it.</p><p>Through my academic background and my work at Accenture and CHECK24, I approach projects with responsibility, privacy awareness, and strong business focus.</p>`,
      aboutGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Founder perspective</h3><p>I understand the business questions behind a website: what drives revenue, what matters first, and what scales cleanly.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Legal awareness</h3><p>For privacy, legal notice, cookies, and tracking, I do not guess. I work with a solid understanding of German requirements.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Enterprise quality</h3><p>My work in data-driven environments trained me to value process quality, reliable standards, and precision.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Business focus</h3><p>The goal is never just a pretty website. The goal is a site that builds trust and creates inquiries.</p></article>
      `,
      workflowIntro: `<p class="eyebrow">Workflow</p><h2>AI speed for code. <span class="brand__accent">Human control for your safety.</span></h2><p>I use high-end AI workflows with Gemini, Cursor, and Claude to shorten website development time dramatically. That means agency-level quality, faster and more efficiently.</p><p>The difference is simple: I review every line manually. Especially legal and sensitive content is written and checked by me.</p>`,
      workflowGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Figma first</h3><p>Every strong website starts with visual direction, structure, and layout clarity.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>AI for speed</h3><p>Gemini, Cursor, and Claude accelerate execution, especially for structure, components, and frontend routine.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Human quality control</h3><p>I manually review the output and check every area that matters for conversion, trust, and privacy.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Launch without chaos</h3><p>From domain connection to legal pages and the cookie banner, everything is prepared so your website goes live cleanly.</p></article>
      `,
      pricingHeading: `<p class="eyebrow">Pricing</p><h2>Transparent <span class="brand__accent">packages</span></h2><p>For fast market entry or a stronger foundation: you know in advance what is included and which setup fits your stage.</p>`,
      pricingGrid: getWebsitePricing('en'),
      contactIntro: `<p class="eyebrow">Project start</p><h2>Tell me what your website needs to do.</h2><p>Whether you need a fast landing page or a structured business website, I will look at your goal, scope, and the smartest setup for your current stage.</p><div class="contact-direct"><a class="contact-direct__link" href="mailto:schobvasily.digital@gmail.com">schobvasily.digital@gmail.com</a><a class="contact-direct__link" href="tel:+4915678301732">+49 156 78301732</a></div>`,
      footerCopy: 'Clean websites, a legally solid foundation, and a modern AI workflow so your digital presence goes live faster and feels professional from day one.',
      form: {
        subject: 'New website request via Schob Digital',
        labels: ['Name', 'Email', 'Company', 'Service', 'What kind of website do you currently need?'],
        placeholder: 'Which package or project are you interested in?',
        consent: 'I agree that my information may be processed to handle my request. More details are available in the <a href="datenschutz.html">privacy policy</a>.',
        submit: 'Request project',
        success: 'Thanks, your message was sent successfully.',
      },
    },
    uk: {
      title: 'Замовити сайт | Schob Digital',
      description: 'Schob Digital створює landing pages і бізнес-сайти з AI-швидкістю, чистим кодом та юридично надійною німецькою базою.',
      cta: 'Запитати про проєкт',
      heroCopy: `<p class="eyebrow">Замовити сайт</p><h1>High-end сайти. AI-швидкість. <span class="brand__accent">Німецька точність.</span></h1><p class="lead">Я створюю landing pages та бізнес-сайти в рекордні строки, включно з юридично чистою основою. Завдяки методу Schob ваш сайт швидше виходить онлайн і працює як професійний інструмент продажу.</p><div class="hero__actions"><a class="button button--primary" href="#coaching">Запитати про проєкт</a><a class="button button--ghost" href="#services">Дізнатися більше</a></div>`,
      heroAlt: 'Прев’ю сайту від Schob Digital',
      heroNote: '<span>Метод Schob</span><span>Сайти онлайн у рекордний строк</span>',
      socialLabel: 'Створено з',
      servicesHeading: `<p class="eyebrow">Послуги</p><h2>Що я для вас <span class="brand__accent">закриваю</span></h2><p>Від швидкої landing page до структурованого бізнес-сайту з юридичною базою: я поєдную дизайн, технології та німецьку уважність у зрозумілому процесі.</p>`,
      servicesGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Landing pages &amp; funnels</h3><p>Сильні односторінкові сайти, оптимізовані під конверсію, швидкість, мобільну якість і чітке повідомлення.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Складні бізнес-сайти</h3><p>Багатосторінкові сайти з чистим кодом і архітектурою, яка може рости разом із вашим бізнесом.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Юридична чистота &amp; cookies</h3><p>Банер cookies, imprint і політика конфіденційності за німецькими стандартами, щоб сайт міг безпечно вийти онлайн.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Tracking &amp; Google Analytics</h3><p>За потреби я підключаю Google Analytics у privacy-friendly форматі, щоб ви могли надійно вимірювати трафік і конверсії.</p></article>
      `,
      portfolioHeading: `<p class="eyebrow">Портфоліо</p><h2>Цифрова архітектура, яка <span class="brand__accent">працює</span></h2><p>Від моєї власної app-платформи до швидких landing pages на GitHub — я поєдную чистий код, сучасний дизайн і швидку реалізацію.</p>`,
      portfolioGrid: `
        <article class="surface-card offer-card"><p class="offer-card__index">01</p><img class="offer-card__image" src="Photos/Screen3.png" alt="Landing page Schob Digital"><h3>Schob Digital</h3><p>Цей сайт показує, як швидко ідея може перетворитися на сильну продаючу сторінку з чіткою структурою та юридичною основою.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">02</p><img class="offer-card__image" src="Photos/Screen2.png" alt="Скриншот сайту Misjudged"><h3><a class="portfolio-link" href="https://vasilygenai.github.io/misjudged.app/index.html" target="_blank" rel="noopener noreferrer">Misjudged</a> Web</h3><p>Сфокусований сайт для мого застосунку, створений для швидкого розуміння, сильного першого враження та візуальної чіткості.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">03</p><img class="offer-card__image" src="Photos/Screen1.png" alt="Скриншот платформи застосунку"><h3>App-платформа</h3><p>Власний продукт навчив мене, як поєднуються дизайн, технології та бізнес-логіка. Саме тому я створюю сайти не лише красивими, а й корисними для бізнесу.</p></article>
        <article class="surface-card offer-card"><p class="offer-card__index">04</p><a class="offer-card__image-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer" aria-label="Відкрити Meetli"><img class="offer-card__image" src="https://image.thum.io/get/width/1200/https://www.meetli.ch/" alt="Скриншот сайту Meetli"></a><h3><a class="portfolio-link" href="https://www.meetli.ch/" target="_blank" rel="noopener noreferrer">Meetli</a></h3><p>Meetli я розробив у межах курсу в Університеті Цюриха. Цей проєкт дав мені першу серйозну основу в побудові сайтів і користувацького досвіду.</p></article>
      `,
      aboutIntro: `<p class="eyebrow">Про мене</p><h2>Досвід засновника. <span class="brand__accent">Точність, загартована корпоративною практикою.</span></h2><p>Я сам підприємець і вже успішно запустив власний цифровий продукт. Тому я добре знаю той шлях, перед яким ви зараз стоїте.</p><p>Мій академічний бекграунд і досвід в Accenture та CHECK24 навчили мене відповідальності, privacy-мисленню та бізнес-фокусу.</p>`,
      aboutGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Погляд засновника</h3><p>Я розумію питання за сайтом: що реально приносить дохід, що потрібно спочатку і що масштабується без хаосу.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Юридичне розуміння</h3><p>Imprint, privacy, cookies і tracking я не вгадую, а будую на твердому розумінні німецьких вимог.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Корпоративна якість</h3><p>Робота в data-driven середовищах навчила мене точності, процесам і високим стандартам якості.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Фокус на бізнесі</h3><p>Мета — не просто гарний сайт, а сайт, який будує довіру й приносить заявки.</p></article>
      `,
      workflowIntro: `<p class="eyebrow">Процес</p><h2>AI-швидкість для коду. <span class="brand__accent">Ручний контроль для вашої безпеки.</span></h2><p>Я використовую high-end AI-workflows із Gemini, Cursor та Claude, щоб різко скоротити час розробки сайту. Для вас це означає рівень агентства швидше й ефективніше.</p><p>Ключова різниця в тому, що я перевіряю кожен рядок вручну. Особливо все, що стосується права й довіри.</p>`,
      workflowGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Спершу Figma</h3><p>Кожен сильний сайт починається з чіткої структури, напрямку та візуальної логіки.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>AI для швидкості</h3><p>Gemini, Cursor і Claude прискорюють реалізацію, особливо у структурі, компонентах і фронтенд-рутині.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Людський контроль якості</h3><p>Я вручну перевіряю результат і критично оцінюю все, що впливає на конверсію, довіру та конфіденційність.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Запуск без хаосу</h3><p>Від підключення домену до legal pages і банера cookies усе готується так, щоб сайт міг чисто вийти онлайн.</p></article>
      `,
      pricingHeading: `<p class="eyebrow">Пакети</p><h2>Прозорі <span class="brand__accent">пакети</span></h2><p>Для швидкого виходу на ринок або сильнішого фундаменту: ви заздалегідь знаєте, що входить і який формат підходить саме вам.</p>`,
      pricingGrid: getWebsitePricing('uk'),
      contactIntro: `<p class="eyebrow">Старт проєкту</p><h2>Розкажіть, що саме має робити ваш сайт.</h2><p>Чи вам потрібна швидка landing page, чи структурований бізнес-сайт — я подивлюся на ціль, обсяг і найрозумніший формат під ваш етап.</p><div class="contact-direct"><a class="contact-direct__link" href="mailto:schobvasily.digital@gmail.com">schobvasily.digital@gmail.com</a><a class="contact-direct__link" href="tel:+4915678301732">+49 156 78301732</a></div>`,
      footerCopy: 'Чисті сайти, юридично надійна база та сучасний AI-процес, щоб ваш цифровий образ швидше з’явився онлайн і виглядав професійно.',
      form: {
        subject: 'Новий запит на сайт через Schob Digital',
        labels: ['Ім’я', 'Email', 'Компанія', 'Сервіс', 'Який саме сайт вам зараз потрібен?'],
        placeholder: 'Який пакет або проєкт вас цікавить?',
        consent: 'Я погоджуюся, що мої дані можуть оброблятися для відповіді на мій запит. Детальніше в <a href="datenschutz.html">політиці конфіденційності</a>.',
        submit: 'Запитати про проєкт',
        success: 'Дякую, ваше повідомлення успішно надіслано.',
      },
    },
  }[currentLanguage];

  applyMeta(t.title, t.description);
  setText('.site-header__cta', t.cta);
  setHTML('.hero__copy', t.heroCopy);
  setAttr('.hero__image--product', 'alt', t.heroAlt);
  setHTML('.hero__note', t.heroNote);
  setText('.social-proof__label', t.socialLabel);
  setHTML('#services .section-heading', t.servicesHeading);
  setHTML('#services .method-steps', t.servicesGrid);
  setHTML('#portfolio .section-heading', t.portfolioHeading);
  setHTML('#portfolio .offer-grid', t.portfolioGrid);
  setHTML('#why-me .method-intro', t.aboutIntro);
  setHTML('#why-me .method-steps', t.aboutGrid);
  setHTML('#workflow .method-intro', t.workflowIntro);
  setHTML('#workflow .method-steps', t.workflowGrid);
  setHTML('#pricing .section-heading', t.pricingHeading);
  setHTML('#pricing .pricing-grid', t.pricingGrid);
  setHTML('#coaching .contact-panel__intro', t.contactIntro);
  setText('.footer-copy', t.footerCopy);
  applyFormTranslations(t.form);
}

function applyStartupTranslations() {
  const t = {
    de: {
      title: 'Startup Unterstützung | Schob Digital',
      description: 'Schob Digital begleitet digitale Gründer durch Rechtsform, Behörden, Steuer-Basics und Setup, damit dein Business sicher und strukturiert starten kann.',
      cta: 'Starten',
      heroCopy: `<p class="eyebrow">Startup Unterstützung</p><h1>Dein digitales Business-Fundament. <span class="brand__accent">Ohne Bürokratie-Chaos.</span></h1><p class="lead">Du baust ein digitales Business auf und lieferst die fachliche Arbeit, ich navigiere dich durch den deutschen Behörden-Dschungel. Von der Rechtsform bis zum Tool-Setup schaffen wir ein sauberes Fundament, damit du dich auf Umsatz statt Unsicherheit konzentrieren kannst.</p><div class="hero__actions"><a class="button button--primary" href="#coaching">Beratung anfragen</a><a class="button button--ghost" href="#pricing">Pakete ansehen</a></div>`,
      heroAlt: 'Startup Unterstützung und Behörden-Navigation',
      heroNote: '<span>Business-Fundament</span><span>Klarheit vor dem Start</span>',
      socialLabel: 'Fundiert durch',
      whyIntro: `<p class="eyebrow">Warum ich</p><h2>Praxis aus der Gründung. <span class="brand__accent">Analyse aus Studium und Business.</span></h2><p>Ich habe auf einer Crowdfunding-Plattform im Bereich Business Analyse gearbeitet und dieses Denken durch mein Studium an der Humboldt-Universität fachlich vertieft. Dadurch sehe ich nicht nur Formulare, sondern die wirtschaftliche Logik dahinter.</p><p>Zusätzlich habe ich für mein eigenes Gewerbe bereits ausführliche Finanzplanungen erstellt und die typischen Fragen rund um Struktur, Banken, laufende Pflichten und Tools selbst durchlebt.</p>`,
      whyGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Business-Analyse</h3><p>Ich denke nicht nur in To-dos, sondern in Modellen, Zielgruppen, Kanälen und wirtschaftlicher Plausibilität.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Humboldt-Fundament</h3><p>Mein Studium hat die analytische Grundlage geschärft, besonders bei Struktur, Einordnung und sauberem Arbeiten.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Eigene Gewerbe-Erfahrung</h3><p>Ich habe mein eigenes Setup bereits durchdacht und selbst Finanzplanungen erstellt, statt nur theoretisch darüber zu sprechen.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Digitaler Fokus</h3><p>Meine Stärke liegt bei Programmierern, Creatorn und anderen digitalen Geschäftsmodellen, nicht bei pauschaler Beratung für alles.</p></article>
      `,
      servicesHeading: `<p class="eyebrow">Was wir klären</p><h2>Die Themen, die vor dem ersten <span class="brand__accent">sicheren Umsatz</span> sitzen</h2><p>Wir räumen die Punkte aus dem Weg, die digitale Gründer am Anfang unnötig Zeit, Geld und Nerven kosten.</p>`,
      servicesGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Rechtsform &amp; Struktur</h3><p>Welche Form passt wirklich zu deinem Vorhaben und wie baust du dein Setup so auf, dass es nicht sofort wieder angepasst werden muss?</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Business-Check</h3><p>Wir prüfen dein Modell, deine Zielgruppen-Kanäle und die wichtigsten Annahmen, damit du nicht in die falsche Richtung läufst.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Tool- &amp; Bank-Setup</h3><p>Welche Software ist wirklich nötig, welche Bank passt zu dir und welche Abos kannst du dir gerade am Anfang sparen?</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Steuer-Basics &amp; Behörden</h3><p>Ich bin kein Steuerberater und biete keine steuerliche Beratung an. Ich zeige dir aber, welche Informationen du wo findest, wie du sie anhand meiner eigenen Beispiele einordnen kannst und wie du dir die relevanten Grundlagen sauber beschaffst.</p></article>
      `,
      pricingHeading: `<p class="eyebrow">Pricing</p><h2>Deine Investition in einen <span class="brand__accent">sicheren Start</span></h2><p>Je nach Phase bekommst du Klarheit, direkte Umsetzung oder eine engere Begleitung über die kritische Anfangszeit hinweg.</p>`,
      pricingGrid: getStartupPricing('de'),
      limitsHeading: `<p class="eyebrow">Transparenz</p><h2>Was nicht zu meinem <span class="brand__accent">Fachgebiet</span> gehört</h2><p>Damit die Beratung hochwertig bleibt, gibt es klare Grenzen und ehrliche Zuständigkeiten.</p>`,
      limitsGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Keine Beratung zu Jobcenter oder Migration</h3><p>Themen wie Gründungszuschuss, Arbeitslosengeld, Visa oder Aufenthaltsgenehmigungen liegen außerhalb meiner Expertise. Dafür solltest du offizielle Stellen oder spezialisierte Berater nutzen.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Übersetzung statt Fachvertretung</h3><p>Ich übernehme keine fachliche Bearbeitung solcher Behörden-Dokumente. Ich kann dir aber Beamtendeutsch in verständliches Deutsch oder weitere Sprachen übersetzen, damit du weißt, was zu tun ist.</p></article>
      `,
      contactIntro: `<p class="eyebrow">Startup Start</p><h2>Lass uns dein Setup sauber aufsetzen.</h2><p>Wenn du dein digitales Business ohne unnötige Fehler, Abmahnungsrisiken oder Behörden-Chaos starten willst, schauen wir gemeinsam auf dein Modell und den sinnvollsten nächsten Schritt.</p><div class="contact-direct"><a class="contact-direct__link" href="mailto:schobvasily.digital@gmail.com">schobvasily.digital@gmail.com</a><a class="contact-direct__link" href="tel:+4915678301732">+49 156 78301732</a></div>`,
      footerCopy: 'Struktur, Klarheit und Begleitung für digitale Gründer, damit der Start nicht an Formularen, falschen Setups oder Unsicherheit scheitert.',
      form: {
        subject: 'Neue Startup-Anfrage über Schob Digital',
        labels: ['Name', 'E-Mail', 'Unternehmen', 'Service', 'Wo stehst du gerade und wobei brauchst du Unterstützung?'],
        placeholder: 'Welches Paket interessiert dich?',
        consent: 'Ich stimme zu, dass meine Angaben zur Bearbeitung meiner Anfrage verarbeitet werden. Weitere Informationen stehen in der <a href="datenschutz.html">Datenschutzerklärung</a>.',
        submit: 'Beratung anfragen',
        success: 'Danke, deine Nachricht wurde erfolgreich versendet.',
      },
    },
    en: {
      title: 'Startup Support | Schob Digital',
      description: 'Schob Digital helps digital founders with legal structure, bureaucracy, tax basics, and setup so your business can start safely and with clarity.',
      cta: 'Get started',
      heroCopy: `<p class="eyebrow">Startup support</p><h1>Your digital business foundation. <span class="brand__accent">Without bureaucracy chaos.</span></h1><p class="lead">You are building a digital business and bring the actual service or product. I help you navigate the German bureaucracy maze, from legal structure to tool setup, so you can focus on revenue instead of uncertainty.</p><div class="hero__actions"><a class="button button--primary" href="#coaching">Request advice</a><a class="button button--ghost" href="#pricing">View packages</a></div>`,
      heroAlt: 'Startup support and bureaucracy guidance',
      heroNote: '<span>Business foundation</span><span>Clarity before launch</span>',
      socialLabel: 'Backed by',
      whyIntro: `<p class="eyebrow">Why me</p><h2>Founder experience. <span class="brand__accent">Analysis shaped by study and business practice.</span></h2><p>I worked in business analysis on a crowdfunding platform and deepened this perspective through my studies at Humboldt University. That means I do not only see forms, I see the business logic behind them.</p><p>I also created detailed financial planning for my own business and have already worked through the typical questions around structure, banks, recurring obligations, and tool setup myself.</p>`,
      whyGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Business analysis</h3><p>I do not think only in to-dos, but in models, target groups, channels, and economic viability.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Humboldt foundation</h3><p>My academic background sharpened my analytical approach, especially in structure, classification, and clean execution.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Own business experience</h3><p>I have already planned my own setup and built real financial models instead of only talking about them in theory.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Digital focus</h3><p>My strength is working with programmers, creators, and other digital business models, not generic one-size-fits-all advice.</p></article>
      `,
      servicesHeading: `<p class="eyebrow">What we clarify</p><h2>The topics that sit in front of your first <span class="brand__accent">safe revenue</span></h2><p>We remove the issues that cost digital founders unnecessary time, money, and energy at the beginning.</p>`,
      servicesGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Legal structure</h3><p>Which setup actually fits your plan and how do you build it in a way that does not require immediate rework?</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Business check</h3><p>We review your business model, your channels, and your most important assumptions so you do not run in the wrong direction.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Tool &amp; banking setup</h3><p>Which software do you truly need, which bank fits your situation, and which subscriptions can you skip in the beginning?</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Tax basics &amp; authorities</h3><p>I am not a tax advisor and do not provide tax advice. I explain where to find the relevant information, how to gather it, and how to understand the basics using my own examples.</p></article>
      `,
      pricingHeading: `<p class="eyebrow">Pricing</p><h2>Your investment in a <span class="brand__accent">safe start</span></h2><p>Depending on your stage, you get clarity, hands-on implementation, or closer guidance through the most critical early weeks.</p>`,
      pricingGrid: getStartupPricing('en'),
      limitsHeading: `<p class="eyebrow">Transparency</p><h2>What is <span class="brand__accent">not</span> part of my field</h2><p>To keep the support high-quality, there are clear boundaries and honest responsibilities.</p>`,
      limitsGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>No advice on job center or migration issues</h3><p>Topics such as startup grants, unemployment benefits, visas, or residence permits are outside my expertise. Please use official offices or specialized advisors for those.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Translation instead of formal representation</h3><p>I do not take over the technical handling of those authority documents. But I can translate official jargon into understandable language so you know what to do next.</p></article>
      `,
      contactIntro: `<p class="eyebrow">Startup launch</p><h2>Let’s set up your foundation properly.</h2><p>If you want to launch your digital business without avoidable mistakes, legal risks, or bureaucracy chaos, we will look at your model and define the smartest next step together.</p><div class="contact-direct"><a class="contact-direct__link" href="mailto:schobvasily.digital@gmail.com">schobvasily.digital@gmail.com</a><a class="contact-direct__link" href="tel:+4915678301732">+49 156 78301732</a></div>`,
      footerCopy: 'Structure, clarity, and guidance for digital founders so the start does not fail because of forms, weak setups, or uncertainty.',
      form: {
        subject: 'New startup request via Schob Digital',
        labels: ['Name', 'Email', 'Company', 'Service', 'Where are you right now and what kind of support do you need?'],
        placeholder: 'Which package are you interested in?',
        consent: 'I agree that my information may be processed to handle my request. More details are available in the <a href="datenschutz.html">privacy policy</a>.',
        submit: 'Request advice',
        success: 'Thanks, your message was sent successfully.',
      },
    },
    uk: {
      title: 'Підтримка стартапу | Schob Digital',
      description: 'Schob Digital допомагає цифровим засновникам із юридичною структурою, бюрократією, податковими базовими темами та сетапом, щоб бізнес стартував безпечно.',
      cta: 'Почати',
      heroCopy: `<p class="eyebrow">Підтримка стартапу</p><h1>Фундамент вашого цифрового бізнесу. <span class="brand__accent">Без бюрократичного хаосу.</span></h1><p class="lead">Ви будуєте цифровий бізнес і приносите реальну експертизу чи продукт. Я проведу вас через німецький бюрократичний лабіринт — від юридичної форми до налаштування інструментів, щоб ви могли фокусуватися на доході, а не на невпевненості.</p><div class="hero__actions"><a class="button button--primary" href="#coaching">Запитати консультацію</a><a class="button button--ghost" href="#pricing">Переглянути пакети</a></div>`,
      heroAlt: 'Підтримка стартапу та бюрократична навігація',
      heroNote: '<span>Фундамент бізнесу</span><span>Ясність до старту</span>',
      socialLabel: 'Підкріплено',
      whyIntro: `<p class="eyebrow">Чому я</p><h2>Практика засновника. <span class="brand__accent">Аналітика, підкріплена навчанням і бізнес-досвідом.</span></h2><p>Я працював у сфері бізнес-аналізу на crowdfunding-платформі та поглибив цей підхід через навчання в Humboldt University. Тому я бачу не лише форми, а й бізнес-логіку за ними.</p><p>Крім того, я вже створював детальні фінансові плани для власного бізнесу й сам проходив типові питання щодо структури, банків, обов’язків і налаштування інструментів.</p>`,
      whyGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Бізнес-аналіз</h3><p>Я думаю не лише категоріями задач, а й моделями, цільовими аудиторіями, каналами та економічною логікою.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Фундамент Humboldt</h3><p>Навчання загострило мій аналітичний підхід, особливо в структурі, класифікації та чистій роботі.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Власний досвід бізнесу</h3><p>Я вже сам продумав свій сетап і будував реальні фінансові плани, а не лише говорив про це теоретично.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Фокус на digital</h3><p>Моя сильна сторона — програмісти, creators і цифрові бізнес-моделі, а не універсальні поради для всіх випадків.</p></article>
      `,
      servicesHeading: `<p class="eyebrow">Що ми прояснюємо</p><h2>Теми, які стоять перед вашим першим <span class="brand__accent">безпечним доходом</span></h2><p>Ми прибираємо питання, які на старті забирають у цифрових засновників зайвий час, гроші та нерви.</p>`,
      servicesGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Юридична форма &amp; структура</h3><p>Яка форма дійсно підходить вашому плану і як побудувати сетап так, щоб його не довелося одразу переробляти?</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Перевірка бізнесу</h3><p>Ми переглянемо вашу модель, канали й ключові припущення, щоб ви не рухалися в хибному напрямку.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">03</p><h3>Інструменти &amp; банки</h3><p>Яке ПЗ вам реально потрібне, який банк підходить саме вам і від яких підписок можна відмовитися на старті?</p></article>
        <article class="surface-card method-step"><p class="method-step__index">04</p><h3>Податкові основи &amp; держоргани</h3><p>Я не є податковим консультантом і не надаю податкових консультацій. Але я покажу, де шукати потрібну інформацію, як її збирати і як зрозуміти базові речі на основі власних прикладів.</p></article>
      `,
      pricingHeading: `<p class="eyebrow">Пакети</p><h2>Ваша інвестиція в <span class="brand__accent">безпечний старт</span></h2><p>Залежно від вашого етапу ви отримуєте ясність, практичну реалізацію або тісніший супровід у найкритичніші перші тижні.</p>`,
      pricingGrid: getStartupPricing('uk'),
      limitsHeading: `<p class="eyebrow">Прозорість</p><h2>Що <span class="brand__accent">не входить</span> до моєї експертизи</h2><p>Щоб підтримка залишалася якісною, я чітко окреслюю межі та відповідальність.</p>`,
      limitsGrid: `
        <article class="surface-card method-step"><p class="method-step__index">01</p><h3>Без консультацій щодо Jobcenter або міграції</h3><p>Теми на кшталт startup-грантів, безробіття, віз чи дозволів на проживання не входять до моєї експертизи. Для цього краще звертатися до офіційних установ або профільних консультантів.</p></article>
        <article class="surface-card method-step"><p class="method-step__index">02</p><h3>Переклад замість офіційного представництва</h3><p>Я не беру на себе формальне опрацювання документів від держорганів. Але можу перекласти їх зрозумілою мовою, щоб ви чітко розуміли, що робити далі.</p></article>
      `,
      contactIntro: `<p class="eyebrow">Старт стартапу</p><h2>Давайте правильно налаштуємо ваш фундамент.</h2><p>Якщо ви хочете запустити цифровий бізнес без зайвих помилок, юридичних ризиків і бюрократичного хаосу, ми разом подивимося на вашу модель і визначимо найрозумніший наступний крок.</p><div class="contact-direct"><a class="contact-direct__link" href="mailto:schobvasily.digital@gmail.com">schobvasily.digital@gmail.com</a><a class="contact-direct__link" href="tel:+4915678301732">+49 156 78301732</a></div>`,
      footerCopy: 'Структура, ясність і супровід для цифрових засновників, щоб старт не зламався через форми, слабкий сетап чи невпевненість.',
      form: {
        subject: 'Новий startup-запит через Schob Digital',
        labels: ['Ім’я', 'Email', 'Компанія', 'Сервіс', 'На якому етапі ви зараз і яка підтримка вам потрібна?'],
        placeholder: 'Який пакет вас цікавить?',
        consent: 'Я погоджуюся, що мої дані можуть оброблятися для відповіді на мій запит. Детальніше в <a href="datenschutz.html">політиці конфіденційності</a>.',
        submit: 'Запитати консультацію',
        success: 'Дякую, ваше повідомлення успішно надіслано.',
      },
    },
  }[currentLanguage];

  applyMeta(t.title, t.description);
  setText('.site-header__cta', t.cta);
  setHTML('.hero__copy', t.heroCopy);
  setAttr('.hero__image--product', 'alt', t.heroAlt);
  setHTML('.hero__note', t.heroNote);
  setText('.social-proof__label', t.socialLabel);
  setHTML('#why-me .method-intro', t.whyIntro);
  setHTML('#why-me .method-steps', t.whyGrid);
  setHTML('#services .section-heading', t.servicesHeading);
  setHTML('#services .method-steps', t.servicesGrid);
  setHTML('#pricing .section-heading', t.pricingHeading);
  setHTML('#pricing .pricing-grid', t.pricingGrid);
  setHTML('#limits .section-heading', t.limitsHeading);
  setHTML('#limits .method-steps', t.limitsGrid);
  setHTML('#coaching .contact-panel__intro', t.contactIntro);
  setText('.footer-copy', t.footerCopy);
  applyFormTranslations(t.form);
}

function applyPrivacyTranslations() {
  const t = {
    de: {
      title: 'Datenschutz | Schob Digital',
      description: 'Datenschutzhinweise für die Website von Schob Digital.',
      cta: 'Kontakt',
      heroEyebrow: 'Rechtliches',
      heroTitle: 'Datenschutz',
      heroText: 'Hier findest du die Datenschutzhinweise zur Nutzung dieser Website sowie zur direkten Kontaktaufnahme per E-Mail oder Telefon.',
      jumps: ['Verantwortlicher', 'SSL / TLS', 'Kontaktformular', 'Google Analytics', 'Ihre Rechte', 'Widerspruchsrecht'],
      footerCopy: 'Zwei Leistungsseiten, ein einheitlicher Auftritt und eine saubere rechtliche Basis für GitHub Pages.',
      source: 'Datenschutz.txt',
    },
    en: {
      title: 'Privacy | Schob Digital',
      description: 'Privacy information for the Schob Digital website.',
      cta: 'Contact',
      heroEyebrow: 'Legal',
      heroTitle: 'Privacy',
      heroText: 'Here you can find the privacy information for using this website as well as for direct contact by email or phone.',
      jumps: ['Controller', 'SSL / TLS', 'Contact form', 'Google Analytics', 'Your rights', 'Right to object'],
      footerCopy: 'Two service pages, one consistent presence, and a clean legal foundation for GitHub Pages.',
      source: 'Datenschutz.en.txt',
    },
    uk: {
      title: 'Конфіденційність | Schob Digital',
      description: 'Інформація про конфіденційність для вебсайту Schob Digital.',
      cta: 'Контакт',
      heroEyebrow: 'Правова інформація',
      heroTitle: 'Конфіденційність',
      heroText: 'Тут ви знайдете інформацію про обробку даних під час використання цього сайту, а також при прямому зверненні електронною поштою або телефоном.',
      jumps: ['Відповідальний', 'SSL / TLS', 'Контактна форма', 'Google Analytics', 'Ваші права', 'Право на заперечення'],
      footerCopy: 'Дві сервісні сторінки, єдиний стиль і чиста юридична база для GitHub Pages.',
      source: 'Datenschutz.uk.txt',
    },
  }[currentLanguage];

  applyMeta(t.title, t.description);
  setText('.site-header__cta', t.cta);
  setText('.legal-hero .eyebrow', t.heroEyebrow);
  setText('.legal-hero h1', t.heroTitle);
  setText('.legal-hero p:last-child', t.heroText);
  setNodeText('.legal-jump-nav a', t.jumps);
  setText('.footer-copy', t.footerCopy);
  setAttr('.legal-content', 'data-legal-source', t.source);
}

function applyImprintTranslations() {
  const t = {
    de: {
      title: 'Impressum | Schob Digital',
      description: 'Impressum der Website von Schob Digital.',
      cta: 'Kontakt',
      heroEyebrow: 'Rechtliches',
      heroTitle: 'Impressum',
      heroText: 'Die folgenden Angaben enthalten die Pflichtinformationen zu dieser Website und den angebotenen Leistungen.',
      footerCopy: 'Zwei Leistungsseiten, ein einheitlicher Auftritt und eine saubere rechtliche Basis für GitHub Pages.',
      source: 'Impressum.txt',
    },
    en: {
      title: 'Legal Notice | Schob Digital',
      description: 'Legal notice for the Schob Digital website.',
      cta: 'Contact',
      heroEyebrow: 'Legal',
      heroTitle: 'Legal Notice',
      heroText: 'The following information contains the mandatory details for this website and the services offered.',
      footerCopy: 'Two service pages, one consistent presence, and a clean legal foundation for GitHub Pages.',
      source: 'Impressum.en.txt',
    },
    uk: {
      title: 'Дані | Schob Digital',
      description: 'Правова інформація для вебсайту Schob Digital.',
      cta: 'Контакт',
      heroEyebrow: 'Правова інформація',
      heroTitle: 'Дані',
      heroText: 'Наведені нижче дані містять обов’язкову інформацію про цей вебсайт і запропоновані послуги.',
      footerCopy: 'Дві сервісні сторінки, єдиний стиль і чиста юридична база для GitHub Pages.',
      source: 'Impressum.uk.txt',
    },
  }[currentLanguage];

  applyMeta(t.title, t.description);
  setText('.site-header__cta', t.cta);
  setText('.legal-hero .eyebrow', t.heroEyebrow);
  setText('.legal-hero h1', t.heroTitle);
  setText('.legal-hero p:last-child', t.heroText);
  setText('.footer-copy', t.footerCopy);
  setAttr('.legal-content', 'data-legal-source', t.source);
}

function applyFormTranslations(form) {
  setAttr('input[name="_subject"]', 'value', form.subject);
  setNodeText('.contact-form__field label', form.labels);
  setAttr('#contact-service', 'placeholder', form.placeholder);
  setHTML('.contact-form__check span', form.consent);
  setText('.contact-form__submit', form.submit);
  setText('#contact-success', form.success);
}

function updateLanguageSwitcher() {
  const switchLinks = document.querySelectorAll('[data-lang-switch]');

  switchLinks.forEach((link) => {
    const lang = link.getAttribute('data-lang-switch');
    link.setAttribute('href', buildLocalizedUrl(window.location.pathname, lang, window.location.hash));
    link.setAttribute('aria-current', String(lang === currentLanguage));
  });
}

function rewriteInternalLinks() {
  const links = document.querySelectorAll('a[href]');

  links.forEach((link) => {
    const rawHref = link.getAttribute('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || /^https?:\/\//i.test(rawHref)) {
      return;
    }

    const [pathPart, hashPart = ''] = rawHref.split('#');
    if (!pathPart.endsWith('.html')) {
      return;
    }

    link.setAttribute('href', buildLocalizedUrl(pathPart, currentLanguage, hashPart ? `#${hashPart}` : ''));
  });
}

function upgradePricingDetails() {
  const toggleButtons = document.querySelectorAll('[data-pricing-toggle]');

  toggleButtons.forEach((button) => {
    const detailsBody = button.nextElementSibling;

    if (!detailsBody || !detailsBody.classList.contains('pricing-card__details')) {
      return;
    }

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const toneClass = Array.from(button.classList).find((className) => className.startsWith('pricing-card__toggle--'));

    details.className = `pricing-card__details${toneClass ? ` ${toneClass.replace('toggle', 'details')}` : ''}`;
    summary.className = `button pricing-card__summary${toneClass ? ` ${toneClass}` : ''}`;
    summary.textContent = button.textContent.trim();

    detailsBody.classList.add('pricing-card__details-body');
    detailsBody.removeAttribute('hidden');

    details.append(summary, detailsBody);
    button.replaceWith(details);
  });
}

function decoratePackageRequestLinks() {
  const packageTriggers = document.querySelectorAll('button[data-package-request]');

  packageTriggers.forEach((button) => {
    const selectedPackage = button.getAttribute('data-package-request');

    if (!selectedPackage) {
      return;
    }

    const link = document.createElement('a');

    link.className = button.className;
    link.href = buildPackageRequestUrl(selectedPackage);
    link.innerHTML = button.innerHTML;
    link.setAttribute('data-package-request', selectedPackage);

    const ariaLabel = button.getAttribute('aria-label');
    if (ariaLabel) {
      link.setAttribute('aria-label', ariaLabel);
    }

    if (button.classList.contains('pricing-card__image-button')) {
      link.setAttribute('role', 'button');
    }

    button.replaceWith(link);
  });
}

function ensurePricingPackageValues() {
  const pricingCards = document.querySelectorAll('.pricing-card');

  pricingCards.forEach((card) => {
    const existingValue = card.querySelector('.pricing-card__package-value');
    const trigger = card.querySelector('[data-package-request]');
    const selectedPackage = trigger?.getAttribute('data-package-request');

    if (!selectedPackage) {
      return;
    }

    if (existingValue instanceof HTMLInputElement) {
      existingValue.value = selectedPackage;
      return;
    }

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.className = 'pricing-card__package-value';
    hiddenInput.value = selectedPackage;
    card.prepend(hiddenInput);
  });
}

function buildLocalizedUrl(path, lang, hash) {
  const normalizedPath = path || window.location.pathname.split('/').pop() || 'index.html';
  const suffix = lang ? `?lang=${lang}` : '';
  return `${normalizedPath}${suffix}${hash || ''}`;
}

function buildPackageRequestUrl(packageName) {
  return '#coaching';
}

function applyMeta(title, description) {
  document.title = title;
  const descriptionNode = document.querySelector('meta[name="description"]');
  if (descriptionNode) {
    descriptionNode.setAttribute('content', description);
  }
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function setHTML(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.innerHTML = value;
  }
}

function setAttr(selector, name, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.setAttribute(name, value);
  }
}

function setNodeText(selector, values) {
  const nodes = document.querySelectorAll(selector);
  nodes.forEach((node, index) => {
    if (values[index] !== undefined) {
      node.textContent = values[index];
    }
  });
}

function getCurrentLanguage() {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get('lang');
  if (queryLang && supportedLanguages.has(queryLang)) {
    return queryLang;
  }

  const stored = window.localStorage.getItem('schob_site_language');
  if (stored && supportedLanguages.has(stored)) {
    return stored;
  }

  return 'de';
}

function getHomePricing(lang) {
  const pricing = {
    de: `
      <article class="surface-card pricing-card pricing-card--s">
        <p class="offer-card__index">Paket S</p>
        <button class="pricing-card__image-button pricing-card__jump pricing-card__jump--s" type="button" data-package-request="Paket S: Das Kickstart-Setup" aria-label="Paket S unverbindlich anfragen">
          <img class="offer-card__image pricing-card__image" src="Photos/s.JPG" alt="Paket S Kickstart-Setup">
        </button>
        <h3>Das Kickstart-Setup</h3>
        <p class="pricing-card__intro">Der reibungslose 1-Stunden-Einstieg in deine KI-Entwicklung, ohne Tutorial-Hölle und ohne ständige Unsicherheit bei der Tool-Auswahl.</p>
        <button class="button pricing-card__toggle pricing-card__toggle--s" type="button" data-pricing-toggle aria-expanded="false" aria-controls="pricing-details-s">Mehr</button>
        <div id="pricing-details-s" class="pricing-card__details" hidden>
          <p>Wenn du seit Wochen recherchierst und trotzdem nicht weißt, womit du anfangen sollst, stoppen wir genau diesen Kreislauf. In einem 1-stündigen 1:1-Call richte ich deinen Laptop individuell ein und wähle mit dir das passende Modell oder Modell-Setup für deinen Start.</p>
          <div class="pricing-meta">
            <p><strong>Fokus:</strong> 1 Stunde 1:1 Einrichtung, individuelles Setup und ein sofort einsatzbereiter KI-Workflow.</p>
            <p><strong>Dein Wert:</strong> Volle Klarheit, keine Frustration und ein sauberer Start statt endloser Theorie.</p>
            <p><strong>Investition:</strong> 99 € <span>(zzgl. MwSt.)</span></p>
          </div>
          <button class="button pricing-card__cta pricing-card__cta--s" type="button" data-package-request="Paket S: Das Kickstart-Setup">Unverbindlich anfragen</button>
        </div>
      </article>
      <article class="surface-card pricing-card pricing-card--m">
        <p class="offer-card__index">Paket M</p>
        <button class="pricing-card__image-button pricing-card__jump pricing-card__jump--m" type="button" data-package-request="Paket M: Der MVP-Builder" aria-label="Paket M unverbindlich anfragen">
          <img class="offer-card__image pricing-card__image" src="Photos/m.JPG" alt="Paket M MVP Builder">
        </button>
        <h3>Der MVP-Builder</h3>
        <p class="pricing-card__intro">Fünf Stunden Strategie, Code und ein erstes funktionierendes Produkt, das du noch am selben Tag testen kannst.</p>
        <button class="button pricing-card__toggle pricing-card__toggle--m" type="button" data-pricing-toggle aria-expanded="false" aria-controls="pricing-details-m">Mehr</button>
        <div id="pricing-details-m" class="pricing-card__details" hidden>
          <p>Schluss mit blind kopiertem KI-Code. In diesem Intensiv-Coaching planen wir deine Tasks glasklar, bauen dein erstes Produkt sauber auf und bringen dich noch am selben Tag ins Testen.</p>
          <div class="pricing-meta">
            <p><strong>Fokus:</strong> 5 Stunden 1:1 Coaching, Task-Planung, erstes Coding und Testing direkt auf dem Smartphone.</p>
            <p><strong>Dein Wert:</strong> Du überspringst Monate an Trial-and-Error und hältst dein erstes stabiles Produkt in den Händen.</p>
            <p><strong>Investition:</strong> 499 € <span>(zzgl. MwSt.)</span></p>
          </div>
          <button class="button pricing-card__cta pricing-card__cta--m" type="button" data-package-request="Paket M: Der MVP-Builder">Unverbindlich anfragen</button>
        </div>
      </article>
      <article class="surface-card pricing-card pricing-card--l">
        <p class="offer-card__index">Paket L</p>
        <button class="pricing-card__image-button pricing-card__jump pricing-card__jump--l" type="button" data-package-request="Paket L: Der Solo-Founder Companion" aria-label="Paket L unverbindlich anfragen">
          <img class="offer-card__image pricing-card__image" src="Photos/L.JPG" alt="Paket L Solo-Founder Companion">
        </button>
        <h3>Der Solo-Founder Companion</h3>
        <p class="pricing-card__intro">Alles aus Paket M plus 4 Wochen enge Begleitung für Gründer, die langfristig und mit deutlich mehr Sicherheit vorankommen wollen.</p>
        <button class="button pricing-card__toggle pricing-card__toggle--l" type="button" data-pricing-toggle aria-expanded="false" aria-controls="pricing-details-l">Mehr</button>
        <div id="pricing-details-l" class="pricing-card__details" hidden>
          <p>Du bekommst nicht nur die intensive technische Basis, sondern auch wöchentliche Strategie-Calls, Prioritäts-Support und einen Sparringspartner für technische, visuelle und geschäftliche Fragen.</p>
          <div class="pricing-meta">
            <p><strong>Fokus:</strong> Paket M plus 4 wöchentliche 1:1 Calls, Priority Support sowie Design- und Landingpage-Grundlagen.</p>
            <p><strong>Dein Wert:</strong> Mehr Momentum, mehr Sicherheit und deutlich weniger Risiko, kurz vor dem Ziel aufzugeben.</p>
            <p><strong>Investition:</strong> 999 € <span>(zzgl. MwSt.)</span></p>
          </div>
          <button class="button pricing-card__cta pricing-card__cta--l" type="button" data-package-request="Paket L: Der Solo-Founder Companion">Unverbindlich anfragen</button>
        </div>
      </article>
    `,
    en: `
      <article class="surface-card pricing-card pricing-card--s"><p class="offer-card__index">Package S</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--s" type="button" data-package-request="Package S: The Kickstart Setup" aria-label="Request Package S"><img class="offer-card__image pricing-card__image" src="Photos/s.JPG" alt="Package S Kickstart Setup"></button><h3>The Kickstart Setup</h3><p class="pricing-card__intro">A smooth 1-hour entry into AI-based development, without tutorial hell and without constant uncertainty around tools.</p><button class="button pricing-card__toggle pricing-card__toggle--s" type="button" data-pricing-toggle aria-expanded="false" aria-controls="pricing-details-s">More</button><div id="pricing-details-s" class="pricing-card__details" hidden><p>If you have been researching for weeks and still do not know where to begin, we stop that cycle. In one focused 1:1 call, I set up your laptop and choose the right model or model combination for your use case.</p><div class="pricing-meta"><p><strong>Focus:</strong> 1 hour of 1:1 setup, tailored workflow, and a ready-to-use AI environment.</p><p><strong>Your value:</strong> Clarity, less frustration, and a clean start instead of endless theory.</p><p><strong>Investment:</strong> €99 <span>(plus VAT)</span></p></div><button class="button pricing-card__cta pricing-card__cta--s" type="button" data-package-request="Package S: The Kickstart Setup">Request without obligation</button></div></article>
      <article class="surface-card pricing-card pricing-card--m"><p class="offer-card__index">Package M</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--m" type="button" data-package-request="Package M: The MVP Builder" aria-label="Request Package M"><img class="offer-card__image pricing-card__image" src="Photos/m.JPG" alt="Package M MVP Builder"></button><h3>The MVP Builder</h3><p class="pricing-card__intro">Five hours of strategy, code, and a first working product you can test the same day.</p><button class="button pricing-card__toggle pricing-card__toggle--m" type="button" data-pricing-toggle aria-expanded="false" aria-controls="pricing-details-m">More</button><div id="pricing-details-m" class="pricing-card__details" hidden><p>No more blindly copied AI code that falls apart on the first error. We plan your tasks clearly, build a stable first version, and get you testing on the same day.</p><div class="pricing-meta"><p><strong>Focus:</strong> 5 hours of 1:1 coaching, task planning, first coding, and smartphone testing.</p><p><strong>Your value:</strong> You skip months of trial and error and end the day with a stable first product.</p><p><strong>Investment:</strong> €499 <span>(plus VAT)</span></p></div><button class="button pricing-card__cta pricing-card__cta--m" type="button" data-package-request="Package M: The MVP Builder">Request without obligation</button></div></article>
      <article class="surface-card pricing-card pricing-card--l"><p class="offer-card__index">Package L</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--l" type="button" data-package-request="Package L: The Solo-Founder Companion" aria-label="Request Package L"><img class="offer-card__image pricing-card__image" src="Photos/L.JPG" alt="Package L Solo-Founder Companion"></button><h3>The Solo-Founder Companion</h3><p class="pricing-card__intro">Everything from Package M plus 4 weeks of close guidance for founders who want to move with more stability and less risk.</p><button class="button pricing-card__toggle pricing-card__toggle--l" type="button" data-pricing-toggle aria-expanded="false" aria-controls="pricing-details-l">More</button><div id="pricing-details-l" class="pricing-card__details" hidden><p>You get not only the technical base, but also weekly strategy calls, priority support, and a sparring partner for technical, visual, and business questions.</p><div class="pricing-meta"><p><strong>Focus:</strong> Package M plus 4 weekly 1:1 calls, priority support, and design and landing page basics.</p><p><strong>Your value:</strong> More momentum, more confidence, and much less risk of quitting before the finish line.</p><p><strong>Investment:</strong> €999 <span>(plus VAT)</span></p></div><button class="button pricing-card__cta pricing-card__cta--l" type="button" data-package-request="Package L: The Solo-Founder Companion">Request without obligation</button></div></article>
    `,
    uk: `
      <article class="surface-card pricing-card pricing-card--s"><p class="offer-card__index">Пакет S</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--s" type="button" data-package-request="Пакет S: Стартовий сетап" aria-label="Запитати пакет S"><img class="offer-card__image pricing-card__image" src="Photos/s.JPG" alt="Пакет S Стартовий сетап"></button><h3>Стартовий сетап</h3><p class="pricing-card__intro">Плавний 1-годинний вхід у AI-розробку без tutorial hell і без постійної невпевненості у виборі інструментів.</p><button class="button pricing-card__toggle pricing-card__toggle--s" type="button" data-pricing-toggle aria-expanded="false" aria-controls="pricing-details-s">Більше</button><div id="pricing-details-s" class="pricing-card__details" hidden><p>Якщо ви вже тижнями досліджуєте тему й досі не знаєте, з чого почати, ми зупинимо це коло. За одну 1:1-сесію я налаштую ваш ноутбук і разом із вами підберу правильну модель або поєднання моделей для старту.</p><div class="pricing-meta"><p><strong>Фокус:</strong> 1 година 1:1 налаштування, індивідуальний workflow і готове до роботи AI-середовище.</p><p><strong>Ваша цінність:</strong> Ясність, менше фрустрації та чистий старт замість нескінченної теорії.</p><p><strong>Інвестиція:</strong> 99 € <span>(без ПДВ)</span></p></div><button class="button pricing-card__cta pricing-card__cta--s" type="button" data-package-request="Пакет S: Стартовий сетап">Запитати без зобов’язань</button></div></article>
      <article class="surface-card pricing-card pricing-card--m"><p class="offer-card__index">Пакет M</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--m" type="button" data-package-request="Пакет M: MVP Builder" aria-label="Запитати пакет M"><img class="offer-card__image pricing-card__image" src="Photos/m.JPG" alt="Пакет M MVP Builder"></button><h3>MVP Builder</h3><p class="pricing-card__intro">П’ять годин стратегії, коду й першого робочого продукту, який можна протестувати того ж дня.</p><button class="button pricing-card__toggle pricing-card__toggle--m" type="button" data-pricing-toggle aria-expanded="false" aria-controls="pricing-details-m">Більше</button><div id="pricing-details-m" class="pricing-card__details" hidden><p>Жодного сліпого копіювання AI-коду, який розсипається на першій помилці. Ми чітко плануємо задачі, будуємо стабільну першу версію й доводимо її до тестування в той самий день.</p><div class="pricing-meta"><p><strong>Фокус:</strong> 5 годин 1:1 роботи, планування задач, перший код і тестування на смартфоні.</p><p><strong>Ваша цінність:</strong> Ви перескакуєте місяці проб і помилок та отримуєте перший стабільний продукт.</p><p><strong>Інвестиція:</strong> 499 € <span>(без ПДВ)</span></p></div><button class="button pricing-card__cta pricing-card__cta--m" type="button" data-package-request="Пакет M: MVP Builder">Запитати без зобов’язань</button></div></article>
      <article class="surface-card pricing-card pricing-card--l"><p class="offer-card__index">Пакет L</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--l" type="button" data-package-request="Пакет L: Solo-Founder Companion" aria-label="Запитати пакет L"><img class="offer-card__image pricing-card__image" src="Photos/L.JPG" alt="Пакет L Solo-Founder Companion"></button><h3>Solo-Founder Companion</h3><p class="pricing-card__intro">Усе з пакета M плюс 4 тижні близького супроводу для засновників, яким потрібна стабільність і менше ризику.</p><button class="button pricing-card__toggle pricing-card__toggle--l" type="button" data-pricing-toggle aria-expanded="false" aria-controls="pricing-details-l">Більше</button><div id="pricing-details-l" class="pricing-card__details" hidden><p>Ви отримуєте не лише технічну базу, а й щотижневі стратегічні дзвінки, пріоритетну підтримку та sparring partner для технічних, візуальних і бізнес-питань.</p><div class="pricing-meta"><p><strong>Фокус:</strong> Пакет M плюс 4 щотижневі 1:1 дзвінки, пріоритетна підтримка та бази дизайну й landing pages.</p><p><strong>Ваша цінність:</strong> Більше momentum, більше впевненості та значно менший ризик здатися перед фінішем.</p><p><strong>Інвестиція:</strong> 999 € <span>(без ПДВ)</span></p></div><button class="button pricing-card__cta pricing-card__cta--l" type="button" data-package-request="Пакет L: Solo-Founder Companion">Запитати без зобов’язань</button></div></article>
    `,
  };

  return pricing[lang];
}

function getWebsitePricing(lang) {
  const pricing = {
    de: `
      <article class="surface-card pricing-card pricing-card--s"><p class="offer-card__index">Paket S</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--s" type="button" data-package-request="Paket S: Der digitale Schnellstarter" aria-label="Paket S unverbindlich anfragen"><img class="offer-card__image pricing-card__image" src="Photos/s.JPG" alt="Paket S Der digitale Schnellstarter"></button><h3>Der digitale Schnellstarter</h3><p class="pricing-card__intro">Professionelle One-Page-Landingpage inklusive Basis-SEO und Domain-Anbindung. Ideal für den schnellen Markteintritt.</p><button class="button pricing-card__toggle pricing-card__toggle--s" type="button" data-pricing-toggle aria-expanded="false" aria-controls="website-pricing-details-s">Mehr</button><div id="website-pricing-details-s" class="pricing-card__details" hidden><p>Dieses Paket ist für Unternehmer gedacht, die schnell online gehen wollen, ohne an Design, Performance oder Professionalität zu sparen.</p><div class="pricing-meta"><p><strong>Inhalt:</strong> Professionelle One-Page-Landingpage, Basis-SEO und Anbindung deiner Domain.</p><p><strong>Ideal für:</strong> Schnellen Markteintritt, erste Kampagnen und fokussierte Angebotsseiten.</p><p><strong>Preis:</strong> 499 € <span>(zzgl. MwSt.)</span></p></div><button class="button pricing-card__cta pricing-card__cta--s" type="button" data-package-request="Paket S: Der digitale Schnellstarter">Unverbindlich anfragen</button></div></article>
      <article class="surface-card pricing-card pricing-card--m"><p class="offer-card__index">Paket M</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--m" type="button" data-package-request="Paket M: Das Business-Fundament" aria-label="Paket M unverbindlich anfragen"><img class="offer-card__image pricing-card__image" src="Photos/m.JPG" alt="Paket M Das Business-Fundament"></button><h3>Das Business-Fundament</h3><p class="pricing-card__intro">Komplette Website mit bis zu 5 Unterseiten inklusive rechtssicherem Impressum und Datenschutzerklärung.</p><button class="button pricing-card__toggle pricing-card__toggle--m" type="button" data-pricing-toggle aria-expanded="false" aria-controls="website-pricing-details-m">Mehr</button><div id="website-pricing-details-m" class="pricing-card__details" hidden><p>Dieses Paket ist der Standard für Solo-Selbstständige und kleine Firmen, die online nicht improvisieren wollen.</p><div class="pricing-meta"><p><strong>Inhalt:</strong> Website mit bis zu 5 Unterseiten wie About, Leistungen oder Team inklusive Impressum und Datenschutzerklärung.</p><p><strong>Ideal für:</strong> Dienstleister, kleine Unternehmen und Personenmarken mit professionellem Außenauftritt.</p><p><strong>Preis:</strong> 899 € <span>(zzgl. MwSt.)</span></p></div><button class="button pricing-card__cta pricing-card__cta--m" type="button" data-package-request="Paket M: Das Business-Fundament">Unverbindlich anfragen</button></div></article>
    `,
    en: `
      <article class="surface-card pricing-card pricing-card--s"><p class="offer-card__index">Package S</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--s" type="button" data-package-request="Package S: The Digital Quickstart" aria-label="Request Package S"><img class="offer-card__image pricing-card__image" src="Photos/s.JPG" alt="Package S Digital Quickstart"></button><h3>The Digital Quickstart</h3><p class="pricing-card__intro">A professional one-page landing page including basic SEO and domain connection. Ideal for a fast market entry.</p><button class="button pricing-card__toggle pricing-card__toggle--s" type="button" data-pricing-toggle aria-expanded="false" aria-controls="website-pricing-details-s">More</button><div id="website-pricing-details-s" class="pricing-card__details" hidden><p>This package is built for entrepreneurs who want to go online fast without compromising on design, performance, or credibility.</p><div class="pricing-meta"><p><strong>Included:</strong> Professional one-page landing page, basic SEO, and domain connection.</p><p><strong>Ideal for:</strong> Fast market entry, first campaigns, and focused offer pages.</p><p><strong>Price:</strong> €499 <span>(plus VAT)</span></p></div><button class="button pricing-card__cta pricing-card__cta--s" type="button" data-package-request="Package S: The Digital Quickstart">Request without obligation</button></div></article>
      <article class="surface-card pricing-card pricing-card--m"><p class="offer-card__index">Package M</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--m" type="button" data-package-request="Package M: The Business Foundation" aria-label="Request Package M"><img class="offer-card__image pricing-card__image" src="Photos/m.JPG" alt="Package M Business Foundation"></button><h3>The Business Foundation</h3><p class="pricing-card__intro">A complete website with up to five subpages, including a legal notice and privacy policy.</p><button class="button pricing-card__toggle pricing-card__toggle--m" type="button" data-pricing-toggle aria-expanded="false" aria-controls="website-pricing-details-m">More</button><div id="website-pricing-details-m" class="pricing-card__details" hidden><p>This is the standard package for solo professionals and small companies that do not want to improvise online.</p><div class="pricing-meta"><p><strong>Included:</strong> Website with up to five pages such as About, Services, or Team, including legal notice and privacy policy.</p><p><strong>Ideal for:</strong> Service providers, small businesses, and personal brands with a professional public presence.</p><p><strong>Price:</strong> €899 <span>(plus VAT)</span></p></div><button class="button pricing-card__cta pricing-card__cta--m" type="button" data-package-request="Package M: The Business Foundation">Request without obligation</button></div></article>
    `,
    uk: `
      <article class="surface-card pricing-card pricing-card--s"><p class="offer-card__index">Пакет S</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--s" type="button" data-package-request="Пакет S: Швидкий цифровий старт" aria-label="Запитати пакет S"><img class="offer-card__image pricing-card__image" src="Photos/s.JPG" alt="Пакет S Швидкий цифровий старт"></button><h3>Швидкий цифровий старт</h3><p class="pricing-card__intro">Професійна one-page landing page з базовим SEO та підключенням домену. Ідеально для швидкого виходу на ринок.</p><button class="button pricing-card__toggle pricing-card__toggle--s" type="button" data-pricing-toggle aria-expanded="false" aria-controls="website-pricing-details-s">Більше</button><div id="website-pricing-details-s" class="pricing-card__details" hidden><p>Цей пакет для підприємців, які хочуть швидко вийти онлайн без компромісів у дизайні, швидкості чи довірі.</p><div class="pricing-meta"><p><strong>Що входить:</strong> Професійна one-page landing page, базове SEO та підключення домену.</p><p><strong>Ідеально для:</strong> Швидкого старту, перших кампаній і сфокусованих продаючих сторінок.</p><p><strong>Ціна:</strong> 499 € <span>(без ПДВ)</span></p></div><button class="button pricing-card__cta pricing-card__cta--s" type="button" data-package-request="Пакет S: Швидкий цифровий старт">Запитати без зобов’язань</button></div></article>
      <article class="surface-card pricing-card pricing-card--m"><p class="offer-card__index">Пакет M</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--m" type="button" data-package-request="Пакет M: Бізнес-фундамент" aria-label="Запитати пакет M"><img class="offer-card__image pricing-card__image" src="Photos/m.JPG" alt="Пакет M Бізнес-фундамент"></button><h3>Бізнес-фундамент</h3><p class="pricing-card__intro">Повноцінний сайт до 5 підсторінок включно з imprint та політикою конфіденційності.</p><button class="button pricing-card__toggle pricing-card__toggle--m" type="button" data-pricing-toggle aria-expanded="false" aria-controls="website-pricing-details-m">Більше</button><div id="website-pricing-details-m" class="pricing-card__details" hidden><p>Це стандартний пакет для solo-підприємців і малих компаній, які не хочуть імпровізувати онлайн.</p><div class="pricing-meta"><p><strong>Що входить:</strong> Сайт до 5 сторінок, наприклад About, Services або Team, включно з imprint і політикою конфіденційності.</p><p><strong>Ідеально для:</strong> Сервісних бізнесів, малих компаній і personal brands з професійним зовнішнім образом.</p><p><strong>Ціна:</strong> 899 € <span>(без ПДВ)</span></p></div><button class="button pricing-card__cta pricing-card__cta--m" type="button" data-package-request="Пакет M: Бізнес-фундамент">Запитати без зобов’язань</button></div></article>
    `,
  };
  return pricing[lang];
}

function getStartupPricing(lang) {
  const pricing = {
    de: `
      <article class="surface-card pricing-card pricing-card--s"><p class="offer-card__index">Paket S</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--s" type="button" data-package-request="Paket S: Der Strategie-Kompass" aria-label="Paket S unverbindlich anfragen"><img class="offer-card__image pricing-card__image" src="Photos/s.JPG" alt="Paket S Strategie-Kompass"></button><h3>Der Strategie-Kompass</h3><p class="pricing-card__intro">Klarheit für deinen Start. In dieser Erstberatung sortieren wir das anfängliche Chaos und entwerfen deine Roadmap.</p><button class="button pricing-card__toggle pricing-card__toggle--s" type="button" data-pricing-toggle aria-expanded="false" aria-controls="startup-pricing-details-s">Mehr</button><div id="startup-pricing-details-s" class="pricing-card__details" hidden><p>Dieses Paket ist für Gründer gedacht, die vor dem Start einen klaren Überblick brauchen, bevor sie Formulare, Banken oder unnötige Software-Entscheidungen treffen.</p><div class="pricing-meta"><p><strong>Rechtsform &amp; Struktur:</strong> Welches Konstrukt passt zu dir?</p><p><strong>Business-Check:</strong> Prüfung deines Business Plans und deiner Zielgruppen-Kanäle.</p><p><strong>Tool- &amp; Bank-Setup:</strong> Was du wirklich brauchst und was du dir sparen kannst.</p><p><strong>Steuer-Strategie:</strong> Steuerberater sofort oder erst später mit Eigen-Buchhaltung?</p></div><button class="button pricing-card__cta pricing-card__cta--s" type="button" data-package-request="Paket S: Der Strategie-Kompass">Unverbindlich anfragen</button></div></article>
      <article class="surface-card pricing-card pricing-card--m"><p class="offer-card__index">Paket M</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--m" type="button" data-package-request="Paket M: Das Gründungs-Intensiv" aria-label="Paket M unverbindlich anfragen"><img class="offer-card__image pricing-card__image" src="Photos/m.JPG" alt="Paket M Gründungs-Intensiv"></button><h3>Das Gründungs-Intensiv</h3><p class="pricing-card__intro">Fünf Stunden, in denen wir nicht nur planen, sondern dein digitales Business-Setup direkt gemeinsam umsetzen.</p><button class="button pricing-card__toggle pricing-card__toggle--m" type="button" data-pricing-toggle aria-expanded="false" aria-controls="startup-pricing-details-m">Mehr</button><div id="startup-pricing-details-m" class="pricing-card__details" hidden><p>Hier reden wir nicht nur über Strategie, sondern gehen direkt in die Umsetzung, damit der Bürokratie-Teil sauber erledigt ist und dein Business wasserdicht startet.</p><div class="pricing-meta"><p><strong>Alles aus Paket S:</strong> Inklusive aller Grundlagen aus der Erstberatung.</p><p><strong>Live-Business Plan:</strong> Wir schreiben und prüfen Annahmen direkt im Termin.</p><p><strong>Behörden-Navigation:</strong> Gemeinsames Ausfüllen von Gewerbeanmeldung und steuerlicher Erfassung.</p><p><strong>Steuer-Basics &amp; Infrastruktur:</strong> Themen wie Kleinunternehmerregelung, Voranmeldung, Virtual Office, Impressum und essentielle Versicherungen.</p></div><button class="button pricing-card__cta pricing-card__cta--m" type="button" data-package-request="Paket M: Das Gründungs-Intensiv">Unverbindlich anfragen</button></div></article>
      <article class="surface-card pricing-card pricing-card--l"><p class="offer-card__index">Paket L</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--l" type="button" data-package-request="Paket L: Der Startup Companion" aria-label="Paket L unverbindlich anfragen"><img class="offer-card__image pricing-card__image" src="Photos/L.JPG" alt="Paket L Startup Companion"></button><h3>Der Startup Companion</h3><p class="pricing-card__intro">Für Gründer, die nach dem Start Sicherheit wollen und in der kritischen Anfangsphase einen Sparringspartner brauchen.</p><button class="button pricing-card__toggle pricing-card__toggle--l" type="button" data-pricing-toggle aria-expanded="false" aria-controls="startup-pricing-details-l">Mehr</button><div id="startup-pricing-details-l" class="pricing-card__details" hidden><p>Nach der Gründung geht es erst richtig los. Dieses Paket hält dir den Rücken frei, wenn Aufgaben, offene Fragen und unerwartete Probleme gleichzeitig auftauchen.</p><div class="pricing-meta"><p><strong>Fundament:</strong> Das komplette Paket M ist enthalten.</p><p><strong>Weekly Check-Ins:</strong> Vier Wochen lang jeweils 1 Stunde Mentoring für Fragen und Priorisierung.</p><p><strong>Priority Support:</strong> Sofort-Hilfe bei unerwarteten technischen oder geschäftlichen Notfällen.</p></div><button class="button pricing-card__cta pricing-card__cta--l" type="button" data-package-request="Paket L: Der Startup Companion">Unverbindlich anfragen</button></div></article>
    `,
    en: `
      <article class="surface-card pricing-card pricing-card--s"><p class="offer-card__index">Package S</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--s" type="button" data-package-request="Package S: The Strategy Compass" aria-label="Request Package S"><img class="offer-card__image pricing-card__image" src="Photos/s.JPG" alt="Package S Strategy Compass"></button><h3>The Strategy Compass</h3><p class="pricing-card__intro">Clarity for your start. In this first consultation, we sort the initial chaos and build your roadmap.</p><button class="button pricing-card__toggle pricing-card__toggle--s" type="button" data-pricing-toggle aria-expanded="false" aria-controls="startup-pricing-details-s">More</button><div id="startup-pricing-details-s" class="pricing-card__details" hidden><p>This package is for founders who want a clear overview before making decisions around forms, banks, and unnecessary software.</p><div class="pricing-meta"><p><strong>Legal structure:</strong> Which setup actually fits you?</p><p><strong>Business check:</strong> Review of your plan and channels.</p><p><strong>Tools &amp; banking:</strong> What you truly need and what you can skip.</p><p><strong>Tax strategy:</strong> Tax advisor now or later with self-bookkeeping?</p></div><button class="button pricing-card__cta pricing-card__cta--s" type="button" data-package-request="Package S: The Strategy Compass">Request without obligation</button></div></article>
      <article class="surface-card pricing-card pricing-card--m"><p class="offer-card__index">Package M</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--m" type="button" data-package-request="Package M: The Founder Intensive" aria-label="Request Package M"><img class="offer-card__image pricing-card__image" src="Photos/m.JPG" alt="Package M Founder Intensive"></button><h3>The Founder Intensive</h3><p class="pricing-card__intro">Five hours where we do not just plan, but implement your digital business setup together.</p><button class="button pricing-card__toggle pricing-card__toggle--m" type="button" data-pricing-toggle aria-expanded="false" aria-controls="startup-pricing-details-m">More</button><div id="startup-pricing-details-m" class="pricing-card__details" hidden><p>Here we move beyond strategy and into direct execution so the bureaucracy part is handled properly and your business starts on solid ground.</p><div class="pricing-meta"><p><strong>Everything from Package S:</strong> Including the full first-consultation foundation.</p><p><strong>Live business plan:</strong> We write and challenge assumptions together during the session.</p><p><strong>Authority navigation:</strong> We complete business registration and tax registration together.</p><p><strong>Tax basics &amp; infrastructure:</strong> Topics such as small-business rules, prepayments, virtual office, legal notice, and essential insurance.</p></div><button class="button pricing-card__cta pricing-card__cta--m" type="button" data-package-request="Package M: The Founder Intensive">Request without obligation</button></div></article>
      <article class="surface-card pricing-card pricing-card--l"><p class="offer-card__index">Package L</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--l" type="button" data-package-request="Package L: The Startup Companion" aria-label="Request Package L"><img class="offer-card__image pricing-card__image" src="Photos/L.JPG" alt="Package L Startup Companion"></button><h3>The Startup Companion</h3><p class="pricing-card__intro">For founders who want security after launch and need a sparring partner in the critical early phase.</p><button class="button pricing-card__toggle pricing-card__toggle--l" type="button" data-pricing-toggle aria-expanded="false" aria-controls="startup-pricing-details-l">More</button><div id="startup-pricing-details-l" class="pricing-card__details" hidden><p>After registration, the real journey begins. This package gives you backup when open questions, tasks, and unexpected problems all hit at once.</p><div class="pricing-meta"><p><strong>Foundation:</strong> The full Package M is included.</p><p><strong>Weekly check-ins:</strong> Four weeks of 1-hour mentoring for questions and prioritization.</p><p><strong>Priority support:</strong> Fast help with unexpected technical or business emergencies.</p></div><button class="button pricing-card__cta pricing-card__cta--l" type="button" data-package-request="Package L: The Startup Companion">Request without obligation</button></div></article>
    `,
    uk: `
      <article class="surface-card pricing-card pricing-card--s"><p class="offer-card__index">Пакет S</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--s" type="button" data-package-request="Пакет S: Стратегічний компас" aria-label="Запитати пакет S"><img class="offer-card__image pricing-card__image" src="Photos/s.JPG" alt="Пакет S Стратегічний компас"></button><h3>Стратегічний компас</h3><p class="pricing-card__intro">Ясність для вашого старту. На цій першій консультації ми розкладаємо початковий хаос і створюємо вашу roadmap.</p><button class="button pricing-card__toggle pricing-card__toggle--s" type="button" data-pricing-toggle aria-expanded="false" aria-controls="startup-pricing-details-s">Більше</button><div id="startup-pricing-details-s" class="pricing-card__details" hidden><p>Цей пакет для засновників, яким потрібен чіткий огляд ще до того, як вони почнуть ухвалювати рішення щодо форм, банків і зайвого софту.</p><div class="pricing-meta"><p><strong>Юридична форма:</strong> Яка конструкція справді вам підходить?</p><p><strong>Перевірка бізнесу:</strong> Огляд плану та каналів.</p><p><strong>Інструменти &amp; банки:</strong> Що вам реально потрібно, а що можна не брати.</p><p><strong>Податкова стратегія:</strong> Податковий консультант зараз чи пізніше з самостійним обліком?</p></div><button class="button pricing-card__cta pricing-card__cta--s" type="button" data-package-request="Пакет S: Стратегічний компас">Запитати без зобов’язань</button></div></article>
      <article class="surface-card pricing-card pricing-card--m"><p class="offer-card__index">Пакет M</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--m" type="button" data-package-request="Пакет M: Інтенсив запуску" aria-label="Запитати пакет M"><img class="offer-card__image pricing-card__image" src="Photos/m.JPG" alt="Пакет M Інтенсив запуску"></button><h3>Інтенсив запуску</h3><p class="pricing-card__intro">П’ять годин, у яких ми не лише плануємо, а й разом реалізуємо ваш цифровий бізнес-сетап.</p><button class="button pricing-card__toggle pricing-card__toggle--m" type="button" data-pricing-toggle aria-expanded="false" aria-controls="startup-pricing-details-m">Більше</button><div id="startup-pricing-details-m" class="pricing-card__details" hidden><p>Тут ми переходимо від стратегії до реального впровадження, щоб бюрократична частина була зроблена чисто, а бізнес стартував на міцній базі.</p><div class="pricing-meta"><p><strong>Усе з пакета S:</strong> Усі базові речі з першої консультації включено.</p><p><strong>Живий бізнес-план:</strong> Ми разом пишемо план і перевіряємо припущення.</p><p><strong>Навігація по органах:</strong> Разом заповнюємо реєстрацію бізнесу та податкову постановку.</p><p><strong>Податкові основи &amp; інфраструктура:</strong> Малі підприємства, авансові платежі, virtual office, imprint і базові страхування.</p></div><button class="button pricing-card__cta pricing-card__cta--m" type="button" data-package-request="Пакет M: Інтенсив запуску">Запитати без зобов’язань</button></div></article>
      <article class="surface-card pricing-card pricing-card--l"><p class="offer-card__index">Пакет L</p><button class="pricing-card__image-button pricing-card__jump pricing-card__jump--l" type="button" data-package-request="Пакет L: Startup Companion" aria-label="Запитати пакет L"><img class="offer-card__image pricing-card__image" src="Photos/L.JPG" alt="Пакет L Startup Companion"></button><h3>Startup Companion</h3><p class="pricing-card__intro">Для засновників, яким після старту потрібні безпека, ритм і sparring partner у критичній ранній фазі.</p><button class="button pricing-card__toggle pricing-card__toggle--l" type="button" data-pricing-toggle aria-expanded="false" aria-controls="startup-pricing-details-l">Більше</button><div id="startup-pricing-details-l" class="pricing-card__details" hidden><p>Після реєстрації все тільки починається. Цей пакет підтримує вас, коли одночасно приходять задачі, питання й несподівані проблеми.</p><div class="pricing-meta"><p><strong>Фундамент:</strong> Повний пакет M уже включено.</p><p><strong>Щотижневі check-ins:</strong> Чотири тижні по одній годині mentoring для питань і пріоритетів.</p><p><strong>Priority support:</strong> Швидка допомога в разі неочікуваних технічних або бізнес-проблем.</p></div><button class="button pricing-card__cta pricing-card__cta--l" type="button" data-package-request="Пакет L: Startup Companion">Запитати без зобов’язань</button></div></article>
    `,
  };
  return pricing[lang];
}
