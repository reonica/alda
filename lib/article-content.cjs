const MarkdownIt = require('markdown-it');
const sanitizeHtml = require('sanitize-html');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

// This module is also bundled for the CMS. The editor, preview and static build
// therefore accept the same formatting, rather than trusting editor-only HTML.
const color = [
  /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i,
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+))?\s*\)$/i,
  /^(?:transparent|black|white|red|green|blue|yellow|gray|grey|orange|purple|navy|teal|maroon|lime|olive|silver)$/i,
];
const size = [/^(?:[89]|[1-6]\d|7[0-2])px$/, /^(?:0\.(?:[5-9]\d?)|[1-3](?:\.\d{1,2})?|4(?:\.[0-5])?)(?:em|rem)$/];
const indent = [/^(?:0|[1-9]\d?|1\d{2}|200)px$/];
const dimension = [/^(?:auto|100%|[1-9]\d{0,2}px|1[0-9]{3}px|2000px)$/];
const tableBorders = {
  'border-width': [/^(?:[0-5](?:\.\d)?)px$/],
  'border-style': [/^(?:none|solid|double|dashed|dotted)$/],
  'border-color': color,
  border: color.map(pattern => new RegExp(`^[0-5](?:\\.\\d)?px\\s+(?:solid|double|dashed|dotted)\\s+(?:${pattern.source.slice(1, -1)})$`, 'i')),
};
const blockTags = new Set(['P', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'PRE', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'TABLE', 'FIGURE', 'FIGCAPTION']);
const imageClasses = ['se-component', 'se-image-container', '__se__float-left', '__se__float-right', '__se__float-center'];
const languageToken = /^[a-z0-9_+-]{1,40}$/i;
const languageClass = /^language-[a-z0-9_+-]{1,40}$/i;

const policy = {
  allowedTags: [
    'p', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'br', 'hr', 'strong', 'b',
    'em', 'i', 'u', 's', 'del', 'span', 'sub', 'sup', 'mark', 'small', 'abbr',
    'blockquote', 'ul', 'ol', 'li', 'pre', 'code', 'kbd', 'a', 'img', 'figure',
    'figcaption', 'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    '*': ['style'],
    a: ['href', 'title', 'target', 'rel'],
    abbr: ['title'],
    pre: ['data-se-lang'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    ol: ['start'],
    li: ['value'],
    col: ['span', 'width'],
    th: ['colspan', 'rowspan', 'scope', 'width', 'height'],
    td: ['colspan', 'rowspan', 'width', 'height'],
  },
  allowedClasses: {
    pre: [languageClass], code: [languageClass],
    div: imageClasses, figure: imageClasses,
  },
  allowedStyles: {
    '*': {
      'text-align': [/^(?:left|center|right|justify)$/],
      color,
      'background-color': color,
      'font-size': size,
      'font-family': [/^(?:"|')?(?:Arial|Verdana|Tahoma|Georgia|Impact|Times New Roman|Courier New|Trebuchet MS|Comic Sans MS|Palatino|Helvetica)(?:"|')?(?:,\s*(?:sans-serif|serif|monospace))?$/i, /^(?:sans-serif|serif|monospace)$/i],
      'font-weight': [/^(?:normal|bold|[1-9]00)$/],
      'font-style': [/^(?:normal|italic)$/],
      'text-decoration': [/^(?:none|underline|line-through|underline line-through)$/],
      'line-height': [/^(?:1(?:\.\d{1,2})?|2(?:\.\d{1,2})?|3(?:\.0{1,2})?)$/],
      'margin-left': indent,
      'list-style-type': [/^(?:decimal|lower-alpha|upper-alpha|lower-roman|upper-roman|disc|circle|square)$/],
    },
    img: { width: dimension, height: dimension },
    table: { ...tableBorders, width: dimension, 'border-collapse': [/^(?:collapse|separate)$/] },
    col: { width: dimension },
    th: { ...tableBorders, width: dimension, height: dimension, 'vertical-align': [/^(?:top|middle|bottom)$/] },
    td: { ...tableBorders, width: dimension, height: dimension, 'vertical-align': [/^(?:top|middle|bottom)$/] },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    h1: 'h2',
    a: (tagName, attributes) => {
      const next = { ...attributes };
      if (!['_blank', '_self'].includes(next.target)) delete next.target;
      const rel = new Set(String(next.rel || '').split(/\s+/).filter(value => ['noopener', 'noreferrer', 'nofollow', 'sponsored', 'ugc'].includes(value)));
      if (next.target === '_blank') { rel.add('noopener'); rel.add('noreferrer'); }
      if (rel.size) next.rel = [...rel].join(' ');
      else delete next.rel;
      return { tagName, attribs: next };
    },
    '*': (tagName, attributes) => {
      const next = { ...attributes };
      for (const name of ['width', 'height', 'colspan', 'rowspan', 'span', 'start', 'value']) {
        if (next[name] !== undefined && !/^[1-9]\d{0,3}$/.test(next[name])) delete next[name];
      }
      if (next.scope && !['row', 'col', 'rowgroup', 'colgroup'].includes(next.scope)) delete next.scope;
      if (next['data-se-lang'] && !languageToken.test(next['data-se-lang'])) delete next['data-se-lang'];
      return { tagName, attribs: next };
    },
  },
};

function sanitizeRichHtml(html) {
  return sanitizeHtml(String(html ?? ''), policy);
}

function createMarkdownLibrary() {
  // Eleventy disables four-space indented code by default; preserve that choice.
  const markdown = new MarkdownIt({ html: true }).disable('code');
  const render = markdown.render.bind(markdown);
  markdown.render = (source, environment) => sanitizeRichHtml(render(String(source ?? ''), environment));
  const renderInline = markdown.renderInline.bind(markdown);
  markdown.renderInline = (source, environment) => sanitizeRichHtml(renderInline(String(source ?? ''), environment));
  return markdown;
}

const markdown = createMarkdownLibrary();
function renderMarkdown(source) {
  return markdown.render(source);
}

function keepHtml(node) {
  const tag = node.nodeName;
  if (tag === 'PRE') return false; // Code always returns to readable fenced Markdown.
  if (node.getAttribute('style')) return true;
  if (['U', 'SUB', 'SUP', 'MARK', 'SMALL', 'ABBR', 'KBD', 'FIGURE', 'FIGCAPTION'].includes(tag)) return true;
  if (tag === 'DIV' && node.getAttribute('class')) return true;
  if (tag === 'A' && (node.getAttribute('target') || node.getAttribute('rel'))) return true;
  if (tag === 'IMG' && (node.getAttribute('width') || node.getAttribute('height'))) return true;
  if (tag !== 'TABLE') return false;
  // Pipe tables cannot express merged cells, widths, captions or arbitrary
  // headerless layouts. Keep those tables as safe HTML rather than losing data.
  return Boolean(
    node.querySelector('[style], [colspan], [rowspan], [width], [height], caption, colgroup, tfoot') ||
    !node.querySelector('tr')?.querySelector('th')
  );
}

function toMarkdown(html) {
  const turndown = new TurndownService({
    headingStyle: 'atx', codeBlockStyle: 'fenced', fence: '```',
    bulletListMarker: '-', emDelimiter: '*', strongDelimiter: '**',
  });
  turndown.use(gfm);
  turndown.addRule('aldahub-rich-formatting', {
    filter: keepHtml,
    replacement: (content, node) => blockTags.has(node.nodeName) ? `\n\n${node.outerHTML}\n\n` : node.outerHTML,
  });
  turndown.addRule('aldahub-code-fences', {
    filter: 'pre',
    replacement: (content, node) => {
      // SunEditor keeps editable code lines as <br>, while Markdown uses \n.
      // Read a detached copy so serializing never changes the live editor DOM.
      const copy = node.cloneNode(true);
      for (const lineBreak of Array.from(copy.querySelectorAll('br'))) {
        lineBreak.parentNode.replaceChild(lineBreak.ownerDocument.createTextNode('\n'), lineBreak);
      }
      const code = copy.textContent;
      // SunEditor's language picker persists its current choice in this
      // metadata; an imported language class is only a fallback.
      const language = node.getAttribute('data-se-lang') || `${node.getAttribute('class') || ''} ${node.querySelector('code')?.getAttribute('class') || ''}`.match(/(?:^|\s)language-([a-z0-9_+-]{1,40})(?:\s|$)/i)?.[1] || '';
      const longestRun = Math.max(0, ...Array.from(code.matchAll(/`+/g), match => match[0].length));
      const fence = '`'.repeat(Math.max(3, longestRun + 1));
      return `\n\n${fence}${language}\n${code}${code.endsWith('\n') ? '' : '\n'}${fence}\n\n`;
    },
  });
  return turndown.turndown(sanitizeRichHtml(html)).trim();
}

module.exports = { createMarkdownLibrary, renderMarkdown, sanitizeRichHtml, toMarkdown };
