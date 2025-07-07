import { WildberriesService } from "./wildberries.service.js";
import { DatabaseService } from "./database.service.js";
import { GoogleSheetsService } from "./googleSheets.service.js";
import env from "#config/env/env.js";
import log4js from "log4js";

const logger = log4js.getLogger("SchedulerService");

export class SchedulerService {
    private wbService: WildberriesService;
    private dbService: DatabaseService;
    private sheetsService: GoogleSheetsService;
    private fetchInterval: number;
    private sheetsUpdateInterval: number;

    constructor() {
        this.wbService = new WildberriesService();
        this.dbService = new DatabaseService();
        this.sheetsService = new GoogleSheetsService();
        this.fetchInterval = (env.FETCH_INTERVAL_HOURS || 1) * 60 * 60 * 1000; // Convert to milliseconds
        this.sheetsUpdateInterval = (env.SHEETS_UPDATE_INTERVAL_HOURS || 6) * 60 * 60 * 1000;
    }

    /**
     * Start all scheduled tasks
     */
    start(): void {
        logger.info('Starting scheduler service...');
        
        // Start tariff data fetching
        this.startTariffFetching();
        
        // Start Google Sheets updates
        this.startSheetsUpdating();
        
        // Run initial fetch
        this.fetchAndStoreTariffData();
        
        logger.info('Scheduler service started successfully');
    }

    /**
     * Start periodic tariff data fetching
     */
    private startTariffFetching(): void {
        setInterval(() => {
            this.fetchAndStoreTariffData();
        }, this.fetchInterval);
        
        logger.info(`Tariff fetching scheduled every ${this.fetchInterval / 1000 / 60} minutes`);
    }

    /**
     * Start periodic Google Sheets updates
     */
    private startSheetsUpdating(): void {
        setInterval(() => {
            this.updateGoogleSheets();
        }, this.sheetsUpdateInterval);
        
        logger.info(`Google Sheets updates scheduled every ${this.sheetsUpdateInterval / 1000 / 60} minutes`);
    }

    /**
     * Fetch tariff data and store in database
     */
    private async fetchAndStoreTariffData(): Promise<void> {
        try {
            logger.info('Starting tariff data fetch...');
            
            const currentDate = this.wbService.getCurrentDate();
            const response = await this.wbService.fetchTariffData(currentDate);
            const records = this.wbService.transformToTariffRecords(response, currentDate);
            
            await this.dbService.upsertTariffRecords(records);
            
            logger.info(`Successfully fetched and stored ${records.length} tariff records for ${currentDate}`);
        } catch (error) {
            logger.error('Failed to fetch and store tariff data:', error);
        }
    }

    /**
     * Update Google Sheets with latest tariff data
     */
    private async updateGoogleSheets(): Promise<void> {
        try {
            logger.info('Starting Google Sheets update...');
            
            const latestData = await this.dbService.getLatestTariffData();
            
            if (latestData.length === 0) {
                logger.warn('No tariff data available for Google Sheets update');
                return;
            }
            
            await this.sheetsService.updateAllSpreadsheets(latestData);
            
            logger.info(`Successfully updated Google Sheets with ${latestData.length} records`);
        } catch (error) {
            logger.error('Failed to update Google Sheets:', error);
        }
    }

    /**
     * Stop all scheduled tasks
     */
    stop(): void {
        logger.info('Stopping scheduler service...');
        // To-do: store interval ids and clear them here
        process.exit(0);
    }
}