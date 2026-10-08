import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback

const isSslRequired =
  process.env.DB_SSL === 'true' ||
  process.env.DATABASE_URL?.includes('supabase') ||
  process.env.DATABASE_URL?.includes('pooler');

const options: DataSourceOptions = process.env.DATABASE_URL
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: isSslRequired ? { rejectUnauthorized: false } : false,
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      entities: [path.join(__dirname, 'entities', '*.entity.{ts,js}')],
      migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
      subscribers: [],
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'fleet_delivery_db',
      ssl: isSslRequired ? { rejectUnauthorized: false } : false,
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      entities: [path.join(__dirname, 'entities', '*.entity.{ts,js}')],
      migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
      subscribers: [],
    };

export const AppDataSource = new DataSource(options);
