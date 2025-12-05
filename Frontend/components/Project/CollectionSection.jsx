'use client';
import React from 'react';
import { Loader2, FileText, Plus, Upload, BookOpen, Target, Search, BarChart3, Users, Share2, Zap, Lightbulb, Sparkles, Check, MessageSquare, FileJson } from 'lucide-react';
import Pdfcard from '@/components/PDF/Pdfcard';
import UploadPdf from '@/components/PDF/UploadPdf';
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';

const CollectionSection = ({
    selectedProjectId,
    collectionList,
    isFirstCollection,
    loadingCollections,
    pageMounted,
    setFile,
    fileUrl,
    setFileUrl,
    formData,
    setFormData,
    isSubmitting,
    fileInputRef,
    handleUploadCollection,
    dialogCloseRef,
    projects,
    handleDeleteCollection,
    aiModels,
    // Received new props
    summaryModel,
    setSummaryModel,
    qaModel,
    setQaModel
}) => {
    
    // Filter to only show the requested models
    const supportedModels = aiModels.filter(m => ['chatgpt', 'gemini', 'claude'].includes(m.id));

    // Helper component to render a selection group to avoid code duplication
    const ModelSelectionGroup = ({ title, icon, selectedId, onSelect }) => (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-100 dark:border-gray-700 text-indigo-500">
                    {icon}
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
            </div>
            
            <div className="flex flex-col gap-3">
                {supportedModels.map((model) => {
                    const isSelected = selectedId === model.id;
                    return (
                        <button
                            key={model.id}
                            onClick={() => onSelect(model.id)}
                            className={`
                                relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 w-full text-left group
                                ${isSelected 
                                    ? 'bg-white dark:bg-gray-800 border-indigo-500 shadow-md ring-1 ring-indigo-500/20' 
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:shadow-sm'
                                }
                            `}
                        >
                            {/* Radio Circle Indicator */}
                            <div className={`
                                w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                                ${isSelected
                                    ? 'border-indigo-500 bg-indigo-500' 
                                    : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
                                }
                            `}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>

                            {/* Icon Box */}
                            <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center p-1.5
                                ${isSelected ? `${model.bgColor} ${model.textColor}` : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}
                            `}>
                                {model.icon}
                            </div>

                            <span className={`font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                {model.name}
                            </span>
                            
                            {/* Tag */}
                            {isSelected && (
                                <span className="absolute right-3 text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                                    Active
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full md:w-4/5 md:h-full bg-white dark:bg-gray-800">
            <div className="w-full flex justify-end gap-3 py-3 px-2">
                {/* AI Selection Modal */}
                {selectedProjectId && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-l-4 border-2 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                                <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                                AI Configuration
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] border-l-4 border-4 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500 p-0 overflow-hidden bg-white dark:bg-gray-900">
                            
                            {/* Header */}
                            <div className="p-6 pb-2">
                                <DialogTitle>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400">
                                                AI Model Preferences
                                            </h2>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                                                Customize which AI powers your summaries and Q&A.
                                            </p>
                                        </div>
                                    </div>
                                </DialogTitle>
                            </div>

                            {/* Body - Split View */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Section 1: Summary Model */}
                                <ModelSelectionGroup 
                                    title="Summary Generation" 
                                    icon={<FileJson className="w-4 h-4" />}
                                    selectedId={summaryModel}
                                    onSelect={setSummaryModel}
                                />

                                {/* Section 2: Q&A Model */}
                                <ModelSelectionGroup 
                                    title="Q&A Chatbot" 
                                    icon={<MessageSquare className="w-4 h-4" />}
                                    selectedId={qaModel}
                                    onSelect={setQaModel}
                                />
                            </div>

                            {/* Footer / Info Area */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-amber-500" />
                                    <span>Selections are saved automatically for this session.</span>
                                </div>
                                <DialogClose asChild>
                                    <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md">
                                        Save Configuration
                                    </Button>
                                </DialogClose>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                <UploadPdf
                    setFile={setFile}
                    fileUrl={fileUrl}
                    setFileUrl={setFileUrl}
                    formData={formData}
                    setFormData={setFormData}
                    isSubmitting={isSubmitting}
                    fileInputRef={fileInputRef}
                    handleUploadCollection={handleUploadCollection}
                    dialogCloseRef={dialogCloseRef}
                    selectedProjectId={selectedProjectId}
                    projects={projects}
                />
            </div>

            {/* Rest of the component content remains unchanged */}
            <div className="px-3 py-3">
                {pageMounted && !selectedProjectId && !loadingCollections && (
                    <div className="max-w-6xl mx-auto px-6 py-12">
                         {/* ... Hero Section Code ... */}
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 rounded-full dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 dark:border dark:border-gray-200 mb-6 shadow-lg">
                                <BookOpen className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent dark:text-indigo-100 mb-4">
                                Empowering Your Research Journey
                            </h1>
                            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                                Your intelligent research companion. Organize projects, manage collections, and unlock insights from your academic documents with the power of AI.
                            </p>
                        </div>
                        
                        {/* ... Features Grid ... */}
                        <div className="mb-16">
                            <h2 className="text-2xl font-semibold text-center mb-8 text-gray-800 dark:text-white">
                                What You Can Do
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { icon: <Target className="w-6 h-6" />, title: "Create Projects", description: "Organize your research into focused projects with clear objectives and timelines." },
                                    { icon: <FileText className="w-6 h-6" />, title: "Upload Collections", description: "Add PDF documents, papers, and resources to build comprehensive knowledge bases." },
                                    { icon: <Search className="w-6 h-6" />, title: "Smart Search", description: "Find relevant information across all your documents with AI-powered search capabilities." },
                                    { icon: <BarChart3 className="w-6 h-6" />, title: "Analytics & Insights", description: "Track reading progress, citation patterns, and discover research trends in your collections." },
                                    { icon: <Users className="w-6 h-6" />, title: "Collaborate", description: "Share projects with team members and work together on research initiatives." },
                                    { icon: <Share2 className="w-6 h-6" />, title: "Export & Share", description: "Generate reports, bibliographies, and share findings with the academic community." },
                                ].map((feature, index) => (
                                    <div key={index} className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-300 hover:shadow-lg">
                                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg mb-4 group-hover:scale-110 transition-transform duration-200 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 dark:border dark:border-l-gray-100 dark:border-b-gray-200">
                                            <div className="text-indigo-600 dark:text-indigo-400">{feature.icon}</div>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{feature.title}</h3>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                         {/* ... How it works Section ... */}
                         <div className="mb-16">
                            <h2 className="text-2xl font-semibold text-center mb-8 text-gray-800 dark:text-white">How It Works</h2>
                            <div className="relative">
                                <div className="hidden lg:block absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-blue-200 dark:from-gray-600 dark:via-gray-600 dark:to-gray-600"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[
                                        { step: "01", title: "Start a Project", description: "Create a new research project with a clear title and description of your research goals." },
                                        { step: "02", title: "Build Collections", description: "Upload PDF papers, articles, and documents to create organized knowledge collections." },
                                        { step: "03", title: "Analyze & Discover", description: "Use AI-powered tools to extract insights, find connections, and accelerate your research." },
                                        { step: "04", title: "Collaborate & Share", description: "Invite collaborators, share findings, and contribute to the scholarly community." },
                                    ].map((step, index) => (
                                        <div key={index} className="relative text-center">
                                            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full text-sm font-bold mb-4 relative z-10 shadow-lg dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 dark:border dark:border-l-gray-100 dark:border-b-gray-200">
                                                {step.step}
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{step.title}</h3>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{step.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ... Quick Start Section ... */}
                        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl p-8 border border-indigo-100 dark:border-gray-700">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 rounded-full mb-4 shadow-lg dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 dark:border dark:border-gray-100">
                                    <Zap className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Ready to Get Started?</h2>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                                    Begin your research journey by creating your first project. Organize your academic work, collaborate with peers, and discover new insights in your field.
                                </p>
                            </div>
                        </div>

                         {/* ... Tips Section ... */}
                        <div className="mt-12 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">Pro Tips</h3>
                                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                        <li>• Use descriptive project names to easily identify your research areas</li>
                                        <li>• Tag your collections with relevant keywords for better organization</li>
                                        <li>• Regularly backup your projects to ensure your research is always safe</li>
                                        <li>• Collaborate with peers by sharing project access and insights</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {loadingCollections ? (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500 mb-2" />
                        <span className="text-sm text-gray-500">Loading collections...</span>
                    </div>
                ) : selectedProjectId && collectionList && collectionList.length > 0 ? (
                    collectionList.map((collection, index) => {
                        let metadata = {};
                        try {
                            metadata = collection?.Metadata ? JSON.parse(collection.Metadata) : {};
                        } catch (error) {
                            console.error('Error parsing Metadata for collection:', collection, error);
                        }
                        return (
                            <Pdfcard
                                key={`${collection?.PDFUploadedId}-${collection?.CreatedDate || index}`}
                                title={metadata?.title}
                                author={metadata?.authors}
                                affiliations={metadata?.affiliations}
                                abstract={metadata?.abstract}
                                keywords={metadata?.keywords}
                                publicationDate={metadata?.publication_date}
                                journal={metadata?.journal}
                                doi={metadata?.doi}
                                publisher={metadata?.publisher}
                                openAccessing={metadata?.open_access}
                                figuresCount={metadata?.figures_count}
                                tablesCount={metadata?.tables_count}
                                referencesCount={metadata?.refereces_count}
                                sectionsDetected={metadata?.sections_detected}
                                readabilityScore={metadata?.readability_score}
                                citationCount={metadata?.citation_count}
                                engagementScore={metadata?.engagement_score}
                                summary={collection?.PDFSummary}
                                dateCreated={collection?.CreatedDate}
                                handleDeleteCollection={handleDeleteCollection}
                                id={collection?.PDFUploadedId}
                                pdf={collection?.pdfFile}
                                qa={collection?.QA}
                            />
                        );
                    })
                ) : selectedProjectId && isFirstCollection ? (
                    <div className="flex flex-col items-center justify-center text-center py-5 px-6">
                        <div className="relative mb-6">
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-2 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 dark:border dark:border-gray-200">
                                <FileText className="w-12 h-12 text-indigo-500 dark:text-gray-200" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 dark:bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3 dark:text-gray-200">No collections found</h3>
                        <p className="text-gray-500 mb-4 max-w-md leading-relaxed dark:text-gray-200">
                            You haven't uploaded any PDF collections yet. Start building your knowledge base by uploading your first document.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 max-w-2xl">
                            <div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border dark:border-gray-100">
                                <Upload className="w-8 h-8 text-blue-500 dark:text-gray-200 mb-2" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Upload PDFs</span>
                                <span className="text-xs text-gray-500 text-center dark:text-gray-200">Drag & drop or browse files</span>
                            </div>
                            <div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border dark:border-gray-100">
                                <BookOpen className="w-8 h-8 text-green-500 mb-2 dark:text-gray-200" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Smart Analysis</span>
                                <span className="text-xs text-gray-500 text-center dark:text-gray-200">Automatic content extraction</span>
                            </div>
                            <div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border dark:border-gray-100">
                                <FileText className="w-8 h-8 text-purple-500 mb-2 dark:text-gray-200" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Organize</span>
                                <span className="text-xs text-gray-500 text-center dark:text-gray-200">Manage your library</span>
                            </div>
                        </div>
                        <div className="w-full">
                            <UploadPdf
                                setFile={setFile}
                                fileUrl={fileUrl}
                                setFileUrl={setFileUrl}
                                formData={formData}
                                setFormData={setFormData}
                                isSubmitting={isSubmitting}
                                fileInputRef={fileInputRef}
                                handleUploadCollection={handleUploadCollection}
                                dialogCloseRef={dialogCloseRef}
                                isFirstCollection={isFirstCollection}
                                selectedProjectId={selectedProjectId}
                                projects={projects}
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default CollectionSection;