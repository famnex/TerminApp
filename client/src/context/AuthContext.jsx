import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [publicSettings, setPublicSettings] = useState({});

    const loginSso = async (ssoToken) => {
        const res = await api.post('/auth/sso', { token: ssoToken });
        if (res.data.success) {
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);
            return { success: true, user };
        } else if (res.data.notAllowed) {
            // Store pre-fill info for guests / not allowed users
            localStorage.setItem('sso_prefill_name', res.data.user.displayName || '');
            localStorage.setItem('sso_prefill_email', res.data.user.email || '');
            return { success: false, notAllowed: true };
        }
        throw new Error(res.data.error || 'SSO Login failed');
    };

    useEffect(() => {
        const handleAuth = async () => {
            let ssoParam = 'sso_token';
            let ssoEnabled = false;
            let loadedSettings = {};
            try {
                const settingsRes = await api.get('/public/settings');
                loadedSettings = settingsRes.data;
                setPublicSettings(loadedSettings);
                ssoEnabled = loadedSettings.sso_enabled === 'true' || loadedSettings.sso_enabled === true || loadedSettings.sso_enabled === '1' || loadedSettings.sso_enabled === 1;
                ssoParam = loadedSettings.sso_jwt_param || 'sso_token';
            } catch (err) {
                console.error("Failed to load public settings", err);
            }

            try {
                const urlParams = new URLSearchParams(window.location.search);
                const ssoToken = urlParams.get(ssoParam);

                if (ssoEnabled && ssoToken) {
                    await loginSso(ssoToken);
                    
                    // Clear query parameter from the URL
                    const url = new URL(window.location.href);
                    url.searchParams.delete(ssoParam);
                    window.history.replaceState({}, document.title, url.pathname + url.search);
                    
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.error("SSO Login failed", err);
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has(ssoParam)) {
                    const url = new URL(window.location.href);
                    url.searchParams.delete(ssoParam);
                    window.history.replaceState({}, document.title, url.pathname + url.search);
                }
            }

            const token = localStorage.getItem('token');
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                } catch (e) {
                    localStorage.removeItem('token');
                    delete api.defaults.headers.common['Authorization'];
                }
            }
            setLoading(false);
        };

        handleAuth();
    }, []);

    // Sync logged-in user details to localStorage for booking pre-filling
    useEffect(() => {
        if (user) {
            localStorage.setItem('sso_prefill_name', user.displayName || '');
            localStorage.setItem('sso_prefill_email', user.email || '');
        }
    }, [user]);

    const login = async (username, password) => {
        const res = await api.post('/auth/login', { username, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        const isSsoUser = user?.isSso;
        setUser(null);
        if (isSsoUser && publicSettings.sso_logout_redirect) {
            window.location.href = publicSettings.sso_logout_redirect;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, publicSettings }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
