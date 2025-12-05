// collectionSlice/index.js

import api from '@/app/api/instance'; // CHANGED: Use intercepted api
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const initialState = {
    isLoading: false,
    collectionList: [],
    error: null,
    selectedPdf: null,
    projectData: null
};

export const saveFile = createAsyncThunk('/pdf/savefile', async ({ formData }, { rejectWithValue, getState }) => { 
    try {
        const response = await api.post(`/api/Pdf/save`, formData, { // CHANGED: api.post, no manual headers (Content-Type auto for multipart)
            headers: { 'Content-Type': 'multipart/form-data' } // KEPT: Needed for file uploads
        });
        return response?.data?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not save File');
    }
});

export const getCollections = createAsyncThunk('/pdf/getcollections', async ({ projectId }, { rejectWithValue }) => { 
    try {
        const response = await api.get(`/api/Pdf/uploadedpdfslist?projectId=${projectId}`); // CHANGED: api.get, no manual headers
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not fetch files');
    }
});

export const getAllCollections = createAsyncThunk('/pdf/getallcollections', async ({ }, { rejectWithValue }) => { 
    try {
        const response = await api.get(`/api/PDF/uploadedpdfslist`); // CHANGED: api.get, no manual headers
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not fetch files');
    }
});

export const editPdf = createAsyncThunk('/pdf/editpdf', async ({ id, article, pubmedid, author, doi, userId }, { rejectWithValue }) => { 
    try {
        const response = await api.put(`/api/mock/PDF/editCollection?userId=${userId}`, { id, article, pubmedid, author, doi }, { // CHANGED: api.put, no manual headers (Content-Type auto for JSON)
            headers: { 'Content-Type': 'application/json' } // KEPT: Explicit for PUT
        });
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not edit file');
    }
});

export const deletePdf = createAsyncThunk('/pdf/deletepdf', async ({ id }, { rejectWithValue }) => { 
    try {
        const response = await api.delete(`/api/Pdf/${id}`); // CHANGED: api.delete, no manual headers
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not delete File');
    }
});

export const searchPdf = createAsyncThunk('/pdf/searchPdf', async ({ keyword }, { rejectWithValue }) => { 
    try {
        const response = await api.get(`/api/Pdf/search?searchText=${keyword}`); // CHANGED: api.get, no manual headers
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not fetch collection');
    }
});

export const getUploadedPdf = createAsyncThunk('/pdf/getUploadedPdf', async ({ uploadId }, { rejectWithValue }) => { 
    try {
        const response = await api.get(`/api/Pdf/getuploadedpdf/${uploadId}`, { // CHANGED: api.get, no manual headers
            responseType: 'blob' // KEPT: For PDF blob
        });
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not fetch PDF');
    }
});

export const addProject = createAsyncThunk('/pdf/addproject', async ({ formData }, { rejectWithValue }) => { 
    try {
        const response = await api.post(`/api/Project/add?Title=${formData.title}&Description=${formData.description}`, { // CHANGED: api.post, no manual headers (adjust endpoint if wrong)
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not add project');
    }
});

// Assumed missing thunks from reducers (add if not exist)
export const getProjects = createAsyncThunk('/pdf/getprojects', async ({ }, { rejectWithValue }) => {
    try {
        const response = await api.get(`/api/Project/list`); // Adjust endpoint
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not fetch projects');
    }
});

export const deleteProject = createAsyncThunk('/pdf/deleteproject', async ({ projectId }, { rejectWithValue }) => {
    try {
        const response = await api.delete(`/api/Project/${projectId}`); // Adjust endpoint
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not delete project');
    }
});

export const editProject = createAsyncThunk(
    '/pdf/editproject',
    async ({ projectId, title, description, authToken }, { rejectWithValue }) => {
        try {
            const response = await axios.put(
                `/api/Project/update`,
                { ProjectId: projectId, title: title, description: description },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response?.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Can not edit project');
        }
    }
);

const collectionSlice = createSlice({
    name: 'collection',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(saveFile.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(saveFile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
                const newCollection = action.payload;
                if (newCollection && newCollection.ProjectId) {
                    state.collectionList = [...state.collectionList, newCollection];
                }
            })
            .addCase(saveFile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(getCollections.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getCollections.fulfilled, (state, action) => {
                state.isLoading = false;
                state.collectionList = action.payload;
                state.error = null;
            })
            .addCase(getCollections.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(editPdf.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(editPdf.fulfilled, (state, action) => {
                state.isLoading = false;
                state.collectionList = action.payload;
                state.error = null;
            })
            .addCase(editPdf.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action?.payload;
            })
            .addCase(deletePdf.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deletePdf.fulfilled, (state) => {
                state.isLoading = false;
                state.error = null;
            })
            .addCase(deletePdf.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(searchPdf.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(searchPdf.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
            })
            .addCase(searchPdf.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action?.payload;
            })
            .addCase(getUploadedPdf.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getUploadedPdf.fulfilled, (state, action) => {
                state.isLoading = false;
                state.selectedPdf = action.payload;
                state.error = null;
            })
            .addCase(getUploadedPdf.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(addProject.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(addProject.fulfilled, (state) => {
                state.isLoading = false;
                state.error = null;
            })
            .addCase(addProject.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(getProjects.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getProjects.fulfilled, (state, action) => {
                state.isLoading = false;
                state.projectData = action.payload;
                state.error = null;
            })
            .addCase(getProjects.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(getAllCollections.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getAllCollections.fulfilled, (state, action) => {
                state.isLoading = false;
                state.collectionList = action.payload;
                state.error = null;
            })
            .addCase(getAllCollections.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(deleteProject.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deleteProject.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
            })
            .addCase(deleteProject.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action?.payload;
            });
    }
});

export default collectionSlice.reducer;