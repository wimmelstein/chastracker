import { hashPassword, verifyPassword } from '../utils/passwordUtils.js';

class AuthManager {
    constructor() {
        this.initializeElements();
        this.checkAuthState();
    }

    initializeElements() {
        // Get form elements
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.loginError = document.getElementById('loginError');
        this.registerError = document.getElementById('registerError');
        this.authTabs = document.querySelectorAll('.auth-tab');
        this.authForms = document.querySelectorAll('.auth-form');

        // Add event listeners
        this.authTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchAuthTab(tab));
        });

        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    switchAuthTab(clickedTab) {
        // Remove active class from all tabs and forms
        this.authTabs.forEach(tab => tab.classList.remove('active'));
        this.authForms.forEach(form => form.classList.add('hidden'));

        // Add active class to clicked tab
        clickedTab.classList.add('active');

        // Show corresponding form
        const formId = clickedTab.dataset.tab + 'Form';
        document.getElementById(formId).classList.remove('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            const user = users[username];

            if (!user) {
                this.loginError.textContent = 'User not found';
                return;
            }

            const isValid = await verifyPassword(password, user.password);
            if (!isValid) {
                this.loginError.textContent = 'Invalid password';
                return;
            }

            // Store current user
            localStorage.setItem('currentUser', username);
            if (rememberMe) {
                localStorage.setItem('rememberedUser', username);
            } else {
                localStorage.removeItem('rememberedUser');
            }

            // Clear error and form
            this.loginError.textContent = '';
            this.loginForm.reset();

            // Trigger auth success
            if (this.onUserAuthenticated) {
                this.onUserAuthenticated(username);
            }
        } catch (error) {
            this.loginError.textContent = 'An error occurred during login';
            console.error('Login error:', error);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            this.registerError.textContent = 'Passwords do not match';
            return;
        }

        try {
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            
            if (users[username]) {
                this.registerError.textContent = 'Username already exists';
                return;
            }

            const hashedPassword = await hashPassword(password);
            users[username] = {
                username,
                password: hashedPassword,
                createdAt: new Date().toISOString()
            };

            localStorage.setItem('users', JSON.stringify(users));

            // Clear error and form
            this.registerError.textContent = '';
            this.registerForm.reset();

            // Switch to login tab
            const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
            this.switchAuthTab(loginTab);
        } catch (error) {
            this.registerError.textContent = 'An error occurred during registration';
            console.error('Registration error:', error);
        }
    }

    checkAuthState() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('loginPassword');
            usernameInput.value = rememberedUser;
            document.getElementById('rememberMe').checked = true;
            passwordInput.focus();
        }
    }
}

export default AuthManager; 