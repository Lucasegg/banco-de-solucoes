import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { RegisterUserInput } from '../../types/user';

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
          country: input.country?.trim() || null,
          bio: input.bio?.trim() || null,
          avatar_url: input.avatarUrl?.trim() || null,
        },
      },
    });
  }

  signInWithPassword(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
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
