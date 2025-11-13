import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { sequelizeModels } from './models';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const sslRequired =
          configService.get<string>('DB_SSL', 'true') !== 'false';
        const isServerless =
          process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

        return {
          dialect: 'postgres',
          url:
            configService.get<string>('DATABASE_URL') ??
            process.env.DATABASE_URL,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', ''),
          database: configService.get<string>('DB_NAME', 'postgres'),
          autoLoadModels: true,
          synchronize: false,
          logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
          models: [...sequelizeModels],
          dialectOptions: sslRequired
            ? { ssl: { require: true, rejectUnauthorized: false } }
            : undefined,
          pool: isServerless
            ? {
                max: 1,
                min: 0,
                idle: 10000,
                acquire: 30000,
                evict: 1000,
              }
            : {
                max: 5,
                min: 0,
                idle: 10000,
                acquire: 30000,
              },
        };
      },
    }),
    SequelizeModule.forFeature([...sequelizeModels]),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
