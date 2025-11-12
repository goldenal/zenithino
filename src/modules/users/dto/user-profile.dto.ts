import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  businessName?: string;

  @ApiProperty()
  phoneNumber?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  bvn?: string;

  @ApiProperty()
  createdAt: Date;
}