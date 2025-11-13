import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { RiskLevel } from '../../../common/enums/risk-level.enum';

@Table({
  tableName: 'credit_assessments',
  timestamps: true,
})
export class CreditAssessment extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare userId: string;

  @BelongsTo(() => User)
  declare user: User;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare creditScore: number;

  @Column({
    type: DataType.ENUM(...Object.values(RiskLevel)),
    allowNull: false,
  })
  declare riskLevel: RiskLevel;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
  })
  declare defaultProbability: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
  })
  declare maxLoanAmount: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
  })
  declare expectedLoss: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare validationResult: any;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare financialSummary: any;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare riskAnalysis: any;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  declare creditFactors: any;

  @Column({
    type: DataType.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
  })
  declare status: string;
}
