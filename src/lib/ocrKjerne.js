// To-trinns lesing av et Skjermtid-skjermbilde med en Tesseract-arbeider.
// 1) Les hele bildet for å finne linjene (dato, «Daglig gjennomsnitt», osv.).
// 2) Les området der totalen står én gang til, som én linje med bare tall og t/min/h/m.
//    Tesseract bommer ofte på den store, fete totalen, og dette gjør den mye sikrere.
//    Stripen leses i to størrelser, og svaret de fleste lesingene er enige om, vinner.
// `beskjaer(topp, bunn, skala)` gir et nytt bilde med bare den stripen (canvas i nettleseren).
import { lesTid, tolkSkjermtid, erOverskrift } from './tolkSkjermtid.js';

const linjerFra = (data) =>
  (data.blocks ?? [])
    .flatMap((b) => b.paragraphs)
    .flatMap((p) => p.lines)
    .map((l) => ({ tekst: l.text.trim(), hoyde: l.bbox.y1 - l.bbox.y0, bbox: l.bbox }))
    .filter((l) => l.tekst);

// Verdien flest lesinger er enige om; ved uavgjort den første
function flertall(verdier) {
  const gyldige = verdier.filter((v) => v != null);
  let beste = null;
  let antall = 0;
  for (const v of gyldige) {
    const n = gyldige.filter((x) => x === v).length;
    if (n > antall) [beste, antall] = [v, n];
  }
  return beste;
}

export async function lesMedArbeider(w, bilde, beskjaer, idag) {
  await w.setParameters({ tessedit_pageseg_mode: '3', tessedit_char_whitelist: '' });
  const linjer = linjerFra((await w.recognize(bilde, {}, { blocks: true })).data);
  const svar = tolkSkjermtid(linjer, idag);

  // Finn overskriften over totalen og les området rett under den på nytt
  const i = linjer.findIndex((l) => erOverskrift(l.tekst));
  if (i >= 0) {
    const over = linjer[i];
    const h = over.hoyde;
    const neste = linjer.slice(i + 1).find((l) => l.bbox.y0 > over.bbox.y1 + h * 0.3 && lesTid(l.tekst) == null);
    const topp = over.bbox.y1 + Math.round(h * 0.1);
    const bunn = Math.min(neste ? neste.bbox.y0 : over.bbox.y1 + h * 3.5, over.bbox.y1 + h * 4);
    if (bunn - topp > h * 0.8) {
      await w.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: '0123456789tminh ' });
      const lesinger = [];
      for (const skala of [1, 0.5]) {
        const { data } = await w.recognize(await beskjaer(topp, bunn, skala));
        lesinger.push(lesTid(data.text.trim()));
      }
      svar.minutter = flertall([...lesinger, svar.minutter]) ?? svar.minutter;
    }
  }
  return svar;
}
