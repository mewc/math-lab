# Graffiti conjecture 284 — Hoffman–Singleton counterexample

Status: **the algebraic counterexample is independently checked; the exact
Graffiti-record attribution is reported on X and awaits a primary-source citation.**

## Claim

For a vertex \(v\), its dual degree is the average degree of its neighbors:

\[
d^*(v)=\frac{1}{d(v)}\sum_{u\sim v}d(u).
\]

The reported Graffiti 284 claim is that every connected graph \(G\) of girth at
least 5 satisfies

\[
\min_{v\in V(G)} d^*(v)\leq-\lambda_{\min}(D(G)),
\]

where \(D(G)\) is the distance matrix.

## Witness and exact calculation

Let \(H\) be the Hoffman–Singleton graph. Standard data: it is strongly regular
with parameters \((50,7,0,1)\), so it is 7-regular, has diameter 2 and girth 5;
its adjacency spectrum is

\[
\operatorname{Spec}(A)=\{7^1,2^{28},(-3)^{21}\}.
\]

Regularity gives \(d^*(v)=7\) for all \(v\). Since the diameter is 2, with \(J\)
the all-ones matrix,

\[
D(H)=2(J-I)-A.
\]

On the all-ones line this has eigenvalue \(2(50-1)-7=91\). On its orthogonal
complement, \(J=0\), so an adjacency eigenvalue \(\theta\) becomes \(-2-\theta\).
Thus

\[
\operatorname{Spec}(D(H))=\{91^1,1^{21},(-4)^{28}\},
\qquad \lambda_{\min}(D(H))=-4.
\]

The proposed inequality would therefore assert \(7\leq4\), a contradiction.

## Sources

- [Original report (Justin Sun on X, 2026-07-23)](https://x.com/justinsunyt/status/2080116559352316409)
- [Hoffman–Singleton graph data at DistanceRegular.org](https://www.math.mun.ca/distanceregular/graphs/hoffmansingleton.html)
- [Rowlinson & Sciriha (2007), spectrum \(7^1,2^{28},(-3)^{21}\)](https://www.um.edu.mt/library/oar/handle/123456789/28286)
