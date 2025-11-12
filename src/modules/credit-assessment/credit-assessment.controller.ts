import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
  import { CreditAssessmentService } from './credit-assessment.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../common/decorators/current-user.decorator';
  import { AssessmentRequestDto } from './dto/assessment-request.dto';
  import { AssessmentResponseDto } from './dto/assessment-response.dto';
  
  @ApiTags('Credit Assessment')
  @ApiBearerAuth('JWT-auth')
  @Controller('credit-assessment')
  @UseGuards(JwtAuthGuard)
  export class CreditAssessmentController {
    constructor(
      private readonly creditAssessmentService: CreditAssessmentService,
    ) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new credit assessment' })
    async createAssessment(
      @CurrentUser() user: any,
      @Body() requestDto: AssessmentRequestDto,
    ): Promise<AssessmentResponseDto> {
      return this.creditAssessmentService.createAssessment(user.userId, requestDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all assessments for current user' })
    async getUserAssessments(
      @CurrentUser() user: any,
    ): Promise<AssessmentResponseDto[]> {
      return this.creditAssessmentService.getUserAssessments(user.userId);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a specific assessment by ID' })
    async getAssessment(
      @CurrentUser() user: any,
      @Param('id') id: string,
    ): Promise<AssessmentResponseDto> {
      return this.creditAssessmentService.getAssessment(id, user.userId);
    }
  }