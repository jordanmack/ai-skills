# Vite Version Plugin

Auto-increment patch version in package.json on build and hot reload.

## When to Use

When a Vite/React application needs:
- Automatic version bumping during development
- Version tracking for deployments
- Build-triggered version updates

## Implementation

**vite-plugin-update-version.js** - Create in project root:
```javascript
import fs from 'fs';

const packageJsonPath = new URL('./package.json', import.meta.url).pathname;

function updateVersion() {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Increment the patch version
    const versionParts = packageJson.version.split('.');
    versionParts[2] = (parseInt(versionParts[2], 10) + 1).toString();
    packageJson.version = versionParts.join('.');

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

export default function updateVersionPlugin() {
    return {
        name: 'vite-plugin-update-version',
        handleHotUpdate() {
            updateVersion();
        },
        buildStart() {
            updateVersion();
        }
    };
}
```

**vite.config.ts** - Add the plugin:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import updateVersionPlugin from './vite-plugin-update-version.js';

export default defineConfig({
    plugins: [react(), updateVersionPlugin()],
});
```

## Accessing Version in App

```typescript
// Read from package.json at build time
import packageJson from '../package.json';

function App() {
    return <div>Version: {packageJson.version}</div>;
}
```

Or use Vite's define feature in vite.config.ts:
```typescript
import packageJson from './package.json';

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    // ...
});
```

Then in code:
```typescript
declare const __APP_VERSION__: string;
console.log(__APP_VERSION__);
```

## Notes

- Version increments on every build and hot reload
- Only patch version (x.y.Z) is incremented
- For production, consider incrementing only on production builds
