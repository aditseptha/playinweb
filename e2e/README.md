# Design system checks

`npm run test:e2e` runs Playwright against `/admin/design` in Chromium and WebKit:

- **Accessibility**: axe with the WCAG 2.2 AA rules, in the dark and light preview.
- **Keyboard**: Dialog, ConfirmDialog, Sheet, Menu and Tabs (Chromium only; Safari only Tabs to buttons with Full Keyboard Access on).
- **Layout**: no horizontal scroll at 390px.
- **Screenshots**: the Button, GameCard and Table demos in dark and light, compared on CI only.

Locally, reuse a running dev server instead of starting a second one:

```sh
PW_BASE_URL=http://localhost:4000 npm run test:e2e
```

## Screenshot baselines

Baselines live in `e2e/__screenshots__/<browser>/` and are made on CI (Linux), so they never differ between laptops.
When a baseline is missing, the test passes and attaches the screenshot to the report instead.

To add or update baselines:

1. Open the PR's **CI → Design system** run and download the `screenshot-baselines` artifact.
2. Check the screenshots look right.
3. Copy its `chromium/` and `webkit/` folders into `e2e/__screenshots__/` and commit.

To refresh a baseline after an intended change, delete the old file in the same PR; CI makes a new one.
