// Curated database of named chess openings.
// Each entry: { name, eco, moves (SAN), description, aliases? }
// Move sequences chosen as the canonical/most common path into the named system.
const OPENINGS = [
  // ===== King's Pawn / Open games =====
  {
    name: "Italian Game",
    eco: "C50",
    moves: ["e4","e5","Nf3","Nc6","Bc4"],
    description: "One of the oldest openings; the bishop on c4 eyes the weak f7 square."
  },
  {
    name: "Giuoco Piano",
    eco: "C50",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5"],
    description: "The 'Quiet Game' — symmetric Italian setup played for slow, classical positions."
  },
  {
    name: "Evans Gambit",
    eco: "C51",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5","b4"],
    description: "An aggressive 19th-century gambit sacrificing a pawn for rapid development."
  },
  {
    name: "Two Knights Defense",
    eco: "C55",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Nf6"],
    description: "Black challenges White directly, often leading to sharp tactical play."
  },
  {
    name: "Ruy Lopez",
    eco: "C60",
    moves: ["e4","e5","Nf3","Nc6","Bb5"],
    aliases: ["Spanish Opening","Spanish Game"],
    description: "The Spanish — Bb5 pins the knight defending e5 and is a cornerstone of opening theory."
  },
  {
    name: "Berlin Defense",
    eco: "C65",
    moves: ["e4","e5","Nf3","Nc6","Bb5","Nf6"],
    description: "A solid Ruy Lopez line famous for its drawish endgame, used at the highest level."
  },
  {
    name: "Scotch Game",
    eco: "C45",
    moves: ["e4","e5","Nf3","Nc6","d4"],
    description: "An open, classical opening that immediately challenges the center."
  },
  {
    name: "Four Knights Game",
    eco: "C46",
    moves: ["e4","e5","Nf3","Nc6","Nc3","Nf6"],
    description: "A symmetrical, principled developing opening favored by classical players."
  },
  {
    name: "Vienna Game",
    eco: "C25",
    moves: ["e4","e5","Nc3"],
    description: "A flexible King's Pawn opening that may transpose to gambit or quiet lines."
  },
  {
    name: "King's Gambit",
    eco: "C30",
    moves: ["e4","e5","f4"],
    description: "A romantic-era gambit offering the f-pawn for rapid attack on the king."
  },
  {
    name: "Bishop's Opening",
    eco: "C23",
    moves: ["e4","e5","Bc4"],
    description: "Develops the bishop early; can transpose to Italian or Vienna structures."
  },
  {
    name: "Center Game",
    eco: "C22",
    moves: ["e4","e5","d4"],
    description: "Direct central confrontation; often leads to early queen development."
  },
  {
    name: "Danish Gambit",
    eco: "C21",
    moves: ["e4","e5","d4","exd4","c3"],
    description: "An aggressive gambit sacrificing pawns for rapid attacking lines."
  },
  {
    name: "Petrov's Defense",
    eco: "C42",
    moves: ["e4","e5","Nf3","Nf6"],
    aliases: ["Russian Defense","Petroff Defense"],
    description: "A solid, symmetrical reply that strikes back at e4 immediately."
  },
  {
    name: "Philidor Defense",
    eco: "C41",
    moves: ["e4","e5","Nf3","d6"],
    description: "Solid but passive — Black supports e5 with the d-pawn instead of the knight."
  },
  {
    name: "Latvian Gambit",
    eco: "C40",
    moves: ["e4","e5","Nf3","f5"],
    description: "An offbeat, dubious-but-tricky gambit hurling the f-pawn into the fray."
  },

  // ===== Sicilian Defense =====
  {
    name: "Sicilian Defense",
    eco: "B20",
    moves: ["e4","c5"],
    description: "Black's most popular and combative response to 1.e4."
  },
  {
    name: "Sicilian Najdorf",
    eco: "B90",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","a6"],
    description: "A favourite of Fischer and Kasparov; ...a6 prepares ...e5 or ...b5."
  },
  {
    name: "Sicilian Dragon",
    eco: "B70",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","g6"],
    description: "Black fianchettoes the king's bishop, creating sharp, double-edged positions."
  },
  {
    name: "Sicilian Sveshnikov",
    eco: "B33",
    moves: ["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","Nf6","Nc3","e5"],
    description: "Black accepts a backward d-pawn for active piece play and dynamic chances."
  },
  {
    name: "Sicilian Scheveningen",
    eco: "B80",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","e6"],
    description: "Flexible 'small center' setup with pawns on d6 and e6."
  },
  {
    name: "Sicilian Taimanov",
    eco: "B44",
    moves: ["e4","c5","Nf3","e6","d4","cxd4","Nxd4","Nc6"],
    description: "Flexible Sicilian with early ...e6 and ...Nc6, deferring committal moves."
  },
  {
    name: "Sicilian Kan",
    eco: "B41",
    moves: ["e4","c5","Nf3","e6","d4","cxd4","Nxd4","a6"],
    description: "A flexible Sicilian where Black delays development to keep options open."
  },
  {
    name: "Accelerated Dragon",
    eco: "B34",
    moves: ["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","g6"],
    description: "Black plays an early ...g6 to fianchetto, avoiding the Yugoslav Attack."
  },
  {
    name: "Sicilian Alapin",
    eco: "B22",
    moves: ["e4","c5","c3"],
    description: "An anti-Sicilian preparing d4 with c3 support; aims for a classical center."
  },
  {
    name: "Sicilian Closed",
    eco: "B23",
    moves: ["e4","c5","Nc3"],
    description: "White declines the open Sicilian, often fianchettoing the king's bishop."
  },
  {
    name: "Smith-Morra Gambit",
    eco: "B21",
    moves: ["e4","c5","d4","cxd4","c3"],
    description: "White sacrifices a pawn for rapid development and attacking chances."
  },
  {
    name: "Grand Prix Attack",
    eco: "B23",
    moves: ["e4","c5","Nc3","Nc6","f4"],
    description: "An aggressive anti-Sicilian aiming for kingside attack with f4."
  },

  // ===== French / Caro / Other 1.e4 =====
  {
    name: "French Defense",
    eco: "C00",
    moves: ["e4","e6"],
    description: "Black prepares ...d5 to challenge the center, accepting a cramped but solid position."
  },
  {
    name: "French Advance",
    eco: "C02",
    moves: ["e4","e6","d4","d5","e5"],
    description: "White locks the center to claim space; Black attacks with ...c5 and ...f6."
  },
  {
    name: "French Winawer",
    eco: "C15",
    moves: ["e4","e6","d4","d5","Nc3","Bb4"],
    description: "Sharp pinning system; Black often doubles White's pawns for activity."
  },
  {
    name: "French Tarrasch",
    eco: "C03",
    moves: ["e4","e6","d4","d5","Nd2"],
    description: "A flexible response avoiding the Winawer pin."
  },
  {
    name: "French Exchange",
    eco: "C01",
    moves: ["e4","e6","d4","d5","exd5","exd5"],
    description: "Symmetrical and quiet — generally considered drawish."
  },
  {
    name: "Caro-Kann Defense",
    eco: "B10",
    moves: ["e4","c6"],
    description: "Solid and flexible; Black prepares ...d5 with the c-pawn supporting it."
  },
  {
    name: "Caro-Kann Classical",
    eco: "B18",
    moves: ["e4","c6","d4","d5","Nc3","dxe4","Nxe4","Bf5"],
    description: "The main line where Black develops the light-squared bishop actively."
  },
  {
    name: "Caro-Kann Advance",
    eco: "B12",
    moves: ["e4","c6","d4","d5","e5"],
    description: "White claims space and locks the center, similar to French Advance."
  },
  {
    name: "Panov-Botvinnik Attack",
    eco: "B13",
    moves: ["e4","c6","d4","d5","exd5","cxd5","c4"],
    description: "An aggressive line creating an isolated d-pawn for active piece play."
  },
  {
    name: "Scandinavian Defense",
    eco: "B01",
    moves: ["e4","d5"],
    aliases: ["Center Counter Defense"],
    description: "Black challenges e4 directly on move one."
  },
  {
    name: "Pirc Defense",
    eco: "B07",
    moves: ["e4","d6","d4","Nf6","Nc3","g6"],
    description: "Hypermodern: Black lets White build a center, then attacks it with pieces."
  },
  {
    name: "Modern Defense",
    eco: "B06",
    moves: ["e4","g6"],
    description: "An ultra-flexible hypermodern setup with the king's fianchetto."
  },
  {
    name: "Alekhine's Defense",
    eco: "B02",
    moves: ["e4","Nf6"],
    description: "A provocative defense inviting White to overextend with central pawns."
  },
  {
    name: "Nimzowitsch Defense",
    eco: "B00",
    moves: ["e4","Nc6"],
    description: "An offbeat hypermodern reply to 1.e4 named after Aron Nimzowitsch."
  },

  // ===== Queen's Pawn / Closed games =====
  {
    name: "Queen's Gambit",
    eco: "D06",
    moves: ["d4","d5","c4"],
    description: "Classical opening offering the c-pawn to deflect Black from the center."
  },
  {
    name: "Queen's Gambit Accepted",
    eco: "D20",
    moves: ["d4","d5","c4","dxc4"],
    description: "Black takes the pawn; White expects to recover it while gaining the center."
  },
  {
    name: "Queen's Gambit Declined",
    eco: "D30",
    moves: ["d4","d5","c4","e6"],
    description: "Solid classical defense; Black supports d5 at the cost of the c8 bishop."
  },
  {
    name: "Slav Defense",
    eco: "D10",
    moves: ["d4","d5","c4","c6"],
    description: "Solid response to the Queen's Gambit keeping the c8-bishop's diagonal open."
  },
  {
    name: "Semi-Slav Defense",
    eco: "D43",
    moves: ["d4","d5","c4","c6","Nf3","Nf6","Nc3","e6"],
    description: "Combines Slav and QGD; rich, complex middlegame positions."
  },
  {
    name: "Albin Counter-Gambit",
    eco: "D08",
    moves: ["d4","d5","c4","e5"],
    description: "Black sacrifices a pawn to disrupt White's plans and gain piece activity."
  },
  {
    name: "King's Indian Defense",
    eco: "E60",
    moves: ["d4","Nf6","c4","g6"],
    description: "Hypermodern defense; Black fianchettoes and counterattacks White's center."
  },
  {
    name: "Grünfeld Defense",
    eco: "D80",
    moves: ["d4","Nf6","c4","g6","Nc3","d5"],
    description: "Black challenges the center with ...d5, leading to dynamic, theoretical play."
  },
  {
    name: "Nimzo-Indian Defense",
    eco: "E20",
    moves: ["d4","Nf6","c4","e6","Nc3","Bb4"],
    description: "Pin on c3 to control e4 — a top-tier defense at all levels."
  },
  {
    name: "Queen's Indian Defense",
    eco: "E12",
    moves: ["d4","Nf6","c4","e6","Nf3","b6"],
    description: "Black fianchettoes the queen's bishop to contest the long diagonal."
  },
  {
    name: "Bogo-Indian Defense",
    eco: "E11",
    moves: ["d4","Nf6","c4","e6","Nf3","Bb4+"],
    description: "Pin via Bb4+ when White avoids the Nimzo with Nf3."
  },
  {
    name: "Catalan Opening",
    eco: "E00",
    moves: ["d4","Nf6","c4","e6","g3"],
    description: "Combines Queen's Gambit and king's fianchetto for long-term pressure."
  },
  {
    name: "Benoni Defense",
    eco: "A60",
    moves: ["d4","Nf6","c4","c5"],
    description: "Black challenges the d-pawn early, leading to asymmetric pawn structures."
  },
  {
    name: "Modern Benoni",
    eco: "A60",
    moves: ["d4","Nf6","c4","c5","d5","e6"],
    description: "Sharp, double-edged Benoni structure with central tension."
  },
  {
    name: "Benko Gambit",
    eco: "A57",
    moves: ["d4","Nf6","c4","c5","d5","b5"],
    description: "Black sacrifices a pawn for long-term queenside pressure on open lines."
  },
  {
    name: "Dutch Defense",
    eco: "A80",
    moves: ["d4","f5"],
    description: "Black aims for kingside play and a Stonewall or Leningrad structure."
  },
  {
    name: "London System",
    eco: "D02",
    moves: ["d4","Nf6","Nf3","e6","Bf4"],
    description: "Solid, system-based opening with the bishop developed outside the pawn chain."
  },
  {
    name: "Trompowsky Attack",
    eco: "A45",
    moves: ["d4","Nf6","Bg5"],
    description: "Early bishop sortie to disrupt Black's setup before standard development."
  },
  {
    name: "Torre Attack",
    eco: "A46",
    moves: ["d4","Nf6","Nf3","e6","Bg5"],
    description: "A solid system pinning the f6-knight; quieter than the Trompowsky."
  },
  {
    name: "Colle System",
    eco: "D04",
    moves: ["d4","d5","Nf3","Nf6","e3"],
    description: "Quiet system development with a delayed central break via e4."
  },
  {
    name: "Veresov Attack",
    eco: "D01",
    moves: ["d4","Nf6","Nc3","d5","Bg5"],
    description: "Aggressive Queen's Pawn opening with rapid piece development."
  },

  // ===== Flank openings =====
  {
    name: "English Opening",
    eco: "A10",
    moves: ["c4"],
    description: "Flexible flank opening; can transpose into many central structures."
  },
  {
    name: "Réti Opening",
    eco: "A09",
    moves: ["Nf3","d5","c4"],
    description: "Hypermodern flank opening attacking d5 from a distance."
  },
  {
    name: "King's Indian Attack",
    eco: "A07",
    moves: ["Nf3","d5","g3"],
    description: "A flexible white system mirroring the King's Indian Defense setup."
  },
  {
    name: "Bird's Opening",
    eco: "A02",
    moves: ["f4"],
    description: "An offbeat opening aiming at e5 and a kingside attack — a Dutch with colors reversed."
  },
  {
    name: "Larsen's Opening",
    eco: "A01",
    moves: ["b3"],
    aliases: ["Nimzo-Larsen Attack"],
    description: "Hypermodern opening fianchettoing the queen's bishop on b2."
  },
  {
    name: "Sokolsky Opening",
    eco: "A00",
    moves: ["b4"],
    aliases: ["Polish Opening","Orangutan"],
    description: "An unorthodox flank opening grabbing queenside space immediately."
  },
  {
    name: "Grob's Attack",
    eco: "A00",
    moves: ["g4"],
    description: "Provocative and risky — weakens the kingside but can surprise opponents."
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
