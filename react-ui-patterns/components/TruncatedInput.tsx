/**
 * Input that shows truncated value when blurred, full value when focused.
 *
 * Useful for long values like blockchain addresses where you want to:
 * - Show a preview when not editing
 * - Reveal full value when user clicks to edit
 * - Show a tooltip with full value on hover
 */

import { useState, useRef, useEffect } from 'react';

interface TruncatedInputProps {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	/** Truncation function. Default: 8 chars + ... + 4 chars. */
	truncate?: (value: string) => string;
	/** Minimum length to trigger truncation. Default: 15. */
	minLengthToTruncate?: number;
	className?: string;
	placeholder?: string;
	style?: React.CSSProperties;
}

// Default truncation: 8 prefix + ... + 4 suffix.
function defaultTruncate(value: string): string {
	if (value.length <= 15) return value;
	return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

/**
 * Input field that shows truncated value when not focused.
 *
 * @example
 * <TruncatedInput
 *   value={address}
 *   onChange={(e) => setAddress(e.target.value)}
 *   placeholder="Enter CKB address"
 * />
 */
export function TruncatedInput({
	value,
	onChange,
	truncate = defaultTruncate,
	minLengthToTruncate = 15,
	className = '',
	placeholder,
	style,
}: TruncatedInputProps) {
	const [isFocused, setIsFocused] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const [tooltipTimer, setTooltipTimer] = useState<number | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState<'above' | 'below'>('below');
	const inputRef = useRef<HTMLInputElement>(null);

	const shouldTruncate = !isFocused && value.length > minLengthToTruncate;

	// Calculate tooltip position based on available space.
	function calculateTooltipPosition(): 'above' | 'below' {
		if (!inputRef.current) return 'below';
		const rect = inputRef.current.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		return spaceBelow >= 150 ? 'below' : 'above';
	}

	// Start tooltip timer on hover.
	function startTooltipTimer() {
		const timer = window.setTimeout(() => {
			setTooltipPosition(calculateTooltipPosition());
			setShowTooltip(true);
		}, 500);
		setTooltipTimer(timer);
	}

	// Cancel tooltip timer and hide tooltip.
	function cancelTooltipTimer() {
		if (tooltipTimer) {
			clearTimeout(tooltipTimer);
			setTooltipTimer(null);
		}
		setShowTooltip(false);
	}

	// Handle click on overlay to focus input and position cursor.
	function handleOverlayClick(e: React.MouseEvent) {
		if (!inputRef.current) return;
		inputRef.current.focus();

		try {
			const rect = e.currentTarget.getBoundingClientRect();
			const clickX = e.clientX - rect.left;
			const clickRatio = clickX / rect.width;

			let position: number;
			if (clickRatio < 0.3) {
				position = 0;
			} else if (clickRatio > 0.7) {
				position = value.length;
			} else {
				position = Math.floor(value.length / 2);
			}

			inputRef.current.setSelectionRange(position, position);
		} catch {
			inputRef.current.setSelectionRange(value.length, value.length);
		}
	}

	// Cleanup timer on unmount.
	useEffect(() => {
		return () => {
			if (tooltipTimer) clearTimeout(tooltipTimer);
		};
	}, [tooltipTimer]);

	return (
		<div className={`relative ${className}`}>
			{/* Real input - always accessible for focus/tab */}
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={onChange}
				onFocus={() => {
					setIsFocused(true);
					cancelTooltipTimer();
				}}
				onBlur={() => setIsFocused(false)}
				className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
					shouldTruncate ? 'text-transparent caret-transparent' : 'text-gray-900 dark:text-gray-100'
				}`}
				placeholder={placeholder}
				style={style}
			/>

			{/* Overlay - visible when blurred and value is long */}
			{!isFocused && shouldTruncate && (
				<div
					onClick={handleOverlayClick}
					onMouseEnter={startTooltipTimer}
					onMouseLeave={cancelTooltipTimer}
					className="absolute inset-0 flex items-center px-3 py-2 cursor-text font-mono text-gray-900 dark:text-gray-100"
				>
					{truncate(value)}
					<span className="text-gray-400 dark:text-gray-500 ml-1">[⋯]</span>
				</div>
			)}

			{/* Tooltip - centered below/above */}
			{showTooltip && !isFocused && shouldTruncate && (
				<div
					className={`absolute left-1/2 -translate-x-1/2 min-w-[200px] max-w-[600px] p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg font-mono text-sm text-gray-900 dark:text-gray-100 break-words z-50 pointer-events-none ${
						tooltipPosition === 'below' ? 'top-full mt-1' : 'bottom-full mb-1'
					}`}
				>
					{value}
				</div>
			)}
		</div>
	);
}
