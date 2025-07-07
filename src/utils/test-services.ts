import { WildberriesService } from "#services/wildberries.service.js";
import { DatabaseService } from "#services/database.service.js";
import { GoogleSheetsService } from "#services/googleSheets.service.js";
import log4js from "log4js";

const logger = log4js.getLogger("TestServices");

async function testWildberriesAPI(): Promise<void> {
    try {
        logger.info('Testing Wildberries API...');
        const wbService = new WildberriesService();
        const currentDate = wbService.getCurrentDate();
        
        const response = await wbService.fetchTariffData(currentDate);
        const records = wbService.transformToTariffRecords(response, currentDate);
        
        logger.info(`✅ WB API test passed: ${records.length} records received`);
        console.log('Sample record:', records[0]);
    } catch (error) {
        logger.error('❌ WB API test failed:', error);
    }
}

async function testDatabaseService(): Promise<void> {
    try {
        logger.info('Testing Database Service...');
        const dbService = new DatabaseService();
        
        // Test with sample data
        const sampleRecord = {
            date: '2024-03-01',
            warehouse_name: 'Test Warehouse',
            pallet_delivery_expr: 100.50,
            pallet_delivery_value_base: 50.25,
            pallet_delivery_value_liter: 12.75,
            pallet_storage_expr: 200.00,
            pallet_storage_value_expr: 35.60,
            dt_next_pallet: '2024-03-02',
            dt_till_max: '2024-03-31'
        };
        
        await dbService.upsertTariffRecords([sampleRecord]);
        const retrievedRecords = await dbService.getLatestTariffData('2024-03-01');
        
        logger.info(`✅ Database test passed: ${retrievedRecords.length} records retrieved`);
    } catch (error) {
        logger.error('❌ Database test failed:', error);
    }
}

async function testGoogleSheetsService(): Promise<void> {
    try {
        logger.info('Testing Google Sheets Service...');
        const sheetsService = new GoogleSheetsService();
        const dbService = new DatabaseService();
        
        // Get sample data
        const sampleData = await dbService.getLatestTariffData();
        
        if (sampleData.length === 0) {
            logger.warn('No data available for Google Sheets test');
            return;
        }
        
        await sheetsService.updateAllSpreadsheets(sampleData);
        logger.info('✅ Google Sheets test passed');
    } catch (error) {
        logger.error('❌ Google Sheets test failed:', error);
    }
}

async function runAllTests(): Promise<void> {
    logger.info('Starting service tests...');
    
    await testWildberriesAPI();
    await testDatabaseService();
    await testGoogleSheetsService();
    
    logger.info('All tests completed');
    process.exit(0);
}

runAllTests();