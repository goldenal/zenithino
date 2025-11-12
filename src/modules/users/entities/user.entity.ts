import {
    Table,
    Column,
    Model,
    DataType,
    HasMany,
    BeforeCreate,
    BeforeUpdate,
  } from 'sequelize-typescript';
  import * as bcrypt from 'bcrypt';
  import { UserRole } from '../../../common/enums/user-role.enum';
  import { Document } from '../../documents/entities/document.entity';
  import { CreditAssessment } from '../../credit-assessment/entities/credit-assessment.entity';
  
  @Table({
    tableName: 'users',
    timestamps: true,
  })
  export class User extends Model {
    @Column({
      type: DataType.UUID,
      defaultValue: DataType.UUIDV4,
      primaryKey: true,
    })
    declare id: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: false,
    })
    declare fullName: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: false,
      unique: true,
    })
    declare email: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: false,
    })
    declare password: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    declare businessName: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    declare phoneNumber: string;
  
    @Column({
      type: DataType.ENUM(...Object.values(UserRole)),
      defaultValue: UserRole.USER,
      allowNull: false,
    })
    declare role: UserRole;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    declare bvn: string;
  
    @HasMany(() => Document)
    declare documents: Document[];
  
    @HasMany(() => CreditAssessment)
    declare assessments: CreditAssessment[];
  
    @BeforeCreate
    @BeforeUpdate
    static async hashPassword(user: User) {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  
    async validatePassword(password: string): Promise<boolean> {
      return bcrypt.compare(password, this.password);
    }
  }