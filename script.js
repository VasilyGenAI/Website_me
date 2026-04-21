const uiLang = getUiLang();
const LEGAL_UI = {
  de: {
    loadError: "Der Rechtstext konnte nicht geladen werden. Bitte prüfe, ob die zugehörige TXT-Datei vorhanden ist.",
    cookieSettings: "Cookie-Einstellungen öffnen",
  },
  en: {
    loadError: "The legal text could not be loaded. Please check whether the corresponding TXT file is available.",
    cookieSettings: "Open cookie settings",
  },
  uk: {
    loadError: "Не вдалося завантажити юридичний текст. Будь ласка, перевірте, чи доступний відповідний TXT-файл.",
    cookieSettings: "Відкрити налаштування cookie",
  },
};

loadLegalText();
document.addEventListener("schob:content-updated", loadLegalText);

function loadLegalText() {
  const legalContainer = document.querySelector("[data-legal-source]");

  if (!legalContainer) {
    return;
  }

  const source = legalContainer.getAttribute("data-legal-source");

  if (!source || legalContainer.dataset.loadedSource === source) {
    return;
  }

  legalContainer.setAttribute("aria-busy", "true");

  fetch(new URL(source, window.location.href))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Datei konnte nicht geladen werden: ${source}`);
      }

      return response.text();
    })
    .then((text) => {
      legalContainer.dataset.loadedSource = source;
      legalContainer.removeAttribute("aria-busy");
      legalContainer.replaceChildren(formatLegalText(text, source));
    })
    .catch(() => {
      legalContainer.removeAttribute("aria-busy");
      legalContainer.innerHTML = `<p class="legal-error">${LEGAL_UI[uiLang].loadError}</p>`;
    });
}

const IMPRESSUM_HEADINGS = new Set([
  "Angaben gemäß § 5 DDG",
  "Anbieter dieser Website",
  "Kontakt",
  "Angaben zur Berufshaftpflichtversicherung",
  "Name und Anschrift des Versicherers",
  "EU-Streitbeilegung",
  "Verbraucherstreitbeilegung / Universalschlichtungsstelle",
  "Haftung für Inhalte",
  "Haftung für Links",
  "Legal notice pursuant to Section 5 DDG",
  "Provider of this website",
  "Professional indemnity insurance",
  "Name and address of the insurer",
  "EU dispute resolution",
  "Consumer dispute resolution / universal arbitration board",
  "Liability for content",
  "Liability for links",
  "Відомості відповідно до § 5 DDG",
  "Постачальник цього вебсайту",
  "Контакт",
  "Відомості про страхування професійної відповідальності",
  "Назва та адреса страховика",
  "Врегулювання спорів у ЄС",
  "Врегулювання споживчих спорів / універсальна арбітражна установа",
  "Відповідальність за вміст",
  "Відповідальність за посилання",
]);

const META_PATTERNS = [
  /^Vasily Schob$/,
  /^Straße der Jugend 18$/,
  /^14974 Ludwigsfelde$/,
  /^Deutschland$/,
  /^E-Mail:/,
  /^Telefon:/,
  /^Email:/,
  /^Phone:/,
  /^Німеччина$/,
  /^Електронна пошта:/,
  /^Телефон:/,
  /^Hiscox SA, Niederlassung für Deutschland$/,
  /^Bernhard-Wicki-Str\. 3$/,
  /^80636 München$/,
  /^Geltungsraum der Versicherung:/,
  /^Scope of insurance:/,
  /^Територія дії страхування:/,
];

function formatLegalText(text, source) {
  const wrapper = document.createElement("div");
  const isImpressum = /impressum/i.test(source);
  let list = null;
  let listMode = null;

  wrapper.className = "legal-text";

  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      list = null;
      listMode = null;
      continue;
    }

    if (line === "[[COOKIE_SETTINGS_BUTTON]]") {
      wrapper.appendChild(createCookieSettingsButton());
      list = null;
      listMode = null;
      continue;
    }

    const headingNode = isImpressum ? createImpressumNode(line) : createStructuredNode(line);

    if (headingNode) {
      wrapper.appendChild(headingNode);
      list = null;
      listMode = null;
      continue;
    }

    if (/^- /.test(line) || (listMode && looksLikeListItem(line))) {
      if (!list) {
        list = document.createElement("ul");
        wrapper.appendChild(list);
      }

      const item = document.createElement("li");
      appendRichText(item, line.replace(/^- /, "").replace(/[;,]$/, ""));
      list.appendChild(item);
      continue;
    }

    list = null;
    listMode = shouldStartList(line);

    const paragraph = document.createElement("p");
    if (isImpressum && META_PATTERNS.some((pattern) => pattern.test(line))) {
      paragraph.className = "legal-meta";
    }
    appendRichText(paragraph, line);
    wrapper.appendChild(paragraph);
  }

  return wrapper;
}

function createStructuredNode(line) {
  const sectionId = extractSectionId(line);

  if (isObjectionHeading(line)) {
    return buildHeading("h4", line);
  }

  if (/^Teil\s+\d+:/i.test(line)) {
    return buildHeading("h2", line);
  }

  if (/^\d+\.\d+\.\d+\.\s+/.test(line)) {
    return buildHeading("h4", line, sectionId);
  }

  if (/^\d+\.\d+\.\s+/.test(line)) {
    return buildHeading("h3", line, sectionId);
  }

  if (/^\d+\.\s+/.test(line)) {
    return buildHeading("h2", line, sectionId);
  }

  return null;
}

function isObjectionHeading(line) {
  return [
    "EINZELFALLBEZOGENES WIDERSPRUCHSRECHT",
    "WIDERSPRUCH GEGEN DATENVERARBEITUNG ZU ZWECKEN DER DIREKTWERBUNG",
    "RIGHT TO OBJECT ON GROUNDS RELATING TO YOUR PARTICULAR SITUATION",
    "OBJECTION TO PROCESSING FOR DIRECT MARKETING PURPOSES",
    "ПРАВО НА ЗАПЕРЕЧЕННЯ З ОГЛЯДУ НА ВАШУ ОСОБЛИВУ СИТУАЦІЮ",
    "ЗАПЕРЕЧЕННЯ ПРОТИ ОБРОБКИ ДЛЯ ЦІЛЕЙ ПРЯМОГО МАРКЕТИНГУ",
  ].includes(line);
}

function createImpressumNode(line) {
  if (!IMPRESSUM_HEADINGS.has(line)) {
    return null;
  }

  if (line === "Anbieter dieser Website" || line === "Name und Anschrift des Versicherers") {
    return buildHeading("h3", line);
  }

  return buildHeading("h2", line);
}

function buildHeading(tagName, text, forcedId) {
  const heading = document.createElement(tagName);
  heading.textContent = text;
  heading.id = forcedId || createHeadingId(text);
  return heading;
}

function shouldStartList(line) {
  return /(Diese Daten sind:|Sie haben folgende Rechte:|Folgende Rechte:)/i.test(line);
}

function looksLikeListItem(line) {
  if (/^https?:\/\//.test(line)) {
    return false;
  }

  if (/^\d+(\.\d+)*\.\s+/.test(line)) {
    return false;
  }

  if (/:\s/.test(line)) {
    return false;
  }

  return line.length <= 90;
}

function appendRichText(element, text) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const boldPattern = /(\*\*[^*]+\*\*)/g;

  for (const part of text.split(urlPattern)) {
    if (!part) {
      continue;
    }

    if (/^https?:\/\/[^\s]+$/.test(part)) {
      const link = document.createElement("a");
      link.href = part;
      link.textContent = part;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      element.appendChild(link);
      continue;
    }

    for (const inlinePart of part.split(boldPattern)) {
      if (!inlinePart) {
        continue;
      }

      if (/^\*\*[^*]+\*\*$/.test(inlinePart)) {
        const strong = document.createElement("strong");
        strong.textContent = inlinePart.slice(2, -2);
        element.appendChild(strong);
        continue;
      }

      element.appendChild(document.createTextNode(inlinePart));
    }
  }
}

function createCookieSettingsButton() {
  const wrapper = document.createElement("div");
  const button = document.createElement("button");

  wrapper.className = "legal-action";
  button.className = "button button--ghost legal-action__button";
  button.type = "button";
  button.textContent = LEGAL_UI[uiLang].cookieSettings;
  button.setAttribute("data-open-cookie-settings", "");
  wrapper.appendChild(button);

  return wrapper;
}

function extractSectionId(text) {
  const match = text.match(/^(\d+(?:\.\d+){0,2})\.\s+/);

  if (!match) {
    return "";
  }

  return `section-${match[1].replace(/\./g, "-")}`;
}

function getUiLang() {
  const lang = document.documentElement.lang.toLowerCase();

  if (lang.startsWith("en")) {
    return "en";
  }

  if (lang.startsWith("uk")) {
    return "uk";
  }

  return "de";
}

function createHeadingId(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
