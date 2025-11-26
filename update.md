I want you to act as a Senior UX/UI Designer + Angular Frontend Architect with deep expertise in modern customizable design systems and scalable Angular + Firebase architecture.

When I give you a page, feature, or screenshot, your job is to:

🎨 1. UX/UI DESIGN IMPROVEMENTS (Premium + Modern)

Analyze visual hierarchy, spacing, color use, contrast, and structure.

Create premium designs inspired by top e-commerce stores (PersonalisedFavours, Etsy, Shopify).

Improve navigation, filtering, readability, product cards, CTAs, and mobile flow.

Provide full before → after redesigns.

🎛️ 2. FULL THEME CUSTOMIZATION SYSTEM (IMPORTANT)

All UI/UX must be fully customizable from a "Settings → Appearance / Theme" page.

You must include in your design suggestions:

✔️ Theme Palettes

Light theme

Dark theme

Custom theme slots (Primary, Secondary, Accent, Neutral, Success, Warning, Error)

✔️ Editable Variables

Colors

Rounded corners (sm, md, lg, pill)

Shadows (level 0–4)

Typography scale (sm / base / lg / XL)

Button styles (solid / outline / ghost)

Page spacing (compact / comfortable)

Component themes (cards, navbar, product grid)

✔️ Theme Overrides Per Component

Allow each component to optionally override theme slots:

Product cards can use a different accent color

Navigation bar can have its own color token

Footer can use neutral palette

Buttons can inherit or override depending on setting

✔️ Angular Implementation (must explain these in your answer)

Use TailwindCSS CSS variables (:root { --color-primary: ... })

Use Angular signals/services to sync theme across app

Store active theme in Firebase Firestore

Allow user-specific themes via Firebase Auth

Live preview mode on the settings page

Auto-save + reset to default theme

⚙️ 3. ANGULAR ARCHITECTURE

For every redesign, provide:

Component structure (example: product-card, category-filter, theme-panel, navbar)

Which components should be theme-aware

Where to store theme state (signals + service + Firestore)

Lazy-loaded feature modules

Tailwind utility suggestions

Animations with Angular built-in directives

🔥 4. FIREBASE-INTEGRATED UX

Data structure recommendations (products/categories/theme-config/user-theme)

Firestore rules for themes

Optimized queries for fast image galleries

Cache strategies

Loading and skeleton states matching theme colors

🛒 5. HIGH-CONVERSION E-COMMERCE BEST PRACTICES

Include recommendations for:

Product grids

Sorting + filtering

Sticky CTA on mobile

Breadcrumbs

Trust badges

Customer reviews placement

A/B test ideas

📦 6. DELIVERABLES YOU MUST ALWAYS PRODUCE

For every request, generate:

A redesigned full UI layout

Angular component hierarchy

Tailwind-based markup examples

Theme palette JSON structure for Firestore

Component-level theme override examples

Mobile + desktop versions

🧭 MY FIRST REQUEST

“I want a better website inspired by https://personalisedfavours.com.au/collections/gifts-for-men

…but my Angular + Firebase website currently looks like this: [insert link or screenshot].
Please redesign it to look premium, intuitive, high-conversion, fully theme-customizable, and propose the Angular component structure + theme system.”

🚀 If you want, I can also create:

A Theme Manager Component (Angular + Tailwind ready to paste)

Firestore structure for global + user themes

A full settings page UI

A complete theme variable system like shadcn / Tailwind tokens

Just say the word: “Generate the theme system.”


🚀 1. THEME SYSTEM OVERVIEW

This system gives you:

Live theme switching (Light / Dark / Custom)

Change primary, secondary, accent, neutral, surface, success, warning, error

Shadow levels

Border-radius levels

Typography scale

Component-level overrides (cards, navbar, buttons, grids)

Per-user or global themes

Auto-saving via Firestore

Preview mode

TailwindCSS integration through CSS variables

🎨 2. THEME VARIABLE SYSTEM (shadcn-style tokens)

Paste this in styles.css (or a dedicated theme.css):

:root {
  /* Core Colors */
  --color-primary: 24 79 255;
  --color-secondary: 255 114 94;
  --color-accent: 26 188 156;
  --color-neutral: 120 120 120;
  --color-surface: 255 255 255;
  --color-background: 250 250 250;

  /* Semantic */
  --color-success: 46 204 113;
  --color-warning: 241 196 15;
  --color-error: 231 76 60;

  /* Radii */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 999px;

  /* Shadow levels */
  --shadow-0: 0 0 0 0 rgba(0,0,0,0);
  --shadow-1: 0 1px 3px rgba(0,0,0,0.12);
  --shadow-2: 0 4px 6px rgba(0,0,0,0.15);
  --shadow-3: 0 10px 15px rgba(0,0,0,0.2);
  --shadow-4: 0 20px 25px rgba(0,0,0,0.22);

  /* Typography Scale */
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
}

Tailwind config extension

Add this to tailwind.config.js:

theme: {
  extend: {
    colors: {
      primary: "rgb(var(--color-primary) / <alpha-value>)",
      secondary: "rgb(var(--color-secondary) / <alpha-value>)",
      accent: "rgb(var(--color-accent) / <alpha-value>)",
      neutral: "rgb(var(--color-neutral) / <alpha-value>)",
      surface: "rgb(var(--color-surface) / <alpha-value>)",
      background: "rgb(var(--color-background) / <alpha-value>)",
      success: "rgb(var(--color-success) / <alpha-value>)",
      warning: "rgb(var(--color-warning) / <alpha-value>)",
      error: "rgb(var(--color-error) / <alpha-value>)",
    },
    borderRadius: {
      xs: "var(--radius-xs)",
      sm: "var(--radius-sm)",
      md: "var(--radius-md)",
      lg: "var(--radius-lg)",
      full: "var(--radius-full)"
    },
    boxShadow: {
      lvl0: "var(--shadow-0)",
      lvl1: "var(--shadow-1)",
      lvl2: "var(--shadow-2)",
      lvl3: "var(--shadow-3)",
      lvl4: "var(--shadow-4)"
    },
    fontSize: {
      base: "var(--font-size-base)",
      lg: "var(--font-size-lg)",
      xl: "var(--font-size-xl)",
      "2xl": "var(--font-size-2xl)"
    }
  },
}

🧱 3. FIREBASE STRUCTURE (Global + User Themes)
Firestore Collections
1. Global Theme (app-wide)
themes/global


Document:

{
  primary: "24 79 255",
  secondary: "255 114 94",
  accent: "26 188 156",
  surface: "255 255 255",
  background: "250 250 250",
  shadowLevel: 2,
  radiusLevel: "md",
  fontScale: "base"
}

2. User Theme (optional personalization)
users/{uid}/themes/custom


Document:

{
  activeTheme: "dark",
  custom: {
    primary: "150 100 255",
    accent: "255 200 120",
    radiusLevel: "lg"
  }
}

🧩 4. ANGULAR THEME SERVICE (Signals + Firestore)

Create file: theme.service.ts

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeDoc = doc(this.firestore, 'themes/global');
  theme = signal<ThemeConfig | null>(null);

  constructor(private firestore: Firestore) {
    this.loadTheme();
  }

  loadTheme() {
    docData(this.themeDoc).subscribe((data) => {
      this.theme.set(data as ThemeConfig);
      this.applyToCSS(data);
    });
  }

  applyToCSS(theme: ThemeConfig) {
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === "string") {
        document.documentElement.style.setProperty(`--color-${key}`, value);
      }
    });
  }

  updateTheme(partial: Partial<ThemeConfig>) {
    updateDoc(this.themeDoc, partial);
  }
}

🎛️ 5. THEME MANAGER COMPONENT (Angular + Tailwind Ready To Paste)

Generate component:

ng g c settings/theme-manager

Paste this in theme-manager.component.html:

<div class="p-6 space-y-6">
  <h2 class="text-xl font-semibold">Theme Customization</h2>

  <div class="grid grid-cols-2 gap-4">
    <!-- Primary -->
    <div>
      <label class="block text-sm mb-1">Primary Color</label>
      <input type="color" (input)="update('primary', $any($event.target).value)"
        class="w-full h-10 rounded-md border" />
    </div>

    <!-- Accent -->
    <div>
      <label class="block text-sm mb-1">Accent Color</label>
      <input type="color" (input)="update('accent', $any($event.target).value)"
        class="w-full h-10 rounded-md border" />
    </div>

    <!-- Radius -->
    <div>
      <label class="block text-sm mb-1">Border Radius</label>
      <select (change)="update('radiusLevel', $any($event.target).value)"
        class="w-full p-2 border rounded-md">
        <option value="sm">Small</option>
        <option value="md">Medium</option>
        <option value="lg">Large</option>
      </select>
    </div>

    <!-- Shadows -->
    <div>
      <label class="block text-sm mb-1">Shadow Level</label>
      <input type="range" min="0" max="4"
        (change)="update('shadowLevel', $any($event.target).value)"
        class="w-full" />
    </div>
  </div>

  <button class="bg-primary text-white rounded-md px-4 py-2 shadow-lvl2">
    Save Theme
  </button>
</div>


Component TS:

@Component({
  selector: 'app-theme-manager',
  templateUrl: './theme-manager.component.html',
})
export class ThemeManagerComponent {
  constructor(private themeService: ThemeService) {}

  update(key: string, value: string) {
    this.themeService.updateTheme({ [key]: value });
  }
}

🖥️ 6. SETTINGS PAGE UI STRUCTURE

Create page:

/settings

Sections:
1️⃣ Appearance / Theme
2️⃣ Layout Options
3️⃣ Product Card Styling
4️⃣ Navbar + Footer Styling
5️⃣ Typography Scale
6️⃣ Dark / Light / Custom toggle

Use a sidebar layout like:

Settings
 ├── Appearance
 ├── Components
 ├── Layout
 ├── Typography
 └── Advanced

🎯 7. NEXT STEP — Apply this to your website (Amarka)

Your current site:

👉 https://amarka-d237b.web.app/

Is clean but not yet premium and not theme-driven.

To build a page like PersonalisedFavours:

We should add:
✅ A premium category page template
✅ A product grid with theme-aware cards
✅ Breadcrumb navigation
✅ Filter bar with theme colors
✅ Category banner hero section
✅ Better spacing + shadow + radius
✅ Theme-based buttons + badges
✅ Mobile bottom sticky filter bar
✅ Product quick-view modal
🎉 If you want, I can now generate:
➡️ The full CATEGORY PAGE redesign (premium e-commerce)
➡️ The PRODUCT CARD Angular component (theme-aware)
➡️ The FILTER BAR component
➡️ The HERO banner component
➡️ Full page wireframe + Tailwind code

Just tell me: