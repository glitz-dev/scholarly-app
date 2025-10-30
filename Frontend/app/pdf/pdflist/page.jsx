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
  const [selectedModel, setSelectedModel] = useState('chatgpt');

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

  const aiModels = [
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      provider: 'OpenAI',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
        </svg>
      ),
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-600',
    },
    {
      id: 'gemini',
      name: 'Gemini',
      provider: 'Google',
      icon: (
        <svg height="1em" viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"/></svg>
      ),
      color: 'from-blue-500 to-purple-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-600',
    },
    {
      id: 'claude',
      name: 'Claude',
      provider: 'Anthropic',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"/></svg>
      ),
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-600',
    },
    {
      id: 'grok',
      name: 'Grok',
      provider: 'xAI',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: 'from-slate-700 to-slate-900',
      bgColor: 'bg-slate-50 dark:bg-slate-950/30',
      borderColor: 'border-slate-200 dark:border-slate-800',
      textColor: 'text-slate-600',
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      provider: 'deepseek',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" /></svg>
      ),
      color: 'from-indigo-500 to-purple-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      textColor: 'text-indigo-600',
    },
    {
      id: 'mistral',
      name: 'Mistral',
      provider: 'Mistral AI',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z" /><path d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z" fill="#FFAF00"/><path d="M3.428 10.258h17.144v3.428H3.428v-3.428z"/><path d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z"/><path d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z"/></svg>
      ),
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-600',
    },
  ];


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
        aiModels={aiModels}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
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
