import { registerAs } from '@nestjs/config';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { Dialect } from 'sequelize';

export const databaseConfig: SequelizeModuleOptions = {
  dialect: ((process.env.DB_DIALECT as Dialect) ?? 'postgres') as Dialect,
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'zenithino',
  autoLoadModels: true,
  synchronize: true,
};

export default registerAs('database', () => databaseConfig);
