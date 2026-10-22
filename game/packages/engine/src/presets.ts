import { AXIAL_NEIGHBORS, hexCorners, tileId } from './geometry';
import { STANDARD_NUMBERS, hexagonCoords, redNumbersAdjacent } from './mapgen';
import { randInt, shuffle } from './rng';
import type { MapDef, MapPort, MapTile, PortKind, PortType, Terrain } from './types';

const ring = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;

/**
 * "Nebelwald": a forest ring around an inner lake with lumber harbours, a desert island in the
 * middle for the robber, and an outer ring of fog that hides everything except forest.
 */
export function fogForestMap(): MapDef {
  const forestRing: [Terrain, number][] = [
    ['forest', 5], ['forest', 9], ['hills', 10], ['forest', 6], ['forest', 3], ['pasture', 8],
    ['forest', 4], ['forest', 11], ['fields', 9], ['forest', 10], ['forest', 4], ['mountains', 5],
  ];
  // Under the fog: no forest at all, so the outer ring is where brick, wool, grain and ore come from.
  const underFog: [Terrain, number][] = [
    ['hills', 2], ['pasture', 3], ['fields', 4], ['mountains', 5], ['hills', 6], ['pasture', 8],
    ['fields', 9], ['mountains', 10], ['hills', 11], ['pasture', 12], ['fields', 3], ['mountains', 4],
    ['hills', 5], ['pasture', 6], ['fields', 8], ['mountains', 9], ['hills', 10], ['pasture', 11],
  ];
  const tiles: MapTile[] = [{ q: 0, r: 0, terrain: 'desert', number: null }];
  let i = 0;
  let j = 0;
  for (const c of hexagonCoords(3)) {
    if (ring(c.q, c.r) === 2) {
      const [terrain, number] = forestRing[i++];
      tiles.push({ ...c, terrain, number });
    } else if (ring(c.q, c.r) === 3) {
      const [terrain, number] = underFog[j++];
      tiles.push({ ...c, terrain, number, hidden: true });
    }
  }

  // Harbours on the lake shore: six, spread evenly around the lake, alternating lumber and 3:1.
  const land = new Set(tiles.map((t) => tileId(t.q, t.r)));
  const shore: { q: number; r: number; side: number; angle: number }[] = [];
  for (const t of tiles) {
    if (ring(t.q, t.r) !== 2) continue;
    AXIAL_NEIGHBORS.forEach(([dq, dr], side) => {
      const n = { q: t.q + dq, r: t.r + dr };
      if (ring(n.q, n.r) !== 1 || land.has(tileId(n.q, n.r))) return;
      shore.push({ q: t.q, r: t.r, side, angle: Math.atan2(1.5 * n.r, Math.sqrt(3) * (n.q + n.r / 2)) });
    });
  }
  shore.sort((a, b) => a.angle - b.angle);
  const ports: MapPort[] = [0, 1, 2, 3, 4, 5].map((i) => {
    const s = shore[Math.floor((i * shore.length) / 6)];
    return { q: s.q, r: s.r, side: s.side, type: i % 2 ? 'any' : 'lumber' };
  });

  return { name: 'Nebelwald', tiles, ports, fogReward: true };
}

type Land = Exclude<Terrain, 'fog'>;

const LETTER: Record<string, Land> = { W: 'forest', H: 'hills', P: 'pasture', A: 'fields', G: 'mountains', D: 'desert' };

interface DrawnSpec {
  name: string;
  /**
   * Rows north to south in odd-r offset layout (odd rows sit half a hex to the right).
   * W Wald, H Hügel, P Weide, A Acker, G Gebirge, D Wüste are tiles; around them `~` is sea
   * (or a lake) and `.` is the land of the neighbouring countries.
   */
  rows: string[];
  /**
   * Trading posts at a cell; the first listed side that fits is used (0 NE, 1 E, 2 SE, 3 SW, 4 W,
   * 5 NW). Harbours need a side facing the sea, the land kinds one facing a neighbouring country.
   */
  ports: { row: number; col: number; type: PortType; kind: PortKind; sides: number[] }[];
  labels: { row: number; col: number; text: string }[];
  /** Bridges from a cell (on an even row) straight down across one row of sea to the cell two rows below. */
  bridges?: { row: number; col: number }[];
  /** Flag stripes, top to bottom. */
  flag?: string[];
  seed: number;
}

/**
 * On a big board a plain reshuffle almost never keeps every 6 and 8 apart, so instead move each
 * red number that touches another onto a random tile where it touches none.
 */
function separateRedNumbers(tiles: MapTile[], rng: { rng: number }, name: string) {
  const byId = new Map(tiles.map((t) => [tileId(t.q, t.r), t]));
  const red = (t: MapTile | undefined) => t?.number === 6 || t?.number === 8;
  const touchesRed = (t: MapTile, except?: MapTile) =>
    AXIAL_NEIGHBORS.some(([dq, dr]) => {
      const nb = byId.get(tileId(t.q + dq, t.r + dr));
      return nb !== except && red(nb);
    });
  for (let guard = 0; redNumbersAdjacent(tiles); guard++) {
    if (guard > 2000) throw new Error(`${name}: could not place numbers`);
    const bad = tiles.find((t) => red(t) && touchesRed(t))!;
    const spots = tiles.filter((t) => t.number !== null && !red(t) && !touchesRed(t, bad));
    const spot = spots[randInt(rng, spots.length)];
    [bad.number, spot.number] = [spot.number, bad.number];
  }
}

/** A hand-drawn board: terrain exactly as drawn, numbers shuffled so 6 and 8 never touch. */
function drawnMap(spec: DrawnSpec): MapDef {
  const width = Math.max(...spec.rows.map((r) => r.length));
  // Keep the row offset even so odd rows stay the shifted ones after centring.
  const rowOffset = Math.floor(spec.rows.length / 4) * 2;
  const colOffset = Math.floor(width / 2);
  const at = (row: number, col: number) => {
    const r = row - rowOffset;
    return { q: col - colOffset - (r - (r & 1)) / 2, r };
  };

  const cells: { q: number; r: number; terrain: Land; label?: string }[] = [];
  const sea: string[] = [];
  const foreign: string[] = [];
  spec.rows.forEach((line, row) =>
    [...line].forEach((ch, col) => {
      const { q, r } = at(row, col);
      if (ch === '~') sea.push(tileId(q, r));
      else if (ch === '.') foreign.push(tileId(q, r));
      if (!LETTER[ch]) return;
      const label = spec.labels.find((l) => l.row === row && l.col === col)?.text;
      cells.push({ q, r, terrain: LETTER[ch], ...(label ? { label } : {}) });
    }),
  );

  const rng = { rng: spec.seed };
  const numbered = cells.filter((c) => c.terrain !== 'desert').length;
  const numbers = shuffle(rng, Array.from({ length: numbered }, (_, i) => STANDARD_NUMBERS[i % STANDARD_NUMBERS.length]));
  let n = 0;
  const tiles: MapTile[] = cells.map((c) => ({ ...c, number: c.terrain === 'desert' ? null : numbers[n++] }));
  separateRedNumbers(tiles, rng, spec.name);

  const land = new Set(tiles.map((t) => tileId(t.q, t.r)));
  const water = new Set(sea);
  const abroad = new Set(foreign);
  const ports: MapPort[] = spec.ports.map((p) => {
    const { q, r } = at(p.row, p.col);
    const facing = p.kind === 'harbor' ? water : abroad;
    const side = p.sides.find((s) => facing.has(tileId(q + AXIAL_NEIGHBORS[s][0], r + AXIAL_NEIGHBORS[s][1])));
    if (side === undefined || !land.has(tileId(q, r))) throw new Error(`${spec.name}: no ${p.kind === 'harbor' ? 'sea' : 'border'} for port at ${p.row},${p.col}`);
    return { q, r, side, type: p.type, kind: p.kind };
  });

  const bridges = (spec.bridges ?? []).map((b): [string, string] => {
    const { q, r } = at(b.row, b.col);
    const below = at(b.row + 2, b.col);
    if (!land.has(tileId(q, r)) || !land.has(tileId(below.q, below.r))) throw new Error(`${spec.name}: bridge at ${b.row},${b.col} needs land at both ends`);
    // The bottom corner of the upper cell and the top corner of the lower one, one edge apart.
    return [hexCorners(q, r)[3], hexCorners(below.q, below.r)[0]];
  });

  return { name: spec.name, tiles, ports, ...(bridges.length ? { bridges } : {}), surroundings: { sea, land: foreign }, ...(spec.flag ? { flag: spec.flag } : {}) };
}

/**
 * Germany, drawn after the physical map (one hex is about 80 km): North Sea and Baltic coasts,
 * the Lüneburg heath, the Harz and Sauerland (Brilon), Lusatia, the Erzgebirge, Franconian and
 * Bavarian clay, the Black Forest with three forests, Lake Constance and the Alps.
 */
export function germanyMap(): MapDef {
  return drawnMap({
    name: 'Deutschland',
    flag: ['#000000', '#dd0000', '#ffce00'],
    rows: [
      '~~~...~~~~', //  Nordsee, Dänemark, Ostsee
      '~~~P~~~~~~', //  Schleswig
      '~~~PA~AW..', //  Dithmarschen, Holstein, Rostock, Vorpommern
      '.PPAWAWA..', //  Ostfriesland, Oldenburg, Hamburg, Sachsenwald, Schwerin, Seenplatte, Uckermark
      '..HHDPWA..', //  Emsland, Bremen, Lüneburger Heide, Altmark, Havelland, Berlin
      '.APHAAPP..', //  Münster, Osnabrück, Hannover, Braunschweig, Magdeburg, Fläming, Spreewald
      '.AHGGPAHW.', //  Düsseldorf, Dortmund, Brilon, Harz, Halle, Leipzig, Lausitz, Görlitz
      'HAWWPHHG..', //  Aachen, Köln, Westerwald, Kassel, Erfurt, Jena, Chemnitz, Dresden
      '.GWAWG....', //  Eifel, Taunus, Frankfurt, Thüringer Wald, Erzgebirge
      '.WAPHH....', //  Pfälzerwald, Pfalz, Würzburg, Nürnberg, Oberpfalz
      '.GWPGHW...', //  Saarland, Nordschwarzwald, Stuttgart, Schwäbische Alb, Regensburg, Bayerischer Wald
      '..WPAAP...', //  Schwarzwald, Alb, Augsburg, München, Passau
      '..W~GGG...', //  Freiburg, Bodensee (der einzige See im Süden), Allgäu, Zugspitze, Berchtesgaden
      '..........', //  Schweiz, Österreich
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 3, col: 2, type: 'grain', kind: 'harbor', sides: [5, 0] }, // Norden: Bremerhaven
      { row: 2, col: 6, type: 'any', kind: 'harbor', sides: [0, 5, 4] }, // Norden: Rostock
      { row: 6, col: 8, type: 'brick', kind: 'treehouse', sides: [1, 0, 2] }, // Osten: Görlitz, Lausitzer Wald
      { row: 8, col: 5, type: 'ore', kind: 'gondola', sides: [1, 2, 0] }, // Osten: Fichtelberg im Erzgebirge
      { row: 12, col: 6, type: 'any', kind: 'gondola', sides: [2, 1, 3] }, // Süden: Berchtesgaden
      { row: 12, col: 4, type: 'wool', kind: 'harbor', sides: [4] }, // Süden: Lindau am Bodensee
      { row: 11, col: 2, type: 'lumber', kind: 'treehouse', sides: [4, 3] }, // Westen: Schwarzwald
      { row: 7, col: 0, type: 'any', kind: 'mine', sides: [4, 3, 5] }, // Westen: Aachener Revier
    ],
    labels: [
      { row: 2, col: 4, text: 'Kiel' },
      { row: 2, col: 6, text: 'Rostock' },
      { row: 3, col: 1, text: 'Emden' },
      { row: 3, col: 3, text: 'Hamburg' },
      { row: 4, col: 3, text: 'Bremen' },
      { row: 4, col: 4, text: 'Heide' },
      { row: 4, col: 7, text: 'Berlin' },
      { row: 5, col: 1, text: 'Münster' },
      { row: 5, col: 3, text: 'Hannover' },
      { row: 5, col: 5, text: 'Magdeburg' },
      { row: 6, col: 1, text: 'Düsseldorf' },
      { row: 6, col: 2, text: 'Dortmund' },
      { row: 6, col: 3, text: 'Brilon' },
      { row: 6, col: 4, text: 'Harz' },
      { row: 6, col: 6, text: 'Leipzig' },
      { row: 7, col: 0, text: 'Aachen' },
      { row: 7, col: 1, text: 'Köln' },
      { row: 7, col: 3, text: 'Kassel' },
      { row: 7, col: 4, text: 'Erfurt' },
      { row: 7, col: 6, text: 'Chemnitz' },
      { row: 7, col: 7, text: 'Dresden' },
      { row: 8, col: 3, text: 'Frankfurt' },
      { row: 8, col: 5, text: 'Erzgebirge' },
      { row: 9, col: 3, text: 'Würzburg' },
      { row: 9, col: 4, text: 'Nürnberg' },
      { row: 10, col: 1, text: 'Saarbrücken' },
      { row: 10, col: 2, text: 'Baden-Baden' },
      { row: 10, col: 3, text: 'Stuttgart' },
      { row: 10, col: 5, text: 'Regensburg' },
      { row: 11, col: 2, text: 'Schwarzwald' },
      { row: 11, col: 4, text: 'Augsburg' },
      { row: 11, col: 5, text: 'München' },
      { row: 11, col: 6, text: 'Passau' },
      { row: 12, col: 2, text: 'Freiburg' },
      { row: 12, col: 5, text: 'Zugspitze' },
    ],
    seed: 49,
  });
}

/**
 * Ukraine, drawn after the physical map (one hex is about 95 km): Polissia forests with a few
 * sheep in the north, the Carpathians and the Lviv coal in the west, granite and iron along the
 * Dnipro (Zhytomyr, Kryvyi Rih, Nikopol), wheat steppe, the Donbas in the east, Odesa with the
 * Budjak strip down to the Danube, the Oleshky sands, and Crimea as an island with all five
 * resources, joined to the mainland by one bridge at Perekop.
 */
export function ukraineMap(): MapDef {
  return drawnMap({
    name: 'Ukraine',
    flag: ['#0057b7', '#ffd700'],
    rows: [
      '.................', //  Belarus, Russland
      '..WW...WPW.......', //  Wolyn, Polissja, Tschernihiw
      '..WPWGHWAWP......', //  Kowel, Riwne, Polissja, Owrutsch, Kyjiw-Nord, Tschernihiw, Nischyn, Sumy
      '..GWAGAPAHPA.....', //  Tscherwonohrad, Riwne, Schytomyr-Süd, Schytomyr, Kyjiw, Perejaslaw, Poltawa-Nord, Sumy-Süd, Charkiw
      '.HAHPAHWPAHPHHW..', //  Lwiw-West, Lwiw, Ternopil, Chmelnyzkyj, Winnyzja-Nord, Bila Zerkwa, Tscherkassy, Poltawa, Charkiw, Luhansk-Nord
      '.GWPAHGPGHAGHG...', //  Beskiden, Iwano-Frankiwsk, Podilsk, Winnyzja, Uman, Kropywnyzkyj, Dnipro, Pawlohrad, Luhansk
      '.WGP..APAGHAPGH..', //  Uschhorod, Howerla, Czernowitz, (Moldau), Odesa-Nord, Krywyj Rih, Donezk
      '......PAAGHAG....', //  Balta, Mykolajiw-Nord, Nikopol, Saporischschja, Mariupol
      '.......APADP~~...', //  Odesa, Mykolajiw, Cherson, Oleschky-Sande, Melitopol, Asowsches Meer
      '......P~~~~~~~...', //  Budschak, Schwarzes Meer, Siwasch
      '......H~~APH~....', //  Ismajil, Krim: Jewpatorija, Simferopol, Kertsch
      '.....~~~~GW~~....', //  Sewastopol, Jalta
      '.....~~~~~~~~~...', //  Schwarzes Meer
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 3, type: 'lumber', kind: 'treehouse', sides: [5, 0] }, // Norden: Polissja-Wald in Wolyn
      { row: 1, col: 9, type: 'any', kind: 'treehouse', sides: [0, 5, 1] }, // Norden: Polissja bei Tschernihiw
      { row: 4, col: 13, type: 'ore', kind: 'mine', sides: [0, 1, 5] }, // Osten: Luhansker Kohle
      { row: 6, col: 14, type: 'brick', kind: 'mine', sides: [1, 2, 0] }, // Osten: Donbas
      { row: 11, col: 9, type: 'any', kind: 'harbor', sides: [3, 4, 2] }, // Süden: Sewastopol
      { row: 8, col: 7, type: 'grain', kind: 'harbor', sides: [2, 3] }, // Süden: Odesa, Getreidehafen
      { row: 6, col: 2, type: 'wool', kind: 'gondola', sides: [3, 2] }, // Westen: Howerla, Huzulen-Schafe
      { row: 3, col: 2, type: 'any', kind: 'gondola', sides: [4, 5, 3] }, // Westen: Grenze zu Polen
    ],
    labels: [
      { row: 1, col: 7, text: 'Tschernihiw' },
      { row: 2, col: 10, text: 'Sumy' },
      { row: 3, col: 5, text: 'Schytomyr' },
      { row: 3, col: 6, text: 'Kyjiw' },
      { row: 3, col: 11, text: 'Charkiw' },
      { row: 4, col: 2, text: 'Lwiw' },
      { row: 4, col: 8, text: 'Tscherkassy' },
      { row: 4, col: 10, text: 'Poltawa' },
      { row: 5, col: 2, text: 'Iwano-Frankiwsk' },
      { row: 5, col: 5, text: 'Winnyzja' },
      { row: 5, col: 10, text: 'Dnipro' },
      { row: 5, col: 13, text: 'Luhansk' },
      { row: 6, col: 1, text: 'Uschhorod' },
      { row: 6, col: 3, text: 'Czernowitz' },
      { row: 6, col: 9, text: 'Krywyj Rih' },
      { row: 6, col: 13, text: 'Donezk' },
      { row: 7, col: 10, text: 'Saporischschja' },
      { row: 7, col: 12, text: 'Mariupol' },
      { row: 8, col: 7, text: 'Odesa' },
      { row: 8, col: 8, text: 'Mykolajiw' },
      { row: 8, col: 9, text: 'Cherson' },
      { row: 8, col: 11, text: 'Melitopol' },
      { row: 10, col: 6, text: 'Ismajil' },
      { row: 10, col: 10, text: 'Simferopol' },
      { row: 10, col: 11, text: 'Kertsch' },
      { row: 11, col: 9, text: 'Sewastopol' },
      { row: 11, col: 10, text: 'Jalta' },
    ],
    bridges: [{ row: 8, col: 9 }], // Perekop: Cherson to the Crimea
    seed: 1991,
  });
}

/** Fixed boards anyone can pick. 'standard' is generated fresh for every game. */
export const PRESET_MAPS = {
  deutschland: germanyMap,
  ukraine: ukraineMap,
  nebelwald: fogForestMap,
} as const;
