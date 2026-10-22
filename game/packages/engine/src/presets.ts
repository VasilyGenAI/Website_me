import { AXIAL_NEIGHBORS, hexCorners, tileId, topology } from './geometry';
import { hexagonCoords } from './mapgen';
import { breakClusters, dealNumbers } from './balance';
import { shuffle } from './rng';
import type { FlagDef, MapDef, MapPort, MapTile, PortKind, PortType, Terrain } from './types';

const ring = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;

/**
 * "Nebelwald": a broad belt of forest (two rings) round an inner lake with lumber harbours, a
 * desert island in the middle for the robber, and an outer ring of fog that hides everything
 * except forest - and somewhere one gold field.
 */
export function fogForestMap(): MapDef {
  const rng = { rng: 2024 };
  const forestBelt = (n: number, others: Terrain[]) => shuffle(rng, [...Array<Terrain>(n - others.length).fill('forest'), ...others]);
  const inner = forestBelt(12, ['hills', 'pasture', 'fields', 'mountains']);
  const outer = forestBelt(18, ['hills', 'pasture', 'pasture', 'fields', 'fields', 'mountains']);
  // Under the fog: no forest at all, so the outer ring is where brick, wool, grain and ore come from.
  const underFog = shuffle(rng, [
    ...(['hills', 'pasture', 'fields'] as Terrain[]).flatMap((t) => Array<Terrain>(6).fill(t)),
    ...Array<Terrain>(5).fill('mountains'),
    'gold' as Terrain,
  ]);
  const tiles: MapTile[] = [{ q: 0, r: 0, terrain: 'desert', number: null }];
  let i = 0;
  let j = 0;
  let k = 0;
  for (const c of hexagonCoords(4)) {
    const ringNo = ring(c.q, c.r);
    if (ringNo === 2) tiles.push({ ...c, terrain: inner[i++], number: null });
    else if (ringNo === 3) tiles.push({ ...c, terrain: outer[j++], number: null });
    else if (ringNo === 4) tiles.push({ ...c, terrain: underFog[k++], number: null, hidden: true });
  }
  const numbered = dealNumbers(tiles, rng);

  // Harbours on the lake shore: six, spread evenly around the lake, alternating lumber and 3:1.
  const land = new Set(numbered.map((t) => tileId(t.q, t.r)));
  const shore: { q: number; r: number; side: number; angle: number }[] = [];
  for (const t of numbered) {
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

  return { name: 'Nebelwald', tiles: numbered, ports, fogReward: true, shuffleNumbers: true, waterLabels: [{ q: 0, r: -1, text: 'Nebelsee' }] };
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
  /** Names of seas and lakes, written on that water cell. */
  waters?: { row: number; col: number; text: string }[];
  /** Bridges along one side of a sea cell whose two corners are both on land (0 NE … 5 NW, as for ports). */
  bridges?: { row: number; col: number; side: number }[];
  flag?: FlagDef;
  seed: number;
}

/**
 * A hand-drawn board: terrain as drawn (blocks of more than three equal tiles are broken up),
 * numbers dealt afresh for every game.
 */
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

  // No block of more than three equal tiles, then numbers dealt by the same rules as every game.
  const spread = breakClusters(cells.map((c) => ({ ...c, number: null })), 3, (t) => t.terrain === 'desert');
  const tiles: MapTile[] = dealNumbers(spread, { rng: spec.seed });

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

  const landCorners = new Set(tiles.flatMap((t) => hexCorners(t.q, t.r)));
  const bridges = (spec.bridges ?? []).map((b): [string, string] => {
    const { q, r } = at(b.row, b.col);
    const cs = hexCorners(q, r);
    const ends: [string, string] = [cs[b.side], cs[(b.side + 1) % 6]];
    if (!water.has(tileId(q, r)) || !ends.every((v) => landCorners.has(v))) throw new Error(`${spec.name}: bridge at ${b.row},${b.col} needs sea with land at both ends`);
    return ends;
  });

  return {
    name: spec.name,
    tiles,
    ports,
    ...(bridges.length ? { bridges } : {}),
    surroundings: { sea, land: foreign },
    ...(spec.flag ? { flag: spec.flag } : {}),
    ...(spec.waters ? { waterLabels: spec.waters.map((w) => ({ ...at(w.row, w.col), text: w.text })) } : {}),
    shuffleNumbers: true,
  };
}

/**
 * Germany, drawn after the physical map (one hex is about 80 km): North Sea and Baltic coasts,
 * the Lüneburg heath, the Harz and Sauerland (Brilon), Lusatia, the Erzgebirge, Franconian and
 * Bavarian clay, the Black Forest with three forests, Lake Constance and the Alps.
 */
export function germanyMap(): MapDef {
  return drawnMap({
    name: 'Deutschland',
    flag: { colors: ['#000000', '#dd0000', '#ffce00'] },
    rows: [
      '~~~...~~~~', //  Nordsee, Dänemark, Ostsee
      '~~~P~~~~~~', //  Schleswig
      '~~~PW~AW..', //  Dithmarschen, Holstein, Rostock, Vorpommern
      '.APAWAWA..', //  Ostfriesland, Oldenburg, Hamburg, Sachsenwald, Schwerin, Seenplatte, Uckermark
      '..HHDPWA..', //  Emsland, Bremen, Lüneburger Heide, Altmark, Havelland, Berlin
      '.APHAAPP..', //  Münster, Osnabrück, Hannover, Braunschweig, Magdeburg, Fläming, Spreewald
      '.AHGGPAHW.', //  Düsseldorf, Dortmund, Brilon, Harz, Halle, Leipzig, Lausitz, Görlitz
      'HAWWPHHG..', //  Aachen, Köln, Westerwald, Kassel, Erfurt, Jena, Chemnitz, Dresden
      '.GPAWG....', //  Eifel, Taunus, Frankfurt, Thüringer Wald, Erzgebirge
      '.HAPHH....', //  Pfälzerwald, Pfalz, Würzburg, Nürnberg, Oberpfalz
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
    waters: [{ row: 1, col: 1, text: 'Nordsee' }, { row: 1, col: 7, text: 'Ostsee' }, { row: 12, col: 3, text: 'Bodensee' }],
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
    flag: { colors: ['#0057b7', '#ffd700'] },
    rows: [
      '.................', //  Belarus, Russland
      '..WW...WPW.......', //  Wolyn, Polissja, Tschernihiw
      '..PPWGHWAWP......', //  Kowel, Riwne, Polissja, Owrutsch, Kyjiw-Nord, Tschernihiw, Nischyn, Sumy
      '..GHAGAPAHPA.....', //  Tscherwonohrad, Riwne, Schytomyr-Süd, Schytomyr, Kyjiw, Perejaslaw, Poltawa-Nord, Sumy-Süd, Charkiw
      '.HAHPAHWWAHPHHW..', //  Lwiw-West, Lwiw, Ternopil, Chmelnyzkyj, Winnyzja-Nord, Bila Zerkwa, Tscherkassy, Poltawa, Charkiw, Luhansk-Nord
      '.GWPAHGPGPAGHG...', //  Beskiden, Iwano-Frankiwsk, Podilsk, Winnyzja, Uman, Kropywnyzkyj, Dnipro, Pawlohrad, Luhansk
      '.WGP..APAGHAPGH..', //  Uschhorod, Howerla, Czernowitz, (Moldau), Odesa-Nord, Krywyj Rih, Donezk
      '......PAHGHAG....', //  Balta, Mykolajiw-Nord, Nikopol, Saporischschja, Mariupol
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
    bridges: [{ row: 9, col: 8, side: 1 }], // Perekop: Cherson to the Crimea
    waters: [{ row: 12, col: 8, text: 'Schwarzes Meer' }, { row: 9, col: 12, text: 'Asowsches Meer' }],
    seed: 1991,
  });
}

/**
 * Poland: Baltic coast and Pomeranian pastures, the Masurian lakes and the Białowieża forest, the wheat
 * plains of Greater Poland and Lublin, Silesian coal, the Błędów desert, and the Sudetes and Tatra in the south.
 */
export function polandMap(): MapDef {
  return drawnMap({
    name: 'Polen',
    flag: { colors: ['#ffffff', '#dc143c'] },
    rows: [
      '~~~~~~~...',
      '~~~P~.....',
      '.PPWPAW~P.',
      '.WPWWPWWP.',
      '.HWAAPAAP.',
      '.HAPHHAH..',
      '.WWWAHPHA.',
      '.GGAGGGAA.',
      '...HHDAWW.',
      '....GGPG..',
      '........G.',
      '..........',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 2, col: 1, type: 'wool', kind: 'harbor', sides: [0, 5] }, // Norden: Kolberg
      { row: 2, col: 4, type: 'any', kind: 'harbor', sides: [0, 5, 1] }, // Norden: Danzig
      { row: 4, col: 8, type: 'lumber', kind: 'treehouse', sides: [1, 0, 2] }, // Osten: Białowieża-Urwald
      { row: 6, col: 8, type: 'brick', kind: 'mine', sides: [1, 2, 0] }, // Osten: Kohle bei Lublin
      { row: 10, col: 8, type: 'any', kind: 'gondola', sides: [2, 3, 1] }, // Süden: Bieszczady
      { row: 9, col: 5, type: 'ore', kind: 'gondola', sides: [3, 2] }, // Süden: Tatra, Zakopane
      { row: 7, col: 1, type: 'grain', kind: 'gondola', sides: [4, 3, 5] }, // Westen: Riesengebirge
      { row: 4, col: 1, type: 'any', kind: 'mine', sides: [4, 5, 3] }, // Westen: Lebuser Ziegeleien
    ],
    labels: [
      { row: 5, col: 6, text: 'Warschau' },
      { row: 9, col: 5, text: 'Krakau' },
      { row: 6, col: 5, text: 'Łódź' },
      { row: 7, col: 2, text: 'Breslau' },
      { row: 5, col: 2, text: 'Posen' },
      { row: 2, col: 4, text: 'Danzig' },
      { row: 3, col: 1, text: 'Stettin' },
      { row: 4, col: 4, text: 'Bydgoszcz' },
      { row: 7, col: 7, text: 'Lublin' },
      { row: 4, col: 8, text: 'Białystok' },
      { row: 8, col: 5, text: 'Kattowitz' },
      { row: 9, col: 7, text: 'Rzeszów' },
      { row: 2, col: 6, text: 'Olsztyn' },
      { row: 7, col: 6, text: 'Kielce' },
      { row: 7, col: 4, text: 'Tschenstochau' },
      { row: 3, col: 6, text: 'Masuren' },
      { row: 7, col: 1, text: 'Riesengebirge' },
      { row: 9, col: 4, text: 'Bielsko-Biała' },
      { row: 4, col: 1, text: 'Gorzów' },
      { row: 2, col: 2, text: 'Koszalin' },
      { row: 3, col: 4, text: 'Toruń' },
      { row: 8, col: 4, text: 'Opole' },
      { row: 5, col: 1, text: 'Zielona Góra' },
      { row: 6, col: 2, text: 'Legnica' },
    ],
    waters: [{ row: 0, col: 3, text: 'Ostsee' }, { row: 2, col: 7, text: 'Masurische Seen' }],
    seed: 1918,
  });
}

/**
 * Italy: the Alps and the Dolomites, the Po plain full of wheat, Carrara marble, the Apennines, the Accona
 * desert near Siena, olive-green Apulia, the Sila forests of Calabria, Sardinia with its sheep, and Sicily with
 * Etna, joined to Calabria by a bridge over the Strait of Messina.
 */
export function italyMap(): MapDef {
  return drawnMap({
    name: 'Italien',
    flag: { colors: ['#009246', '#ffffff', '#ce2b37'], layout: 'vertical' },
    rows: [
      '..............',
      '.....GG.......',
      '...WGAGWP.....',
      '.GWAW~HP~.....',
      '.HHAAPAA~~....',
      '.HPWGAW~~~....',
      '..A~~GWA~~~...',
      '~~~~~PDPP~~~..',
      '~~~~~~PHG~~~~~',
      '~~~.~~HPG~~~~~',
      '~~~.~~~~PWWA~~',
      '~~~P~~~~~HAH~~',
      '~~~PW~~~~~HWPP',
      '~~~W~~~~~~~P~A',
      '~~~A~~~~~~~~W~',
      '~~~~~~~~~~~H~~',
      '~~~~~~~~~~~G~~',
      '~~~~~~~HAG~~~~',
      '......~~~AW~~~',
      '......~~~~~~~~',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 3, col: 1, type: 'ore', kind: 'gondola', sides: [4, 5] }, // Norden: Aosta, Mont Blanc
      { row: 1, col: 5, type: 'any', kind: 'gondola', sides: [0, 5] }, // Norden: Dolomiten
      { row: 3, col: 7, type: 'grain', kind: 'harbor', sides: [1, 0, 2] }, // Osten: Venedig
      { row: 11, col: 11, type: 'brick', kind: 'harbor', sides: [1, 0, 2] }, // Osten: Bari
      { row: 18, col: 10, type: 'any', kind: 'harbor', sides: [2, 1, 3] }, // Süden: Catania
      { row: 17, col: 7, type: 'wool', kind: 'harbor', sides: [5, 4] }, // Süden: Palermo
      { row: 14, col: 3, type: 'lumber', kind: 'harbor', sides: [3, 4, 2] }, // Westen: Cagliari, Korkeichen
      { row: 5, col: 3, type: 'any', kind: 'harbor', sides: [3, 4] }, // Westen: Genua
    ],
    labels: [
      { row: 9, col: 7, text: 'Rom' },
      { row: 3, col: 3, text: 'Mailand' },
      { row: 11, col: 9, text: 'Neapel' },
      { row: 4, col: 2, text: 'Turin' },
      { row: 17, col: 8, text: 'Palermo' },
      { row: 5, col: 3, text: 'Genua' },
      { row: 5, col: 5, text: 'Bologna' },
      { row: 6, col: 6, text: 'Florenz' },
      { row: 11, col: 11, text: 'Bari' },
      { row: 18, col: 10, text: 'Catania' },
      { row: 3, col: 7, text: 'Venedig' },
      { row: 4, col: 5, text: 'Verona' },
      { row: 16, col: 11, text: 'Messina' },
      { row: 14, col: 3, text: 'Cagliari' },
      { row: 12, col: 3, text: 'Sassari' },
      { row: 12, col: 13, text: 'Tarent' },
      { row: 7, col: 8, text: 'Ancona' },
      { row: 8, col: 7, text: 'Perugia' },
      { row: 9, col: 8, text: 'Pescara' },
      { row: 2, col: 6, text: 'Trient' },
      { row: 1, col: 5, text: 'Bozen' },
      { row: 3, col: 1, text: 'Aosta' },
      { row: 6, col: 5, text: 'Carrara' },
      { row: 17, col: 9, text: 'Ätna' },
      { row: 13, col: 13, text: 'Lecce' },
      { row: 10, col: 11, text: 'Foggia' },
      { row: 12, col: 11, text: 'Potenza' },
      { row: 15, col: 11, text: 'Catanzaro' },
      { row: 7, col: 5, text: 'Siena' },
      { row: 2, col: 8, text: 'Udine' },
    ],
    bridges: [{ row: 17, col: 10, side: 5 }], // Straße von Messina
    waters: [{ row: 5, col: 9, text: 'Adria' }, { row: 7, col: 2, text: 'Ligurisches Meer' }, { row: 11, col: 6, text: 'Tyrrhenisches Meer' }, { row: 15, col: 13, text: 'Ionisches Meer' }, { row: 19, col: 8, text: 'Mittelmeer' }, { row: 3, col: 5, text: 'Gardasee' }],
    seed: 1861,
  });
}

/**
 * France: Breton and Norman pastures, the wheat of the Beauce around Paris, Lorraine iron, the Vosges and Jura
 * forests, the Alps with Mont Blanc, the Massif Central, the Landes forest with the Dune du Pilat, the Pyrenees,
 * and Corsica.
 */
export function franceMap(): MapDef {
  return drawnMap({
    name: 'Frankreich',
    flag: { colors: ['#0055a4', '#ffffff', '#ef4135'], layout: 'vertical' },
    rows: [
      '..............',
      '......A.......',
      '.~~~~~AH......',
      '~~~P~HPHAG....',
      '~~~~PPAAHWGW..',
      '~PPGWHAWPAW...',
      '~~~APAWPWAH...',
      '~~~PHAWAHW....',
      '~~~~WPPGPAG...',
      '~~~~HPGGAGG...',
      '~~~~DWAPWHH...',
      '~~~WWAHWPPG...',
      '....GGAW~~W~~~',
      '......H~~~~~W~',
      '........~~~~G~',
      '.......~~~~~.~',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 3, col: 5, type: 'wool', kind: 'harbor', sides: [5, 0] }, // Norden: Le Havre
      { row: 3, col: 9, type: 'any', kind: 'mine', sides: [0, 5, 1] }, // Norden: Lothringer Erz
      { row: 4, col: 11, type: 'lumber', kind: 'treehouse', sides: [1, 0, 2] }, // Osten: Vogesen
      { row: 9, col: 10, type: 'ore', kind: 'gondola', sides: [1, 0, 2] }, // Osten: Chamonix, Mont Blanc
      { row: 12, col: 10, type: 'any', kind: 'harbor', sides: [2, 3, 1] }, // Süden: Marseille
      { row: 13, col: 6, type: 'brick', kind: 'gondola', sides: [3, 2, 4] }, // Süden: Pyrenäen
      { row: 9, col: 4, type: 'grain', kind: 'harbor', sides: [4, 3, 5] }, // Westen: Bordeaux
      { row: 5, col: 1, type: 'any', kind: 'harbor', sides: [4, 5, 3] }, // Westen: Brest
    ],
    labels: [
      { row: 4, col: 7, text: 'Paris' },
      { row: 10, col: 4, text: 'Dune du Pilat' },
      { row: 12, col: 10, text: 'Marseille' },
      { row: 8, col: 9, text: 'Lyon' },
      { row: 12, col: 6, text: 'Toulouse' },
      { row: 11, col: 10, text: 'Nizza' },
      { row: 6, col: 3, text: 'Nantes' },
      { row: 4, col: 11, text: 'Straßburg' },
      { row: 11, col: 7, text: 'Montpellier' },
      { row: 9, col: 4, text: 'Bordeaux' },
      { row: 2, col: 7, text: 'Lille' },
      { row: 5, col: 3, text: 'Rennes' },
      { row: 3, col: 8, text: 'Reims' },
      { row: 5, col: 1, text: 'Brest' },
      { row: 3, col: 5, text: 'Le Havre' },
      { row: 6, col: 9, text: 'Dijon' },
      { row: 9, col: 9, text: 'Grenoble' },
      { row: 6, col: 5, text: 'Tours' },
      { row: 8, col: 6, text: 'Limoges' },
      { row: 8, col: 7, text: 'Clermont-Ferrand' },
      { row: 4, col: 10, text: 'Metz' },
      { row: 5, col: 6, text: 'Orléans' },
      { row: 4, col: 4, text: 'Caen' },
      { row: 4, col: 6, text: 'Rouen' },
      { row: 3, col: 6, text: 'Amiens' },
      { row: 7, col: 4, text: 'Poitiers' },
      { row: 6, col: 10, text: 'Besançon' },
      { row: 13, col: 6, text: 'Perpignan' },
      { row: 14, col: 12, text: 'Ajaccio' },
      { row: 13, col: 12, text: 'Bastia' },
      { row: 8, col: 10, text: 'Mont Blanc' },
      { row: 9, col: 10, text: 'Chamonix' },
      { row: 11, col: 3, text: 'Biarritz' },
    ],
    waters: [{ row: 2, col: 3, text: 'Ärmelkanal' }, { row: 8, col: 1, text: 'Atlantik' }, { row: 11, col: 1, text: 'Golf von Biskaya' }, { row: 13, col: 9, text: 'Mittelmeer' }],
    seed: 1789,
  });
}

/**
 * Austria: the Alps from the Arlberg to the Großglockner, the Erzberg, the Bohemian and Waldviertel forests,
 * the Danube plain, the Pannonian steppe at Lake Neusiedl, and Lake Constance at Bregenz.
 */
export function austriaMap(): MapDef {
  return drawnMap({
    name: 'Österreich',
    flag: { colors: ['#ed2939', '#ffffff', '#ed2939'] },
    rows: [
      '..............',
      '..............',
      '........W.WA..',
      '......PAAWAPA.',
      '.......PAHPA~.',
      '~....HPWHGWD..',
      '.PGGWPGGAAHW..',
      '.....GPHWPH...',
      '........W.....',
      '..............',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 3, col: 6, type: 'brick', kind: 'mine', sides: [5, 0, 4] }, // Norden: Hausruck-Kohle
      { row: 2, col: 10, type: 'any', kind: 'treehouse', sides: [0, 5, 1] }, // Norden: Waldviertel
      { row: 3, col: 12, type: 'grain', kind: 'harbor', sides: [3, 2, 4] }, // Osten: Neusiedler See
      { row: 7, col: 10, type: 'ore', kind: 'mine', sides: [1, 2, 0] }, // Osten: Steirischer Bergbau
      { row: 8, col: 8, type: 'any', kind: 'treehouse', sides: [3, 2, 4] }, // Süden: Kärntner Wald
      { row: 7, col: 5, type: 'wool', kind: 'gondola', sides: [3, 2, 4] }, // Süden: Großglockner
      { row: 6, col: 3, type: 'lumber', kind: 'gondola', sides: [3, 4, 5] }, // Westen: Arlberg
      { row: 6, col: 1, type: 'any', kind: 'harbor', sides: [5, 0, 4] }, // Westen: Bodensee bei Bregenz
    ],
    labels: [
      { row: 3, col: 11, text: 'Wien' },
      { row: 6, col: 10, text: 'Graz' },
      { row: 3, col: 8, text: 'Linz' },
      { row: 5, col: 6, text: 'Salzburg' },
      { row: 6, col: 4, text: 'Innsbruck' },
      { row: 7, col: 8, text: 'Klagenfurt' },
      { row: 8, col: 8, text: 'Villach' },
      { row: 3, col: 10, text: 'St. Pölten' },
      { row: 4, col: 8, text: 'Wels' },
      { row: 6, col: 1, text: 'Bregenz' },
      { row: 5, col: 11, text: 'Eisenstadt' },
      { row: 4, col: 9, text: 'Steyr' },
      { row: 5, col: 9, text: 'Leoben' },
      { row: 2, col: 11, text: 'Krems' },
      { row: 6, col: 9, text: 'Erzberg' },
      { row: 6, col: 6, text: 'Großglockner' },
      { row: 6, col: 2, text: 'Bludenz' },
      { row: 7, col: 6, text: 'Lienz' },
      { row: 5, col: 7, text: 'Bad Ischl' },
      { row: 5, col: 5, text: 'Kitzbühel' },
      { row: 2, col: 10, text: 'Zwettl' },
      { row: 6, col: 3, text: 'Landeck' },
    ],
    waters: [{ row: 5, col: 0, text: 'Bodensee' }, { row: 4, col: 12, text: 'Neusiedler See' }],
    seed: 1955,
  });
}

/**
 * Switzerland: Jura forests, the Mittelland with its fields and dairy pastures, lakes Geneva, Lucerne and
 * Constance, the Bernese and Valais Alps with the Aletsch glacier, Graubünden and Ticino. Not only stone: the
 * Alps are half meadows.
 */
export function switzerlandMap(): MapDef {
  return drawnMap({
    name: 'Schweiz',
    flag: { colors: ['#da291c', '#ffffff'], layout: 'cross' },
    rows: [
      '..........',
      '.......~..',
      '...WHAHA..',
      '..WAW~PP..',
      '..WPAHPAW.',
      '.AAPDGGPG.',
      '.H~GGPW...',
      '......H...',
      '..........',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 2, col: 4, type: 'brick', kind: 'mine', sides: [0, 5, 1] }, // Norden: Salzbergwerk bei Basel
      { row: 2, col: 7, type: 'any', kind: 'harbor', sides: [0, 1, 5] }, // Norden: Bodensee
      { row: 4, col: 8, type: 'lumber', kind: 'treehouse', sides: [1, 0, 2] }, // Osten: Graubündner Wald
      { row: 5, col: 8, type: 'wool', kind: 'gondola', sides: [1, 2, 0] }, // Osten: Engadin
      { row: 7, col: 6, type: 'any', kind: 'mine', sides: [2, 3, 1] }, // Süden: Tessiner Granit
      { row: 6, col: 4, type: 'ore', kind: 'gondola', sides: [3, 2, 4] }, // Süden: Zermatt, Matterhorn
      { row: 6, col: 1, type: 'grain', kind: 'harbor', sides: [1, 2, 0] }, // Westen: Genf am Lac Léman
      { row: 3, col: 2, type: 'any', kind: 'treehouse', sides: [4, 5, 3] }, // Westen: Jura
    ],
    labels: [
      { row: 4, col: 4, text: 'Bern' },
      { row: 5, col: 4, text: 'Aletschgletscher' },
      { row: 2, col: 6, text: 'Zürich' },
      { row: 6, col: 1, text: 'Genf' },
      { row: 2, col: 4, text: 'Basel' },
      { row: 5, col: 2, text: 'Lausanne' },
      { row: 4, col: 5, text: 'Luzern' },
      { row: 2, col: 7, text: 'St. Gallen' },
      { row: 7, col: 6, text: 'Lugano' },
      { row: 3, col: 3, text: 'Biel' },
      { row: 4, col: 8, text: 'Chur' },
      { row: 6, col: 4, text: 'Sion' },
      { row: 4, col: 3, text: 'Neuchâtel' },
      { row: 5, col: 3, text: 'Fribourg' },
      { row: 6, col: 5, text: 'Zermatt' },
      { row: 5, col: 8, text: 'Davos' },
      { row: 6, col: 6, text: 'Bellinzona' },
      { row: 5, col: 5, text: 'Andermatt' },
      { row: 5, col: 7, text: 'St. Moritz' },
      { row: 6, col: 3, text: 'Montreux' },
    ],
    waters: [{ row: 1, col: 7, text: 'Bodensee' }, { row: 3, col: 5, text: 'Vierwaldstättersee' }, { row: 6, col: 2, text: 'Genfersee' }],
    seed: 1291,
  });
}

/**
 * United Kingdom: Great Britain and Northern Ireland. Scottish Highlands, the Lake District and Snowdonia,
 * East Anglian wheat, Welsh and Border sheep, Cornish china clay and the brickworks of the Midlands, and
 * Dungeness, Britain's only desert, under the flag.
 */
export function unitedKingdomMap(): MapDef {
  return drawnMap({
    name: 'Vereinigtes Königreich',
    flag: { colors: ['#012169', '#ffffff', '#c8102e'], layout: 'union' },
    rows: [
      '~~~~~~~~~~',
      '~~~~~~~~~~',
      '~~~G~~~~~~',
      '~~P~G~~~~~',
      '~~GGWP~~~~',
      '~~GWA~~~~~',
      '~~PAG~~~~~',
      '~~WWPW~~~~',
      '.P~WGH~~~~',
      '.G~~APP~~~',
      '..~~~AWH~~',
      '..~GHHA~~~',
      '..~~PHWPA~',
      '~~~PWAHA~~',
      '~~~~HPAWA~',
      '~~~PAWAD~.',
      '~~HH~~~~..',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 4, col: 5, type: 'lumber', kind: 'harbor', sides: [0] },
      { row: 9, col: 6, type: 'any', kind: 'harbor', sides: [0] },
      { row: 12, col: 8, type: 'wool', kind: 'harbor', sides: [0] },
      { row: 15, col: 7, type: 'brick', kind: 'mine', sides: [2] },
      { row: 16, col: 2, type: 'any', kind: 'harbor', sides: [0] },
      { row: 11, col: 3, type: 'grain', kind: 'harbor', sides: [0] },
      { row: 8, col: 1, type: 'ore', kind: 'harbor', sides: [0] },
      { row: 2, col: 3, type: 'any', kind: 'harbor', sides: [0] },
    ],
    labels: [
      { row: 14, col: 7, text: 'London' },
      { row: 15, col: 7, text: 'Dungeness' },
      { row: 12, col: 5, text: 'Birmingham' },
      { row: 6, col: 3, text: 'Glasgow' },
      { row: 10, col: 5, text: 'Manchester' },
      { row: 11, col: 4, text: 'Liverpool' },
      { row: 10, col: 6, text: 'Leeds' },
      { row: 6, col: 4, text: 'Edinburgh' },
      { row: 14, col: 5, text: 'Bristol' },
      { row: 14, col: 4, text: 'Cardiff' },
      { row: 9, col: 1, text: 'Belfast' },
      { row: 8, col: 5, text: 'Newcastle' },
      { row: 11, col: 5, text: 'Sheffield' },
      { row: 4, col: 5, text: 'Aberdeen' },
      { row: 4, col: 3, text: 'Inverness' },
      { row: 16, col: 3, text: 'Plymouth' },
      { row: 12, col: 8, text: 'Norwich' },
      { row: 15, col: 5, text: 'Southampton' },
      { row: 13, col: 7, text: 'Cambridge' },
      { row: 13, col: 5, text: 'Oxford' },
      { row: 9, col: 5, text: 'York' },
      { row: 5, col: 4, text: 'Dundee' },
      { row: 8, col: 1, text: 'Derry' },
      { row: 13, col: 3, text: 'Swansea' },
      { row: 5, col: 2, text: 'Ben Nevis' },
      { row: 11, col: 3, text: 'Snowdon' },
      { row: 8, col: 4, text: 'Lake District' },
    ],
    waters: [{ row: 7, col: 8, text: 'Nordsee' }, { row: 10, col: 3, text: 'Irische See' }, { row: 16, col: 5, text: 'Ärmelkanal' }, { row: 3, col: 0, text: 'Atlantik' }, { row: 15, col: 1, text: 'Keltische See' }],
    seed: 1707,
  });
}

/**
 * Ireland: green pastures across the midlands, the mountains of Wicklow, Kerry, Connemara and Donegal,
 * farmland in the south-east, and the Burren's bare limestone under the flag.
 */
export function irelandMap(): MapDef {
  return drawnMap({
    name: 'Irland',
    flag: { colors: ['#169b62', '#ffffff', '#ff883e'], layout: 'vertical' },
    rows: [
      '~~~~~~~~.',
      '~~~~~~~~~',
      '~~~~GG..~',
      '~~~WA...~',
      '~~~~W....',
      '~~PPAPH~~',
      '~~GHHPAA~',
      '~~~WPHW~~',
      '~~~DWHAG~',
      '~~PPPHA~~',
      '~~GWAW~~~',
      '~WGA~~~~~',
      '~~~~~~~~~',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 5, col: 4, type: 'brick', kind: 'mine', sides: [0] },
      { row: 6, col: 7, type: 'any', kind: 'harbor', sides: [0] },
      { row: 9, col: 6, type: 'lumber', kind: 'harbor', sides: [1] },
      { row: 10, col: 4, type: 'wool', kind: 'harbor', sides: [2] },
      { row: 11, col: 1, type: 'any', kind: 'harbor', sides: [2] },
      { row: 9, col: 2, type: 'grain', kind: 'harbor', sides: [4] },
      { row: 6, col: 2, type: 'ore', kind: 'harbor', sides: [2] },
      { row: 2, col: 4, type: 'any', kind: 'harbor', sides: [0] },
    ],
    labels: [
      { row: 7, col: 6, text: 'Dublin' },
      { row: 8, col: 3, text: 'Burren' },
      { row: 11, col: 3, text: 'Cork' },
      { row: 9, col: 3, text: 'Limerick' },
      { row: 7, col: 3, text: 'Galway' },
      { row: 9, col: 5, text: 'Waterford' },
      { row: 6, col: 7, text: 'Drogheda' },
      { row: 8, col: 6, text: 'Kilkenny' },
      { row: 4, col: 4, text: 'Sligo' },
      { row: 7, col: 4, text: 'Athlone' },
      { row: 10, col: 2, text: 'Killarney' },
      { row: 2, col: 5, text: 'Letterkenny' },
      { row: 9, col: 6, text: 'Wexford' },
      { row: 8, col: 7, text: 'Wicklow' },
      { row: 5, col: 2, text: 'Westport' },
      { row: 9, col: 2, text: 'Tralee' },
      { row: 8, col: 4, text: 'Ennis' },
      { row: 7, col: 5, text: 'Tullamore' },
      { row: 6, col: 5, text: 'Mullingar' },
      { row: 3, col: 4, text: 'Donegal' },
    ],
    waters: [{ row: 7, col: 8, text: 'Irische See' }, { row: 7, col: 0, text: 'Atlantik' }, { row: 12, col: 5, text: 'Keltische See' }, { row: 8, col: 2, text: 'Shannon' }],
    seed: 1922,
  });
}

/**
 * Deutschland, small: the same outline and regions in at most 21 tiles (about 144 km per hex).
 */
export function germanySmallMap(): MapDef {
  return drawnMap({
    name: 'Deutschland',
    flag: { colors: ['#000000', '#dd0000', '#ffce00'] },
    rows: [
      '~~..~.',
      '~~AG..',
      '.PDHW.',
      '.AGHA.',
      '.WWHW.',
      'PWP...',
      '..PA..',
      '..G...',
      '......',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 2, type: 'brick', kind: 'mine', sides: [0] },
      { row: 1, col: 3, type: 'any', kind: 'harbor', sides: [0] },
      { row: 3, col: 4, type: 'grain', kind: 'mine', sides: [0] },
      { row: 4, col: 3, type: 'ore', kind: 'mine', sides: [2] },
      { row: 7, col: 2, type: 'any', kind: 'gondola', sides: [1] },
      { row: 6, col: 2, type: 'lumber', kind: 'treehouse', sides: [3] },
      { row: 5, col: 1, type: 'wool', kind: 'treehouse', sides: [3] },
      { row: 2, col: 1, type: 'any', kind: 'harbor', sides: [0] },
    ],
    labels: [
      { row: 2, col: 4, text: 'Berlin' },
      { row: 2, col: 2, text: 'Hamburg' },
      { row: 6, col: 3, text: 'München' },
      { row: 4, col: 1, text: 'Köln' },
      { row: 5, col: 1, text: 'Frankfurt' },
      { row: 6, col: 2, text: 'Stuttgart' },
      { row: 4, col: 3, text: 'Leipzig' },
      { row: 4, col: 4, text: 'Dresden' },
    ],
    waters: [{ row: 1, col: 0, text: 'Nordsee' }, { row: 0, col: 4, text: 'Ostsee' }],
    seed: 49,
  });
}

/**
 * Ukraine, small: the same outline and regions in at most 21 tiles (about 182 km per hex).
 */
export function ukraineSmallMap(): MapDef {
  return drawnMap({
    name: 'Ukraine',
    flag: { colors: ['#0057b7', '#ffd700'] },
    rows: [
      '.........',
      '.WWPW....',
      '.HPWAWHP.',
      'PG.AAHG..',
      '....PDA~.',
      '...~G~...',
      '....~~~..',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 2, col: 5, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 2, col: 7, type: 'any', kind: 'treehouse', sides: [0] },
      { row: 4, col: 6, type: 'brick', kind: 'harbor', sides: [1] },
      { row: 5, col: 4, type: 'grain', kind: 'harbor', sides: [1] },
      { row: 3, col: 3, type: 'any', kind: 'mine', sides: [3] },
      { row: 3, col: 0, type: 'wool', kind: 'treehouse', sides: [2] },
      { row: 1, col: 1, type: 'ore', kind: 'treehouse', sides: [0] },
      { row: 1, col: 3, type: 'any', kind: 'treehouse', sides: [0] },
    ],
    labels: [
      { row: 1, col: 3, text: 'Kyjiw' },
      { row: 2, col: 6, text: 'Charkiw' },
      { row: 4, col: 4, text: 'Odesa' },
      { row: 3, col: 5, text: 'Dnipro' },
      { row: 2, col: 1, text: 'Lwiw' },
      { row: 3, col: 6, text: 'Donezk' },
      { row: 4, col: 5, text: 'Saporischschja' },
      { row: 3, col: 4, text: 'Krywyj Rih' },
    ],
    waters: [{ row: 6, col: 4, text: 'Schwarzes Meer' }, { row: 5, col: 5, text: 'Asowsches Meer' }],
    seed: 1991,
  });
}

/**
 * Polen, small: the same outline and regions in at most 21 tiles (about 131 km per hex).
 */
export function polandSmallMap(): MapDef {
  return drawnMap({
    name: 'Polen',
    flag: { colors: ['#ffffff', '#dc143c'] },
    rows: [
      '~~~~...',
      '.PPGP..',
      '.WWPWP.',
      '.AAAG..',
      '.WHGHA.',
      '..HDW..',
      '.......',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 4, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 2, col: 5, type: 'any', kind: 'treehouse', sides: [0] },
      { row: 4, col: 5, type: 'brick', kind: 'mine', sides: [0] },
      { row: 5, col: 3, type: 'ore', kind: 'mine', sides: [2] },
      { row: 5, col: 2, type: 'any', kind: 'mine', sides: [2] },
      { row: 4, col: 1, type: 'wool', kind: 'treehouse', sides: [2] },
      { row: 2, col: 1, type: 'grain', kind: 'treehouse', sides: [3] },
      { row: 1, col: 1, type: 'any', kind: 'harbor', sides: [0] },
    ],
    labels: [
      { row: 3, col: 3, text: 'Warschau' },
      { row: 5, col: 3, text: 'Krakau' },
      { row: 4, col: 2, text: 'Breslau' },
      { row: 3, col: 1, text: 'Posen' },
      { row: 1, col: 2, text: 'Danzig' },
      { row: 2, col: 1, text: 'Stettin' },
      { row: 5, col: 2, text: 'Kattowitz' },
    ],
    waters: [{ row: 0, col: 2, text: 'Ostsee' }],
    seed: 7,
  });
}

/**
 * Italien, small: the same outline and regions in at most 21 tiles (about 134 km per hex).
 */
export function italySmallMap(): MapDef {
  return drawnMap({
    name: 'Italien',
    flag: { colors: ['#009246', '#ffffff', '#ce2b37'], layout: 'vertical' },
    rows: [
      '.........',
      '.WGGP....',
      '.HAA~....',
      '.~WW~~...',
      '~~~DP~~..',
      '~.~HP~~~.',
      '~~P~~AH~~',
      '~W~~~~~W.',
      '~~~~~~~~~',
      '~~~~AG~~~',
      '....~~~~~',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 4, type: 'brick', kind: 'harbor', sides: [3] },
      { row: 7, col: 7, type: 'any', kind: 'harbor', sides: [0] },
      { row: 6, col: 6, type: 'wool', kind: 'harbor', sides: [0] },
      { row: 5, col: 4, type: 'grain', kind: 'harbor', sides: [0] },
      { row: 9, col: 4, type: 'any', kind: 'harbor', sides: [0] },
      { row: 6, col: 2, type: 'lumber', kind: 'treehouse', sides: [5] },
      { row: 3, col: 2, type: 'ore', kind: 'harbor', sides: [3] },
      { row: 1, col: 1, type: 'any', kind: 'treehouse', sides: [0] },
    ],
    labels: [
      { row: 5, col: 3, text: 'Rom' },
      { row: 2, col: 2, text: 'Mailand' },
      { row: 6, col: 5, text: 'Neapel' },
      { row: 2, col: 1, text: 'Turin' },
      { row: 9, col: 4, text: 'Palermo' },
      { row: 3, col: 3, text: 'Florenz' },
      { row: 1, col: 3, text: 'Venedig' },
      { row: 6, col: 6, text: 'Bari' },
    ],
    waters: [{ row: 4, col: 5, text: 'Adria' }, { row: 7, col: 3, text: 'Tyrrhenisches Meer' }, { row: 10, col: 4, text: 'Mittelmeer' }, { row: 8, col: 7, text: 'Ionisches Meer' }, { row: 3, col: 1, text: 'Ligurisches Meer' }],
    seed: 5,
  });
}

/**
 * Frankreich, small: the same outline and regions in at most 21 tiles (about 176 km per hex).
 */
export function franceSmallMap(): MapDef {
  return drawnMap({
    name: 'Frankreich',
    flag: { colors: ['#0055a4', '#ffffff', '#ef4135'], layout: 'vertical' },
    rows: [
      '........',
      '~~~H....',
      '~~PAAG..',
      '~PAWW...',
      '~~WPHG..',
      '~~DPP...',
      '~~WAHW~~',
      '....~~G~',
      '....~~.~',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 2, col: 5, type: 'ore', kind: 'gondola', sides: [0] },
      { row: 4, col: 5, type: 'any', kind: 'gondola', sides: [0] },
      { row: 7, col: 6, type: 'lumber', kind: 'harbor', sides: [0] },
      { row: 6, col: 4, type: 'brick', kind: 'harbor', sides: [2] },
      { row: 6, col: 2, type: 'any', kind: 'treehouse', sides: [2] },
      { row: 4, col: 2, type: 'wool', kind: 'harbor', sides: [3] },
      { row: 2, col: 2, type: 'grain', kind: 'harbor', sides: [0] },
      { row: 1, col: 3, type: 'any', kind: 'mine', sides: [0] },
    ],
    labels: [
      { row: 2, col: 3, text: 'Paris' },
      { row: 6, col: 5, text: 'Marseille' },
      { row: 4, col: 4, text: 'Lyon' },
      { row: 6, col: 3, text: 'Toulouse' },
      { row: 3, col: 1, text: 'Nantes' },
      { row: 2, col: 5, text: 'Straßburg' },
      { row: 5, col: 2, text: 'Bordeaux' },
      { row: 1, col: 3, text: 'Lille' },
    ],
    waters: [{ row: 1, col: 1, text: 'Ärmelkanal' }, { row: 4, col: 0, text: 'Atlantik' }, { row: 7, col: 4, text: 'Mittelmeer' }, { row: 5, col: 1, text: 'Golf von Biskaya' }],
    seed: 3,
  });
}

/**
 * Österreich, small: the same outline and regions in at most 21 tiles (about 67 km per hex).
 */
export function austriaSmallMap(): MapDef {
  return drawnMap({
    name: 'Österreich',
    flag: { colors: ['#ed2939', '#ffffff', '#ed2939'] },
    rows: [
      '..........',
      '..........',
      '.....HWWA.',
      '....PAGWD.',
      '.PGWGAAHP.',
      '....HWPP..',
      '..........',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 2, col: 7, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 3, col: 8, type: 'any', kind: 'mine', sides: [0] },
      { row: 5, col: 7, type: 'wool', kind: 'treehouse', sides: [1] },
      { row: 5, col: 4, type: 'brick', kind: 'mine', sides: [2] },
      { row: 4, col: 3, type: 'any', kind: 'treehouse', sides: [0] },
      { row: 4, col: 2, type: 'ore', kind: 'gondola', sides: [0] },
      { row: 4, col: 1, type: 'grain', kind: 'treehouse', sides: [0] },
      { row: 2, col: 5, type: 'any', kind: 'mine', sides: [0] },
    ],
    labels: [
      { row: 2, col: 8, text: 'Wien' },
      { row: 4, col: 7, text: 'Graz' },
      { row: 2, col: 6, text: 'Linz' },
      { row: 3, col: 4, text: 'Salzburg' },
      { row: 4, col: 3, text: 'Innsbruck' },
      { row: 5, col: 5, text: 'Klagenfurt' },
      { row: 3, col: 8, text: 'Seewinkel' },
      { row: 4, col: 1, text: 'Bregenz' },
    ],
    seed: 11,
  });
}

/**
 * Schweiz, small: the same outline and regions in at most 21 tiles (about 46 km per hex).
 */
export function switzerlandSmallMap(): MapDef {
  return drawnMap({
    name: 'Schweiz',
    flag: { colors: ['#da291c', '#ffffff'], layout: 'cross' },
    rows: [
      '.........',
      '.........',
      '..WAHA...',
      '.WAPPW...',
      '.APDHGGW.',
      '.GP.W....',
      '..H......',
      '.........',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 3, col: 5, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 4, col: 7, type: 'any', kind: 'treehouse', sides: [0] },
      { row: 4, col: 6, type: 'ore', kind: 'gondola', sides: [0] },
      { row: 5, col: 4, type: 'wool', kind: 'treehouse', sides: [1] },
      { row: 6, col: 2, type: 'any', kind: 'mine', sides: [1] },
      { row: 4, col: 3, type: 'brick', kind: 'mine', sides: [2] },
      { row: 4, col: 1, type: 'grain', kind: 'mine', sides: [3] },
      { row: 2, col: 3, type: 'any', kind: 'mine', sides: [0] },
    ],
    labels: [
      { row: 3, col: 2, text: 'Bern' },
      { row: 2, col: 4, text: 'Zürich' },
      { row: 2, col: 2, text: 'Basel' },
      { row: 4, col: 1, text: 'Lausanne' },
      { row: 3, col: 3, text: 'Luzern' },
      { row: 5, col: 4, text: 'Lugano' },
      { row: 4, col: 3, text: 'Aletschgletscher' },
      { row: 3, col: 5, text: 'Chur' },
    ],
    seed: 13,
  });
}

/**
 * Vereinigtes Königreich, small: the same outline and regions in at most 21 tiles (about 119 km per hex).
 */
export function unitedKingdomSmallMap(): MapDef {
  return drawnMap({
    name: 'Vereinigtes Königreich',
    flag: { colors: ['#012169', '#ffffff', '#c8102e'], layout: 'union' },
    rows: [
      '~~~~~~~',
      '~~W~~~~',
      '~~GG~~~',
      '~~G~~~~',
      '~~WP~~~',
      '.P~W~~~',
      '..~~W~~',
      '.~PHAA~',
      '.~APAW~',
      '~~PHD~.',
      '~~H~~..',
      '~~~~...',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 6, col: 4, type: 'lumber', kind: 'harbor', sides: [0] },
      { row: 7, col: 5, type: 'any', kind: 'harbor', sides: [0] },
      { row: 9, col: 4, type: 'brick', kind: 'mine', sides: [2] },
      { row: 10, col: 2, type: 'wool', kind: 'harbor', sides: [1] },
      { row: 8, col: 2, type: 'any', kind: 'harbor', sides: [3] },
      { row: 4, col: 2, type: 'grain', kind: 'harbor', sides: [2] },
      { row: 2, col: 2, type: 'ore', kind: 'harbor', sides: [3] },
      { row: 1, col: 2, type: 'any', kind: 'harbor', sides: [0] },
    ],
    labels: [
      { row: 8, col: 5, text: 'London' },
      { row: 9, col: 4, text: 'Dungeness' },
      { row: 7, col: 3, text: 'Birmingham' },
      { row: 4, col: 2, text: 'Glasgow' },
      { row: 6, col: 4, text: 'Manchester' },
      { row: 4, col: 3, text: 'Edinburgh' },
      { row: 8, col: 3, text: 'Cardiff' },
      { row: 5, col: 1, text: 'Belfast' },
    ],
    waters: [{ row: 4, col: 6, text: 'Nordsee' }, { row: 6, col: 2, text: 'Irische See' }, { row: 10, col: 3, text: 'Ärmelkanal' }, { row: 2, col: 1, text: 'Atlantik' }, { row: 9, col: 1, text: 'Keltische See' }],
    seed: 1707,
  });
}

/**
 * Irland, small: the same outline and regions in at most 21 tiles (about 63 km per hex).
 */
export function irelandSmallMap(): MapDef {
  return drawnMap({
    name: 'Irland',
    flag: { colors: ['#169b62', '#ffffff', '#ff883e'], layout: 'vertical' },
    rows: [
      '~~~~..~',
      '~~~...~',
      '~~PHWA~',
      '~~HPA~~',
      '~~DWHW~',
      '~GPPA~~',
      '~GGA~~~',
      '~~~~~~~',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 2, col: 4, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 2, col: 5, type: 'any', kind: 'mine', sides: [0] },
      { row: 4, col: 5, type: 'brick', kind: 'harbor', sides: [0] },
      { row: 5, col: 3, type: 'wool', kind: 'harbor', sides: [2] },
      { row: 6, col: 2, type: 'any', kind: 'harbor', sides: [2] },
      { row: 6, col: 1, type: 'grain', kind: 'harbor', sides: [2] },
      { row: 4, col: 2, type: 'ore', kind: 'harbor', sides: [4] },
      { row: 2, col: 2, type: 'any', kind: 'harbor', sides: [0] },
    ],
    labels: [
      { row: 3, col: 4, text: 'Dublin' },
      { row: 4, col: 2, text: 'Burren' },
      { row: 6, col: 3, text: 'Cork' },
      { row: 4, col: 3, text: 'Limerick' },
      { row: 3, col: 2, text: 'Galway' },
      { row: 5, col: 4, text: 'Waterford' },
      { row: 2, col: 3, text: 'Sligo' },
    ],
    waters: [{ row: 3, col: 6, text: 'Irische See' }, { row: 3, col: 0, text: 'Atlantik' }, { row: 7, col: 3, text: 'Keltische See' }, { row: 4, col: 1, text: 'Shannon' }],
    seed: 1922,
  });
}

/**
 * The Netherlands: Frisian pastures, Groningen farmland and gas, the Veluwe and Drenthe woods,
 * river-clay brickworks along the Rhine and Waal, IJmuiden steel and Limburg coal, the IJsselmeer, and the
 * Loonse Duinen sand dunes under the flag.
 */
export function netherlandsMap(): MapDef {
  return drawnMap({
    name: 'Niederlande',
    flag: { colors: ['#ae1c28', '#ffffff', '#21468b'] },
    rows: [
      '~~~~~~~~~~',
      '~~~~~PPAA.',
      '~~~~PHPWW.',
      '~~~~~AGW..',
      '~~~~GAWP..',
      '~~~PPWWP..',
      '~~~HPHH...',
      '~AAGDWA...',
      '..A...H...',
      '..........',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 5, type: 'wool', kind: 'harbor', sides: [0] },
      { row: 1, col: 8, type: 'any', kind: 'harbor', sides: [0] },
      { row: 5, col: 7, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 8, col: 6, type: 'brick', kind: 'mine', sides: [1] },
      { row: 7, col: 3, type: 'any', kind: 'gondola', sides: [2] },
      { row: 7, col: 1, type: 'grain', kind: 'harbor', sides: [0] },
      { row: 5, col: 3, type: 'ore', kind: 'harbor', sides: [4] },
      { row: 4, col: 5, type: 'any', kind: 'harbor', sides: [5] },
    ],
    labels: [
      { row: 4, col: 4, text: 'Amsterdam' },
      { row: 7, col: 4, text: 'Loonse Duinen' },
      { row: 6, col: 3, text: 'Rotterdam' },
      { row: 5, col: 3, text: 'Den Haag' },
      { row: 5, col: 4, text: 'Utrecht' },
      { row: 7, col: 5, text: 'Eindhoven' },
      { row: 1, col: 7, text: 'Groningen' },
      { row: 4, col: 5, text: 'Almere' },
      { row: 7, col: 3, text: 'Breda' },
      { row: 6, col: 6, text: 'Nijmegen' },
      { row: 5, col: 6, text: 'Arnhem' },
      { row: 5, col: 7, text: 'Enschede' },
      { row: 3, col: 6, text: 'Zwolle' },
      { row: 1, col: 5, text: 'Leeuwarden' },
      { row: 2, col: 4, text: 'Den Helder' },
      { row: 7, col: 1, text: 'Middelburg' },
      { row: 5, col: 5, text: 'Veluwe' },
      { row: 2, col: 7, text: 'Assen' },
    ],
    waters: [{ row: 3, col: 2, text: 'Nordsee' }, { row: 0, col: 5, text: 'Wattenmeer' }, { row: 3, col: 4, text: 'IJsselmeer' }],
    seed: 1648,
  });
}

/**
 * Niederlande, small: the same outline and regions in at most 21 tiles.
 */
export function netherlandsSmallMap(): MapDef {
  return drawnMap({
    name: 'Niederlande',
    flag: { colors: ['#ae1c28', '#ffffff', '#21468b'] },
    rows: [
      '~~~~~~~',
      '~~~PAA.',
      '~~~HPW.',
      '~~GAP..',
      '~~PWWA.',
      '~HDH...',
      '~A.GW..',
      '.......',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 3, type: 'grain', kind: 'harbor', sides: [0] },
      { row: 1, col: 4, type: 'any', kind: 'harbor', sides: [0] },
      { row: 1, col: 5, type: 'lumber', kind: 'mine', sides: [1] },
      { row: 4, col: 5, type: 'brick', kind: 'mine', sides: [0] },
      { row: 6, col: 4, type: 'any', kind: 'treehouse', sides: [0] },
      { row: 6, col: 3, type: 'wool', kind: 'gondola', sides: [2] },
      { row: 6, col: 1, type: 'ore', kind: 'mine', sides: [1] },
      { row: 4, col: 2, type: 'any', kind: 'harbor', sides: [4] },
    ],
    labels: [
      { row: 3, col: 2, text: 'Amsterdam' },
      { row: 5, col: 2, text: 'Loonse Duinen' },
      { row: 4, col: 2, text: 'Rotterdam' },
      { row: 5, col: 1, text: 'Den Haag' },
      { row: 4, col: 3, text: 'Utrecht' },
      { row: 6, col: 3, text: 'Eindhoven' },
      { row: 1, col: 4, text: 'Groningen' },
      { row: 5, col: 3, text: 'Tilburg' },
    ],
    waters: [{ row: 3, col: 0, text: 'Nordsee' }, { row: 0, col: 3, text: 'Wattenmeer' }],
    seed: 1648,
  });
}

/**
 * Belgium: Flemish fields and pastures, the Boom clay brickworks on the Rupel, Campine and Walloon coal
 * (Genk, Charleroi, Liège), the Ardennes forests and the Hautes Fagnes, and the Kalmthout heath under the flag.
 */
export function belgiumMap(): MapDef {
  return drawnMap({
    name: 'Belgien',
    flag: { colors: ['#000000', '#fdda24', '#ef3340'], layout: 'vertical' },
    rows: [
      '~~~......',
      '~P.HDP...',
      '.PHAHWG..',
      '.HAWAAG..',
      '..AGGAPG.',
      '....WPPW.',
      '.....HW..',
      '.....WW..',
      '.........',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 5, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 3, col: 6, type: 'any', kind: 'gondola', sides: [0] },
      { row: 5, col: 7, type: 'wool', kind: 'treehouse', sides: [0] },
      { row: 7, col: 5, type: 'ore', kind: 'treehouse', sides: [2] },
      { row: 5, col: 4, type: 'any', kind: 'treehouse', sides: [3] },
      { row: 4, col: 2, type: 'brick', kind: 'mine', sides: [2] },
      { row: 1, col: 1, type: 'grain', kind: 'harbor', sides: [0] },
      { row: 1, col: 3, type: 'any', kind: 'mine', sides: [0] },
    ],
    labels: [
      { row: 3, col: 3, text: 'Brüssel' },
      { row: 1, col: 4, text: 'Kalmthout' },
      { row: 1, col: 3, text: 'Antwerpen' },
      { row: 2, col: 3, text: 'Gent' },
      { row: 4, col: 4, text: 'Charleroi' },
      { row: 3, col: 6, text: 'Lüttich' },
      { row: 1, col: 1, text: 'Brügge' },
      { row: 4, col: 5, text: 'Namur' },
      { row: 3, col: 4, text: 'Löwen' },
      { row: 4, col: 3, text: 'Mons' },
      { row: 2, col: 6, text: 'Hasselt' },
      { row: 2, col: 4, text: 'Mechelen' },
      { row: 2, col: 1, text: 'Ostende' },
      { row: 3, col: 1, text: 'Kortrijk' },
      { row: 7, col: 6, text: 'Arlon' },
      { row: 5, col: 6, text: 'Bastogne' },
      { row: 4, col: 7, text: 'Spa' },
      { row: 5, col: 4, text: 'Dinant' },
    ],
    waters: [{ row: 1, col: 0, text: 'Nordsee' }],
    seed: 1830,
  });
}

/**
 * Belgien, small: the same outline and regions in at most 21 tiles.
 */
export function belgiumSmallMap(): MapDef {
  return drawnMap({
    name: 'Belgien',
    flag: { colors: ['#000000', '#fdda24', '#ef3340'], layout: 'vertical' },
    rows: [
      '~~.....',
      '~PHDP..',
      '.PAHAH.',
      '.AGAGG.',
      '...WPW.',
      '....W..',
      '.......',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 4, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 3, col: 5, type: 'any', kind: 'gondola', sides: [0] },
      { row: 5, col: 4, type: 'brick', kind: 'treehouse', sides: [1] },
      { row: 4, col: 3, type: 'wool', kind: 'treehouse', sides: [2] },
      { row: 3, col: 1, type: 'any', kind: 'mine', sides: [2] },
      { row: 2, col: 1, type: 'ore', kind: 'treehouse', sides: [3] },
      { row: 1, col: 1, type: 'grain', kind: 'harbor', sides: [4] },
      { row: 1, col: 2, type: 'any', kind: 'mine', sides: [0] },
    ],
    labels: [
      { row: 2, col: 3, text: 'Brüssel' },
      { row: 1, col: 3, text: 'Kalmthout' },
      { row: 1, col: 2, text: 'Antwerpen' },
      { row: 2, col: 2, text: 'Gent' },
      { row: 3, col: 3, text: 'Charleroi' },
      { row: 3, col: 4, text: 'Lüttich' },
      { row: 1, col: 1, text: 'Brügge' },
      { row: 4, col: 4, text: 'Namur' },
    ],
    waters: [{ row: 1, col: 0, text: 'Nordsee' }],
    seed: 1830,
  });
}

/**
 * Luxembourg: the Ösling forests of the Ardennes in the north, Gutland farmland, Moselle vineyards, the
 * Mullerthal sandstone, the Minett iron-ore basin, and the Remerschen gravel pits under the flag.
 */
export function luxembourgMap(): MapDef {
  return drawnMap({
    name: 'Luxemburg',
    flag: { colors: ['#ed2939', '#ffffff', '#00a1de'] },
    rows: [
      '........',
      '...G....',
      '...W....',
      '.PWP....',
      '..PWGW..',
      '.PAPWH..',
      '..HPAAH.',
      '..AWHA..',
      '..GGHD..',
      '...A....',
      '........',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 4, col: 5, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 6, col: 6, type: 'any', kind: 'mine', sides: [0] },
      { row: 8, col: 5, type: 'brick', kind: 'mine', sides: [1] },
      { row: 9, col: 3, type: 'ore', kind: 'mine', sides: [1] },
      { row: 8, col: 2, type: 'any', kind: 'gondola', sides: [2] },
      { row: 5, col: 1, type: 'wool', kind: 'treehouse', sides: [3] },
      { row: 3, col: 1, type: 'grain', kind: 'treehouse', sides: [0] },
      { row: 1, col: 3, type: 'any', kind: 'gondola', sides: [0] },
    ],
    labels: [
      { row: 7, col: 3, text: 'Luxemburg' },
      { row: 8, col: 5, text: 'Remerschen' },
      { row: 8, col: 3, text: 'Esch-sur-Alzette' },
      { row: 8, col: 2, text: 'Differdingen' },
      { row: 9, col: 3, text: 'Düdelingen' },
      { row: 4, col: 4, text: 'Ettelbrück' },
      { row: 3, col: 2, text: 'Wiltz' },
      { row: 5, col: 5, text: 'Echternach' },
      { row: 6, col: 6, text: 'Grevenmacher' },
      { row: 2, col: 3, text: 'Clerf' },
      { row: 3, col: 3, text: 'Vianden' },
      { row: 5, col: 3, text: 'Mersch' },
      { row: 7, col: 5, text: 'Remich' },
      { row: 1, col: 3, text: 'Ulflingen' },
    ],
    seed: 1867,
  });
}

/**
 * Luxemburg, small: the same outline and regions in at most 21 tiles.
 */
export function luxembourgSmallMap(): MapDef {
  return drawnMap({
    name: 'Luxemburg',
    flag: { colors: ['#ed2939', '#ffffff', '#00a1de'] },
    rows: [
      '.......',
      '..A....',
      '..WW...',
      '.PWG...',
      '..HPAH.',
      '..PAA..',
      '..GHD..',
      '..G....',
      '.......',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 3, col: 3, type: 'wool', kind: 'gondola', sides: [0] },
      { row: 4, col: 5, type: 'any', kind: 'mine', sides: [0] },
      { row: 6, col: 4, type: 'brick', kind: 'mine', sides: [1] },
      { row: 7, col: 2, type: 'ore', kind: 'gondola', sides: [1] },
      { row: 5, col: 2, type: 'any', kind: 'treehouse', sides: [4] },
      { row: 3, col: 1, type: 'lumber', kind: 'treehouse', sides: [3] },
      { row: 2, col: 2, type: 'grain', kind: 'treehouse', sides: [4] },
      { row: 1, col: 2, type: 'any', kind: 'mine', sides: [0] },
    ],
    labels: [
      { row: 6, col: 3, text: 'Luxemburg' },
      { row: 6, col: 4, text: 'Remerschen' },
      { row: 7, col: 2, text: 'Esch-sur-Alzette' },
      { row: 6, col: 2, text: 'Differdingen' },
      { row: 3, col: 3, text: 'Ettelbrück' },
      { row: 4, col: 3, text: 'Diekirch' },
      { row: 2, col: 2, text: 'Wiltz' },
      { row: 4, col: 5, text: 'Echternach' },
    ],
    seed: 1867,
  });
}

/**
 * Liechtenstein: Rhine valley farmland in the west, the Unterland hills, forested slopes, and the Alps from
 * Malbun to the Naafkopf; the flag stands on the Rhine gravel at Balzers.
 */
export function liechtensteinMap(): MapDef {
  return drawnMap({
    name: 'Liechtenstein',
    flag: { colors: ['#002b7f', '#ce1126'] },
    rows: [
      '.......',
      '..AA...',
      '..HWP..',
      '.AAWA..',
      '..HHW..',
      '..HPG..',
      '..APGG.',
      '.PWWP..',
      '..DPG..',
      '.......',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 3, type: 'lumber', kind: 'mine', sides: [0] },
      { row: 3, col: 4, type: 'any', kind: 'mine', sides: [0] },
      { row: 6, col: 5, type: 'wool', kind: 'gondola', sides: [0] },
      { row: 8, col: 4, type: 'ore', kind: 'gondola', sides: [1] },
      { row: 8, col: 2, type: 'any', kind: 'mine', sides: [2] },
      { row: 6, col: 2, type: 'brick', kind: 'mine', sides: [4] },
      { row: 3, col: 1, type: 'grain', kind: 'mine', sides: [3] },
      { row: 1, col: 2, type: 'any', kind: 'mine', sides: [0] },
    ],
    labels: [
      { row: 5, col: 2, text: 'Vaduz' },
      { row: 8, col: 2, text: 'Balzers' },
      { row: 4, col: 2, text: 'Schaan' },
      { row: 7, col: 2, text: 'Triesen' },
      { row: 3, col: 2, text: 'Eschen' },
      { row: 2, col: 3, text: 'Mauren' },
      { row: 6, col: 3, text: 'Triesenberg' },
      { row: 1, col: 2, text: 'Ruggell' },
      { row: 2, col: 2, text: 'Gamprin' },
      { row: 1, col: 3, text: 'Schellenberg' },
      { row: 4, col: 3, text: 'Planken' },
      { row: 7, col: 4, text: 'Malbun' },
      { row: 8, col: 4, text: 'Naafkopf' },
    ],
    seed: 1719,
  });
}

/**
 * Liechtenstein, small: the same outline and regions in at most 21 tiles.
 */
export function liechtensteinSmallMap(): MapDef {
  return drawnMap({
    name: 'Liechtenstein',
    flag: { colors: ['#002b7f', '#ce1126'] },
    rows: [
      '.....',
      '.A...',
      '.AP..',
      '.WW..',
      '.HP..',
      '.AGH.',
      '.PWG.',
      '.DH..',
      '.....',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 2, col: 2, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 4, col: 2, type: 'any', kind: 'treehouse', sides: [1] },
      { row: 5, col: 3, type: 'brick', kind: 'mine', sides: [0] },
      { row: 7, col: 2, type: 'grain', kind: 'mine', sides: [1] },
      { row: 7, col: 1, type: 'any', kind: 'mine', sides: [2] },
      { row: 6, col: 1, type: 'wool', kind: 'treehouse', sides: [3] },
      { row: 2, col: 1, type: 'ore', kind: 'mine', sides: [3] },
      { row: 1, col: 1, type: 'any', kind: 'mine', sides: [0] },
    ],
    labels: [
      { row: 4, col: 1, text: 'Vaduz' },
      { row: 6, col: 1, text: 'Balzers' },
      { row: 3, col: 1, text: 'Schaan' },
      { row: 5, col: 1, text: 'Triesen' },
      { row: 2, col: 1, text: 'Eschen' },
      { row: 2, col: 2, text: 'Mauren' },
      { row: 6, col: 2, text: 'Triesenberg' },
      { row: 1, col: 1, text: 'Ruggell' },
    ],
    seed: 1719,
  });
}

/**
 * Spain: Galician and Cantabrian pastures, the Pyrenees, Picos de Europa and Sierra Nevada, the wheat
 * of Castile and La Mancha, Extremadura's dehesa, Valencian and Catalan clay, the Río Tinto mines, Mallorca,
 * and the Tabernas desert under the flag.
 */
export function spainMap(): MapDef {
  return drawnMap({
    name: 'Spanien',
    flag: { colors: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] },
    rows: [
      '~~~~~~~~~......',
      '~WPPGGPWW......',
      '~~WWAHAHAWGG...',
      '~~..WAAPAAGHW~~',
      '~~..PPGPGPP~~~~',
      '~~.AAGHWWA~~~~~',
      '~~..PHGAWH~~~P~',
      '~..PPWAAPH~~~~~',
      '~~..WAHHWH~~~~~',
      '~~.GAAHGP~~~~~~',
      '~~~~HWPGD~~~~~~',
      '~~~~~~~~~~~~~~~',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 8, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 3, col: 12, type: 'any', kind: 'treehouse', sides: [0] },
      { row: 6, col: 13, type: 'wool', kind: 'harbor', sides: [0] },
      { row: 10, col: 7, type: 'grain', kind: 'harbor', sides: [2] },
      { row: 10, col: 4, type: 'any', kind: 'harbor', sides: [2] },
      { row: 5, col: 3, type: 'brick', kind: 'mine', sides: [3] },
      { row: 1, col: 1, type: 'ore', kind: 'harbor', sides: [0] },
      { row: 1, col: 3, type: 'any', kind: 'harbor', sides: [0] },
    ],
    labels: [
      { row: 5, col: 6, text: 'Madrid' },
      { row: 10, col: 8, text: 'Tabernas' },
      { row: 3, col: 12, text: 'Barcelona' },
      { row: 7, col: 9, text: 'Valencia' },
      { row: 9, col: 4, text: 'Sevilla' },
      { row: 3, col: 9, text: 'Zaragoza' },
      { row: 10, col: 6, text: 'Málaga' },
      { row: 8, col: 9, text: 'Murcia' },
      { row: 6, col: 13, text: 'Palma' },
      { row: 1, col: 7, text: 'Bilbao' },
      { row: 9, col: 5, text: 'Córdoba' },
      { row: 3, col: 5, text: 'Valladolid' },
      { row: 2, col: 2, text: 'Vigo' },
      { row: 1, col: 4, text: 'Gijón' },
      { row: 1, col: 2, text: 'A Coruña' },
      { row: 9, col: 6, text: 'Granada' },
      { row: 6, col: 6, text: 'Toledo' },
      { row: 4, col: 5, text: 'Salamanca' },
      { row: 1, col: 1, text: 'Santiago' },
      { row: 1, col: 8, text: 'Pamplona' },
      { row: 1, col: 6, text: 'Santander' },
      { row: 10, col: 7, text: 'Almería' },
      { row: 10, col: 4, text: 'Cádiz' },
      { row: 9, col: 3, text: 'Huelva' },
      { row: 7, col: 3, text: 'Badajoz' },
      { row: 6, col: 4, text: 'Cáceres' },
      { row: 2, col: 7, text: 'Burgos' },
      { row: 2, col: 5, text: 'León' },
      { row: 3, col: 11, text: 'Tarragona' },
      { row: 3, col: 10, text: 'Lleida' },
      { row: 7, col: 8, text: 'Albacete' },
      { row: 8, col: 4, text: 'Río Tinto' },
      { row: 9, col: 7, text: 'Sierra Nevada' },
      { row: 2, col: 11, text: 'Pyrenäen' },
      { row: 6, col: 8, text: 'Cuenca' },
    ],
    waters: [{ row: 4, col: 0, text: 'Atlantik' }, { row: 0, col: 6, text: 'Golf von Biskaya' }, { row: 5, col: 11, text: 'Balearisches Meer' }, { row: 8, col: 11, text: 'Mittelmeer' }, { row: 11, col: 6, text: 'Alborán-Meer' }, { row: 10, col: 3, text: 'Golf von Cádiz' }],
    seed: 1492,
  });
}

/**
 * Spanien, small: the same outline and regions in at most 21 tiles.
 */
export function spainSmallMap(): MapDef {
  return drawnMap({
    name: 'Spanien',
    flag: { colors: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] },
    rows: [
      '~~~~~....',
      '~WHGWW...',
      '~~.PAWH~~',
      '~.PGAH~P~',
      '~~.PWA~~~',
      '~.GAD~~~~',
      '~~~~~~~~~',
    ],
    // Two trading posts at each end of the country, the 3:1 ones never side by side.
    ports: [
      { row: 1, col: 5, type: 'lumber', kind: 'treehouse', sides: [0] },
      { row: 3, col: 7, type: 'any', kind: 'harbor', sides: [0] },
      { row: 3, col: 5, type: 'brick', kind: 'harbor', sides: [1] },
      { row: 5, col: 4, type: 'grain', kind: 'harbor', sides: [1] },
      { row: 5, col: 2, type: 'any', kind: 'harbor', sides: [2] },
      { row: 3, col: 2, type: 'wool', kind: 'treehouse', sides: [3] },
      { row: 1, col: 1, type: 'ore', kind: 'harbor', sides: [0] },
      { row: 1, col: 3, type: 'any', kind: 'harbor', sides: [0] },
    ],
    labels: [
      { row: 3, col: 4, text: 'Madrid' },
      { row: 5, col: 4, text: 'Tabernas' },
      { row: 3, col: 5, text: 'Valencia' },
      { row: 5, col: 2, text: 'Sevilla' },
      { row: 2, col: 5, text: 'Zaragoza' },
      { row: 5, col: 3, text: 'Málaga' },
      { row: 4, col: 5, text: 'Murcia' },
      { row: 3, col: 7, text: 'Palma' },
    ],
    waters: [{ row: 2, col: 1, text: 'Atlantik' }, { row: 0, col: 4, text: 'Golf von Biskaya' }, { row: 3, col: 6, text: 'Balearisches Meer' }, { row: 4, col: 6, text: 'Mittelmeer' }, { row: 6, col: 4, text: 'Alborán-Meer' }, { row: 6, col: 2, text: 'Golf von Cádiz' }],
    seed: 1492,
  });
}

/**
 * "Goldrausch": a gold field in the centre (it pays any resource), ringed by mountains and hills,
 * then a ring of six lakes with farmland between them, and two broad outer rings of everything.
 * Everyone wants a corner on the gold, so the middle is where the fights happen.
 */
export function goldRushMap(): MapDef {
  const rng = { rng: 1849 };
  const ringOf = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  const angle = (q: number, r: number) => Math.atan2(1.5 * r, Math.sqrt(3) * (q + r / 2));
  const byAngle = (ring: number) =>
    hexagonCoords(4)
      .filter((c) => ringOf(c.q, c.r) === ring)
      .sort((a, b) => angle(a.q, a.r) - angle(b.q, b.r));

  const tiles: MapTile[] = [{ q: 0, r: 0, terrain: 'gold', number: null, label: 'Goldader' }];
  byAngle(1).forEach((c, i) => tiles.push({ ...c, terrain: i % 2 ? 'hills' : 'mountains', number: null }));
  // Ring 2: the six corner hexes are lakes, the hexes between them farmland.
  const farm: Terrain[] = ['fields', 'pasture', 'forest'];
  let f = 0;
  byAngle(2).forEach((c) => {
    const corner = [c.q, c.r, -c.q - c.r].some((x) => Math.abs(x) === 2) && [c.q, c.r, -c.q - c.r].some((x) => x === 0);
    if (!corner) tiles.push({ ...c, terrain: farm[f++ % 3], number: null });
  });
  // Outer rings: the usual mix (4:4:4:3:3) with two deserts opposite each other.
  const outer = [...byAngle(3), ...byAngle(4)];
  const deserts = new Set([tileId(4, -4), tileId(-4, 4)]);
  const mix = shuffle(rng, (['forest', 'pasture', 'fields', 'hills', 'mountains'] as Land[]).flatMap((t, i) => Array<Land>(i < 3 ? 9 : 7).fill(t)));
  let m = 0;
  for (const c of outer) tiles.push({ ...c, terrain: deserts.has(tileId(c.q, c.r)) ? 'desert' : mix[m++ % mix.length], number: null });
  const spread = dealNumbers(breakClusters(tiles, 3, (t) => ringOf(t.q, t.r) < 2 || t.terrain === 'desert'), rng);

  // Eight harbours round the outside, evenly spaced, the 3:1 ones never side by side.
  const coast = topology({ name: '', tiles: spread, ports: [] }).coastalEdges.filter((c) => ringOf(c.q, c.r) === 4);
  const types: PortType[] = ['lumber', 'any', 'brick', 'wool', 'any', 'grain', 'ore', 'any'];
  const ports: MapPort[] = types.map((type, i) => {
    const c = coast[Math.floor(((i + 0.5) * coast.length) / types.length)];
    return { q: c.q, r: c.r, side: c.side, type };
  });
  return { name: 'Goldrausch', tiles: spread, ports, shuffleNumbers: true };
}

/** Fixed boards anyone can pick. 'standard' is generated fresh for every game. */
export const PRESET_MAPS = {
  deutschland: germanyMap,
  ukraine: ukraineMap,
  polen: polandMap,
  italien: italyMap,
  frankreich: franceMap,
  oesterreich: austriaMap,
  schweiz: switzerlandMap,
  uk: unitedKingdomMap,
  irland: irelandMap,
  'deutschland-klein': germanySmallMap,
  'ukraine-klein': ukraineSmallMap,
  'polen-klein': polandSmallMap,
  'italien-klein': italySmallMap,
  'frankreich-klein': franceSmallMap,
  'oesterreich-klein': austriaSmallMap,
  'schweiz-klein': switzerlandSmallMap,
  'uk-klein': unitedKingdomSmallMap,
  'irland-klein': irelandSmallMap,
  niederlande: netherlandsMap,
  'niederlande-klein': netherlandsSmallMap,
  belgien: belgiumMap,
  'belgien-klein': belgiumSmallMap,
  luxemburg: luxembourgMap,
  'luxemburg-klein': luxembourgSmallMap,
  liechtenstein: liechtensteinMap,
  'liechtenstein-klein': liechtensteinSmallMap,
  spanien: spainMap,
  'spanien-klein': spainSmallMap,
  nebelwald: fogForestMap,
  goldrausch: goldRushMap,
} as const;
