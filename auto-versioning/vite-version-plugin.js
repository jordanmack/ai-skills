/**
 * Vite plugin to auto-increment patch version on build and hot reload.
 *
 * Usage in vite.config.ts:
 *
 *   import updateVersionPlugin from './vite-version-plugin.js';
 *
 *   export default defineConfig({
 *     plugins: [react(), updateVersionPlugin()],
 *   });
 *
 * Access version in app:
 *
 *   import packageJson from '../package.json';
 *   console.log(packageJson.version);
 *
 * Or use Vite define:
 *
 *   define: { __APP_VERSION__: JSON.stringify(packageJson.version) }
 *
 * Notes:
 * - Increments on every build and hot reload
 * - Only patch version (x.y.Z) is incremented
 * - For production, consider filtering to production builds only
 */

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
