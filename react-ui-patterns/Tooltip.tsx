/**
 * Accessible tooltip with smart positioning using Floating UI.
 * Features:
 * - Flips to opposite side when near viewport edge
 * - Shifts horizontally to stay in view
 * - Arrow points to trigger element
 * - Portal rendering to avoid z-index issues
 * - Touch-friendly interactive mode for clickable elements
 */

import { useState, useRef, useEffect, cloneElement, useCallback } from 'react';
import type { ReactNode, ReactElement } from 'react';
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

interface TooltipProps {
	/** Content to display in the tooltip. */
	content: ReactNode;
	/** Trigger element (must accept ref and mouse/focus events). */
	children: ReactElement<any>;
	/** Preferred placement. Will flip if not enough space. Default: 'top'. */
	placement?: Placement;
	/** Whether the tooltip is disabled. */
	disabled?: boolean;
	/**
	 * Enable for clickable elements (links, buttons). On touch devices,
	 * first tap shows tooltip, second tap triggers the click action.
	 */
	interactive?: boolean;
}

// Detect if device can't hover (touch device).
// Evaluated as a function to avoid SSR/HMR caching issues.
const isTouchDevice = () => typeof window !== 'undefined'
	&& !window.matchMedia('(hover: hover)').matches;

/**
 * Wrap any element to show a tooltip on hover/focus.
 *
 * @example
 * <Tooltip content="Click to copy">
 *   <button>Copy</button>
 * </Tooltip>
 *
 * @example
 * // For clickable elements, use interactive for touch support.
 * <Tooltip content="View transaction" interactive>
 *   <Link to="/tx/...">0x1234...</Link>
 * </Tooltip>
 */
export function Tooltip({
	content,
	children,
	placement = 'top',
	disabled = false,
	interactive = false,
}: TooltipProps) {
	const [isOpen, setIsOpen] = useState(false);
	// Use state instead of ref for arrow element to avoid lint warnings about
	// accessing refs during render when passing to floating-ui middleware.
	const [arrowElement, setArrowElement] = useState<HTMLSpanElement | null>(null);
	const referenceRef = useRef<HTMLElement>(null);

	const { refs, floatingStyles, middlewareData, placement: actualPlacement } = useFloating({
		open: isOpen,
		placement,
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(8),
			flip({ fallbackAxisSideDirection: 'start' }),
			shift({ padding: 8 }),
			size({
				apply({ availableWidth, elements }) {
					// Constrain tooltip width to available space minus padding.
					Object.assign(elements.floating.style, {
						maxWidth: `${Math.max(200, availableWidth - 16)}px`,
					});
				},
				padding: 8,
			}),
			arrow({ element: arrowElement }),
		],
	});

	// Handle click-outside to close tooltip in interactive mode.
	useEffect(() => {
		if (!interactive || !isOpen) return;

		const handleClickOutside = (e: MouseEvent | TouchEvent) => {
			const target = e.target as Node;
			if (referenceRef.current && !referenceRef.current.contains(target)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('touchstart', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('touchstart', handleClickOutside);
		};
	}, [interactive, isOpen]);

	// Combine floating-ui ref with our click-outside detection ref.
	// Must be before early return to satisfy hooks rules.
	const setRefs = useCallback((el: HTMLElement | null) => {
		refs.setReference(el);
		(referenceRef as React.MutableRefObject<HTMLElement | null>).current = el;
	}, [refs]);

	// Don't render tooltip if disabled or no content.
	if (disabled || !content) {
		return children;
	}

	// Handle click for interactive mode on touch devices.
	const handleClick = (e: React.MouseEvent) => {
		if (interactive && isTouchDevice() && !isOpen) {
			// First tap on touch device: show tooltip, prevent navigation.
			e.preventDefault();
			setIsOpen(true);
			return;
		}
		// Normal click (mouse or second tap): forward to original handler.
		children.props.onClick?.(e);
	};

	// Calculate arrow position based on actual placement after flip/shift.
	const arrowX = middlewareData.arrow?.x;
	const arrowY = middlewareData.arrow?.y;
	const side = actualPlacement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';

	// Arrow points toward trigger, so position it on opposite side of tooltip.
	const arrowSide = {
		top: 'bottom',
		right: 'left',
		bottom: 'top',
		left: 'right',
	}[side] as string;

	// Arrow offset from edge (half of arrow size).
	const arrowOffset = '-4px';

	return (
		<>
			{cloneElement(children, {
				ref: setRefs,
				onMouseEnter: (e: React.MouseEvent) => {
					// On touch devices with interactive tooltips, don't open on mouseenter.
					// The handleClick will manage showing the tooltip on first tap.
					if (!(interactive && isTouchDevice())) {
						setIsOpen(true);
					}
					children.props.onMouseEnter?.(e);
				},
				onMouseLeave: (e: React.MouseEvent) => {
					setIsOpen(false);
					children.props.onMouseLeave?.(e);
				},
				onFocus: (e: React.FocusEvent) => {
					setIsOpen(true);
					children.props.onFocus?.(e);
				},
				onBlur: (e: React.FocusEvent) => {
					setIsOpen(false);
					children.props.onBlur?.(e);
				},
				onClick: handleClick,
			})}
			{isOpen && createPortal(
				<div
					ref={refs.setFloating}
					style={floatingStyles}
					role="tooltip"
					className="z-50 px-3 py-2 text-xs bg-gray-900 dark:bg-gray-700 text-white rounded shadow-lg pointer-events-none break-all"
				>
					{content}
					{/* Arrow element. */}
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
