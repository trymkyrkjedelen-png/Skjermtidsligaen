import { lagSupabaseBackend } from './supabase.js';
import { lagDemoBackend } from './demo.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const nokkel = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const backend = url && nokkel ? lagSupabaseBackend(url, nokkel) : lagDemoBackend();

const FEIL = {
  email_address_invalid: 'E-postadressen ser ikke riktig ut.',
  validation_failed: 'Sjekk at e-post og passord er fylt ut riktig.',
  weak_password: 'Passordet må ha minst 6 tegn.',
  user_already_exists: 'Det finnes allerede en konto med denne e-postadressen.',
  email_exists: 'Det finnes allerede en konto med denne e-postadressen.',
  invalid_credentials: 'Feil e-post eller passord.',
  email_not_confirmed: 'Du må bekrefte e-postadressen din først. Sjekk innboksen (og søppelpost).',
  over_request_rate_limit: 'For mange forsøk. Vent litt og prøv igjen.',
  over_email_send_rate_limit: 'For mange e-poster sendt. Vent litt og prøv igjen.',
  same_password: 'Det nye passordet må være forskjellig fra det gamle.',
  session_not_found: 'Du må logge inn på nytt.',
  'liga/ukjent-kode': 'Fant ingen liga med den koden.',
  '42501': 'Du har ikke tilgang til dette.',
};

export function feilmelding(e) {
  if (FEIL[e?.code]) return FEIL[e.code];
  if (e?.message === 'Failed to fetch') return 'Ingen nettforbindelse. Sjekk internett og prøv igjen.';
  return 'Noe gikk galt. Prøv igjen.';
}
