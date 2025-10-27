import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useRevalidator } from "react-router";
import type { Session, User } from "@supabase/supabase-js";
import { makeBrowserClient } from "~/library/supabase";

interface AuthContextType {
	session: Session | null;
	user: User | null;
	loading: boolean;
	isLoggedIn: boolean;
	signUpStandard: (email: string, password: string) => Promise<void>;
	signInStandard: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	session: null,
	user: null,
	loading: true,
	isLoggedIn: false,
	signUpStandard: async () => {},
	signInStandard: async () => {},
	signOut: async () => {},
});

export function AuthProvider({
	children,
	initialSession,
}: {
	children: React.ReactNode;
	initialSession: Session | null;
}) {
	const [session, setSession] = useState<Session | null>(initialSession);
	const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
	const [loading, setLoading] = useState(!initialSession);
	const revalidator = useRevalidator();

	const supabase = makeBrowserClient();

	useEffect(() => {
		if (!initialSession) {
			supabase.auth.getSession().then(({ data: { session } }) => {
				setSession(session);
				setLoading(false);
			});
		}

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			setSession(session);
			setLoading(false);

			// Revalidate all routes when auth state changes
			// This ensures loaders re-run with new auth state
			if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
				revalidator.revalidate();
			}
		});

		return () => subscription.unsubscribe();
	}, [initialSession, revalidator, supabase.auth]);

	useEffect(() => {
		supabase.auth.getUser().then(({ data: { user } }) => {
			setUser(user);
		});
	}, [session, supabase.auth]);

	const signUpStandard = useCallback(
		async (email: string, password: string) => {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
			});

			if (error) throw error;

			if (!data.session) {
				// Email confirmation required - session will be created after confirmation
				return;
			}
		},
		[supabase.auth]
	);

	const signInStandard = useCallback(
		async (email: string, password: string) => {
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			if (error) throw error;
		},
		[supabase.auth]
	);

	const signOut = useCallback(async () => {
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
	}, [supabase.auth]);

	const value = useMemo(
		() => ({
			session,
			user,
			loading,
			isLoggedIn: !!session,
			signUpStandard,
			signInStandard,
			signOut,
		}),
		[session, user, loading, signUpStandard, signInStandard, signOut]
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
