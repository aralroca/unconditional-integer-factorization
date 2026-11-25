import { METHODS, type MethodId } from "@/lib/methods";

import styles from "./MethodSelect.module.css";

type MethodSelectProps = { value: MethodId; disabled: boolean; onChange: (method: MethodId) => void };

export function MethodSelect({ value, disabled, onChange }: MethodSelectProps) {
  return (
    <p className={styles.row}>
      <label>
        Method{" "}
        <select
          className={styles.select}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as MethodId)}
        >
          {METHODS.map((method) => (
            <option key={method.id} value={method.id}>
              {method.label}
            </option>
          ))}
        </select>
      </label>
    </p>
  );
}
