# Second Designer QA Audit

Date: 2026-06-06

## Audit Scope

Reviewed the recent Sentry-inspired chart shell and production auth-modal work
in the standalone `TEST/binance-chart-test` app.

Primary user goal: a signed-out visitor can inspect the chart, open discovery
surfaces, and enter signup/login flows without the UI feeling unfinished or
breaking on mobile.

Accessibility target: visible controls should remain reachable, labeled,
contained inside the viewport, and readable from screenshots. This is a visual
and interaction audit, not a full WCAG certification.

## Evidence

- `screenshots/01-desktop-chart.png` - desktop chart shell.
- `screenshots/02-desktop-symbol-search.png` - desktop symbol search modal.
- `screenshots/03-desktop-indicators.png` - desktop indicators modal.
- `screenshots/04-desktop-signup.png` - desktop signup modal.
- `screenshots/05-desktop-login.png` - desktop login modal.
- `screenshots/06-mobile-chart.png` - mobile chart shell at `390x844`.
- `screenshots/07-mobile-signup.png` - mobile signup modal at `390x844`.
- `screenshots/08-small-mobile-signup.png` - pre-fix small-mobile signup at
  `320x568`.
- `screenshots/09-small-mobile-signup-fixed.png` - post-fix small-mobile signup
  at `320x568` in dev.
- `screenshots/10-production-desktop-signup.png` - production desktop signup.
- `screenshots/11-production-small-mobile-signup.png` - production small-mobile
  signup.

## Step Notes

1. Desktop chart shell: Healthy.
   The Sentry-style violet canvas, lime primary actions, and pink/lime market
   colors feel cohesive. Header controls remain compact and readable, and the
   chart still has clear axes, overlays, and current-price affordances.

2. Desktop symbol search: Healthy with a minor polish note.
   The modal is visually aligned with the new system and the active state is
   clear. Search focus is highly visible. The close action is visible, though
   several controls across the app share the accessible name `Close menu`,
   which requires scoped locators in tests.

3. Desktop indicators modal: Healthy.
   The modal reads as a professional tool surface. Category rail, tabs, active
   rows, and the search input all match the updated design language. The
   existing repeated `Close menu` label is not visible-user breakage, but it is
   worth remembering for automation and assistive-technology clarity.

4. Desktop signup modal: Healthy.
   Google and GitHub icons load from project assets. Provider buttons look like
   production OAuth buttons, form fields are large enough, and the primary
   signup CTA is visually dominant without overpowering the secondary action.

5. Desktop login modal: Healthy.
   Login uses the same visual grammar as signup. The mode switch is clear and
   the dialog preserves visual trust with consistent spacing, hierarchy, and
   provider button treatment.

6. Mobile chart shell at `390x844`: Healthy.
   Header controls remain inside the viewport, auth buttons do not overflow,
   and the chart stays inspectable. The mobile crop is dense, but that is
   appropriate for a charting product.

7. Mobile signup at `390x844`: Healthy.
   The modal fits cleanly, provider icons load, and the footer actions stay
   readable and reachable.

8. Small-mobile signup at `320x568`: Issue found and fixed.
   Before the fix, the signup modal was taller than the viewport and the lower
   status/footer area was clipped. The fix adds a compact auth breakpoint,
   modal max-height, recoverable body scrolling, and non-wrapping footer
   buttons. Production verification confirms the modal now fits within
   `320x568` with no horizontal overflow.

## UX Risks

- Repeated `Close menu` labels are manageable visually, but they make automated
  testing and assistive navigation less precise. A future accessibility pass
  should consider contextual labels such as `Close indicators` and
  `Close signup`.
- The disconnected account message is deployment-specific and appears by
  default when Supabase env vars are missing. It is useful for QA, but a
  production deployment with Supabase configured should verify the post-OAuth
  redirect and email/password success states.

## Accessibility Risks

- Screenshot evidence confirms visible layout fit, labels, and target sizing,
  but does not prove full keyboard traversal, screen-reader announcement order,
  or WCAG contrast ratios for every state.
- The auth modal now prevents small-screen clipping, but keyboard focus trapping
  inside the modal was not fully audited in this pass.

## Verification

- `npm run build` passed after the compact-modal fix.
- `npm run test:e2e` passed after the compact-modal fix: 3 Playwright tests.
- Production browser spot check passed at desktop and `320x568`.
- Google/GitHub provider icons loaded from `/auth/google.svg` and
  `/auth/github.svg`.
- Console warning/error logs were empty during production browser verification.
- No horizontal overflow was detected in checked desktop, mobile, or
  small-mobile states.
