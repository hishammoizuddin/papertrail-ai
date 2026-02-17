import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from "jwt-decode";
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check if token is expired
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    // We can also fetch user details from /auth/me here if needed, 
                    // but for now we trust the token or decoded info
                    setUser({ email: decoded.sub });
                    // Set default headers for axios
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                }
            } catch (error) {
                console.error("Invalid token", error);
                logout();
            }
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        try {
            const response = await axios.post('http://localhost:8000/api/auth/login', {
                username: email, // OAuth2PasswordRequestForm expects 'username'
                password: password
            }, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token } = response.data;
            localStorage.setItem('token', access_token);
            setToken(access_token);
            return { success: true };
        } catch (error) {
            console.error("Login failed", error);
            return { success: false, error: error.response?.data?.detail || "Login failed" };
        }
    };

    const signup = async (email, password, fullName) => {
        try {
            await axios.post('http://localhost:8000/api/auth/signup', {
                email,
                password,
                full_name: fullName
            });
            // Auto login after signup? Or redirect to login. Let's redirect to login for simplicity or auto-login.
            // For better UX, let's auto login
            return await login(email, password);
        } catch (error) {
            console.error("Signup failed", error);
            return { success: false, error: error.response?.data?.detail || "Signup failed" };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading, token }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
