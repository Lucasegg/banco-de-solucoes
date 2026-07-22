export type AuthRedirectGate = { readonly redirected: boolean; redirect: () => void; reset: () => void };

/** Keeps redirect effects idempotent, including React Strict Mode's development re-run. */
export function createAuthRedirectGate(): AuthRedirectGate {
  let redirected = false;
  return {
    get redirected() { return redirected; },
    redirect() { if (redirected) return; redirected = true; },
    reset() { redirected = false; },
  };
}
