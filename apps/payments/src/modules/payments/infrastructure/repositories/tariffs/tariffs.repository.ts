import { Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { KYSELY_CLICKHOUSE } from '../../../../../database/database.constants.js';
import { Kysely } from 'kysely';
import {
  PaymentDatabase,
  TariffEntity,
} from '../../../../../database/types/payment-database.type.js';
import { ObjectResult } from '../../../../../core/object-result.js';

@Injectable()
export class TariffsRepository {
  constructor(
    @Inject(KYSELY_CLICKHOUSE)
    private readonly db: Kysely<PaymentDatabase>,
  ) {}

  async findTariffById(tariffId: string): Promise<TariffEntity> {
    const tariff = await this.db
      .selectFrom('tariffs')
      .selectAll()
      .where('id', '=', tariffId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    if (!tariff) {
      throw new RpcException(
        ObjectResult.failure({
          code: 'TARIFF_NOT_FOUND',
          errors: [
            {
              field: 'tariffId',
              message: `Tariff with id '${tariffId}' was not found`,
            },
          ],
        }),
      );
    }

    return tariff;
  }
}
