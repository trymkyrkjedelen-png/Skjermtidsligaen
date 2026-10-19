import { useCallback, useEffect, useState } from 'react';
import { backend } from './backend/index.js';
import Innlogging from './sider/Innlogging.jsx';
import Tabell from './sider/Tabell.jsx';
import Registrer from './sider/Registrer.jsx';
import Statistikk from './sider/Statistikk.jsx';
import Ligaer from './sider/Ligaer.jsx';
import Profil from './sider/Profil.jsx';
import { Ikon } from './komponenter/Ikon.jsx';

const FANER = [
  { id: 'tabell', navn: 'Tabell', ikon: 'pokal' },
  { id: 'registrer', navn: 'Registrer', ikon: 'pluss' },
  { id: 'statistikk', navn: 'Statistikk', ikon: 'graf' },
  { id: 'ligaer', navn: 'Ligaer', ikon: 'gruppe' },
  { id: 'profil', navn: 'Profil', ikon: 'person' },
];

// Invitasjonslenker ser slik ut: https://…/?bli-med=ABC123
// Koden huskes i sessionStorage så den overlever innlogging med Google (som sender deg ut av appen og tilbake).
function lesInvitasjon() {
  const kode = new URLSearchParams(location.search).get('bli-med');
  try {
    if (kode) {
      history.replaceState(null, '', location.pathname);
      sessionStorage.setItem('bli-med', kode);
      return kode;
    }
    return sessionStorage.getItem('bli-med');
  } catch {
    return kode;
  }
}

export default function App() {
  const [bruker, setBruker] = useState(undefined);
  const [fane, setFane] = useState('tabell');
  const [ligaer, setLigaer] = useState(null);
  const [valgtLiga, setValgtLiga] = useState(() => {
    try {
      return localStorage.getItem('valgt-liga');
    } catch {
      return null;
    }
  });
  const [invitasjon, setInvitasjon] = useState(lesInvitasjon);
  const [versjon, setVersjon] = useState(0); // økes når data endres, så tabellen lastes på nytt
  const [nyttPassord, setNyttPassord] = useState(false);

  useEffect(
    () =>
      backend.vedAuth((b, hendelse) => {
        setBruker(b);
        // Brukeren kom fra «glemt passord»-e-posten
        if (hendelse === 'PASSWORD_RECOVERY') {
          setNyttPassord(true);
          setFane('profil');
        }
      }),
    [],
  );

  const hentLigaer = useCallback(async () => {
    try {
      setLigaer(await backend.mineLigaer());
    } catch {
      setLigaer((l) => l ?? []);
    }
  }, []);

  const oppdaterAlt = useCallback(() => {
    hentLigaer();
    setVersjon((v) => v + 1);
  }, [hentLigaer]);

  useEffect(() => {
    if (!bruker) {
      setLigaer(null);
      return;
    }
    hentLigaer();

    // Hent ferske data når noen andre legger inn tid, og når appen åpnes igjen
    let tidtaker;
    const avslutt = backend.vedEndringer(() => {
      clearTimeout(tidtaker);
      tidtaker = setTimeout(oppdaterAlt, 300);
    });
    const vedSynlig = () => document.visibilityState === 'visible' && oppdaterAlt();
    document.addEventListener('visibilitychange', vedSynlig);
    return () => {
      avslutt();
      clearTimeout(tidtaker);
      document.removeEventListener('visibilitychange', vedSynlig);
    };
  }, [bruker?.uid, hentLigaer, oppdaterAlt]);

  useEffect(() => {
    if (invitasjon && bruker) setFane('ligaer');
  }, [invitasjon, bruker]);

  const velgLiga = (id) => {
    setValgtLiga(id);
    try {
      localStorage.setItem('valgt-liga', id);
    } catch {}
  };

  if (bruker === undefined) {
    return (
      <div className="lasteskjerm">
        <div className="spinner" aria-label="Laster" />
      </div>
    );
  }

  if (!bruker) return <Innlogging demo={backend.demo} harInvitasjon={!!invitasjon} />;

  const aktivLiga = ligaer?.find((l) => l.id === valgtLiga) ?? ligaer?.[0] ?? null;

  return (
    <div className="app">
      <header className="topp">
        <div className="logo">
          <span className="logo-merke">
            <Ikon navn="mobil" />
          </span>
          Skjermtidsligaen
        </div>
        {backend.demo && <span className="demo-merke">Demo</span>}
      </header>

      <main className="innhold">
        {fane === 'tabell' && (
          <Tabell
            bruker={bruker}
            ligaer={ligaer}
            aktivLiga={aktivLiga}
            velgLiga={velgLiga}
            versjon={versjon}
            gaTil={setFane}
          />
        )}
        {fane === 'registrer' && (
          <Registrer
            onLagret={() => {
              setVersjon((v) => v + 1);
            }}
            gaTilTabell={() => setFane('tabell')}
          />
        )}
        {fane === 'statistikk' && <Statistikk versjon={versjon} />}
        {fane === 'ligaer' && (
          <Ligaer
            bruker={bruker}
            ligaer={ligaer}
            oppdater={hentLigaer}
            invitasjon={invitasjon}
            ferdigMedInvitasjon={() => {
              setInvitasjon(null);
              try {
                sessionStorage.removeItem('bli-med');
              } catch {}
            }}
            visTabell={(id) => {
              velgLiga(id);
              setFane('tabell');
            }}
          />
        )}
        {fane === 'profil' && (
          <Profil bruker={bruker} demo={backend.demo} nyttPassord={nyttPassord} ferdigMedPassord={() => setNyttPassord(false)} />
        )}
      </main>

      <nav className="faner" aria-label="Hovedmeny">
        {FANER.map((f) => (
          <button
            key={f.id}
            className={'fane' + (fane === f.id ? ' aktiv' : '')}
            aria-current={fane === f.id ? 'page' : undefined}
            onClick={() => setFane(f.id)}
          >
            <Ikon navn={f.ikon} />
            <span>{f.navn}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
