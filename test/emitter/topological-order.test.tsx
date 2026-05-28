import { expect, it } from "vitest";
import { createEmitterTestRunner } from "../utils.jsx";

/**
 * Regression test for https://github.com/bterlson/typespec-zod/issues/22.
 *
 * Asserts that every `export const X = ...;` block in the emitted output
 * appears AFTER all the consts it references. The fixture is large enough
 * (and structured similarly to real-world specs with multi-level deps and
 * extensible-enum-style wrappers) that the previous incremental-add path
 * through SCCSet produced an invalid order; the batch addAll path does not.
 */
it("emits declarations in valid topological order across many models", async () => {
  const runner = await createEmitterTestRunner();
  await runner.compile(`
    model SubmissionRequest {
      package: AppPackage;
      household: Household;
      form: FormResponse;
    }

    model AppPackage {
      programs: Program[];
      jurisdiction: Jurisdiction;
    }

    model Household {
      members: Person[];
      addresses: Address[];
      relationships: Relationship[];
    }

    model FormResponse {
      values: FormValue[];
    }

    model Program {
      id: ProgramId;
      level: JurisdictionLevel;
    }

    model Jurisdiction {
      id: JurisdictionId;
      level: JurisdictionLevel;
    }

    model Person {
      profile: Profile;
      contact: Contact;
    }

    model Address {
      kind: AddressKind;
      country: string;
    }

    model Relationship {
      kind: RelationshipKind;
      from: PersonRef;
      to: PersonRef;
    }

    model FormValue {
      kind: FieldKind;
      value: string;
    }

    model Profile {
      kind: ProfileKind;
    }

    model Contact {
      kind: ContactKind;
      value: string;
    }

    model ProgramId { value: string; }
    model JurisdictionId { value: string; }
    model PersonRef { id: string; }

    enum JurisdictionLevel { federal, state, county, city }
    enum AddressKind { home, work, mailing, other }
    enum RelationshipKind { spouse, child, parent, sibling, other }
    enum FieldKind { string, number, boolean, date }
    enum ProfileKind { adult, minor, dependent }
    enum ContactKind { email, phone, other }
  `);

  const { text } = await runner.program.host.readFile("typespec-zod/models.ts");

  // Parse `export const NAME = ...` blocks
  const parts = text.split(/\nexport const /).slice(1);
  const blocks = parts.map((p) => ({ name: p.match(/^(\w+)/)![1], body: p }));
  const names = blocks.map((b) => b.name);
  const orderIndex = new Map(names.map((n, i) => [n, i]));

  // For each block, find which other declared names it references (as values,
  // not as property keys), and assert each dep comes before it in the output.
  const violations: string[] = [];
  for (const block of blocks) {
    for (const otherName of names) {
      if (otherName === block.name) continue;
      // Match the name as a value (not a property key followed by `:`)
      const refPattern = new RegExp("\\b" + otherName + "\\b(?!\\s*:)");
      if (refPattern.test(block.body)) {
        const depIdx = orderIndex.get(otherName)!;
        const ownIdx = orderIndex.get(block.name)!;
        if (depIdx > ownIdx) {
          violations.push(`${otherName} (dep) emitted AFTER ${block.name}`);
        }
      }
    }
  }

  expect(violations).toEqual([]);
});
