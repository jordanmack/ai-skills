/**
 * Formatting utilities for blockchain values.
 */

/**
 * 1 CKB = 100,000,000 Shannons.
 */
const SHANNONS_PER_CKB = 100_000_000n;

/**
 * Format Shannon amount to CKB string.
 * @param shannons - Amount in shannons.
 * @param decimals - Number of decimal places. If undefined, shows up to 8 with trailing zeros trimmed.
 */
export function formatCkb(shannons: bigint | string, decimals?: number): string {
	const value = typeof shannons === 'string' ? BigInt(shannons) : shannons;
	const whole = value / SHANNONS_PER_CKB;
	const fraction = value % SHANNONS_PER_CKB;

	if (decimals !== undefined) {
		const divisor = 10n ** BigInt(8 - decimals);
		const roundedFraction = (fraction + divisor / 2n) / divisor;
		if (roundedFraction >= 10n ** BigInt(decimals)) {
			return formatNumber(whole + 1n) + '.' + '0'.repeat(decimals) + ' CKB';
		}
		const fractionStr = roundedFraction.toString().padStart(decimals, '0');
		return formatNumber(whole) + '.' + fractionStr + ' CKB';
	}

	if (fraction === 0n) {
		return formatNumber(whole) + ' CKB';
	}

	const fractionStr = fraction.toString().padStart(8, '0').replace(/0+$/, '');
	return formatNumber(whole) + '.' + fractionStr + ' CKB';
}

/**
 * Format a number with thousand separators.
 */
export function formatNumber(num: bigint | number): string {
	return num.toLocaleString('en-US');
}

/**
 * Truncate a hex string for display (e.g., "0x12345678...12345678").
 * @param hex - The hex string to truncate.
 * @param prefixLen - Characters to show at start (after 0x). Default 8.
 * @param suffixLen - Characters to show at end. Default 8.
 */
export function truncateHex(hex: string, prefixLen = 8, suffixLen = 8): string {
	if (hex.length <= prefixLen + suffixLen + 4) {
		return hex;
	}
	const prefix = hex.slice(0, 2 + prefixLen);
	const suffix = hex.slice(-suffixLen);
	return `${prefix}...${suffix}`;
}

/**
 * Truncate a CKB address for display.
 * @param address - The CKB address to truncate.
 * @param prefixLen - Characters to show at start. Default 8.
 * @param suffixLen - Characters to show at end. Default 4.
 */
export function truncateAddress(address: string, prefixLen = 8, suffixLen = 4): string {
	if (address.length <= prefixLen + suffixLen + 3) {
		return address;
	}
	return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

/**
 * Format a Unix timestamp (milliseconds) to a relative time string.
 */
export function formatRelativeTime(timestamp: bigint | number): string {
	const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
	const now = Date.now();
	const diff = now - ts;

	if (diff < 0) return 'just now';

	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

	const days = Math.floor(hours / 24);
	if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`;

	const months = Math.floor(days / 30);
	if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;

	const years = Math.floor(months / 12);
	return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Format a Unix timestamp to an absolute date string (UTC).
 */
export function formatAbsoluteTime(timestamp: bigint | number): string {
	const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
	const date = new Date(ts);
	return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

/**
 * Format byte size to human-readable string (B, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
	if (bytes === 0) return '0 B';
	if (bytes < 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const unitIndex = Math.min(i, units.length - 1);
	const value = bytes / Math.pow(k, unitIndex);

	if (unitIndex === 0) return `${Math.round(value)} ${units[unitIndex]}`;
	return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * Format duration in seconds to human-readable format.
 */
export function formatDuration(seconds: number): string {
	if (seconds < 0) return '0s';

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${secs}s`;
	return `${secs}s`;
}

/**
 * Check if a string is a valid hex format.
 */
export function isValidHex(str: string): boolean {
	return /^0x[0-9a-fA-F]+$/.test(str);
}

/**
 * Check if a string is a valid block number (numeric).
 */
export function isBlockNumber(str: string): boolean {
	return /^\d+$/.test(str);
}

/**
 * Check if a string is a valid CKB address.
 */
export function isAddress(str: string): boolean {
	return /^(ckb|ckt)1[a-z0-9]+$/.test(str);
}

/**
 * Check if a string is a valid cell OutPoint (txHash:index).
 */
export function isOutPoint(str: string): boolean {
	return /^0x[0-9a-fA-F]{64}:\d+$/.test(str);
}
