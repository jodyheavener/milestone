import { useLocalStorageState } from "ahooks";
import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

const storageKey = "theme";

export const availableThemes = {
	system: "System",
	light: "Light",
	dark: "Dark",
} as const;

export type ThemeMode = keyof typeof availableThemes;
export type ThemeType = Exclude<ThemeMode, "system">;

type ThemeProviderProps = {
	children: React.ReactNode;
};

type ThemeProviderState = {
	currentTheme: ThemeType;
	themeMode: ThemeMode;
	setThemeMode: (newMode: ThemeMode) => void;
};

const initialState: ThemeProviderState = {
	currentTheme: "light",
	themeMode: "light",
	setThemeMode: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children }: ThemeProviderProps) {
	const [storedTheme, setStoredTheme] = useLocalStorageState<ThemeMode>(
		storageKey,
		{
			defaultValue: initialState.currentTheme,
		}
	);
	const [systemTheme, setSystemTheme] = useState<ThemeType>(() => {
		if (typeof window !== "undefined") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			return mediaQuery.matches ? "dark" : "light";
		}
		return initialState.currentTheme;
	});

	const themeMode = storedTheme ?? initialState.currentTheme;
	const currentTheme = themeMode === "system" ? systemTheme : themeMode;

	const setThemeMode = useCallback(
		(newMode: ThemeMode) => {
			setStoredTheme(newMode);
		},
		[setStoredTheme]
	);

	useEffect(() => {
		const root = window.document.documentElement;
		root.classList.remove("light", "dark");
		root.classList.add(currentTheme);
	}, [currentTheme, systemTheme]);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (e: MediaQueryListEvent) => {
			setSystemTheme(e.matches ? "dark" : "light");
		};

		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, []);

	const value = useMemo(
		() => ({
			currentTheme,
			themeMode,
			setThemeMode,
		}),
		[currentTheme, themeMode, setThemeMode]
	);

	return <ThemeProviderContext value={value}>{children}</ThemeProviderContext>;
}

export const useTheme = () => {
	const context = use(ThemeProviderContext);

	if (context === undefined)
		throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};
