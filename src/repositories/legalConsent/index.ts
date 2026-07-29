import { supabaseClient } from '../../integrations/supabase/client';
import { LegalConsentRepository } from './LegalConsentRepository';
export const legalConsentRepository = supabaseClient ? new LegalConsentRepository(supabaseClient) : null;
export { LegalConsentRepository } from './LegalConsentRepository';

