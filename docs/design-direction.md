# Amarka Design Direction

## Brand posture

- Visual tone: luxury, restrained, editorial, tactile.
- Primary emotion: trust and aspiration before urgency.
- Core palette: warm ivory backgrounds, champagne-gold accents, deep ink typography, bronze support tones.
- Typography roles:
  - Display: reserved for hero statements, section titles, collection spotlights.
  - Sans: navigation, metadata, supporting copy, product utilities.

## Global system

- Page chrome:
  - Navigation should feel like a premium frame, not a generic ecommerce bar.
  - Footer should close the experience with brand reassurance, contact clarity, and one clean conversion action.
- Surfaces:
  - Use layered paper, glass, and soft metallic accents.
  - Prefer rounded large radii, subtle borders, and long shadows over harsh contrast.
- Motion:
  - Use slow lifts, image scale-on-hover, and soft fade/slide reveals.
  - Avoid bouncy or aggressive motion.
- Density:
  - Keep generous whitespace.
  - One strong focal action per section.

## Page mapping

### Home

- Purpose: introduce brand quality, establish trust, and route users into collections or products.
- Structure:
  1. Hero with value proposition, primary CTA, secondary CTA, trust signals.
  2. Collection grid with clear visual hierarchy.
  3. Featured products with curated framing.
  4. Editorial/support block for services or craftsmanship story.
  5. Social proof.
  6. Final CTA.
- Style notes:
  - Hero should feel campaign-like, not marketplace-like.
  - Product sections need breathing room and strong section headers.

### Collections index

- Purpose: help users understand categories fast.
- Structure:
  1. Page hero with short positioning sentence.
  2. Collection cards with strong imagery.
  3. Optional featured collection band.
- Style notes:
  - Cards should behave like luxury lookbook entries.
  - Avoid crowded metadata.

### Collection detail

- Purpose: orient the user inside a specific category and push toward discovery.
- Structure:
  1. Collection hero with statement, image, and CTA.
  2. Filter/sort strip in a premium but quiet surface.
  3. Product grid.
  4. Supporting craftsmanship or gifting content.
- Style notes:
  - Filters should feel integrated, not like admin controls.

### Product listing

- Purpose: efficient browsing without losing brand tone.
- Structure:
  1. Compact page hero.
  2. Filter and search controls.
  3. Grid/list toggle.
  4. Product cards.
- Style notes:
  - Keep controls minimal.
  - Preserve visual consistency with homepage product treatments.

### Product detail

- Purpose: convert with confidence and desire.
- Structure:
  1. Gallery plus product summary.
  2. Personalization/configuration area.
  3. Trust block: delivery, packaging, materials, support.
  4. Reviews.
  5. Related products.
- Style notes:
  - This page should feel like a boutique consultation.
  - CTA area must be unmistakable and calm.

### Services

- Purpose: explain bespoke capabilities and reassure higher-intent buyers.
- Structure:
  1. Editorial hero.
  2. Service cards.
  3. Process steps.
  4. Contact CTA.
- Style notes:
  - Use more narrative copy and fewer catalog patterns.

### Gallery

- Purpose: brand proof and inspiration.
- Structure:
  1. Minimal hero.
  2. Masonry or modular image grid.
  3. Optional CTA into collections/contact.
- Style notes:
  - Let imagery dominate.
  - Keep chrome quiet.

### Contact

- Purpose: direct conversion and reassurance.
- Structure:
  1. Compact hero.
  2. Contact methods.
  3. Form.
  4. Business details / service expectations.
- Style notes:
  - The form should feel premium and easy, not transactional.

### Cart and checkout

- Purpose: clarity, trust, speed.
- Structure:
  1. Progress indicator.
  2. Order summary.
  3. Clear primary action.
  4. Reinforcement of delivery/security.
- Style notes:
  - Reduce decorative noise.
  - Increase contrast and legibility.

### Client account pages

- Purpose: utility with brand consistency.
- Structure:
  1. Compact header.
  2. Clear navigation tabs or sections.
  3. Data cards with generous spacing.
- Style notes:
  - More restrained than marketing pages.
  - Keep premium surfaces and typography.

## Component adaptation rules

- Buttons:
  - Primary for one action per section.
  - Outline for secondary actions.
  - Keep pill shapes and subtle elevation.
- Cards:
  - Use one card language site-wide: soft border, gentle shadow, elevated hover.
- Headings:
  - Display font only for titles that need emotional weight.
  - Body font for operational content.
- Imagery:
  - Favor full-bleed, tightly cropped, high-quality images.
  - Avoid mixed aspect ratios inside a single module unless intentional.
- Copy:
  - Short, declarative, premium.
  - Avoid crowded paragraphs and multiple competing messages.

## Implementation checklist for future pages

- Start from the page purpose, not the component inventory.
- Add one dominant visual moment near the top.
- Use the shared palette and surface tokens from `src/styles.scss`.
- Reuse button and card treatments from the homepage.
- Keep section spacing generous.
- Test desktop and mobile before considering a page complete.
