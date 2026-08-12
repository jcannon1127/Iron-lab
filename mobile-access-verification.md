# iPhone Access Recovery Verification

Date: 2026-08-12

The public login page at `https://ironlab.thisisus.ai/login` was verified from independent browser sessions before and after deployment. It renders the full Iron Lab sign-in experience and its interactive controls.

The live app shell and the retirement service worker return `Cache-Control: no-store, max-age=0`. The service worker removes former browser caches and unregisters itself, preventing Safari from combining an old HTML shell with a newer JavaScript bundle.

TypeScript verification and all nine Vitest tests passed before deployment.

## Post-Sync Live Check

After the shared preview sync, the live `/`, `/login`, `/sw.js`, and `/api/health` routes all returned HTTP 200. The Vultr `ironlab` container is healthy. A fresh browser visit to `/login?access-check=latest` rendered the full login form, and its browser console contained no errors.

## Safari Asset Recovery Deployment

The Safari recovery deployment compiles a conservative Safari 13-compatible bundle at stable asset URLs. Current JavaScript is served as `/assets/index.js` with `Cache-Control: no-store, max-age=0`. Requests for a removed bundle now return HTTP 404 instead of HTML, preventing an old Safari shell from attempting to parse the login page as JavaScript. A fresh post-deployment browser visit rendered the login page with no console errors.
