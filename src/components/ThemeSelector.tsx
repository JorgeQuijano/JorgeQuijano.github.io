import { useTheme } from "../lib/theme";
import type { ThemeChoice } from "../lib/types";

const OPTIONS: Array<{
  value: ThemeChoice;
  label: string;
  full: string;
}> = [
  { value: "system", label: "sys", full: "System" },
  { value: "dark", label: "term", full: "Terminal" },
  { value: "light", label: "paper", full: "Paper" },
];

export default function ThemeSelector() {
  const { choice, setChoice } = useTheme();

  return (
    <div className="segmented" role="group" aria-label="Color theme">
      {OPTIONS.map((option) => {
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={`${option.full} theme`}
            aria-pressed={active}
            title={`${option.full} theme`}
            data-active={active}
            onClick={() => setChoice(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
