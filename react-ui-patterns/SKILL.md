# React UI Patterns

Touch-aware tooltips, address/hash display with truncation, and editable inputs.

## Dependencies

```bash
bun add @floating-ui/react-dom
```

## Components

### Tooltip System

**Tooltip** — Accessible tooltip with smart positioning using Floating UI. Handles desktop hover and touch tap differently.
→ `components/Tooltip.tsx`

**TooltipLink** — Touch-aware link: hover shows tooltip on desktop, first tap shows tooltip on touch, second tap navigates.
→ `components/TooltipLink.tsx`

### Display Components

**AddressDisplay** — Address with truncation, tooltip showing full value, copy button, optional navigation link.
→ `components/AddressDisplay.tsx`

**OutPoint** — OutPoint (txHash:index) display with truncation, tooltip, and copy button.
→ `components/OutPoint.tsx`

### Input Components

**TruncatedInput** — Input that shows truncated value when blurred, full value when focused. Smart cursor positioning on click.
→ `components/TruncatedInput.tsx`

### Utilities

**format.ts** — Pure functions: `truncateHex()`, `truncateAddress()`, `formatCkb()`, `formatRelativeTime()`, `formatBytes()`, validators.
→ `components/format.ts`

## Key Patterns

**Touch device detection:**
```typescript
const isTouchDevice = () =>
	typeof window !== 'undefined' &&
	!window.matchMedia('(hover: hover)').matches;
```

**Touch-aware navigation:** Desktop: hover → tooltip, click → navigate. Touch: first tap → tooltip, second tap → navigate.

**Truncation:** `truncateAddress("ckb1qzda...", 8, 4)` → `"ckb1qzda...xwsq"`

## Common Patterns

### Dynamic Copyright Footer

Auto-updating year range:
```typescript
const currentYear = new Date().getFullYear();
const startYear = 2025;
<footer>© {currentYear === startYear ? startYear : `${startYear}-${currentYear}`} Company</footer>
```

### Theme Context with System Detection

Three-state theme (light/dark/auto) with OS preference detection:
```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
prefersDark.addEventListener('change', (e) => {
	if (themeMode === 'auto') setActualTheme(e.matches ? 'dark' : 'light');
});
document.documentElement.classList.toggle('dark', isDark);
```

Store user choice in localStorage: `'light' | 'dark' | 'auto'`. When `'auto'`, follow OS preference.
