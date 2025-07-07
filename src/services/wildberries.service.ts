import { TariffRecord, WBTariffResponse } from "#types/tariff.types.js";
import env from "#config/env/env.js";
import log4js from "log4js";


const logger = log4js.getLogger("WildberriesService");

export class WildberriesService {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = env.WB_API_KEY;
        this.baseUrl = env.WB_API_BASE_URL;
    }

    /**
     * Fetch tariff data from Wildberries API
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<WBTariffResponse>}
     */
    async fetchTariffData(date: string): Promise<WBTariffResponse> {
        try {
            const url = `${this.baseUrl}/tariffs/box?date=${date}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`WB API Error: ${response.status} - ${errorData.detail || errorData.title || 'Unknown error'}`);
            }

            const data = await response.json();
            logger.info(`Successfully fetched tariff data for ${date}`);
            return data;
        } catch (error) {
            logger.error(`Failed to fetch tariff data for ${date}:`, error);
            throw error;
        }
    }

    /**
     * Transform WB API response to TariffRecord array
     * @param {WBTariffResponse} response - WB API response
     * @param {string} date - Date string
     * @returns {TariffRecord[]}
     */
    transformToTariffRecords(response: WBTariffResponse, date: string): TariffRecord[] {
        try {
            if (!response.response?.data?.warehouseList) {
                logger.warn('No warehouse data found in response');
                return [];
            }

            const { data } = response.response;
            const records: TariffRecord[] = [];

            for (const warehouse of data.warehouseList) {
                const record: TariffRecord = {
                    date,
                    warehouse_name: warehouse.warehouseName || 'Unknown',
                    pallet_delivery_expr: this.parseNumericValue(warehouse.palletDeliveryExpr),
                    pallet_delivery_value_base: this.parseNumericValue(warehouse.palletDeliveryValueBase),
                    pallet_delivery_value_liter: this.parseNumericValue(warehouse.palletDeliveryValueLiter),
                    pallet_storage_expr: this.parseNumericValue(warehouse.palletStorageExpr),
                    pallet_storage_value_expr: this.parseNumericValue(warehouse.palletStorageValueExpr),
                    dt_next_pallet: data.dtNextPallet || '',
                    dt_till_max: data.dtTillMax || ''
                };

                records.push(record);
            }

            // Sort by storage coefficient (ascending)
            records.sort((a, b) => a.pallet_storage_value_expr - b.pallet_storage_value_expr);

            logger.info(`Transformed ${records.length} tariff records`);
            return records;
        } catch (error) {
            logger.error('Failed to transform tariff data:', error);
            throw error;
        }
    }

    /**
     * Parse numeric value from string, handling commas and invalid values
     * @param {string | number} value - Value to parse
     * @returns {number}
     */
    private parseNumericValue(value: string | number | undefined): number {
        if (typeof value === 'number') {
            return isNaN(value) ? 0 : value;
        }
        
        if (typeof value === 'string') {
            // Replace comma with dot for European decimal format
            const cleanValue = value.replace(',', '.');
            const parsed = parseFloat(cleanValue);
            return isNaN(parsed) ? 0 : parsed;
        }
        
        return 0;
    }

    /**
     * Get current date in YYYY-MM-DD format
     * @returns {string}
     */
    getCurrentDate(): string {
        return new Date().toISOString().split('T')[0];
    }
}