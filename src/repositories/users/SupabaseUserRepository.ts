import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { RegisterUserInput } from '../../types/user';
import { getOAuthRedirectUrl, saveOAuthReturnTo, SOCIAL_PROVIDER_SCOPES, toSupabaseProvider, type SocialAuthProvider } from './oauth';

export type AuthSubscription = { unsubscribe: () => void };

export class SupabaseUserRepository {
  constructor(private readonly client: SupabaseClient) {}

  signUp(input: RegisterUserInput) {
    return this.client.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          username: input.username.trim().toLowerCase(),
          display_name: input.name.trim(),
          organization: input.organization?.trim() || null,
          city: input.city?.trim() || null,
          state: input.state?.trim() || null,
          country: input.country?.trim() || null,
          bio: input.bio?.trim() || null,
          website: input.website?.trim() || null,
        },
      },
    });
  }

  signInWithPassword(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  }

  signInWithOAuth(provider: SocialAuthProvider) {
    saveOAuthReturnTo();
    return this.client.auth.signInWithOAuth({
      provider: toSupabaseProvider(provider),
      options: {
        redirectTo: getOAuthRedirectUrl(),
        scopes: SOCIAL_PROVIDER_SCOPES[provider],
        queryParams: provider === 'azure' ? { prompt: 'select_account' } : undefined,
      },
    });
  }

  handleOAuthCallback() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return this.client.auth.getSession();
    return this.client.auth.exchangeCodeForSession(code);
  }

  signOut() { return this.client.auth.signOut(); }
  getSession() { return this.client.auth.getSession(); }
  getUser() { return this.client.auth.getUser(); }
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): AuthSubscription {
    const { data } = this.client.auth.onAuthStateChange(callback);
    return data.subscription;
  }
}

export type { Session, User };
