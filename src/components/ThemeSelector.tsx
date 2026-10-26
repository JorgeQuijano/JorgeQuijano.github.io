import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";
import type { ThemeChoice } from "../lib/types";

const OPTIONS: Array<{
  value: ThemeChoice;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
];

export default function ThemeSelector() {
  const { choice, setChoice } = useTheme();

  return (
    <div className="segmented" role="group" aria-label="Color theme">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={`${option.label} theme`}
            aria-pressed={active}
            title={`${option.label} theme`}
            data-active={active}
            onClick={() => setChoice(option.value)}
          >
            <Icon size={12} strokeWidth={1.8} />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
