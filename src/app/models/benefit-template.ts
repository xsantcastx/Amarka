/**
 * Benefit Template Model
 * Represents a reusable benefit template that can be applied to products
 */
export interface BenefitTemplate {
  id?: string;
  
  // Template Info
  name: string;              // Template name (for admin reference)
  category: string;          // Product category slug (matches Category.slug from database)
  
  // Benefit Data (what gets added to products)
  icon: 'performance' | 'efficiency' | 'reliability' | 'support' | 'quality' | 'security' | 'warranty' | 'design' | 'value';
  iconColor: string;         // Tailwind color class. Brand Bible: prefer 'amarka-gold', 'amarka-text', 'amarka-text-secondary'.
                             // Legacy 'bitcoin-orange' / 'bitcoin-gold' still accepted (remapped to #906030 amarka-gold via tailwind.config.js per AMK-80).
  title: string;             // Benefit title (displayed on product page)
  description: string;       // Benefit description (displayed on product page)
  
  // Meta
  isActive: boolean;         // Show in product admin?
  order: number;             // Display order in template picker
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Icon type options for templates
 */
export const BENEFIT_ICON_TYPES = [
  'performance',
  'efficiency',
  'reliability',
  'support',
  'quality',
  'security',
  'warranty',
  'design',
  'value'
] as const;

/**
 * Color options for icons (Brand Bible 6-token aligned, AMK-80).
 *
 * Brand Bible 6-token palette is preferred for new templates. Semantic state
 * colors (success / info / warning / error) are kept for functional UX where
 * meaning carries more weight than brand consistency. Legacy `bitcoin-orange`
 * and `bitcoin-gold` values remain accepted by existing templates — Tailwind
 * config now aliases them to `#906030` (amarka-gold) so they render on-brand.
 */
export const BENEFIT_ICON_COLORS = [
  // Brand Bible canonical
  { value: 'amarka-gold', label: 'Amarka Gold', preview: '#906030' },
  { value: 'amarka-text', label: 'Amarka Light', preview: '#f0f0f0' },
  { value: 'amarka-text-secondary', label: 'Amarka Silver', preview: '#c0c0c0' },
  // Semantic state colors (functional, not brand)
  { value: 'green-500', label: 'Success', preview: '#22c55e' },
  { value: 'blue-500', label: 'Info', preview: '#3b82f6' },
  { value: 'yellow-500', label: 'Warning', preview: '#eab308' },
  { value: 'red-500', label: 'Error', preview: '#ef4444' },
  { value: 'cyan-500', label: 'Highlight', preview: '#06b6d4' },
  { value: 'purple-500', label: 'Premium', preview: '#a855f7' },
  { value: 'pink-500', label: 'Featured', preview: '#ec4899' },
  // Legacy template residue — rendered on-brand via tailwind alias (do not
  // pick for new templates; preview reflects the remapped Brand Bible value).
  { value: 'bitcoin-orange', label: 'Legacy (Amarka Gold)', preview: '#906030' },
  { value: 'bitcoin-gold', label: 'Legacy (Amarka Gold)', preview: '#906030' },
] as const;
