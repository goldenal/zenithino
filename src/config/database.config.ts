import { registerAs } from '@nestjs/config';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { Dialect } from 'sequelize';

type DialectOptions = NonNullable<SequelizeModuleOptions['dialectOptions']>;

const supabaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.SUPABASE_DB_URL?.trim() ||
  process.env.SUPABASE_DATABASE_URL?.trim();

const shouldUseSsl = (process.env.DB_SSL ?? 'true').toLowerCase() !== 'false';

const sslOptions: DialectOptions | undefined = shouldUseSsl
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }
  : undefined;

const baseOptions: SequelizeModuleOptions = {
  dialect: ((process.env.DB_DIALECT as Dialect) ?? 'postgres') as Dialect,
  autoLoadModels: true,
  synchronize: false,
  logging: (process.env.DB_LOGGING ?? 'false').toLowerCase() === 'true',
  dialectOptions: sslOptions,
};

export const databaseConfig: SequelizeModuleOptions = supabaseUrl
  ? {
      ...baseOptions,
      uri: supabaseUrl,
    }
  : {
      ...baseOptions,
      host: process.env.DB_HOST,
      port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

export default registerAs('database', () => databaseConfig);
