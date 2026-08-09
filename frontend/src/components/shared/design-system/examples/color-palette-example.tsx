import { designSystemColorTokens } from "../data/color-tokens";
import { DesignSystemColorSwatch } from "./color-swatch";

export function ColorPaletteExample() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {designSystemColorTokens.map((token) => (
        <DesignSystemColorSwatch
          key={token.name}
          name={token.name}
          value={token.value}
        />
      ))}
    </div>
  );
}
