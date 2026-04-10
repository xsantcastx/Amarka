#!/usr/bin/env bash
# AMK-57: Image Optimization Build Script
# Converts source images to WebP at 3 widths + generates LQIP placeholders.
#
# Usage: ./optimize-images.sh [source_dir] [output_dir]
#   source_dir: Directory containing original images (default: src/assets/images/originals)
#   output_dir: Directory for processed images (default: src/assets/images)
#
# Requirements:
#   - cwebp (Google WebP tools): brew install webp
#   - ImageMagick (for resize + LQIP): brew install imagemagick
#
# Output per image (e.g., hero-lobby.jpg):
#   hero-lobby-400w.webp
#   hero-lobby-400w.jpg
#   hero-lobby-800w.webp
#   hero-lobby-800w.jpg
#   hero-lobby-1200w.webp
#   hero-lobby-1200w.jpg
#   hero-lobby-lqip.jpg  (20px wide, for blur-up placeholder)

set -euo pipefail

SOURCE_DIR="${1:-src/assets/images/originals}"
OUTPUT_DIR="${2:-src/assets/images}"
WIDTHS=(400 800 1200)
LQIP_WIDTH=20
WEBP_QUALITY=82
JPEG_QUALITY=85

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No color

echo "============================================"
echo "AMK-57: Image Optimization Build Script"
echo "============================================"
echo ""

# Check dependencies
check_dep() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}ERROR: $1 is not installed.${NC}"
    echo "  Install with: $2"
    exit 1
  fi
}

check_dep "cwebp" "brew install webp"
check_dep "convert" "brew install imagemagick"

# Validate source directory
if [ ! -d "$SOURCE_DIR" ]; then
  echo -e "${YELLOW}Source directory not found: $SOURCE_DIR${NC}"
  echo "Create it and add your original high-resolution images."
  echo ""
  echo "Expected structure:"
  echo "  $SOURCE_DIR/"
  echo "    hero-lobby.jpg"
  echo "    portfolio-signage.jpg"
  echo "    ..."
  exit 0
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Count source images
IMAGES=$(find "$SOURCE_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | sort)
IMAGE_COUNT=$(echo "$IMAGES" | grep -c . || true)

if [ "$IMAGE_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}No images found in $SOURCE_DIR${NC}"
  exit 0
fi

echo "Found $IMAGE_COUNT source images in $SOURCE_DIR"
echo "Output directory: $OUTPUT_DIR"
echo ""

PROCESSED=0
ERRORS=0

while IFS= read -r img; do
  BASENAME=$(basename "$img")
  NAME="${BASENAME%.*}"

  echo -e "${GREEN}Processing: $BASENAME${NC}"

  for WIDTH in "${WIDTHS[@]}"; do
    # Resize to JPEG
    JPEG_OUT="$OUTPUT_DIR/${NAME}-${WIDTH}w.jpg"
    if convert "$img" -resize "${WIDTH}x>" -quality "$JPEG_QUALITY" -strip "$JPEG_OUT" 2>/dev/null; then
      echo "  ✓ ${NAME}-${WIDTH}w.jpg"
    else
      echo -e "  ${RED}✗ Failed: ${NAME}-${WIDTH}w.jpg${NC}"
      ((ERRORS++))
      continue
    fi

    # Convert to WebP
    WEBP_OUT="$OUTPUT_DIR/${NAME}-${WIDTH}w.webp"
    if cwebp -q "$WEBP_QUALITY" -quiet "$JPEG_OUT" -o "$WEBP_OUT" 2>/dev/null; then
      echo "  ✓ ${NAME}-${WIDTH}w.webp"
    else
      echo -e "  ${RED}✗ Failed: ${NAME}-${WIDTH}w.webp${NC}"
      ((ERRORS++))
    fi
  done

  # Generate LQIP (20px wide, heavily compressed)
  LQIP_OUT="$OUTPUT_DIR/${NAME}-lqip.jpg"
  if convert "$img" -resize "${LQIP_WIDTH}x>" -quality 30 -strip "$LQIP_OUT" 2>/dev/null; then
    LQIP_SIZE=$(wc -c < "$LQIP_OUT" | tr -d ' ')
    echo "  ✓ ${NAME}-lqip.jpg (${LQIP_SIZE} bytes)"
  else
    echo -e "  ${RED}✗ Failed: ${NAME}-lqip.jpg${NC}"
    ((ERRORS++))
  fi

  ((PROCESSED++))
  echo ""
done <<< "$IMAGES"

echo "============================================"
echo "Done: $PROCESSED images processed, $ERRORS errors"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}Some images failed to process. Check the errors above.${NC}"
  exit 1
fi

# Size comparison
ORIG_SIZE=$(du -sh "$SOURCE_DIR" 2>/dev/null | cut -f1)
OUT_SIZE=$(du -sh "$OUTPUT_DIR" 2>/dev/null | cut -f1)
echo "Original directory size: $ORIG_SIZE"
echo "Output directory size:   $OUT_SIZE"
echo ""
echo "WebP typically achieves ~60% size reduction over JPEG."
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Verify images render correctly in the browser"
echo "  2. Update component references to use basePath (without extension)"
echo "  3. Run ng build to verify no missing assets"
echo "  4. Test with Lighthouse for LCP and CLS scores"
