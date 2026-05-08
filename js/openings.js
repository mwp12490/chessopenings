// Curated database of named chess openings.
// Each entry: { name, eco, moves (SAN), description, tier, popularity, aliases? }
//   tier:        "mainline" | "solid" | "sideline"
//                Theoretical strength + soundness (consensus, master-level).
//   popularity:  1..4 — how often it appears in master/grandmaster practice.
//                4 = ubiquitous, 1 = rarity / surprise weapon.
// Move sequences are the canonical/most common path into the named system.
const OPENINGS = [
  // ===== King's Pawn / Open games =====
  {
    name: "Italian Game",
    eco: "C50",
    moves: ["e4","e5","Nf3","Nc6","Bc4"],
    description: "One of the oldest openings; the bishop on c4 eyes the weak f7 square.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Giuoco Piano",
    eco: "C50",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5"],
    description: "The 'Quiet Game' — symmetric Italian setup played for slow, classical positions.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Evans Gambit",
    eco: "C51",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5","b4"],
    description: "An aggressive 19th-century gambit sacrificing a pawn for rapid development.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Two Knights Defense",
    eco: "C55",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Nf6"],
    description: "Black challenges White directly, often leading to sharp tactical play.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Ruy Lopez",
    eco: "C60",
    moves: ["e4","e5","Nf3","Nc6","Bb5"],
    aliases: ["Spanish Opening","Spanish Game"],
    description: "The Spanish — Bb5 pins the knight defending e5 and is a cornerstone of opening theory.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Berlin Defense",
    eco: "C65",
    moves: ["e4","e5","Nf3","Nc6","Bb5","Nf6"],
    description: "A solid Ruy Lopez line famous for its drawish endgame, used at the highest level.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Scotch Game",
    eco: "C45",
    moves: ["e4","e5","Nf3","Nc6","d4"],
    description: "An open, classical opening that immediately challenges the center.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Four Knights Game",
    eco: "C46",
    moves: ["e4","e5","Nf3","Nc6","Nc3","Nf6"],
    description: "A symmetrical, principled developing opening favored by classical players.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Vienna Game",
    eco: "C25",
    moves: ["e4","e5","Nc3"],
    description: "A flexible King's Pawn opening that may transpose to gambit or quiet lines.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "King's Gambit",
    eco: "C30",
    moves: ["e4","e5","f4"],
    description: "A romantic-era gambit offering the f-pawn for rapid attack on the king.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Bishop's Opening",
    eco: "C23",
    moves: ["e4","e5","Bc4"],
    description: "Develops the bishop early; can transpose to Italian or Vienna structures.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Center Game",
    eco: "C22",
    moves: ["e4","e5","d4"],
    description: "Direct central confrontation; often leads to early queen development.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Danish Gambit",
    eco: "C21",
    moves: ["e4","e5","d4","exd4","c3"],
    description: "An aggressive gambit sacrificing pawns for rapid attacking lines.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Petrov's Defense",
    eco: "C42",
    moves: ["e4","e5","Nf3","Nf6"],
    aliases: ["Russian Defense","Petroff Defense"],
    description: "A solid, symmetrical reply that strikes back at e4 immediately.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Philidor Defense",
    eco: "C41",
    moves: ["e4","e5","Nf3","d6"],
    description: "Solid but passive — Black supports e5 with the d-pawn instead of the knight.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Latvian Gambit",
    eco: "C40",
    moves: ["e4","e5","Nf3","f5"],
    description: "An offbeat, dubious-but-tricky gambit hurling the f-pawn into the fray.",
    tier: "sideline",
    popularity: 1
  },

  // ===== Sicilian Defense =====
  {
    name: "Sicilian Defense",
    eco: "B20",
    moves: ["e4","c5"],
    description: "Black's most popular and combative response to 1.e4.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Sicilian Najdorf",
    eco: "B90",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","a6"],
    description: "A favourite of Fischer and Kasparov; ...a6 prepares ...e5 or ...b5.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Sicilian Dragon",
    eco: "B70",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","g6"],
    description: "Black fianchettoes the king's bishop, creating sharp, double-edged positions.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Sicilian Sveshnikov",
    eco: "B33",
    moves: ["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","Nf6","Nc3","e5"],
    description: "Black accepts a backward d-pawn for active piece play and dynamic chances.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Sicilian Scheveningen",
    eco: "B80",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","e6"],
    description: "Flexible 'small center' setup with pawns on d6 and e6.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Sicilian Taimanov",
    eco: "B44",
    moves: ["e4","c5","Nf3","e6","d4","cxd4","Nxd4","Nc6"],
    description: "Flexible Sicilian with early ...e6 and ...Nc6, deferring committal moves.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Sicilian Kan",
    eco: "B41",
    moves: ["e4","c5","Nf3","e6","d4","cxd4","Nxd4","a6"],
    description: "A flexible Sicilian where Black delays development to keep options open.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Accelerated Dragon",
    eco: "B34",
    moves: ["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","g6"],
    description: "Black plays an early ...g6 to fianchetto, avoiding the Yugoslav Attack.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Sicilian Alapin",
    eco: "B22",
    moves: ["e4","c5","c3"],
    description: "An anti-Sicilian preparing d4 with c3 support; aims for a classical center.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "Sicilian Closed",
    eco: "B23",
    moves: ["e4","c5","Nc3"],
    description: "White declines the open Sicilian, often fianchettoing the king's bishop.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Smith-Morra Gambit",
    eco: "B21",
    moves: ["e4","c5","d4","cxd4","c3"],
    description: "White sacrifices a pawn for rapid development and attacking chances.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Grand Prix Attack",
    eco: "B23",
    moves: ["e4","c5","Nc3","Nc6","f4"],
    description: "An aggressive anti-Sicilian aiming for kingside attack with f4.",
    tier: "sideline",
    popularity: 1
  },

  // ===== French / Caro / Other 1.e4 =====
  {
    name: "French Defense",
    eco: "C00",
    moves: ["e4","e6"],
    description: "Black prepares ...d5 to challenge the center, accepting a cramped but solid position.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "French Advance",
    eco: "C02",
    moves: ["e4","e6","d4","d5","e5"],
    description: "White locks the center to claim space; Black attacks with ...c5 and ...f6.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "French Winawer",
    eco: "C15",
    moves: ["e4","e6","d4","d5","Nc3","Bb4"],
    description: "Sharp pinning system; Black often doubles White's pawns for activity.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "French Tarrasch",
    eco: "C03",
    moves: ["e4","e6","d4","d5","Nd2"],
    description: "A flexible response avoiding the Winawer pin.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "French Exchange",
    eco: "C01",
    moves: ["e4","e6","d4","d5","exd5","exd5"],
    description: "Symmetrical and quiet — generally considered drawish.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Caro-Kann Defense",
    eco: "B10",
    moves: ["e4","c6"],
    description: "Solid and flexible; Black prepares ...d5 with the c-pawn supporting it.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Caro-Kann Classical",
    eco: "B18",
    moves: ["e4","c6","d4","d5","Nc3","dxe4","Nxe4","Bf5"],
    description: "The main line where Black develops the light-squared bishop actively.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Caro-Kann Advance",
    eco: "B12",
    moves: ["e4","c6","d4","d5","e5"],
    description: "White claims space and locks the center, similar to French Advance.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "Panov-Botvinnik Attack",
    eco: "B13",
    moves: ["e4","c6","d4","d5","exd5","cxd5","c4"],
    description: "An aggressive line creating an isolated d-pawn for active piece play.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Scandinavian Defense",
    eco: "B01",
    moves: ["e4","d5"],
    aliases: ["Center Counter Defense"],
    description: "Black challenges e4 directly on move one.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Pirc Defense",
    eco: "B07",
    moves: ["e4","d6","d4","Nf6","Nc3","g6"],
    description: "Hypermodern: Black lets White build a center, then attacks it with pieces.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Modern Defense",
    eco: "B06",
    moves: ["e4","g6"],
    description: "An ultra-flexible hypermodern setup with the king's fianchetto.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Alekhine's Defense",
    eco: "B02",
    moves: ["e4","Nf6"],
    description: "A provocative defense inviting White to overextend with central pawns.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Nimzowitsch Defense",
    eco: "B00",
    moves: ["e4","Nc6"],
    description: "An offbeat hypermodern reply to 1.e4 named after Aron Nimzowitsch.",
    tier: "sideline",
    popularity: 1
  },

  // ===== Queen's Pawn / Closed games =====
  {
    name: "Queen's Gambit",
    eco: "D06",
    moves: ["d4","d5","c4"],
    description: "Classical opening offering the c-pawn to deflect Black from the center.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Queen's Gambit Accepted",
    eco: "D20",
    moves: ["d4","d5","c4","dxc4"],
    description: "Black takes the pawn; White expects to recover it while gaining the center.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Queen's Gambit Declined",
    eco: "D30",
    moves: ["d4","d5","c4","e6"],
    description: "Solid classical defense; Black supports d5 at the cost of the c8 bishop.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Slav Defense",
    eco: "D10",
    moves: ["d4","d5","c4","c6"],
    description: "Solid response to the Queen's Gambit keeping the c8-bishop's diagonal open.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Semi-Slav Defense",
    eco: "D43",
    moves: ["d4","d5","c4","c6","Nf3","Nf6","Nc3","e6"],
    description: "Combines Slav and QGD; rich, complex middlegame positions.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Albin Counter-Gambit",
    eco: "D08",
    moves: ["d4","d5","c4","e5"],
    description: "Black sacrifices a pawn to disrupt White's plans and gain piece activity.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "King's Indian Defense",
    eco: "E60",
    moves: ["d4","Nf6","c4","g6"],
    description: "Hypermodern defense; Black fianchettoes and counterattacks White's center.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Grünfeld Defense",
    eco: "D80",
    moves: ["d4","Nf6","c4","g6","Nc3","d5"],
    description: "Black challenges the center with ...d5, leading to dynamic, theoretical play.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Nimzo-Indian Defense",
    eco: "E20",
    moves: ["d4","Nf6","c4","e6","Nc3","Bb4"],
    description: "Pin on c3 to control e4 — a top-tier defense at all levels.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Queen's Indian Defense",
    eco: "E12",
    moves: ["d4","Nf6","c4","e6","Nf3","b6"],
    description: "Black fianchettoes the queen's bishop to contest the long diagonal.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Bogo-Indian Defense",
    eco: "E11",
    moves: ["d4","Nf6","c4","e6","Nf3","Bb4+"],
    description: "Pin via Bb4+ when White avoids the Nimzo with Nf3.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Catalan Opening",
    eco: "E00",
    moves: ["d4","Nf6","c4","e6","g3"],
    description: "Combines Queen's Gambit and king's fianchetto for long-term pressure.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Benoni Defense",
    eco: "A60",
    moves: ["d4","Nf6","c4","c5"],
    description: "Black challenges the d-pawn early, leading to asymmetric pawn structures.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Modern Benoni",
    eco: "A60",
    moves: ["d4","Nf6","c4","c5","d5","e6"],
    description: "Sharp, double-edged Benoni structure with central tension.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Benko Gambit",
    eco: "A57",
    moves: ["d4","Nf6","c4","c5","d5","b5"],
    description: "Black sacrifices a pawn for long-term queenside pressure on open lines.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Dutch Defense",
    eco: "A80",
    moves: ["d4","f5"],
    description: "Black aims for kingside play and a Stonewall or Leningrad structure.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "London System",
    eco: "D02",
    moves: ["d4","Nf6","Nf3","e6","Bf4"],
    description: "Solid, system-based opening with the bishop developed outside the pawn chain.",
    tier: "solid",
    popularity: 4
  },
  {
    name: "Trompowsky Attack",
    eco: "A45",
    moves: ["d4","Nf6","Bg5"],
    description: "Early bishop sortie to disrupt Black's setup before standard development.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "Torre Attack",
    eco: "A46",
    moves: ["d4","Nf6","Nf3","e6","Bg5"],
    description: "A solid system pinning the f6-knight; quieter than the Trompowsky.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Colle System",
    eco: "D04",
    moves: ["d4","d5","Nf3","Nf6","e3"],
    description: "Quiet system development with a delayed central break via e4.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Veresov Attack",
    eco: "D01",
    moves: ["d4","Nf6","Nc3","d5","Bg5"],
    description: "Aggressive Queen's Pawn opening with rapid piece development.",
    tier: "sideline",
    popularity: 1
  },

  // ===== Flank openings =====
  {
    name: "English Opening",
    eco: "A10",
    moves: ["c4"],
    description: "Flexible flank opening; can transpose into many central structures.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Réti Opening",
    eco: "A09",
    moves: ["Nf3","d5","c4"],
    description: "Hypermodern flank opening attacking d5 from a distance.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "King's Indian Attack",
    eco: "A07",
    moves: ["Nf3","d5","g3"],
    description: "A flexible white system mirroring the King's Indian Defense setup.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "Bird's Opening",
    eco: "A02",
    moves: ["f4"],
    description: "An offbeat opening aiming at e5 and a kingside attack — a Dutch with colors reversed.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Larsen's Opening",
    eco: "A01",
    moves: ["b3"],
    aliases: ["Nimzo-Larsen Attack"],
    description: "Hypermodern opening fianchettoing the queen's bishop on b2.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Sokolsky Opening",
    eco: "A00",
    moves: ["b4"],
    aliases: ["Polish Opening","Orangutan"],
    description: "An unorthodox flank opening grabbing queenside space immediately.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Grob's Attack",
    eco: "A00",
    moves: ["g4"],
    description: "Provocative and risky — weakens the kingside but can surprise opponents.",
    tier: "sideline",
    popularity: 1
  }
];

// Build random distractor list helpers
function getRandomOpenings(n, exclude) {
  const pool = OPENINGS.filter(o => !exclude || o.name !== exclude.name);
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function findOpeningByName(name) {
  return OPENINGS.find(o => o.name === name) || null;
}

// Compute FEN from a sequence of SAN moves using chess.js
function fenFromMoves(moves) {
  const game = new Chess();
  for (const san of moves) {
    const m = game.move(san, { sloppy: true });
    if (!m) {
      throw new Error("Invalid move in opening: " + san + " in [" + moves.join(",") + "]");
    }
  }
  return game.fen();
}

// Walk the database once at startup so any typo surfaces in the console
// rather than mid-quiz. Returns the list of bad entries (empty when clean).
function validateOpenings() {
  const errors = [];
  for (const o of OPENINGS) {
    try { fenFromMoves(o.moves); }
    catch (e) { errors.push(o.name + ": " + e.message); }
  }
  if (errors.length) {
    console.error("Openings with invalid move sequences:", errors);
  }
  return errors;
}

const TIER_INFO = {
  mainline: { label: "Mainline", desc: "Sound, played at every level." },
  solid:    { label: "Solid",    desc: "Sound but less ambitious or less common." },
  sideline: { label: "Sideline", desc: "Surprise weapon; risky / dubious at master level." }
};

const POPULARITY_LABELS = {
  1: "Rare",
  2: "Uncommon",
  3: "Common",
  4: "Very common"
};
