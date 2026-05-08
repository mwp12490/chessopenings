// Curated database of named chess openings.
// Each entry: { name, eco, moves (SAN), description, assessment, tier, popularity, aliases? }
//   description: what the moves do.
//   assessment:  why this opening lives in its tier — what makes it good or
//                shaky in modern theory.
//   tier:        "mainline" | "solid" | "sideline"
//                Theoretical strength + soundness (consensus, master-level).
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
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Giuoco Piano",
    eco: "C50",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5"],
    description: "The 'Quiet Game' — symmetric Italian setup played for slow, classical positions.",
    assessment: "Symmetrical and well-charted, but modern Italian theory shows there's plenty of bite for both sides — White can pivot to slow maneuvering or sharp pawn breaks.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Evans Gambit",
    eco: "C51",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5","b4"],
    description: "An aggressive 19th-century gambit sacrificing a pawn for rapid development.",
    assessment: "Romantic and fun but not best at the top level — Black has well-established declining systems that hold the extra pawn comfortably. Used today mostly for surprise.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Two Knights Defense",
    eco: "C55",
    moves: ["e4","e5","Nf3","Nc6","Bc4","Nf6"],
    description: "Black challenges White directly, often leading to sharp tactical play.",
    assessment: "A combative response that has stood the test of theory — Black accepts sharp tactics rather than the symmetric Giuoco Piano. Sound at every level.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Ruy Lopez",
    eco: "C60",
    moves: ["e4","e5","Nf3","Nc6","Bb5"],
    aliases: ["Spanish Opening","Spanish Game"],
    description: "The Spanish — Bb5 pins the knight defending e5 and is a cornerstone of opening theory.",
    assessment: "Maximally principled: develops with tempo, pressures e5, prepares castling. The deepest opening in chess theory and the gold standard for fighting against 1...e5.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Berlin Defense",
    eco: "C65",
    moves: ["e4","e5","Nf3","Nc6","Bb5","Nf6"],
    description: "A solid Ruy Lopez line famous for its drawish endgame, used at the highest level.",
    assessment: "The Berlin Wall — Kasparov vs. Kramnik 2000 cemented its reputation as nearly impossible to crack at the top level. Black accepts a slightly worse endgame for rock-solid drawing chances.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Scotch Game",
    eco: "C45",
    moves: ["e4","e5","Nf3","Nc6","d4"],
    description: "An open, classical opening that immediately challenges the center.",
    assessment: "Active and respectable — sidesteps the deep theory of the Berlin Wall while still posing real central problems for Black. A favorite of Garry Kasparov.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Four Knights Game",
    eco: "C46",
    moves: ["e4","e5","Nf3","Nc6","Nc3","Nf6"],
    description: "A symmetrical, principled developing opening favored by classical players.",
    assessment: "Symmetrical and principled but quite drawish — Black equalizes easily with accurate play, so it's lost popularity at the top level despite being theoretically fine.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Vienna Game",
    eco: "C25",
    moves: ["e4","e5","Nc3"],
    description: "A flexible King's Pawn opening that may transpose to gambit or quiet lines.",
    assessment: "Flexible but slightly slow — White can transpose into Italian or King's Gambit structures, but doesn't immediately fight for the center the way 2.Nf3 does.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "King's Gambit",
    eco: "C30",
    moves: ["e4","e5","f4"],
    description: "A romantic-era gambit offering the f-pawn for rapid attack on the king.",
    assessment: "The classic romantic gambit — exhilarating but considered dubious in modern theory. The f-pawn weakens White's king and Black has multiple known equalizing methods.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Bishop's Opening",
    eco: "C23",
    moves: ["e4","e5","Bc4"],
    description: "Develops the bishop early; can transpose to Italian or Vienna structures.",
    assessment: "Sound but committal — usually transposes to Italian or Vienna structures, so it's largely a move-order tool. Doesn't independently challenge Black's setup.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Center Game",
    eco: "C22",
    moves: ["e4","e5","d4"],
    description: "Direct central confrontation; often leads to early queen development.",
    assessment: "Strategically inferior — the queen ends up on a vulnerable square (typically e3) where it loses tempo to Black's natural development.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Danish Gambit",
    eco: "C21",
    moves: ["e4","e5","d4","exd4","c3"],
    description: "An aggressive gambit sacrificing pawns for rapid attacking lines.",
    assessment: "Two pawns is too steep — modern theory has Black declining or accepting and surviving the attack. Considered refuted at master level.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Petrov's Defense",
    eco: "C42",
    moves: ["e4","e5","Nf3","Nf6"],
    aliases: ["Russian Defense","Petroff Defense"],
    description: "A solid, symmetrical reply that strikes back at e4 immediately.",
    assessment: "Famously drawish — Black's symmetrical approach equalizes so reliably that it's a top choice for elite players seeking solidity with the black pieces.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Philidor Defense",
    eco: "C41",
    moves: ["e4","e5","Nf3","d6"],
    description: "Solid but passive — Black supports e5 with the d-pawn instead of the knight.",
    assessment: "Theoretically passive — d6 blocks the king's bishop and leaves Black cramped. White gets a comfortable space advantage with little effort.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Latvian Gambit",
    eco: "C40",
    moves: ["e4","e5","Nf3","f5"],
    description: "An offbeat, dubious-but-tricky gambit hurling the f-pawn into the fray.",
    assessment: "Practically refuted — ...f5 weakens the kingside without sufficient compensation. White has multiple known clear paths to advantage. Surprise weapon only.",
    tier: "sideline",
    popularity: 1
  },

  // ===== Sicilian Defense =====
  {
    name: "Sicilian Defense",
    eco: "B20",
    moves: ["e4","c5"],
    description: "Black's most popular and combative response to 1.e4.",
    assessment: "Asymmetric counterattacking masterpiece — gives Black the highest winning percentages of any defense to 1.e4 because the unbalanced pawn structure creates real fighting chances.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Sicilian Najdorf",
    eco: "B90",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","a6"],
    description: "A favourite of Fischer and Kasparov; ...a6 prepares ...e5 or ...b5.",
    assessment: "The Najdorf is the gold standard — flexibility lets Black react to whatever White chooses, with rich theory in every direction. Used at the absolute top of chess.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Sicilian Dragon",
    eco: "B70",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","g6"],
    description: "Black fianchettoes the king's bishop, creating sharp, double-edged positions.",
    assessment: "Razor-sharp — opposite-side castling means both kings get attacked, and concrete calculation often outweighs strategy. High risk, high reward at every level.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Sicilian Sveshnikov",
    eco: "B33",
    moves: ["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","Nf6","Nc3","e5"],
    description: "Black accepts a backward d-pawn for active piece play and dynamic chances.",
    assessment: "Modern Sicilian classic — Black trades a structural defect (d6 weakness) for piece activity and central control. Magnus Carlsen has trusted it in world championships.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Sicilian Scheveningen",
    eco: "B80",
    moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","e6"],
    description: "Flexible 'small center' setup with pawns on d6 and e6.",
    assessment: "The 'small center' (d6/e6) is solid and flexible — Black can transpose into many Sicilian structures and choose middlegame plans based on White's setup.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Sicilian Taimanov",
    eco: "B44",
    moves: ["e4","c5","Nf3","e6","d4","cxd4","Nxd4","Nc6"],
    description: "Flexible Sicilian with early ...e6 and ...Nc6, deferring committal moves.",
    assessment: "Maximum flexibility — Black holds back ...d6 to keep options open between Najdorf-like and Scheveningen-like structures. Trustworthy at the top level.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Sicilian Kan",
    eco: "B41",
    moves: ["e4","c5","Nf3","e6","d4","cxd4","Nxd4","a6"],
    description: "A flexible Sicilian where Black delays development to keep options open.",
    assessment: "Hyper-flexible but slightly slow — Black gives White a small space advantage in exchange for a clean position with no committal weaknesses.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Accelerated Dragon",
    eco: "B34",
    moves: ["e4","c5","Nf3","Nc6","d4","cxd4","Nxd4","g6"],
    description: "Black plays an early ...g6 to fianchetto, avoiding the Yugoslav Attack.",
    assessment: "Clever move-order tool — sidesteps the brutal Yugoslav Attack. Trade-off is the Maróczy Bind, where White gets a small but lasting space advantage.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Sicilian Alapin",
    eco: "B22",
    moves: ["e4","c5","c3"],
    description: "An anti-Sicilian preparing d4 with c3 support; aims for a classical center.",
    assessment: "Sound anti-Sicilian — sidesteps mountains of Open Sicilian theory but lets Black equalize with multiple known systems. Common at club level for time-saving.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "Sicilian Closed",
    eco: "B23",
    moves: ["e4","c5","Nc3"],
    description: "White declines the open Sicilian, often fianchettoing the king's bishop.",
    assessment: "Avoids open Sicilian theory but allows Black easy development; White's setup is sound but not particularly threatening at the top level.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Smith-Morra Gambit",
    eco: "B21",
    moves: ["e4","c5","d4","cxd4","c3"],
    description: "White sacrifices a pawn for rapid development and attacking chances.",
    assessment: "Tricky at club level but considered insufficient at master level — Black has well-known declining systems that equalize without holding the pawn. Surprise weapon.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Grand Prix Attack",
    eco: "B23",
    moves: ["e4","c5","Nc3","Nc6","f4"],
    description: "An aggressive anti-Sicilian aiming for kingside attack with f4.",
    assessment: "Aggressive but theoretically suspect — Black has multiple reliable equalizing systems. The f4 push commits early and gives Black clear targets.",
    tier: "sideline",
    popularity: 1
  },

  // ===== French / Caro / Other 1.e4 =====
  {
    name: "French Defense",
    eco: "C00",
    moves: ["e4","e6"],
    description: "Black prepares ...d5 to challenge the center, accepting a cramped but solid position.",
    assessment: "Strategic battleground — Black accepts a cramped position and a 'bad' light-squared bishop for a solid structure and clear pawn-break plans (...c5, ...f6).",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "French Advance",
    eco: "C02",
    moves: ["e4","e6","d4","d5","e5"],
    description: "White locks the center to claim space; Black attacks with ...c5 and ...f6.",
    assessment: "White claims space but the closed center is slow; Black has clear pawn breaks (...c5, ...f6) and the c8-bishop problem is solvable.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "French Winawer",
    eco: "C15",
    moves: ["e4","e6","d4","d5","Nc3","Bb4"],
    description: "Sharp pinning system; Black often doubles White's pawns for activity.",
    assessment: "Sharp and double-edged — Black inflicts doubled c-pawns on White but accepts a cramped position. Well-established theory in both directions.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "French Tarrasch",
    eco: "C03",
    moves: ["e4","e6","d4","d5","Nd2"],
    description: "A flexible response avoiding the Winawer pin.",
    assessment: "Solid avoidance of the Winawer's structural concessions — Nd2 is less ambitious than Nc3 but keeps a small, clean edge.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "French Exchange",
    eco: "C01",
    moves: ["e4","e6","d4","d5","exd5","exd5"],
    description: "Symmetrical and quiet — generally considered drawish.",
    assessment: "Notoriously drawish — symmetrical pawn structure means neither side has natural winning chances. Played mostly to deflect Black's preparation.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Caro-Kann Defense",
    eco: "B10",
    moves: ["e4","c6"],
    description: "Solid and flexible; Black prepares ...d5 with the c-pawn supporting it.",
    assessment: "Black's most resilient defense to 1.e4 — solid pawn structure, no bad bishop (compared to French), and active piece development. A favorite of careful positional players.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Caro-Kann Classical",
    eco: "B18",
    moves: ["e4","c6","d4","d5","Nc3","dxe4","Nxe4","Bf5"],
    description: "The main line where Black develops the light-squared bishop actively.",
    assessment: "The big payoff of the Caro-Kann — Black gets the light-squared bishop outside the pawn chain (rare against 1.e4) before playing ...e6.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Caro-Kann Advance",
    eco: "B12",
    moves: ["e4","c6","d4","d5","e5"],
    description: "White claims space and locks the center, similar to French Advance.",
    assessment: "Sound but slightly cramps Black; the light-squared bishop has more breathing room than in the French Advance, so theory is well-mapped for both sides.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "Panov-Botvinnik Attack",
    eco: "B13",
    moves: ["e4","c6","d4","d5","exd5","cxd5","c4"],
    description: "An aggressive line creating an isolated d-pawn for active piece play.",
    assessment: "Sharp deviation from typical Caro-Kann play — both sides accept an isolated d-pawn for active piece play. Sound but less Caro-like in flavor.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Scandinavian Defense",
    eco: "B01",
    moves: ["e4","d5"],
    aliases: ["Center Counter Defense"],
    description: "Black challenges e4 directly on move one.",
    assessment: "Direct but committal — Black's queen ends up exposed early after recapturing on d5, and White typically gets a small lasting edge. Sound at club level.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Pirc Defense",
    eco: "B07",
    moves: ["e4","d6","d4","Nf6","Nc3","g6"],
    description: "Hypermodern: Black lets White build a center, then attacks it with pieces.",
    assessment: "Hypermodern — Black lets White build the center, then attacks it. Sound but unambitious; gives White too much center to fight for an opening edge.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Modern Defense",
    eco: "B06",
    moves: ["e4","g6"],
    description: "An ultra-flexible hypermodern setup with the king's fianchetto.",
    assessment: "Maximum move-order flexibility — Black can transpose to Pirc, King's Indian, or Modern structures. Sound but slightly passive without precise follow-up.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Alekhine's Defense",
    eco: "B02",
    moves: ["e4","Nf6"],
    description: "A provocative defense inviting White to overextend with central pawns.",
    assessment: "Provocative — Black invites White to overextend with central pawns, hoping to undermine them. Risky and only works if White overpushes; otherwise Black is just cramped.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Nimzowitsch Defense",
    eco: "B00",
    moves: ["e4","Nc6"],
    description: "An offbeat hypermodern reply to 1.e4 named after Aron Nimzowitsch.",
    assessment: "Offbeat — sound enough but commits the knight to a passive square (it usually wants to be on f6 against e4). Almost never played at the top level.",
    tier: "sideline",
    popularity: 1
  },

  // ===== Queen's Pawn / Closed games =====
  {
    name: "Queen's Gambit",
    eco: "D06",
    moves: ["d4","d5","c4"],
    description: "Classical opening offering the c-pawn to deflect Black from the center.",
    assessment: "Classical central play — White offers a temporary pawn sacrifice to deflect Black from supporting d5 with c-pawn. The deepest of the Closed Game openings.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Queen's Gambit Accepted",
    eco: "D20",
    moves: ["d4","d5","c4","dxc4"],
    description: "Black takes the pawn; White expects to recover it while gaining the center.",
    assessment: "Black grabs the pawn temporarily — White recovers it while gaining a strong center. Sound for both sides; Black just needs to develop quickly to neutralize White's space.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Queen's Gambit Declined",
    eco: "D30",
    moves: ["d4","d5","c4","e6"],
    description: "Solid classical defense; Black supports d5 at the cost of the c8 bishop.",
    assessment: "The QGD has been a tournament workhorse for over a century — solid pawn structure, clear plans, and a deep theoretical foundation. The 'safe' choice against 1.d4.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Slav Defense",
    eco: "D10",
    moves: ["d4","d5","c4","c6"],
    description: "Solid response to the Queen's Gambit keeping the c8-bishop's diagonal open.",
    assessment: "Black supports d5 with c6 instead of e6 — keeping the c8-bishop's diagonal open is a major positional plus. Classical, sound, and theoretically deep.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Semi-Slav Defense",
    eco: "D43",
    moves: ["d4","d5","c4","c6","Nf3","Nf6","Nc3","e6"],
    description: "Combines Slav and QGD; rich, complex middlegame positions.",
    assessment: "Black keeps both options (c6 and e6) for maximum flexibility — leads to the rich, sharp middlegames that grandmasters love. Anand and Kramnik favorites.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Albin Counter-Gambit",
    eco: "D08",
    moves: ["d4","d5","c4","e5"],
    description: "Black sacrifices a pawn to disrupt White's plans and gain piece activity.",
    assessment: "Black sacrifices a pawn to disrupt White — sound at club level but White has clear paths to a small but lasting edge with accurate play.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "King's Indian Defense",
    eco: "E60",
    moves: ["d4","Nf6","c4","g6"],
    description: "Hypermodern defense; Black fianchettoes and counterattacks White's center.",
    assessment: "Combative hypermodern — Black lets White build the center, then strikes back with kingside expansion. A favorite of attacking players (Fischer, Kasparov, Nakamura).",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Grünfeld Defense",
    eco: "D80",
    moves: ["d4","Nf6","c4","g6","Nc3","d5"],
    description: "Black challenges the center with ...d5, leading to dynamic, theoretical play.",
    assessment: "Black challenges the center with ...d5 instead of supporting it — dynamic and theoretically deep. Used at the world championship level (Kasparov, Karjakin).",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Nimzo-Indian Defense",
    eco: "E20",
    moves: ["d4","Nf6","c4","e6","Nc3","Bb4"],
    description: "Pin on c3 to control e4 — a top-tier defense at all levels.",
    assessment: "Pin on c3 prevents White's natural e4 push — Black gives up the bishop pair for long-term structural control. Considered one of the soundest defenses to 1.d4.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Queen's Indian Defense",
    eco: "E12",
    moves: ["d4","Nf6","c4","e6","Nf3","b6"],
    description: "Black fianchettoes the queen's bishop to contest the long diagonal.",
    assessment: "Black contests the long light-square diagonal with ...b6/Bb7 — solid, flexible, and well-tested. The natural fallback when White avoids the Nimzo with Nf3.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Bogo-Indian Defense",
    eco: "E11",
    moves: ["d4","Nf6","c4","e6","Nf3","Bb4+"],
    description: "Pin via Bb4+ when White avoids the Nimzo with Nf3.",
    assessment: "Pin avoiding the Nimzo when White plays Nf3 first — Black equalizes solidly but with less dynamic potential than the Queen's Indian.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Catalan Opening",
    eco: "E00",
    moves: ["d4","Nf6","c4","e6","g3"],
    description: "Combines Queen's Gambit and king's fianchetto for long-term pressure.",
    assessment: "Long-term positional pressure on the queenside through the fianchettoed bishop — a torture-by-small-edges weapon. Favored by patient positional grandmasters.",
    tier: "mainline",
    popularity: 3
  },
  {
    name: "Benoni Defense",
    eco: "A60",
    moves: ["d4","Nf6","c4","c5"],
    description: "Black challenges the d-pawn early, leading to asymmetric pawn structures.",
    assessment: "Asymmetric structure — Black gets queenside space but accepts a long-term backward d6 pawn. Sound but theoretically demanding for Black.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Modern Benoni",
    eco: "A60",
    moves: ["d4","Nf6","c4","c5","d5","e6"],
    description: "Sharp, double-edged Benoni structure with central tension.",
    assessment: "Sharp double-edged Benoni — Black gets active piece play and counterchances on the queenside, but White's space advantage is real. Tal-style territory.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Benko Gambit",
    eco: "A57",
    moves: ["d4","Nf6","c4","c5","d5","b5"],
    description: "Black sacrifices a pawn for long-term queenside pressure on open lines.",
    assessment: "A pawn for long-term queenside pressure on open a- and b-files — slow-burn compensation that's fully sound but demands accurate technique from Black.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Dutch Defense",
    eco: "A80",
    moves: ["d4","f5"],
    description: "Black aims for kingside play and a Stonewall or Leningrad structure.",
    assessment: "Aggressive kingside play but the f5 push weakens the kingside light squares — sound but committal. White can punish inaccuracies at every level.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "London System",
    eco: "D02",
    moves: ["d4","Nf6","Nf3","e6","Bf4"],
    description: "Solid, system-based opening with the bishop developed outside the pawn chain.",
    assessment: "System-based and easy to learn — White plays the same setup against most Black replies. Sound but allows Black to equalize without much effort if they know the plans.",
    tier: "solid",
    popularity: 4
  },
  {
    name: "Trompowsky Attack",
    eco: "A45",
    moves: ["d4","Nf6","Bg5"],
    description: "Early bishop sortie to disrupt Black's setup before standard development.",
    assessment: "Disrupts Black's standard setup before they can choose between Indian defenses — sound and tricky, though the early bishop sortie costs a tempo.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "Torre Attack",
    eco: "A46",
    moves: ["d4","Nf6","Nf3","e6","Bg5"],
    description: "A solid system pinning the f6-knight; quieter than the Trompowsky.",
    assessment: "Quieter Trompowsky cousin — sound system play but doesn't pose serious problems. Black has clear paths to equality with accurate play.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Colle System",
    eco: "D04",
    moves: ["d4","d5","Nf3","Nf6","e3"],
    description: "Quiet system development with a delayed central break via e4.",
    assessment: "Safe system play with a delayed e4 break — but the slow setup gives Black plenty of time to organize. Doesn't pose serious problems to a prepared opponent.",
    tier: "solid",
    popularity: 2
  },
  {
    name: "Veresov Attack",
    eco: "D01",
    moves: ["d4","Nf6","Nc3","d5","Bg5"],
    description: "Aggressive Queen's Pawn opening with rapid piece development.",
    assessment: "Slightly inferior queen's-pawn opening — Black has reliable systems that equalize easily. Played mostly for surprise value.",
    tier: "sideline",
    popularity: 1
  },

  // ===== Flank openings =====
  {
    name: "English Opening",
    eco: "A10",
    moves: ["c4"],
    description: "Flexible flank opening; can transpose into many central structures.",
    assessment: "Maximum flexibility — White can transpose into many central structures while denying Black the open game. A favorite of move-order specialists like Anatoly Karpov.",
    tier: "mainline",
    popularity: 4
  },
  {
    name: "Réti Opening",
    eco: "A09",
    moves: ["Nf3","d5","c4"],
    description: "Hypermodern flank opening attacking d5 from a distance.",
    assessment: "Hypermodern flank attack on d5 — sound but typically transposes into other openings (English, QGD, etc.) rather than creating independent winning chances.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "King's Indian Attack",
    eco: "A07",
    moves: ["Nf3","d5","g3"],
    description: "A flexible white system mirroring the King's Indian Defense setup.",
    assessment: "Mirror of the King's Indian Defense for White — sound and easy to play but rarely creates winning chances at the top level. A time-saver against many Black setups.",
    tier: "solid",
    popularity: 3
  },
  {
    name: "Bird's Opening",
    eco: "A02",
    moves: ["f4"],
    description: "An offbeat opening aiming at e5 and a kingside attack — a Dutch with colors reversed.",
    assessment: "Dutch with colors reversed — but the f4 push weakens White's kingside without enough compensation. Rarely seen at master level.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Larsen's Opening",
    eco: "A01",
    moves: ["b3"],
    aliases: ["Nimzo-Larsen Attack"],
    description: "Hypermodern opening fianchettoing the queen's bishop on b2.",
    assessment: "Hypermodern fianchetto — sound but doesn't pose serious problems. Black has multiple natural setups that lead to comfortable equality.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Sokolsky Opening",
    eco: "A00",
    moves: ["b4"],
    aliases: ["Polish Opening","Orangutan"],
    description: "An unorthodox flank opening grabbing queenside space immediately.",
    assessment: "Unorthodox flank pawn push — sound at club level but Black equalizes with simple central play. Surprise weapon for the very brave.",
    tier: "sideline",
    popularity: 1
  },
  {
    name: "Grob's Attack",
    eco: "A00",
    moves: ["g4"],
    description: "Provocative and risky — weakens the kingside but can surprise opponents.",
    assessment: "Severely weakens White's kingside — borderline unsound and considered dubious by every authority. Viable only as a one-off surprise against unprepared opponents.",
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
  mainline: {
    label: "Mainline",
    desc: "Sound and popular at every level — the bread-and-butter of opening theory. Worth grinding into long-term memory."
  },
  solid: {
    label: "Solid",
    desc: "Theoretically respectable but quieter or less ambitious than the mainstream. A reliable choice that won't get refuted."
  },
  sideline: {
    label: "Sideline",
    desc: "Surprise weapon. Sound enough at club level but considered dubious or refutable at master level. Use sparingly, or for fun."
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
