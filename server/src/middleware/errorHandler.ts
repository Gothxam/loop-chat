import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(`[Error] ${req.method} ${req.url}:`, error);

  // Mongoose CastError or validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      message: 'Database validation failed',
      error: error.message,
    });
    return;
  }

  if (error.name === 'CastError') {
    res.status(400).json({
      message: 'Invalid resource ID format',
    });
    return;
  }

  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};
