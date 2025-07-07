import { Request, Response } from 'express';
import knex from "#postgres/knex.js";
import log4js from "log4js";

const logger = log4js.getLogger("HealthController");

export class HealthController {
    /**
     * Health check endpoint
     */
    static async check(req: Request, res: Response): Promise<void> {
        try {
            // Check database connection
            await knex.raw('SELECT 1');
            
            // Check recent data
            const recentData = await knex('wb_tariffs')
                .where('date', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
                .limit(1);
            
            const totalRecords = await knex('wb_tariffs').count('* as count').first();
            
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: 'connected',
                totalRecords: totalRecords?.count || 0,
                recentData: recentData.length > 0 ? 'available' : 'no_recent_data',
                services: {
                    postgres: 'connected',
                    scheduler: 'running'
                }
            });
        } catch (error: unknown) {
            logger.error('Health check failed:', error);
            res.status(500).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}