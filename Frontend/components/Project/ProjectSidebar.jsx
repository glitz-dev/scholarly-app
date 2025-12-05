import React from 'react'
import { FaHome } from "react-icons/fa";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Loader2, EllipsisVertical, Folder, FolderOpen, Plus, Edit, Trash, Settings } from 'lucide-react';
import GradientIcon from '../Theme/GradientIcon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
const ProjectSidebar = ({
    setSelectedProjectId,
    setLoadingCollections,
    setIsFirstCollection,
    loadingProjects,
    selectedProjectId,
    setShowEditDialog,
    setShowDeleteDialog,
    setSelectedTitle,
    setSelectedDiscription,
    setProjectId,
    setProjectFormData,
    setShowSheet,
    setSelectedProjectCreatedDate,
    setSelectedProjectUpdatedDate,
    projects,
    getCollectionsOnProjects,
    handleChange,
    handleSubmitProject,
    title,
    description,
    dialogCloseRef,
    isSubmitting
}) => {
    return (
        <div className="w-full md:w-1/5 md:h-auto md:overflow-y-auto border-r dark:border-r-gray-500">
            <div className='w-full flex flex-row gap-2 items-center justify-start px-7 py-3 border-b dark:border-b-gray-500'>
                <FaHome className="h-5 w-5 text-indigo-600 dark:text-gray-300" />
                <span onClick={() => {
                    setSelectedProjectId(null);
                    setLoadingCollections(false);
                    setIsFirstCollection(false);
                }} className="cursor-pointer bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 bg-clip-text text-transparent dark:text-gray-100">Home</span>
            </div>

            <Dialog>
                <div className='w-full flex flex-row gap-2 items-center justify-between px-7 py-5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 text-white border-b  dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 dark:border-1 dark:border-t-gray-500 dark:border-b-gray-500'>
                    <span>Projects</span>
                    <DialogTrigger asChild>
                        <Plus className="h-5 w-5 cursor-pointer text-gray-400 hover:text-gray-100 transition-all duration-300 hover:scale-110 hover:rotate-90" />
                    </DialogTrigger>
                </div>

                <div className="px-7 py-4">
                    {loadingProjects ? (
                        <div className="flex flex-col items-center justify-center text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-500 mb-2" />
                            <span className="text-sm text-gray-500 dark:text-gray-100">Loading projects...</span>
                        </div>
                    ) : projects && projects?.length > 0 ? (
                        projects?.map((project, index) => (
                            <div
                                key={project?.ProjectId}
                                className={`w-full flex flex-row items-center justify-between py-3 px-3 rounded-lg 
                     transition-all duration-500 ease-in-out transform
                     ${selectedProjectId === project?.ProjectId
                                        ? 'bg-indigo-50 dark:bg-indigo-900/40 shadow-md border-l-4 border-l-purple-500 dark:border-gray-100 scale-[1.02]'
                                        : 'dark:hover:bg-gray-800 border-l-4 border-l-transparent'
                                    }`}
                            >
                                <div
                                    className="flex flex-row items-center gap-2 cursor-pointer transition-transform duration-500 ease-in-out"
                                    onClick={() => getCollectionsOnProjects(project?.ProjectId)}
                                >
                                    <GradientIcon
                                        Icon={selectedProjectId === project?.ProjectId ? FolderOpen : Folder}
                                        className="h-5 w-5 cursor-pointer transition-transform duration-500 ease-in-out hover:scale-110"
                                    />
                                    <span
                                        className={`text-sm font-medium transition-colors duration-500 ease-in-out ${selectedProjectId === project?.project_id
                                            ? 'text-indigo-700 dark:text-indigo-100 font-semibold'
                                            : 'text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        {project?.Title}
                                    </span>
                                </div>
                                {/* Wrap the Dialog outside */}
                                <Dialog>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <EllipsisVertical className="flex h-4 w-4 cursor-pointer stroke-purple-500 dark:stroke-white justify-end transition-all duration-200 hover:stroke-purple-700 dark:hover:stroke-gray-300 hover:scale-110" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-40 dark:bg-gray-800 dark:border dark:border-white">
                                            <DropdownMenuGroup>
                                                <DropdownMenuItem className="cursor-pointer font-sans text-purple-600 dark:text-white" onClick={() => {
                                                    setShowEditDialog(true)
                                                    setShowDeleteDialog(false)
                                                    setSelectedTitle(project?.Title);
                                                    setSelectedDiscription(project?.Description);
                                                    setProjectId(project?.project_id);
                                                    setProjectFormData({ title: project?.Title, description: project?.Description });
                                                }}>
                                                    <Edit /> Edit
                                                </DropdownMenuItem>

                                                {/* Delete Trigger inside the menu */}
                                                <DialogTrigger asChild>
                                                    <DropdownMenuItem className="cursor-pointer font-sans text-purple-600 dark:text-white" onClick={() => {
                                                        setProjectId(project?.project_id)
                                                        setShowDeleteDialog(true)
                                                        setShowEditDialog(false)
                                                    }}>
                                                        <Trash /> Delete
                                                    </DropdownMenuItem>
                                                </DialogTrigger>
                                                <DropdownMenuItem className="cursor-pointer font-sans text-purple-600 dark:text-white" onClick={() => {
                                                    setShowSheet(true)
                                                    setSelectedTitle(project?.Title);
                                                    setSelectedDiscription(project?.Description);
                                                    setSelectedProjectCreatedDate(project?.CreatedOn);
                                                    setSelectedProjectUpdatedDate(project?.ModifiedOn);
                                                }}>
                                                    <Settings /> Settings
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </Dialog>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="relative mb-3">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 dark:from-gray-800 to-indigo-100 dark:to-gray-800 dark:border dark:border-gray-200 rounded-full flex items-center justify-center mb-2 mt-5">
                                    <FolderOpen className="w-10 h-10 text-blue-500 dark:text-gray-200" />
                                </div>
                                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                    <Plus className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 dark:text-gray-200">
                                No projects yet
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-sm leading-relaxed text-sm px-2 dark:text-gray-400">
                                Start organizing your work by creating your first project. Projects help you keep everything structured and accessible.
                            </p>
                            <DialogTrigger asChild>
                                <Button
                                    variant="default"
                                    className="inline-flex items-center gap-2 bg-blue-600 dark:bg-gray-900 dark:border dark:border-gray-200 hover:bg-blue-700 text-white"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Your First Project
                                </Button>
                            </DialogTrigger>
                        </div>
                    )}
                </div>

                <DialogContent className="sm:max-w-[425px] dark:bg-gray-900 border-4 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500">
                    <form onSubmit={handleSubmitProject}>
                        <DialogHeader>
                            <DialogTitle>Add a project</DialogTitle>
                            <DialogDescription className="text-gray-600 dark:text-gray-200">
                                Add a new project by providing its title and a brief description. Click "Add" to save it to your profile.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4">
                            <div className="grid gap-3">
                                <Label htmlFor="title-1">Title</Label>
                                <Input id="title-1" name="title" onChange={handleChange} value={title} required />
                            </div>
                            <div className="grid gap-3 mb-3">
                                <Label htmlFor="description-1">Description</Label>
                                <Textarea id="description-1" name="description" onChange={handleChange} value={description} required />
                            </div>
                        </div>
                        <DialogFooter className="flex gap-2 md:gap-0">
                            <DialogClose asChild>
                                <Button variant="outline" ref={dialogCloseRef} className="dark:bg-gray-900 dark:border dark:border-gray-200">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <span className='flex gap-2 justify-center text-center'><Loader2 className='h-4 w-4 animate-spin' /> Adding...</span>
                                ) : (<span>Add</span>)}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ProjectSidebar
