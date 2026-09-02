import { describe, it, expect } from 'vitest';
import { ApiError } from '../../src/utils/ApiError.js';

describe('ApiError', () => {
  it('creates error with statusCode and message', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.isOperational).toBe(true);
  });

  it('defaults isOperational to true', () => {
    const error = new ApiError(500, 'Server error');
    expect(error.isOperational).toBe(true);
  });

  it('captures stack trace when no stack provided', () => {
    const error = new ApiError(400, 'Bad request');
    expect(error.stack).toBeDefined();
    expect(error.stack).toBeTruthy();
  });

  it('uses provided stack when given', () => {
    const customStack = 'custom stack trace';
    const error = new ApiError(400, 'Bad request', true, customStack);
    expect(error.stack).toBe(customStack);
  });

  it('can be set as non-operational', () => {
    const error = new ApiError(500, 'Internal error', false);
    expect(error.isOperational).toBe(false);
  });

  it('is an instance of Error', () => {
    const error = new ApiError(400, 'test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});
