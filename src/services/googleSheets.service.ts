import { google } from "googleapis";
import { TariffRecord } from "#types/tariff.types.js";
import env from "#config/env/env.js";
import log4js from "log4js";

const logger = log4js.getLogger("GoogleSheetsService");

export class GoogleSheetsService {
    private sheets: any;
    private spreadsheetIds: string[];

    constructor() {
        this.initializeGoogleSheets();
        this.spreadsheetIds = env.GOOGLE_SPREADSHEET_IDS.split(',');
    }

    /**
     * Initialize Google Sheets API client
     */
    private async initializeGoogleSheets(): Promise<void> {
        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: env.GOOGLE_CREDENTIALS_PATH,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheets = google.sheets({ version: 'v4', auth });
            logger.info('Google Sheets API initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Google Sheets API:', error);
            throw error;
        }
    }

    /**
     * Update all configured spreadsheets with tariff data
     * @param {TariffRecord[]} records - Tariff records to update
     * @returns {Promise<void>}
     */
    async updateAllSpreadsheets(records: TariffRecord[]): Promise<void> {
        const updatePromises = this.spreadsheetIds.map(spreadsheetId => 
            this.updateSpreadsheet(spreadsheetId, records)
        );

        try {
            await Promise.all(updatePromises);
            logger.info(`Successfully updated ${this.spreadsheetIds.length} spreadsheets`);
        } catch (error) {
            logger.error('Failed to update some spreadsheets:', error);
            throw error;
        }
    }

    /**
     * Update a single spreadsheet with tariff data
     * @param {string} spreadsheetId - Google Spreadsheet ID
     * @param {TariffRecord[]} records - Tariff records to update
     * @returns {Promise<void>}
     */
    async updateSpreadsheet(spreadsheetId: string, records: TariffRecord[]): Promise<void> {
        try {
            const sheetName = 'stocks_coefs';
            
            // Ensure sheet exists
            await this.ensureSheetExists(spreadsheetId, sheetName);
            
            // Clear existing data
            await this.clearSheet(spreadsheetId, sheetName);
            
            // Prepare data for sheets
            const values = this.prepareSheetData(records);
            
            // Update sheet with new data
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values
                }
            });

            logger.info(`Successfully updated spreadsheet ${spreadsheetId}`);
        } catch (error) {
            logger.error(`Failed to update spreadsheet ${spreadsheetId}:`, error);
            throw error;
        }
    }

    /**
     * Ensure sheet exists in the spreadsheet
     * @param {string} spreadsheetId - Google Spreadsheet ID
     * @param {string} sheetName - Name of the sheet
     * @returns {Promise<void>}
     */
    private async ensureSheetExists(spreadsheetId: string, sheetName: string): Promise<void> {
        try {
            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId
            });

            const sheetExists = spreadsheet.data.sheets.some(
                (sheet: any) => sheet.properties.title === sheetName
            );

            if (!sheetExists) {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: {
                                    title: sheetName
                                }
                            }
                        }]
                    }
                });
                logger.info(`Created new sheet: ${sheetName}`);
            }
        } catch (error) {
            logger.error(`Failed to ensure sheet exists: ${sheetName}`, error);
            throw error;
        }
    }

    /**
     * Clear existing data from sheet
     * @param {string} spreadsheetId - Google Spreadsheet ID
     * @param {string} sheetName - Name of the sheet
     * @returns {Promise<void>}
     */
    private async clearSheet(spreadsheetId: string, sheetName: string): Promise<void> {
        try {
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${sheetName}!A:Z`
            });
        } catch (error) {
            logger.error(`Failed to clear sheet: ${sheetName}`, error);
            throw error;
        }
    }

    /**
     * Prepare tariff data for Google Sheets format
     * @param {TariffRecord[]} records - Tariff records
     * @returns {string[][]} 2D array for Google Sheets
     */
    private prepareSheetData(records: TariffRecord[]): string[][] {
        // Header row
        const headers = [
            'Date',
            'Warehouse Name',
            'Delivery Expr',
            'Delivery Base',
            'Delivery Liter',
            'Storage Expr',
            'Storage Coef',
            'Next Pallet',
            'Till Max',
            'Updated At'
        ];

        // Data rows (already sorted by coefficient in ascending order)
        const dataRows = records.map(record => [
            record.date,
            record.warehouse_name,
            record.pallet_delivery_expr.toString(),
            record.pallet_delivery_value_base.toString(),
            record.pallet_delivery_value_liter.toString(),
            record.pallet_storage_expr.toString(),
            record.pallet_storage_value_expr.toString(),
            record.dt_next_pallet,
            record.dt_till_max,
            record.updated_at?.toISOString() || ''
        ]);

        return [headers, ...dataRows];
    }
}