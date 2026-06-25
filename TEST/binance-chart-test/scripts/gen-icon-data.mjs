// Generates app/icon-data.ts from @phosphor-icons/core regular SVG assets.
// The app stores static SVG strings so the same icon can render in picker
// previews and be baked into canvas image data URLs.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = join(__dirname, '..');
const phosphorRegularDir = join(appDir, 'node_modules', '@phosphor-icons', 'core', 'assets', 'regular');
const outputPath = join(appDir, 'app', 'icon-data.ts');

const CATEGORY_ORDER = [
  {
    id: 'gestures',
    label: 'Gestures & smileys',
    icon: 'smile',
    glyphs: [
      { id: 'smile', name: 'Smiling face', source: 'smiley' },
      { id: 'frown', name: 'Frowning face', source: 'smiley-sad' },
      { id: 'thumbs-up', name: 'Thumbs up', source: 'thumbs-up' },
      { id: 'thumbs-down', name: 'Thumbs down', source: 'thumbs-down' },
      { id: 'heart', name: 'Heart', source: 'heart' },
      { id: 'flame', name: 'Flame', source: 'fire' },
      { id: 'neutral', name: 'Neutral face', source: 'smiley-meh' },
      { id: 'laugh', name: 'Laughing face', source: 'smiley-sticker' },
      { id: 'wink', name: 'Winking face', source: 'smiley-wink' },
      { id: 'surprised', name: 'Surprised face', source: 'smiley-nervous' },
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols & flags',
    icon: 'check',
    glyphs: [
      { id: 'check', name: 'Check mark', source: 'check' },
      { id: 'cross', name: 'Cross mark', source: 'x' },
      { id: 'warning', name: 'Warning', source: 'warning' },
      { id: 'info', name: 'Information', source: 'info' },
      { id: 'question', name: 'Question', source: 'question' },
      { id: 'flag', name: 'Flag', source: 'flag' },
      { id: 'plus', name: 'Plus', source: 'plus' },
      { id: 'minus', name: 'Minus', source: 'minus' },
      { id: 'star', name: 'Star', source: 'star' },
      { id: 'circle-check', name: 'Check circle', source: 'check-circle' },
      { id: 'circle-cross', name: 'Cross circle', source: 'x-circle' },
      { id: 'power', name: 'Power', source: 'power' },
      { id: 'refresh', name: 'Refresh', source: 'arrows-clockwise' },
      { id: 'eye', name: 'Eye', source: 'eye' },
      { id: 'ban', name: 'Prohibited', source: 'prohibit' },
      { id: 'asterisk', name: 'Asterisk', source: 'asterisk' },
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    icon: 'sun',
    glyphs: [
      { id: 'sun', name: 'Sun', source: 'sun' },
      { id: 'moon', name: 'Moon', source: 'moon' },
      { id: 'cloud', name: 'Cloud', source: 'cloud' },
      { id: 'droplet', name: 'Droplet', source: 'drop' },
      { id: 'leaf', name: 'Leaf', source: 'leaf' },
      { id: 'bolt', name: 'Lightning bolt', source: 'lightning' },
      { id: 'snowflake', name: 'Snowflake', source: 'snowflake' },
      { id: 'tree', name: 'Tree', source: 'tree' },
      { id: 'mountain', name: 'Mountain', source: 'mountains' },
      { id: 'wind', name: 'Wind', source: 'wind' },
      { id: 'rain', name: 'Rain', source: 'cloud-rain' },
    ],
  },
  {
    id: 'currency',
    label: 'Currency',
    icon: 'usd',
    glyphs: [
      { id: 'usd', name: 'US dollar', source: 'currency-dollar' },
      { id: 'eur', name: 'Euro', source: 'currency-eur' },
      { id: 'gbp', name: 'British pound', source: 'currency-gbp' },
      { id: 'jpy', name: 'Japanese yen', source: 'currency-jpy' },
      { id: 'btc', name: 'Bitcoin', source: 'currency-btc' },
      { id: 'inr', name: 'Indian rupee', source: 'currency-inr' },
      { id: 'cent', name: 'Cent', symbol: '¢' },
      { id: 'percent', name: 'Percent', source: 'percent' },
      { id: 'krw', name: 'Korean won', source: 'currency-krw' },
      { id: 'rub', name: 'Russian ruble', source: 'currency-rub' },
      { id: 'try', name: 'Turkish lira', symbol: '₺' },
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: 'bulb',
    glyphs: [
      { id: 'bulb', name: 'Light bulb', source: 'lightbulb' },
      { id: 'bell', name: 'Bell', source: 'bell' },
      { id: 'lock', name: 'Lock', source: 'lock' },
      { id: 'clock', name: 'Clock', source: 'clock' },
      { id: 'pin', name: 'Map pin', source: 'map-pin' },
      { id: 'target', name: 'Target', source: 'target' },
      { id: 'briefcase', name: 'Briefcase', source: 'briefcase' },
      { id: 'trophy', name: 'Trophy', source: 'trophy' },
      { id: 'search', name: 'Search', source: 'magnifying-glass' },
      { id: 'sliders', name: 'Settings', source: 'sliders-horizontal' },
      { id: 'home', name: 'Home', source: 'house' },
      { id: 'camera', name: 'Camera', source: 'camera' },
      { id: 'gift', name: 'Gift', source: 'gift' },
      { id: 'key', name: 'Key', source: 'key' },
      { id: 'calendar', name: 'Calendar', source: 'calendar' },
      { id: 'mail', name: 'Mail', source: 'envelope' },
    ],
  },
  {
    id: 'arrows',
    label: 'Arrows',
    icon: 'arrow-up',
    glyphs: [
      { id: 'arrow-up', name: 'Arrow up', source: 'arrow-up' },
      { id: 'arrow-down', name: 'Arrow down', source: 'arrow-down' },
      { id: 'arrow-left', name: 'Arrow left', source: 'arrow-left' },
      { id: 'arrow-right', name: 'Arrow right', source: 'arrow-right' },
      { id: 'arrow-up-right', name: 'Arrow up-right', source: 'arrow-up-right' },
      { id: 'arrow-down-right', name: 'Arrow down-right', source: 'arrow-down-right' },
      { id: 'trending-up', name: 'Trending up', source: 'trend-up' },
      { id: 'trending-down', name: 'Trending down', source: 'trend-down' },
      { id: 'arrow-up-left', name: 'Arrow up-left', source: 'arrow-up-left' },
      { id: 'arrow-down-left', name: 'Arrow down-left', source: 'arrow-down-left' },
      { id: 'chevrons-up', name: 'Chevrons up', source: 'caret-double-up' },
      { id: 'chevrons-down', name: 'Chevrons down', source: 'caret-double-down' },
    ],
  },
];

const STICKER_EMOJIS = [
  { c: '🐂', n: 'Bull' },
  { c: '🐻', n: 'Bear' },
  { c: '🚀', n: 'Rocket' },
  { c: '🌙', n: 'Moon' },
  { c: '💰', n: 'Money bag' },
  { c: '💵', n: 'Dollar banknote' },
  { c: '💎', n: 'Gem' },
  { c: '📈', n: 'Chart up' },
  { c: '📉', n: 'Chart down' },
  { c: '💹', n: 'Chart increasing yen' },
  { c: '🏆', n: 'Trophy' },
  { c: '🎯', n: 'Target' },
  { c: '🔥', n: 'Fire' },
  { c: '⚡', n: 'Lightning' },
  { c: '✅', n: 'Check' },
  { c: '❌', n: 'Cross' },
  { c: '⚠️', n: 'Warning' },
  { c: '🎉', n: 'Party popper' },
  { c: '🥳', n: 'Partying face' },
  { c: '👍', n: 'Thumbs up' },
  { c: '👎', n: 'Thumbs down' },
  { c: '🤝', n: 'Handshake' },
  { c: '🧠', n: 'Brain' },
  { c: '💡', n: 'Idea' },
  { c: '🔔', n: 'Bell' },
  { c: '🚩', n: 'Flag' },
  { c: '🏁', n: 'Chequered flag' },
  { c: '⏰', n: 'Alarm clock' },
  { c: '📊', n: 'Bar chart' },
  { c: '🛡️', n: 'Shield' },
];

function readPhosphorSvgInner(source) {
  const svgPath = join(phosphorRegularDir, `${source}.svg`);
  if (!existsSync(svgPath)) {
    throw new Error(`Missing Phosphor icon asset: ${source}`);
  }

  const svg = readFileSync(svgPath, 'utf8').trim();
  const inner = svg.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '').trim().replace(/\s+/g, ' ');
  return `<g fill="currentColor" transform="scale(0.09375)">${inner}</g>`;
}

function escapeTemplateLiteral(value) {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function escapeHtmlText(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderGlyph(glyph) {
  const svg = glyph.source ? readPhosphorSvgInner(glyph.source) : `currencyGlyph('${escapeHtmlText(glyph.symbol)}')`;
  const svgValue = glyph.source ? `\`${escapeTemplateLiteral(svg)}\`` : svg;
  return `      { id: '${glyph.id}', name: '${glyph.name}', svg: ${svgValue} }`;
}

function renderCategory(category) {
  const glyphs = category.glyphs.map(renderGlyph).join(',\n');
  return `  {\n    id: '${category.id}',\n    label: '${category.label}',\n    icon: '${category.icon}',\n    glyphs: [\n${glyphs},\n    ],\n  }`;
}

const totalGlyphs = CATEGORY_ORDER.reduce((sum, category) => sum + category.glyphs.length, 0);

const body = `// AUTO-GENERATED by scripts/gen-icon-data.mjs from @phosphor-icons/core regular SVG assets.
// ${totalGlyphs} monochrome vector icons across ${CATEGORY_ORDER.length} categories. Do not edit by hand.
// Each icon is scaled into the chart app's 0 0 24 24 viewBox contract so the
// picker and canvas renderer can share one SVG data path.

export interface IconGlyph {
  id: string;
  name: string;
  /** Inner SVG markup on a 0 0 24 24 viewBox, using \`currentColor\`. */
  svg: string;
}

export interface IconCategory {
  id: string;
  label: string;
  /** Glyph id shown in the category navigation bar. */
  icon: string;
  glyphs: IconGlyph[];
}

export const ICON_CATEGORIES: IconCategory[] = [
${CATEGORY_ORDER.map(renderCategory).join(',\n')}
];

function currencyGlyph(symbol: string): string {
  return \`<text x="12" y="18.5" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="currentColor">\${symbol}</text>\`;
}

// Larger decorative emoji shown on the Stickers tab.
export const STICKER_EMOJIS: Array<{ c: string; n: string }> = ${JSON.stringify(STICKER_EMOJIS, null, 2)};

const ICON_GLYPH_BY_ID = new Map<string, IconGlyph>();
for (const category of ICON_CATEGORIES) {
  for (const glyph of category.glyphs) ICON_GLYPH_BY_ID.set(glyph.id, glyph);
}

export const ICON_TOKEN_PREFIX = 'icon:';

export const getIconGlyphById = (id: string): IconGlyph | undefined => ICON_GLYPH_BY_ID.get(id);

export const buildIconSvgMarkup = (inner: string, color: string): string =>
  \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\${inner.split('currentColor').join(color)}</svg>\`;

export const iconSvgDataUrl = (inner: string, color: string): string =>
  \`data:image/svg+xml,\${encodeURIComponent(buildIconSvgMarkup(inner, color))}\`;
`;

writeFileSync(outputPath, body, 'utf8');
console.log(`Wrote ${outputPath}`);
for (const category of CATEGORY_ORDER) {
  console.log(`  ${category.id.padEnd(10)} ${category.glyphs.length}`);
}
console.log(`  total      ${totalGlyphs}`);
