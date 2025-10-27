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
	const [isMediumActive, setIsMediumActive] = useState<boolean>(false);
	const [isLargeActive, setIsLargeActive] = useState<boolean>(false);
	const [isExtraLargeActive, setIsExtraLargeActive] = useState<boolean>(false);

	useEffect(() => {
		const mqlMedium = window.matchMedia(`(min-width: ${breakpoints.medium}px)`);
		const mqlLarge = window.matchMedia(`(min-width: ${breakpoints.large}px)`);
		const mqlExtraLarge = window.matchMedia(
			`(min-width: ${breakpoints.extraLarge}px)`
		);

		const onChangeMedium = (e: MediaQueryListEvent | MediaQueryList) => {
			setIsMediumActive(e.matches);
		};

		const onChangeLarge = (e: MediaQueryListEvent | MediaQueryList) => {
			setIsLargeActive(e.matches);
		};

		const onChangeExtraLarge = (e: MediaQueryListEvent | MediaQueryList) => {
			setIsExtraLargeActive(e.matches);
		};

		mqlMedium.addEventListener("change", onChangeMedium);
		mqlLarge.addEventListener("change", onChangeLarge);
		mqlExtraLarge.addEventListener("change", onChangeExtraLarge);
		onChangeMedium(mqlMedium);
		onChangeLarge(mqlLarge);
		onChangeExtraLarge(mqlExtraLarge);

		return () => {
			mqlMedium.removeEventListener("change", onChangeMedium);
			mqlLarge.removeEventListener("change", onChangeLarge);
			mqlExtraLarge.removeEventListener("change", onChangeExtraLarge);
		};
	}, []);

	return {
		isMediumBreakpoint: isMediumActive,
		isLargeBreakpoint: isLargeActive,
		isExtraLargeBreakpoint: isExtraLargeActive,
	};
}
