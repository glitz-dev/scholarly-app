import api from "@/app/api/instance";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const initialState = {
    isLoading: false,
    userData: null,
    error: null,
    detailsCount: null
};

export const getUserDetails = createAsyncThunk('/user/getUserDetails', async ({ }, { rejectWithValue }) => {
    try {
        const response = await api.get(`/api/User/me`);
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Fetching user data failed');
    }
});

export const saveUserDetails = createAsyncThunk(
    '/user/saveuserdetails',
    async ({ emaliId, specializationId, university, currentPosition, currentLocation, firstName, lastName, specialization, gender, password }, { rejectWithValue }) => { // REMOVED: Implicit authToken (none before)
        try {
            const response = await api.post( // CHANGED: api.post, auto-headers (no manual needed)
                `/api/User/saveuserdetails?UserId=${userid}&SpecilizationId=${specializationId}&University=${university}&CurrentPosition=${currentPosition}&CurrentLocation=${currentLocation}&firstname=${firstName}&Lastname=${lastName}`, {
                emailID: emaliId,
                password: password,
                currentLocation: currentLocation,
                currentPosition: currentPosition,
                firstName: firstName,
                gender: gender,
                lastName: lastName,
                rememberMe: true,
                specialzation: specialization,
                specialzationId: specializationId,
                university: university
            }
            );
            return response?.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Cannot save user details');
        }
    }
);

export const getDetailsCount = createAsyncThunk(
    '/user/getcounts',
    async ({ }, { rejectWithValue }) => { // REMOVED: No authToken before, but now auto
        try {
            const response = await api.get('/api/User/getcounts'); // CHANGED: api.get, auto-headers
            return response?.data?.Result;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Can not fetch details count');
        }
    }
);

const userDataSlice = createSlice({
    name: 'userprofile',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // getUserDetails
            .addCase(getUserDetails.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getUserDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                state.userData = action?.payload;
                state.error = null;
            })
            .addCase(getUserDetails.rejected, (state, action) => {
                state.isLoading = false;
                // FIXED: Only set to null if no existing data (avoids wiping on retry)
                if (!state.userData) {
                    state.userData = null;
                }
                state.error = action?.payload;
            })

            // saveUserDetails
            .addCase(saveUserDetails.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(saveUserDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                state.userData = action?.payload; // Update with new data
                state.error = null;
            })
            .addCase(saveUserDetails.rejected, (state, action) => {
                state.isLoading = false;
                // FIXED: Do NOT wipe userData on save error—keep existing
                state.error = action?.payload;
            })

            // getDetailsCount (unchanged, as it doesn't affect userData)
            .addCase(getDetailsCount.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getDetailsCount.fulfilled, (state, action) => {
                state.isLoading = false;
                state.detailsCount = action?.payload;
                state.error = null;
            })
            .addCase(getDetailsCount.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export default userDataSlice.reducer;
