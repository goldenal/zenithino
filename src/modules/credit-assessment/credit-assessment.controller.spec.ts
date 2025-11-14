import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreditAssessmentController } from './credit-assessment.controller';
import { CreditAssessmentService } from './credit-assessment.service';
import { AssessmentRequestDto } from './dto/assessment-request.dto';
import { AssessmentResponseDto } from './dto/assessment-response.dto';
import { RiskLevel } from '../../common/enums/risk-level.enum';
import { UserRole } from '../../common/enums/user-role.enum';

describe('CreditAssessmentController', () => {
  let controller: CreditAssessmentController;
  let service: CreditAssessmentService;

  const mockCreditAssessmentService = {
    createAssessment: jest.fn(),
    getUserAssessments: jest.fn(),
    getAllAssessments: jest.fn(),
    getAssessment: jest.fn(),
  };

  const mockCurrentUser = {
    userId: 'user-id-123',
    email: 'test@example.com',
  };

  const mockAssessment: AssessmentResponseDto = {
    id: 'assessment-id-123',
    userId: 'user-id-123',
    creditScore: 85,
    riskLevel: RiskLevel.LOW,
    defaultProbability: 2.5,
    maxLoanAmount: 2500000,
    expectedLoss: 50000,
    lossRate: 2.0,
    financialSummary: {
      averageMonthlyInflow: 500000,
      averageMonthlyOutflow: 300000,
      netAverage: 200000,
      cashFlowPattern: 'stable',
      monthsAnalyzed: 6,
    },
    riskAnalysis: {
      roundTripTransactions: {
        detected: 0,
        percentage: 0,
        details: [],
      },
      consistencyScore: 0.9,
      fraudIndicators: [],
    },
    businessFlowValidation: {
      salesReceiptsMatch: {
        percentage: 95,
        matchedTransactions: 19,
        totalReceipts: 20,
      },
      salesRecordsAlignment: {
        percentage: 90,
        alignedMonths: 5,
        totalMonths: 6,
      },
    },
    validationInsights: [],
    creditFactors: [],
    status: 'completed',
    createdAt: new Date(),
    user: {
      id: 'user-id-123',
      fullName: 'Test User',
      email: 'test@example.com',
      businessName: 'Test Business',
      phoneNumber: '+2348012345678',
      role: UserRole.USER,
      bvn: '12345678901',
      createdAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditAssessmentController],
      providers: [
        {
          provide: CreditAssessmentService,
          useValue: mockCreditAssessmentService,
        },
      ],
    }).compile();

    controller = module.get<CreditAssessmentController>(
      CreditAssessmentController,
    );
    service = module.get<CreditAssessmentService>(CreditAssessmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAssessment', () => {
    it('should create a new credit assessment successfully', async () => {
      const requestDto: AssessmentRequestDto = {
        requestedAmount: 2500000,
      };

      const pendingAssessment: AssessmentResponseDto = {
        ...mockAssessment,
        status: 'pending',
        creditScore: 0,
        riskLevel: RiskLevel.MEDIUM,
      };

      mockCreditAssessmentService.createAssessment.mockResolvedValue(
        pendingAssessment,
      );

      const result = await controller.createAssessment(
        mockCurrentUser,
        requestDto,
      );

      expect(service.createAssessment).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        requestDto,
      );
      expect(result).toEqual(pendingAssessment);
      expect(result.status).toBe('pending');
    });

    it('should handle different requested amounts', async () => {
      const requestDto: AssessmentRequestDto = {
        requestedAmount: 1000000,
      };

      mockCreditAssessmentService.createAssessment.mockResolvedValue(
        mockAssessment,
      );

      const result = await controller.createAssessment(
        mockCurrentUser,
        requestDto,
      );

      expect(service.createAssessment).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        requestDto,
      );
      expect(result).toBeDefined();
    });

    it('should handle service errors', async () => {
      const requestDto: AssessmentRequestDto = {
        requestedAmount: 2500000,
      };

      mockCreditAssessmentService.createAssessment.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(
        controller.createAssessment(mockCurrentUser, requestDto),
      ).rejects.toThrow('Service error');
    });
  });

  describe('getUserAssessments', () => {
    it('should return all assessments for current user', async () => {
      const mockAssessments: AssessmentResponseDto[] = [
        mockAssessment,
        {
          ...mockAssessment,
          id: 'assessment-id-456',
          creditScore: 75,
        },
      ];

      mockCreditAssessmentService.getUserAssessments.mockResolvedValue(
        mockAssessments,
      );

      const result = await controller.getUserAssessments(mockCurrentUser);

      expect(service.getUserAssessments).toHaveBeenCalledWith(
        mockCurrentUser.userId,
      );
      expect(result).toEqual(mockAssessments);
      expect(result.length).toBe(2);
    });

    it('should return empty array when user has no assessments', async () => {
      mockCreditAssessmentService.getUserAssessments.mockResolvedValue([]);

      const result = await controller.getUserAssessments(mockCurrentUser);

      expect(service.getUserAssessments).toHaveBeenCalledWith(
        mockCurrentUser.userId,
      );
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('getAllAssessments', () => {
    it('should return paginated assessments with default pagination', async () => {
      const mockAssessments: AssessmentResponseDto[] = [
        mockAssessment,
        {
          ...mockAssessment,
          id: 'assessment-id-456',
        },
      ];

      const mockResponse = {
        rows: mockAssessments,
        count: 2,
      };

      mockCreditAssessmentService.getAllAssessments.mockResolvedValue(
        mockResponse,
      );

      // DefaultValuePipe only works in HTTP context, so we pass defaults explicitly
      const result = await controller.getAllAssessments(1, 10);

      expect(service.getAllAssessments).toHaveBeenCalledWith(1, 10, undefined);
      expect(result).toEqual(mockResponse);
      expect(result.rows.length).toBe(2);
      expect(result.count).toBe(2);
    });

    it('should return paginated assessments with custom pagination', async () => {
      const mockAssessments: AssessmentResponseDto[] = [mockAssessment];

      const mockResponse = {
        rows: mockAssessments,
        count: 1,
      };

      mockCreditAssessmentService.getAllAssessments.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getAllAssessments(2, 5);

      expect(service.getAllAssessments).toHaveBeenCalledWith(2, 5, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should filter assessments by status', async () => {
      const mockAssessments: AssessmentResponseDto[] = [
        {
          ...mockAssessment,
          status: 'completed',
        },
      ];

      const mockResponse = {
        rows: mockAssessments,
        count: 1,
      };

      mockCreditAssessmentService.getAllAssessments.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getAllAssessments(1, 10, 'completed');

      expect(service.getAllAssessments).toHaveBeenCalledWith(
        1,
        10,
        'completed',
      );
      expect(result).toEqual(mockResponse);
      expect(result.rows[0].status).toBe('completed');
    });

    it('should handle different status filters', async () => {
      const mockAssessments: AssessmentResponseDto[] = [
        {
          ...mockAssessment,
          status: 'pending',
        },
      ];

      const mockResponse = {
        rows: mockAssessments,
        count: 1,
      };

      mockCreditAssessmentService.getAllAssessments.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getAllAssessments(1, 10, 'pending');

      expect(service.getAllAssessments).toHaveBeenCalledWith(1, 10, 'pending');
      expect(result.rows[0].status).toBe('pending');
    });
  });

  describe('getAssessment', () => {
    it('should return a specific assessment by ID', async () => {
      mockCreditAssessmentService.getAssessment.mockResolvedValue(
        mockAssessment,
      );

      const result = await controller.getAssessment(
        mockCurrentUser,
        'assessment-id-123',
      );

      expect(service.getAssessment).toHaveBeenCalledWith(
        'assessment-id-123',
        mockCurrentUser.userId,
      );
      expect(result).toEqual(mockAssessment);
      expect(result.id).toBe('assessment-id-123');
      expect(result.userId).toBe(mockCurrentUser.userId);
    });

    it('should throw NotFoundException when assessment not found', async () => {
      mockCreditAssessmentService.getAssessment.mockRejectedValue(
        new NotFoundException('Assessment not found'),
      );

      await expect(
        controller.getAssessment(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(service.getAssessment).toHaveBeenCalledWith(
        'non-existent-id',
        mockCurrentUser.userId,
      );
    });

    it('should throw NotFoundException when assessment belongs to different user', async () => {
      mockCreditAssessmentService.getAssessment.mockRejectedValue(
        new NotFoundException('Assessment not found'),
      );

      await expect(
        controller.getAssessment(mockCurrentUser, 'assessment-id-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return assessment with all required fields', async () => {
      mockCreditAssessmentService.getAssessment.mockResolvedValue(
        mockAssessment,
      );

      const result = await controller.getAssessment(
        mockCurrentUser,
        'assessment-id-123',
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('creditScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('maxLoanAmount');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('user');
    });
  });
});

