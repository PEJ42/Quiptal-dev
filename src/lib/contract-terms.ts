const allowedTags = new Set(["p", "div", "br", "strong", "b", "ul", "ol", "li"]);

const decodeHtml = (value: string) =>
  value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function paragraphAndBullets(value: string) {
  const parts = value
    .split("•")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  const [paragraph, ...bullets] = parts;
  return [
    paragraph ? "<p>" + escapeHtml(paragraph) + "</p>" : "",
    bullets.length
      ? "<ul>" + bullets.map((bullet) => "<li>" + escapeHtml(bullet) + "</li>").join("") + "</ul>"
      : "",
  ].join("");
}

function formatPlainContractTerms(value: string) {
  const text = decodeHtml(value).replace(/\r\n?/g, "\n").trim();
  if (!text) return "";

  // Legacy templates were often entered as one long paragraph. A numbered,
  // all-caps title marks each agreement section and can be safely made into
  // a readable bold heading without changing the wording.
  const headingPattern = /(\d+\.\s+[A-Z][A-Z ,&/-]{2,})(?=\s)/g;
  const sections: { heading?: string; body: string }[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(text))) {
    const before = text.slice(cursor, match.index).trim();
    if (before) sections.push({ body: before });
    cursor = match.index + match[0].length;

    const next = headingPattern.exec(text);
    const body = text.slice(cursor, next?.index).trim();
    sections.push({ heading: match[1], body });
    if (!next) {
      cursor = text.length;
      break;
    }
    cursor = next.index;
    headingPattern.lastIndex = next.index;
  }

  if (sections.length === 0) {
    return text
      .split(/\n\s*\n/)
      .map(paragraphAndBullets)
      .join("");
  }

  const trailing = text.slice(cursor).trim();
  if (trailing) sections.push({ body: trailing });
  return sections
    .map(({ heading, body }) =>
      [
        heading ? "<p><strong>" + escapeHtml(heading) + "</strong></p>" : "",
        paragraphAndBullets(body),
      ].join(""),
    )
    .join("");
}

export function sanitizeContractTerms(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/<[^>]*>/g, (tag) => {
      const match = tag.match(/^<\s*(\/)?\s*([a-z0-9]+)\b[^>]*>$/i);
      if (!match || !allowedTags.has(match[2].toLowerCase())) return "";
      const name = match[2].toLowerCase() === "b" ? "strong" : match[2].toLowerCase();
      return match[1] ? `</${name}>` : name === "br" ? "<br>" : `<${name}>`;
    })
    .trim();
}

export function contractTermsPlainText(value: string) {
  return decodeHtml(
    sanitizeContractTerms(value)
      .replace(/<\/?(?:p|div|ul|ol)>/gi, "\n")
      .replace(/<li>/gi, "\n")
      .replace(/<br>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function contractTermsToEditorHtml(value: string) {
  const sanitized = sanitizeContractTerms(value);
  if (/<\/?(?:p|div|ul|ol|li|strong|br)\b/i.test(sanitized)) return sanitized;

  return formatPlainContractTerms(sanitized);
}

export type ContractTermsBlock = { kind: "paragraph" | "bullet"; html: string };

export function contractTermsToBlocks(value: string): ContractTermsBlock[] {
  const sanitized = contractTermsToEditorHtml(value);
  const blocks: ContractTermsBlock[] = [];
  const tokenPattern = /<(\/)?(p|div|ul|ol|li|br)\b[^>]*>/gi;
  let activeParagraph = "";
  let activeListItem = "";
  let inList = false;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const addParagraph = () => {
    if (contractTermsPlainText(activeParagraph)) {
      blocks.push({ kind: "paragraph", html: activeParagraph });
    }
    activeParagraph = "";
  };
  const addListItem = () => {
    if (contractTermsPlainText(activeListItem)) {
      blocks.push({ kind: "bullet", html: activeListItem });
    }
    activeListItem = "";
  };

  while ((match = tokenPattern.exec(sanitized))) {
    const text = sanitized.slice(cursor, match.index);
    if (inList) activeListItem += text;
    else activeParagraph += text;
    cursor = tokenPattern.lastIndex;

    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    if (tag === "ul" || tag === "ol") {
      if (closing) {
        addListItem();
        inList = false;
      } else {
        addParagraph();
        inList = true;
      }
    } else if (tag === "li") {
      if (closing) addListItem();
      else {
        addListItem();
        inList = true;
      }
    } else if (tag === "br") {
      if (inList) activeListItem += "<br>";
      else activeParagraph += "<br>";
    } else if (tag === "p" || tag === "div") {
      if (inList) activeListItem += "<br>";
      else if (closing) addParagraph();
      else addParagraph();
    }
  }

  const trailing = sanitized.slice(cursor);
  if (inList) activeListItem += trailing;
  else activeParagraph += trailing;
  addListItem();
  addParagraph();

  return blocks.length > 0 ? blocks : [{ kind: "paragraph", html: sanitized }];
}

export type ContractTermsRun = { text: string; bold: boolean };

export function contractTermsToRuns(value: string): ContractTermsRun[] {
  const safe = sanitizeContractTerms(value);
  const runs: ContractTermsRun[] = [];
  const tagPattern = /<(\/)?(?:strong|b)\b[^>]*>/gi;
  let bold = false;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(safe))) {
    const text = decodeHtml(safe.slice(cursor, match.index).replace(/<br>/gi, " "));
    if (text) runs.push({ text, bold });
    bold = !match[1];
    cursor = tagPattern.lastIndex;
  }
  const trailing = decodeHtml(safe.slice(cursor).replace(/<br>/gi, " "));
  if (trailing) runs.push({ text: trailing, bold });
  return runs;
}
