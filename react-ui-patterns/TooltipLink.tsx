/**
 * Touch-aware link with tooltip.
 *
 * Solves the touch device problem where tooltips and navigation conflict:
 * - Desktop: Hover shows tooltip, click navigates
 * - Touch: First tap shows tooltip, second tap navigates
 *
 * This component owns both the tooltip and navigation behavior as a single
 * cohesive unit, ensuring consistent behavior across all device types.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
	useFloating,
	autoUpdate,
	offset,
	flip,
	shift,
	arrow,
	size,
} from '@floating-ui/react-dom';
import type { Placement } from '@floating-ui/react-dom';

interface TooltipLinkProps {
	/** Tooltip content to display. */
	tooltip: ReactNode;
	/** URL to navigate to when clicked. */
	href: string;
	/** Link content (text, elements, etc.). */
	children: ReactNode;
	/** Preferred tooltip placement. Will flip if not enough space. Default: 'top'. */
	placement?: Placement;
	/** Additional CSS classes for the link. */
	className?: string;
	/** Navigation function. Default: window.location.href assignment. */
	navigate?: (href: string) => void;
}

// Detect if device can't hover (touch device).
const isTouchDevice = () =>
	typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches;

// Default navigation function.
const defaultNavigate = (href: string) => {
	window.location.href = href;
};

/**
 * Link component with integrated tooltip and touch-aware navigation.
 *
 * On desktop/mouse devices:
 * - Hover shows tooltip
 * - Click navigates immediately
 *
 * On touch devices:
 * - First tap shows tooltip (no navigation)
 * - Second tap navigates
 * - Tapping elsewhere dismisses tooltip
 *
 * @example
 * <TooltipLink tooltip="View full hash: 0x1234..." href="/tx/0x1234">
 *   0x1234...5678
 * </TooltipLink>
 */
export function TooltipLink({
	tooltip,
	href,
	children,
	placement = 'top',
	className = '',
	navigate = defaultNavigate,
}: TooltipLinkProps) {
	const [isTooltipOpen, setIsTooltipOpen] = useState(false);
	const [tooltipShownOnce, setTooltipShownOnce] = useState(false);
	const [arrowElement, setArrowElement] = useState<HTMLSpanElement | null>(null);
	const linkRef = useRef<HTMLAnchorElement>(null);

	const { refs, floatingStyles, middlewareData, placement: actualPlacement } = useFloating({
		open: isTooltipOpen,
		placement,
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(8),
			flip({ fallbackAxisSideDirection: 'start' }),
			shift({ padding: 8 }),
			size({
				apply({ availableWidth, elements }) {
					Object.assign(elements.floating.style, {
						maxWidth: `${Math.max(200, availableWidth - 16)}px`,
					});
				},
				padding: 8,
			}),
			arrow({ element: arrowElement }),
		],
	});

	// Combine refs for floating-ui and our internal ref.
	const setRefs = useCallback(
		(el: HTMLAnchorElement | null) => {
			refs.setReference(el);
			(linkRef as React.MutableRefObject<HTMLAnchorElement | null>).current = el;
		},
		[refs]
	);

	// Handle click-outside to close tooltip and reset touch state.
	useEffect(() => {
		if (!isTooltipOpen) return;

		const handleClickOutside = (e: MouseEvent | TouchEvent) => {
			const target = e.target as Node;
			if (linkRef.current && !linkRef.current.contains(target)) {
				setIsTooltipOpen(false);
				setTooltipShownOnce(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('touchstart', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('touchstart', handleClickOutside);
		};
	}, [isTooltipOpen]);

	// Handle mouse enter - show tooltip on desktop.
	const handleMouseEnter = useCallback(() => {
		// On touch devices, don't open on mouseenter (synthetic events).
		if (!isTouchDevice()) {
			setIsTooltipOpen(true);
		}
	}, []);

	// Handle mouse leave - hide tooltip.
	const handleMouseLeave = useCallback(() => {
		setIsTooltipOpen(false);
		setTooltipShownOnce(false);
	}, []);

	// Handle focus - show tooltip for keyboard navigation.
	const handleFocus = useCallback(() => {
		setIsTooltipOpen(true);
	}, []);

	// Handle blur - hide tooltip.
	const handleBlur = useCallback(() => {
		setIsTooltipOpen(false);
		setTooltipShownOnce(false);
	}, []);

	// Handle click - the core touch-aware navigation logic.
	const handleClick = useCallback(
		(e: React.MouseEvent<HTMLAnchorElement>) => {
			// Allow modifier keys to open in new tab (native browser behavior).
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
				return;
			}

			e.preventDefault();

			if (isTouchDevice()) {
				if (!tooltipShownOnce) {
					// First tap: show tooltip, don't navigate.
					setIsTooltipOpen(true);
					setTooltipShownOnce(true);
					return;
				}
				// Second tap: navigate.
			}

			// Desktop click or second tap on touch: navigate.
			navigate(href);
		},
		[href, tooltipShownOnce, navigate]
	);

	// Handle keyboard navigation.
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				navigate(href);
			}
		},
		[href, navigate]
	);

	// Calculate arrow position.
	const arrowX = middlewareData.arrow?.x;
	const arrowY = middlewareData.arrow?.y;
	const side = actualPlacement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';

	const arrowSide = {
		top: 'bottom',
		right: 'left',
		bottom: 'top',
		left: 'right',
	}[side] as string;

	const arrowOffset = '-4px';

	return (
		<>
			<a
				ref={setRefs}
				href={href}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onFocus={handleFocus}
				onBlur={handleBlur}
				className={className}
			>
				{children}
			</a>
			{isTooltipOpen &&
				createPortal(
					<div
						ref={refs.setFloating}
						style={floatingStyles}
						role="tooltip"
						className="z-50 px-3 py-2 text-xs bg-gray-900 dark:bg-gray-700 text-white rounded shadow-lg pointer-events-none break-all"
					>
						{tooltip}
						<span
							ref={setArrowElement}
							style={{
								position: 'absolute',
								left: arrowX != null ? `${arrowX}px` : '',
								top: arrowY != null ? `${arrowY}px` : '',
								[arrowSide]: arrowOffset,
							}}
							className="w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"
						/>
					</div>,
					document.body
				)}
		</>
	);
}
