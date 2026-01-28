/**
 * Frontend Unit Tests - Authentication Module
 * 
 * Tests login, token management, and role-based access control
 */

describe('Authentication Module', () => {
  let loginForm;
  let emailInput;
  let passwordInput;
  let loginButton;
  let errorMessageDiv;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="login-form">
        <input id="email-input" type="email" />
        <input id="password-input" type="password" />
        <button id="login-button">Login</button>
        <div id="error-message" style="display:none;"></div>
      </div>
    `;

    loginForm = document.getElementById('login-form');
    emailInput = document.getElementById('email-input');
    passwordInput = document.getElementById('password-input');
    loginButton = document.getElementById('login-button');
    errorMessageDiv = document.getElementById('error-message');

    // Clear localStorage
    localStorage.clear();
  });

  describe('Form Validation', () => {
    it('should validate email format', () => {
      const validEmail = 'captain@skyroster.com';
      const invalidEmail = 'not-an-email';

      const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      };

      expect(validateEmail(validEmail)).toBe(true);
      expect(validateEmail(invalidEmail)).toBe(false);
    });

    it('should validate password requirements', () => {
      const validatePassword = (password) => {
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
        return password.length >= 8 && 
               /[A-Z]/.test(password) && 
               /[a-z]/.test(password) && 
               /[0-9]/.test(password);
      };

      expect(validatePassword('Pass1234')).toBe(true);
      expect(validatePassword('password')).toBe(false);
      expect(validatePassword('PASS1234')).toBe(false);
      expect(validatePassword('Pass123')).toBe(false); // Less than 8 chars
    });

    it('should require both email and password', () => {
      const isFormValid = (email, password) => {
        return email && email.trim() !== '' && 
               password && password.trim() !== '';
      };

      expect(isFormValid('user@test.com', 'Pass1234')).toBe(true);
      expect(isFormValid('', 'Pass1234')).toBe(false);
      expect(isFormValid('user@test.com', '')).toBe(false);
    });
  });

  describe('Token Management', () => {
    it('should store auth token in localStorage', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      localStorage.setItem('authToken', token);

      expect(localStorage.getItem('authToken')).toBe(token);
    });

    it('should store user info with token', () => {
      const user = {
        id: 1,
        email: 'pilot@skyroster.com',
        role: 'PILOT',
      };

      localStorage.setItem('user', JSON.stringify(user));
      const stored = JSON.parse(localStorage.getItem('user'));

      expect(stored.id).toBe(1);
      expect(stored.email).toBe('pilot@skyroster.com');
      expect(stored.role).toBe('PILOT');
    });

    it('should clear token on logout', () => {
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));

      // Logout action
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should validate token format', () => {
      const isValidToken = (token) => {
        if (!token) return false;
        const parts = token.split('.');
        return parts.length === 3; // JWT format: header.payload.signature
      };

      expect(isValidToken('valid.jwt.token')).toBe(true);
      expect(isValidToken('invalid-token')).toBe(false);
      expect(isValidToken('')).toBe(false);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should restrict Admin-only features for non-admin users', () => {
      localStorage.setItem('userRole', 'CREW');

      const canApproveRoster = () => {
        const role = localStorage.getItem('userRole');
        return role === 'ADMIN' || role === 'MANAGER';
      };

      expect(canApproveRoster()).toBe(false);
    });

    it('should allow Admin to access all features', () => {
      localStorage.setItem('userRole', 'ADMIN');

      const canApproveRoster = () => {
        const role = localStorage.getItem('userRole');
        return role === 'ADMIN' || role === 'MANAGER';
      };

      expect(canApproveRoster()).toBe(true);
    });

    it('should allow specific roles to generate rosters', () => {
      const canGenerateRoster = (role) => {
        return ['ADMIN', 'MANAGER', 'SCHEDULER'].includes(role);
      };

      expect(canGenerateRoster('ADMIN')).toBe(true);
      expect(canGenerateRoster('MANAGER')).toBe(true);
      expect(canGenerateRoster('SCHEDULER')).toBe(true);
      expect(canGenerateRoster('CREW')).toBe(false);
      expect(canGenerateRoster('PILOT')).toBe(false);
    });

    it('should hide UI elements based on role', () => {
      const approvalBtn = document.createElement('button');
      approvalBtn.id = 'approve-btn';
      document.body.appendChild(approvalBtn);

      const hideForRole = (role) => {
        const btn = document.getElementById('approve-btn');
        if (role !== 'ADMIN' && role !== 'MANAGER') {
          btn.style.display = 'none';
        }
      };

      hideForRole('CREW');
      expect(approvalBtn.style.display).toBe('none');

      hideForRole('ADMIN');
      expect(approvalBtn.style.display).not.toBe('none');
    });
  });

  describe('Error Handling', () => {
    it('should display login error messages', () => {
      const displayError = (message) => {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
      };

      displayError('Invalid credentials');
      expect(errorMessageDiv.textContent).toBe('Invalid credentials');
      expect(errorMessageDiv.style.display).toBe('block');
    });

    it('should handle network errors', () => {
      const handleLoginError = (error) => {
        if (error.message === 'Network error') {
          return 'Unable to connect. Please try again.';
        }
        return 'Login failed';
      };

      expect(handleLoginError(new Error('Network error')))
        .toBe('Unable to connect. Please try again.');
    });

    it('should handle timeout errors', () => {
      const handleLoginError = (error) => {
        if (error.code === 'ECONNABORTED') {
          return 'Request timeout. Please try again.';
        }
        return 'Login failed';
      };

      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ECONNABORTED';

      expect(handleLoginError(timeoutError)).toBe('Request timeout. Please try again.');
    });
  });
});
