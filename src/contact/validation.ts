export const CONTACT_CATEGORIES = ['question', 'support', 'account', 'suggestion', 'report', 'other'] as const;
export type ContactCategory = typeof CONTACT_CATEGORIES[number];
export type ContactForm = { name: string; email: string; subject: string; category: string; message: string; consent: boolean; website: string };
export type ContactField = keyof Pick<ContactForm, 'name' | 'email' | 'subject' | 'category' | 'message' | 'consent'>;
export type ValidationCode = 'required' | 'email' | 'tooShort' | 'tooLong' | 'category' | 'consent';

export const CONTACT_LIMITS = { name: [2, 100], email: [3, 254], subject: [3, 150], message: [10, 5000] } as const;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeContactForm(value: ContactForm): ContactForm {
  return { ...value, name: value.name.trim().replace(/\s+/g, ' '), email: value.email.trim().toLowerCase(), subject: value.subject.trim().replace(/\s+/g, ' '), message: value.message.trim(), category: value.category.trim(), website: value.website.trim() };
}

export function validateContactForm(input: ContactForm): Partial<Record<ContactField, ValidationCode>> {
  const value = normalizeContactForm(input);
  const errors: Partial<Record<ContactField, ValidationCode>> = {};
  for (const field of ['name', 'subject', 'message'] as const) {
    const [min, max] = CONTACT_LIMITS[field];
    if (!value[field]) errors[field] = 'required'; else if (value[field].length < min) errors[field] = 'tooShort'; else if (value[field].length > max) errors[field] = 'tooLong';
  }
  if (!value.email) errors.email = 'required'; else if (value.email.length > CONTACT_LIMITS.email[1]) errors.email = 'tooLong'; else if (!emailPattern.test(value.email)) errors.email = 'email';
  if (!CONTACT_CATEGORIES.includes(value.category as ContactCategory)) errors.category = 'category';
  if (!value.consent) errors.consent = 'consent';
  return errors;
}
