import knex, { migrate, seed } from "#postgres/knex.js";
import { SchedulerService } from "#services/scheduler.service.js";
import express from "express";
import { HealthController } from "#controllers/health.controller.js";
import env from "#config/env/env.js";
import log4js from "log4js";

log4js.configure({
    appenders: {
        console: { type: 'console' },
        file: { type: 'file', filename: 'logs/app.log' }
    },
    categories: {
        default: { appenders: ['console', 'file'], level: 'info' }
    }
});

const logger = log4js.getLogger("Application");

async function initializeDatabase(): Promise<void> {
    try {
        logger.info('Initializing database...');
        
        // Wait for database to be ready
        let retries = 10;
        while (retries > 0) {
            try {
                await knex.raw('SELECT 1');
                logger.info('Database connection established');
                break;
            } catch (error) {
                logger.info(`Waiting for database... (${retries} retries left)`);
                retries--;
                await new Promise(resolve => setTimeout(resolve, 5000));
                if (retries === 0) throw error;
            }
        }
        
        logger.info('Running database migrations...');
        await migrate.latest();
        logger.info('Database migrations completed');
        
        logger.info('Running database seeds...');
        await seed.run();
        logger.info('Database seeds completed');
        
    } catch (error) {
        logger.error('Database initialization failed:', error);
        throw error;
    }
}

async function startWebServer(): Promise<void> {
    const app = express();
    const port = env.APP_PORT || 3000;
    
    app.use(express.json());
    
    app.get('/health', HealthController.check);
    
    app.get('/', (req, res) => {
        res.json({
            service: 'WB Tariff Service',
            version: '1.0.0',
            status: 'running',
            timestamp: new Date().toISOString()
        });
    });
    
    app.listen(port, () => {
        logger.info(`Web server started on port ${port}`);
    });
}

async function startApplication(): Promise<void> {
    try {
        logger.info('Starting WB Tariff Service...');
        
        await initializeDatabase();
        
        await startWebServer();
        
        const scheduler = new SchedulerService();
        scheduler.start();
        
        logger.info('WB Tariff Service started successfully!');
        logger.info(`pgAdmin available at: http://localhost:${process.env.PGADMIN_PORT || 5050}`);
        logger.info(`Health check: http://localhost:${env.APP_PORT || 3000}/health`);
        
        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM, shutting down gracefully...');
            await knex.destroy();
            process.exit(0);
        });
        
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT, shutting down gracefully...');
            await knex.destroy();
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

startApplication();