# Lab Incident Design System

## Design direction

Lab Incident ใช้ภาษาภาพแบบ **Clinical Command Center** สำหรับงานกำกับความเสี่ยงในโรงพยาบาล โดยเน้นความน่าเชื่อถือ ความเร็วในการอ่าน และลำดับความสำคัญที่ชัดเจนมากกว่าการตกแต่งที่ฉูดฉาด

## Color tokens

| Token | Value | Usage |
|---|---|---|
| Maroon 900 | `#4A0E18` | Hero, navigation anchor, highest emphasis |
| Maroon 700 | `#800000` | Primary action, active state, brand anchor |
| Maroon 500 | `#A52A2A` | Hover, secondary emphasis, charts |
| Canvas | `#F7F5F2` | Application background |
| Surface | `#FFFFFF` | Cards, panels, forms |
| Text | `#241F20` | Primary text |
| Muted | `#716A6A` | Metadata and supporting text |
| Success | `#167C5A` | Saved, verified, healthy |
| Warning | `#B7791F` | Pending, attention, SLA warning |
| Danger | `#C53030` | Error, deletion, critical risk |

Status colors must retain semantic meaning. Maroon is the brand color and must not be used for every status; use green for success, amber for attention, blue for in-review, and red only for danger or critical states.

## Shape and elevation

| Element | Rule |
|---|---|
| Main card | 22px radius |
| Modal | 24px radius |
| Input and button | 12px radius |
| Compact control | 10px radius |
| Badge | 999px radius |
| Standard shadow | `0 8px 24px rgba(15, 35, 50, .05)` |

Cards use a white surface on the warm canvas. Elevation is restrained; hover elevation is reserved for interactive cards.

## Spacing

Use the 8pt rhythm: **8 / 16 / 24 / 32 / 40 / 48 / 64px**. Compact controls may use 4px internal adjustments, but page-level spacing should remain on the rhythm.

## Typography

Use **IBM Plex Sans Thai** for interface text and **IBM Plex Mono** only for Incident IDs, timestamps, build references, and technical metadata. Use bold, high-contrast headings; supporting text should not fall below a readable contrast level. Metadata may be smaller, but must remain legible on the warm canvas.

## Interaction rules

Primary actions use Maroon 700 and are visually dominant. Every interactive control has hover and focus-visible states. Keyboard focus uses a visible maroon ring. Motion is limited to 150–200ms and respects `prefers-reduced-motion`. Loading states should mirror the shape of the content they replace rather than using generic bars.

## Responsive rules

Desktop layouts target 1280px and 1440px content widths with a stable sidebar and max-width workspace. Mobile uses bottom navigation, a floating new-record action, and stacked cards. Tables should preserve readable row height and expose details through a focused case view rather than forcing dense horizontal scrolling.

## Implementation

The source of truth for tokens is `src/index.css` under `@theme` and `@layer base`. Shared patterns include `.primary-button`, `.icon-button`, `.quick-action`, `.status-live`, `.skeleton`, and the radius utilities. New components should use these tokens rather than introducing new hex values or one-off radius values.
