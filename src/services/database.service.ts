import knex from "#postgres/knex.js";
import { TariffRecord } from "#types/tariff.types.js";
import log4js from "log4js";

const logger = log4js.getLogger("DatabaseService");

export class DatabaseService {
    /**
     * Insert or update tariff records in the database
     * @param {TariffRecord[]} records - Array of tariff records
     * @returns {Promise<void>}
     */
    async upsertTariffRecords(records: TariffRecord[]): Promise<void> {
        if (records.length === 0) {
            logger.warn('No records to upsert');
            return;
        }

        try {
            // Validate records before insertion
            const validRecords = records.filter(record => this.validateRecord(record));
            
            if (validRecords.length === 0) {
                logger.warn('No valid records to insert');
                return;
            }

            if (validRecords.length < records.length) {
                logger.warn(`Filtered out ${records.length - validRecords.length} invalid records`);
            }

            await knex.transaction(async (trx) => {
                for (const record of validRecords) {
                    await trx('wb_tariffs')
                        .insert(record)
                        .onConflict(['date', 'warehouse_name'])
                        .merge([
                            'pallet_delivery_expr',
                            'pallet_delivery_value_base',
                            'pallet_delivery_value_liter',
                            'pallet_storage_expr',
                            'pallet_storage_value_expr',
                            'dt_next_pallet',
                            'dt_till_max',
                            'updated_at'
                        ]);
                }
            });

            logger.info(`Successfully upserted ${validRecords.length} tariff records`);
        } catch (error) {
            logger.error('Failed to upsert tariff records:', error);
            throw error;
        }
    }

    /**
     * Validate a tariff record
     * @param {TariffRecord} record - Record to validate
     * @returns {boolean}
     */
    private validateRecord(record: TariffRecord): boolean {
        try {
            // Check required fields
            if (!record.date || !record.warehouse_name) {
                logger.warn('Record missing required fields:', { date: record.date, warehouse_name: record.warehouse_name });
                return false;
            }

            // Check for valid numeric values
            const numericFields = [
                'pallet_delivery_expr',
                'pallet_delivery_value_base',
                'pallet_delivery_value_liter',
                'pallet_storage_expr',
                'pallet_storage_value_expr'
            ];

            for (const field of numericFields) {
                const value = record[field as keyof TariffRecord];
                if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
                    logger.warn(`Record has invalid numeric value for ${field}:`, value);
                    return false;
                }
            }

            // Validate date format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(record.date)) {
                logger.warn('Invalid date format:', record.date);
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Error validating record:', error);
            return false;
        }
    }

    /**
     * Get latest tariff data, optionally filtered by date
     * @param {string} date - Optional date filter
     * @returns {Promise<TariffRecord[]>}
     */
    async getLatestTariffData(date?: string): Promise<TariffRecord[]> {
        try {
            let query = knex('wb_tariffs')
                .select('*')
                .orderBy('pallet_storage_value_expr', 'asc')
                .orderBy('warehouse_name', 'asc');

            if (date) {
                query = query.where('date', date);
            } else {
                // Get the most recent date
                const latestDate = await knex('wb_tariffs')
                    .max('date as max_date')
                    .first();
                
                if (latestDate?.max_date) {
                    query = query.where('date', latestDate.max_date);
                }
            }

            const records = await query;
            logger.info(`Retrieved ${records.length} tariff records${date ? ` for date ${date}` : ''}`);
            return records;
        } catch (error) {
            logger.error('Failed to get latest tariff data:', error);
            throw error;
        }
    }

    /**
     * Get statistics about stored data
     * @returns {Promise<any>}
     */
    async getDataStatistics(): Promise<any> {
        try {
            const [totalRecords, latestDate, warehouseCount] = await Promise.all([
                knex('wb_tariffs').count('* as count').first(),
                knex('wb_tariffs').max('date as max_date').first(),
                knex('wb_tariffs').countDistinct('warehouse_name as count').first()
            ]);

            return {
                totalRecords: totalRecords?.count || 0,
                latestDate: latestDate?.max_date || null,
                warehouseCount: warehouseCount?.count || 0
            };
        } catch (error) {
            logger.error('Failed to get data statistics:', error);
            throw error;
        }
    }
}