import { logger } from "@/core/logger";

/**
 * A single step in a workflow. `run` performs the work; the
 * optional `compensate` undoes it if a later step fails.
 */
export interface WorkflowStep<TContext> {
  name: string;
  run: (context: TContext) => Promise<void>;
  compensate?: (context: TContext) => Promise<void>;
}

export interface WorkflowResult {
  ok: boolean;
  /** Names of the steps that ran successfully. */
  completedSteps: string[];
  /** Set when the workflow failed. */
  error?: string;
}

/**
 * Run a sequence of steps as a workflow.
 *
 * Steps share a mutable `context` object: each reads what earlier
 * steps put there and adds its own results. If a step throws, the
 * already-completed steps are compensated in reverse order, then
 * the workflow returns `ok: false`.
 *
 * A deliberately small take on the pattern Medusa popularised: no
 * durable persistence and no retries, just ordered steps with
 * compensation.
 */
export async function runWorkflow<TContext>(
  name: string,
  context: TContext,
  steps: WorkflowStep<TContext>[],
): Promise<WorkflowResult> {
  const completed: WorkflowStep<TContext>[] = [];
  try {
    for (const step of steps) {
      await step.run(context);
      completed.push(step);
    }
    return { ok: true, completedSteps: completed.map((s) => s.name) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Workflow failed, compensating", {
      workflow: name,
      completedSteps: completed.map((s) => s.name),
      error: message,
    });
    for (const step of [...completed].reverse()) {
      if (!step.compensate) continue;
      try {
        await step.compensate(context);
      } catch (compensationError) {
        logger.error("Workflow compensation step failed", {
          workflow: name,
          step: step.name,
          error:
            compensationError instanceof Error
              ? compensationError.message
              : String(compensationError),
        });
      }
    }
    return {
      ok: false,
      completedSteps: completed.map((s) => s.name),
      error: message,
    };
  }
}
