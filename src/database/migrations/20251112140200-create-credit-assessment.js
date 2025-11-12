'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('credit_assessments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      creditScore: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      riskLevel: {
        type: Sequelize.ENUM('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'),
        allowNull: false,
      },
      defaultProbability: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      maxLoanAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      expectedLoss: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      validationResult: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      financialSummary: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      riskAnalysis: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      creditFactors: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('credit_assessments');
  },
};
