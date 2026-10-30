# Divergents dimensional illustrations

Created 2026-10-07 for the user-authorized direct implementation of dimensional, cheerful app details. Liven informed the broad illustration role; these are original generated compositions, not extracted or copied Liven graphics. The parent explicitly supplied the asset briefs and authorized proceeding without a separate mockup/spec.

All three assets were generated with the built-in `image_gen` tool, in separate calls with `transparent_background: true`. No API fallback, external reference images, text, logos, green, gold, or warm accent colors were used. The requested palette is Divergents navy `#234088`, blue `#3D5BDB`, periwinkle `#8AA0FF`, white and neutral silver. Raster lighting naturally produces intermediate shades.

| Shipping asset | Size | Intended display | Exact prompt |
| --- | --- | --- | --- |
| `achievement-trophy.png` | 512 × 512 RGBA PNG | approximately 180 × 180 pt completion/achievement header | `achievement-trophy.prompt.txt` |
| `learning-book.png` | 512 × 512 RGBA PNG | approximately 96–140 pt learning daily-header artwork | `learning-book.prompt.txt` |
| `companion-orb.png` | 256 × 256 RGBA PNG | approximately 96 pt AI introduction and 32 pt chat indicator | `companion-orb.prompt.txt` |

The corresponding prompt text is also embedded in each shipping PNG with Impeccable `embed-prompt`. Only the original generated image was resized, using the already installed macOS `sips`; alpha was preserved without background removal, chroma-keying, recoloring, or flattening. No source code was modified by the asset producer.

## Source originals

Original files remain in the built-in image generator's storage:

- Trophy: `/Users/xaknazar/.codex/generated_images/01a116f4-33e7-77c0-b89e-cc9cc83e252d/exec-7ddedc44-8554-413b-a617-1e36bfb83a68.png`
- Book: `/Users/xaknazar/.codex/generated_images/01a116f4-33e7-77c0-b89e-cc9cc83e252d/exec-947ed4e9-3d79-4e6f-9948-4700fab37444.png`
- Orb: `/Users/xaknazar/.codex/generated_images/01a116f4-33e7-77c0-b89e-cc9cc83e252d/exec-f40eb7c0-8517-461b-b4c0-a993534ad343.png`

## Inspection

All three shipping PNGs have a real alpha channel with completely transparent exterior pixels and antialiased edges. The native output has most interior alpha around 252–253/255; it was deliberately preserved rather than forced opaque. Composite inspection confirmed the white page surfaces stay visibly solid, trophy handle holes stay transparent, and highlights remain legible on both light and dark grounds.

`transparency-proof.png` is a diagnostic composition only: trophy, book, orb left to right; white above, deep navy `#111B37` below. It is not a shipping UI asset. The shipping PNGs were not changed by this check.

| Asset | Fully transparent pixels | Fully opaque pixels | Other alpha pixels |
| --- | ---: | ---: | ---: |
| Trophy | 145,697 | 1,807 | 114,640 |
| Book | 156,362 | 962 | 104,820 |
| Orb | 27,552 | 490 | 37,494 |

Visual status: accepted; Impeccable numerical plate score: unscored. Native screen integration, actual point-size review and any motion/accessibility behavior remain the integrating agent's responsibility.
