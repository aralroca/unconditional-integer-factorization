const SAMPLES = [
  { label: "2^67 − 1", value: "147573952589676412927" },
  { label: "a 39-digit semiprime", value: "300000000000000438880000000000084056037" },
  { label: "600851475143", value: "600851475143" },
];

type SamplesProps = { disabled: boolean; onPick: (value: string) => void };

export function Samples({ disabled, onPick }: SamplesProps) {
  return (
    <p className="samples">
      Try:
      {SAMPLES.map(({ label, value }) => (
        <button key={value} type="button" className="sample" disabled={disabled} onClick={() => onPick(value)}>
          {label}
        </button>
      ))}
    </p>
  );
}
