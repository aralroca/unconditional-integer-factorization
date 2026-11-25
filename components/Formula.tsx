type LFormulaProps = {
  /** The number whose size drives the cost: N, or the factor p for ECM. */
  base?: "N" | "p";
  alpha: "1/2" | "1/3";
  constant: string;
};

/** L_base[alpha, constant] in native MathML, written the way the literature writes it. */
export function LFormula({ base = "N", alpha, constant }: LFormulaProps) {
  const [numerator, denominator] = alpha.split("/");

  return (
    <math display="inline" className="formula" aria-label={`L sub ${base} of ${alpha}, ${constant}`}>
      <msub>
        <mi>L</mi>
        <mi>{base}</mi>
      </msub>
      <mo stretchy="false">[</mo>
      <mn>{numerator}</mn>
      <mo lspace="0" rspace="0">
        /
      </mo>
      <mn>{denominator}</mn>
      <mo>,</mo>
      <Constant value={constant} />
      <mo stretchy="false">]</mo>
    </math>
  );
}

function Constant({ value }: { value: string }) {
  if (value === "√2") {
    return (
      <msqrt>
        <mn>2</mn>
      </msqrt>
    );
  }
  if (value !== "O(1)") return <mn>{value}</mn>;

  return (
    <>
      <mi mathvariant="normal">O</mi>
      <mo stretchy="false">(</mo>
      <mn>1</mn>
      <mo stretchy="false">)</mo>
    </>
  );
}

export function PowerOfTwo({ exponent }: { exponent: number }) {
  return (
    <math display="inline" className="formula" aria-label={`2 to the power ${exponent}`}>
      <msup>
        <mn>2</mn>
        <mn>{exponent}</mn>
      </msup>
    </math>
  );
}
