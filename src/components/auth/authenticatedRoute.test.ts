import assert from 'node:assert/strict';
import { createAuthRedirectGate } from './authRedirectGate.ts';

// The gate is used by the component's useEffect: rendering itself cannot invoke it.
{
  const gate = createAuthRedirectGate();
  assert.equal(gate.redirected, false, 'render starts without navigation');
  gate.redirect();
  assert.equal(gate.redirected, true, 'effect may redirect after commit');
  gate.redirect();
  assert.equal(gate.redirected, true, 'Strict Mode effect replay remains idempotent');
  gate.reset();
  assert.equal(gate.redirected, false, 'authenticated/loading transition resets a later attempt');
}
console.log('AuthenticatedRoute redirect gate passed.');
