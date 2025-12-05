// authSlice.js

import api from "@/app/api/instance";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const REFRESH_BUFFER_MS = 10 * 1000; // Refresh 10 seconds before expiry

const initialState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    token: null,
    refreshToken: null,
    tokenExpiresAt: null, // Parsed timestamp (ms) from backend 'Expires' or JWT 'exp'
    error: null,
};

// Helper: Decode JWT payload (extracts exp claim)
const decodeJWT = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.warn('JWT decode failed:', e);
        return null;
    }
};

// Parse expiry: From field if present, else from JWT exp (Unix s → ms)
const parseExpiry = (payload, token) => {
    let expires = payload.Expires || payload.expires;
    if (expires) {
        return new Date(expires).getTime();
    }
    // Fallback: Decode JWT exp
    const decoded = decodeJWT(token);
    if (decoded?.exp) {
        const expMs = decoded.exp * 1000;
        console.log('🔍 Decoded JWT exp (ms):', expMs, 'from token:', token?.substring(0, 20) + '...'); // TEMP: Debug
        return expMs;
    }
    console.warn('⚠️ No expiry field or JWT exp found');
    return null;
};

// ALL THUNKS MUST USE `api` – NEVER axios directly!
export const registerUser = createAsyncThunk('/api/user', async (formData, { rejectWithValue }) => {
    try {
        const response = await api.post(`/api/user`, formData);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.Warning || "Registration failed");
    }
});

export const loginUser = createAsyncThunk('/account/login', async (formData, { rejectWithValue }) => {
    try {
        const response = await api.post(`/api/Account/login`, formData);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
});

export const refreshAccessToken = createAsyncThunk(
    "auth/refreshToken",
    async (_, { getState, rejectWithValue }) => {
        const { token, refreshToken } = getState().auth;
        if (!refreshToken) return rejectWithValue("No refresh token");

        try {
            const response = await api.post("/api/User/refresh", {
                accessToken: token,
                refreshToken: refreshToken,
            });
            console.log('📥 Refresh response payload:', response.data); // TEMP: Full log
            return response.data;
        } catch (error) {
            console.error('❌ Refresh thunk error:', error.response?.data || error.message); // TEMP
            return rejectWithValue("Session expired");
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.isAuthenticated = false;
            state.isLoading = false;
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.tokenExpiresAt = null;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload;
                state.token = action.payload.Token;
                state.refreshToken = action.payload.RefreshToken;
                state.tokenExpiresAt = parseExpiry(action.payload, action.payload.Token);
                console.log('✅ Login: New token preview:', state.token?.substring(0, 20) + '...', 'expiresAt:', state.tokenExpiresAt); // TEMP
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.refreshToken = null;
                state.tokenExpiresAt = null;
                state.error = action.payload;
            })
            .addCase(refreshAccessToken.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                console.log('🔄 Refresh pending...'); // TEMP
            })
            .addCase(refreshAccessToken.fulfilled, (state, action) => {
                state.isLoading = false;
                // FIXED: Uppercase casing from response
                state.token = action.payload.AccessToken;
                state.refreshToken = action.payload.RefreshToken;
                // FIXED: Parse from field or JWT decode
                state.tokenExpiresAt = parseExpiry(action.payload, action.payload.AccessToken);
                console.log('✅ Refresh fulfilled: New token preview:', state.token?.substring(0, 20) + '...', 'expiresAt:', state.tokenExpiresAt); // TEMP
            })
            .addCase(refreshAccessToken.rejected, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.refreshToken = null;
                state.tokenExpiresAt = null;
                state.error = action.payload;
                console.log('❌ Refresh rejected:', action.payload); // TEMP
            });
    }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;