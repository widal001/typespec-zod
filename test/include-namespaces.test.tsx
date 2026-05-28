import { describe, expect, it } from "vitest";
import {
  isAncestorOfNamespaceInclude,
  matchesNamespaceInclude,
} from "../src/utils.jsx";
import { createEmitterTestRunner } from "./utils.jsx";

describe("matchesNamespaceInclude", () => {
  it("matches an exact namespace name", () => {
    expect(matchesNamespaceInclude("MyOrg.Core", ["MyOrg.Core"])).toBe(true);
  });

  it("matches sub-namespaces by dotted prefix", () => {
    expect(matchesNamespaceInclude("MyOrg.Core.Models", ["MyOrg.Core"])).toBe(
      true,
    );
    expect(
      matchesNamespaceInclude("MyOrg.Core.Models.Foo", ["MyOrg.Core"]),
    ).toBe(true);
  });

  it("does not match names that share a prefix but aren't sub-namespaces", () => {
    // MyOrg.CoreExtra is not a sub-namespace of MyOrg.Core
    expect(matchesNamespaceInclude("MyOrg.CoreExtra", ["MyOrg.Core"])).toBe(
      false,
    );
    expect(matchesNamespaceInclude("MyOrgCore", ["MyOrg.Core"])).toBe(false);
  });

  it("does not match unrelated namespaces", () => {
    expect(matchesNamespaceInclude("OtherOrg.Foo", ["MyOrg.Core"])).toBe(false);
  });

  it("returns false for an empty include list", () => {
    expect(matchesNamespaceInclude("MyOrg.Core", [])).toBe(false);
  });

  it("matches against any entry in the include list", () => {
    expect(
      matchesNamespaceInclude("OtherOrg.Foo", ["MyOrg.Core", "OtherOrg"]),
    ).toBe(true);
  });
});

describe("isAncestorOfNamespaceInclude", () => {
  it("matches when the namespace is a parent of an include entry", () => {
    expect(
      isAncestorOfNamespaceInclude("MyOrg", ["MyOrg.Core.Models"]),
    ).toBe(true);
    expect(
      isAncestorOfNamespaceInclude("MyOrg.Core", ["MyOrg.Core.Models"]),
    ).toBe(true);
  });

  it("does not match the exact name (that case is handled by the include predicate)", () => {
    expect(isAncestorOfNamespaceInclude("MyOrg.Core", ["MyOrg.Core"])).toBe(
      false,
    );
  });

  it("does not match a descendant (children are handled by the include predicate)", () => {
    expect(
      isAncestorOfNamespaceInclude("MyOrg.Core.Models.Foo", ["MyOrg.Core"]),
    ).toBe(false);
  });

  it("does not match unrelated or shared-prefix names", () => {
    expect(isAncestorOfNamespaceInclude("OtherOrg", ["MyOrg.Core"])).toBe(
      false,
    );
    // MyOrgCore is not an ancestor of MyOrg.Core
    expect(isAncestorOfNamespaceInclude("MyOrgCore", ["MyOrg.Core"])).toBe(
      false,
    );
  });

  it("returns false for an empty include list", () => {
    expect(isAncestorOfNamespaceInclude("MyOrg", [])).toBe(false);
  });
});

describe("include-namespaces emitter option", () => {
  it("accepts the option without errors and still emits user-defined types", async () => {
    // End-to-end smoke test: the option is wired through and does not affect
    // emission of user-defined types. Verifying the inclusion of library types
    // requires a non-TypeSpec library fixture and is covered by integration
    // tests in downstream consumers.
    const runner = await createEmitterTestRunner({
      "include-namespaces": ["NonExistentLib"],
    });
    await runner.compile(`
      model UserModel {
        id: string;
        name: string;
      }
    `);

    const { text } = await runner.program.host.readFile(
      "typespec-zod/models.ts",
    );

    expect(text).toContain("export const userModel");
  });
});
