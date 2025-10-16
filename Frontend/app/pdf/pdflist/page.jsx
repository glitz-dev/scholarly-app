'use client'
import useUserId from '@/hooks/useUserId'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { addProject, deletePdf, deleteProject, getCollections, getProjects, saveFile, editProject } from '@/store/pdf-slice';
import { useCustomToast } from '@/hooks/useCustomToast';
import { FileText, Loader2, Users, Search, BarChart3, Share2, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DialogTitle } from '@radix-ui/react-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ProjectSidebar from '@/components/Project/ProjectSidebar'
import ProjectSettingsSheet from '@/components/Project/ProjectSettingsSheet'
import CollectionSection from '@/components/Project/CollectionSection'

const PdfList = () => {
  const { collectionList, projectData } = useSelector((state) => state.collection);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const userId = useUserId();
  const { showToast } = useCustomToast();

  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const fileInputRef = useRef(null);
  const dialogCloseRef = useRef(null);
  const [showSheet, setShowSheet] = useState(false);
  const [pageMounted, setPageMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projects, setProjects] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isFirstCollection, setIsFirstCollection] = useState(false);
  const [projectId, setProjectId] = useState(0);
  const [projectFormData, setProjectFormData] = useState({
    title: '',
    description: ''
  });
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedDescription, setSelectedDiscription] = useState('');
  const [selectedProjectCreatedDate, setSelectedProjectCreatedDate] = useState('');
  const [selectedProjectUpdatedDate, setSelectedProjectUpdatedDate] = useState('');

  const [formData, setFormData] = useState({
    article: '',
    url: '',
    pubmedid: '',
    author: '',
    doi: '',
    publisher: '',
    copyright: '',
    file: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjectFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === 'title') {
      setTitle(value);
    } else if (name === 'description') {
      setDescription(value);
    }
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleUploadCollection = useCallback(async () => {
    try {
      setIsSubmitting(true);
      if (!user?.token) {
        showToast({
          title: "Unauthorized",
          description: "Please log in to continue.",
          variant: "warning",
        });
        return;
      }

      const form = new FormData();
      form.append('article', formData.article);
      form.append('url', formData.url);
      form.append('pubmedid', formData.pubmedid);
      form.append('author', formData.author);
      form.append('doi', formData.doi);
      form.append('publisher', formData.publisher);
      form.append('copyright_info', formData.copyright);
      form.append('userId', userId);
      form.append('file', formData.file);
      if (selectedProjectId) {
        form.append('project_id', selectedProjectId);
      }

      const result = await dispatch(saveFile({ formData: form, authToken: user?.token }));
      if (result?.meta?.requestStatus === 'fulfilled') {
        await delay(2000);
        await dispatch(getCollections({ authToken: user?.token, projectId: selectedProjectId || null }));
        showToast({
          title: 'File Uploaded Successfully',
          description: result?.payload?.message || "Uploaded collection to your project.",
          variant: "success",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setFileUrl(null);
        setFile(null);
        setFormData({
          article: '',
          url: '',
          file: '',
          pubmedid: '',
          author: '',
          doi: '',
          publisher: '',
          copyright: '',
        });
        if (dialogCloseRef.current) {
          dialogCloseRef.current.click();
        }
      } else {
        showToast({
          title: "Upload failed",
          description: result?.payload?.message || "Failed to upload the collection.",
          variant: "error",
        });
      }
    } catch (err) {
      showToast({
        title: "Something went wrong",
        description: err?.message || "Unable to upload the collection. Please try again.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, formData, user?.token, userId, showToast, selectedProjectId]);

  const handleDeleteCollection = useCallback(
    async (id) => {
      try {
        setIsSubmitting(true);
        const result = await dispatch(deletePdf({ id, authToken: user?.token }));
        if (result?.meta?.requestStatus === 'fulfilled') {
          setIsSubmitting(false);
          showToast({
            title: "Collection deleted successfully!",
            variant: "success",
          });
          await dispatch(getCollections({ authToken: user?.token, projectId: selectedProjectId || null })).then((result) => {
            if (result?.payload?.length === 0) {
              setIsFirstCollection(true)
            }
          })
        } else {
          setIsSubmitting(false);
          showToast({
            title: "Failed to delete collection",
            description: result?.payload?.message || "Something went wrong while deleting.",
            variant: "error",
          });
        }
      } catch (error) {
        showToast({
          title: "Error deleting collection",
          description: error?.message || "Please try again later.",
          variant: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    }, [dispatch, user?.token, showToast, selectedProjectId]);

  const getCollectionsOnProjects = async (projectId) => {
    try {
      setLoadingCollections(true);
      setSelectedProjectId(projectId);
      if (!user?.token) {
        showToast({
          title: "Unauthorized",
          description: "Please log in to continue.",
          variant: "warning",
        });
        return;
      }
      const result = await dispatch(getCollections({ authToken: user?.token, projectId }));
      if (result?.meta?.requestStatus === 'fulfilled') {
        setIsFirstCollection(result?.payload?.length === 0)
      } else {
        // showToast({
        //   title: "Failed to fetch collections",
        //   description: result?.payload?.message || "Unable to fetch collections for this project.",
        //   variant: "error",
        // });
      }
    } catch (error) {
      showToast({
        title: "Error fetching collections",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setLoadingCollections(false);
    }
  }

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true)
      if (!user?.token) {
        showToast({
          title: "Unauthorized",
          description: "Please log in to continue.",
          variant: "warning",
        });
        return;
      }

      const result = await dispatch(addProject({ userId, formData: projectFormData, authToken: user?.token }));
      if (result?.meta?.requestStatus === 'fulfilled') {
        await delay(2000);
        await dispatch(getProjects({ authToken: user?.token, userId })).then((result) => setProjects(result?.payload || []));
        showToast({
          title: "Project added successfully!",
          variant: "success",
        });
        setIsSubmitting(false);
        setShowDeleteDialog(false);
        setShowEditDialog(false);
        setTitle('');
        setDescription('');
        setProjectFormData({ title: '', description: '' });
        if (dialogCloseRef.current) {
          dialogCloseRef.current.click();
        }
      } else {
        setIsSubmitting(false);
        setShowDeleteDialog(false);
        setShowEditDialog(false);
        showToast({
          title: "Failed to add project",
          description: result?.payload?.message || "Something went wrong.",
          variant: "error",
        });
      }
    } catch (error) {
      showToast({
        title: "Error adding project",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      setIsSubmitting(true);
      if (!user?.token) {
        showToast({
          title: "Unauthorized",
          description: "Please log in to continue.",
          variant: "warning",
        });
        return;
      }
      const result = await dispatch(deleteProject({ projectId, authToken: user?.token }));
      if (result?.meta?.requestStatus === 'fulfilled') {
        // Fetch updated projects list
        const updatedProjectsResult = await dispatch(getProjects({ authToken: user?.token, userId }));
        const updatedProjects = updatedProjectsResult?.payload || [];
        setProjects(updatedProjects);

        // Determine the next project to select
        if (updatedProjects.length > 0) {
          const deletedProjectIndex = projects.findIndex(p => p.project_id === projectId);
          let nextProjectId = null;
          if (deletedProjectIndex > 0) {
            // Select previous project
            nextProjectId = updatedProjects[deletedProjectIndex - 1]?.project_id;
          } else {
            // Select first project if the deleted one was the first
            nextProjectId = updatedProjects[0]?.project_id;
          }
          if (nextProjectId) {
            await getCollectionsOnProjects(nextProjectId);
          }
        } else {
          // No projects left, clear selection to show home screen
          setSelectedProjectId(null);
          setIsFirstCollection(false);
          setLoadingCollections(false);
        }

        setIsSubmitting(false);
        setShowDeleteDialog(false);
        setShowEditDialog(false);
        showToast({
          title: "Project deleted successfully!",
          variant: "success",
        });
      } else {
        setIsSubmitting(false);
        setShowDeleteDialog(false);
        setShowEditDialog(false);
        showToast({
          title: "Error deleting project",
          description: result?.payload?.message || "Something went wrong.",
          variant: "error",
        });
      }
    } catch (error) {
      setIsSubmitting(false);
      setShowDeleteDialog(false);
      setShowEditDialog(false);
      showToast({
        title: "Error deleting project",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    }
  }

  const handleEditProject = async () => {
    try {
      setIsSubmitting(true);
      if (!user?.token) {
        showToast({
          title: "Unauthorized",
          description: "Please log in to continue.",
          variant: "warning",
        });
        return;
      }

      const result = await dispatch(editProject({
        projectId,
        title: projectFormData.title || selectedTitle,
        description: projectFormData.description || selectedDescription,
        authToken: user?.token
      }));

      if (result?.meta?.requestStatus === 'fulfilled') {
        await delay(2000);
        await dispatch(getProjects({ authToken: user?.token, userId })).then((result) => setProjects(result?.payload || []));
        showToast({
          title: "Project updated successfully!",
          variant: "success",
        });
        setShowEditDialog(false);
        setProjectFormData({ title: '', description: '' });
        if (dialogCloseRef.current) {
          dialogCloseRef.current.click();
        }
      } else {
        showToast({
          title: "Failed to update project",
          description: result?.payload?.message || "Something went wrong.",
          variant: "error",
        });
      }
    } catch (error) {
      showToast({
        title: "Error updating project",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (user?.token && userId) {
      setLoadingProjects(true);
      dispatch(getProjects({ userId, authToken: user?.token }))
        .then((result) => {
          setProjects(result?.payload || []);
        })
        .finally(() => {
          setLoadingProjects(false);
        });
    } else {
      setProjects([]);
      setLoadingProjects(false);
    }
  }, [user?.token, userId, dispatch]);

  useEffect(() => {
    setPageMounted(true);
  }, []);


  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* project Left section */}
      <ProjectSidebar
        setSelectedProjectId={setSelectedProjectId}
        setLoadingCollections={setLoadingCollections}
        setIsFirstCollection={setIsFirstCollection}
        loadingProjects={loadingProjects}
        selectedProjectId={selectedProjectId}
        setShowEditDialog={setShowEditDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        setSelectedTitle={setSelectedTitle}
        setSelectedDiscription={setSelectedDiscription}
        setProjectId={setProjectId}
        setProjectFormData={setProjectFormData}
        setShowSheet={setShowSheet}
        setSelectedProjectCreatedDate={setSelectedProjectCreatedDate}
        setSelectedProjectUpdatedDate={setSelectedProjectUpdatedDate}
        projects={projects}
        getCollectionsOnProjects={getCollectionsOnProjects}
        handleChange={handleChange}
        handleSubmitProject={handleSubmitProject}
        title={title}
        description={description}
        dialogCloseRef={dialogCloseRef}
        isSubmitting={isSubmitting}
      />

      {/* collection Right section */}
      <CollectionSection
        isFirstCollection={isFirstCollection}
        setIsFirstCollection={setIsFirstCollection}
        loadingCollections={loadingCollections}
        selectedProjectId={selectedProjectId}
        collectionList={collectionList}
        setFile={setFile}
        setFileUrl={setFileUrl}
        fileInputRef={fileInputRef}
        handleUploadCollection={handleUploadCollection}
        isSubmitting={isSubmitting}
        handleDeleteCollection={handleDeleteCollection}
        pageMounted={pageMounted}
        formData={formData}
        setFormData={setFormData}
      />
      {/* Edit dialog box */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[480px] dark:bg-gray-800 border-l-4 border-4 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500 bg-white dark:from-gray-900 dark:via-gray-800 dark:to-purple-950 shadow-2xl">
          <div className="space-y-1 pb-4 border-b border-purple-200 dark:border-purple-800">
            <DialogTitle className='text-xl font-bold bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 bg-clip-text text-transparent dark:text-gray-200  '>
              Edit Project
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
              Update the project title and description below.
            </DialogDescription>
          </div>

          <div className="grid gap-6 py-4">
            <div className="group space-y-2">
              <Label
                htmlFor="title-1"
                className="text-sm font-semibold text-indigo-700 dark:text-gray-200 flex items-center gap-1"
              >
                Title
                <span className="text-red-500 dark:text-green-400">*</span>
              </Label>
              <Input
                id="title-1"
                name="title"
                onChange={(e) => setProjectFormData({ ...projectFormData, title: e.target.value })}
                value={projectFormData?.title ?? selectedTitle}
                required
                className="border-2 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md outline-none dark:border dark:border-gray-200"
                placeholder="Enter project title..."
              />
            </div>

            <div className="group space-y-2">
              <Label
                htmlFor="description-1"
                className="text-sm font-semibold text-indigo-700 dark:text-gray-200 flex items-center gap-1"
              >
                Description
                <span className="text-red-500 dark:text-green-400">*</span>
              </Label>
              <Textarea
                id="description-1"
                name="description"
                onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                value={projectFormData?.description ?? selectedDescription}
                required
                className="border-2 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md resize-none outline-none dark:border dark:border-gray-200"
                placeholder="Enter project description..."
              />
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-2 pt-4 border-t border-purple-100 dark:border-purple-900">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="border-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:bg-gray-800 dark:text-gray-200 dark:border dark:border-gray-200 hover:border-purple-400 transition-all duration-200 font-semibold"
              >
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="button"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 hover:from-purple-700 hover:via-indigo-600 hover:to-blue-600 dark:from-gray-800 dark:to-gray-900 dark:border dark:border-gray-200 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
              onClick={handleEditProject}
            >
              {isSubmitting ? (
                <span className='flex gap-2 items-center justify-center'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Processing...
                </span>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Dialog box */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px] dark:bg-gray-900  border-4 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500">
          <DialogTitle className='font-semibold'>Delete Project</DialogTitle>
          <DialogDescription className="text-gray-900 dark:text-gray-200">
            Are you sure you want to delete this project? This action cannot be undone and will remove all associated collections.
          </DialogDescription>
          <DialogFooter className="flex flex-col md:flex-row gap-2 md:gap-0">
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDeleteProject(projectId)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className='flex gap-2 justify-center text-center'><Loader2 className='h-4 w-4 animate-spin' /> Processing...</span>
              ) : (
                <span className="flex gap-1 justify-center text-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </span>
              )}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline" className=" border-2 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500 dark:bg-gray-900">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* settings sheet */}
       <ProjectSettingsSheet
        showSheet={showSheet}
        setShowSheet={setShowSheet}
        selectedTitle={selectedTitle}
        selectedDescription={selectedDescription}
        selectedProjectCreatedDate={selectedProjectCreatedDate}
        selectedProjectUpdatedDate={selectedProjectUpdatedDate}
      />
    </div>
  );
};

export default PdfList;