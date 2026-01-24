/**
 * Address display with consistent truncation, tooltip, copy, and optional navigation.
 * - Mobile: Uses JS truncation (prefix...suffix)
 * - Desktop with truncate=true: CSS ellipsis when address overflows container
 * - Desktop with truncate=false: Full address wraps
 * - Hover shows full address in tooltip
 * - Text click navigates if linkTo is set
 * - Copy icon copies to clipboard
 */

import { useState, useCallback } from 'react';
import { Tooltip } from './Tooltip';
import { TooltipLink } from './TooltipLink';

interface AddressDisplayProps {
	address: string;
	/** URL to navigate to when text is clicked. If not set, text is not clickable. */
	linkTo?: string;
	/** Enable CSS truncation on desktop. Mobile always uses JS truncation. */
	truncate?: boolean;
	/** Characters to show at start when truncating. Default: 8. */
	prefixLen?: number;
	/** Characters to show at end when truncating. Default: 4. */
	suffixLen?: number;
	/** Use mobile-style truncation regardless of screen size. */
	forceMobileTruncation?: boolean;
	className?: string;
}

// Simple mobile detection. Replace with your own hook if needed.
function useIsMobile(): boolean {
	if (typeof window === 'undefined') return false;
	return window.innerWidth < 640;
}

// Copy to clipboard helper.
async function copyToClipboard(text: string): Promise<void> {
	await navigator.clipboard.writeText(text);
}

export function AddressDisplay({
	address,
	linkTo,
	truncate = true,
	prefixLen = 8,
	suffixLen = 4,
	forceMobileTruncation = false,
	className = '',
}: AddressDisplayProps) {
	const [copied, setCopied] = useState(false);
	const isMobile = useIsMobile();

	// Mobile or forced: use JS truncation.
	const shouldTruncate = isMobile || forceMobileTruncation;

	// Truncate if enabled and address is long enough.
	const needsTruncation = shouldTruncate && address.length > prefixLen + suffixLen + 3;
	const displayAddress = needsTruncation
		? `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`
		: address;

	const handleCopy = useCallback(async () => {
		await copyToClipboard(address);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [address]);

	const handleCopyKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCopy();
		}
	}, [handleCopy]);

	// Text styling: link color if clickable.
	const textClassName = linkTo
		? 'cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors'
		: '';

	// Desktop CSS truncation.
	const textOverflowClass = !isMobile && !forceMobileTruncation && truncate
		? 'overflow-hidden text-ellipsis max-w-full'
		: '';

	const wrapClass = truncate ? 'whitespace-nowrap' : 'break-all';

	return (
		<span
			className={`inline-flex items-center gap-1 font-mono text-sm min-w-0 max-w-full ${wrapClass} ${className}`}
		>
			{/* Address text: TooltipLink if linkTo is set, otherwise plain text with tooltip. */}
			{linkTo ? (
				<TooltipLink
					tooltip={address}
					href={linkTo}
					className={`${textClassName} ${textOverflowClass}`}
				>
					{displayAddress}
				</TooltipLink>
			) : (
				<Tooltip content={address}>
					<span className={textOverflowClass}>{displayAddress}</span>
				</Tooltip>
			)}

			{/* Copy button icon. */}
			<Tooltip content={copied ? 'Copied!' : 'Copy to clipboard'} interactive>
				<span
					role="button"
					tabIndex={0}
					onClick={handleCopy}
					onKeyDown={handleCopyKeyDown}
					className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex flex-shrink-0"
				>
					{copied ? (
						<svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					) : (
						<svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
					)}
				</span>
			</Tooltip>
		</span>
	);
}
