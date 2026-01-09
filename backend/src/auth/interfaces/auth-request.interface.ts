import { Request as ExpressRequest } from 'express';

export interface AuthRequest extends ExpressRequest {
  user: {
    sub: string;
    email: string;
    username: string;
  };
}
