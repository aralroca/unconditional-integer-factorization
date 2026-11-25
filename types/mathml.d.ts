// React renders MathML natively, but @types/react does not declare its elements yet.
// Only the elements used in components/Formula.tsx are declared.
import type { HTMLAttributes } from "react";

type MathMLProps = HTMLAttributes<HTMLElement> & {
  display?: "block" | "inline";
  mathvariant?: "normal";
  stretchy?: "true" | "false";
  lspace?: string;
  rspace?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      math: MathMLProps;
      mi: MathMLProps;
      mn: MathMLProps;
      mo: MathMLProps;
      msub: MathMLProps;
      msup: MathMLProps;
    }
  }
}
