import React, { useState } from 'react';
import { Download, Edit, Globe, Loader2, Trash, FileText, User, Hash, Link, MessageCircle, Eye, Calendar, ExternalLink, BookOpen, Save, X, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/common/ConfirmDialog';
import { useCustomToast } from '@/hooks/useCustomToast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import { marked } from "marked";
import "react-quill-new/dist/quill.snow.css";
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const PdfCard = ({
  article,
  author,
  doi,
  id,
  pubmedId,
  publisher,
  copyright,
  summary,
  showActions,
  handleDeleteCollection
}) => {
  const [openAccess, setOpenAccess] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const { showToast } = useCustomToast();

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

  const handlePdfClick = async () => {
    try {
      window.open(`/viewer?uploadId=${id}`, '_blank');
    } catch (error) {
      showToast({
        title: "Error",
        description: "Could not load the PDF. Please try again.",
        variant: "destructive",
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

  return (
    <Card className="w-full mb-6 border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 hover:border-gray-300 hover:shadow-lg transition-all duration-200 group">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex items-start mb-1 min-w-full">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <FileText size={20} className="text-gray-600 dark:text-gray-400" />
                </div>
                <Badge
                  variant={openAccess ? "default" : "secondary"}
                  className={`text-xs font-medium ${openAccess
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                >
                  {openAccess ? 'Open Access' : 'Restricted'}
                </Badge>
              </div>

              <h2
                onClick={handlePdfClick}
               className="text-base md:text-xl font-semibold text-gray-900 dark:text-white leading-tight cursor-pointer 
             hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 mb-1 truncate"
              >
                {article}
              </h2>

              <p className="text-xs md:text-sm lg:text-sm text-gray-600 dark:text-gray-400 font-medium mb-4">
                {author}
              </p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="hidden md:block md:grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-1">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                PubMed ID
              </dt>
              <dd className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border">
                {pubmedId || '—'}
              </dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                DOI
              </dt>
              <dd className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border truncate">
                {doi || '—'}
              </dd>
            </div>

            <div className="space-y-1">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Annotations
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border">
                0 annotations
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Comments
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border">
                No comments added
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Publisher
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border">
                {publisher || 'No publisher information available'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                CopyRight Information
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border">
                {copyright || 'No copyright information available'}
              </dd>
            </div>
          </div>

          {/* Mobile Details Accordion */}
          <Accordion type="single" collapsible className="md:hidden mb-3 md:mb-6">
            <AccordionItem value="details" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                Additional Details
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      PubMed ID
                    </dt>
                    <dd className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border">
                      {pubmedId || '—'}
                    </dd>
                  </div>

                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      DOI
                    </dt>
                    <dd className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border truncate">
                      {doi || '—'}
                    </dd>
                  </div>

                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Annotations
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border">
                      0 annotations
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Comments
                    </dt>
                    <dd className="text-sm text-gray-600 dark:text-gray-400 italic">
                      No comments added
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Publisher
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border">
                      {publisher || 'No publisher information available'}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      CopyRight Information
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md border">
                      {copyright || 'No copyright information available'}
                    </dd>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Actions Bar */}
          {showActions && (
            <div className="flex flex-row items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-0 md:gap-2 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAccess}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Globe size={16} className="mr-0 md:mr-1 lg:mr-1 dark:text-white" />
                  <span className="hidden md:block lg:block dark:text-white">{openAccess ? 'Make Private' : 'Make Public'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Download size={16} className="mr-0 md:mr-1 lg:mr-1 dark:text-white" />
                  <span className="hidden md:block lg:block dark:text-white">Export</span>
                </Button>

                <ConfirmDialog
                  iconTrigger={
                    <Button
                      variant="warning"
                      size="sm"
                      className="text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash size={16} className="mr-0 md:mr-1 lg:mr-1 dark:text-white" />
                      <span className="hidden md:block lg:block dark:text-white">Delete</span>
                    </Button>
                  }
                  title="Are you sure you want to delete this collection"
                  variant="danger"
                  onConfirm={() => handleDeleteCollection(id)}
                  onCancel={() => console.log("Cancelled")}
                />
              </div>
              <div>
                {/* Summary Section */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-28 mt-2 md:mt-0 md:w-auto bg-blue-400 text-white md:text-black md:bg-transparent md:hover:bg-gray-900 md:hover:text-white dark:bg-transparent dark:text-white dark:border border-white dark:hover:bg-white dark:hover:text-black text-xs md:text-sm lg:text-sm flex items-center gap-2">
                      <BookOpen className="hidden md:block mr-2 h-4 w-4" />
                      View Summary
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-full max-h-full w-full h-full flex flex-col">
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
                                    Summary<span className='hidden md:block'> - {article}</span></h3>
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
                                      <Save className="hidden md:block h-4 w-4" />
                                      <span>Save</span> <span className='hidden md:block'>Changes</span>
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
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(PdfCard);