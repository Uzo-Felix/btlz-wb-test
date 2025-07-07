import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.union([z.undefined(), z.enum(["development", "production"])]),
    POSTGRES_HOST: z.union([z.undefined(), z.string()]),
    POSTGRES_PORT: z
        .string()
        .regex(/^[0-9]+$/)
        .transform((value) => parseInt(value)),
    POSTGRES_DB: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    APP_PORT: z.union([
        z.undefined(),
        z
            .string()
            .regex(/^[0-9]+$/)
            .transform((value) => parseInt(value)),
    ]),
    WB_API_KEY: z.string(),
    WB_API_BASE_URL: z.string(),
    GOOGLE_CREDENTIALS_PATH: z.string(),
    GOOGLE_SPREADSHEET_IDS: z.string(),
    FETCH_INTERVAL_HOURS: z.union([
        z.undefined(),
        z.string().transform((value) => parseInt(value))
    ]),
    SHEETS_UPDATE_INTERVAL_HOURS: z.union([
        z.undefined(),
        z.string().transform((value) => parseInt(value))
    ]),
});

const env = envSchema.parse({
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
    APP_PORT: process.env.APP_PORT,
    WB_API_KEY: process.env.WB_API_KEY,
    WB_API_BASE_URL: process.env.WB_API_BASE_URL,
    GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH,
    GOOGLE_SPREADSHEET_IDS: process.env.GOOGLE_SPREADSHEET_IDS,
    FETCH_INTERVAL_HOURS: process.env.FETCH_INTERVAL_HOURS,
    SHEETS_UPDATE_INTERVAL_HOURS: process.env.SHEETS_UPDATE_INTERVAL_HOURS,
});

export default env;
