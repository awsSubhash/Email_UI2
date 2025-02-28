// auth.js - Authentication Handler (v2.0)
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const loginButton = loginForm.querySelector('button[type="submit"]');

    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    };

    const handleLogin = async (email, password) => {
        try {
            loginButton.disabled = true;
            loginButton.textContent = 'Authenticating...';

            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed. Please try again.');
            }

            // Redirect to main application
            window.location.href = data.redirect || '/';

        } catch (error) {
            showError(error.message);
            console.error('Login Error:', error);
        }
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.style.display = 'none';

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Client-side validation
        if (!email || !password) {
            return showError('Please fill in both email and password');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return showError('Please enter a valid email address');
        }

        await handleLogin(email, password);
    });

    // Clear error on input
    [emailInput, passwordInput].forEach(input => {
        input.addEventListener('input', () => {
            if (errorMessage.style.display === 'block') {
                errorMessage.style.display = 'none';
            }
        });
    });
});
