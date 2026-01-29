Feature: “Featured on Home Page” Flag (Admin-Controlled)

We need an admin-controlled way to decide which products appear in the Home Page → Featured Products section, so featured items can be updated seasonally (e.g., monthly).

Admin Panel (Products)

In Admin → Products, add a boolean flag/toggle on each product:

featuredOnHome (true/false)

Label suggestion: “Feature on Home Page”

Admin can enable/disable this per product at any time (e.g., monthly seasonal updates).

Frontend (Home Page)

The Featured Products section should display only products where featuredOnHome = true

If no products have featuredOnHome = true:

The Featured Products section should be hidden entirely (no empty placeholders / no “no items” message unless you want one).

Behavior Rules

Products without the flag enabled must never appear in Featured Products.

Updating the toggle in Admin should reflect on the Home Page immediately (or on next refresh, depending on caching).

Optional Enhancements (nice-to-have)

Add Featured Priority / Order field (number) to control sorting.

Add a filter in admin: Show only featured.



///////

4: remove a closer look from the home page in the bottom




////////

Bug: “Business & Branding” collection is showing all products instead of only selected ones
Problem

On the website, the “Business & Branding” section/category is currently displaying all products. It is not respecting the products I specifically assigned to that collection in the admin panel.

Expected behavior

The Business & Branding page/section should show only the products that belong to the “Business & Branding” collection (i.e., products explicitly added/linked to that collection).

Products that are not assigned to this collection should not appear there.

Current behavior

The section is behaving like a generic “all products” listing, ignoring the collection filter.

Likely cause (implementation)

The frontend is probably calling the “get all products” endpoint/query (or missing a where collectionId = X filter).

Or the collection relationship is not being stored/used correctly (e.g., missing collectionIds / categoryId mapping).

Acceptance criteria

If a product is not linked to “Business & Branding”, it does not show on that page.

If the collection has zero products, the page shows an empty state (or hides the grid, depending on design).

Updates in admin (adding/removing products from that collection) reflect correctly on the website.


////////


Bug: Collection pages are showing duplicate descriptions
Problem

On collection pages, the collection description is being displayed twice (duplicated). This makes the layout look repetitive and messy.

Current behavior

The same description text appears two times within the collection view.

Expected behavior

The collection description should appear only once (in the intended location—usually under the collection title/hero).

Likely causes

The description component/field is being rendered in two different UI blocks (e.g., once in the header component and again in the content section).

The template is pulling the description from two sources (e.g., collection.description + seo.description or collection.longDescription) but they contain the same value.

A reusable component is included twice (e.g., collection header is used in both layout + page).

Acceptance criteria

Each collection page displays one description block.

No duplicate rendering across mobile and desktop breakpoints.

If the description is empty, the description area should be hidden (no blank spacing).
