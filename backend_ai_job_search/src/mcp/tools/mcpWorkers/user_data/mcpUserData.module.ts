import { Module } from '@nestjs/common';
import { UserDataModule } from '@/entities/user_data/ud.module.js';
import { McpUserDataWorker } from './mcpUserData.service.js';
import { McpUserDataDocumentsWorker } from './mcpUserDataDocuments.service.js';
import { McpUserDataTemplatesWorker } from './mcpUserDataTemplates.service.js';

/**
 * Registers the user data tools. Importing `UserDataModule` gives the tools
 * access to `UserDataService`; the root `McpModule` discovers the decorated
 * methods.
 *
 * `McpUserDataWorker` exposes the generic per-field/batch tools for every
 * markdown document and the selection tool, `McpUserDataDocumentsWorker`
 * exposes dedicated tools for the CV templates, cover letter templates,
 * application forms and web research, and `McpUserDataTemplatesWorker`
 * exposes the read/replace tools for the `cv_template` and `cover_template`
 * columns.
 */
@Module({
  imports: [UserDataModule],
  providers: [
    McpUserDataWorker,
    McpUserDataDocumentsWorker,
    McpUserDataTemplatesWorker,
  ],
  exports: [
    McpUserDataWorker,
    McpUserDataDocumentsWorker,
    McpUserDataTemplatesWorker,
  ],
})
export class McpUserDataModule {}
