---
name: MediCare Clinic OS
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f4850'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#0051d5'
  on-tertiary: '#ffffff'
  tertiary-container: '#316bf3'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: plusJakartaSans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: plusJakartaSans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: plusJakartaSans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: plusJakartaSans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: plusJakartaSans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: plusJakartaSans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-mono:
    fontFamily: inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  gutter-mobile: 1rem
  gutter-tablet: 1.25rem
  gutter-desktop: 1.5rem
  margin-mobile: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
---

## Brand & Style

This design system embodies a modern, clinical, and authoritative ethos engineered specifically for high-acuity clinical workflows, medical practice management, and patient care coordination. The visual language strikes a balance between institutional reliability and contemporary SaaS clarity.

The target audience comprises clinic administrators, physicians, triage nurses, and medical receptionists who navigate dense medical charts, multi-provider appointment schedules, and electronic health records (EHR) under intense time pressure.

The UI avoids cold sterility and chaotic consumer-grade playfulness. It evokes calm precision, ergonomic focus, and uncompromising diagnostic clarity. The design movement combines Modern Clinical Corporate with Soft Ergonomic Functionalism: pure whites, muted slate backdrops, micro-level information density, crisp outlines, and high-trust medical blue and teal accents that intuitively guide clinical decisions without inducing alert fatigue.

## Colors

The color system is optimized for prolonged screen exposure in medical environments, meeting strict WCAG 2.1 AA and AAA contrast guidelines.

- **Primary Canvas & Surfaces**: Base application canvas rests on `#F8FAFC` (Slate 50), transitioning to `#FFFFFF` for primary cards, tables, and modal sheets. Inset containers, table headers, and disabled panel regions utilize `#F1F5F9` (Slate 100).
- **Brand & Action (Primary)**: Medical Blue (`#0284C7`, hover `#0369A1`, active `#075985`) drives primary interactive elements, primary CTAs, active tab strokes, and navigation anchors.
- **Clinical & Diagnostic (Secondary)**: Clinical Teal (`#0D9488`, light tint `#CCFBF1`, hover `#0F766E`) serves as the validation and specialty operational accent—ideal for triage indicators, vitals logs, and verified medical statuses.
- **System & Utility (Tertiary)**: Deep Royal (`#2563EB`) anchors acute administrative and technical tasks, audit logs, and provider scheduling blocks.
- **Text & Hierarchy**: Primary copy uses deep slate `#0F172A` (Slate 900) for sharp readability against white cards. Secondary labels and helper text use `#334155` (Slate 700) and `#64748B` (Slate 500). Borders rely on `#E2E8F0` (Slate 200).
- **Status & Alerts**:
  - Critical/Emergency: `#DC2626` (Red 600) with `#FEF2F2` (Red 50) fill.
  - Warning/Pending: `#D97706` (Amber 600) with `#FFFBEB` (Amber 50) fill.
  - Stable/Completed: `#0D9488` (Teal 600) or `#16A34A` (Green 600) with matching pastel flood fills.

## Typography

Typography prioritizes rapid scannability, structural hierarchy, and diagnostic accuracy.

- **Headings (Plus Jakarta Sans)**: Used exclusively for view titles, patient chart summaries, modal headers, and key clinical section banners. Its geometric, open counters offer warmth while maintaining modern architectural discipline.
- **Body & Data (Inter)**: Handles clinical chart notes, vital sign tables, prescriptions, lab values, and EHR data. Inter's tall x-height and unambiguous glyph distinctions (such as uppercase `I`, numeral `1`, and lowercase `l`) safeguard against medical transcription errors.
- **Tabular Numerics**: All numeric values in patient metrics, dosages, lab reports, and monetary balances must use `font-feature-settings: "tnum"` (tabular lining figures) to guarantee vertical alignment in high-density schedules and diagnostic tables.

## Layout & Spacing

The layout is built on an 8pt base grid with a 4pt micro-grid for compact clinical components such as dosage steppers, badge tags, and calendar appointment chips.

- **Grid Architecture**:
  - **Desktop (≥ 1280px)**: 12-column fluid grid, 24px gutters, max layout container of 1600px with fixed 260px left clinical navigation rail and optional 340px right contextual drawer (patient mini-chart, rapid triage panel).
  - **Tablet / Clinical Workstation (768px - 1279px)**: 8-column grid with 20px gutters. The primary navigation rail collapses into a 72px icon-only rail. Secondary panels convert to slide-over drawers.
  - **Mobile (≤ 767px)**: 4-column grid with 16px gutters and margins. Navigation collapses to a sticky bottom action bar. Complex medical tables switch to grouped card listings.
- **Density Controls**: Data-dense environments (e.g., electronic medication administration records, patient registries) use compact 36px table row heights, while patient overview cards maintain a comfortable 48px to 64px rhythm.

## Elevation & Depth

Visual hierarchy leverages crisp border containment combined with atmospheric, low-saturation slate shadows. This ensures surfaces feel clean and distinct on ambient hospital monitors and sunlight-exposed exam rooms.

- **Level 0 (Flat Canvas)**: `#F8FAFC` base page background without shadow.
- **Level 1 (Card & Module Layer)**: `#FFFFFF` surface enclosed by a 1px solid `#E2E8F0` border, resting on a subtle shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Hovered Cards, Dropdowns, Popovers)**: `#FFFFFF` surface, 1px solid `#CBD5E1` border, backed by: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Level 3 (Modals, Clinical Flyouts, Drawers)**: `#FFFFFF` floating modal container, 1px solid `#E2E8F0`, with high-def depth: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`. Backdrops use `rgba(15, 23, 42, 0.4)` paired with a `backdrop-blur-sm` (4px).
- **Focus Rings & States**: High-visibility focus ring applying a 2px outer offset of `#FFFFFF` and a 2px stroke of `#0284C7`. Never rely on color alone; critical alerts combine a tinted border stroke with an explicit status badge icon.

## Shapes

The design system employs a refined rounded language that softens clinical tension without compromising enterprise density.

- **Base Inputs & Controls (`rounded-lg` / 8px - 10px)**: Buttons, text fields, dropdown selectors, badge counters, and search inputs adopt 8px corners. This ensures snug vertical stacking in dense data forms.
- **Cards & Data Modules (`rounded-xl` / 12px - 16px)**: Patient summary panels, vitals charts, calendar day cells, and diagnostic image containers use 16px radii, establishing clear structural containment.
- **Floating Modals & Sheets (`rounded-2xl` / 20px - 24px)**: Patient intake dialogs and multi-step prescription modals feature 20px-24px rounded caps, separating modal interactions from underlying grid modules.
- **Pills & Indicator Badges (`rounded-full`)**: Triage level pills (e.g., Triage I - Resuscitation, Stable, Scheduled) and patient avatar wrappers utilize full circular radii for instantaneous visual scanning.

## Components

### Buttons
- **Primary**: Solid `#0284C7` background, white text, 8px radius, height 40px (default) or 32px (compact grid). Hover: `#0369A1`. Focus: 2px ring offset `#0284C7`.
- **Secondary / Subtle**: `#FFFFFF` background, 1px solid `#CBD5E1`, text `#334155`. Hover: `#F1F5F9`, border `#94A3B8`.
- **Clinical Accent (Teal)**: `#0D9488` background, white text, used for confirming vitals, verifying prescriptions, or initiating telehealth visits.
- **Destructive**: `#FEF2F2` background, 1px solid `#FCA5A5`, text `#DC2626`. Hover: `#DC2626` background with `#FFFFFF` text.

### Chips & Badges
- **Patient Status**: 24px height, full rounded pill, 11px semi-bold uppercase label.
  - Active: `#E0F2FE` background, `#0369A1` text, 6px solid `#0284C7` leading dot.
  - Urgent/Allergy Alert: `#FEE2E2` background, `#B91C1C` text, warning triangle icon.
  - Triage/Verified: `#CCFBF1` background, `#0F766E` text, checkmark icon.

### Form Inputs & Selects
- **Default State**: `#FFFFFF` surface, 1px solid `#CBD5E1`, 8px radius, 40px height, 14px text in `#0F172A`. Placeholder in `#94A3B8`.
- **Active / Focus**: Border color transitions to `#0284C7` with a 3px soft outer ring of `rgba(2, 132, 199, 0.15)`.
- **Validation Error**: Border changes to `#DC2626` with a 3px ring of `rgba(220, 38, 38, 0.15)` and an inline error message accompanied by an alert circle icon.

### Selection Controls (Checkboxes & Radios)
- Checkboxes: 18x18px, 4px radius. Unchecked: `#FFFFFF` fill with `#CBD5E1` border. Checked: `#0284C7` fill with white checkmark icon.
- Radios: 18x18px, circular. Selected state features `#0284C7` outer ring with a centered 8px solid `#0284C7` dot.

### Cards & Clinical Containers
- Composed of `#FFFFFF` fill, 1px border `#E2E8F0`, 16px radius, and Level 1 elevation.
- Dividers between card sections use 1px solid `#F1F5F9`. Card headers feature an optional clinical icon badge, title in `headline-sm`, and action buttons aligned right.

### Specialized Clinic Components
- **Patient Header Bar**: A sticky horizontal strip showing patient name, MRN (Medical Record Number) in tabular mono, DOB/Age, Blood Type badge, and prominent allergy alert tags.
- **Vitals Metric Tile**: Compact card with bold numeric readouts (e.g., `120/80` mmHg), trend arrow indicator (stable, elevating, dropping), and subtle sparkline graph.
- **Provider Schedule Timeline**: Color-coded time blocks (Consultation `#E0F2FE`, Procedure `#CCFBF1`, Follow-up `#F1F5F9`) with 15-minute slot snapping and multi-physician column views.