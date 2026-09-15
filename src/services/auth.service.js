export const authService = {
  async getCurrentUser() { return null; },
  async login() { throw new Error('AUTH_NOT_IMPLEMENTED'); },
  async register() { throw new Error('AUTH_NOT_IMPLEMENTED'); },
};
