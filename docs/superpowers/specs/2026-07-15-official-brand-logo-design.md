# Official Brand Logo Design

## Scope

Adopt the supplied 200×200 transparent black PNG as the official MANRIS brand mark. Replace visible legacy wordmarks and logo assets in the authenticated shell and public authentication surfaces, and use the same mark for browser metadata.

## Asset

- Store the source unchanged as `frontend/public/brand-logo.png`.
- Preserve its square aspect ratio and transparent background.
- Do not recolor or redraw the supplied mark.
- On dark surfaces, use CSS inversion so the single-color black source renders white.

## Placement

- Expanded sidebar: 28px mark followed by the lowercase `manris` wordmark.
- Collapsed sidebar: centered 28px mark only.
- Login screen: centered 56px mark above the login card.
- Change-password screen: 48px mark beside or above the existing MANRIS identity treatment.
- Browser icon metadata: `/brand-logo.png`.

Every placement uses descriptive alt text when rendered through an image element. Decorative duplicates must use empty alt text.

## Responsive and Theme Behavior

The logo must remain crisp without stretching, use `object-contain`, and never be cropped into a rounded tile. Light mode renders the original black mark. Dark mode applies `invert` so the mark remains visible while retaining its transparent background.

## Documentation and Verification

Document the official asset, sizes, clear presentation, and dark-mode treatment in `DESIGN.md`. Add source-contract tests covering shell, login, password recovery, and metadata usage; run focused tests, ESLint, and the production build.
