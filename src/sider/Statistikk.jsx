import { useEffect, useState } from 'react';
import { backend } from '../backend/index.js';
import { datoerMellom, formaterMinutter, iDag, kortDag, leggTilDager, pentDato, ukestart } from '../lib/dato.js';
import { rekke } from '../lib/poeng.js';

const snitt = (liste) => (liste.length ? liste.reduce((a, b) => a + b, 0) / liste.length : null);

export default function Statistikk({ versjon }) {
  const idag = iDag();
  const [reg, setReg] = useState(null);

  useEffect(() => {
    backend
      .mineRegistreringer(leggTilDager(idag, -90), idag)
      .then(setReg)
      .catch(() => setReg([]));
  }, [versjon]);

  if (!reg) return <div className="spinner midt" aria-label="Laster" />;

  const perDato = Object.fromEntries(reg.map((r) => [r.dato, r.minutter]));
  const siste14 = datoerMellom(leggTilDager(idag, -13), idag);
  const maks = Math.max(60, ...siste14.map((d) => perDato[d] ?? 0));

  const denneUka = ukestart(idag);
  const forrigeUka = leggTilDager(denneUka, -7);
  const snittDenne = snitt(reg.filter((r) => r.dato >= denneUka).map((r) => r.minutter));
  const snittForrige = snitt(reg.filter((r) => r.dato >= forrigeUka && r.dato < denneUka).map((r) => r.minutter));
  const beste = reg.reduce((b, r) => (!b || r.minutter < b.minutter ? r : b), null);
  const dagerPaRad = rekke(Object.keys(perDato), idag, leggTilDager);

  let endring = null;
  if (snittDenne != null && snittForrige) {
    const pst = Math.round(((snittDenne - snittForrige) / snittForrige) * 100);
    endring = pst;
  }

  return (
    <section>
      <h1 className="sidetittel">Min statistikk</h1>

      {reg.length === 0 ? (
        <p className="dempet midttekst">Du har ikke registrert noe ennå. Statistikken dukker opp her når du har lagt inn skjermtid.</p>
      ) : (
        <>
          <div className="nokkeltall">
            <div className="tall-kort">
              <span>Snitt denne uka</span>
              <strong>{formaterMinutter(snittDenne)}</strong>
              {endring != null && (
                <small className={endring <= 0 ? 'bra' : 'darlig'}>
                  {endring <= 0 ? '▼' : '▲'} {Math.abs(endring)} % fra forrige uke
                </small>
              )}
            </div>
            <div className="tall-kort">
              <span>Dager på rad</span>
              <strong>🔥 {dagerPaRad}</strong>
              <small>med registrering</small>
            </div>
            <div className="tall-kort">
              <span>Beste dag</span>
              <strong>{formaterMinutter(beste?.minutter)}</strong>
              <small>{beste && pentDato(beste.dato)}</small>
            </div>
            <div className="tall-kort">
              <span>Snitt forrige uke</span>
              <strong>{formaterMinutter(snittForrige)}</strong>
            </div>
          </div>

          <div className="kort">
            <h2>Siste 14 dager</h2>
            <div className="stolper" role="img" aria-label="Søylediagram over skjermtid de siste 14 dagene">
              {siste14.map((d) => {
                const v = perDato[d];
                return (
                  <div key={d} className="stolpe" title={`${pentDato(d)}: ${v != null ? formaterMinutter(v) : 'ikke registrert'}`}>
                    <div className="stolpe-spor">
                      {v != null ? <div className="stolpe-fyll" style={{ height: `${(v / maks) * 100}%` }} /> : <div className="stolpe-tom" />}
                    </div>
                    <span>{kortDag(d).slice(0, 2)}</span>
                  </div>
                );
              })}
            </div>
            <p className="forklaring">Lavere søyler er bedre. Prikker betyr at dagen ikke er registrert.</p>
          </div>
        </>
      )}
    </section>
  );
}
