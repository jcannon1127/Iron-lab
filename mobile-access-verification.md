# iPhone Access Recovery Verification

Date: 2026-08-12

The public login page at `https://ironlab.thisisus.ai/login` was verified from independent browser sessions before and after deployment. It renders the full Iron Lab sign-in experience and its interactive controls.

The live app shell and the retirement service worker return `Cache-Control: no-store, max-age=0`. The service worker removes former browser caches and unregisters itself, preventing Safari from combining an old HTML shell with a newer JavaScript bundle.

TypeScript verification and all nine Vitest tests passed before deployment.
