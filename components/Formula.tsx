/** L_N[1/3, c] in native MathML, written the way the paper writes it. */
export function LFormula({ constant }: { constant: "O(1)" | "105" }) {
  return (
    <math display="inline" className="formula" aria-label={`L sub N of 1/3, ${constant}`}>
      <msub>
        <mi>L</mi>
        <mi>N</mi>
      </msub>
      <mo stretchy="false">[</mo>
      <mn>1</mn>
      <mo lspace="0" rspace="0">
        /
      </mo>
      <mn>3</mn>
      <mo>,</mo>
      {constant === "105" ? (
        <mn>105</mn>
      ) : (
        <>
          <mi mathvariant="normal">O</mi>
          <mo stretchy="false">(</mo>
          <mn>1</mn>
          <mo stretchy="false">)</mo>
        </>
      )}
      <mo stretchy="false">]</mo>
    </math>
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
