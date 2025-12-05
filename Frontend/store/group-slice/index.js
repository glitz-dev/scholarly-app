import api from '@/app/api/instance';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const initialState = {
    isLoading: false,
    groupList: [],
    error: null
};

export const addGroup = createAsyncThunk("/pdf/addgroup", async ({ userId, groupName, tagsText }, { rejectWithValue }) => { // REMOVED: authToken arg
    try {
        const response = await api.post(`/api/Group/add?GroupName=${groupName}&TagsText=${tagsText}`); // CHANGED: api.post, no manual headers
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data || "An error occurred");
    }
});

export const getGroups = createAsyncThunk("/pdf/getgroups", async ({ }, { rejectWithValue }) => { // REMOVED: authToken arg
    try {
        const response = await api.get(`/api/Group/list`); // CHANGED: api.get, no manual headers
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data || "Failed to fetch groups");
    }
});

export const deleteGroup = createAsyncThunk('/pdf/deletegroup', async ({ groupId }, { rejectWithValue }) => { // REMOVED: authToken arg
    try {
        const response = await api.delete(`/api/Group/${groupId}`); // CHANGED: api.delete, no manual headers
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not delete group');
    }
});

export const addNewEmail = createAsyncThunk('/pdf/addnewEmail', async ({ email, groupId }, { rejectWithValue }) => { // REMOVED: authToken arg
    try {
        const response = await api.post(`/api/Group/email/add?newEmail=${email}&GroupId=${groupId}`); // CHANGED: api.post, no manual headers
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not add new Email'); // FIXED: Typo "Emalil" → "Email"
    }
});

export const deleteEmail = createAsyncThunk('/pdf/deleteemail', async ({ groupEmailId }, { rejectWithValue }) => { // REMOVED: authToken arg
    try {
        const response = await api.delete(`/api/Group/email/${groupEmailId}`); // CHANGED: api.delete, no manual headers
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not delete Email'); // FIXED: Typo "Emalil" → "Email"
    }
});

const groupDataSlice = createSlice({
    name: 'group',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(addGroup.pending, (state) => {
            state.isLoading = true;
        }).addCase(addGroup.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
        }).addCase(addGroup.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action?.payload;
        }).addCase(getGroups.pending, (state) => {
            state.isLoading = true;
        })
            .addCase(getGroups.fulfilled, (state, action) => {
                state.isLoading = false;
                state.groupList = action.payload;
                state.error = null;
            })
            .addCase(getGroups.rejected, (state, action) => {
                state.isLoading = false;
                state.groupList = [];
                state.error = action.payload;
            }).addCase(deleteGroup.pending, (state) => {
                state.isLoading = true
            }).addCase(deleteGroup.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null
            }).addCase(deleteGroup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action?.payload;
            }).addCase(addNewEmail.pending, (state) => {
                state.isLoading = true;
            }).addCase(addNewEmail.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null
            }).addCase(addNewEmail.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action?.payload;
            }).addCase(deleteEmail.pending, (state) => {
                state.isLoading = true;
            }).addCase(deleteEmail.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
            }).addCase(deleteEmail.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
    }
});

export default groupDataSlice.reducer;