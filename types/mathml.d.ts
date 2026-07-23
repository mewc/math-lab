// React's bundled JSX types intentionally cover HTML and SVG only. This small
// declaration lets the dedicated math dossiers use native browser MathML,
// avoiding a client-side typesetting dependency for a handful of exact displays.
import type { HTMLAttributes } from "react";

type MathMLProps = HTMLAttributes<HTMLElement> & {
  display?: "block" | "inline";
  xmlns?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      math: MathMLProps;
      mi: MathMLProps;
      mn: MathMLProps;
      mo: MathMLProps;
      mrow: MathMLProps;
      msub: MathMLProps;
      msup: MathMLProps;
      munder: MathMLProps;
      munderover: MathMLProps;
      mfrac: MathMLProps;
    }
  }
}

export {};
