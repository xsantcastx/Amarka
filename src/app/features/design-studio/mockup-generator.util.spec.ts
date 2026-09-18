import { generateMockupFile } from './mockup-generator.util';
import { ProductTemplate, ProductView } from './product-catalog.types';
import { StudioLogo } from './studio-project.types';

describe('Mockup export', () => {
  it('rejects a missing logo instead of sending a blank product preview', async () => {
    const view = { id: 'front', silhouette: 'shirt-front' } as ProductView;
    const logo = { viewId: 'front', previewUrl: 'data:image/png;base64,broken', zIndex: 0 } as StudioLogo;
    await expectAsync(generateMockupFile({ slug: 'shirt' } as ProductTemplate, view, '#000000', [logo])).toBeRejected();
  });
});
