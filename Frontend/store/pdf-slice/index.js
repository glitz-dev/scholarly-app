import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const initialState = {
    isLoading: false,
    collectionList: [],
    error: null,
    selectedPdf: null,
    projectData: null
}

export const saveFile = createAsyncThunk('/pdf/savefile', async ({ formData, authToken }, { rejectWithValue, getState }) => {
    try {
        const response = await axios.post(
            `/api/PDF/savefile`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'multipart/form-data',
                }
            }
        );
        return response?.data?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not save File');
    }
});

export const getCollections = createAsyncThunk('/pdf/getcollections', async ({ authToken, projectId }, { rejectWithValue }) => {
    try {
        const response = await axios.get(`/api/PDF/uploadedpdfslist?ProjectId=${projectId}`, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        })
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not fetch files');
    }
})

export const getAllCollections = createAsyncThunk('/pdf/getallcollections', async ({ authToken }, { rejectWithValue }) => {
    try {
        const response = await axios.get(`/api/PDF/uploadedpdfslist`, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        })
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not fetch files');
    }
})

export const editPdf = createAsyncThunk('/pdf/editpdf', async ({ id, article, pubmedid, author, doi, userId, authToken }, { rejectWithValue }) => {
    try {
        const response = await axios.put(`/api/mock/PDF/editCollection?userId=${userId}`, { id, article, pubmedid, author, doi }, {
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        })
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not edit file')
    }
})

export const deletePdf = createAsyncThunk('/pdf/deletepdf', async ({ id, authToken }, { rejectWithValue }) => {
    try {
        const response = await axios.post(`/api/PDF/deletepdf?UId=${id}`, {}, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        });
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not delete File');
    }
})

export const searchPdf = createAsyncThunk('/pdf/searchPdf', async ({ keyword, userId, authToken }, { rejectWithValue }) => {
    try {
        const response = await axios.get(`/api/PDF/getsearchvalues?loginuserId=${userId}&searchtext=${keyword}`, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        });
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not fetch collection')
    }
})

export const getUploadedPdf = createAsyncThunk('/pdf/getUploadedPdf', async ({ uploadId, authToken }, { rejectWithValue }) => {
    try {
        const response = await axios.get(`/api/PDF/getuploadedpdf?uploadId=${uploadId}`, {
            headers: {
                Authorization: `Bearer ${authToken}`
            },
            responseType: 'blob'
        });
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not fetch PDF');
    }
})

export const addProject = createAsyncThunk('/pdf/addproject', async ({ userId, formData, authToken }, { rejectWithValue }) => {
    try {
        const response = await axios.post(`/api/PDF/addproject?UserId=${userId}&Title=${formData?.title}&Description=${formData?.description}`, {}, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        })
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not add project');
    }
})

export const getProjects = createAsyncThunk('/pdf/getprojects', async ({ userId, authToken }, { rejectWithValue }) => {
    try {
        const response = await axios.get(`/api/PDF/allprojects?UserId=${userId}`, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        })
        return response?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || 'Can not get projects');
    }
})

export const deleteProject = createAsyncThunk('/pdf/deleteproject', async ({ projectId, authToken }, { rejectWithValue }) => {
    try {
        const response = await axios.post(`/api/PDF/deleteproject?ProjectId=${projectId}`, {}, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        })
        return response?.data
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || `Can not delete project`)
    }
})

export const updateProject = createAsyncThunk('/pdf/updateproject', async ({ rejectWithValue }) => {
    try {
        const response = await axios.post('/api/PDF/updateproject', formData, {}, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        })
        return response?.data
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || `Can not delete project`)
    }
})

export const editProject = createAsyncThunk(
    '/pdf/editproject',
    async ({ projectId, title, description, authToken }, { rejectWithValue }) => {
        try {
            const response = await axios.post(
                `/api/PDF/updateproject`,
                { ProjectId: projectId, Title: title, Description: description },
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
        builder.addCase(saveFile.pending, (state) => {
            state.isLoading = true
        }).addCase(saveFile.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            const newCollection = action.payload;
            if (newCollection && newCollection.ProjectId) {
                state.collectionList = [...state.collectionList, newCollection];
            }
        }).addCase(saveFile.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }).addCase(getCollections.pending, (state) => {
            state.isLoading = true;
        }).addCase(getCollections.fulfilled, (state, action) => {
            state.isLoading = false;
            state.collectionList = action.payload;
            state.error = null;
        }).addCase(getCollections.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }).addCase(editPdf.pending, (state) => {
            state.isLoading = true;
        }).addCase(editPdf.fulfilled, (state, action) => {
            state.isLoading = false;
            state.collectionList = action.payload;
            state.error = null
        }).addCase(editPdf.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action?.payload
        }).addCase(deletePdf.pending, (state, action) => {
            state.isLoading = true;
        }).addCase(deletePdf.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null;
        }).addCase(deletePdf.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload
        }).addCase(searchPdf.pending, (state) => {
            state.isLoading = true
        }).addCase(searchPdf.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
        }).addCase(searchPdf.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action?.payload;
        }).addCase(getUploadedPdf.pending, (state) => {
            state.isLoading = true;
        }).addCase(getUploadedPdf.fulfilled, (state, action) => {
            state.isLoading = false;
            state.selectedPdf = action.payload;
            state.error = null;
        }).addCase(getUploadedPdf.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }).addCase(addProject.pending, (state) => {
            state.isLoading = true;
        }).addCase(addProject.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null
        }).addCase(addProject.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }).addCase(getProjects.pending, (state) => {
            state.isLoading = true
        }).addCase(getProjects.fulfilled, (state, action) => {
            state.isLoading = false;
            state.projectData = action.payload;
            state.error = null
        }).addCase(getProjects.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        }).addCase(getAllCollections.pending, (state, action) => {
            state.isLoading = true
        }).addCase(getAllCollections.fulfilled, (state, action) => {
            state.isLoading = false;
            state.collectionList = action.payload;
            state.error = null
        }).addCase(getAllCollections.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload
        }).addCase(deleteProject.pending, (state) => {
            state.isLoading = true
        }).addCase(deleteProject.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null
        }).addCase(deleteProject.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action?.payload;
        })
    }
})

export default collectionSlice.reducer;