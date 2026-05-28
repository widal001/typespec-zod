import {
  createTypeSpecLibrary,
  JSONSchemaType,
} from "@typespec/compiler";

export interface ZodEmitterOptions {
  /**
   * Namespaces to emit types from in addition to user-defined namespaces.
   *
   * By default the emitter only emits types from namespaces in the current
   * compilation. Set this option to also emit types from imported library
   * namespaces, e.g. `["MyOrg.Core"]`. Sub-namespaces are included automatically
   * (e.g. `"MyOrg.Core"` also covers `"MyOrg.Core.Models"`).
   */
  "include-namespaces"?: string[];
}

const EmitterOptionsSchema: JSONSchemaType<ZodEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "include-namespaces": {
      type: "array",
      items: { type: "string" },
      nullable: true,
      description:
        "Namespaces to emit types from in addition to user-defined namespaces. Sub-namespaces are included automatically.",
    },
  },
  required: [],
};

export const $lib = createTypeSpecLibrary({
  name: "efv2-zod-sketch",
  diagnostics: {},
  emitter: {
    options: EmitterOptionsSchema,
  },
});

export const { reportDiagnostic, createDiagnostic } = $lib;
