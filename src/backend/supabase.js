import { createClient } from '@supabase/supabase-js';

export function lagSupabaseBackend(url, nokkel) {
  const sb = createClient(url, nokkel);
  let meg = null;

  // Supabase returnerer { data, error }; vi kaster feilen så sidene kan vise den
  const sjekk = ({ data, error }) => {
    if (error) throw error;
    return data;
  };

  async function hentBruker(u) {
    const { data } = await sb.from('profiler').select('navn').eq('id', u.id).maybeSingle();
    return {
      uid: u.id,
      epost: u.email,
      navn: data?.navn ?? u.user_metadata?.navn ?? u.user_metadata?.full_name ?? u.email?.split('@')[0],
    };
  }

  const tilbake = () => location.origin + location.pathname;

  return {
    demo: false,

    vedAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((hendelse, sesjon) => {
        meg = sesjon?.user ?? null;
        // Supabase-kall rett inne i denne lytteren kan låse seg, så vi venter ett tikk
        setTimeout(async () => {
          if (!meg) return cb(null, hendelse);
          cb(await hentBruker(meg), hendelse);
        }, 0);
      });
      return () => data.subscription.unsubscribe();
    },

    async registrer({ navn, epost, passord }) {
      const data = sjekk(
        await sb.auth.signUp({ email: epost, password: passord, options: { data: { navn }, emailRedirectTo: tilbake() } }),
      );
      // Uten økt betyr at e-posten må bekreftes først
      return { bekreftEpost: !data.session };
    },

    async loggInn({ epost, passord }) {
      sjekk(await sb.auth.signInWithPassword({ email: epost, password: passord }));
    },

    async loggInnGoogle() {
      sjekk(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: tilbake() } }));
    },

    async tilbakestillPassord(epost) {
      sjekk(await sb.auth.resetPasswordForEmail(epost, { redirectTo: tilbake() }));
    },

    async endrePassord(passord) {
      sjekk(await sb.auth.updateUser({ password: passord }));
    },

    async loggUt() {
      await sb.auth.signOut();
    },

    async oppdaterNavn(navn) {
      sjekk(await sb.from('profiler').update({ navn }).eq('id', meg.id));
      sjekk(await sb.auth.updateUser({ data: { navn } })); // utløser USER_UPDATED, så navnet oppdateres i appen
    },

    async lagreRegistrering(dato, minutter) {
      sjekk(
        await sb.from('registreringer').upsert({ uid: meg.id, dato, minutter, oppdatert: new Date().toISOString() }),
      );
    },

    async slettRegistrering(dato) {
      sjekk(await sb.from('registreringer').delete().eq('uid', meg.id).eq('dato', dato));
    },

    async mineRegistreringer(fra, til) {
      return sjekk(
        await sb.from('registreringer').select('dato, minutter').eq('uid', meg.id).gte('dato', fra).lte('dato', til),
      );
    },

    async mineLigaer() {
      const ligaer = sjekk(await sb.from('ligaer').select('id, navn, kode, eier, liga_medlemmer(uid)').order('navn'));
      return ligaer.map(({ liga_medlemmer, ...l }) => ({ ...l, medlemmer: liga_medlemmer.map((m) => m.uid) }));
    },

    async opprettLiga(navn) {
      return sjekk(await sb.rpc('opprett_liga', { p_navn: navn }));
    },

    async blimedILiga(kode) {
      const { data, error } = await sb.rpc('bli_med_i_liga', { p_kode: kode });
      if (error?.message?.includes('ukjent-kode')) throw { code: 'liga/ukjent-kode' };
      if (error) throw error;
      return data;
    },

    async forlatLiga(id) {
      sjekk(await sb.from('liga_medlemmer').delete().eq('liga_id', id).eq('uid', meg.id));
    },

    async ligaData(liga, fra, til) {
      const [medlemmer, registreringer] = await Promise.all([
        sb.from('profiler').select('uid:id, navn').in('id', liga.medlemmer).then(sjekk),
        sb
          .from('registreringer')
          .select('uid, dato, minutter')
          .in('uid', liga.medlemmer)
          .gte('dato', fra)
          .lte('dato', til)
          .then(sjekk),
      ]);
      return { medlemmer, registreringer };
    },

    // Kaller cb når noen (i ligaene dine) legger inn, endrer eller sletter tid, eller blir med
    vedEndringer(cb) {
      const kanal = sb
        .channel('endringer')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registreringer' }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'liga_medlemmer' }, cb)
        .subscribe();
      return () => sb.removeChannel(kanal);
    },
  };
}
