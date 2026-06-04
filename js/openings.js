// Curated database of named chess openings.
// Each entry: { name, eco, moves (SAN), description, assessment, tier, popularity, aliases? }
//   description: what the moves do.
//   assessment:  why this opening lives in its tier — what makes it good or
//                shaky in modern theory.
//   tier:        "S" | "A" | "B" | "C" | "D" | "F"
//                Theoretical strength + soundness on a standard tier-list scale.
//                S = elite mainstay, F = practically refuted.
//   popularity:  1..4 — how often it appears in master/grandmaster practice.
//                4 = ubiquitous, 1 = rarity / surprise weapon.
const OPENINGS = [
  // ===== King's Pawn / Open games =====
  {
    name: "Italian Game",
    eco: "C50",
    moves: ["e4","e5","Nf3","Nc6","Bc4"],
    description: "One of the oldest openings; the bishop on c4 eyes the weak f7 square.",
    assessment: "Develops naturally with central control and pressure on f7. A foundational opening — sound at every level and a starting point for serious classical study.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Giuoco Piano",
    eco: "C50",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5"],
    description: "The 'Quiet Game' — symmetric Italian setup played for slow, classical positions.",
    assessment: "Symmetrical and well-charted, but modern Italian theory shows there's plenty of bite for both sides — White can pivot to slow maneuvering or sharp pawn breaks.",
    tier: "B",
    popularity: 3
  },
  {
    name: "Evans Gambit",
    eco: "C51",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5","b4"],
    description: "An aggressive 19th-century gambit sacrificing a pawn for rapid development.",
    assessment: "Romantic and fun but not best at the top level — Black has well-established declining systems that hold the extra pawn comfortably. Used today mostly for surprise.",
    tier: "D",
    popularity: 1
  },
  {
    name: "Two Knights Defense",
    eco: "C55",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Nf6"],
    description: "Black challenges White directly, often leading to sharp tactical play.",
    assessment: "A combative response that has stood the test of theory — Black accepts sharp tactics rather than the symmetric Giuoco Piano. Sound at every level.",
    tier: "B",
    popularity: 3
  },
  {
    name: "Ruy Lopez",
    eco: "C60",
    moves: ["e4","e5","Nf3","Nc6","Bb5"],
    aliases: ["Spanish Opening","Spanish Game"],
    description: "The Spanish — Bb5 pins the knight defending e5 and is a cornerstone of opening theory.",
    assessment: "Maximally principled: develops with tempo, pressures e5, prepares castling. The deepest opening in chess theory and the gold standard for fighting against 1...e5.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Berlin Defense",
    eco: "C65",
    moves: ["e4","e5","Nf3","Nc6","Bb5","Nf6"],
    description: "A solid Ruy Lopez line famous for its drawish endgame, used at the highest level.",
    assessment: "The Berlin Wall — Kasparov vs. Kramnik 2000 cemented its reputation as nearly impossible to crack at the top level. Black accepts a slightly worse endgame for rock-solid drawing chances.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Scotch Game",
    eco: "C45",
    moves: ["e4","e5","Nf3","Nc6","d4"],
    description: "An open, classical opening that immediately challenges the center.",
    assessment: "Active and respectable — sidesteps the deep theory of the Berlin Wall while still posing real central problems for Black. A favorite of Garry Kasparov.",
    tier: "B",
    popularity: 3
  },
  {
    name: "Four Knights Game",
    eco: "C46",
    moves: ["e4","e5","Nf3","Nc6","Nc3","Nf6"],
    description: "A symmetrical, principled developing opening favored by classical players.",
    assessment: "Symmetrical and principled but quite drawish — Black equalizes easily with accurate play, so it's lost popularity at the top level despite being theoretically fine.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Vienna Game",
    eco: "C25",
    moves: ["e4","e5","Nc3"],
    description: "A flexible King's Pawn opening that may transpose to gambit or quiet lines.",
    assessment: "Flexible but slightly slow — White can transpose into Italian or King's Gambit structures, but doesn't immediately fight for the center the way 2.Nf3 does.",
    tier: "C",
    popularity: 2
  },
  {
    name: "King's Gambit",
    eco: "C30",
    moves: ["e4","e5","f4"],
    description: "A romantic-era gambit offering the f-pawn for rapid attack on the king.",
    assessment: "The classic romantic gambit — exhilarating but considered dubious in modern theory. The f-pawn weakens White's king and Black has multiple known equalizing methods.",
    tier: "D",
    popularity: 1
  },
  {
    name: "Bishop's Opening",
    eco: "C23",
    moves: ["e4","e5","Bc4"],
    description: "Develops the bishop early; can transpose to Italian or Vienna structures.",
    assessment: "Sound but committal — usually transposes to Italian or Vienna structures, so it's largely a move-order tool. Doesn't independently challenge Black's setup.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Center Game",
    eco: "C22",
    moves: ["e4","e5","d4"],
    description: "Direct central confrontation; often leads to early queen development.",
    assessment: "Strategically inferior — the queen ends up on a vulnerable square (typically e3) where it loses tempo to Black's natural development.",
    tier: "F",
    popularity: 1
  },
  {
    name: "Danish Gambit",
    eco: "C21",
    moves: ["e4","e5","d4","exd4","c3"],
    description: "An aggressive gambit sacrificing pawns for rapid attacking lines.",
    assessment: "Two pawns is too steep — modern theory has Black declining or accepting and surviving the attack. Considered refuted at master level.",
    tier: "F",
    popularity: 1
  },
  {
    name: "Petrov's Defense",
    eco: "C42",
    moves: ["e4","e5","Nf3","Nf6"],
    aliases: ["Russian Defense","Petroff Defense"],
    description: "A solid, symmetrical reply that strikes back at e4 immediately.",
    assessment: "Famously drawish — Black's symmetrical approach equalizes so reliably that it's a top choice for elite players seeking solidity with the black pieces.",
    tier: "S",
    popularity: 3
  },
  {
    name: "Philidor Defense",
    eco: "C41",
    moves: ["e4","e5","Nf3","d6"],
    description: "Solid but passive — Black supports e5 with the d-pawn instead of the knight.",
    assessment: "Theoretically passive — d6 blocks the king's bishop and leaves Black cramped. White gets a comfortable space advantage with little effort.",
    tier: "F",
    popularity: 1
  },
  {
    name: "Latvian Gambit",
    eco: "C40",
    moves: ["e4","e5","Nf3","f5"],
    description: "An offbeat, dubious-but-tricky gambit hurling the f-pawn into the fray.",
    assessment: "Practically refuted — ...f5 weakens the kingside without sufficient compensation. White has multiple known clear paths to advantage. Surprise weapon only.",
    tier: "F",
    popularity: 1
  },

  // ===== Sicilian Defense =====
  {
    name: "Sicilian Defense",
    eco: "B20",
    moves: ["e4","c5"],
    description: "Black's most popular and combative response to 1.e4.",
    assessment: "Asymmetric counterattacking masterpiece — gives Black the highest winning percentages of any defense to 1.e4 because the unbalanced pawn structure creates real fighting chances.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Sicilian Najdorf",
    eco: "B90",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","a6"],
    description: "A favourite of Fischer and Kasparov; ...a6 prepares ...e5 or ...b5.",
    assessment: "The Najdorf is the gold standard — flexibility lets Black react to whatever White chooses, with rich theory in every direction. Used at the absolute top of chess.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Sicilian Dragon",
    eco: "B70",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","g6"],
    description: "Black fianchettoes the king's bishop, creating sharp, double-edged positions.",
    assessment: "Razor-sharp — opposite-side castling means both kings get attacked, and concrete calculation often outweighs strategy. High risk, high reward at every level.",
    tier: "S",
    popularity: 3
  },
  {
    name: "Sicilian Sveshnikov",
    eco: "B33",
    moves: ["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","Nf6","Nc3","e5"],
    description: "Black accepts a backward d-pawn for active piece play and dynamic chances.",
    assessment: "Modern Sicilian classic — Black trades a structural defect (d6 weakness) for piece activity and central control. Magnus Carlsen has trusted it in world championships.",
    tier: "S",
    popularity: 3
  },
  {
    name: "Sicilian Scheveningen",
    eco: "B80",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","e6"],
    description: "Flexible 'small center' setup with pawns on d6 and e6.",
    assessment: "The 'small center' (d6/e6) is solid and flexible — Black can transpose into many Sicilian structures and choose middlegame plans based on White's setup.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Sicilian Taimanov",
    eco: "B44",
    moves: ["e4","c5","Nf3","e6","d4","cxd4","Nxd4","Nc6"],
    description: "Flexible Sicilian with early ...e6 and ...Nc6, deferring committal moves.",
    assessment: "Maximum flexibility — Black holds back ...d6 to keep options open between Najdorf-like and Scheveningen-like structures. Trustworthy at the top level.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Sicilian Kan",
    eco: "B41",
    moves: ["e4","c5","Nf3","e6","d4","cxd4","Nxd4","a6"],
    description: "A flexible Sicilian where Black delays development to keep options open.",
    assessment: "Hyper-flexible but slightly slow — Black gives White a small space advantage in exchange for a clean position with no committal weaknesses.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Accelerated Dragon",
    eco: "B34",
    moves: ["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","g6"],
    description: "Black plays an early ...g6 to fianchetto, avoiding the Yugoslav Attack.",
    assessment: "Clever move-order tool — sidesteps the brutal Yugoslav Attack. Trade-off is the Maróczy Bind, where White gets a small but lasting space advantage.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Sicilian Alapin",
    eco: "B22",
    moves: ["e4","c5","c3"],
    description: "An anti-Sicilian preparing d4 with c3 support; aims for a classical center.",
    assessment: "Sound anti-Sicilian — sidesteps mountains of Open Sicilian theory but lets Black equalize with multiple known systems. Common at club level for time-saving.",
    tier: "B",
    popularity: 3
  },
  {
    name: "Sicilian Closed",
    eco: "B23",
    moves: ["e4","c5","Nc3"],
    description: "White declines the open Sicilian, often fianchettoing the king's bishop.",
    assessment: "Avoids open Sicilian theory but allows Black easy development; White's setup is sound but not particularly threatening at the top level.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Smith-Morra Gambit",
    eco: "B21",
    moves: ["e4","c5","d4","cxd4","c3"],
    description: "White sacrifices a pawn for rapid development and attacking chances.",
    assessment: "Tricky at club level but considered insufficient at master level — Black has well-known declining systems that equalize without holding the pawn. Surprise weapon.",
    tier: "D",
    popularity: 1
  },
  {
    name: "Grand Prix Attack",
    eco: "B23",
    moves: ["e4","c5","Nc3","Nc6","f4"],
    description: "An aggressive anti-Sicilian aiming for kingside attack with f4.",
    assessment: "Aggressive but theoretically suspect — Black has multiple reliable equalizing systems. The f4 push commits early and gives Black clear targets.",
    tier: "D",
    popularity: 1
  },
  {
    name: "Sicilian Rossolimo",
    eco: "B30",
    moves: ["e4","c5","Nf3","Nc6","Bb5"],
    description: "Anti-Sicilian system — White pins the c6 knight and sidesteps the Open Sicilian's huge body of theory.",
    assessment: "Massively popular at every level since the 2010s — Carlsen, Caruana, and Nakamura all use it. Leads to quiet positional play with a small but durable edge for White.",
    tier: "A",
    popularity: 4
  },
  {
    name: "Moscow Variation",
    eco: "B51",
    moves: ["e4","c5","Nf3","d6","Bb5+"],
    description: "Anti-Sicilian system — Bb5+ on move 3 against ...d6, sidestepping Najdorf and Dragon theory entirely.",
    assessment: "Modern top-level players' go-to when they don't want to memorize forty moves of Najdorf. Forces Black into a less ambitious setup than the main Sicilian.",
    tier: "A",
    popularity: 4
  },

  // ===== French / Caro / Other 1.e4 =====
  {
    name: "French Defense",
    eco: "C00",
    moves: ["e4","e6"],
    description: "Black prepares ...d5 to challenge the center, accepting a cramped but solid position.",
    assessment: "Strategic battleground — Black accepts a cramped position and a 'bad' light-squared bishop for a solid structure and clear pawn-break plans (...c5, ...f6).",
    tier: "S",
    popularity: 4
  },
  {
    name: "French Advance",
    eco: "C02",
    moves: ["e4","e6","d4","d5","e5"],
    description: "White locks the center to claim space; Black attacks with ...c5 and ...f6.",
    assessment: "White claims space but the closed center is slow; Black has clear pawn breaks (...c5, ...f6) and the c8-bishop problem is solvable.",
    tier: "C",
    popularity: 2
  },
  {
    name: "French Winawer",
    eco: "C15",
    moves: ["e4","e6","d4","d5","Nc3","Bb4"],
    description: "Sharp pinning system; Black often doubles White's pawns for activity.",
    assessment: "Sharp and double-edged — Black inflicts doubled c-pawns on White but accepts a cramped position. Well-established theory in both directions.",
    tier: "B",
    popularity: 3
  },
  {
    name: "French Tarrasch",
    eco: "C03",
    moves: ["e4","e6","d4","d5","Nd2"],
    description: "A flexible response avoiding the Winawer pin.",
    assessment: "Solid avoidance of the Winawer's structural concessions — Nd2 is less ambitious than Nc3 but keeps a small, clean edge.",
    tier: "B",
    popularity: 3
  },
  {
    name: "French Exchange",
    eco: "C01",
    moves: ["e4","e6","d4","d5","exd5","exd5"],
    description: "Symmetrical and quiet — generally considered drawish.",
    assessment: "Notoriously drawish — symmetrical pawn structure means neither side has natural winning chances. Played mostly to deflect Black's preparation.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Caro-Kann Defense",
    eco: "B10",
    moves: ["e4","c6"],
    description: "Solid and flexible; Black prepares ...d5 with the c-pawn supporting it.",
    assessment: "Black's most resilient defense to 1.e4 — solid pawn structure, no bad bishop (compared to French), and active piece development. A favorite of careful positional players.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Caro-Kann Classical",
    eco: "B18",
    moves: ["e4","c6","d4","d5","Nc3","dxe4","Nxe4","Bf5"],
    description: "The main line where Black develops the light-squared bishop actively.",
    assessment: "The big payoff of the Caro-Kann — Black gets the light-squared bishop outside the pawn chain (rare against 1.e4) before playing ...e6.",
    tier: "B",
    popularity: 3
  },
  {
    name: "Caro-Kann Advance",
    eco: "B12",
    moves: ["e4","c6","d4","d5","e5"],
    description: "White claims space and locks the center, similar to French Advance.",
    assessment: "Sound but slightly cramps Black; the light-squared bishop has more breathing room than in the French Advance, so theory is well-mapped for both sides.",
    tier: "B",
    popularity: 3
  },
  {
    name: "Panov-Botvinnik Attack",
    eco: "B13",
    moves: ["e4","c6","d4","d5","exd5","cxd5","c4"],
    description: "An aggressive line creating an isolated d-pawn for active piece play.",
    assessment: "Sharp deviation from typical Caro-Kann play — both sides accept an isolated d-pawn for active piece play. Sound but less Caro-like in flavor.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Scandinavian Defense",
    eco: "B01",
    moves: ["e4","d5"],
    aliases: ["Center Counter Defense"],
    description: "Black challenges e4 directly on move one.",
    assessment: "Direct but committal — Black's queen ends up exposed early after recapturing on d5, and White typically gets a small lasting edge. Sound at club level.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Pirc Defense",
    eco: "B07",
    moves: ["e4","d6","d4","Nf6","Nc3","g6"],
    description: "Hypermodern: Black lets White build a center, then attacks it with pieces.",
    assessment: "Hypermodern — Black lets White build the center, then attacks it. Sound but unambitious; gives White too much center to fight for an opening edge.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Modern Defense",
    eco: "B06",
    moves: ["e4","g6"],
    description: "An ultra-flexible hypermodern setup with the king's fianchetto.",
    assessment: "Maximum move-order flexibility — Black can transpose to Pirc, King's Indian, or Modern structures. Sound but slightly passive without precise follow-up.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Austrian Attack",
    eco: "B09",
    moves: ["e4","d6","d4","Nf6","Nc3","g6","f4"],
    description: "Aggressive anti-Pirc system — White builds a huge pawn center with f4 and aims for a kingside attack.",
    assessment: "The most ambitious challenge to the Pirc — direct, sharp, theory-heavy. If White's center holds, Black is positionally lost; if it cracks, White has overextended.",
    tier: "B",
    popularity: 2
  },
  {
    name: "150 Attack",
    eco: "B07",
    moves: ["e4","d6","d4","Nf6","Nc3","g6","Be3"],
    description: "Modern anti-Pirc / anti-Modern setup — White plans Qd2, O-O-O, and a kingside pawn storm.",
    assessment: "Named after the English 150-point club rating — easy to play with one clear plan (Qd2, h4-h5, O-O-O). Considered a serious challenge to the Pirc that doesn't require deep theory.",
    tier: "B",
    popularity: 2
  },
  {
    name: "Alekhine's Defense",
    eco: "B02",
    moves: ["e4","Nf6"],
    description: "A provocative defense inviting White to overextend with central pawns.",
    assessment: "Provocative — Black invites White to overextend with central pawns, hoping to undermine them. Risky and only works if White overpushes; otherwise Black is just cramped.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Nimzowitsch Defense",
    eco: "B00",
    moves: ["e4","Nc6"],
    description: "An offbeat hypermodern reply to 1.e4 named after Aron Nimzowitsch.",
    assessment: "Offbeat — sound enough but commits the knight to a passive square (it usually wants to be on f6 against e4). Almost never played at the top level.",
    tier: "D",
    popularity: 1
  },

  // ===== Queen's Pawn / Closed games =====
  {
    name: "Queen's Gambit",
    eco: "D06",
    moves: ["d4","d5","c4"],
    description: "Classical opening offering the c-pawn to deflect Black from the center.",
    assessment: "Classical central play — White offers a temporary pawn sacrifice to deflect Black from supporting d5 with c-pawn. The deepest of the Closed Game openings.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Queen's Gambit Accepted",
    eco: "D20",
    moves: ["d4","d5","c4","dxc4"],
    description: "Black takes the pawn; White expects to recover it while gaining the center.",
    assessment: "Black grabs the pawn temporarily — White recovers it while gaining a strong center. Sound for both sides; Black just needs to develop quickly to neutralize White's space.",
    tier: "S",
    popularity: 3
  },
  {
    name: "Queen's Gambit Declined",
    eco: "D30",
    moves: ["d4","d5","c4","e6"],
    description: "Solid classical defense; Black supports d5 at the cost of the c8 bishop.",
    assessment: "The QGD has been a tournament workhorse for over a century — solid pawn structure, clear plans, and a deep theoretical foundation. The 'safe' choice against 1.d4.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Slav Defense",
    eco: "D10",
    moves: ["d4","d5","c4","c6"],
    description: "Solid response to the Queen's Gambit keeping the c8-bishop's diagonal open.",
    assessment: "Black supports d5 with c6 instead of e6 — keeping the c8-bishop's diagonal open is a major positional plus. Classical, sound, and theoretically deep.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Semi-Slav Defense",
    eco: "D43",
    moves: ["d4","d5","c4","c6","Nf3","Nf6","Nc3","e6"],
    description: "Combines Slav and QGD; rich, complex middlegame positions.",
    assessment: "Black keeps both options (c6 and e6) for maximum flexibility — leads to the rich, sharp middlegames that grandmasters love. Anand and Kramnik favorites.",
    tier: "S",
    popularity: 3
  },
  {
    name: "Albin Counter-Gambit",
    eco: "D08",
    moves: ["d4","d5","c4","e5"],
    description: "Black sacrifices a pawn to disrupt White's plans and gain piece activity.",
    assessment: "Black sacrifices a pawn to disrupt White — sound at club level but White has clear paths to a small but lasting edge with accurate play.",
    tier: "D",
    popularity: 1
  },
  {
    name: "King's Indian Defense",
    eco: "E60",
    moves: ["d4","Nf6","c4","g6"],
    description: "Hypermodern defense; Black fianchettoes and counterattacks White's center.",
    assessment: "Combative hypermodern — Black lets White build the center, then strikes back with kingside expansion. A favorite of attacking players (Fischer, Kasparov, Nakamura).",
    tier: "S",
    popularity: 4
  },
  {
    name: "Grünfeld Defense",
    eco: "D80",
    moves: ["d4","Nf6","c4","g6","Nc3","d5"],
    description: "Black challenges the center with ...d5, leading to dynamic, theoretical play.",
    assessment: "Black challenges the center with ...d5 instead of supporting it — dynamic and theoretically deep. Used at the world championship level (Kasparov, Karjakin).",
    tier: "S",
    popularity: 3
  },
  {
    name: "Nimzo-Indian Defense",
    eco: "E20",
    moves: ["d4","Nf6","c4","e6","Nc3","Bb4"],
    description: "Pin on c3 to control e4 — a top-tier defense at all levels.",
    assessment: "Pin on c3 prevents White's natural e4 push — Black gives up the bishop pair for long-term structural control. Considered one of the soundest defenses to 1.d4.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Queen's Indian Defense",
    eco: "E12",
    moves: ["d4","Nf6","c4","e6","Nf3","b6"],
    description: "Black fianchettoes the queen's bishop to contest the long diagonal.",
    assessment: "Black contests the long light-square diagonal with ...b6/Bb7 — solid, flexible, and well-tested. The natural fallback when White avoids the Nimzo with Nf3.",
    tier: "S",
    popularity: 3
  },
  {
    name: "Bogo-Indian Defense",
    eco: "E11",
    moves: ["d4","Nf6","c4","e6","Nf3","Bb4+"],
    description: "Pin via Bb4+ when White avoids the Nimzo with Nf3.",
    assessment: "Pin avoiding the Nimzo when White plays Nf3 first — Black equalizes solidly but with less dynamic potential than the Queen's Indian.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Catalan Opening",
    eco: "E00",
    moves: ["d4","Nf6","c4","e6","g3"],
    description: "Combines Queen's Gambit and king's fianchetto for long-term pressure.",
    assessment: "Long-term positional pressure on the queenside through the fianchettoed bishop — a torture-by-small-edges weapon. Favored by patient positional grandmasters.",
    tier: "S",
    popularity: 3
  },
  {
    name: "Benoni Defense",
    eco: "A60",
    moves: ["d4","Nf6","c4","c5"],
    description: "Black challenges the d-pawn early, leading to asymmetric pawn structures.",
    assessment: "Asymmetric structure — Black gets queenside space but accepts a long-term backward d6 pawn. Sound but theoretically demanding for Black.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Modern Benoni",
    eco: "A60",
    moves: ["d4","Nf6","c4","c5","d5","e6"],
    description: "Sharp, double-edged Benoni structure with central tension.",
    assessment: "Sharp double-edged Benoni — Black gets active piece play and counterchances on the queenside, but White's space advantage is real. Tal-style territory.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Benko Gambit",
    eco: "A57",
    moves: ["d4","Nf6","c4","c5","d5","b5"],
    description: "Black sacrifices a pawn for long-term queenside pressure on open lines.",
    assessment: "A pawn for long-term queenside pressure on open a- and b-files — slow-burn compensation that's fully sound but demands accurate technique from Black.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Dutch Defense",
    eco: "A80",
    moves: ["d4","f5"],
    description: "Black aims for kingside play and a Stonewall or Leningrad structure.",
    assessment: "Aggressive kingside play but the f5 push weakens the kingside light squares — sound but committal. White can punish inaccuracies at every level.",
    tier: "C",
    popularity: 2
  },
  {
    name: "London System",
    eco: "D02",
    moves: ["d4","Nf6","Nf3","e6","Bf4"],
    description: "Solid, system-based opening with the bishop developed outside the pawn chain.",
    assessment: "System-based and easy to learn — White plays the same setup against most Black replies. Sound but allows Black to equalize without much effort if they know the plans.",
    tier: "B",
    popularity: 4
  },
  {
    name: "Trompowsky Attack",
    eco: "A45",
    moves: ["d4","Nf6","Bg5"],
    description: "Early bishop sortie to disrupt Black's setup before standard development.",
    assessment: "Disrupts Black's standard setup before they can choose between Indian defenses — sound and tricky, though the early bishop sortie costs a tempo.",
    tier: "B",
    popularity: 3
  },
  {
    name: "Torre Attack",
    eco: "A46",
    moves: ["d4","Nf6","Nf3","e6","Bg5"],
    description: "A solid system pinning the f6-knight; quieter than the Trompowsky.",
    assessment: "Quieter Trompowsky cousin — sound system play but doesn't pose serious problems. Black has clear paths to equality with accurate play.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Colle System",
    eco: "D04",
    moves: ["d4","d5","Nf3","Nf6","e3"],
    description: "Quiet system development with a delayed central break via e4.",
    assessment: "Safe system play with a delayed e4 break — but the slow setup gives Black plenty of time to organize. Doesn't pose serious problems to a prepared opponent.",
    tier: "C",
    popularity: 2
  },
  {
    name: "Veresov Attack",
    eco: "D01",
    moves: ["d4","Nf6","Nc3","d5","Bg5"],
    description: "Aggressive Queen's Pawn opening with rapid piece development.",
    assessment: "Slightly inferior queen's-pawn opening — Black has reliable systems that equalize easily. Played mostly for surprise value.",
    tier: "D",
    popularity: 1
  },

  // ===== Flank openings =====
  {
    name: "English Opening",
    eco: "A10",
    moves: ["c4"],
    description: "Flexible flank opening; can transpose into many central structures.",
    assessment: "Maximum flexibility — White can transpose into many central structures while denying Black the open game. A favorite of move-order specialists like Anatoly Karpov.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Réti Opening",
    eco: "A09",
    moves: ["Nf3","d5","c4"],
    description: "Hypermodern flank opening attacking d5 from a distance.",
    assessment: "Hypermodern flank attack on d5 — sound but typically transposes into other openings (English, QGD, etc.) rather than creating independent winning chances.",
    tier: "B",
    popularity: 3
  },
  {
    name: "King's Indian Attack",
    eco: "A07",
    moves: ["Nf3","d5","g3"],
    description: "A flexible white system mirroring the King's Indian Defense setup.",
    assessment: "Mirror of the King's Indian Defense for White — sound and easy to play but rarely creates winning chances at the top level. A time-saver against many Black setups.",
    tier: "C",
    popularity: 3
  },
  {
    name: "Bird's Opening",
    eco: "A02",
    moves: ["f4"],
    description: "An offbeat opening aiming at e5 and a kingside attack — a Dutch with colors reversed.",
    assessment: "Dutch with colors reversed — but the f4 push weakens White's kingside without enough compensation. Rarely seen at master level.",
    tier: "D",
    popularity: 1
  },
  {
    name: "Larsen's Opening",
    eco: "A01",
    moves: ["b3"],
    aliases: ["Nimzo-Larsen Attack"],
    description: "Hypermodern opening fianchettoing the queen's bishop on b2.",
    assessment: "Hypermodern fianchetto — sound but doesn't pose serious problems. Black has multiple natural setups that lead to comfortable equality.",
    tier: "D",
    popularity: 1
  },
  {
    name: "Sokolsky Opening",
    eco: "A00",
    moves: ["b4"],
    aliases: ["Polish Opening","Orangutan"],
    description: "An unorthodox flank opening grabbing queenside space immediately.",
    assessment: "Unorthodox flank pawn push — sound at club level but Black equalizes with simple central play. Surprise weapon for the very brave.",
    tier: "D",
    popularity: 1
  },
  {
    name: "Grob's Attack",
    eco: "A00",
    moves: ["g4"],
    description: "Provocative and risky — weakens the kingside but can surprise opponents.",
    assessment: "Severely weakens White's kingside — borderline unsound and considered dubious by every authority. Viable only as a one-off surprise against unprepared opponents.",
    tier: "F",
    popularity: 1
  },

  // ===== Sub-variations and additional intermediate-level lines =====
  // Sicilian Defense sub-variations
  {
    name: "Richter-Rauzer Attack",
    eco: "B62",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","Nc6","Bg5"],
    description: "Classical Sicilian where White pins the f6-knight with Bg5 to disrupt Black's setup.",
    assessment: "A heavily theoretical mainline that has stood for nearly a century — both sides know exactly what they're doing, and the resulting middlegames are well-mapped at the top level.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Najdorf English Attack",
    eco: "B90",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","a6","Be3"],
    description: "Sharp Najdorf treatment with Be3 preparing f3, Qd2 and queenside castling.",
    assessment: "The most aggressive modern Najdorf system — opposite-side castling, rapid pawn storms. Top-level theory in both directions; concrete calculation matters more than general principles.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Najdorf Sozin Variation",
    eco: "B86",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","a6","Bc4"],
    description: "Aggressive Najdorf line aiming the bishop at f7 and preparing kingside attack.",
    assessment: "Sound and dangerous at club level, though modern theory has Black's defensive resources well sorted. Less popular than the English Attack at the top but still a respectable weapon.",
    tier: "B",
    popularity: 2
  },
  {
    name: "Yugoslav Attack",
    eco: "B77",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","g6","Be3","Bg7","f3"],
    description: "Main anti-Dragon system: White prepares Qd2, O-O-O and a kingside pawn avalanche.",
    assessment: "The classical refutation attempt of the Sicilian Dragon — both sides race for the opposing king with opposite-side castling. Sharpest opening in chess theory.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Maróczy Bind",
    eco: "B36",
    moves: ["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","g6","c4"],
    description: "Anti-Accelerated-Dragon setup where c4 + e4 grips the d5 square long-term.",
    assessment: "A small but lasting space advantage that's hard for Black to free; Karpov-style positional play. Sound and respected at the top level.",
    tier: "B",
    popularity: 2
  },

  // Ruy Lopez sub-variations
  {
    name: "Closed Ruy Lopez",
    eco: "C84",
    moves: ["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Be7"],
    description: "The classical Spanish mainline; both sides develop and prepare for a long maneuvering middlegame.",
    assessment: "The deepest opening in chess theory — entire books exist on its sub-variations. A staple at every level from club through world championship.",
    tier: "S",
    popularity: 4
  },
  {
    name: "Open Ruy Lopez",
    eco: "C80",
    moves: ["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Nxe4"],
    description: "Black grabs the e4 pawn instead of supporting e5 — leads to sharp, open positions.",
    assessment: "An aggressive, time-honored response — Korchnoi and Anand have used it in title matches. Sharp tactical play with concrete equalizing chances.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Marshall Attack",
    eco: "C89",
    moves: ["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Be7","Re1","b5","Bb3","O-O","c3","d5"],
    description: "Black sacrifices the e5 pawn for a long-lasting initiative on the kingside.",
    assessment: "A dangerous prepared weapon for Black — even at the top level White often sidesteps with anti-Marshall lines. Sound and venomous.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Ruy Lopez Exchange",
    eco: "C68",
    moves: ["e4","e5","Nf3","Nc6","Bb5","a6","Bxc6"],
    description: "White trades on c6 immediately, doubling Black's pawns for a long endgame edge.",
    assessment: "Simpler than the closed Spanish but still venomous — Bobby Fischer used it to great effect. Easier to learn while preserving real winning chances.",
    tier: "B",
    popularity: 3
  },
  {
    name: "Schliemann Defense",
    eco: "C63",
    moves: ["e4","e5","Nf3","Nc6","Bb5","f5"],
    aliases: ["Jaenisch Gambit"],
    description: "Black throws ...f5 to disrupt White's setup, accepting a weakened kingside.",
    assessment: "Sharp and surprisingly resilient at club level, though deeply analyzed lines give White a small edge. A respectable surprise weapon.",
    tier: "C",
    popularity: 1
  },
  {
    name: "Ruy Lopez Steinitz Defense",
    eco: "C62",
    moves: ["e4","e5","Nf3","Nc6","Bb5","d6"],
    description: "Old solid defense supporting e5 with the d-pawn — quiet and a bit passive.",
    assessment: "Reliable but cramped — Black's piece play is restricted. Steinitz himself defended it; modern players prefer the more active Berlin or Closed.",
    tier: "C",
    popularity: 1
  },

  // French Defense sub-variations
  {
    name: "French McCutcheon",
    eco: "C12",
    moves: ["e4","e6","d4","d5","Nc3","Nf6","Bg5","Bb4"],
    description: "Sharp pinning system — Black challenges White's setup with an immediate ...Bb4.",
    assessment: "Double-edged from the start — both sides accept structural concessions for activity. Theoretically sound and a regular guest in tournament play.",
    tier: "B",
    popularity: 2
  },
  {
    name: "French Classical",
    eco: "C11",
    moves: ["e4","e6","d4","d5","Nc3","Nf6","e5"],
    description: "White advances e5 to clamp down on the kingside; Black plans ...c5 and ...f6 breaks.",
    assessment: "A classical wedge that gives White space; modern theory has Black's counterplay well-mapped. Sound for both sides.",
    tier: "B",
    popularity: 2
  },
  {
    name: "French Rubinstein",
    eco: "C10",
    moves: ["e4","e6","d4","d5","Nc3","dxe4"],
    description: "Black accepts a slightly worse but solid position by trading on e4 immediately.",
    assessment: "Solid and drawish — Black avoids most theoretical headaches. White retains a small edge but real winning chances against a prepared opponent are limited.",
    tier: "B",
    popularity: 2
  },
  {
    name: "French Burn",
    eco: "C11",
    moves: ["e4","e6","d4","d5","Nc3","Nf6","Bg5","dxe4"],
    description: "Black breaks the pin by capturing on e4, simplifying into solid territory.",
    assessment: "A pragmatic solidifier — Black trades pieces and reaches comfortable structures. Used at the top level by players seeking minimal risk.",
    tier: "B",
    popularity: 2
  },

  // Caro-Kann sub-variations
  {
    name: "Caro-Kann Fantasy Variation",
    eco: "B12",
    moves: ["e4","c6","d4","d5","f3"],
    description: "Aggressive anti-Caro-Kann — White supports the e4 pawn with f3 and prepares a kingside attack.",
    assessment: "Sharp and uncompromising. Popularized by Bronstein and revived by Karjakin; pressures Black to know precise theory or get crushed early.",
    tier: "B",
    popularity: 2
  },
  {
    name: "Caro-Kann Exchange",
    eco: "B13",
    moves: ["e4","c6","d4","d5","exd5","cxd5"],
    description: "White trades central tension immediately, leaving a symmetrical pawn structure.",
    assessment: "Quiet and considered slightly drawish, but used as a low-theory practical weapon — easy to play with simple plans (Bd3, c3, Nf3, Bf4).",
    tier: "B",
    popularity: 2
  },
  {
    name: "Caro-Kann Two Knights",
    eco: "B11",
    moves: ["e4","c6","Nc3","d5","Nf3"],
    description: "White develops both knights early; flexible setup avoiding the main Caro-Kann theory.",
    assessment: "A modest sideline — sound enough but doesn't pose Black serious problems. Used as a move-order tool more than for advantage.",
    tier: "B",
    popularity: 2
  },
  {
    name: "Caro-Kann Karpov",
    eco: "B17",
    moves: ["e4","c6","d4","d5","Nc3","dxe4","Nxe4","Nd7"],
    description: "Solid mainline where Black prepares ...Ngf6 without allowing the knight trade.",
    assessment: "Karpov's signature — exemplifies prophylactic Caro-Kann play. Rock-solid and a workhorse at the top level for decades.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Caro-Kann Tartakower",
    eco: "B16",
    moves: ["e4","c6","d4","d5","Nc3","dxe4","Nxe4","Nf6","Nxf6+","gxf6"],
    description: "Black recaptures with the g-pawn, accepting doubled pawns for the half-open g-file.",
    assessment: "A committal but interesting choice — Black gets the bishop pair and an open g-file. Less popular than Karpov-style play but sound at master level.",
    tier: "B",
    popularity: 2
  },

  // Queen's Gambit Declined sub-variations
  {
    name: "QGD Tartakower",
    eco: "D58",
    moves: ["d4","d5","c4","e6","Nc3","Nf6","Bg5","Be7","e3","O-O","Nf3","h6","Bh4","b6"],
    description: "Black fianchettoes the queen's bishop to develop the worst piece in the QGD.",
    assessment: "The standard solution to the QGD's bad-bishop problem — sound and respected, played by Spassky, Karpov, Kramnik. Drawish but reliable.",
    tier: "A",
    popularity: 3
  },
  {
    name: "QGD Lasker Defense",
    eco: "D56",
    moves: ["d4","d5","c4","e6","Nc3","Nf6","Bg5","Be7","e3","O-O","Nf3","h6","Bh4","Ne4"],
    description: "Black trades pieces with ...Ne4 to relieve the cramped position.",
    assessment: "Black's classical equalizer — exchange enough pieces and you don't suffer. Boris Gelfand and Vladimir Kramnik favorites.",
    tier: "A",
    popularity: 3
  },
  {
    name: "QGD Cambridge Springs",
    eco: "D52",
    moves: ["d4","d5","c4","e6","Nc3","Nf6","Bg5","Nbd7","e3","c6","Nf3","Qa5"],
    description: "Tactical Black setup using ...Qa5 to attack the c3-knight and the Bg5.",
    assessment: "Trickier than it looks — White must navigate accurately or fall into tactical traps. Sound club-level weapon, less common at the top.",
    tier: "B",
    popularity: 2
  },
  {
    name: "QGD Orthodox Defense",
    eco: "D63",
    moves: ["d4","d5","c4","e6","Nc3","Nf6","Bg5","Be7","e3","O-O","Nf3","Nbd7"],
    description: "Classical solid QGD setup — Black develops naturally without committal pawn moves.",
    assessment: "The ur-QGD — a tournament workhorse for over a century. Forgives small inaccuracies and is the standard recommendation for new students of 1.d4 d5 setups.",
    tier: "A",
    popularity: 3
  },

  // Slav sub-variations
  {
    name: "Slav Chebanenko",
    eco: "D15",
    moves: ["d4","d5","c4","c6","Nf3","Nf6","Nc3","a6"],
    description: "Modern Slav where Black plays ...a6 first to keep maximum flexibility.",
    assessment: "Carlsen-era Slav — flexible and concrete, Black waits to see White's setup before committing. Solid as the older Slav lines but harder to grind down.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Slav Schlechter",
    eco: "D44",
    moves: ["d4","d5","c4","c6","Nf3","Nf6","Nc3","e6","Bg5","dxc4"],
    description: "Slav line where Black takes on c4 in response to Bg5 — sharp, principled play.",
    assessment: "A respected sideline of the Semi-Slav family — sound theoretical foundations but less common than the main Anti-Meran or Botvinnik lines.",
    tier: "B",
    popularity: 2
  },

  // King's Indian Defense main lines
  {
    name: "KID Mar del Plata",
    eco: "E97",
    moves: ["d4","Nf6","c4","g6","Nc3","Bg7","e4","d6","Nf3","O-O","Be2","e5","O-O","Nc6","d5"],
    description: "Classical King's Indian where d5 closes the center and triggers a wing race.",
    assessment: "The KID at its purest — White attacks queenside, Black attacks kingside, neither side helps the other. Sharp and concrete.",
    tier: "A",
    popularity: 3
  },
  {
    name: "KID Sämisch Variation",
    eco: "E80",
    moves: ["d4","Nf6","c4","g6","Nc3","Bg7","e4","d6","f3"],
    description: "White plays f3 early to lock down the center and prepare a kingside pawn avalanche.",
    assessment: "Anti-KID system that takes the fight on White's terms — slow and strategic if Black plays passively, sharp if Black goes for ...c5 or ...e5 breaks.",
    tier: "B",
    popularity: 2
  },
  {
    name: "KID Fianchetto Variation",
    eco: "E62",
    moves: ["d4","Nf6","c4","g6","Nc3","Bg7","g3"],
    description: "White fianchettoes the king's bishop, neutralizing Black's hypermodern setup.",
    assessment: "The quiet anti-KID — White takes the sting out of ...e5 and ...f5 by mirroring the kingside fianchetto. Sound, drawish, but rarely refuted.",
    tier: "B",
    popularity: 2
  },
  {
    name: "KID Bayonet Attack",
    eco: "E97",
    moves: ["d4","Nf6","c4","g6","Nc3","Bg7","e4","d6","Nf3","O-O","Be2","e5","O-O","Nc6","d5","Ne7","b4"],
    description: "White rushes b4 to crack the queenside before Black's kingside attack arrives.",
    assessment: "Modern weapon of choice against the KID's Mar del Plata — Kramnik used it heavily. Concrete and dangerous if Black isn't precise.",
    tier: "A",
    popularity: 3
  },
  {
    name: "KID Four Pawns Attack",
    eco: "E76",
    moves: ["d4","Nf6","c4","g6","Nc3","Bg7","e4","d6","f4"],
    description: "White grabs maximum central space with f4 — committal but ambitious.",
    assessment: "Romantic anti-KID with c4/d4/e4/f4 pawn wedge. Risky — overextends, and Black has well-known counters with ...c5 or ...e5. Sound but rarely top choice.",
    tier: "B",
    popularity: 1
  },

  // Nimzo-Indian sub-variations
  {
    name: "Nimzo-Indian Rubinstein",
    eco: "E40",
    moves: ["d4","Nf6","c4","e6","Nc3","Bb4","e3"],
    description: "Most popular Nimzo treatment — White develops solidly with e3 and Nf3.",
    assessment: "The flexible workhorse against the Nimzo — White avoids structural damage and prepares Bd3 / Nf3 / O-O. Standard at every level.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Nimzo-Indian Classical",
    eco: "E32",
    moves: ["d4","Nf6","c4","e6","Nc3","Bb4","Qc2"],
    description: "Capablanca's setup: Qc2 prevents the doubled pawns and prepares slow positional play.",
    assessment: "A solid mainline — White avoids the structural concessions of the Sämisch but accepts a tempo loss. Carlsen has used it as a go-to weapon.",
    tier: "A",
    popularity: 3
  },
  {
    name: "Nimzo-Indian Sämisch",
    eco: "E25",
    moves: ["d4","Nf6","c4","e6","Nc3","Bb4","a3","Bxc3+","bxc3"],
    description: "White accepts doubled c-pawns in exchange for the bishop pair and a strong center.",
    assessment: "Bishop pair vs structural damage — a long-running positional argument. Sound but theoretically demanding; less common than the Rubinstein at the top.",
    tier: "B",
    popularity: 2
  },

  // Other intermediate-level standalone openings
  {
    name: "Tarrasch Defense",
    eco: "D32",
    moves: ["d4","d5","c4","e6","Nc3","c5"],
    description: "Black challenges the center with ...c5, accepting an isolated d-pawn for activity.",
    assessment: "Active piece play vs. structural weakness — a classical IQP debate. Sound but theoretically hard to play; Kasparov used it as a young player.",
    tier: "B",
    popularity: 2
  },
  {
    name: "Old Indian Defense",
    eco: "A53",
    moves: ["d4","Nf6","c4","d6"],
    description: "Pre-King's-Indian setup; Black prepares ...e5 instead of fianchettoing the bishop.",
    assessment: "Solid but passive — Black gives up the kingside fianchetto to keep the position quieter. Less popular than the King's Indian since the hypermodern era.",
    tier: "C",
    popularity: 1
  },
  {
    name: "Englund Gambit",
    eco: "A40",
    moves: ["d4","e5"],
    description: "Black sacrifices the e-pawn immediately to disrupt White's central plans.",
    assessment: "Practically refuted at master level — White's correct moves give a clear extra pawn with no compensation. Pure surprise weapon.",
    tier: "F",
    popularity: 1
  },
  {
    name: "Blackmar-Diemer Gambit",
    eco: "D00",
    moves: ["d4","d5","e4","dxe4","Nc3"],
    description: "White sacrifices the e-pawn for rapid development and attacking chances.",
    assessment: "Tricky club-level attacking weapon — Black has clear declining systems but accepting the gambit invites real trouble. Considered insufficient at master level.",
    tier: "D",
    popularity: 1
  },
  {
    name: "Stonewall Dutch",
    eco: "A95",
    moves: ["d4","f5","c4","Nf6","Nf3","e6","g3","d5"],
    description: "Black builds a pawn wedge on c6/d5/e6/f5 — slow but solid kingside attack setup.",
    assessment: "A specific Dutch structure favoring strategic play — the wedge is hard to break but Black's c8-bishop suffers. Sound at every level.",
    tier: "B",
    popularity: 2
  },
  {
    name: "Leningrad Dutch",
    eco: "A87",
    moves: ["d4","f5","c4","Nf6","Nf3","g6"],
    description: "Hypermodern Dutch where Black fianchettoes the king's bishop King's-Indian-style.",
    assessment: "More dynamic than the Stonewall — Black accepts the f5 weakening for active piece play and kingside attacking chances. Sound and respectable.",
    tier: "B",
    popularity: 2
  }
];

// Build random distractor list helpers. `customPool`, when provided, is the
// preferred source — if it's smaller than `n`, we fall back to OPENINGS to
// fill out the remaining slots so the quiz still has enough choices.
function getRandomOpenings(n, exclude, customPool) {
  const primary = (customPool || OPENINGS).filter(o => !exclude || o.name !== exclude.name);
  if (primary.length >= n) {
    return primary.slice().sort(() => Math.random() - 0.5).slice(0, n);
  }
  const usedNames = new Set(primary.map(o => o.name));
  if (exclude) usedNames.add(exclude.name);
  const fillers = OPENINGS.filter(o => !usedNames.has(o.name));
  const filled = primary.concat(fillers.slice().sort(() => Math.random() - 0.5).slice(0, n - primary.length));
  return filled.slice().sort(() => Math.random() - 0.5);
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
  S: {
    label: "S",
    desc: "Top-tier — the gold standard. Sound, deeply theoretical, used at the world-championship level. The most rewarding to study deeply."
  },
  A: {
    label: "A",
    desc: "Excellent — fully sound mainline opening, regularly played by elite grandmasters."
  },
  B: {
    label: "B",
    desc: "Good — sound and respectable but slightly less ambitious or less common at the absolute top level."
  },
  C: {
    label: "C",
    desc: "Solid — sound at every level but lets the opponent equalize comfortably. A reliable but unambitious choice."
  },
  D: {
    label: "D",
    desc: "Sideline — playable at club level but considered dubious at master level. Surprise-weapon territory."
  },
  F: {
    label: "F",
    desc: "Refuted or near-refuted — known to be unsound or strategically inferior. Not recommended for serious study."
  }
};

const POPULARITY_LABELS = {
  1: "Rare",
  2: "Uncommon",
  3: "Common",
  4: "Very common"
};

const POPULARITY_DESCS = {
  1: "Rare — surprise value only, almost never played at the top level.",
  2: "Uncommon — appears occasionally in master games.",
  3: "Common — regularly seen at the top level.",
  4: "Very common — a top-frequency choice in master practice."
};

// "Audience" tags — patched onto each opening so renderers can show small
// flags. Beginner-friendly = clear plans, low risk of immediate disaster,
// easy to learn. Intermediate-friendly = serious-study material for a
// player past the basics; sound theoretical foundations, manageable
// complexity. GM-friendly = regularly appears in modern top-level games.
// The three are independent: an opening can be any combination, including
// none (e.g. dubious sidelines).
const BEGINNER_FRIENDLY_OPENINGS = new Set([
  "Italian Game", "Giuoco Piano", "Two Knights Defense", "Scotch Game",
  "Four Knights Game", "Vienna Game", "Bishop's Opening", "Petrov's Defense",
  "Sicilian Alapin", "Sicilian Closed",
  "Smith-Morra Gambit", "Grand Prix Attack",
  "French Defense", "French Advance", "French Tarrasch", "French Exchange",
  "Caro-Kann Defense", "Caro-Kann Classical", "Caro-Kann Advance",
  "Caro-Kann Exchange",
  "Scandinavian Defense",
  "Queen's Gambit", "Queen's Gambit Accepted", "Queen's Gambit Declined",
  "Slav Defense", "London System", "Torre Attack", "Colle System",
  "King's Indian Attack",
  // Sub-variation additions easy enough to start with
  "Ruy Lopez Exchange", "QGD Orthodox Defense", "Blackmar-Diemer Gambit"
]);

const INTERMEDIATE_FRIENDLY_OPENINGS = new Set([
  // All S-tier
  "Italian Game", "Ruy Lopez", "Sicilian Defense", "Sicilian Najdorf",
  "French Defense", "Caro-Kann Defense", "Queen's Gambit",
  "Queen's Gambit Declined", "Slav Defense", "King's Indian Defense",
  "Nimzo-Indian Defense",
  // All A-tier
  "Berlin Defense", "Petrov's Defense", "Sicilian Dragon",
  "Sicilian Sveshnikov", "Sicilian Scheveningen", "Sicilian Taimanov",
  "Semi-Slav Defense", "Grünfeld Defense", "Queen's Indian Defense",
  "Catalan Opening", "English Opening",
  // All B-tier
  "Giuoco Piano", "Two Knights Defense", "Scotch Game", "Sicilian Alapin",
  "Sicilian Rossolimo", "Moscow Variation",
  "Smith-Morra Gambit", "Grand Prix Attack",
  "French Winawer", "French Tarrasch", "Caro-Kann Classical",
  "Caro-Kann Advance", "Caro-Kann Fantasy Variation", "Caro-Kann Exchange",
  "Austrian Attack", "150 Attack",
  "Queen's Gambit Accepted", "London System",
  "Trompowsky Attack", "Réti Opening",
  // Selected C-tier (sound non-system mainlines worth studying)
  "Sicilian Kan", "Accelerated Dragon", "Sicilian Closed",
  "French Advance", "Panov-Botvinnik Attack", "Scandinavian Defense",
  "Pirc Defense", "Modern Defense", "Alekhine's Defense",
  "Bogo-Indian Defense", "Benoni Defense", "Modern Benoni",
  "Benko Gambit", "Dutch Defense",
  // Sub-variations and additional intermediate-level lines
  "Richter-Rauzer Attack", "Najdorf English Attack", "Najdorf Sozin Variation",
  "Yugoslav Attack", "Maróczy Bind",
  "Closed Ruy Lopez", "Open Ruy Lopez", "Marshall Attack",
  "Ruy Lopez Exchange", "Schliemann Defense", "Ruy Lopez Steinitz Defense",
  "French McCutcheon", "French Classical", "French Rubinstein", "French Burn",
  "Caro-Kann Two Knights", "Caro-Kann Karpov", "Caro-Kann Tartakower",
  "QGD Tartakower", "QGD Lasker Defense", "QGD Cambridge Springs", "QGD Orthodox Defense",
  "Slav Chebanenko", "Slav Schlechter",
  "KID Mar del Plata", "KID Sämisch Variation", "KID Fianchetto Variation",
  "KID Bayonet Attack", "KID Four Pawns Attack",
  "Nimzo-Indian Rubinstein", "Nimzo-Indian Classical", "Nimzo-Indian Sämisch",
  "Tarrasch Defense", "Old Indian Defense", "Blackmar-Diemer Gambit",
  "Stonewall Dutch", "Leningrad Dutch"
]);

const GM_FRIENDLY_OPENINGS = new Set([
  "Italian Game", "Giuoco Piano", "Two Knights Defense",
  "Ruy Lopez", "Berlin Defense", "Scotch Game", "Petrov's Defense",
  "Sicilian Defense", "Sicilian Najdorf", "Sicilian Dragon",
  "Sicilian Sveshnikov", "Sicilian Scheveningen", "Sicilian Taimanov",
  "Sicilian Alapin", "Sicilian Rossolimo", "Moscow Variation",
  "French Defense", "French Winawer", "French Tarrasch",
  "Caro-Kann Defense", "Caro-Kann Classical", "Caro-Kann Advance",
  "Queen's Gambit", "Queen's Gambit Accepted", "Queen's Gambit Declined",
  "Slav Defense", "Semi-Slav Defense",
  "King's Indian Defense", "Grünfeld Defense", "Nimzo-Indian Defense",
  "Queen's Indian Defense", "Catalan Opening",
  "London System", "Trompowsky Attack",
  "English Opening", "Réti Opening",
  // Sub-variations regularly seen in modern top-level play
  "Richter-Rauzer Attack", "Najdorf English Attack",
  "Yugoslav Attack", "Maróczy Bind",
  "Closed Ruy Lopez", "Open Ruy Lopez", "Marshall Attack",
  "Ruy Lopez Exchange",
  "French McCutcheon", "French Classical", "French Rubinstein", "French Burn",
  "Caro-Kann Karpov",
  "QGD Tartakower", "QGD Lasker Defense", "QGD Orthodox Defense",
  "Slav Chebanenko",
  "KID Mar del Plata", "KID Sämisch Variation", "KID Fianchetto Variation",
  "KID Bayonet Attack",
  "Nimzo-Indian Rubinstein", "Nimzo-Indian Classical",
  "Tarrasch Defense"
]);

for (const op of OPENINGS) {
  op.beginnerFriendly = BEGINNER_FRIENDLY_OPENINGS.has(op.name);
  op.intermediateFriendly = INTERMEDIATE_FRIENDLY_OPENINGS.has(op.name);
  op.gmFriendly = GM_FRIENDLY_OPENINGS.has(op.name);
}

// Prerequisite map: a sub-variation only enters the practice rotation once
// the user has at least one successful review of its parent. Lets a beginner
// learn "Sicilian Defense" before the app starts asking about
// "Sicilian Najdorf" or "Yugoslav Attack". One level deep is enough — the
// chain unlocks naturally as the user progresses.
const PREREQUISITES = {
  // Ruy Lopez branches
  "Berlin Defense": ["Ruy Lopez"],
  "Closed Ruy Lopez": ["Ruy Lopez"],
  "Open Ruy Lopez": ["Ruy Lopez"],
  "Marshall Attack": ["Ruy Lopez"],
  "Ruy Lopez Exchange": ["Ruy Lopez"],
  "Schliemann Defense": ["Ruy Lopez"],
  "Ruy Lopez Steinitz Defense": ["Ruy Lopez"],

  // Italian Game family
  "Giuoco Piano": ["Italian Game"],
  "Two Knights Defense": ["Italian Game"],
  "Evans Gambit": ["Italian Game"],

  // Sicilian variations
  "Sicilian Najdorf": ["Sicilian Defense"],
  "Sicilian Dragon": ["Sicilian Defense"],
  "Sicilian Sveshnikov": ["Sicilian Defense"],
  "Sicilian Scheveningen": ["Sicilian Defense"],
  "Sicilian Taimanov": ["Sicilian Defense"],
  "Sicilian Kan": ["Sicilian Defense"],
  "Accelerated Dragon": ["Sicilian Defense"],
  "Sicilian Alapin": ["Sicilian Defense"],
  "Sicilian Closed": ["Sicilian Defense"],
  "Smith-Morra Gambit": ["Sicilian Defense"],
  "Grand Prix Attack": ["Sicilian Defense"],
  "Sicilian Rossolimo": ["Sicilian Defense"],
  "Moscow Variation": ["Sicilian Defense"],
  "Richter-Rauzer Attack": ["Sicilian Defense"],
  // Sicilian sub-variations of named lines
  "Najdorf English Attack": ["Sicilian Najdorf"],
  "Najdorf Sozin Variation": ["Sicilian Najdorf"],
  "Yugoslav Attack": ["Sicilian Dragon"],
  "Maróczy Bind": ["Accelerated Dragon"],

  // French variations
  "French Advance": ["French Defense"],
  "French Winawer": ["French Defense"],
  "French Tarrasch": ["French Defense"],
  "French Exchange": ["French Defense"],
  "French McCutcheon": ["French Defense"],
  "French Classical": ["French Defense"],
  "French Rubinstein": ["French Defense"],
  "French Burn": ["French Defense"],

  // Caro-Kann variations
  "Caro-Kann Classical": ["Caro-Kann Defense"],
  "Caro-Kann Advance": ["Caro-Kann Defense"],
  "Caro-Kann Two Knights": ["Caro-Kann Defense"],
  "Caro-Kann Karpov": ["Caro-Kann Defense"],
  "Caro-Kann Tartakower": ["Caro-Kann Defense"],
  "Caro-Kann Fantasy Variation": ["Caro-Kann Defense"],
  "Caro-Kann Exchange": ["Caro-Kann Defense"],
  "Panov-Botvinnik Attack": ["Caro-Kann Defense"],

  // Anti-Pirc / anti-Modern systems unlock once the parent is studied
  "Austrian Attack": ["Pirc Defense"],
  "150 Attack": ["Pirc Defense"],

  // Queen's Gambit family
  "Queen's Gambit Accepted": ["Queen's Gambit"],
  "Queen's Gambit Declined": ["Queen's Gambit"],
  "Albin Counter-Gambit": ["Queen's Gambit"],
  "Tarrasch Defense": ["Queen's Gambit"],
  // QGD sub-variations
  "QGD Tartakower": ["Queen's Gambit Declined"],
  "QGD Lasker Defense": ["Queen's Gambit Declined"],
  "QGD Cambridge Springs": ["Queen's Gambit Declined"],
  "QGD Orthodox Defense": ["Queen's Gambit Declined"],

  // Slav family
  "Semi-Slav Defense": ["Slav Defense"],
  "Slav Chebanenko": ["Slav Defense"],
  "Slav Schlechter": ["Slav Defense"],

  // King's Indian Defense
  "KID Mar del Plata": ["King's Indian Defense"],
  "KID Sämisch Variation": ["King's Indian Defense"],
  "KID Fianchetto Variation": ["King's Indian Defense"],
  "KID Bayonet Attack": ["King's Indian Defense"],
  "KID Four Pawns Attack": ["King's Indian Defense"],

  // Nimzo-Indian
  "Nimzo-Indian Rubinstein": ["Nimzo-Indian Defense"],
  "Nimzo-Indian Classical": ["Nimzo-Indian Defense"],
  "Nimzo-Indian Sämisch": ["Nimzo-Indian Defense"],
  "Bogo-Indian Defense": ["Nimzo-Indian Defense"],

  // Benoni / Dutch
  "Modern Benoni": ["Benoni Defense"],
  "Benko Gambit": ["Benoni Defense"],
  "Stonewall Dutch": ["Dutch Defense"],
  "Leningrad Dutch": ["Dutch Defense"]
};
