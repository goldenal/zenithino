import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
  } from 'sequelize-typescript';
  import { User } from '../../users/entities/user.entity';
  import { DocumentType } from '../../../common/enums/document-type.enum';
  
  @Table({
    tableName: 'documents',
    timestamps: true,
  })
  export class Document extends Model {
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
      type: DataType.ENUM(...Object.values(DocumentType)),
      allowNull: false,
    })
    declare documentType: DocumentType;
  
    @Column({
      type: DataType.STRING,
      allowNull: false,
    })
    declare filename: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: false,
    })
    declare fileUrl: string;
  
    @Column({
      type: DataType.JSONB,
      allowNull: true,
    })
    declare extractedData: any;
  
    @Column({
      type: DataType.ENUM('pending', 'processed', 'failed'),
      defaultValue: 'pending',
    })
    declare status: string;
  }