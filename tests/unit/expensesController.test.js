const request = require('supertest');
const express = require('express');

// Mock the Expenses model
jest.mock('#models/Expenses');

const Expenses = require('#models/Expenses');
const expensesController = require('../../src/api/projects/personal/controllers/expensesController');

describe('Expenses Controller Unit Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', expensesController);
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    test('should retrieve expenses with pagination successfully', async () => {
      const mockExpenses = [
        { _id: '1', date: new Date().toISOString(), place: 'Shop', amount: 100, type: 'DR' }
      ];
      Expenses.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockExpenses)
      };
      Expenses.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Expenses retrieved successfully');
      expect(response.body.data.items).toEqual(mockExpenses);
      expect(response.body.data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      expect(Expenses.find).toHaveBeenCalled();
      expect(mockQuery.sort).toHaveBeenCalledWith({ date: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    test('should handle errors when retrieving expenses', async () => {
      Expenses.countDocuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
      expect(response.body.data).toBeNull();
    });
  });

  describe('POST /', () => {
    const validExpense = {
      date: '2026-07-07T00:00:00.000Z',
      place: 'Grocery Store',
      amount: 1500,
      type: 'DR',
      account: 'Cash',
      isExpense: true,
      isIncome: false,
      category: 'Food',
      tags: ['groceries'],
      note: 'Weekly groceries'
    };

    test('should create a new expense successfully', async () => {
      const mockSavedExpense = { _id: '123', ...validExpense };
      const mockSave = jest.fn().mockResolvedValue(mockSavedExpense);

      Expenses.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/')
        .send(validExpense);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Expense added successfully');
      expect(response.body.data).toEqual(mockSavedExpense);
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    test('should handle database save error', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      Expenses.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/')
        .send(validExpense);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Save failed');
      expect(response.body.data).toBeNull();
    });
  });

  describe('PUT /:id', () => {
    const updateData = {
      place: 'Supermarket',
      amount: 2000
    };

    test('should update an expense successfully', async () => {
      const mockUpdatedExpense = { _id: '123', date: '2026-07-07T00:00:00.000Z', ...updateData };
      Expenses.findByIdAndUpdate.mockResolvedValue(mockUpdatedExpense);

      const response = await request(app)
        .put('/123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Expense updated successfully');
      expect(response.body.data).toEqual(mockUpdatedExpense);
      expect(Expenses.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { $set: updateData },
        { new: true }
      );
    });

    test('should return error when expense is not found', async () => {
      Expenses.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put('/999')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Expense not found');
      expect(response.body.data).toBeNull();
    });

    test('should handle database errors on update', async () => {
      Expenses.findByIdAndUpdate.mockRejectedValue(new Error('Update error'));

      const response = await request(app)
        .put('/123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Update error');
      expect(response.body.data).toBeNull();
    });
  });

  describe('DELETE /:id', () => {
    test('should delete an expense successfully', async () => {
      const mockDeletedExpense = { _id: '123', place: 'Shop' };
      Expenses.findByIdAndDelete.mockResolvedValue(mockDeletedExpense);

      const response = await request(app).delete('/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Expense deleted successfully');
      expect(response.body.data).toEqual(mockDeletedExpense);
      expect(Expenses.findByIdAndDelete).toHaveBeenCalledWith('123');
    });

    test('should return error when expense is not found during delete', async () => {
      Expenses.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete('/999');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Expense not found');
      expect(response.body.data).toBeNull();
    });

    test('should handle database errors on delete', async () => {
      Expenses.findByIdAndDelete.mockRejectedValue(new Error('Delete error'));

      const response = await request(app).delete('/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delete error');
      expect(response.body.data).toBeNull();
    });
  });
});
