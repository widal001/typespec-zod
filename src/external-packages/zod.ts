import type { SymbolCreator } from "@alloy-js/core";
import { createPackage, type ExternalPackage } from "@alloy-js/typescript";

// The explicit `ReturnType` annotation plus the imports of `SymbolCreator`
// and `ExternalPackage` keep the declaration emit from referring to the
// pnpm-temp install path of @alloy-js/core (TS2742). The annotation is
// otherwise equivalent to the inferred type, including the literal
// "z" named export so consumers still get `zod.z` typed precisely.
type ZodPackage = ReturnType<
  typeof createPackage<{ ".": { named: ["z"] } }>
>;

export const zod: ZodPackage & SymbolCreator & ExternalPackage = createPackage({
  name: "zod",
  version: "^3.23.0",
  descriptor: {
    ".": {
      named: ["z"],
    },
  },
});
