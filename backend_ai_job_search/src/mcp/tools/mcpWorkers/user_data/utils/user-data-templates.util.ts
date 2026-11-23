import { BadRequestException } from '@nestjs/common';
import type { UserDataEntity } from '@/entities/user_data/ud.entity.js';

/**
 * Free-form template columns stored on a user data record.
 *
 * They hold the template content itself (not a URL). MCP may read and replace
 * them, but never delete them: updates reject empty content, so a stored
 * template can never be cleared.
 */
export const USER_DATA_TEMPLATE_FIELDS = [
  'cv_template',
  'cover_template',
] as const;

export type UserDataTemplateField = (typeof USER_DATA_TEMPLATE_FIELDS)[number];

/** Static description of one template column. */
export type UserDataTemplateMeta = {
  field: UserDataTemplateField;
  label: string;
  description: string;
};

/** Current value of one template for a selected user. */
export type UserDataTemplateState = {
  field: UserDataTemplateField;
  label: string;
  value: string;
  is_empty: boolean;
};

/** Describes a template written by an update tool. */
export type UserDataTemplateChange = {
  field: UserDataTemplateField;
  label: string;
  updated: true;
};

const USER_DATA_TEMPLATES: Record<UserDataTemplateField, UserDataTemplateMeta> =
  {
    cv_template: {
      field: 'cv_template',
      label: 'CV / resume template',
      description: 'CV / resume template content (column cv_template)',
    },
    cover_template: {
      field: 'cover_template',
      label: 'Cover letter template',
      description: 'Cover letter template content (column cover_template)',
    },
  };

/** Returns the metadata of one template field. */
export function getTemplate(field: UserDataTemplateField): UserDataTemplateMeta {
  const template = USER_DATA_TEMPLATES[field];

  if (!template) {
    throw new BadRequestException(`Unknown template field: ${field}`);
  }

  return template;
}

/** Maps a stored user data record to the MCP response shape of one template. */
export function toTemplateState(
  userData: Pick<UserDataEntity, UserDataTemplateField>,
  field: UserDataTemplateField,
): UserDataTemplateState {
  const template = getTemplate(field);
  const value = userData[field] ?? '';

  return {
    field: template.field,
    label: template.label,
    value,
    is_empty: value.trim().length === 0,
  };
}

/** Maps a written template to the MCP response shape of an update. */
export function toTemplateChange(
  field: UserDataTemplateField,
): UserDataTemplateChange {
  const template = getTemplate(field);

  return {
    field: template.field,
    label: template.label,
    updated: true,
  };
}
