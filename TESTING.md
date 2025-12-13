# Frontend Testing Guide

## 1. Unit Tests (Jest + React Testing Library)
Verify components and local logic.

**Command:**
```bash
npm test
```

## 2. E2E Tests (Playwright)
Run end-to-end tests to verify user flows in the browser.

**Command:**
```bash
npx playwright test
```
*Note: First run `npx playwright install` if browsers are missing.*

## 3. Compatibility
Playwright tests run across Chromium, Firefox, and WebKit (Safari engine) by default in `playwright.config.ts`.
