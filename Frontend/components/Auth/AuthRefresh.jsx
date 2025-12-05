// components/AuthRefresh.jsx
"use client";

import { refreshAccessToken } from "@/store/auth-slice";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

const REFRESH_BUFFER_MS = 10 * 1000; // Match the constant from authSlice.js


export default function AuthRefresh() {
    const dispatch = useDispatch();
    const { isAuthenticated, tokenExpiresAt } = useSelector((state) => state.auth);

    useEffect(() => {
        // Only schedule if authenticated and have an expiry time
        if (!isAuthenticated || !tokenExpiresAt) {
            return;
        }

        const timeToRefresh = tokenExpiresAt - Date.now() - REFRESH_BUFFER_MS;
        if (timeToRefresh <= 0) {
            // Already expired? Refresh immediately
            dispatch(refreshAccessToken());
            return;
        }

        const timeoutId = setTimeout(() => {
            dispatch(refreshAccessToken());
        }, timeToRefresh);

        // Cleanup on unmount or re-run (e.g., after successful refresh updates tokenExpiresAt)
        return () => clearTimeout(timeoutId);
    }, [isAuthenticated, tokenExpiresAt, dispatch]);

    return null; // No UI—just logic
}