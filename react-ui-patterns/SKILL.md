# React UI Patterns

Touch-aware tooltips, address/hash display with truncation, and editable inputs for blockchain applications.

## When to Use

When building React applications that need:
- Tooltips that work on both desktop and touch devices
- Truncated display of long hex strings (addresses, hashes, outpoints)
- Copy-to-clipboard functionality
- Editable inputs that show truncated values when blurred

## Dependencies

```bash
npm install @floating-ui/react-dom
```

## Components

### Tooltip System

Core tooltip with smart positioning and touch-aware behavior.

- [Tooltip.tsx](Tooltip.tsx) - Base tooltip component using Floating UI
- [TooltipLink.tsx](TooltipLink.tsx) - Touch-aware link: first tap shows tooltip, second tap navigates

### Address/Hash Display

Components for displaying truncated blockchain values with tooltips and copy buttons.

- [AddressDisplay.tsx](AddressDisplay.tsx) - Address with truncation, tooltip, copy, optional navigation
- [OutPoint.tsx](OutPoint.tsx) - OutPoint (txHash:index) display

### Formatting Utilities

Pure functions for formatting blockchain values.

- [format.ts](format.ts) - `truncateHex()`, `truncateAddress()`, `formatCkb()`, epoch formatting, etc.

### Editable Input

Input that shows truncated value when blurred, full value when focused.

- [TruncatedInput.tsx](TruncatedInput.tsx) - Focus-aware truncated input

## Key Patterns

**Touch device detection:**
```typescript
const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  !window.matchMedia('(hover: hover)').matches;
```

**Touch-aware navigation:**
- Desktop: hover shows tooltip, click navigates
- Touch: first tap shows tooltip, second tap navigates

**Truncation:**
```typescript
// Address: prefix...suffix
truncateAddress("ckb1qzda...", 8, 4) // "ckb1qzda...xwsq"

// Hex: 0x + prefix...suffix
truncateHex("0x1234...", 8, 8) // "0x12345678...12345678"
```

## Common Patterns

### Dynamic Copyright Footer

Auto-updating year range that never needs manual updates:

```typescript
// React
const currentYear = new Date().getFullYear();
const startYear = 2025;
// Shows "2025" if current year, otherwise "2025-{currentYear}"
<footer>© {currentYear === startYear ? startYear : `${startYear}-${currentYear}`} Company</footer>
```

```javascript
// Vanilla JS
<span id="year"></span>
document.getElementById('year').textContent = new Date().getFullYear();
```

### Theme Context with System Detection

Three-state theme (light/dark/auto) with OS preference detection:

```typescript
// Detect OS preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

// Listen for OS preference changes
prefersDark.addEventListener('change', (e) => {
  if (themeMode === 'auto') {
    setActualTheme(e.matches ? 'dark' : 'light');
  }
});

// Apply theme: add/remove 'dark' class on document root for Tailwind
document.documentElement.classList.toggle('dark', isDark);
```

Key points:
- Store user choice in localStorage: `'light' | 'dark' | 'auto'`
- When `'auto'`, follow `prefers-color-scheme` media query
- Listen for OS changes to update in real-time
- Reference: `~/ckb-address-map/frontend/src/ThemeContext.tsx`
