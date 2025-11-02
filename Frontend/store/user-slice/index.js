import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const initialState = {
    isLoading: false,
    userData: null,
    error: null,
    detailsCount: null
}

export const getUserDetails = createAsyncThunk('/user/getUserDetails', async (userid, { rejectWithValue }) => {
    try {
        const response = await axios.get(`/api/User/getuserdetails?UserId=${userid}`);
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Fetching user data failed')
    }
})

export const saveUserDetails = createAsyncThunk(
    '/user/saveuserdetails',
    async ({ userid, specializationId, university, currentPosition, currentLocation, firstName, lastName }, { rejectWithValue }) => {
      try {
        const response = await axios.post(
          `/api/User/saveuserdetails?UserId=${userid}&SpecilizationId=${specializationId}&University=${university}&CurrentPosition=${currentPosition}&CurrentLocation=${currentLocation}&firstname=${firstName}&Lastname=${lastName}`
        );
        return response?.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Cannot save user details');
      }
    }
  );

export const getDetailsCount = createAsyncThunk(
    '/user/getcounts',
    async () => {
        try {
            const response = await axios.get('/api/User/getcounts');
            return response?.data?.Result;
        } catch (error) {
            return error.response?.data?.message || 'Can not fetch details count';
        }
    }
)
  

const userDataSlice = createSlice({
    name: 'userprofile',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(getUserDetails.pending, (state) => {
            state.isLoading = true;
        }).addCase(getUserDetails.fulfilled, (state, action) => {
            state.isLoading = false;
            state.userData = action?.payload;
            state.error = null;
        }).addCase(getUserDetails.rejected, (state, action) => {
            state.isLoading = false;
            state.user = null;
            state.error = action?.payload
        }).addCase(saveUserDetails.pending, (state) => {
            state.isLoading = true;
        }).addCase(saveUserDetails.fulfilled, (state, action) => {
            state.isLoading = false;
            state.userData = action?.payload;
            state.error = null
        }).addCase(saveUserDetails.rejected, (state, action) => {
            state.isLoading = false;
            state.user = null;
            state.error = action?.payload;
        }).addCase(getDetailsCount.pending, (state) => {
            state.isLoading = true;
        }).addCase(getDetailsCount.fulfilled, (state, action) =>{
            state.isLoading = false;
            state.detailsCount = action?.payload;
            state.error = null
        }).addCase(getDetailsCount.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload
        })
    }
})

export default userDataSlice.reducer;      