import { describe, expect, it } from "vitest";
import { runWorkflow, type WorkflowStep } from "@/core/workflow";

interface Ctx {
  log: string[];
}

describe("runWorkflow", () => {
  it("runs every step in order on success", async () => {
    const ctx: Ctx = { log: [] };
    const steps: WorkflowStep<Ctx>[] = [
      { name: "a", run: async (c) => void c.log.push("a") },
      { name: "b", run: async (c) => void c.log.push("b") },
    ];

    const result = await runWorkflow("test", ctx, steps);

    expect(result.ok).toBe(true);
    expect(result.completedSteps).toEqual(["a", "b"]);
    expect(ctx.log).toEqual(["a", "b"]);
  });

  it("compensates completed steps in reverse order on failure", async () => {
    const ctx: Ctx = { log: [] };
    const steps: WorkflowStep<Ctx>[] = [
      {
        name: "a",
        run: async (c) => void c.log.push("run-a"),
        compensate: async (c) => void c.log.push("comp-a"),
      },
      {
        name: "b",
        run: async (c) => void c.log.push("run-b"),
        compensate: async (c) => void c.log.push("comp-b"),
      },
      {
        name: "c",
        run: async () => {
          throw new Error("boom");
        },
        compensate: async (c) => void c.log.push("comp-c"),
      },
    ];

    const result = await runWorkflow("test", ctx, steps);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("boom");
    expect(result.completedSteps).toEqual(["a", "b"]);
    // c never completed, so it is not compensated; a and b unwind in reverse.
    expect(ctx.log).toEqual(["run-a", "run-b", "comp-b", "comp-a"]);
  });

  it("swallows a failing compensation and still unwinds the rest", async () => {
    const ctx: Ctx = { log: [] };
    const steps: WorkflowStep<Ctx>[] = [
      {
        name: "a",
        run: async (c) => void c.log.push("run-a"),
        compensate: async (c) => void c.log.push("comp-a"),
      },
      {
        name: "b",
        run: async (c) => void c.log.push("run-b"),
        compensate: async () => {
          throw new Error("compensation failed");
        },
      },
      {
        name: "c",
        run: async () => {
          throw new Error("boom");
        },
      },
    ];

    const result = await runWorkflow("test", ctx, steps);

    expect(result.ok).toBe(false);
    // b's compensation throws but is swallowed; a still compensates.
    expect(ctx.log).toEqual(["run-a", "run-b", "comp-a"]);
  });

  it("handles a completed step that has no compensation", async () => {
    const ctx: Ctx = { log: [] };
    const steps: WorkflowStep<Ctx>[] = [
      { name: "a", run: async (c) => void c.log.push("a") },
      {
        name: "b",
        run: async () => {
          throw new Error("x");
        },
      },
    ];

    const result = await runWorkflow("test", ctx, steps);

    expect(result.ok).toBe(false);
    expect(result.completedSteps).toEqual(["a"]);
  });
});
