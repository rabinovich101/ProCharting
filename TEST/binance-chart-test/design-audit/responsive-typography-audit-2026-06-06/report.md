# Responsive Typography Accessibility Audit

Date: 2026-06-06

Target audited: local standalone Next.js app at `http://127.0.0.1:3100/`

Evidence:
- Screenshots: `TEST/binance-chart-test/design-audit/responsive-typography-audit-2026-06-06/screenshots`
- Raw computed-style evidence: `TEST/binance-chart-test/design-audit/responsive-typography-audit-2026-06-06/typography-evidence.json`
- States captured per viewport: default chart shell, Log in modal, Sign up modal, symbol search dialog, indicator picker.

Authentication note:
- Local app auth is disconnected because no `NEXT_PUBLIC_SUPABASE_*` variables are loaded.
- The deployed app at `https://procharts.thefiscalwire.com/` also opened signed out in this browser session.
- A test account is required to audit truly signed-in-only controls such as layout setup, save/manage layouts, account button, alerts, replay, settings, snapshot, trade, and publish.

## Executive Summary

The app is readable enough for a dense financial terminal on desktop, but it is not consistently comfortable for real humans on mobile. The main problems are not paragraph text. They are tiny controls, tiny financial metadata, and canvas-rendered chart numbers that fall below common mobile readability thresholds.

Most contrast is good on dark surfaces. Two exceptions matter: the canvas current-price marker uses white text on lime or pink, which fails contrast badly, and the symbol-search exchange badge has low contrast. The largest responsive bug is at tablet portrait `768 x 1024`, where the indicator picker is shifted off-screen and important text is hidden.

No normal site footer or HTML tables are rendered in the audited signed-out states. Footer coverage here refers to modal/action footers.

## Common Problem Selectors

These selector findings recur across devices. Device sections below reference these same selectors with viewport-specific severity.

| ID | Element / selector | Current computed style | Problem | Recommendation |
|---|---|---:|---|---|
| T1 | `.toolbar-trigger`, `.tool-toggle` | Mobile: `11px / 16.5px / 700`; desktop: `12px / 18px / 700` | Primary navigation/control text is small, especially on mobile. | Mobile `13-14px`, desktop `13-14px`, line-height around `1.35-1.45`, preserve compact density with spacing rather than 11px text. |
| T2 | `.signed-out-auth-cluster .auth-entry-button` | Mobile: `11px / 16.5px / 700`, min-height `30px`; desktop: `12px / 18px / 700` | Login/signup buttons are readable but feel small and are below ideal mobile tap target height. | Mobile `14px / 20px / 700`, min-height `40-44px`; desktop at least `13-14px`. |
| T3 | `.symbol-trigger-copy .trigger-label` | `13px / 13.65px / 720`, `line-height: 1.05`, mobile max-width `58px` | Mobile ticker truncates to `BTCUS...`; important ticker text is cramped. | Allow `BTCUSDT` to fit, e.g. `max-width: 72-82px`, line-height `1.2-1.3`, or use `BTC/USDT` with a wider symbol column. |
| T4 | `.symbol-trigger-copy small` | `10px / 10.5px / 650` | Exchange metadata is below readable caption size and has cramped line-height. | `12px / 14px / 650`, or keep hidden on mobile if the symbol itself is clear. |
| T5 | Canvas axis labels in `drawChart`: `axisFontSize` | Compact chart: `12px`; regular chart: `13px`; no CSS line-height | Price/time axis numbers are financial data and are marginal on mobile and large desktop. | Compact/mobile `13px`; desktop `14px`; adjust `rightAxisWidth` and bottom axis spacing as needed. |
| T6 | Canvas indicator labels in `drawChart`: `indicatorPaneFontSize` | Compact chart: `10.4px`; regular chart: `11.2px` | Volume/oscillator text is too small for quick financial scanning. | Compact/mobile `12px`; desktop `12.5-13px`; increase pane label spacing. |
| T7 | Canvas current price marker text | Text `#ffffff` on `#c2ef4e` or `#fa7faa`; contrast about `1.29:1` on lime, `2.35:1` on pink | Important current price/countdown text is visually weak and fails contrast. | Use dark text such as `#150f23` on lime/pink markers, or darken marker fills. Target at least `4.5:1`. |
| T8 | `.instrument-legend-overlay`, `.instrument-legend-field`, `.instrument-legend-change` | Mobile fields: `12px / 16.2px / 730`; desktop overlay: `14px / 18.9px / 730` | Mobile OHLC/percent data is small for high-speed scanning. | Mobile values `13-14px`, line-height `1.35-1.45`; allow two rows instead of shrinking. |
| T9 | `.indicator-legend-row`, `.indicator-legend-title`, `.indicator-legend-value` | Mobile: `10.4px / 15.6px / 760`; desktop values: `12px / 18px / 760` | Indicator legend data is too small on mobile; desktop is barely acceptable. | Mobile `12.5-13px`; desktop `13px`; keep value weight `700+`. |
| T10 | `.indicator-results-label`, `.indicator-category-rail > span` | `10px / 15px / 680` | Picker section labels such as `SCRIPT NAME`, `PERSONAL`, `BUILT-IN` are tiny. | `12px / 16-18px / 680-720`. |
| T11 | `.menu-item-copy strong`, `.menu-item-copy small`, `.indicator-kind` | Strong: `12px / 18px / 650`; small/kind: `11px / 16.5px / 400` | Indicator picker rows are dense; descriptions and short codes are small. | Strong `13px / 18px / 650`; descriptions `12.5-13px / 17px / 400`; codes `12px / 16px / 500-650`. |
| T12 | `.auth-dialog .header-panel-field span`, `.auth-dialog-divider small`, `.auth-dialog-title-copy > span` | Mostly `11px`; some `line-height: 1` | Form labels and modal eyebrow/divider text are below comfortable caption size. | `12-13px`, line-height `1.2-1.4`, keep uppercase if desired. |
| T13 | `.auth-dialog-title-copy small` | Desktop: `13px / 18.85px / 400`; small mobile: `11.5px / 14.95px / 400` | Small-mobile auth description drops below caption guidance. | Keep at least `12.5-13px / 17-19px`. |
| T14 | `.symbol-result-badge` | `11px / 16.5px / 850`, contrast about `2.3:1` | Badge text is small and low contrast. | Use dark text on orange/yellow badges or darker badge fills; `12px / 16px / 800`, contrast `>= 4.5:1`. |
| T15 | `.symbol-result-exchange`, `.symbol-result-tags small` | Exchange: `12px / 18px / 400`; tags: `11px / 16.5px / 400` | Exchange and tags are small metadata. | Exchange `13px`; tags `12px`; hide tags on mobile is acceptable. |
| T16 | `.indicator-dropdown .indicator-menu-panel` at tablet portrait | At `768 x 1024`: panel `x = -370`, width `740`; title and search start off-screen | Responsive positioning hides content, making text unreadable. | At `max-width: 900px`, do not apply the `.align-right .toolbar-menu { left: 0 }` transform to this fixed panel. Use `left: 14px; right: 14px; transform: none; width: auto;` or keep the centered rule. |

## Device Reports

### Mobile Small

Viewport size: `360 x 640`

Overall readability score: `6 / 10`

Screenshots:
- `screenshots/mobile-small-default.png`
- `screenshots/mobile-small-login-modal.png`
- `screenshots/mobile-small-signup-modal.png`
- `screenshots/mobile-small-symbol-search.png`
- `screenshots/mobile-small-indicator-picker.png`

Elements that are too small:
- T1 `.toolbar-trigger`, `.tool-toggle`: `11px / 16.5px / 700`; recommend `13-14px / 18-20px / 700`.
- T2 `.signed-out-auth-cluster .auth-entry-button`: `11px / 16.5px / 700`, min-height `30px`; recommend `14px / 20px / 700`, min-height `40-44px`.
- T3 `.symbol-trigger-copy .trigger-label`: `13px / 13.65px / 720`, but constrained to `58px`; ticker truncates. Recommend wider symbol text or `BTC/USDT`.
- T5 canvas price/time axes: `12px`; recommend `13px`.
- T6 canvas volume/indicator labels: `10.4px`; recommend `12px`.
- T8 `.instrument-legend-*`: values around `12px / 16.2px / 730`; recommend `13-14px`.
- T9 `.indicator-legend-*`: `10.4px / 15.6px / 760`; recommend `12.5-13px`.
- T10/T11 indicator picker labels and descriptions: `10-11px`; recommend `12-13px`.
- T12/T13 auth labels and small-mobile auth description: `11-11.5px`; recommend at least `12.5px`.

Elements that are too large:
- None observed. Auth heading at `22px` on the small-height modal is not oversized.

Elements with bad line-height:
- T3 `.symbol-trigger-copy .trigger-label`: `line-height: 1.05`; cramped.
- T12 `.auth-dialog-title-copy > span` and `.auth-dialog-divider small`: `11px / 11px`; acceptable for decorative labels, but cramped for repeated form scanning.

Elements with bad spacing:
- T2 mobile auth buttons and top toolbar controls are only about `30px` high, below comfortable tap size.
- Indicator picker rows are visually dense because row descriptions and codes are small.

Contrast/readability issues:
- T7 current price marker canvas text uses white on lime/pink. This is low contrast and hard to read.
- T14 `.symbol-result-badge` contrast around `2.3:1`.
- General dark-surface contrast is otherwise strong.

Wrapping, overlap, truncation, hiding:
- T3 ticker truncates to `BTCUS...`.
- No horizontal page overflow was detected.

### Mobile Standard

Viewport size: `390 x 844`

Overall readability score: `6.5 / 10`

Screenshots:
- `screenshots/mobile-standard-default.png`
- `screenshots/mobile-standard-login-modal.png`
- `screenshots/mobile-standard-signup-modal.png`
- `screenshots/mobile-standard-symbol-search.png`
- `screenshots/mobile-standard-indicator-picker.png`

Elements that are too small:
- Same as Mobile Small: T1, T2, T3, T5, T6, T8, T9, T10, T11, T12, T14.
- Auth inputs and provider buttons are good at `16px`, but labels remain `11px`.

Elements that are too large:
- None observed.

Elements with bad line-height:
- T3 symbol label remains `13px / 13.65px`.
- Auth eyebrow/divider text remains `11px / 11px`.

Elements with bad spacing:
- Header buttons still feel cramped despite the taller viewport.
- Indicator picker is usable, but dense row metadata is hard to scan.

Contrast/readability issues:
- T7 canvas current-price marker contrast fails.
- T14 symbol result badge contrast fails.

Wrapping, overlap, truncation, hiding:
- Ticker still truncates in the header.
- No horizontal page overflow detected.

### Mobile Large

Viewport size: `430 x 932`

Overall readability score: `6.5 / 10`

Screenshots:
- `screenshots/mobile-large-default.png`
- `screenshots/mobile-large-login-modal.png`
- `screenshots/mobile-large-signup-modal.png`
- `screenshots/mobile-large-symbol-search.png`
- `screenshots/mobile-large-indicator-picker.png`

Elements that are too small:
- T1/T2 controls remain `11px`; recommend `13-14px`.
- T5/T6 canvas labels remain `12px` and `10.4px`; recommend `13px` and `12px`.
- T9 mobile indicator legend remains `10.4px`; recommend `12.5-13px`.
- T10/T11 indicator picker metadata remains `10-11px`; recommend `12-13px`.
- T12 auth labels remain `11px`; recommend `12-13px`.

Elements that are too large:
- None observed.

Elements with bad line-height:
- T3 ticker label line-height remains `1.05`.
- Auth eyebrow/divider text remains `line-height: 1`.

Elements with bad spacing:
- Header control heights remain compact for touch.
- Indicator picker row density remains high.

Contrast/readability issues:
- T7 current price marker contrast fails.
- T14 badge contrast fails.

Wrapping, overlap, truncation, hiding:
- Header ticker truncation remains.
- No page-level horizontal overflow detected.

### Tablet Portrait

Viewport size: `768 x 1024`

Overall readability score: `5 / 10`

Screenshots:
- `screenshots/tablet-portrait-default.png`
- `screenshots/tablet-portrait-login-modal.png`
- `screenshots/tablet-portrait-signup-modal.png`
- `screenshots/tablet-portrait-symbol-search.png`
- `screenshots/tablet-portrait-indicator-picker.png`

Elements that are too small:
- T1 top controls: `12px / 18px / 700`; recommend `13-14px`.
- T4 exchange sublabel: `10px / 10.5px / 650`; recommend `12px / 14px`.
- T5/T6 canvas labels: `13px` axes and `11.2px` indicator labels; axes are acceptable but indicator labels should be `12.5-13px`.
- T10/T11 indicator picker labels/descriptions: `10-11px`; recommend `12-13px`.
- T12 auth form labels: `11px`; recommend `12-13px`.

Elements that are too large:
- None observed.

Elements with bad line-height:
- T3 symbol label: `13px / 13.65px`; recommend line-height `1.2-1.3`.
- T4 exchange sublabel: `10px / 10.5px`; cramped.

Elements with bad spacing:
- T16 indicator picker is the major failure: panel opens at `x = -370`, width `740`, so the title and left rail are off-screen.

Contrast/readability issues:
- T7 current price marker contrast fails.
- T14 symbol result badge contrast fails.

Wrapping, overlap, truncation, hiding:
- T16 hides indicator picker title/search/left rail content in tablet portrait. This is the highest-priority responsive issue in the audit.

### Tablet Landscape

Viewport size: `1024 x 768`

Overall readability score: `7 / 10`

Screenshots:
- `screenshots/tablet-landscape-default.png`
- `screenshots/tablet-landscape-login-modal.png`
- `screenshots/tablet-landscape-signup-modal.png`
- `screenshots/tablet-landscape-symbol-search.png`
- `screenshots/tablet-landscape-indicator-picker.png`

Elements that are too small:
- T1 controls: `12px / 18px / 700`; recommend `13-14px`.
- T4 exchange sublabel: `10px / 10.5px / 650`; recommend `12px / 14px`.
- T6 canvas indicator labels: `11.2px`; recommend `12.5-13px`.
- T10/T11 indicator picker labels/descriptions: `10-11px`; recommend `12-13px`.
- T12 auth labels: `11px`; recommend `12-13px`.

Elements that are too large:
- None observed.

Elements with bad line-height:
- T3/T4 symbol stack is cramped.

Elements with bad spacing:
- Indicator picker fits correctly in landscape but row metadata remains dense.

Contrast/readability issues:
- T7 current price marker contrast fails.
- T14 symbol result badge contrast fails.

Wrapping, overlap, truncation, hiding:
- No page-level overflow detected.

### Laptop

Viewport size: `1366 x 768`

Overall readability score: `7 / 10`

Screenshots:
- `screenshots/laptop-default.png`
- `screenshots/laptop-login-modal.png`
- `screenshots/laptop-signup-modal.png`
- `screenshots/laptop-symbol-search.png`
- `screenshots/laptop-indicator-picker.png`

Elements that are too small:
- T1/T2 controls: `12px / 18px / 700`; recommend `13-14px`.
- T4 exchange sublabel: `10px / 10.5px / 650`; recommend `12px`.
- T6 canvas indicator labels: `11.2px`; recommend `12.5-13px`.
- T10/T11 indicator picker metadata: `10-11px`; recommend `12-13px`.
- T12 auth labels: `11px`; recommend `12-13px`.

Elements that are too large:
- None observed. Desktop headings are restrained and not childish.

Elements with bad line-height:
- T3/T4 symbol stack is cramped.
- Auth headline uses `26px / 28.08px`; visually acceptable because it is one line, but `1.15-1.2` would be safer.

Elements with bad spacing:
- Header is dense but usable.
- Indicator picker row descriptions are compact enough to slow scanning.

Contrast/readability issues:
- T7 current price marker contrast fails.
- T14 symbol result badge contrast fails.

Wrapping, overlap, truncation, hiding:
- No major desktop truncation except the intentionally tight symbol sublabel stack.

### Desktop

Viewport size: `1440 x 900`

Overall readability score: `7 / 10`

Screenshots:
- `screenshots/desktop-default.png`
- `screenshots/desktop-login-modal.png`
- `screenshots/desktop-signup-modal.png`
- `screenshots/desktop-symbol-search.png`
- `screenshots/desktop-indicator-picker.png`

Elements that are too small:
- T1/T2 controls: `12px / 18px / 700`; recommend `13-14px`.
- T4 exchange sublabel: `10px / 10.5px / 650`; recommend `12px`.
- T6 canvas indicator labels: `11.2px`; recommend `12.5-13px`.
- T10/T11 indicator picker metadata: `10-11px`; recommend `12-13px`.
- T12 auth labels: `11px`; recommend `12-13px`.

Elements that are too large:
- None observed. Large chart area does not make text look childish.

Elements with bad line-height:
- T3/T4 symbol stack remains cramped.

Elements with bad spacing:
- Default chart shell is dense but acceptable for a trading terminal.
- Indicator picker remains the densest text surface.

Contrast/readability issues:
- T7 current price marker contrast fails.
- T14 symbol result badge contrast fails.

Wrapping, overlap, truncation, hiding:
- No major overlap or horizontal overflow detected.

### Large Desktop

Viewport size: `1920 x 1080`

Overall readability score: `7 / 10`

Screenshots:
- `screenshots/large-desktop-default.png`
- `screenshots/large-desktop-login-modal.png`
- `screenshots/large-desktop-signup-modal.png`
- `screenshots/large-desktop-symbol-search.png`
- `screenshots/large-desktop-indicator-picker.png`

Elements that are too small:
- T1/T2 controls: `12px / 18px / 700`; recommend `13-14px`.
- T4 exchange sublabel: `10px / 10.5px / 650`; recommend `12px`.
- T5 canvas axes: `13px`; acceptable but a little small on a 1920px-wide financial display. Recommend `14px`.
- T6 canvas indicator labels: `11.2px`; recommend `12.5-13px`.
- T10/T11 picker metadata: `10-11px`; recommend `12-13px`.
- T12 auth labels: `11px`; recommend `12-13px`.

Elements that are too large:
- None observed. The interface remains compact; if anything, text is slightly undersized relative to the available space.

Elements with bad line-height:
- T3/T4 symbol stack remains cramped.

Elements with bad spacing:
- Large desktop has enough room to increase chart axes, toolbar controls, and picker metadata without hurting density.

Contrast/readability issues:
- T7 current price marker contrast fails.
- T14 symbol result badge contrast fails.

Wrapping, overlap, truncation, hiding:
- No major overflow detected.

## Priority Fix Order

1. Fix T16 tablet portrait indicator picker positioning. This is the only issue that hides substantial UI text.
2. Fix T7 canvas current price marker contrast by using dark text on lime/pink markers.
3. Increase mobile toolbar/account button text and tap height: T1 and T2.
4. Make mobile ticker fully readable: T3.
5. Increase canvas financial labels: T5 and T6.
6. Increase mobile indicator legend and picker metadata: T9, T10, T11.
7. Improve small labels in auth dialogs: T12 and T13.
8. Fix low-contrast symbol result badge: T14.

## What Looked Good

- Auth provider buttons and input placeholders are visually readable at `16px` with good spacing.
- Modal body copy uses practical line-height around `1.45`.
- Desktop chart shell is not oversized or childish.
- Most dark-theme text contrast is strong.
- No full-page horizontal overflow was detected in the signed-out states.
