# Skjermtidsligaen

En web-app (laget for mobil først) der venner logger inn, legger inn skjermtiden sin hver dag og konkurrerer på en felles tabell. Den med **minst** skjermtid vinner.

Alle data ligger i én felles Supabase-database. Når noen legger inn tid, oppdateres tabellen med en gang hos alle i ligaen (sanntid). Den oppdateres også når du åpner appen igjen eller laster siden på nytt.

## Funksjoner

- Innlogging med e-post og passord eller Google, «glemt passord» og bytte av passord
- **Les av skjermbilde:** ta et skjermbilde av Skjermtid på iPhone (Innstillinger → Skjermtid → Se all aktivitet → Dag), og appen leser totalen og datoen selv. Bildet leses på mobilen og lastes ikke opp. Lesemotoren (Tesseract) og språkfilene kopieres inn i `public/tesseract` av `scripts/kopier-tesseract.js` når du kjører `npm run dev` eller `npm run build`, så appen trenger ingen CDN.
- Registrer skjermtid for i dag eller rett opp de siste 7 dagene
- Ligaer for 2 eller flere: opprett en liga, del koden eller lenken (`?bli-med=KODE`), og vennene dine blir med
- Tabell for i dag, uke og måned, og du kan bla bakover i tid
- Statistikk: ukesnitt, endring fra forrige uke, dager på rad, beste dag og søylediagram
- Personvern: du ser bare skjermtiden til folk du deler en liga med

**Rangering:** I dag-tabellen sorterer etter dagens skjermtid. Uke og måned bruker snittet per registrerte dag. Er snittet likt, vinner den som har registrert flest dager.

## Oppsett med Supabase og Vercel

### 1. Supabase

1. Opprett et prosjekt på <https://supabase.com/dashboard>.
2. Gå til **SQL Editor**, lim inn hele `supabase/oppsett.sql` og trykk **Run**.
3. Gå til **Project Settings → API** og kopier **Project URL** og **anon public**-nøkkelen.
4. Gå til **Authentication → URL Configuration**:
   - **Site URL:** Vercel-adressen din, for eksempel `https://skjermtidsligaen.vercel.app`
   - **Redirect URLs:** legg til den samme adressen og `http://localhost:5173`
5. (Valgfritt) Google-innlogging: **Authentication → Providers → Google**. Her trenger du en OAuth-klient fra Google Cloud Console. Supabase viser hvilken «redirect URI» du skal legge inn hos Google.

> E-postbekreftelse er slått på som standard. Nye brukere må da trykke på lenken i en e-post før de kan logge inn. Vil du slippe det mens dere tester, slår du av **Confirm email** under *Authentication → Providers → Email*.

### 2. Vercel

1. Legg prosjektet i et GitHub-repo og importer det på <https://vercel.com/new>. Vercel kjenner igjen Vite automatisk.
2. Under **Environment Variables** legger du inn:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public-nøkkelen
3. Trykk **Deploy**. Har du lagt inn variablene etter første deploy, må du deploye på nytt.

### Kjøre lokalt

```bash
cp .env.example .env.local   # fyll inn de to verdiene
npm install
npm run dev
```

Uten `.env.local` starter appen i **demomodus**. Da lagres alt bare i nettleseren, og du får påfunnede venner å konkurrere mot.

## Datamodell

| Tabell | Innhold |
|---|---|
| `profiler` | `id` (= bruker-id), `navn`. Lages automatisk når noen oppretter konto. |
| `registreringer` | `uid`, `dato`, `minutter` (én rad per person per dag) |
| `ligaer` | `id`, `navn`, `kode`, `eier` |
| `liga_medlemmer` | `liga_id`, `uid` |

Tilgangsreglene (Row Level Security) i `supabase/oppsett.sql` gjør at du bare kan endre dine egne data, og bare se navn og skjermtid til folk du deler en liga med. Ligaer opprettes og man blir med i dem gjennom databasefunksjonene `opprett_liga` og `bli_med_i_liga`.
