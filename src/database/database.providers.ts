import { Sequelize } from 'sequelize-typescript';
import { User } from '../modules/users/entities/user.entity';
import { Document } from '../modules/documents/entities/document.entity';
import { CreditAssessment } from '../modules/credit-assessment/entities/credit-assessment.entity';
import { databaseConfig } from '../config/database.config';

export const databaseProviders = [
  {
    provide: 'SEQUELIZE',
    useFactory: async () => {
      const sequelize = new Sequelize({
        ...databaseConfig,
        models: [User, Document, CreditAssessment],
      });
      await sequelize.sync();
      return sequelize;
    },
  },
];