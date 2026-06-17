// Monochrome, recolorable vector icons for the Icons tab of the chart "Icons"
// tool, grouped into the same six categories TradingView uses. Each glyph stores
// complete inner SVG markup painted with `currentColor`, so the picker can inline
// it (CSS color) and the canvas renderer can bake a concrete color into a data URL.
//
// Also exports the curated Stickers set (larger decorative emoji rendered through
// Twemoji — TradingView's own illustrated stickers are proprietary art we can't
// ship, so this is the closest faithful stand-in).

export interface IconGlyph {
  id: string;
  name: string;
  /** Inner SVG markup on a 0 0 24 24 viewBox, using `currentColor`. */
  svg: string;
}

export interface IconCategory {
  id: string;
  label: string;
  /** Glyph id shown in the category navigation bar. */
  icon: string;
  glyphs: IconGlyph[];
}

const stroke = (d: string, width = 2) =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

export const ICON_CATEGORIES: IconCategory[] = [
  {
    id: 'gestures',
    label: 'Gestures & smileys',
    icon: 'smile',
    glyphs: [
      {
        id: 'smile',
        name: 'Smiling face',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 14a4 4 0 0 0 8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/>`,
      },
      {
        id: 'frown',
        name: 'Frowning face',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 16a4 4 0 0 1 8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/>`,
      },
      {
        id: 'thumbs-up',
        name: 'Thumbs up',
        svg: `<path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 2 2v3h5a2 2 0 0 1 2 2.3l-1.3 6A2 2 0 0 1 16.7 20H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
      },
      {
        id: 'thumbs-down',
        name: 'Thumbs down',
        svg: `<path d="M17 13V4h3v9zM17 13l-4 7a2 2 0 0 1-2-2v-3H6a2 2 0 0 1-2-2.3l1.3-6A2 2 0 0 1 7.3 4H17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
      },
      {
        id: 'heart',
        name: 'Heart',
        svg: `<path d="M12 21s-7-4.5-9.3-9A5 5 0 0 1 12 6.5 5 5 0 0 1 21.3 12c-2.3 4.5-9.3 9-9.3 9z" fill="currentColor"/>`,
      },
      {
        id: 'flame',
        name: 'Flame',
        svg: `<path d="M12 2c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 .2 1.2 1 2 2 2 1.2-1.8-1-4 1-8z" fill="currentColor"/>`,
      },
      {
        id: 'neutral',
        name: 'Neutral face',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/>${stroke('M9 15h6')}`,
      },
      {
        id: 'laugh',
        name: 'Laughing face',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M7.5 10.5a2 2 0 0 1 3 0')}${stroke('M13.5 10.5a2 2 0 0 1 3 0')}<path d="M7 13.5a5 5 0 0 0 10 0z" fill="currentColor"/>`,
      },
      {
        id: 'wink',
        name: 'Winking face',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/>${stroke('M13.5 10h3')}${stroke('M8 14a4 4 0 0 0 8 0')}`,
      },
      {
        id: 'surprised',
        name: 'Surprised face',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="15.6" r="1.8" fill="none" stroke="currentColor" stroke-width="2"/>`,
      },
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols & flags',
    icon: 'check',
    glyphs: [
      { id: 'check', name: 'Check mark', svg: stroke('M5 13l4 4 10-10', 2.4) },
      { id: 'cross', name: 'Cross mark', svg: stroke('M6 6l12 12M18 6L6 18', 2.4) },
      {
        id: 'warning',
        name: 'Warning',
        svg: `${stroke('M12 4l9 16H3z')}${stroke('M12 10v4')}<circle cx="12" cy="17.4" r="1.1" fill="currentColor"/>`,
      },
      {
        id: 'info',
        name: 'Information',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M12 11v5')}<circle cx="12" cy="8" r="1.2" fill="currentColor"/>`,
      },
      {
        id: 'question',
        name: 'Question',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M9.5 9.5a2.5 2.5 0 1 1 3.6 2.3c-.9.4-1.1 1-1.1 1.8')}<circle cx="12" cy="16.6" r="1.1" fill="currentColor"/>`,
      },
      { id: 'flag', name: 'Flag', svg: stroke('M6 21V4M6 5h11l-2 4 2 4H6') },
      { id: 'plus', name: 'Plus', svg: stroke('M12 5v14M5 12h14', 2.4) },
      { id: 'minus', name: 'Minus', svg: stroke('M5 12h14', 2.4) },
      {
        id: 'star',
        name: 'Star',
        svg: `<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 5.9 20.5l1.2-6.5L2.3 9.4l6.6-.9z" fill="currentColor"/>`,
      },
      {
        id: 'circle-check',
        name: 'Check circle',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M8 12.5l2.5 2.5 5-5')}`,
      },
      {
        id: 'circle-cross',
        name: 'Cross circle',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M9 9l6 6M15 9l-6 6')}`,
      },
      {
        id: 'power',
        name: 'Power',
        svg: `${stroke('M12 3v8')}${stroke('M7.5 6.6a7 7 0 1 0 9 0')}`,
      },
      {
        id: 'refresh',
        name: 'Refresh',
        svg: `${stroke('M20 12a8 8 0 1 1-2.3-5.6')}${stroke('M20 4v4h-4')}`,
      },
      {
        id: 'eye',
        name: 'Eye',
        svg: `${stroke('M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z')}<circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/>`,
      },
      {
        id: 'ban',
        name: 'Prohibited',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M6 6l12 12')}`,
      },
      { id: 'asterisk', name: 'Asterisk', svg: stroke('M12 4v16M5 8l14 8M19 8L5 16') },
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    icon: 'sun',
    glyphs: [
      {
        id: 'sun',
        name: 'Sun',
        svg: `<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2')}`,
      },
      { id: 'moon', name: 'Moon', svg: stroke('M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z') },
      { id: 'cloud', name: 'Cloud', svg: stroke('M7 18h10a4 4 0 0 0 .5-8 5 5 0 0 0-9.6-1A3.5 3.5 0 0 0 7 18z') },
      { id: 'droplet', name: 'Droplet', svg: stroke('M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z') },
      {
        id: 'leaf',
        name: 'Leaf',
        svg: `${stroke('M5 19c0-8 6-14 14-14 0 8-6 14-14 14z')}${stroke('M5 19C9 15 13 12 17 9')}`,
      },
      { id: 'bolt', name: 'Lightning bolt', svg: `<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>` },
      { id: 'snowflake', name: 'Snowflake', svg: stroke('M12 2v20M4 7l16 10M20 7L4 17') },
      {
        id: 'tree',
        name: 'Tree',
        svg: `${stroke('M12 3l5 8h-3l3 5H7l3-5H7z')}${stroke('M12 16v5')}`,
      },
      { id: 'mountain', name: 'Mountain', svg: stroke('M3 19l6-11 4 6 2-3 6 8z') },
      {
        id: 'wind',
        name: 'Wind',
        svg: `${stroke('M3 8h11a2.5 2.5 0 1 0-2.5-2.5')}${stroke('M3 13h16a2.5 2.5 0 1 1-2.5 2.5')}`,
      },
      {
        id: 'rain',
        name: 'Rain',
        svg: `${stroke('M7 14h10a4 4 0 0 0 .5-8 5 5 0 0 0-9.6-1A3.5 3.5 0 0 0 7 14z')}${stroke('M8 17l-1 3M12 17l-1 3M16 17l-1 3')}`,
      },
    ],
  },
  {
    id: 'currency',
    label: 'Currency',
    icon: 'usd',
    glyphs: [
      { id: 'usd', name: 'US dollar', svg: currencyGlyph('$') },
      { id: 'eur', name: 'Euro', svg: currencyGlyph('€') },
      { id: 'gbp', name: 'British pound', svg: currencyGlyph('£') },
      { id: 'jpy', name: 'Japanese yen', svg: currencyGlyph('¥') },
      { id: 'btc', name: 'Bitcoin', svg: currencyGlyph('₿') },
      { id: 'inr', name: 'Indian rupee', svg: currencyGlyph('₹') },
      { id: 'cent', name: 'Cent', svg: currencyGlyph('¢') },
      { id: 'percent', name: 'Percent', svg: currencyGlyph('%') },
      { id: 'krw', name: 'Korean won', svg: currencyGlyph('₩') },
      { id: 'rub', name: 'Russian ruble', svg: currencyGlyph('₽') },
      { id: 'try', name: 'Turkish lira', svg: currencyGlyph('₺') },
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: 'bulb',
    glyphs: [
      {
        id: 'bulb',
        name: 'Light bulb',
        svg: `${stroke('M9 18h6M10 21h4')}${stroke('M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.2 1 2.5h6c0-1.3.3-1.9 1-2.5A6 6 0 0 0 12 3z')}`,
      },
      {
        id: 'bell',
        name: 'Bell',
        svg: `${stroke('M6 16V11a6 6 0 0 1 12 0v5l2 2H4z')}${stroke('M10 19a2 2 0 0 0 4 0')}`,
      },
      {
        id: 'lock',
        name: 'Lock',
        svg: `<rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M8 11V8a4 4 0 0 1 8 0v3')}`,
      },
      {
        id: 'clock',
        name: 'Clock',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M12 7v5l3 2')}`,
      },
      {
        id: 'pin',
        name: 'Map pin',
        svg: `${stroke('M12 21s-6-5-6-10a6 6 0 0 1 12 0c0 5-6 10-6 10z')}<circle cx="12" cy="11" r="2" fill="currentColor"/>`,
      },
      {
        id: 'target',
        name: 'Target',
        svg: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>`,
      },
      {
        id: 'briefcase',
        name: 'Briefcase',
        svg: `<rect x="3" y="7" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2')}`,
      },
      {
        id: 'trophy',
        name: 'Trophy',
        svg: stroke('M8 4h8v4a4 4 0 0 1-8 0zM6 5H4v2a3 3 0 0 0 3 3M18 5h2v2a3 3 0 0 1-3 3M10 13h4M9 20h6M12 14v6'),
      },
      {
        id: 'search',
        name: 'Search',
        svg: `<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M15.5 15.5L20 20')}`,
      },
      {
        id: 'sliders',
        name: 'Settings',
        svg: `${stroke('M4 7h8M16 7h4M4 17h4M12 17h8')}<circle cx="14" cy="7" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/>`,
      },
      { id: 'home', name: 'Home', svg: `${stroke('M4 11l8-7 8 7')}${stroke('M6 10v9h12v-9')}` },
      {
        id: 'camera',
        name: 'Camera',
        svg: `<rect x="3" y="7" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M8.5 7l1.4-2.5h4.2L15.5 7')}<circle cx="12" cy="13.5" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/>`,
      },
      {
        id: 'gift',
        name: 'Gift',
        svg: `<rect x="4" y="9" width="16" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M3.5 9h17M12 9v11')}${stroke('M12 9C9.5 9 8 4.5 12 6.2 16 4.5 14.5 9 12 9z')}`,
      },
      {
        id: 'key',
        name: 'Key',
        svg: `<circle cx="8" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M11.5 12H20M17 12v3M20 12v4')}`,
      },
      {
        id: 'calendar',
        name: 'Calendar',
        svg: `<rect x="4" y="5" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M4 9.5h16M8 3v4M16 3v4')}`,
      },
      {
        id: 'mail',
        name: 'Mail',
        svg: `<rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>${stroke('M4 8l8 6 8-6')}`,
      },
    ],
  },
  {
    id: 'arrows',
    label: 'Arrows',
    icon: 'arrow-up',
    glyphs: [
      { id: 'arrow-up', name: 'Arrow up', svg: stroke('M12 5v14M6 11l6-6 6 6') },
      { id: 'arrow-down', name: 'Arrow down', svg: stroke('M12 5v14M6 13l6 6 6-6') },
      { id: 'arrow-left', name: 'Arrow left', svg: stroke('M5 12h14M11 6l-6 6 6 6') },
      { id: 'arrow-right', name: 'Arrow right', svg: stroke('M5 12h14M13 6l6 6-6 6') },
      { id: 'arrow-up-right', name: 'Arrow up-right', svg: stroke('M7 17L17 7M9 7h8v8') },
      { id: 'arrow-down-right', name: 'Arrow down-right', svg: stroke('M7 7l10 10M17 9v8H9') },
      { id: 'trending-up', name: 'Trending up', svg: stroke('M3 17l6-6 4 4 8-8M15 7h6v6') },
      { id: 'trending-down', name: 'Trending down', svg: stroke('M3 7l6 6 4-4 8 8M15 17h6v-6') },
      { id: 'arrow-up-left', name: 'Arrow up-left', svg: stroke('M17 17L7 7M7 15V7h8') },
      { id: 'arrow-down-left', name: 'Arrow down-left', svg: stroke('M17 7L7 17M15 17H7V9') },
      { id: 'chevrons-up', name: 'Chevrons up', svg: stroke('M6 13l6-6 6 6M6 18l6-6 6 6') },
      { id: 'chevrons-down', name: 'Chevrons down', svg: stroke('M6 6l6 6 6-6M6 11l6 6 6-6') },
    ],
  },
];

function currencyGlyph(symbol: string): string {
  return `<text x="12" y="18.5" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="currentColor">${symbol}</text>`;
}

// Larger decorative emoji shown on the Stickers tab.
export const STICKER_EMOJIS: Array<{ c: string; n: string }> = [
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

const ICON_GLYPH_BY_ID = new Map<string, IconGlyph>();
for (const category of ICON_CATEGORIES) {
  for (const glyph of category.glyphs) ICON_GLYPH_BY_ID.set(glyph.id, glyph);
}

export const ICON_TOKEN_PREFIX = 'icon:';

export const getIconGlyphById = (id: string): IconGlyph | undefined => ICON_GLYPH_BY_ID.get(id);

export const buildIconSvgMarkup = (inner: string, color: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${inner.split('currentColor').join(color)}</svg>`;

export const iconSvgDataUrl = (inner: string, color: string): string =>
  `data:image/svg+xml,${encodeURIComponent(buildIconSvgMarkup(inner, color))}`;
