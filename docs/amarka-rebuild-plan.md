# AMARKA Rebuild Plan

## Positioning
 
AMARKA is being rebuilt from a consumer-commerce template into a premium B2B lead-generation website for bespoke laser engraving in the NYC metro. The public site should sell credibility, process, material fluency, and response speed rather than products, pricing, or checkout flows.

## Phase 1 Scope

- Home
- Work
- Services
- Trade
- Clients
- Enquire
- Basic About and Materials placeholders
- Firebase-backed enquiry and trade application submissions
- Firestore-managed structured content with seed fallback

## Architecture Direction

- Angular standalone pages with lazy routes
- Shared public shell with premium editorial layout
- Firestore-first content service with seed fallback during build and early launch
- Firebase Functions for lead processing and email routing
- Firebase Storage for spec sheets and uploaded project files
- Route-level SEO metadata and prerender-ready public routes

## Core Content Types

- `caseStudies`
- `services`
- `downloads`
- `siteSettings`
- `homepageContent`
- `enquiries`
- `tradeApplications`

## Conversion Flows

1. Homepage CTA to `/enquire`
2. Trade page application and spec sheet download
3. Work and Services CTA to enquiry
4. File uploads attached to trade and public project enquiries

## Build Priorities

1. Stabilize routing and public shell
2. Finalize typed content and lead models
3. Verify Firebase Functions and Firestore rules
4. Complete SEO and analytics pass
5. Replace remaining ecommerce language and dead routes
