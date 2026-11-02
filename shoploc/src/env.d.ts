/// <reference types="astro/client" />
import type { AuthUser } from './types/user';

declare global {
  namespace App {
    interface Locals {
      user: AuthUser | null;
      token: string | null;
    }
  }
}
