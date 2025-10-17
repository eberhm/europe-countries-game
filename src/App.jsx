import React, { useMemo, useState, useEffect, useRef } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";
import { geoCentroid } from "d3-geo";
import { feature as topojsonFeature } from "topojson-client";

// TopoJSON con los países de Europa del repo leakyMirror/map-of-europe
// Incluye países europeos (y también Israel); filtramos los no europeos vía ALLOWED_SET
const EUROPE_TOPO =
  "https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/TopoJSON/europe.topojson"; // leakyMirror/map-of-europe TopoJSON

// Paleta de colores
const COLORS = {
  base: "#c8f7c5", // verde pastel
  highlight: "#1e3a8a", // azul fuerte
  highlightLevels: ["#1e3a8a", "#2b4a9e", "#4f6dbd", "#7f97d8"], // se degrada con cada comprobación
  correct: ["#16a34a", "#22c55e", "#4ade80", "#86efac"], // 0,1,2,3 errores
  failed: "#ef4444", // rojo
  stroke: "#0f172a",
};

// ===== Normalizaciones de nombres procedentes del TopoJSON =====
// Algunas fuentes nombran ciertos países con variantes. Las convertimos a las claves usadas en ALLOWED_SET/COUNTRY_NAMES.
const NAME_NORMALIZATION_FIXES = {
  "Holy See": "Vatican",
  "San Marino": "SanMarino",
  "Russian Federation": "Russia",
  "Republic of Moldova": "Moldova",
  "Moldova, Republic of": "Moldova",
  "Czech Republic": "Czechia",
  // North Macedonia variants present in some TopoJSON builds
  "Macedonia": "North Macedonia",
  "Republic of North Macedonia": "North Macedonia",
  "Republic of Macedonia": "North Macedonia",
  "Macedonia, The Former Yugoslav Republic of": "North Macedonia",
  "The former Yugoslav Republic of Macedonia": "North Macedonia",
  "F.Y.R.O.M.": "North Macedonia",
  "FYROM": "North Macedonia",
  "UK": "United Kingdom",
};

// ===== I18N =====




const LANGS = [
  { code: "es", label: "Castellano", flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Flag_of_Spain.svg/32px-Flag_of_Spain.svg.png?20240115205409" },
  { code: "ca", label: "Català", flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Flag_of_Catalonia.svg/32px-Flag_of_Catalonia.svg.png?20110219075516" },
  { code: "val", label: "Valencià", flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Flag_of_the_Valencian_Community_%282x3%29.svg/32px-Flag_of_the_Valencian_Community_%282x3%29.svg.png?20170405094718" },
  { code: "eu", label: "Euskara", flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Flag_of_the_Basque_Country.svg/32px-Flag_of_the_Basque_Country.svg.png?20150905102146" },
  { code: "gl", label: "Galego", flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Flag_of_Galicia.svg/32px-Flag_of_Galicia.svg.png?20060226234755" },
  { code: "oc", label: "Aranés", flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Flag-Val_d%27Aran.svg/32px-Flag-Val_d%27Aran.svg.png?20241207210123" },
];

const UI = {
  es: {
    title: "Juego: Países de Europa",
    subtitle: "Escribe el nombre del país que está resaltado en azul.",
    points: "Puntos",
    right: "Acertados",
    wrong: "Errados",
    pending: "Pendientes",
    placeholder: "Escribe el nombre del país",
    check: "Comprobar",
    reset: "Reiniciar",
    rules: [
      "+8 puntos si aciertas a la primera. Cada error resta 2 puntos (mínimo 0 por país).",
      "Tras 4 errores se revela el nombre y el país queda en rojo.",
      "La intensidad del verde disminuye con cada error antes de acertar.",
      "Enter en blanco: zoom al país activo (×2, luego ×3, y a la tercera se resetea). No cuenta como intento.",
    ],
    correct: (g) => `¡Correcto! +${g} puntos`,
    reveal: (name) => `Se revela: ${name} (0 puntos)`,
    tryAgain: "No es correcto. ¡Inténtalo de nuevo!",
    attempts: "Intentos",
    languageLabel: "Idioma",
    languages: { es: "Castellano", ca: "Catalán", val: "Valenciano", eu: "Euskera", gl: "Gallego", oc: "Aranés" },
  },
  ca: {
    title: "Joc: Països d'Europa",
    subtitle: "Escriu el nom del país ressaltat en blau.",
    points: "Punts",
    right: "Encerts",
    wrong: "Errors",
    pending: "Pendents",
    placeholder: "Escriu el nom del país",
    check: "Comprovar",
    reset: "Reinicia",
    rules: [
      "+8 punts si encertes a la primera. Cada errada resta 2 punts (mínim 0 per país).",
      "Amb 4 errades es revela el nom i el país queda en roig.",
      "La intensitat del verd disminueix amb cada errada abans d'encertar.",
      "Enter en blanc: zoom al país actiu (×2, després ×3, i a la tercera es reinicia). No compta com a intent.",
    ],
    correct: (g) => `Correcte! +${g} punts`,
    reveal: (name) => `Es revela: ${name} (0 punts)`,
    tryAgain: "No és correcte. Torna-ho a intentar!",
    attempts: "Intents",
    languageLabel: "Idioma",
    languages: { es: "Castellà", ca: "Català", val: "Valencià", eu: "Basc", gl: "Gallec", oc: "Aranés" },
  },
  val: {
    title: "Joc: Països d'Europa",
    subtitle: "Escriu el nom del país ressaltat en blau.",
    points: "Punts",
    right: "Encerts",
    wrong: "Errors",
    pending: "Pendents",
    placeholder: "Escriu el nom del país",
    check: "Comprovar",
    reset: "Reinicia",
    rules: [
      "+8 punts si l'encertes a la primera. Cada error resta 2 punts (mínim 0 per país).",
      "Amb 4 errors es revela el nom i el país queda en roig.",
      "La intensitat del verd disminuïx amb cada error abans d'encertar.",
      "Enter buit: zoom al país actiu (×2, després ×3, i a la tercera es reinicia). No compta com a intent.",
    ],
    correct: (g) => `Correcte! +${g} punts`,
    reveal: (name) => `Es revela: ${name} (0 punts)`,
    tryAgain: "No és correcte. Torna-ho a intentar!",
    attempts: "Intents",
    languageLabel: "Idioma",
    languages: { es: "Castellà", ca: "Català", val: "Valencià", eu: "Euskera", gl: "Gallec", oc: "Aranés" },
  },
  eu: {
    title: "Jokoa: Europako Herrialdeak",
    subtitle: "Idatzi urdinez nabarmendutako herrialdearen izena.",
    points: "Puntuak",
    right: "Zuzenduak",
    wrong: "Hutsak",
    pending: "Zain",
    placeholder: "Idatzi herrialdearen izena",
    check: "Egiaztatu",
    reset: "Berrezarri",
    rules: [
      "+8 puntu lehen saiakeran asmatuz gero. Akats bakoitzak 2 puntu kendu (gutx. 0 herrialdeko).",
      "4 akatsekin izena agertzen da eta herrialdea gorriz gelditzen da.",
      "Berdearen intentsitatea gutxitzen da akats bakoitzean.",
      "Enter hutsik: zoom herrialde aktibora (×2, gero ×3, eta hirugarrenean berrezarri). Ez da saiakera kontatzen.",
    ],
    correct: (g) => `Zuzena! +${g} puntu`,
    reveal: (name) => `${name} agertzen da (0 puntu)`,
    tryAgain: "Ez da zuzena. Saiatu berriro!",
    attempts: "Saiakerak",
    languageLabel: "Hizkuntza",
    languages: { es: "Gaztelania", ca: "Katalana", val: "Valencià", eu: "Euskara", gl: "Galegoa", oc: "Aranesa" },
  },
  gl: {
    title: "Xogo: Países de Europa",
    subtitle: "Escribe o nome do país resaltado en azul.",
    points: "Puntos",
    right: "Acertos",
    wrong: "Erros",
    pending: "Pendentes",
    placeholder: "Escribe o nome do país",
    check: "Comprobar",
    reset: "Reiniciar",
    rules: [
      "+8 puntos se acertas á primeira. Cada erro resta 2 puntos (mín. 0 por país).",
      "Con 4 erros revélase o nome e o país queda en vermello.",
      "A intensidade do verde diminúe con cada erro.",
      "Enter en branco: zoom ao país activo (×2, logo ×3, e á terceira reiníciase). Non conta como intento.",
    ],
    correct: (g) => `Correcto! +${g} puntos`,
    reveal: (name) => `Revélase: ${name} (0 puntos)`,
    tryAgain: "Non é correcto. Téntao de novo!",
    attempts: "Intentos",
    languageLabel: "Lingua",
    languages: { es: "Castelán", ca: "Catalán", val: "Valenciano", eu: "Éuscaro", gl: "Galego", oc: "Aranés" },
  },
  oc: {
    title: "Jòc: Païses d'Euròpa",
    subtitle: "Picatz lo nom del país en blau.",
    points: "Punts",
    right: "Encèrts",
    wrong: "Errors",
    pending: "En espèra",
    placeholder: "Picatz lo nom del país",
    check: "Verificar",
    reset: "Reïnicializar",
    rules: [
      "+8 punts se l'ensag es just d'entrada. Cada error leva 2 punts (minim 0 per país).",
      "Amb 4 errors se revela lo nom e lo país demòra en roge.",
      "L'intensitat del verd demesís amb cada error.",
      "Enter vuèit: zoom al país actiu (×2, puèi ×3, e a la tresena se reïnicializa). Compta pas coma ensag.",
    ],
    correct: (g) => `Corrècte! +${g} punts`,
    reveal: (name) => `Se revela: ${name} (0 punts)`,
    tryAgain: "Es pas corrècte. Tornatz ensajar!",
    attempts: "Ensages",
    languageLabel: "Lenga",
    languages: { es: "Castelhan", ca: "Catalan", val: "Valencian", eu: "Basc", gl: "Galèc", oc: "Aranés" },
  },
};

// Country names per language (normalized). Only selected language is accepted.
// Para brevedad, val (valencià) reutiliza el mismo conjunto que ca.
const COUNTRY_NAMES = {
  es: {
    "Albania": ["albania"],
    "Andorra": ["andorra"],
    "Austria": ["austria"],
    "Belarus": ["bielorrusia", "belarus"],
    "Belgium": ["belgica", "bélgica"],
    "Bosnia and Herzegovina": ["bosnia y herzegovina", "bosnia"],
    "Bulgaria": ["bulgaria"],
    "Croatia": ["croacia"],
    "Cyprus": ["chipre"],
    "Czechia": ["chequia", "republica checa", "república checa"],
    "Denmark": ["dinamarca"],
    "Estonia": ["estonia"],
    "Finland": ["finlandia"],
    "France": ["francia"],
    "Germany": ["alemania"],
    "Greece": ["grecia"],
    "Hungary": ["hungria", "hungría"],
    "Iceland": ["islandia"],
    "Ireland": ["irlanda"],
    "Italy": ["italia"],
    "Latvia": ["letonia", "letonía"],
    "Liechtenstein": ["liechtenstein", "lichtenstein"],
    "Lithuania": ["lituania"],
    "Luxembourg": ["luxemburgo"],
    "Malta": ["malta"],
    "Moldova": ["moldavia", "moldova"],
    "Monaco": ["monaco", "mónaco"],
    "Montenegro": ["montenegro"],
    "Netherlands": ["paises bajos", "países bajos", "holanda"],
    "North Macedonia": ["macedonia del norte", "macedonia"],
    "Norway": ["noruega"],
    "Poland": ["polonia"],
    "Portugal": ["portugal"],
    "Romania": ["rumania", "rumanía"],
    "Russia": ["rusia"],
    "SanMarino": ["san marino"],
    "Serbia": ["serbia"],
    "Slovakia": ["eslovaquia"],
    "Slovenia": ["eslovenia"],
    "Spain": ["espana", "españa"],
    "Sweden": ["suecia"],
    "Switzerland": ["suiza"],
    "Ukraine": ["ucrania"],
    "United Kingdom": ["reino unido", "gran bretana", "gran bretaña", "uk", "inglaterra"],
    "Vatican": ["ciudad del vaticano", "vaticano"],
    "Kosovo": ["kosovo"],
  },
  ca: {
    "Albania": ["albània", "albania"],
    "Andorra": ["andorra"],
    "Austria": ["àustria", "austria"],
    "Belarus": ["bielorússia", "belarús"],
    "Belgium": ["bèlgica", "belgica"],
    "Bosnia and Herzegovina": ["bòsnia i hercegovina", "bòsnia"],
    "Bulgaria": ["bulgària", "bulgaria"],
    "Croatia": ["croàcia", "croacia"],
    "Cyprus": ["xipre"],
    "Czechia": ["txèquia", "republica txeca", "república txeca"],
    "Denmark": ["dinamarca"],
    "Estonia": ["estònia", "estonia"],
    "Finland": ["finlàndia", "finlandia"],
    "France": ["frança"],
    "Germany": ["alemanya"],
    "Greece": ["grècia"],
    "Hungary": ["hongria"],
    "Iceland": ["islàndia", "islandia"],
    "Ireland": ["irlanda"],
    "Italy": ["itàlia", "italia"],
    "Latvia": ["letonia"],
    "Liechtenstein": ["liechtenstein"],
    "Lithuania": ["lituània"],
    "Luxembourg": ["luxemburg"],
    "Malta": ["malta"],
    "Moldova": ["moldàvia"],
    "Monaco": ["mònaco", "monaco"],
    "Montenegro": ["montenegro"],
    "Netherlands": ["països baixos", "holanda"],
    "North Macedonia": ["macedònia del nord", "macedònia"],
    "Norway": ["noruega"],
    "Poland": ["polònia"],
    "Portugal": ["portugal"],
    "Romania": ["romania", "romanía"],
    "Russia": ["rússia", "russia"],
    "SanMarino": ["san marino"],
    "Serbia": ["sèrbia", "serbia"],
    "Slovakia": ["eslovàquia"],
    "Slovenia": ["eslovènia"],
    "Spain": ["espanya"],
    "Sweden": ["suècia"],
    "Switzerland": ["suïssa", "suissa"],
    "Ukraine": ["ucraina"],
    "United Kingdom": ["regne unit"],
    "Vatican": ["ciutat del vaticà", "vaticà"],
    "Kosovo": ["kosovo"],
  },
  val: "__SAME_AS_CA__",
  eu: {
    "Albania": ["albania"],
    "Andorra": ["andorra"],
    "Austria": ["austria"],
    "Belarus": ["bielorrusia", "belarusia"],
    "Belgium": ["belgika"],
    "Bosnia and Herzegovina": ["bosnia-herzegovina", "bosnia"],
    "Bulgaria": ["bulgaria"],
    "Croatia": ["kroazia"],
    "Cyprus": ["zipre"],
    "Czechia": ["txekia"],
    "Denmark": ["danimarka"],
    "Estonia": ["estonia"],
    "Finland": ["finlandia"],
    "France": ["frantzia"],
    "Germany": ["alemania"],
    "Greece": ["grezia"],
    "Hungary": ["hungaria"],
    "Iceland": ["islandia"],
    "Ireland": ["irlanda"],
    "Italy": ["italia"],
    "Latvia": ["letonia"],
    "Liechtenstein": ["liechtenstein"],
    "Lithuania": ["lituania"],
    "Luxembourg": ["luxenburgo"],
    "Malta": ["malta"],
    "Moldova": ["moldavia"],
    "Monaco": ["monako"],
    "Montenegro": ["montenegro"],
    "Netherlands": ["herbehereak", "holanda"],
    "North Macedonia": ["ipar mazidonia", "mazedonia"],
    "Norway": ["norvegia"],
    "Poland": ["polonia"],
    "Portugal": ["portugal"],
    "Romania": ["errumania"],
    "Russia": ["errusia"],
    "SanMarino": ["san marino"],
    "Serbia": ["serbia"],
    "Slovakia": ["eslovakia"],
    "Slovenia": ["eslovenia"],
    "Spain": ["espainia"],
    "Sweden": ["suedia"],
    "Switzerland": ["suitza"],
    "Ukraine": ["ukraina"],
    "United Kingdom": ["erresuma batua"],
    "Vatican": ["vatikanoa"],
    "Kosovo": ["kosovo"],
  },
  gl: {
    "Albania": ["albania"],
    "Andorra": ["andorra"],
    "Austria": ["austria"],
    "Belarus": ["bielorrusia", "belarus"],
    "Belgium": ["bélxica", "belxica"],
    "Bosnia and Herzegovina": ["bosnia e hercegovina", "bosnia"],
    "Bulgaria": ["bulgaria"],
    "Croatia": ["croacia"],
    "Cyprus": ["chipre"],
    "Czechia": ["chequia", "república checa"],
    "Denmark": ["dinamarca"],
    "Estonia": ["estonia"],
    "Finland": ["finlandia"],
    "France": ["francia"],
    "Germany": ["alemania"],
    "Greece": ["grecia"],
    "Hungary": ["hungría", "hungria"],
    "Iceland": ["islandia"],
    "Ireland": ["irlanda"],
    "Italy": ["italia"],
    "Latvia": ["letonia"],
    "Liechtenstein": ["liechtenstein"],
    "Lithuania": ["lituania"],
    "Luxembourg": ["luxemburgo"],
    "Malta": ["malta"],
    "Moldova": ["moldavia"],
    "Monaco": ["mónaco", "monaco"],
    "Montenegro": ["montenegro"],
    "Netherlands": ["países baixos", "holanda"],
    "North Macedonia": ["macedonia do norte", "macedonia"],
    "Norway": ["noruega"],
    "Poland": ["polonia"],
    "Portugal": ["portugal"],
    "Romania": ["romanía", "romania"],
    "Russia": ["rusia"],
    "SanMarino": ["san marino"],
    "Serbia": ["serbia"],
    "Slovakia": ["eslovaquia"],
    "Slovenia": ["eslovenia"],
    "Spain": ["españa"],
    "Sweden": ["suecia"],
    "Switzerland": ["suíza", "suiza"],
    "Ukraine": ["ucraina"],
    "United Kingdom": ["reino unido"],
    "Vatican": ["cidade do vaticano", "vaticano"],
    "Kosovo": ["kosovo"],
  },
  oc: {
    "Albania": ["albania"],
    "Andorra": ["andòrra", "andorra"],
    "Austria": ["àustria"],
    "Belarus": ["bielorussia", "belarús"],
    "Belgium": ["belgica"],
    "Bosnia and Herzegovina": ["bòsnia e ercegovina", "bòsnia"],
    "Bulgaria": ["bulgaria"],
    "Croatia": ["croàcia"],
    "Cyprus": ["chipre"],
    "Czechia": ["chèquia", "republica chèca"],
    "Denmark": ["danemarc"],
    "Estonia": ["estònia"],
    "Finland": ["finlàndia"],
    "France": ["frança"],
    "Germany": ["alemanha", "alemanya"],
    "Greece": ["grècia"],
    "Hungary": ["ongria"],
    "Iceland": ["islàndia"],
    "Ireland": ["irlanda"],
    "Italy": ["itàlia"],
    "Latvia": ["letonia"],
    "Liechtenstein": ["liechtenstein"],
    "Lithuania": ["lituània"],
    "Luxembourg": ["luxemborg"],
    "Malta": ["malta"],
    "Moldova": ["moldàvia"],
    "Monaco": ["mónegue", "monaco"],
    "Montenegro": ["montenegro"],
    "Netherlands": ["païses basses", "holanda"],
    "North Macedonia": ["macedònia del nòrd", "macedònia"],
    "Norway": ["norvègia"],
    "Poland": ["polonha"],
    "Portugal": ["portugal"],
    "Romania": ["romania"],
    "Russia": ["russia"],
    "SanMarino": ["sant marin"],
    "Serbia": ["serbia"],
    "Slovakia": ["eslovàquia"],
    "Slovenia": ["eslovènia"],
    "Spain": ["espanha"],
    "Sweden": ["suècia"],
    "Switzerland": ["soïssa", "suïssa"],
    "Ukraine": ["ucraina"],
    "United Kingdom": ["reialme unit"],
    "Vatican": ["vila del vatican", "vatican"],
    "Kosovo": ["kosovo"],
  },
};

// Normaliza cadenas para comparar (quita acentos, pasa a minúsculas y recorta espacios)
export const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

function titleCase(s) {
  return (s || "").split(" ").map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}

function localizedCountryName(englishName, lang) {
  const dataset = COUNTRY_NAMES[lang] === "__SAME_AS_CA__" ? COUNTRY_NAMES["ca"] : COUNTRY_NAMES[lang];
  const aliases = dataset?.[englishName];
  if (aliases && aliases.length) return titleCase(aliases[0]);
  return englishName; // fallback
}

// Conjunto de países a considerar en el juego (según aparecen en el topojson)
const ALLOWED_SET = new Set([
  "Albania","Andorra","Austria","Belarus","Belgium","Bosnia and Herzegovina","Bulgaria","Croatia","Cyprus","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Ireland","Italy","Latvia","Liechtenstein","Lithuania","Luxembourg","Malta","Moldova","Monaco","Montenegro","Netherlands","North Macedonia","Norway","Poland","Portugal","Romania","Russia","SanMarino","Serbia","Slovakia","Slovenia","Spain","Sweden","Switzerland","Ukraine","United Kingdom","Vatican","Kosovo",
]);

// Zoom levels for specific countries (default is 1 for others)
const COUNTRY_ZOOM_LEVELS = {
  "SanMarino": 4,
  "Vatican": 4,
  "Liechtenstein": 4,
  "Andorra": 4,
  "Malta": 4,
  "Cyprus": 3,
  "Monaco": 6,
  "Luxembourg": 2
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Exportamos para tests (por idioma)
export const matchesName = (countryName, userText, lang = "es") => {
  const fixed = NAME_NORMALIZATION_FIXES[countryName] || countryName;
  const dataset = COUNTRY_NAMES[lang] === "__SAME_AS_CA__" ? COUNTRY_NAMES["ca"] : COUNTRY_NAMES[lang];
  const aliases = dataset?.[fixed] || [];
  const candidate = norm(userText);
  return aliases.some((a) => norm(a) === candidate);
};

function useOutsideClick(ref, onClickOutside) {
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClickOutside?.();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onClickOutside]);
}

function LanguageSelect({ lang, setLang }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  useOutsideClick(wrapRef, () => setOpen(false));

  const current = LANGS.find((l) => l.code === lang) || LANGS[0];
  const renderLabel = (code, curLang) => UI[curLang]?.languages?.[code] || code;

  return (
    <div className="relative" ref={wrapRef}>
      <label className="text-xs text-slate-500 block mb-1">{UI[lang].languageLabel}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border shadow-sm hover:bg-slate-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <img src={current.flag} alt="flag" className="w-5 h-5 rounded-sm" />
          <span>{renderLabel(current.code, lang)}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"></path></svg>
      </button>
      {open && (
        <ul role="listbox" tabIndex={-1} className="absolute z-10 mt-1 w-full bg-white border rounded-2xl shadow">
          {LANGS.map((l) => (
            <li
              key={l.code}
              role="option"
              aria-selected={lang===l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 ${lang===l.code?"bg-sky-50":""}`}
            >
              <img src={l.flag} alt="flag" className="w-5 h-5 rounded-sm" />
              <span>{renderLabel(l.code, lang)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  const mapRef = useRef(null);
  const [countries, setCountries] = useState([]); // {id, name, fixedName, centroid}
  const [order, setOrder] = useState([]); // índices de countries
  const [idx, setIdx] = useState(0); // índice actual en order
  const [errors, setErrors] = useState(0); // errores del país actual (0..4)
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hovered, setHovered] = useState(null); // país con hover
  const [autoTooltipName, setAutoTooltipName] = useState(null); // tooltip auto 5s tras acierto/error
  const [statusByName, setStatusByName] = useState({}); // nombre fijo -> {state:'pending'|'ok'|'fail', errors}
  const [message, setMessage] = useState("");
  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState([15, 50]);
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  const [lang, setLang] = useState(() => {
    const n = (typeof navigator !== "undefined" && navigator.language) ? navigator.language.toLowerCase() : "es";
    if (n.includes("valenc")) return "val";
    if (n.startsWith("ca")) return "ca";
    if (n.startsWith("eu")) return "eu";
    if (n.startsWith("gl")) return "gl";
    if (n.startsWith("oc")) return "oc";
    return "es";
  });

  // ResizeObserver para ajustar el mapa al card
  useEffect(() => {
    if (!mapRef.current) return;
    const el = mapRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setMapSize({ w: Math.max(100, cr.width), h: Math.max(200, cr.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect(); // limpieza
  }, []);

  // Carga y preparación de países desde el TopoJSON
  useEffect(() => {
    fetch(EUROPE_TOPO)
      .then((r) => r.json())
      .then((topo) => {
        const objects = topo.objects[Object.keys(topo.objects)[0]]; // primer objeto
        const fc = topojsonFeature(topo, objects);
        const list = fc.features
          .filter((f) => f.geometry && f.geometry.coordinates && f.geometry.coordinates.length > 0)
          .map((f) => {
            let name = f.properties?.NAME || f.properties?.name || f.properties?.ADMIN || "";
            if (NAME_NORMALIZATION_FIXES[name]) name = NAME_NORMALIZATION_FIXES[name];
            const centroid = geoCentroid(f.geometry);
            return { id: f.id || name, name, fixedName: name, centroid };
          })
          .filter((c) => ALLOWED_SET.has(c.fixedName));

        const initialOrder = shuffle(list.map((_, i) => i));
        const status = Object.fromEntries(list.map((c) => [c.fixedName, { state: "pending", errors: 0 }]));
        setCountries(list);
        setOrder(initialOrder);
        setStatusByName(status);
      });
  }, []);

  // Pequeños tests (no rompen la UI)
  useEffect(() => {
    try {
      console.assert(norm("  España  ") === "espana", "norm elimina acentos/espacios");
      console.assert(matchesName("Spain", "España", "es") === true, "alias ES→EN (es)");
      console.assert(matchesName("Germany", "alemanya", "ca") === true, "alias DE (ca)");
      console.assert(matchesName("France", "frantzia", "eu") === true, "alias FR (eu)");
      console.assert(matchesName("Spain", "españa", "gl") === true, "alias ES (gl)");
      // Comprobación de normalizaciones de nombre EN
      console.assert(matchesName("Holy See", "vaticano", "es") === true, "normalize Holy See→Vatican");
      console.assert(matchesName("San Marino", "san marino", "es") === true, "normalize San Marino→SanMarino");
      // Puntuación esperada: 8,6,4,2,0 por 0..4 errores
      const scoreByErrors = (e) => Math.max(8 - 2 * e, 0);
      console.assert(scoreByErrors(0) === 8, "score 0e");
      console.assert(scoreByErrors(1) === 6, "score 1e");
      console.assert(scoreByErrors(2) === 4, "score 2e");
      console.assert(scoreByErrors(3) === 2, "score 3e");
      console.assert(scoreByErrors(4) === 0, "score 4e");
    } catch (e) {}
  }, []);

  const current = useMemo(() => {
    if (!countries.length || idx >= order.length) return null;
    return countries[order[idx]];
  }, [countries, order, idx]);

  // Auto-zoom when current country changes
  useEffect(() => {
    if (!current) return;
    const zoomLevel = COUNTRY_ZOOM_LEVELS[current.fixedName] || 1;
    setMapZoom(zoomLevel);
    if (zoomLevel > 1 && current.centroid && Array.isArray(current.centroid)) {
      setMapCenter(current.centroid);
    } else {
      setMapCenter([15, 50]);
    }
  }, [current]);

  const pendingCount = useMemo(
    () => Object.values(statusByName).filter((s) => s.state === "pending").length,
    [statusByName]
  );

  // Escala dinámica del mapa según el tamaño del card
  const baseW = 1000, baseH = 650, baseScale = 900;
  const scaleFactor = useMemo(() => {
    if (!mapSize.w || !mapSize.h) return 1;
    return Math.min(mapSize.w / baseW, mapSize.h / baseH);
  }, [mapSize]);
  const projectionScale = Math.max(300, baseScale * scaleFactor);

  const matches = (countryName, text) => matchesName(countryName, text, lang);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!current) return;

    // Enter en blanco: zoom → zoom → reset (no cuenta como intento)
    if (norm(input) === "") {
      const countryDefaultZoom = COUNTRY_ZOOM_LEVELS[current.fixedName] || 1;
      const nextZoom = mapZoom === countryDefaultZoom ? countryDefaultZoom + 1 : mapZoom === countryDefaultZoom + 1 ? countryDefaultZoom + 2 : countryDefaultZoom;
      if (current.centroid && Array.isArray(current.centroid)) {
        setMapCenter(nextZoom === countryDefaultZoom ? (countryDefaultZoom > 1 ? current.centroid : [15, 50]) : current.centroid);
      }
      setMapZoom(nextZoom);
      return; // no cuenta como intento
    }

    if (matches(current.fixedName, input)) {
      const gained = Math.max(8 - 2 * errors, 0);
      setScore((s) => s + gained);
      setCorrectCount((c) => c + 1);
      setStatusByName((m) => ({ ...m, [current.fixedName]: { state: "ok", errors } }));
      setMessage(UI[lang].correct(gained));
      setAutoTooltipName(current.fixedName);
      setTimeout(() => setAutoTooltipName(null), 5000);
      setInput("");
      setErrors(0);
      setIdx((i) => i + 1);
    } else {
      const newErrors = errors + 1;
      setErrors(newErrors);
      if (newErrors >= 4) {
        setWrongCount((w) => w + 1);
        setStatusByName((m) => ({ ...m, [current.fixedName]: { state: "fail", errors: newErrors } }));
        setMessage(UI[lang].reveal(current.fixedName));
        setAutoTooltipName(current.fixedName);
        setTimeout(() => setAutoTooltipName(null), 5000);
        setInput("");
        setErrors(0);
        setIdx((i) => i + 1);
      } else {
        setInput("");
        setMessage(UI[lang].tryAgain);
      }
    }
  };

  const restart = () => {
    const orderNew = shuffle(countries.map((_, i) => i));
    setOrder(orderNew);
    setIdx(0);
    setErrors(0);
    setInput("");
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    const status = Object.fromEntries(countries.map((c) => [c.fixedName, { state: "pending", errors: 0 }]));
    setStatusByName(status);
    setMessage("");
    setMapZoom(1);
    setMapCenter([15, 50]);
  };

  const countryFill = (name) => {
    const st = statusByName[name];
    if (!st) return COLORS.base;
    if (st.state === "pending") return COLORS.base;
    if (st.state === "fail") return COLORS.failed;
    const idx = Math.min(st.errors, COLORS.correct.length - 1);
    return COLORS.correct[idx];
  };

  const isHighlighted = (name) => current && current.fixedName === name;

  return (
    <div className="min-h-screen bg-white text-slate-900 p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Columna izquierda: 25% ancho */}
        <aside className="md:col-span-1 flex flex-col gap-4">
          {/* Selector de idioma (select custom) */}
          <LanguageSelect lang={lang} setLang={setLang} />

          <div>
            <h1 className="text-2xl font-bold">{UI[lang].title}</h1>
            <p className="text-sm text-slate-600">{UI[lang].subtitle}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="px-3 py-2 rounded-2xl shadow border">
              <div className="text-xs text-slate-500">{UI[lang].points}</div>
              <div className="text-xl font-semibold">{score}</div>
            </div>
            <div className="px-3 py-2 rounded-2xl shadow border">
              <div className="text-xs text-slate-500">{UI[lang].right}</div>
              <div className="text-xl font-semibold">{correctCount}</div>
            </div>
            <div className="px-3 py-2 rounded-2xl shadow border">
              <div className="text-xs text-slate-500">{UI[lang].wrong}</div>
              <div className="text-xl font-semibold">{wrongCount}</div>
            </div>
            <div className="px-3 py-2 rounded-2xl shadow border">
              <div className="text-xs text-slate-500">{UI[lang].pending}</div>
              <div className="text-xl font-semibold">{pendingCount}</div>
            </div>
          </div>

          {/* Formulario */}
          <div className="flex flex-col gap-3">
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={UI[lang].placeholder}
                className="w-full px-4 py-3 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-4 py-3 rounded-2xl bg-sky-600 text-white shadow hover:bg-sky-700">
                  {UI[lang].check}
                </button>
                <button
                  type="button"
                  onClick={() => restart()}
                  className="px-4 py-3 rounded-2xl border shadow hover:bg-slate-50"
                >
                  {UI[lang].reset}
                </button>
              </div>
            </form>
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-sm text-slate-700"
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Instrucciones */}
          <div className="text-xs text-slate-500">
            <ul className="list-disc pl-5 space-y-1">
              {UI[lang].rules.map((r, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: r }} />
              ))}
            </ul>
          </div>
        </aside>

        {/* Columna derecha: 75% ancho (mapa) */}
        <main className="md:col-span-3">
          <div ref={mapRef} className="w-full h-[calc(100vh-2rem)] rounded-2xl border shadow-sm overflow-hidden">
            <ComposableMap
              projection="geoAzimuthalEqualArea"
              projectionConfig={{ rotate: [-15, -52, 0], scale: projectionScale }}
              width={mapSize.w || undefined}
              height={mapSize.h || undefined}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomableGroup center={mapCenter} zoom={mapZoom} maxZoom={8} minZoom={0.9} filterZoomEvent={(evt) => evt.type !== 'wheel'}>
                <Geographies geography={EUROPE_TOPO}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      let rawName = geo.properties?.NAME || geo.properties?.name || geo.properties?.ADMIN || "";
                      if (NAME_NORMALIZATION_FIXES[rawName]) rawName = NAME_NORMALIZATION_FIXES[rawName];
                      if (!ALLOWED_SET.has(rawName)) return null;
                      const highlighted = isHighlighted(rawName);
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={() => {
                            setHovered(rawName);
                          }}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            default: {
                              fill: highlighted
                                ? COLORS.highlightLevels[Math.min(errors, COLORS.highlightLevels.length - 1)]
                                : countryFill(rawName),
                              stroke: COLORS.stroke,
                              strokeWidth: highlighted ? 1.5 : 0.75,
                              outline: "none",
                            },
                            hover: {
                              fill: highlighted
                                ? COLORS.highlightLevels[Math.min(errors, COLORS.highlightLevels.length - 1)]
                                : countryFill(rawName),
                              stroke: COLORS.stroke,
                              strokeWidth: 1.2,
                              outline: "none",
                            },
                            pressed: {
                              fill: highlighted
                                ? COLORS.highlightLevels[Math.min(errors, COLORS.highlightLevels.length - 1)]
                                : countryFill(rawName),
                            },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
                {/* Tooltips */}
                <Geographies geography={EUROPE_TOPO}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      let rawName = geo.properties?.NAME || geo.properties?.name || geo.properties?.ADMIN || "";
                      if (NAME_NORMALIZATION_FIXES[rawName]) rawName = NAME_NORMALIZATION_FIXES[rawName];
                      if (!ALLOWED_SET.has(rawName)) return null;
                      const st = statusByName[rawName];
                      const isDone = st && st.state !== "pending";
                      const show = isDone && (hovered === rawName || autoTooltipName === rawName);
                      if (!show) return null;
                      const [cx, cy] = geoCentroid(geo.geometry);
                      const display = localizedCountryName(rawName, lang);
                      return (
                        <Marker key={`${geo.rsmKey}-tooltip`} coordinates={[cx, cy]}>
                          {(() => {
                            const attemptsUsed = st?.state === "ok" ? Math.min((st?.errors || 0) + 1, 4) : 4;
                            const ok = st?.state === "ok";
                            const bg = ok ? "#dcfce7" : "#fee2e2";
                            const fg = ok ? "#166534" : "#991b1b";
                            const icon = ok ? "✅" : "❌";
                            return (
                              <g transform="translate(-10, -32)" style={{ pointerEvents: "none" }}>
                                <rect x={0} y={0} rx={8} ry={8} width={200} height={44} fill={bg} opacity={0.95} stroke={fg} />
                                <text x={10} y={18} fontSize={13} fontWeight={700} fill={fg}>
                                  {icon} {display}
                                </text>
                                <text x={10} y={34} fontSize={12} fontWeight={500} fill="#1f2937">
                                  {UI[lang].attempts}: {attemptsUsed}/4
                                </text>
                              </g>
                            );
                          })()}
                        </Marker>
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>
        </main>
      </div>
    </div>
  );
}
