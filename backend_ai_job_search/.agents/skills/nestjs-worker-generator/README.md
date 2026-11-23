# NestJS Worker Generator Skill

Install this skill in an OpenCode project at:

`.opencode/skills/nestjs-worker-generator/SKILL.md`

The skill creates a NestJS worker, registers it in `worker.module.ts`, exports it from `src/common/workers/index.ts`, and registers its task handler in `src/common/services/task_orchestrator/worker_reg.service.ts`.

It inspects existing project conventions before editing and runs available verification commands.
