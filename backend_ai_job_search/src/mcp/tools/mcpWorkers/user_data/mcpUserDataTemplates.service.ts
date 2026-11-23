import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '@nestjs/mcp';
import { z } from 'zod';

import {
  type UserDataMutationResult,
  UserDataService,
} from '@/entities/user_data/ud.service.js';
import {
  type UserDataTemplateChange,
  type UserDataTemplateField,
  type UserDataTemplateState,
  toTemplateChange,
  toTemplateState,
} from './utils/user-data-templates.util.js';

const CONTEXT = 'McpUserDataTemplatesWorker';

/**
 * MCP tools for the two free-form template columns of a `user_data` row:
 * `cv_template` and `cover_template`.
 *
 * The tools only read and replace the stored template content. They can never
 * delete it: an empty or whitespace-only update is rejected by
 * `UserDataService`, so no tool clears a template and there is no delete tool.
 *
 * Every tool requires `user_id` (the UUID of the `user_data` record) and only
 * touches that row; reads use `UserDataService.findOneById`, updates use the
 * dedicated `UserDataService` setters, which keep validation and `@Measure`
 * tracking in one place.
 */

/** UUID of the selected user data record, required by every tool. */
const userIdSchema = z
  .uuid()
  .describe(
    'UUID of the user_data record (the selected user). All reads and writes are scoped to this record.',
  );

const getTemplateSchema = z.object({
  user_id: userIdSchema,
});

const updateTemplateSchema = (label: string) =>
  z.object({
    user_id: userIdSchema,
    content: z
      .string()
      .min(1)
      .describe(
        `Complete new content of the ${label}. It replaces the stored template; it is not appended. Empty or whitespace-only content is rejected, so the template cannot be deleted.`,
      ),
  });

type GetTemplateInput = z.infer<typeof getTemplateSchema>;
type UpdateTemplateInput = z.infer<ReturnType<typeof updateTemplateSchema>>;

type TemplateUpdateResult = UserDataMutationResult & UserDataTemplateChange;

/** Tool annotation sets shared by every read and every update below. */
const READ_ANNOTATIONS = { readOnlyHint: true, idempotentHint: true } as const;
const UPDATE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
} as const;

@Injectable()
export class McpUserDataTemplatesWorker {
  constructor(private readonly userDataService: UserDataService) {}

  // ------------------------------------------------------------------- read

  @Tool({
    name: 'user_data_get_cv_template',
    description:
      'Reads the CV / resume template content (cv_template) of the user data record selected by its UUID. The template can be read and replaced, never deleted.',
    inputSchema: getTemplateSchema,
    annotations: READ_ANNOTATIONS,
  })
  async userDataGetCvTemplate({
    user_id,
  }: GetTemplateInput): Promise<UserDataTemplateState> {
    Logger.log(`user_data_get_cv_template user=${user_id}`, CONTEXT);

    return this.readTemplate(user_id, 'cv_template');
  }

  @Tool({
    name: 'user_data_get_cover_template',
    description:
      'Reads the cover letter template content (cover_template) of the user data record selected by its UUID. The template can be read and replaced, never deleted.',
    inputSchema: getTemplateSchema,
    annotations: READ_ANNOTATIONS,
  })
  async userDataGetCoverTemplate({
    user_id,
  }: GetTemplateInput): Promise<UserDataTemplateState> {
    Logger.log(`user_data_get_cover_template user=${user_id}`, CONTEXT);

    return this.readTemplate(user_id, 'cover_template');
  }

  // ----------------------------------------------------------------- update

  @Tool({
    name: 'user_data_update_cv_template',
    description:
      'Replaces the CV / resume template content (cv_template) of the user data record selected by its UUID. The content replaces the stored template; it is not appended. Empty content is rejected. Other fields of the user are untouched.',
    inputSchema: updateTemplateSchema('CV / resume template'),
    annotations: UPDATE_ANNOTATIONS,
  })
  async userDataUpdateCvTemplate({
    user_id,
    content,
  }: UpdateTemplateInput): Promise<TemplateUpdateResult> {
    Logger.log(`user_data_update_cv_template user=${user_id}`, CONTEXT);

    const result = await this.userDataService.updateUserDataCvTemplate(
      user_id,
      content,
    );

    return { ...result, ...toTemplateChange('cv_template') };
  }

  @Tool({
    name: 'user_data_update_cover_template',
    description:
      'Replaces the cover letter template content (cover_template) of the user data record selected by its UUID. The content replaces the stored template; it is not appended. Empty content is rejected. Other fields of the user are untouched.',
    inputSchema: updateTemplateSchema('cover letter template'),
    annotations: UPDATE_ANNOTATIONS,
  })
  async userDataUpdateCoverTemplate({
    user_id,
    content,
  }: UpdateTemplateInput): Promise<TemplateUpdateResult> {
    Logger.log(`user_data_update_cover_template user=${user_id}`, CONTEXT);

    const result = await this.userDataService.updateUserDataCoverTemplate(
      user_id,
      content,
    );

    return { ...result, ...toTemplateChange('cover_template') };
  }

  // ---------------------------------------------------------------- helpers

  /** Reads one template of the selected user; fails if the UUID is unknown. */
  private async readTemplate(
    userId: string,
    field: UserDataTemplateField,
  ): Promise<UserDataTemplateState> {
    const userData = await this.userDataService.findOneById(userId);

    return toTemplateState(userData, field);
  }
}
