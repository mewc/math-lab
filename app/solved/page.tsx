import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, absUrl } from "@/lib/seo";

// Evergreen playbook: what to actually do when you believe you've settled an
// open problem. High-intent, high-volume search ("I think I solved the Collatz
// conjecture, what do I do") and strong GEO content — so it carries HowTo +
// FAQPage structured data. Built on the legacy dossier classes to match the
// rest of the site. Every tool linked is real; the tone is honest, not mocking.

const TITLE = "I think I solved an open problem — now what?";
const DESCRIPTION =
  "A calm, practical playbook for when you believe you've proved (or disproved) a famous open math problem: the sanity checks, computational stress tests (Wolfram Alpha, OEIS, a CAS), adversarial review with AI models, the literature check, formalizing in Lean, and how to get real eyes on it — before you email anyone.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "I think I solved a math problem",
    "I solved the Collatz conjecture",
    "how to check a math proof",
    "is my proof correct",
    "I proved the Riemann hypothesis",
    "verify a mathematical proof",
    "disprove a conjecture",
    "counterexample check",
    "how to publish a math proof",
    "formalize a proof Lean",
    "amateur math proof",
  ],
  alternates: { canonical: "/solved" },
  openGraph: {
    type: "article",
    title: `${TITLE} · ${SITE_NAME}`,
    description: DESCRIPTION,
    url: "/solved",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const SECTIONS: [string, string][] = [
  ["base-rate", "Start here: the base rate"],
  ["sanity", "The five-minute sanity checks"],
  ["compute", "Stress-test it with computation"],
  ["counterexample", "Try to break it yourself"],
  ["ai", "Adversarial review with AI models"],
  ["literature", "Check the literature"],
  ["formalize", "Formalize it — the gold standard"],
  ["failure-modes", "How proofs usually die"],
  ["humans", "Get human eyes, the right way"],
  ["publish", "If it survives: priority & publishing"],
  ["submit", "Or: submit it to Math Lab"],
  ["faq", "FAQ"],
];

// --- structured data -------------------------------------------------------

const HOWTO_LD = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "What to do when you think you've solved an open math problem",
  description: DESCRIPTION,
  url: absUrl("/solved"),
  totalTime: "P7D",
  step: [
    { name: "Accept the base rate", text: "Almost every claimed proof of a famous problem is wrong. That's a prior, not an insult — proceed as your own harshest skeptic." },
    { name: "Run the five-minute sanity checks", text: "Test the claim on small concrete cases, find exactly where it uses each hypothesis, and check it doesn't also 'prove' something known to be false." },
    { name: "Stress-test with computation", text: "Use Wolfram Alpha, a computer-algebra system (SageMath, PARI/GP, SymPy), and OEIS in exact arithmetic — never floating point for an exactness claim." },
    { name: "Try to build a counterexample", text: "Spend real effort attacking your own statement at its extremal and boundary cases before defending it." },
    { name: "Get adversarial AI review", text: "Ask several models to find the single weakest step and refute it. Treat them as flaw-finders, not authorities." },
    { name: "Check the literature", text: "Search arXiv, Google Scholar, and zbMATH; read the precise statement and known partial results. Many 'proofs' misread the problem." },
    { name: "Formalize it", text: "A machine-checked proof in Lean, Rocq/Coq, or Isabelle is the end of the argument. If it's correct, it's formalizable." },
    { name: "Get human eyes the right way", text: "Post a precise, self-contained statement to MathOverflow or Math StackExchange, honest about any gaps." },
    { name: "Establish priority if it survives", text: "Timestamp a preprint on arXiv and submit to a peer-reviewed journal." },
  ],
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "I verified it for the first billion cases — isn't that a proof?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. A universally-quantified statement ('for all n …') is not settled by any finite amount of checking. Many conjectures hold for astronomically many cases and then fail. Computation can disprove (one counterexample) or build confidence, but it can never prove a 'for all' claim.",
      },
    },
    {
      "@type": "Question",
      name: "An AI model said my proof is correct. Does that count?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Language models are not proof authorities — they tend to agree and to hallucinate justification. They are useful for finding flaws when you prompt them adversarially, but a machine-checked proof (Lean/Coq/Isabelle) or peer review is what actually certifies a result.",
      },
    },
    {
      "@type": "Question",
      name: "Should I email a famous mathematician my PDF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not as a first step, and not a document titled 'PROOF OF …'. Experts receive many incorrect claims and rarely read unsolicited proofs. Post a precise, self-contained statement to MathOverflow or Math StackExchange first; if it survives, a preprint and journal submission are the right channels.",
      },
    },
    {
      "@type": "Question",
      name: "How long should verifying my own proof take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Longer than writing it. Real verification means finding where every hypothesis is used, checking the boundary cases by computer, searching the literature, and ideally formalizing it. Days to weeks is normal; being in a hurry is a red flag.",
      },
    },
  ],
};

function Chapter({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="chapter" id={id}>
      <div className="chapter-head">
        <span className="num">§{n}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

export default function SolvedPlaybookPage() {
  return (
    <>
      <JsonLd data={HOWTO_LD} />
      <JsonLd data={FAQ_LD} />
      <div className="shell">
        <nav className="toc" aria-label="Contents">
          <div className="crumbs">
            <Link href="/">← all problems</Link>
          </div>
          <div className="toc-title">The playbook</div>
          {SECTIONS.map(([id, title], i) => (
            <a key={id} href={`#${id}`}>
              <span className="toc-num">§{i + 1}</span>
              {title}
            </a>
          ))}
        </nav>

        <main>
          <div className="hero">
            <div className="kicker">A field guide · read this before you tell anyone</div>
            <h1>
              So you think you&apos;ve <em>solved</em> an open problem
            </h1>
            <p className="lede">
              First: good. Sitting with a famous problem long enough to believe you&apos;ve cracked
              it means you did real thinking, and that&apos;s worth something no matter how this
              ends. Now the work changes from <strong>having</strong> an idea to{" "}
              <strong>trying to kill it</strong>. This is the playbook — the same checks a
              professional runs on their own work, in order, with the actual tools. Be your own
              harshest referee and you either find the mistake (almost always) or you arrive at
              something worth other people&apos;s time (rarely, and then it&apos;s real).
            </p>
            <div className="honesty-box">
              <b>The one rule.</b> A proof is not correct because it feels correct, because it
              survived a lot of examples, or because someone (or some model) said &ldquo;looks
              good.&rdquo; It is correct when every step is justified and the whole thing survives
              people trying to break it. Until then it is a <i>candidate</i>. Treat it like one and
              you can&apos;t embarrass yourself.
            </div>
          </div>

          <Chapter id="base-rate" n={1} title="Start here: the base rate">
            <p>
              Every famous open problem has been &ldquo;solved&rdquo; thousands of times, almost
              always incorrectly, usually by capable and sincere people. That&apos;s not a knock on
              you — it&apos;s a prior you should hold about <em>yourself</em>. The correct starting
              belief is: <strong>this is probably wrong, and my job is to find out how.</strong>{" "}
              Nothing below works if you&apos;re defending the proof instead of attacking it.
            </p>
            <p>
              The good news is that the same skepticism that makes this humbling makes it{" "}
              <em>fast</em>. Most incorrect proofs die to a single small check. You can run most of
              them yourself in an afternoon, before you&apos;ve told a soul.
            </p>
          </Chapter>

          <Chapter id="sanity" n={2} title="The five-minute sanity checks">
            <p>Before anything else, three questions that end most claimed proofs immediately:</p>
            <ul className="playbook-list">
              <li>
                <b>Does it survive one small case?</b> Take the smallest nontrivial instance and run
                your argument on it by hand. If it&apos;s a &ldquo;for all n&rdquo; claim, try
                n = 1, 2, 3 explicitly. Proofs that are secretly wrong often can&apos;t even be{" "}
                <i>executed</i> on a concrete input.
              </li>
              <li>
                <b>Where <i>exactly</i> does each hypothesis get used?</b> Point at the line. If you
                can drop a hypothesis and the argument still &ldquo;works,&rdquo; you&apos;ve either
                proved something stronger (extraordinary — and probably wrong) or you have a gap.
              </li>
              <li>
                <b>Does your method also prove something false?</b> This is the single most powerful
                test. If the same argument, unchanged, would prove a statement known to be false (a
                nearby variant, a case with a known counterexample), the argument is broken — no
                need to find where. Math Lab&apos;s own <Link href="/p/collatz">Collatz</Link> and{" "}
                <Link href="/p/goemans-unsplittable-flow">DGG</Link> pages are built around exactly
                these &ldquo;it would prove too much&rdquo; boundaries.
              </li>
            </ul>
          </Chapter>

          <Chapter id="compute" n={3} title="Stress-test it with computation">
            <p>
              This is the heart of it, and where this site lives. If any part of your claim is
              concrete — a bound, an identity, a sequence, a specific construction — a computer can
              check it in exact arithmetic in minutes. Do this before you trust a single hand
              calculation.
            </p>
            <ul className="playbook-list">
              <li>
                <b><Ext href="https://www.wolframalpha.com/">Wolfram&nbsp;Alpha</Ext></b> — fastest
                first pass: evaluate your expressions, test an identity symbolically, factor,
                check a limit, plot. If your claim disagrees with Wolfram Alpha on a concrete input,
                stop and find out why.
              </li>
              <li>
                <b>A computer-algebra system for the real work.</b>{" "}
                <Ext href="https://www.sagemath.org/">SageMath</Ext> (free; run it in the browser on{" "}
                <Ext href="https://cocalc.com/">CoCalc</Ext>),{" "}
                <Ext href="https://pari.math.u-bordeaux.fr/">PARI/GP</Ext> for number theory, or{" "}
                <Ext href="https://www.sympy.org/">SymPy</Ext> /{" "}
                <Ext href="https://mpmath.org/">mpmath</Ext> in Python. Use{" "}
                <b>exact integers / rationals</b>, never floating point, for any claim about
                exactness — floating-point &ldquo;equality&rdquo; has fooled a lot of people.
              </li>
              <li>
                <b><Ext href="https://oeis.org/">The OEIS</Ext></b> — if your work produces a
                sequence of numbers, paste the first terms in. Odds are it&apos;s already there,
                with references telling you what&apos;s known, what it&apos;s connected to, and
                sometimes that your &ldquo;new&rdquo; result is classical.
              </li>
              <li>
                <b>Write the verifier, not the demo.</b> Don&apos;t code something that shows your
                idea working on the case you like; code something that <i>searches for the case that
                breaks it</i>, exhaustively, in exact arithmetic. That&apos;s the standard every
                tackled problem here is held to — e.g. the DGG counterexample ships an exhaustive
                exact-integer checker over all routings, not a happy-path demo.
              </li>
            </ul>
            <div className="honesty-box">
              <b>Exactness matters.</b> &ldquo;These two things agreed to 12 decimal places&rdquo; is
              not &ldquo;these two things are equal.&rdquo; Lehmer&apos;s number, near-integer
              coincidences, and countless almost-identities are exactly this trap. Use exact
              arithmetic or interval arithmetic when the claim is about equality or a strict bound.
            </div>
          </Chapter>

          <Chapter id="counterexample" n={4} title="Try to break it yourself">
            <p>
              Spend an honest hour as the enemy of your own theorem. Push it to the{" "}
              <b>extremal and boundary cases</b>: the smallest, the largest, the degenerate, the
              tie, the empty set, n = 0 and n = 1, the case where two things you assumed distinct
              coincide. Conjectures and proofs alike tend to die at the edges, not the middle.
            </p>
            <p>
              If your result is a <b>construction</b> (&ldquo;here is an object with property
              X&rdquo;), verify the object independently of how you built it — rebuild it from its
              definition and check every property from scratch, the way a referee would, not the way
              its author would.
            </p>
          </Chapter>

          <Chapter id="ai" n={5} title="Adversarial review with AI models">
            <p>
              Large language models are genuinely useful here — but only if you use them as{" "}
              <b>flaw-finders, not judges</b>. Prompt them against you:
            </p>
            <ul className="playbook-list">
              <li>
                &ldquo;Here is a proof of X. Find the <i>single weakest</i> step and explain
                precisely why it might not hold. Do not tell me it looks correct.&rdquo;
              </li>
              <li>
                Ask more than one — <Ext href="https://claude.ai/">Claude</Ext>,{" "}
                <Ext href="https://chatgpt.com/">ChatGPT</Ext>,{" "}
                <Ext href="https://gemini.google.com/">Gemini</Ext> — and make each try to{" "}
                <i>refute</i> the claim, construct a counterexample, and check a specific lemma in
                isolation.
              </li>
              <li>
                Have a model translate your argument into precise definitions. If it can&apos;t
                restate a step without inventing an assumption, that step is the gap.
              </li>
            </ul>
            <div className="honesty-box">
              <b>The trap.</b> Models are trained to be agreeable and will happily &ldquo;confirm&rdquo;
              a broken proof with confident, fabricated reasoning. A model saying <i>yes</i> is worth
              nothing; a model finding a real hole is worth a lot. Never treat &ldquo;the AI agreed&rdquo;
              as verification.
            </div>
          </Chapter>

          <Chapter id="literature" n={6} title="Check the literature">
            <p>
              Read the <b>precise statement</b> of the problem from a primary source, not a
              paraphrase — an enormous fraction of claimed solutions actually solve a different,
              easier, or already-known statement. Then find out what&apos;s already been done:
            </p>
            <ul className="playbook-list">
              <li>
                <b><Ext href="https://arxiv.org/">arXiv</Ext></b> and{" "}
                <b><Ext href="https://scholar.google.com/">Google Scholar</Ext></b> for preprints and
                papers; <b><Ext href="https://zbmath.org/">zbMATH Open</Ext></b> (free) for reviewed
                literature.
              </li>
              <li>
                Learn the known <b>partial results and barriers</b>. If a result says
                &ldquo;no proof of this kind can work&rdquo; (a known obstruction, a
                relativization/natural-proofs-style barrier, a proven bound your claim would beat),
                your approach has to explain how it gets past that — or it doesn&apos;t work.
              </li>
              <li>
                Check whether your key lemma is a known <b>open</b> problem in disguise. Sometimes
                the &ldquo;easy step&rdquo; is the whole difficulty.
              </li>
            </ul>
          </Chapter>

          <Chapter id="formalize" n={7} title="Formalize it — the gold standard">
            <p>
              If your proof is correct, it can be checked by a machine that has no interest in being
              polite to you. A formal proof in{" "}
              <Ext href="https://leanprover-community.github.io/">Lean&nbsp;(mathlib)</Ext>,{" "}
              <Ext href="https://rocq-prover.org/">Rocq (Coq)</Ext>, or{" "}
              <Ext href="https://isabelle.in.tum.de/">Isabelle</Ext> is the end of the argument: the
              proof assistant accepts it or it doesn&apos;t, and it will not accept a gap.
            </p>
            <p>
              This is hard and it&apos;s supposed to be — the difficulty is exactly the
              rigor you want. Even formalizing the <i>statement</i> and the key lemma is clarifying;
              people routinely discover, while formalizing, that a step they were sure of doesn&apos;t
              actually hold. The <Ext href="https://leanprover.zulipchat.com/">Lean Zulip</Ext>{" "}
              community is welcoming to newcomers with a specific, precise goal.
            </p>
          </Chapter>

          <Chapter id="failure-modes" n={8} title="How proofs usually die">
            <p>
              A checklist of the classic failure modes. Read it looking for <i>yourself</i>:
            </p>
            <ul className="playbook-list">
              <li>
                <b>Using the conclusion.</b> Somewhere the thing you&apos;re proving is quietly
                assumed. The most common and hardest-to-see error.
              </li>
              <li>
                <b>Division by something that can be zero</b>, or taking a root/inverse/log of a
                quantity that isn&apos;t guaranteed positive/nonzero.
              </li>
              <li>
                <b>&ldquo;Without loss of generality&rdquo; that loses generality</b> — a symmetry
                or normalization that isn&apos;t actually available.
              </li>
              <li>
                <b>Swapping limits, sums, or quantifiers</b> (∀∃ vs ∃∀; interchanging limit and
                integral/sum without justification).
              </li>
              <li>
                <b>Induction with a broken base case or a step that needs the very thing being
                proved.</b>
              </li>
              <li>
                <b>Finite ⇒ infinite.</b> A pattern holding for all checked n, or a property of
                every finite stage, asserted for the infinite/limit object with no argument.
              </li>
              <li>
                <b>&ldquo;Almost all&rdquo; ≠ &ldquo;all.&rdquo;</b> A density/measure/probabilistic
                statement quietly upgraded to a universal one. (This exact distinction is why the
                Collatz page is careful to say Tao proved <i>almost all</i> orbits behave — not all.)
              </li>
              <li>
                <b>An off-by-one, a sign, or a boundary case</b> that the &ldquo;obvious&rdquo; step
                skipped.
              </li>
            </ul>
          </Chapter>

          <Chapter id="humans" n={9} title="Get human eyes, the right way">
            <p>
              Once it has survived the checks above — and only then — put it in front of people, in
              the venues built for it:
            </p>
            <ul className="playbook-list">
              <li>
                <b><Ext href="https://mathoverflow.net/">MathOverflow</Ext></b> for research-level
                questions, <b><Ext href="https://math.stackexchange.com/">Math StackExchange</Ext></b>{" "}
                for everything else. Ask about the <i>weakest step</i> as a focused question — not
                &ldquo;is my proof of the Riemann Hypothesis correct&rdquo; (that gets closed), but a
                precise, self-contained question about the specific lemma you&apos;re least sure of.
              </li>
              <li>
                <b>Write for a skeptical reader.</b> State the theorem precisely, define your terms,
                make it self-contained, and be <i>honest about the gaps</i> — flagging your own
                weak step is the single fastest way to get a serious person to engage.
              </li>
              <li>
                <b>Don&apos;t lead with the claim.</b> A document titled &ldquo;PROOF OF [famous
                problem]&rdquo; emailed to an expert is almost never read. A crisp question about one
                lemma, from someone visibly doing the work, often is.
              </li>
            </ul>
          </Chapter>

          <Chapter id="publish" n={10} title="If it survives everything: priority & publishing">
            <p>
              If your result has passed the computational checks, the adversarial review, the
              literature, ideally a formalization, and knowledgeable humans haven&apos;t broken it —
              now you handle it like a result:
            </p>
            <ul className="playbook-list">
              <li>
                <b>Timestamp it.</b> Post a preprint to <Ext href="https://arxiv.org/">arXiv</Ext>{" "}
                (or a repository with a permanent DOI). That establishes priority with a public date.
              </li>
              <li>
                <b>Submit to a peer-reviewed journal.</b> Peer review is slow and adversarial by
                design — that&apos;s the feature. A correct result survives it.
              </li>
              <li>
                <b>Keep every version and every check.</b> The trail of exactly what you verified,
                and how, is part of the result.
              </li>
            </ul>
          </Chapter>

          <Chapter id="submit" n={11} title="Or: submit it to Math Lab">
            <p>
              If it&apos;s one of the problems tracked here, we&apos;ll take it head-on the way we
              took the <Link href="/p/goemans-unsplittable-flow">DGG / Goemans cost conjecture</Link>
              : reproduce the claim in an exact-integer machine verifier and try to break it,
              honestly, with the result — proof, counterexample, or &ldquo;dies at this step&rdquo; —
              logged on the record. Dead ends are results too.
            </p>
            <p>
              Use the <b>Submit / feedback</b> button in the sidebar to send it over (it reaches the
              lab directly), or — the durable path — open a pull request or issue on{" "}
              <Ext href="https://github.com/mewc/math-lab">GitHub</Ext> with your statement and, if
              you have one, your verifier code. Precise statement, honest about the gaps, and a
              concrete case we can run: that&apos;s all we ask.
            </p>
          </Chapter>

          <Chapter id="faq" n={12} title="FAQ">
            <div className="note-entry">
              <div className="note-date">Q</div>
              <p>
                <b>I verified it for the first billion cases — isn&apos;t that a proof?</b> No. A
                &ldquo;for all n&rdquo; statement is not settled by any finite amount of checking;
                plenty of conjectures hold for astronomically many cases and then fail. Computation
                can <i>disprove</i> (one counterexample) or build confidence — it can never prove a
                universal claim.
              </p>
            </div>
            <div className="note-entry">
              <div className="note-date">Q</div>
              <p>
                <b>An AI model said my proof is correct — does that count?</b> No. Models tend to
                agree and to fabricate justification. They&apos;re valuable for finding flaws when
                prompted adversarially; a machine-checked proof or peer review is what certifies a
                result.
              </p>
            </div>
            <div className="note-entry">
              <div className="note-date">Q</div>
              <p>
                <b>Should I email a famous mathematician my PDF?</b> Not first, and not one titled
                &ldquo;PROOF OF ….&rdquo; Post a precise, self-contained question about your weakest
                step to MathOverflow first; if it survives, a preprint and journal submission are the
                right channels.
              </p>
            </div>
            <div className="note-entry">
              <div className="note-date">Q</div>
              <p>
                <b>How long should this take?</b> Longer than writing the proof did. Being in a hurry
                to announce is itself a red flag — the result isn&apos;t going anywhere, and the
                checks are the point.
              </p>
            </div>
            <div className="footer">
              Ground rules (inherited from Collatz Lab): no fabricated steps, honest statuses,
              corrections kept on the record. &ldquo;Open&rdquo; means open — and &ldquo;solved&rdquo;
              means it survived all of the above.
            </div>
          </Chapter>
        </main>
      </div>
    </>
  );
}
