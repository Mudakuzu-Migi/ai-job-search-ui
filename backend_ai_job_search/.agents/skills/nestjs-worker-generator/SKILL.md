---
name: nestjs-worker-generator
description: Create a NestJS worker, register it in WorkerModule, export it from the workers barrel, and register its task handler in the task orchestrator.
---

# NestJS Worker Generator

## Purpose

Use this skill whenever the user asks to create, scaffold, or add a NestJS worker.

Expected project structure:

```text
src/
└── common/
    ├── workers/
    │   ├── <worker_plural>/
    │   │   └── <worker_name>.worker.ts
    │   ├── worker.module.ts
    │   └── index.ts
    └── services/
        └── task_orchestrator/
            └── worker_reg.service.ts
```

The exact project layout may vary. Inspect the repository and follow its established conventions rather than forcing a structure that conflicts with the project.

A complete worker addition includes all four steps:
1. Create the worker implementation.
2. Register the worker in `worker.module.ts`.
3. Export the worker from `src/common/workers/index.ts`.
4. Register the worker's task handler in `src/common/services/task_orchestrator/worker_reg.service.ts`.

Do not consider the task complete until all applicable registrations are done.

## Mandatory workflow

### 1. Inspect the project before editing

Read and inspect:

- `package.json` and NestJS/TypeScript configuration.
- `src/common/workers/`, including `worker.module.ts` and `index.ts`.
- At least one existing worker implementation.
- `src/common/services/task_orchestrator/worker_reg.service.ts`.
- The task orchestrator module and related services, if needed to understand dependency injection.
- Existing naming, import, logging, error-handling, and task-registration conventions.

Use the installed NestJS version and existing project patterns. Do not assume APIs or invent project-specific dependencies.

### 2. Resolve the worker name, folder, and task key

Convert the requested worker name to:
- A plural kebab-case folder name: `<worker_plural>/`.
- A kebab-case filename: `<worker_name>.worker.ts`.
- A PascalCase class name ending in `Worker`.
- A task registration key: use the exact key supplied by the user. If none is supplied, derive a clear `snake_case` key from the worker's purpose and ensure it does not conflict with an existing registration.

Example:

```text
src/common/workers/
├── vacancy_processings/
│   └── vacancy_processing.worker.ts
├── worker.module.ts
└── index.ts
```

Example class: `VacancyProcessingWorker`.

Use explicitly supplied names and task keys when they differ from inferred names. Search for existing workers and task keys before creating anything. Do not create duplicate workers or registrations.

### 3. Implement the worker

Use this implementation shape as a baseline, adapting it to the repository's actual conventions:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class ExampleWorker {
  private readonly logger = new Logger(ExampleWorker.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  async test(taskId: string): Promise<void> {
    // TODO: implement the requested task logic.
  }
}
```

Rules:

- Keep `ModuleRef` only when the requested behavior or existing project conventions need runtime provider resolution. If it is not needed, do not add it merely for decoration.
- Import `spawn` from `child_process` only when the worker actually needs to start a child process. Do not include unused imports.
- Use explicit parameter and return types.
- Use `Logger` from `@nestjs/common` unless the project has an established logger abstraction.
- Do not invent business logic. If the user has not specified behavior, create a minimal scaffold with a clear TODO.
- Do not silently swallow errors. Log useful task context and rethrow or propagate errors according to existing worker conventions.
- Avoid logging secrets, credentials, tokens, or sensitive payloads.
- Do not add dependencies unless required and approved by the user.
- Keep the worker focused on orchestration. Put domain logic in existing services where appropriate.

### 4. Register the worker in `worker.module.ts`

Inspect the current module before editing.

- Add the worker to the module's `providers`.
- Add it to `exports` if consumers outside this module need to inject it or if the project convention exports all workers.
- Preserve existing imports, providers, exports, and module metadata.
- Do not replace the module with a minimal version that drops existing registrations.
- If the module does not exist, create a valid NestJS module consistent with the project's module style.

Example only:

```ts
import { Module } from '@nestjs/common';
import { ExampleWorker } from './example_workers/example.worker';

@Module({
  providers: [ExampleWorker],
  exports: [ExampleWorker],
})
export class WorkerModule {}
```

Adapt the import path and preserve all existing entries.

### 5. Export the worker from `src/common/workers/index.ts`

Inspect the existing barrel file.

Add a named export for the worker using the project's established export style, for example:

```ts
export * from './example_workers/example.worker';
```

Preserve all existing exports and avoid duplicate exports. If `index.ts` does not exist, create it and export the new worker.

### 6. Register the worker in `worker_reg.service.ts`

The worker must also be registered with the task orchestrator at:

`src/common/services/task_orchestrator/worker_reg.service.ts`

Inspect the file and its surrounding module before editing. Follow the existing `register()` API and preserve all existing task registrations.

The expected registration pattern is:

```ts
constructor(private readonly workers: Workers) {
  this.register('vacancy_processing', (taskId: string) =>
    this.workers.test(taskId),
  );
}
```

For the new worker:

- Inject the `Workers` provider (or the actual worker class used by the repository) into the existing constructor.
- Add an import from the workers barrel or the established import path.
- Add a `this.register('<task_key>', (taskId: string) => this.workers.<method>(taskId))` registration using the actual worker method and task key.
- Use the exact task key supplied by the user. If not supplied, derive one from the task purpose and check for collisions.
- If the constructor already has dependencies, add the worker dependency without removing or reordering unrelated dependencies unnecessarily.
- If the class is already injected, do not inject it a second time.
- If the registration is already present, update it only when required; do not create duplicates.
- Do not change the `register()` implementation or task dispatch behavior unless explicitly requested.
- Ensure the worker is available through the appropriate NestJS module imports/exports so dependency injection can resolve it.
- Do not register the worker only in `worker.module.ts`: module provider registration and task-handler registration are separate required steps.

Example with a named worker:

```ts
import { VacancyProcessingWorker } from '../../workers';

@Injectable()
export class WorkerRegService {
  constructor(private readonly vacancyProcessingWorker: VacancyProcessingWorker) {
    this.register('vacancy_processing', (taskId: string) =>
      this.vacancyProcessingWorker.test(taskId),
    );
  }
}
```

This is illustrative. If the repository uses a shared `Workers` facade, follow that actual pattern instead. For example, when the existing service injects `Workers`, add the new method registration through that same facade:

```ts
constructor(private readonly workers: Workers) {
  this.register('vacancy_processing', (taskId: string) =>
    this.workers.test(taskId),
  );
}
```

Do not assume the facade shape: inspect its real implementation and add the new worker method/property consistently.

### 7. Verify the result

After editing:

1. Confirm the worker file exists at the intended path.
2. Confirm the class is decorated with `@Injectable()`.
3. Confirm `worker.module.ts` registers the worker.
4. Confirm `src/common/workers/index.ts` exports the worker.
5. Confirm `worker_reg.service.ts` imports/injects the correct provider and registers the task key to the correct worker method.
6. Confirm the task key is unique and matches the intended task type.
7. Check NestJS module wiring so dependency injection can resolve the worker.
8. Check imports and ensure there are no unused imports.
9. Run the repository's relevant checks, preferring existing scripts:
   - build / typecheck
   - lint
   - focused tests, if present
10. If a check fails, determine whether the failure was introduced by this change. Fix introduced failures; report unrelated pre-existing failures clearly.
11. Do not claim checks passed unless they were actually run successfully.

## Handling ambiguity

Ask one concise clarification only if a required detail cannot reasonably be inferred, such as:
- The worker's intended name when no name is provided.
- The required behavior when the user explicitly requests a functional implementation but gives no task description.
- The task registration key when it cannot be safely derived.
- Which of multiple existing worker modules or orchestrators is the target.

If the user asks only to scaffold a worker and does not describe its logic, do not block on clarification: generate the minimal scaffold and leave a clear TODO. If the task key can be reasonably derived, use it and state the assumption.

## Completion report

When finished, report:
- Created or modified file paths.
- Worker class name and task key.
- `worker.module.ts` registration status.
- `index.ts` export status.
- `worker_reg.service.ts` task registration status.
- Build/lint/test results, including commands actually run.
- Any TODOs or assumptions.

Do not report a file as created, registered, exported, or verified unless it is true.
