import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase configuration (set your Amarka project before running)
const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'your-amarka-project.firebaseapp.com',
  projectId: 'your-amarka-project',
  storageBucket: 'your-amarka-project.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:placeholder',
  measurementId: 'G-XXXXXXXXXX'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

interface Template {
  type: 'description' | 'seoTitle' | 'seoMeta' | 'specs';
  scope: 'material' | 'category' | 'family' | 'global';
  refId?: string;
  language: 'es' | 'en' | 'fr' | 'it';
  content?: string;
  specDefaults?: any;
  fields?: string[];
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

const defaultTemplates: Omit<Template, 'createdAt' | 'updatedAt'>[] = [
  // ===== GLOBAL DESCRIPTION TEMPLATES =====
  {
    type: 'description',
    scope: 'global',
    language: 'en',
    content: `Meet the {name}: a personalised {category} crafted in {material} and finished for gifting.

Highlights:
- Size: {size}
- Personalisation: Custom text or monogram
- Finish: Premium gift-ready packaging

Designed for milestones and memorable moments, the {name} feels intentional, warm, and lasting.`,
    fields: ['name', 'material', 'size', 'category'],
    active: true
  },
  {
    type: 'description',
    scope: 'global',
    language: 'es',
    content: `Conoce el {name}: un {category} personalizado en {material}, listo para regalar.

Destacados:
- Tamaño: {size}
- Personalizacion: Texto o iniciales
- Acabado: Empaque premium para regalo

Pensado para momentos especiales, el {name} se siente intencional, cercano y duradero.`,
    fields: ['name', 'material', 'size', 'category'],
    active: true
  },

  // ===== GLOBAL SEO TITLE TEMPLATES =====
  {
    type: 'seoTitle',
    scope: 'global',
    language: 'en',
    content: '{name} personalised {category} gift | Amarka',
    fields: ['name', 'category'],
    active: true
  },
  {
    type: 'seoTitle',
    scope: 'global',
    language: 'es',
    content: '{name} regalo personalizado {category} | Amarka',
    fields: ['name', 'category'],
    active: true
  },

  // ===== GLOBAL SEO META TEMPLATES =====
  {
    type: 'seoMeta',
    scope: 'global',
    language: 'en',
    content: 'Shop the {name} personalised {category} in {material}. Custom engraving, premium finishes, and gift-ready packaging by Amarka.',
    fields: ['name', 'material', 'category'],
    active: true
  },
  {
    type: 'seoMeta',
    scope: 'global',
    language: 'es',
    content: 'Compra el {name} personalizado de {category} en {material}. Grabado personalizado, acabados premium y empaque listo para regalo con Amarka.',
    fields: ['name', 'material', 'category'],
    active: true
  }
];

async function seedTemplates() {
  console.log('Starting template seeding...\n');

  try {
    const templatesCollection = collection(firestore, 'templates');
    const now = Timestamp.now();

    for (const template of defaultTemplates) {
      const data = {
        ...template,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(templatesCollection, data);
      console.log(`Created ${template.type} template (${template.scope}, ${template.language}): ${docRef.id}`);
    }

    console.log(`\nSuccessfully created ${defaultTemplates.length} templates!`);
    console.log('\nTemplate Summary:');
    console.log('   - Description templates: 2 (global)');
    console.log('   - SEO Title templates: 2 (global)');
    console.log('   - SEO Meta templates: 2 (global)');
    console.log('   - Languages: English & Spanish');
    console.log('\nAuto-fill is now ready to use!');

  } catch (error) {
    console.error('Error seeding templates:', error);
    throw error;
  }
}

// Run the seeder
seedTemplates()
  .then(() => {
    console.log('\nTemplate seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTemplate seeding failed:', error);
    process.exit(1);
  });
