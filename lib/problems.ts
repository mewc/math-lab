// The problem registry. Every problem the lab tracks lives here — the search
// bar on the homepage searches exactly this data, and /p/[slug] renders a
// dossier scaffold from it. When a problem gets tackled, its entry grows
// (notes, stage promotion) or it graduates to a hand-built page like Collatz.
//
// Accuracy rule (inherited from Collatz Lab): statements must be precise and
// statuses honest. "Open" means open; partial results get named. Keep
// quantifiers exact when editing.

export type Stage = "live" | "started" | "untouched";

export type Category =
  | "Number Theory"
  | "Graph Theory"
  | "Combinatorics"
  | "Geometry & Packing"
  | "Algebra"
  | "Dynamics & Analysis"
  | "Graph Decompositions"
  | "Algorithms & Simulation";

export interface ProblemNote {
  date: string; // ISO date of the note
  body: string;
}

export interface Problem {
  slug: string;
  title: string;
  aka?: string[];
  category: Category;
  /** Precise one-to-three-sentence statement of the problem. */
  statement: string;
  /** Honest status line: what is known, what is open. */
  status: string;
  /** How to throw compute/tokens at it: constructions, searches, simulations. */
  attack: string;
  tags: string[];
  stage: Stage;
  /** Overrides the default /p/[slug] link (e.g. Collatz's hand-built dossier). */
  href?: string;
  /** Work-in-progress notes; accumulate as the problem gets tackled. */
  notes?: ProblemNote[];
}

export const CATEGORIES: Category[] = [
  "Number Theory",
  "Graph Theory",
  "Combinatorics",
  "Geometry & Packing",
  "Algebra",
  "Dynamics & Analysis",
  "Graph Decompositions",
  "Algorithms & Simulation",
];

export const PROBLEMS: Problem[] = [
  // ---------------------------------------------------------------- flagship
  {
    slug: "collatz",
    title: "Collatz conjecture",
    aka: ["3n + 1 problem", "Syracuse problem", "hailstone problem", "Ulam's conjecture"],
    category: "Number Theory",
    statement:
      "Halve n if even, map n to 3n + 1 if odd, repeat. The conjecture: every positive integer eventually reaches 1.",
    status:
      "Open since 1937. Verified to ~2^71; Tao (2019) proved almost all orbits attain almost bounded values. The full dossier and live attack campaign are imported here from Collatz Lab.",
    attack:
      "Fully instrumented: BigInt trajectory explorer, statistical landscape, 3n−1 / 5n+1 failure-mode lab, and a 25-path attack log with machine-verified certificates.",
    tags: ["iteration", "dynamics", "2-adic", "cycles", "divergence", "stopping time"],
    stage: "live",
    href: "/p/collatz",
  },

  // ----------------------------------------------------------- number theory
  {
    slug: "casas-alvero",
    title: "Casas-Alvero conjecture",
    category: "Number Theory",
    statement:
      "If a complex polynomial of degree n shares a root with each of its derivatives P′, P″, …, P^(n−1), then it must be c(x − a)^n — a power of a single linear factor.",
    status:
      "Open. Proved when the degree is a prime power (and small multiples of prime powers); no counterexample known.",
    attack:
      "Brute-force or Gröbner-basis checks of degrees up to 15–20; hunt near-counterexamples where all but one derivative shares a root, and look for the obstruction pattern.",
    tags: ["polynomials", "roots", "derivatives", "algebraic geometry"],
    stage: "untouched",
  },
  {
    slug: "perfect-cuboid",
    title: "Perfect cuboid",
    aka: ["Euler brick with integer space diagonal"],
    category: "Number Theory",
    statement:
      "Does a rectangular box exist whose three edges, three face diagonals, and space diagonal are all integers? Euler bricks (integer edges and face diagonals) exist; adding the space diagonal is the open part.",
    status: "Open. No perfect cuboid with odd edge below ~10^13-scale search bounds; many modular obstructions known.",
    attack:
      "Bounded Diophantine search over parametrizations of Euler bricks; derive and stack congruence constraints to prune; explore near-misses (six of seven integers).",
    tags: ["diophantine", "euler brick", "pythagorean", "search"],
    stage: "untouched",
  },
  {
    slug: "hadamard-conjecture",
    title: "Hadamard conjecture",
    category: "Number Theory",
    statement: "A Hadamard matrix — a ±1 matrix with pairwise orthogonal rows — exists for every order divisible by 4.",
    status: "Open. The smallest order with no known construction is 668.",
    attack:
      "Generate constructions (Paley, Sylvester, Williamson-type composition) for unresolved orders; run structured search over cocyclic or symmetric candidates for order 668.",
    tags: ["matrices", "orthogonality", "combinatorial designs", "construction"],
    stage: "untouched",
  },
  {
    slug: "lehmer-mahler",
    title: "Lehmer's Mahler measure problem",
    aka: ["Lehmer's conjecture"],
    category: "Number Theory",
    statement:
      "Is there a gap above 1 in Mahler measures of integer polynomials? Lehmer's degree-10 polynomial has measure ≈ 1.176280818; the question is whether any non-cyclotomic integer polynomial does better.",
    status: "Open since 1933. Lehmer's polynomial has survived every search; Dobrowolski-type lower bounds are far from the target.",
    attack:
      "Compute Mahler measures for exhaustive families of low-degree, low-height polynomials; hunt small measures in special families (Salem numbers, reciprocal polynomials).",
    tags: ["mahler measure", "salem numbers", "polynomials", "heights"],
    stage: "untouched",
  },
  {
    slug: "odd-perfect-numbers",
    title: "Odd perfect numbers",
    category: "Number Theory",
    statement: "Does an odd number exist that equals the sum of its proper divisors? Every known perfect number is even.",
    status:
      "Open for over two millennia. Any odd perfect number exceeds 10^1500 and must satisfy a long list of congruence and factor conditions (Euler form q^k m^2).",
    attack:
      "Tighten the web of constraints computationally; search for spoofs (Descartes numbers) whose structure shows exactly which conditions bite; push factor-chain arguments in feasible ranges.",
    tags: ["perfect numbers", "divisors", "sigma function", "bounds"],
    stage: "untouched",
  },

  // ------------------------------------------------------------ graph theory
  {
    slug: "erdos-faber-lovasz",
    title: "Erdős–Faber–Lovász conjecture",
    category: "Graph Theory",
    statement:
      "If n cliques, each on n vertices, pairwise share at most one vertex, their union can be properly colored with n colors.",
    status: "Proved for all sufficiently large n (Kang–Kelly–Kühn–Methuku–Osthus, 2021). Small-n cases remain to be closed uniformly.",
    attack:
      "Generate small-n clique systems and test n-colorability exhaustively; look for extremal configurations that stress the bound; verify the large-n proof's threshold experimentally.",
    tags: ["coloring", "cliques", "hypergraphs", "chromatic number"],
    stage: "untouched",
  },
  {
    slug: "caccetta-haggkvist",
    title: "Caccetta–Häggkvist conjecture",
    category: "Graph Theory",
    statement:
      "Every digraph on n vertices with minimum out-degree r contains a directed cycle of length at most ⌈n/r⌉.",
    status:
      "Open. The hardest case is r = n/3 (a directed triangle); best results get triangles at out-degree ≈ 0.3465n (Hladký–Král–Norin refinements of Shearer's bound).",
    attack:
      "Build random and structured digraphs near the conjectured threshold and search for short cycles; hunt extremal digraphs with large girth-to-degree ratio in small n.",
    tags: ["digraphs", "cycles", "girth", "out-degree"],
    stage: "untouched",
  },
  {
    slug: "no-three-in-line",
    title: "No-three-in-line problem",
    category: "Graph Theory",
    statement:
      "How many points can be placed in an n×n grid with no three collinear? At most 2n (two per row), and 2n is achieved for all n up to at least 46 — but conjecturally only ~1.814n is possible for large n.",
    status: "Open. Whether 2n is achievable for all n, and the true asymptotic constant, are both unknown.",
    attack:
      "SAT/ILP and heuristic search for maximal configurations at n = 25–60; study the structure (symmetry groups) of record configurations to extrapolate constructions.",
    tags: ["grid", "collinear", "extremal", "sat", "search"],
    stage: "untouched",
  },
  {
    slug: "frankl-union-closed",
    title: "Frankl's union-closed sets conjecture",
    category: "Graph Theory",
    statement:
      "In every finite union-closed family of sets (other than {∅}), some element belongs to at least half of the sets.",
    status:
      "Open. Gilmer's 2022 information-theoretic breakthrough gives a universal constant ≈ 0.38 (improved toward the golden-ratio bound ≈ 0.382); the 1/2 target stands.",
    attack:
      "Enumerate small union-closed families hunting for anything below 1/2; probe the tightness of the entropy method's constant with structured families.",
    tags: ["set families", "union-closed", "entropy", "extremal"],
    stage: "untouched",
  },
  {
    slug: "lonely-runner",
    title: "Lonely runner conjecture",
    category: "Graph Theory",
    statement:
      "k runners with pairwise distinct constant speeds circle a unit track from a common start. The conjecture: each runner is, at some moment, at circular distance at least 1/k from every other runner.",
    status: "Open. Proved for k ≤ 7; equivalent to a view-obstruction / Diophantine approximation problem for integer speeds.",
    attack:
      "Reduce to integer speed vectors and search the k = 8 case computationally; simulate trajectories for k = 3–8 and map the tight speed sets where loneliness is barely achieved.",
    tags: ["diophantine approximation", "view obstruction", "simulation"],
    stage: "untouched",
  },

  // ----------------------------------------------------------- combinatorics
  {
    slug: "one-third-two-thirds",
    title: "1/3–2/3 conjecture",
    category: "Combinatorics",
    statement:
      "Every finite poset that is not a chain contains two elements x, y such that the fraction of linear extensions with x below y lies between 1/3 and 2/3.",
    status: "Open. Known for posets of width 2, semiorders, and several other classes; 1/3 is tight for the 3-element V poset.",
    attack:
      "Enumerate small posets, compute exact linear-extension statistics, and search for posets whose best balanced pair approaches 1/3 — the extremal landscape is poorly mapped.",
    tags: ["posets", "linear extensions", "sorting", "balance"],
    stage: "untouched",
  },
  {
    slug: "superpermutation",
    title: "Superpermutation problem",
    category: "Combinatorics",
    statement:
      "What is the shortest string over n symbols containing every permutation of them as a consecutive substring? Known exactly only for n ≤ 5.",
    status:
      "Open for n ≥ 6: the n = 6 answer lies between 867 and 872 (lower bound via the Haruhi/4chan argument, upper via Egan's construction).",
    attack:
      "TSP-style and evolutionary search for shorter n = 6 strings; probe the structure of Egan's constructions for improvements at n = 7–8.",
    tags: ["permutations", "strings", "tsp", "search"],
    stage: "untouched",
  },
  {
    slug: "van-der-waerden-numbers",
    title: "Van der Waerden numbers",
    category: "Combinatorics",
    statement:
      "W(r, k) is the smallest N such that every r-coloring of 1…N contains a monochromatic k-term arithmetic progression. Only a handful of values are known exactly.",
    status: "W(2,6) = 1132 is the largest exactly known classical value; W(2,7) ≥ 3704 is open.",
    attack:
      "SAT-solver certification of new exact values or improved lower bounds via structured colorings; study the growth pattern against the Gowers-type upper bounds.",
    tags: ["ramsey theory", "arithmetic progressions", "sat", "colorings"],
    stage: "untouched",
  },
  {
    slug: "dedekind-numbers",
    title: "Dedekind numbers",
    category: "Combinatorics",
    statement:
      "D(n) counts the antichains of subsets of an n-element set — equivalently, monotone Boolean functions on n variables. Compute the next value.",
    status: "D(9) was computed in 2023 (two independent teams, 42 digits). D(10) is unknown.",
    attack:
      "Study symmetry-reduction and interval-counting techniques that cracked D(9); estimate D(10) via sampling and asymptotic (Korshunov) formulas; hunt structure in the growth sequence.",
    tags: ["boolean functions", "antichains", "enumeration", "lattice"],
    stage: "untouched",
  },
  {
    slug: "sunflower-conjecture",
    title: "Sunflower conjecture",
    category: "Combinatorics",
    statement:
      "Erdős–Rado: any family of more than C(r)^w sets, each of size w, contains an r-sunflower (r sets with identical pairwise intersections). The conjecture puts C(r) independent of w.",
    status:
      "Open. Alweiss–Lovett–Wu–Zhang (2019) reduced the classical w! bound to roughly (r log w)^w; the constant-base conjecture stands.",
    attack:
      "Construct large sunflower-free families for small r and w to test tightness; probe the entropy/spread technique's limits computationally.",
    tags: ["set systems", "sunflowers", "extremal", "spread"],
    stage: "untouched",
  },

  // ------------------------------------------------------- geometry, packing
  {
    slug: "maximal-determinant",
    title: "Hadamard's maximal determinant problem",
    category: "Geometry & Packing",
    statement:
      "What is the largest possible determinant of an n×n matrix with entries ±1? Hadamard's bound n^(n/2) is attained only at Hadamard orders; other orders are subtler.",
    status: "Exact maxima are unknown for infinitely many orders — small unresolved cases persist (n in the 20s–30s and beyond).",
    attack:
      "Optimization and exhaustive search over equivalence classes for the smallest unresolved orders; combine with Gram-matrix bounds to certify optima.",
    tags: ["determinant", "matrices", "optimization", "bounds"],
    stage: "untouched",
  },
  {
    slug: "tammes-problem",
    title: "Tammes problem",
    category: "Geometry & Packing",
    statement:
      "Place n points on a sphere maximizing the minimum pairwise distance. Find and certify the optimal configurations.",
    status: "Solved exactly only for n ≤ 14 and n = 24; everything else rests on numerical best-known configurations.",
    attack:
      "Numerical optimization (gradient flows, basin hopping) for n = 20–50 against the record tables; attempt certified optimality for the smallest open n via interval arithmetic.",
    tags: ["sphere packing", "spherical codes", "optimization"],
    stage: "untouched",
  },
  {
    slug: "square-packing",
    title: "Square packing in a square",
    category: "Geometry & Packing",
    statement:
      "Find the smallest square that contains n unit squares without overlap. Tilted packings beat axis-aligned ones surprisingly early.",
    status: "Optimal only for small and perfect-square n; open even for n = 11 (best known side ≈ 3.877, Gensane–Ryckelynck).",
    attack:
      "Continuous optimization over positions and angles for n = 11–100; verify or improve record packings; study when the first tilted square appears in optima.",
    tags: ["packing", "squares", "optimization", "records"],
    stage: "untouched",
  },
  {
    slug: "kissing-numbers",
    title: "Kissing numbers in higher dimensions",
    category: "Geometry & Packing",
    statement:
      "How many unit spheres can simultaneously touch a central unit sphere in dimension d without overlapping?",
    status:
      "Known exactly only for d = 1–4 (2, 6, 12, 24), d = 8 (240) and d = 24 (196560). Wide gaps between constructions and SDP bounds for d = 5–7.",
    attack:
      "Search lattice and code-based configurations in d = 5–7 to raise lower bounds; replicate and probe semidefinite-programming upper bounds for slack.",
    tags: ["sphere packing", "lattices", "sdp", "codes"],
    stage: "untouched",
  },
  {
    slug: "borsuk-problem",
    title: "Borsuk's problem in low dimensions",
    category: "Geometry & Packing",
    statement:
      "Can every bounded set of diameter 1 in R^d be partitioned into d + 1 pieces of strictly smaller diameter?",
    status:
      "True for d ≤ 3, false for d ≥ 64 (Kahn–Kalai-style counterexamples, refined since); every dimension from 4 to 63 is open.",
    attack:
      "Explore candidate counterexample constructions (two-distance sets, strongly regular graph geometries) in moderate dimensions; build partition certificates for concrete bodies in R^3–R^4.",
    tags: ["diameter", "partitions", "convex geometry", "counterexample"],
    stage: "untouched",
  },

  // ----------------------------------------------------------------- algebra
  {
    slug: "rota-basis",
    title: "Rota's basis conjecture",
    category: "Algebra",
    statement:
      "Given n disjoint bases of an n-dimensional vector space (or rank-n matroid), the n² vectors can be arranged in an n×n grid whose every row and every column is a basis.",
    status: "Open. Proved for n ≤ 4, for paving matroids and several other classes; online and fractional relaxations partially resolved.",
    attack:
      "Exhaustive verification over small matroids and random vector configurations; search for obstructions in the latin-square-like structure of partial arrangements.",
    tags: ["matroids", "bases", "latin squares", "linear algebra"],
    stage: "untouched",
  },
  {
    slug: "greens-conjecture",
    title: "Green's conjecture on syzygies",
    category: "Algebra",
    statement:
      "For a smooth canonical curve, the vanishing pattern of the syzygies of its canonical embedding is governed exactly by its Clifford index.",
    status:
      "Proved for generic curves (Voisin 2002–05) and various classes; open in full generality for arbitrary smooth curves.",
    attack:
      "Compute syzygy tables (Macaulay2) for low-genus curves across special gonality strata; hunt for the boundary cases where genericity assumptions bite.",
    tags: ["syzygies", "canonical curves", "clifford index", "computational algebraic geometry"],
    stage: "untouched",
  },
  {
    slug: "birch-tate",
    title: "Birch–Tate conjecture",
    category: "Algebra",
    statement:
      "For a totally real number field F, the order of the tame kernel K₂(O_F) equals |w₂(F) · ζ_F(−1)| — K-theory measured by a zeta value.",
    status:
      "Proved for abelian fields up to (and now including most of) the 2-part via Iwasawa theory (Mazur–Wiles, Wiles, Kolster); open in general.",
    attack:
      "Verify numerically for small non-abelian totally real fields: compute ζ_F(−1) exactly and bound K₂(O_F) computationally; catalog the 2-torsion behavior.",
    tags: ["k-theory", "zeta functions", "number fields", "iwasawa"],
    stage: "untouched",
  },
  {
    slug: "williamson-conjecture",
    title: "Williamson matrices",
    category: "Algebra",
    statement:
      "For which odd n do Williamson matrices (four symmetric circulant ±1 matrices with A² + B² + C² + D² = 4nI) exist? Each solution yields a Hadamard matrix of order 4n.",
    status:
      "The original conjecture (existence for all n) is false — n = 35 has none (Ðoković 1993); which n admit them, and whether infinitely many do in every residue class, is open.",
    attack:
      "Exhaustive and SAT-based search for unresolved orders; mine the distribution of known solutions for algebraic structure predicting existence.",
    tags: ["hadamard matrices", "circulant", "construction", "sat"],
    stage: "untouched",
  },
  {
    slug: "finite-lattice-representation",
    title: "Finite lattice representation problem",
    category: "Algebra",
    statement:
      "Is every finite lattice isomorphic to the congruence lattice of a finite algebra?",
    status:
      "Open. Equivalent (Pálfy–Pudlák) to a question about intervals in subgroup lattices of finite groups; known for many lattice classes.",
    attack:
      "Enumerate small lattices and search for representing algebras/groups computationally; focus on the smallest lattices with no known representation.",
    tags: ["lattices", "universal algebra", "congruences", "groups"],
    stage: "untouched",
  },

  // ---------------------------------------------------- dynamics & analysis
  {
    slug: "outer-billiards",
    title: "Outer billiards unboundedness",
    category: "Dynamics & Analysis",
    statement:
      "For which convex shapes does the outer (dual) billiard map admit unbounded orbits? Moser asked whether orbits can escape to infinity at all.",
    status:
      "Schwartz (2007) proved unbounded orbits exist for the Penrose kite; boundedness for general polygons (e.g. all quadrilaterals, generic polygons) remains open.",
    attack:
      "Simulate orbits for families of polygons with exact rational arithmetic; map the return dynamics and hunt escape channels beyond the known kite cases.",
    tags: ["billiards", "dynamics", "unbounded orbits", "simulation"],
    stage: "untouched",
  },
  {
    slug: "birkhoff-conjecture",
    title: "Birkhoff conjecture on integrable billiards",
    category: "Dynamics & Analysis",
    statement:
      "If the billiard dynamics inside a smooth convex curve is integrable (foliated by caustics), the curve must be an ellipse.",
    status:
      "Open in full; proved for perturbations of ellipses (Avila–De Simoi–Kaloshin, Kaloshin–Sorrentino local versions).",
    attack:
      "Numerically test integrability breakdown for perturbed ellipses and near-elliptical ovals; measure caustic destruction rates against the local theorems.",
    tags: ["billiards", "integrability", "caustics", "perturbation"],
    stage: "untouched",
  },
  {
    slug: "sendov-conjecture",
    title: "Sendov's conjecture",
    category: "Dynamics & Analysis",
    statement:
      "If all roots of a polynomial lie in the closed unit disk, then within distance 1 of each root lies a critical point (root of the derivative).",
    status:
      "Open in general. Proved for degree ≤ 8, for roots on the circle, and by Tao (2020) for all sufficiently large degrees.",
    attack:
      "High-precision numerical verification for mid-range degrees (9 ≤ n ≤ a few hundred) over random and structured root sets; search for extremal configurations approaching distance 1.",
    tags: ["polynomials", "critical points", "complex analysis"],
    stage: "untouched",
  },
  {
    slug: "berry-tabor",
    title: "Berry–Tabor conjecture",
    category: "Dynamics & Analysis",
    statement:
      "The energy-level spacings of a generic quantized integrable system follow Poisson statistics — in contrast to random-matrix statistics for chaotic systems.",
    status:
      "Open as a general theorem; proved in special arithmetic cases (e.g. certain flat tori via Sarnak, Eskin–Margulis–Mozes). Overwhelming numerical support.",
    attack:
      "Simulate spectra of integrable billiards, flat tori, and quantum maps; test spacing statistics at scale and probe the exceptional (non-generic) parameter sets where Poisson fails.",
    tags: ["quantum chaos", "level spacing", "spectra", "random matrices"],
    stage: "untouched",
  },
  {
    slug: "fluid-regularity",
    title: "Regularity & blow-up in model fluid equations",
    category: "Dynamics & Analysis",
    statement:
      "Do smooth solutions of simplified fluid models (1D model equations, axisymmetric Euler scenarios, generalized SQG) blow up in finite time — and what does the blow-up profile look like?",
    status:
      "Active frontier: Elgindi's singularity for C^{1,α} Euler and Hou-type numerics for axisymmetric blow-up mark the state of the art; smooth-data Euler blow-up remains open (and Navier–Stokes is a Millennium problem — out of scope here).",
    attack:
      "High-resolution numerical experiments on model equations (De Gregorio, CKN-type scenarios); fit self-similar profiles and test stability of candidate blow-ups.",
    tags: ["pde", "euler", "blow-up", "numerics"],
    stage: "untouched",
  },

  // ---------------------------------------------------- graph decompositions
  {
    slug: "one-factorization",
    title: "1-Factorization conjecture",
    category: "Graph Decompositions",
    statement:
      "Every d-regular graph on an even number n of vertices with d ≥ 2⌈n/4⌉ − 1 decomposes into perfect matchings (is 1-factorizable).",
    status:
      "Proved for all sufficiently large n (Csaba–Kühn–Lo–Osthus–Treglown, 2016); small cases remain unconsolidated.",
    attack:
      "Test edge-coloring algorithms on small dense regular graphs at the threshold; search for the extremal graphs that make the bound tight.",
    tags: ["matchings", "edge coloring", "regular graphs"],
    stage: "untouched",
  },
  {
    slug: "overfull-conjecture",
    title: "Overfull conjecture",
    category: "Graph Decompositions",
    statement:
      "A graph with maximum degree Δ > n/3 is class 2 (chromatic index Δ + 1) if and only if it contains an overfull subgraph — one with more edges than Δ·⌊|V|/2⌋.",
    status: "Open. Known consequences would include the 1-factorization conjecture; verified in many special classes.",
    attack:
      "Generate and classify small class-2 graphs with Δ > n/3, checking each for overfull subgraphs; automate the search for a counterexample candidate.",
    tags: ["edge coloring", "chromatic index", "class 2", "overfull"],
    stage: "untouched",
  },
  {
    slug: "linear-arboricity",
    title: "Linear arboricity conjecture",
    category: "Graph Decompositions",
    statement:
      "The edges of every graph with maximum degree Δ can be partitioned into at most ⌈(Δ + 1)/2⌉ linear forests (disjoint unions of paths).",
    status:
      "Open. Known asymptotically (Δ/2 + O(Δ^{2/3−ε}) forests suffice, Ferber–Fox–Jain and successors); exact for many classes.",
    attack:
      "Verify decompositions on small graphs at odd Δ where the bound is tight; implement and stress the probabilistic decomposition algorithms on structured families.",
    tags: ["linear forests", "decomposition", "paths", "arboricity"],
    stage: "untouched",
  },
  {
    slug: "erdos-sos",
    title: "Erdős–Sós conjecture",
    category: "Graph Decompositions",
    statement:
      "Every graph with average degree greater than k − 1 contains every tree with k edges as a subgraph.",
    status:
      "Open in general; an announced proof for large k (Ajtai–Komlós–Simonovits–Szemerédi) remains unpublished. Known for paths (Erdős–Gallai), spiders, and many tree classes.",
    attack:
      "Test the bound on random and extremal graphs against hard tree shapes (brooms, caterpillars); search for near-tight configurations in small k.",
    tags: ["trees", "subgraphs", "average degree", "extremal"],
    stage: "untouched",
  },
  {
    slug: "gallai-paths",
    title: "Gallai's path decomposition conjecture",
    category: "Graph Decompositions",
    statement: "The edges of every connected graph on n vertices can be decomposed into at most ⌈n/2⌉ paths.",
    status:
      "Open. Known for graphs whose vertices of even degree form a forest (Lovász-derived), planar graphs (Blanché–Bonamy–Bonichon 2021 announcement), and other classes.",
    attack:
      "Exhaustively verify small graphs; implement decomposition heuristics and study which graphs need exactly ⌈n/2⌉ paths — the tight family drives the induction.",
    tags: ["path decomposition", "edges", "connected graphs"],
    stage: "untouched",
  },

  // -------------------------------------------------- algorithms, simulation
  {
    slug: "minimal-superpermutations-search",
    title: "Minimal superpermutations — extended search",
    category: "Algorithms & Simulation",
    statement:
      "Push the computational frontier on shortest superpermutations: close the 867–872 gap at n = 6 and improve constructions for n = 7–8.",
    status:
      "Open search frontier. The problem reduces to a TSP over permutation-overlap graphs — enormous but heavily structured.",
    attack:
      "Symmetry-reduced branch-and-bound and SAT encodings at n = 6; recombine Egan-style construction fragments; use the search as a benchmark for learned heuristics.",
    tags: ["superpermutations", "tsp", "search", "sat"],
    stage: "untouched",
  },
  {
    slug: "map-folding",
    title: "Map folding & polyomino folding",
    category: "Algorithms & Simulation",
    statement:
      "Count the ways an n×m map can be folded flat along its creases — no closed form or polynomial algorithm is known even for 2×n — and decide which polyomino crease patterns fold into given 3D shapes.",
    status: "Open enumeration problem; 1×n (stamp folding) has no closed form, and n×n counts are known only for tiny n.",
    attack:
      "Write exact enumeration engines with symmetry pruning to extend known sequences (OEIS A001415-family); test complexity conjectures on random crease patterns.",
    tags: ["folding", "enumeration", "polyominoes", "computational geometry"],
    stage: "untouched",
  },
  {
    slug: "self-avoiding-walks",
    title: "Self-avoiding walks",
    category: "Algorithms & Simulation",
    statement:
      "Count self-avoiding walks of length n on a lattice and pin down the connective constant μ and critical exponents. On Z² the constant is unknown (≈ 2.638).",
    status:
      "Open on the square lattice; solved exactly on the honeycomb lattice (μ = √(2+√2), Duminil-Copin–Smirnov 2010). Exponent conjectures (11/32) rest on conformal-invariance predictions.",
    attack:
      "Extend series enumeration with transfer-matrix / finite-lattice methods; Monte Carlo (pivot algorithm) at scale to sharpen μ and exponent estimates.",
    tags: ["lattice", "enumeration", "monte carlo", "critical exponents"],
    stage: "untouched",
  },
  {
    slug: "hard-sat-instances",
    title: "Small hard CSP/SAT instances",
    category: "Algorithms & Simulation",
    statement:
      "Construct families of small constraint-satisfaction instances that are maximally hard for modern solvers, and extract minimal unsatisfiable cores that explain the hardness.",
    status:
      "Open-ended engineering/science frontier tied to proof complexity: resolution lower bounds predict hardness, but the map from structure to solver pain is poorly charted.",
    attack:
      "Generate instances near phase transitions and adversarially tune them against CDCL solvers; minimize unsat cores automatically; correlate hardness with proof-complexity measures.",
    tags: ["sat", "csp", "phase transition", "proof complexity"],
    stage: "untouched",
  },
  {
    slug: "np-hard-heuristics",
    title: "Heuristics vs. exact methods on NP-hard problems",
    category: "Algorithms & Simulation",
    statement:
      "On specific graph families, how close do learned or AI-generated heuristics get to exact optima for max-cut, vertex cover, and TSP variants — and where exactly do they fail?",
    status:
      "Open-ended benchmark frontier: moderate sizes where exact solvers still certify optima are the honest testing ground for heuristic claims.",
    attack:
      "Build paired pipelines (exact ILP/branch-and-bound vs. generated heuristics) on structured families; log optimality gaps and failure structure; iterate the heuristics against their own failure cases.",
    tags: ["max-cut", "vertex cover", "tsp", "benchmarks", "heuristics"],
    stage: "untouched",
  },
];

export function getProblem(slug: string): Problem | undefined {
  return PROBLEMS.find((p) => p.slug === slug);
}

export function problemHref(p: Problem): string {
  return p.href ?? `/p/${p.slug}`;
}

export const STAGE_LABEL: Record<Stage, string> = {
  live: "live lab",
  started: "started",
  untouched: "untouched",
};
