import * as ay from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import {
  EmitContext,
  getNamespaceFullName,
  ListenerFlow,
  Namespace,
  navigateProgram,
  Program,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { Output, writeOutput } from "@typespec/emitter-framework";
import { ZodSchemaDeclaration } from "./components/ZodSchemaDeclaration.jsx";
import { zod } from "./external-packages/zod.js";
import { ZodEmitterOptions } from "./lib.js";
import {
  isAncestorOfNamespaceInclude,
  matchesNamespaceInclude,
  newTopologicalTypeCollector,
} from "./utils.jsx";

export async function $onEmit(context: EmitContext<ZodEmitterOptions>) {
  const types = getAllDataTypes(context.program, context.options);
  const tsNamePolicy = ts.createTSNamePolicy();

  writeOutput(
    context.program,
    <Output
      program={context.program}
      namePolicy={tsNamePolicy}
      externals={[zod]}
    >
      <ts.SourceFile path="models.ts">
        <ay.For
          each={types}
          ender={";"}
          joiner={
            <>
              ;
              <hbr />
              <hbr />
            </>
          }
        >
          {(type) => <ZodSchemaDeclaration type={type} export />}
        </ay.For>
      </ts.SourceFile>
    </Output>,
    context.emitterOutputDir,
  );
}

/**
 * Collects all the models defined in the spec and returns them in topologically sorted order.
 * Types are ordered such that dependencies appear before the types that depend on them.
 *
 * By default only user-defined namespaces are recursed into. The `include-namespaces`
 * emitter option adds library namespaces to the inclusion set so types from imported
 * libraries can be emitted alongside user-defined ones.
 *
 * @returns A topologically sorted collection of all defined models in the spec
 */
function getAllDataTypes(program: Program, options: ZodEmitterOptions) {
  const collector = newTopologicalTypeCollector(program);
  const globalNs = program.getGlobalNamespaceType();
  const includeNamespaces = options["include-namespaces"] ?? [];
  const shouldRecurseIntoLibraryNamespace = (n: Namespace): boolean => {
    if (includeNamespaces.length === 0) return false;
    const fullName = getNamespaceFullName(n);
    // Recurse if `n` itself is included (exact or sub-namespace) OR if it
    // is an ancestor of an included name and we need to drill through it
    // to reach the target.
    return (
      matchesNamespaceInclude(fullName, includeNamespaces) ||
      isAncestorOfNamespaceInclude(fullName, includeNamespaces)
    );
  };

  navigateProgram(
    program,
    {
      namespace(n) {
        if (n === globalNs) return;
        if ($(program).type.isUserDefined(n)) return;
        if (shouldRecurseIntoLibraryNamespace(n)) return;
        return ListenerFlow.NoRecursion;
      },
      model: collector.collectType,
      enum: collector.collectType,
      union: collector.collectType,
      scalar: collector.collectType,
    },
    { includeTemplateDeclaration: false },
  );

  return collector.types;
}
