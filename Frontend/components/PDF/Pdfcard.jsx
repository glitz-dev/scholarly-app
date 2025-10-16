import React, { useState } from 'react';
import { Download, Edit, Globe, Loader2, Trash, FileText, User, Hash, Link, MessageCircle, Eye, Calendar, ExternalLink, BookOpen, Save, X, Edit3, Newspaper } from 'lucide-react';
import { formatDistanceToNow } from "date-fns";
import { Button } from '@/components/ui/button';
import { SiLibreofficewriter, SiOpenaccess } from "react-icons/si";
import { CiCalendarDate } from "react-icons/ci";
import { LiaUniversitySolid } from "react-icons/lia";
import { GiAbstract002, GiFigurehead } from "react-icons/gi";
import { VscSymbolKeyword } from "react-icons/vsc";
import { FaJournalWhills } from "react-icons/fa";
import { SiDoi } from "react-icons/si";
import { MdPublish, MdOutlineTableChart, MdScore } from "react-icons/md";
import { VscReferences } from "react-icons/vsc";
import { BsSignIntersectionSide } from "react-icons/bs";
import { PiClockCounterClockwise } from "react-icons/pi";
import { AiOutlineInteraction } from "react-icons/ai";
import { RiQuestionAnswerLine } from "react-icons/ri";
import ConfirmDialog from '@/common/ConfirmDialog';
import { useCustomToast } from '@/hooks/useCustomToast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import { marked } from "marked";
import "react-quill-new/dist/quill.snow.css";
import { useDispatch, useSelector } from 'react-redux';
import { getUploadedPdf } from '@/store/pdf-slice';
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const PdfCard = ({
  title,
  author,
  affiliations,
  abstract,
  keywords,
  publicationDate,
  journal,
  doi,
  publisher,
  openAccessing,
  figuresCount,
  tablesCount,
  referencesCount,
  sectionsDetected,
  readabilityScore,
  citationCount,
  engagementScore,
  summary,
  dateCreated,
  handleDeleteCollection,
  id,
  pdf,
  qa
}) => {
  const [openAccess, setOpenAccess] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useCustomToast();
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const alteredSummaryText = summary?.[0]?.summary ?? "";
  const alteredSummary = alteredSummaryText
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");

  const alteredSummaryHtml = marked.parse(alteredSummary.replace(/\n/g, "<br>"));

  // Initialize edited summary when component mounts or summary changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditedSummary(alteredSummaryHtml);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let parsedQA = {};
  try {
    if (qa) {
      let initialParsedQA = JSON.parse(qa);
      if (typeof initialParsedQA === 'string') {
        initialParsedQA = JSON.parse(initialParsedQA);
      }
      parsedQA = initialParsedQA;
    }
  } catch (error) {
    console.error("Error parsing QA:", error);
    showToast({
      title: "Error",
      description: "Failed to parse Q&A data.",
      variant: "error",
    });
  }

  const questionAndAnswers = Object.entries(parsedQA).map(([question, details]) => ({
    question,
    answer: details.answer,
  }));

  const handlePdfClick = async () => {
    try {
      const result = await dispatch(
        getUploadedPdf({ uploadId: id, authToken: user?.token })
      );

      if (result.meta.requestStatus === "fulfilled") {
        const blob = result.payload;
        const blobUrl = URL.createObjectURL(blob);

        // Navigate to PdfViewer page with blobUrl
        window.open(`/pdf-viewer/${id}?url=${encodeURIComponent(blobUrl)}`, '_blank');
      } else {
        showToast({
          title: "Error",
          description: "Failed to fetch PDF",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching PDF:", error);
      showToast({
        title: "Error",
        description: "Could not load the PDF.",
        variant: "error",
      });
    }
  };

  const toggleAccess = () => {
    setOpenAccess(!openAccess);
    showToast({
      title: openAccess ? "Access set to closed" : "Access set to open",
      description: openAccess
        ? "This collection is now marked as Closed Access."
        : "This collection is now marked as Open Access.",
      variant: "info"
    });
  };

  const handleSaveSummary = () => {
    // Here you would typically call an API to save the edited summary
    setIsEditing(false);
    showToast({
      title: "Summary Updated",
      description: "Your changes have been saved successfully.",
      variant: "success"
    });
  };

  const handleCancelEdit = () => {
    setEditedSummary(alteredSummaryHtml);
    setIsEditing(false);
    setActiveTab('view');
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setActiveTab('edit');
  };

  const handleDeleteWithAnimation = () => {
    setIsDeleting(true);

    // Wait for animation to complete before calling the actual delete function
    setTimeout(() => {
      handleDeleteCollection(id);
    }, 700); // Match the animation duration
  };

  console.log('...questionAndAnswers', questionAndAnswers)

  return (
    <div className={`transition-all duration-700 ease-in ${isDeleting ? 'flip-out-animation' : ''
      }`}>
      <style jsx>{`
        .flip-out-animation {
          animation: flipOut 1s ease-in forwards;
          transform-style: preserve-3d;
        }
        @keyframes flipOut {    
          0% { 
            transform: rotateY(0deg) scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: rotateY(-90deg) scale(0.8); 
          }
          100% { 
            transform: rotateY(-180deg) scale(0); 
            opacity: 0; 
          }
        }
      `}</style>

      <Accordion
        type="single"
        collapsible
        className="w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 dark:from-blue-950/50 dark:to-indigo-950/50 text-gray-800  shadow-sm shadow-indigo-100 px-3 mb-[1px] rounded-md"
      >
        <AccordionItem value="item-1">
          <AccordionTrigger className="w-full text-left hover:no-underline group/trigger">
            <div className="flex flex-row gap-2">
              <Newspaper className="h-4 w-4 text-white hidden md:block" />
              <span className="text-white">{title || 'Title Not specified'}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="dark:from-blue-950/50 dark:to-indigo-950/50 dark:text-white">
            <div className='flex justify-start mb-1 text-white dark:text-gray-300 text-xs'>
              <span>{formatDistanceToNow(new Date(dateCreated), { addSuffix: true })}</span>
            </div>
            {/* larger screen metadata content */}
            <div className="hidden md:grid grid-cols-[200px_1fr] gap-y-1 text-balance bg-gradient-to-r from-gray-100 to-gray-100 px-3 py-3 rounded-md mb-0 dark:from-blue-950/50 dark:to-indigo-950/50 dark:text-gray-300 dark:border dark:border-gray-400">
              <div className="flex flex-row gap-1 items-center font-semibold text-left"><SiLibreofficewriter className="h-3 w-3" /> Author(s) :</div>
              <div>{author || 'N/A'}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"> <LiaUniversitySolid className="h-5 w-5" /> Affiliations :</div>
              <div>{affiliations || 'N/A'}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"> <GiAbstract002 className="h-4 w-4" /> Abstract :</div>
              <div>{abstract || 'N/A'}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"> <VscSymbolKeyword className="h-4 w-4" /> Keywords :</div>
              <div>{keywords || 'N/A'}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><CiCalendarDate className="h-4 w-4" /> Publication Date :</div>
              <div>{publicationDate || 'N/A'}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><FaJournalWhills className="h-4 w-4" /> Journal :</div>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(journal)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400">{journal || 'N/A'}</a>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><SiDoi className="h-4 w-4" /> DOI :</div>
              <a className='text-blue-600 cursor-pointer hover:underline dark:text-blue-400' href={`https://doi.org/${doi}`} target="_blank">{doi || 'N/A'}</a>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><MdPublish className="h-4 w-4" /> Publisher :</div>
              <a href={
                publisher?.startsWith('http')
                  ? publisher
                  : `https://www.google.com/search?q=${encodeURIComponent(publisher)}`
              }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400">{publisher || 'N/A'}</a>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><SiOpenaccess className="h-4 w-4" /> Open Access :</div>
              <div>{openAccess || 'N/A'}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><GiFigurehead className="h-4 w-4" /> Figures Count :</div>
              <div>{figuresCount || 0}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><MdOutlineTableChart className="h-4 w-4" /> Tables Count :</div>
              <div>{tablesCount || 0}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><VscReferences className="h-4 w-4" /> References Count :</div>
              <div>{referencesCount || 0}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><BsSignIntersectionSide className="h-4 w-4" /> Sections Detected :</div>
              <div>{sectionsDetected || 'N/A'}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><MdScore className="h-4 w-4" /> Readability Score :</div>
              <div>{readabilityScore || 'N/A'}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><PiClockCounterClockwise className="h-4 w-4" /> Citation Count :</div>
              <div>{citationCount || 0}</div>

              <div className="flex flex-row gap-1 items-center font-semibold text-left"><AiOutlineInteraction className="h-4 w-4" /> Engagement Score :</div>
              <div>{engagementScore || '0.0'}</div>
            </div>
            {/* smaller screen metadata content */}
            <div className="block md:hidden bg-white px-3 py-3 rounded-md mb-0">
              <div className='w-full'><span className="font-semibold w-full">Author(s) :</span><span className="font-normal">{author || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Affiliations :</span> <span className="font-normal">{affiliations || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Abstract :</span> <span className="font-normal">{abstract || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Keywords :</span><span className="font-normal">{keywords || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Publication Date :</span><span className="font-normal">{publicationDate || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Journal :</span><span className="font-normal">{journal || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">DOI :</span><span className="font-normal">{doi || 'N/A'}</span> </div>
              <div className="w-full"><span className="font-semibold w-full">Publisher :</span><span className="font-normal">{publisher || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Open Access :</span><span className="font-normal">{openAccess || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Figures Count :</span><span className="font-normal">{figuresCount || 0}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Tables Count :</span><span className="font-normal">{tablesCount || 0}</span></div>
              <div className="w-full"><span className="font-semibold w-full">References Count :</span><span className="font-normal">{referencesCount || 0}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Sections Detected :</span><span className="font-normal">{sectionsDetected || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Readability Score :</span><span className="font-normal">{readabilityScore || 'N/A'}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Citation Count :</span><span className="font-normal">{citationCount || 0}</span></div>
              <div className="w-full"><span className="font-semibold w-full">Engagement Score :</span><span className="font-normal">{engagementScore || '0.0'}</span></div>
            </div>
            <div className='w-full flex justify-between'>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-28 mt-2 md:mt-2 md:w-auto bg-transparent dark:hover:bg-gray-300 dark:hover:text-gray-900 border border-white dark:text-white">
                    <BookOpen className="hidden md:block mr-2 h-4 w-4" />
                    View Summary
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-full max-h-full w-full h-full flex flex-col border-4 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500">
                  <DialogHeader>
                    <DialogTitle>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex-1 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                      <div className="flex-1 overflow-hidden">
                        <TabsContent value="view" className="h-full mt-0">
                          <div className="h-full border rounded-lg bg-gray-50 dark:bg-gray-900/50 overflow-hidden flex flex-col">
                            <div className="p-4 border-b bg-white dark:bg-gray-800 flex-shrink-0">
                              <div className="flex items-center justify-between">
                                <h3 className="flex gap-1 font-medium text-gray-900 dark:text-white"><FileText className="h-5 w-5" />
                                  Summary<span className='hidden md:block'> - {title}</span></h3>
                                <Button
                                  onClick={handleEditClick}
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-2"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                              <div
                                className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: alteredSummaryHtml }}
                              />
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="edit" className="h-full mt-0">
                          <div className="h-full border rounded-lg bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
                            <div className="p-4 border-b flex-shrink-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900 dark:text-white">Edit Summary</h3>
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={handleCancelEdit}
                                    size="sm"
                                    variant="ghost"
                                    className="flex items-center gap-2"
                                  >
                                    <X className="h-4 w-4" />
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleSaveSummary}
                                    size="sm"
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Save className="hidden md:block h-4 w-4 dark:text-white" />
                                    <span className="dark:text-white">Save</span> <span className='hidden md:block dark:text-white'>Changes</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 overflow-hidden p-4">
                              <div className="h-full">
                                <ReactQuill
                                  theme="snow"
                                  className="h-full text-gray-800 dark:text-gray-300 font-sans"
                                  value={editedSummary}
                                  onChange={setEditedSummary}
                                  modules={{
                                    toolbar: [
                                      ['bold', 'italic', 'underline'],
                                      [{ list: 'ordered' }, { list: 'bullet' }],
                                      ['link']
                                    ]
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex items-center gap-0 md:gap-2 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white bg-transparent hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-300 mt-3"
                  onClick={handlePdfClick}
                >
                  <FileText size={16} className="mr-0 dark:text-gray-800" />
                  <span className="hidden md:block lg:block dark:text-gray-800">View PDF</span>
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white bg-transparent hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-300 mt-3"
                    >
                      <RiQuestionAnswerLine size={16} className="mr-0 dark:text-gray-800" />
                      <span className="hidden md:block lg:block dark:text-gray-800">Q&A</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-full max-h-full w-full h-full flex flex-col border-4 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500">
                    <DialogHeader>
                      <DialogTitle>Asked questions & Answers about the document</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-screen overflow-y-auto ">
                      {questionAndAnswers.length > 0 ? (
                        questionAndAnswers.map((item, index) => (
                          <div key={index} className="p-2 border-b border-gray-300">
                            <div className="flex items-center mb-1 space-x-2">
                              <p className="font-semibold">{index + 1}.</p>
                              <p className="font-semibold">{item.question}</p>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 px-5">{item.answer}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4">
                          <p className="text-gray-500">No Q&A data available.</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <ConfirmDialog
                  iconTrigger={
                    <Button
                      variant="warning"
                      size="sm"
                      className="text-white bg-transparent hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-300 mt-2"
                    >
                      <Trash size={16} className="mr-0" />
                      <span className="hidden md:block lg:block">Delete</span>
                    </Button>
                  }
                  title="Are you sure you want to delete this collection?"
                  variant="danger"
                  onConfirm={handleDeleteWithAnimation}
                  onCancel={() => console.log("Cancelled")}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default React.memo(PdfCard);