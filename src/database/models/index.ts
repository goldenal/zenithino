import { Document } from '../../modules/documents/entities/document.entity';
import { CreditAssessment } from '../../modules/credit-assessment/entities/credit-assessment.entity';
import { User } from '../../modules/users/entities/user.entity';

export const sequelizeModels = [User, Document, CreditAssessment];
