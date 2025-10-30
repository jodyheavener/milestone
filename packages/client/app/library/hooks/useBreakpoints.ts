import { useState, useEffect } from "react";

const breakpoints = {
	medium: 768,
	large: 1024,
	extraLarge: 1280,
};

export function useBreakpoints(): {
	isMediumBreakpoint: boolean;
	isLargeBreakpoint: boolean;
	isExtraLargeBreakpoint: boolean;
} {
	const [isMediumActive, setIsMediumActive] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia(`(min-width: ${breakpoints.medium}px)`).matches;
	});
	const [isLargeActive, setIsLargeActive] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia(`(min-width: ${breakpoints.large}px)`).matches;
	});
	const [isExtraLargeActive, setIsExtraLargeActive] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia(`(min-width: ${breakpoints.extraLarge}px)`)
			.matches;
	});

	useEffect(() => {
		const mqlMedium = window.matchMedia(`(min-width: ${breakpoints.medium}px)`);
		const mqlLarge = window.matchMedia(`(min-width: ${breakpoints.large}px)`);
		const mqlExtraLarge = window.matchMedia(
			`(min-width: ${breakpoints.extraLarge}px)`
		);

		const handleMediumChange = (e: MediaQueryListEvent) => {
			setIsMediumActive(e.matches);
		};

		const handleLargeChange = (e: MediaQueryListEvent) => {
			setIsLargeActive(e.matches);
		};

		const handleExtraLargeChange = (e: MediaQueryListEvent) => {
			setIsExtraLargeActive(e.matches);
		};

		mqlMedium.addEventListener("change", handleMediumChange);
		mqlLarge.addEventListener("change", handleLargeChange);
		mqlExtraLarge.addEventListener("change", handleExtraLargeChange);

		return () => {
			mqlMedium.removeEventListener("change", handleMediumChange);
			mqlLarge.removeEventListener("change", handleLargeChange);
			mqlExtraLarge.removeEventListener("change", handleExtraLargeChange);
		};
	}, []);

	return {
		isMediumBreakpoint: isMediumActive,
		isLargeBreakpoint: isLargeActive,
		isExtraLargeBreakpoint: isExtraLargeActive,
	};
}
