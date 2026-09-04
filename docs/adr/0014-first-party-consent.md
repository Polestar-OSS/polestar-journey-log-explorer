# 0014 – Consent is first-party: one banner for one optional cookie

2026-09 · Accepted

## Context

The site used a hosted consent platform. Its banner listed purposes the
site does not have ("Sale of my personal information", five third parties),
its stored decision did not survive a reload for at least one visitor, and
it loaded three scripts before the app. The only optional third party is
Google Analytics, used to count visits; the journey data never leaves the
browser at all.

## Decision

- Consent is handled in the app: `ConsentService` stores the decision in
  `localStorage` and pushes it to Google Consent Mode v2; `ConsentBanner`
  offers Accept and Decline as equal buttons and says what is and is not
  collected. The footer shows the current state and reopens the banner.
- `index.html` sets analytics storage to denied before the tag loads and
  applies a stored acceptance before `gtag('config')`, so a returning
  visitor is never re-asked and never tracked before deciding. IP
  anonymisation is on.
- The hosted privacy and cookie policy documents stay linked; only the
  banner and its scripts are replaced. "Delete everything" in the data
  dialog also clears the decision.

## Consequences

- No third-party consent script, no purposes the site does not have, and
  a decision that persists like every other preference in the app.
- Regulatory frameworks that require a certified consent platform are not
  served by this; the site does not sell data or run advertising, so the
  requirement does not arise.
- Adding another optional third party means adding a purpose to the
  service and the banner, deliberately.

## Alternatives considered

- **Reconfigure the hosted platform**: the "sale" toggle and the
  per-language policy mapping live in its dashboard, outside the
  repository, and the persistence failure could not be reproduced from
  here; the site's needs are small enough to own.
- **Drop analytics**: possible later; visit counts are the only signal the
  maintainers have.
