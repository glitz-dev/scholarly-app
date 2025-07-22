'use client'
import Pdfcard from '@/components/PDF/Pdfcard'
import SearchPdf from '@/components/PDF/SearchPdf'
import UploadPdf from '@/components/PDF/UploadPdf'
import useUserId from '@/hooks/useUserId'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { deletePdf, getCollections, saveFile, searchPdf } from '@/store/pdf-slice';
import { useCustomToast } from '@/hooks/useCustomToast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { FileText, Upload, GraduationCap } from 'lucide-react'

const PdfList = () => {
  const { collectionList } = useSelector((state) => state.collection);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const userId = useUserId();
  const { showToast } = useCustomToast();

  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [searchingCollections, setSearchingCollections] = useState(false);
  const [searchedCollectionList, setSearchedCollectionList] = useState([]);
  const [listOfCollections, setListOfCollections] = useState([]);
  const [showActions, setShowActions] = useState(false);
  const [formData, setFormData] = useState({
    article: '',
    url: '',
    pubmedid: '',
    author: '',
    doi: '',
    file: ''
  });

  // Upload collection
  const handleUploadCollection = useCallback(async () => {
    try {
      setLoadingCollections(false)
      setIsSubmitting(true)
      if (!user?.token) {
        showToast({
          title: "Unauthorized",
          description: "Please log in to continue.",
          variant: "warning",
        });
      }

      const form = new FormData();
      form.append('article', formData.article);
      form.append('url', formData.url);
      form.append('pubmedid', formData.pubmedid);
      form.append('author', formData.author);
      form.append('doi', formData.doi);
      form.append('userId', userId)
      form.append('file', formData.file);

      const result = await dispatch(saveFile({ formData: form, authToken: user?.token }));
      console.log('...result', result);
      if (result?.meta?.requestStatus
        === 'fulfilled') {
        showToast({
          title: 'File Uploaded Successfully',
          variant: "success"
        })
        dispatch(getCollections({ authToken: user?.token })).then((result) => {
          setLoadingCollections(false)
        })
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // resets the file input
        }
        setFileUrl(null)
        setFile(null)
        setFormData({
          article: '',
          url: '',
          file: '',
          pubmedid: '',
          author: '',
          doi: '',
          userId: ''
        })

      } else {
        showToast({
          title: "Upload failed",
          description: result?.payload?.message || "Failed to upload the collection.",
          variant: "destructive",
        });
      }
    } catch (err) {
      showToast({
        title: "Something went wrong",
        description: err?.message || "Unable to upload the collection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false)
    }

  }, [dispatch, formData, user?.token, userId, showToast])

  // Delete collection
  const handleDeleteCollection = useCallback(
    async (id) => {
      try {
        setLoadingCollections(false)
        const result = await dispatch(deletePdf({ userId, id, authToken: user?.token }))
        if (result?.payload?.success) {
          setListOfCollections((prev) => prev.filter((c) => c.id !== id))
          dispatch(getCollections({ userId, authToken: user?.token }))
          showToast({
            title: "Collection deleted successfully!",
            variant: "success",
          });
        } else {
          showToast({
            title: "Failed to delete collection",
            description: result?.payload?.message || "Something went wrong while deleting.",
            variant: "destructive",
          });
        }
      } catch (error) {
        showToast({
          title: "Error deleting collection",
          description: error?.message || "Please try again later.",
          variant: "destructive",
        });
      }
    }, [dispatch, userId, user?.token, showToast])

  // Search collection
  const handleSearchCollection = useCallback((keyword) => {
    setSearchingCollections(true)
    try {
      dispatch(searchPdf({ keyword, userId, authToken: user?.token })).then((result) => {
        setSearchingCollections(false)
        if (result?.payload?.success) {
          setSearchedCollectionList(result?.payload?.data);
        }
      })
    } catch (error) {
      setSearchingCollections(false)
      console.log(error)
    }
  }, [dispatch, userId, user?.token])

  // Fetch collections on mount
  useEffect(() => {
    setShowActions(true)
    setLoadingCollections(true)
    if (user?.token) {
      dispatch(getCollections({ authToken: user?.token })).then((result) => {
        setLoadingCollections(false)
      })
    }
  }, [dispatch, user?.token, showActions])

  useEffect(() => {
    if (Array.isArray(collectionList)) {
      setListOfCollections(collectionList);
    }
  }, [collectionList]);

  useEffect(() => {
    setLoadingCollections(true)
  }, [])
  console.log('....listOfCollections', listOfCollections)
  
  return (
    <div className="flex flex-col gap-6 h-full bg-white dark:bg-gray-800 dark:text-white">
      {/* Enhanced Upload PDF Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm border border-blue-200 dark:border-gray-600 overflow-hidden">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="px-4 py-5 hover:no-underline hover:bg-blue-100/50 dark:hover:bg-gray-700/50 transition-colors duration-200 [&[data-state=open]]:bg-blue-100/70 dark:[&[data-state=open]]:bg-gray-700/70">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg">
                  <GraduationCap className="w-8 h-6 md:w-6 md:h-6 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                    Upload Academic Paper
                  </h2>
                  <p className="hidden md:block text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Add research papers, articles, and academic documents to your collection
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 md:px-6 pb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner border border-gray-100 dark:border-gray-600">
                <UploadPdf 
                  setFile={setFile} 
                  fileUrl={fileUrl} 
                  setFileUrl={setFileUrl} 
                  formData={formData} 
                  setFormData={setFormData} 
                  isSubmitting={isSubmitting} 
                  fileInputRef={fileInputRef} 
                  handleUploadCollection={handleUploadCollection} 
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Search PDF */}
      {/* <div className="group border-l-4 border-transparent bg-white shadow-lg flex items-center px-7 py-10 md:py-7 lg:py-7 dark:bg-gray-900 rounded-lg">
        <SearchPdf handleSearchCollection={handleSearchCollection} setSearchingCollections={setSearchingCollections} searchedCollectionList={searchedCollectionList} setSearchedCollectionList={setSearchedCollectionList} searchingCollections={searchingCollections} />
      </div> */}
      
      {/* List PDFs */}
      <div className="group border-l-4 border-transparent bg-transparent flex flex-col px-0 md:px-7 lg:px-7 flex-1 rounded-lg">
        <div className="flex items-center gap-3 my-4">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h1 className='font-semibold text-blue-600 dark:text-blue-400 text-lg'>My Collections</h1>
        </div>
        {loadingCollections ? (
          <div className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500">Loading collections...</span>
            </div>
          </div>
        ) : (
          listOfCollections && listOfCollections.length > 0 ? (
            <div className="space-y-4">
              {listOfCollections.map((collection, index) => (
                <Pdfcard 
                  key={index} 
                  id={collection.PDFUploadedId} 
                  article={collection.Article} 
                  author={collection.Author} 
                  doi={collection.DOINo} 
                  pdf={collection.PDFPath} 
                  pubmedId={collection.PUBMEDId} 
                  handleDeleteCollection={handleDeleteCollection} 
                  showActions={showActions} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className='text-gray-500 dark:text-gray-400 text-lg font-medium'>No Collections Found</h3>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Start by uploading your first academic paper above</p>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default PdfList