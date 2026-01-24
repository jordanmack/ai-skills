/**
 * OutPoint display component for blockchain cell references.
 *
 * Features:
 * - No-wrap: entire structure stays on one line
 * - Hash truncation on mobile
 * - Tooltip on hover showing full outpoint
 * - Click navigates to cell or transaction page
 * - Copy button copies full outpoint to clipboard
 */

import { useState, useCallback } from 'react';
import { Tooltip } from './Tooltip';
import { TooltipLink } from './TooltipLink';
import { truncateHex } from './format';

interface OutPointProps {
	/** Transaction hash. */
	txHash: string;
	/** Output index. */
	index: number;
	/** URL generator. Receives txHash and index, returns URL string. */
	generateUrl?: (txHash: string, index: number) => string;
	/** Additional CSS classes. */
	className?: string;
}

// Simple mobile detection. Replace with your own hook if needed.
function useIsMobile(breakpoint = 640): boolean {
	if (typeof window === 'undefined') return false;
	return window.innerWidth < breakpoint;
}

// Copy to clipboard helper.
async function copyToClipboard(text: string): Promise<void> {
	await navigator.clipboard.writeText(text);
}

// Default URL generator.
const defaultGenerateUrl = (txHash: string, index: number) => `/cell/${txHash}/${index}`;

/**
 * Display an outpoint (txHash:index) with truncation, tooltip, and copy.
 *
 * @example
 * <OutPoint txHash="0x1234..." index={0} />
 *
 * @example
 * // Custom URL generator
 * <OutPoint
 *   txHash="0x1234..."
 *   index={0}
 *   generateUrl={(hash, idx) => `/tx/${hash}#output-${idx}`}
 * />
 */
export function OutPoint({
	txHash,
	index,
	generateUrl = defaultGenerateUrl,
	className = '',
}: OutPointProps) {
	const [copied, setCopied] = useState(false);
	const isMobile = useIsMobile(640);

	const outpoint = `${txHash}:${index}`;
	const displayTxHash = isMobile ? truncateHex(txHash, 8, 8) : txHash;

	const href = generateUrl(txHash, index);

	const handleCopy = useCallback(async () => {
		await copyToClipboard(outpoint);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [outpoint]);

	const handleCopyKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCopy();
		}
	}, [handleCopy]);

	return (
		<span
			className={`inline-flex items-center gap-1.5 whitespace-nowrap max-w-full ${className}`}
		>
			{/* Hash and index container - clickable to navigate, with tooltip. */}
			<TooltipLink
				tooltip={outpoint}
				href={href}
				className="inline-flex items-baseline min-w-0 font-mono text-sm cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
			>
				<span className="truncate min-w-0">
					{displayTxHash}
				</span>
				<span className="text-gray-500 flex-shrink-0">:</span>
				<span className="flex-shrink-0">{index}</span>
			</TooltipLink>

			{/* Copy button icon. */}
			<Tooltip content={copied ? 'Copied!' : 'Copy outpoint'} interactive>
				<span
					role="button"
					tabIndex={0}
					onClick={handleCopy}
					onKeyDown={handleCopyKeyDown}
					className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex"
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
