import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CreditAssessmentService } from './credit-assessment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssessmentRequestDto } from './dto/assessment-request.dto';
import { AssessmentResponseDto } from './dto/assessment-response.dto';

@ApiTags('Credit Assessment')
@Controller('credit-assessment')
export class CreditAssessmentController {
  constructor(
    private readonly creditAssessmentService: CreditAssessmentService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new credit assessment' })
  async createAssessment(
    @CurrentUser() user: any,
    @Body() requestDto: AssessmentRequestDto,
  ): Promise<AssessmentResponseDto> {
    return this.creditAssessmentService.createAssessment(
      user.userId,
      requestDto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all assessments for current user' })
  async getUserAssessments(
    @CurrentUser() user: any,
  ): Promise<AssessmentResponseDto[]> {
    return this.creditAssessmentService.getUserAssessments(user.userId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all assessments for all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getAllAssessments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
  ): Promise<{ rows: AssessmentResponseDto[]; count: number }> {
    return this.creditAssessmentService.getAllAssessments(
      page,
      pageSize,
      status,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a specific assessment by ID' })
  async getAssessment(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<AssessmentResponseDto> {
    return this.creditAssessmentService.getAssessment(id, user.userId);
  }
}
