const legalContainer = document.querySelector("[data-legal-source]");

if (legalContainer) {
  const source = legalContainer.getAttribute("data-legal-source");

  if (source) {
    fetch(source)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Datei konnte nicht geladen werden: ${source}`);
        }

        return response.text();
      })
      .then((text) => {
        legalContainer.appendChild(formatLegalText(text, source));
      })
      .catch(() => {
        legalContainer.innerHTML =
          '<p class="legal-error">Der Rechtstext konnte nicht geladen werden. Bitte pruefe, ob die zugehoerige TXT-Datei vorhanden ist.</p>';
      });
  }
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
]);

const META_PATTERNS = [
  /^Vasily Schob$/,
  /^Straße der Jugend 18$/,
  /^14974 Ludwigsfelde$/,
  /^Deutschland$/,
  /^E-Mail:/,
  /^Telefon:/,
  /^Hiscox SA, Niederlassung für Deutschland$/,
  /^Bernhard-Wicki-Str\. 3$/,
  /^80636 München$/,
  /^Geltungsraum der Versicherung:/,
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
  if (/^Teil\s+\d+:/i.test(line)) {
    return buildHeading("h2", line);
  }

  if (/^\d+\.\d+\.\d+\.\s+/.test(line)) {
    return buildHeading("h4", line);
  }

  if (/^\d+\.\d+\.\s+/.test(line)) {
    return buildHeading("h3", line);
  }

  if (/^\d+\.\s+/.test(line)) {
    return buildHeading("h2", line);
  }

  return null;
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

function buildHeading(tagName, text) {
  const heading = document.createElement(tagName);
  heading.textContent = text;
  heading.id = createHeadingId(text);
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

    element.appendChild(document.createTextNode(part));
  }
}

function createCookieSettingsButton() {
  const wrapper = document.createElement("div");
  const button = document.createElement("button");

  wrapper.className = "legal-action";
  button.className = "button button--ghost legal-action__button";
  button.type = "button";
  button.textContent = "Cookie-Einstellungen öffnen";
  button.setAttribute("data-open-cookie-settings", "");
  wrapper.appendChild(button);

  return wrapper;
}

function createHeadingId(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
