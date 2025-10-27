import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useRevalidator } from "react-router";
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@m/shared";
import { makeBrowserClient } from "~/library/supabase";

type ProfileUser = User & Tables<"profile">;

interface AuthContextType {
	user: ProfileUser | null;
	isLoading: boolean;
	isLoggedIn: boolean;
	signUpStandard: (
		name: string,
		email: string,
		password: string
	) => Promise<void>;
	signInStandard: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	isLoading: true,
	isLoggedIn: false,
	signUpStandard: async () => {},
	signInStandard: async () => {},
	signOut: async () => {},
});

export function AuthProvider({
	children,
	initialUser,
}: {
	children: React.ReactNode;
	initialUser: User | null;
}) {
	const [user, setUser] = useState<ProfileUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const revalidator = useRevalidator();

	const supabase = makeBrowserClient();

	// Helper function to load profile data for a user
	const loadUserWithProfile = useCallback(
		async (userToLoad: User) => {
			try {
				const { data: profile, error } = await supabase
					.from("profile")
					.select("*")
					.eq("id", userToLoad.id)
					.single();

				if (error) {
					console.error("Error loading profile:", error);
					return null;
				}

				return { ...userToLoad, ...profile };
			} catch (error) {
				console.error("Error loading profile:", error);
				return null;
			}
		},
		[supabase]
	);

	// Load profile data when we have a user but no profile
	useEffect(() => {
		const initializeUser = async () => {
			if (!initialUser) {
				setUser(null);
				setIsLoading(false);
				return;
			}

			// Load profile data for the user
			const userWithProfile = await loadUserWithProfile(initialUser);
			setUser(userWithProfile);
			setIsLoading(false);
		};

		initializeUser();
	}, [initialUser, loadUserWithProfile]);

	const signUpStandard = useCallback(
		async (name: string, email: string, password: string) => {
			setIsLoading(true);

			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						name: name,
					},
				},
			});

			setIsLoading(false);

			if (error) {
				throw error;
			}

			if (!data.session) {
				// Email confirmation required
				// Session will be created after confirmation
				return;
			}
		},
		[supabase]
	);

	const signInStandard = useCallback(
		async (email: string, password: string) => {
			setIsLoading(true);

			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				setIsLoading(false);
				throw error;
			}

			if (data.user) {
				const userWithProfile = await loadUserWithProfile(data.user);
				setUser(userWithProfile);
			}

			setIsLoading(false);
		},
		[supabase.auth, loadUserWithProfile]
	);

	const signOut = useCallback(async () => {
		setIsLoading(true);

		const { error } = await supabase.auth.signOut();

		if (error) {
			setIsLoading(false);
			throw error;
		}

		setUser(null);
		setIsLoading(false);
		revalidator.revalidate();
	}, [supabase.auth, revalidator]);

	const value = useMemo(
		() => ({
			user,
			isLoading,
			isLoggedIn: !!user,
			signUpStandard,
			signInStandard,
			signOut,
		}),
		[user, isLoading, signUpStandard, signInStandard, signOut]
	);

	return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
	const context = use(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within a AuthProvider");
	}
	return context;
}
