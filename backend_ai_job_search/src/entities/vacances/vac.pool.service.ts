import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { VacancyEntity } from './vac.entity.js';
import { UserDataEntity } from '../user_data/ud.entity.js';
import { Measure } from '@/common/services/index.js';
import { assertValidUuid } from './utils/vac-validation.util.js';
import {
  collectMissingCreateFields,
  resolvePoolLimit,
} from './utils/vac-pool.util.js';
import type { PoolVacanciesDto, PoolVacancyItemDto } from './dto/pool-vacancies.dto.js';

/** Result of a `pull` call: the batch of postings retrieved from the pool. */
export type PoolPullResult = {
  success: true;
  action: 'pull';
  message: string;
  uid: string;
  limit: number;
  count: number;
  items: VacancyEntity[];
};

/** Result of a `push` call: which postings were created and which updated. */
export type PoolPushResult = {
  success: true;
  action: 'push';
  message: string;
  uid: string;
  limit: number;
  count: number;
  created_ids: number[];
  updated_ids: number[];
};

export type VacancyPoolResult = PoolPullResult | PoolPushResult;

/**
 * Single entry point for moving job postings in batches.
 *
 * The pool groups postings in fixed-size batches so a client never has to
 * call the single-vacancy endpoints in a loop:
 * - `pull` returns up to `limit` postings that belong to the user;
 * - `push` uploads up to `limit` postings in one transaction, creating new
 *   ones and updating the ones submitted with an `id`.
 */
@Injectable()
export class VacancyPoolService {
  constructor(private readonly dataSource: DataSource) {}

  @Measure('VacancyPoolService')
  async runPoolBatch(dto: PoolVacanciesDto): Promise<VacancyPoolResult> {
    assertValidUuid(dto.uid, 'uid');

    const uid = dto.uid.trim();
    const limit = resolvePoolLimit(dto.limit);

    if (dto.action === 'pull') {
      if (dto.items !== undefined) {
        throw new BadRequestException(
          'items is only allowed when action is push',
        );
      }

      return this.pull(uid, limit);
    }

    return this.push(uid, limit, dto.items ?? []);
  }

  // ------------------------------------------------------------------ pull

  /** Retrieves the next batch of postings owned by the user. */
  private async pull(uid: string, limit: number): Promise<PoolPullResult> {
    const items = await this.dataSource.getRepository(VacancyEntity).find({
      where: { uid },
      order: { id: 'ASC' },
      take: limit,
    });

    Logger.log(
      `pull uid=${uid} limit=${limit} count=${items.length}`,
      'VacancyPoolService',
    );

    return {
      success: true,
      action: 'pull',
      message:
        items.length === 0
          ? 'No vacancies found in the pool'
          : 'Vacancies successfully retrieved from the pool',
      uid,
      limit,
      count: items.length,
      items,
    };
  }

  // ------------------------------------------------------------------ push

  /**
   * Uploads a batch inside one transaction: items without an `id` are created,
   * items with an `id` update the existing posting. Any invalid item rolls the
   * whole batch back, so a pool request never leaves partial results behind.
   */
  private async push(
    uid: string,
    limit: number,
    items: PoolVacancyItemDto[],
  ): Promise<PoolPushResult> {
    if (items.length === 0) {
      throw new BadRequestException(
        'items must contain at least one vacancy when action is push',
      );
    }

    if (items.length > limit) {
      throw new BadRequestException(
        `items must contain at most ${limit} vacancies for this request`,
      );
    }

    this.assertNoDuplicateIds(items);

    const { createdIds, updatedIds } = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        const repo = manager.getRepository(VacancyEntity);
        const created: number[] = [];
        const updated: number[] = [];

        if (items.some((item) => item.id === undefined)) {
          await this.assertUserExists(manager, uid);
        }

        for (const [index, item] of items.entries()) {
          const { id, ...patch } = item;

          if (id === undefined) {
            created.push(
              await this.createFromPoolItem(manager, uid, index, item),
            );
            continue;
          }

          await this.updateFromPoolItem(repo, uid, index, id, patch);

          updated.push(id);
        }

        return { createdIds: created, updatedIds: updated };
      },
    );

    Logger.log(
      `push uid=${uid} limit=${limit} created=${createdIds.length} updated=${updatedIds.length}`,
      'VacancyPoolService',
    );

    return {
      success: true,
      action: 'push',
      message: 'Vacancies successfully submitted to the pool',
      uid,
      limit,
      count: createdIds.length + updatedIds.length,
      created_ids: createdIds,
      updated_ids: updatedIds,
    };
  }

  /** Persists a new posting that arrives through push. */
  private async createFromPoolItem(
    manager: EntityManager,
    uid: string,
    index: number,
    item: PoolVacancyItemDto,
  ): Promise<number> {
    const missing = collectMissingCreateFields(item);

    if (missing.length > 0) {
      throw new BadRequestException(
        `items[${index}] is missing required fields: ${missing.join(', ')}`,
      );
    }

    const repo = manager.getRepository(VacancyEntity);

    const entity = repo.create({
      ...(item as Partial<VacancyEntity>),
      uid,
    });

    const saved = await repo.save(entity);

    return saved.id;
  }

  /** Applies an item to an existing posting, scoped to its owner. */
  private async updateFromPoolItem(
    repo: Repository<VacancyEntity>,
    uid: string,
    index: number,
    id: number,
    patch: Partial<VacancyEntity>,
  ): Promise<void> {
    const vacancy = await repo.findOneBy({ id, uid });

    if (!vacancy) {
      throw new NotFoundException(
        `items[${index}]: vacancy with id ${id} not found for user ${uid}`,
      );
    }

    const merged = repo.merge(vacancy, patch as Partial<VacancyEntity>);

    await repo.save(merged);

    Logger.log(`push update id=${id} uid=${uid}`, 'VacancyPoolService');
  }

  // --------------------------------------------------------------- helpers

  /** A batch can only address each vacancy once, otherwise updates collide. */
  private assertNoDuplicateIds(items: PoolVacancyItemDto[]): void {
    const ids = items
      .map((item) => item.id)
      .filter((id): id is number => id !== undefined);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('items must not contain duplicate ids');
    }
  }

  /** Mirrors the owner check of the single-vacancy create endpoint. */
  private async assertUserExists(
    manager: EntityManager,
    uid: string,
  ): Promise<void> {
    const user = await manager
      .getRepository(UserDataEntity)
      .findOneBy({ id: uid });

    if (!user) {
      throw new BadRequestException(
        `uid ${uid} does not reference an existing user`,
      );
    }
  }
}
