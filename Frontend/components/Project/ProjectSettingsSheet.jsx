'use client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Settings } from 'lucide-react';
import React from 'react';

const ProjectSettingsSheet = ({
    showSheet,
    setShowSheet,
    selectedTitle,
    selectedDescription,
    selectedProjectCreatedDate,
    selectedProjectUpdatedDate,
}) => {
    return (
        <Sheet open={showSheet} onOpenChange={setShowSheet}>
            <SheetContent className="border-l-4 border-l-purple-500 dark:border-l-gray-500 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900">
                <SheetHeader className="space-y-3 pb-6 border-b border-purple-200 dark:border-purple-800">
                    <SheetTitle className="flex flex-row items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg dark:from-gray-900 dark:via-gray-700 dark:to-gray-800 dark:border dark:border-gray-500">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 dark:from-gray-200 dark:via-gray-200 dark:to-gray-200 bg-clip-text text-transparent font-bold text-2xl">
                            Settings
                        </span>
                    </SheetTitle>
                    <SheetDescription className="text-gray-600 dark:text-gray-300 text-sm">
                        View your project details and metadata information.
                    </SheetDescription>
                </SheetHeader>

                <div className="grid gap-6 py-6">
                    <div className="group space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                            Project Title
                        </Label>
                        <Input
                            id="name"
                            value={selectedTitle || 'No Title provided'}
                            className="bg-white dark:bg-gray-800 border-2 text-gray-800 dark:text-gray-200 font-medium transition-all duration-200 shadow-sm hover:shadow-md outline-none border-none"
                            readOnly
                        />
                    </div>

                    <div className="group space-y-2">
                        <Label htmlFor="username" className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                            Project Description
                        </Label>
                        <Textarea
                            id="username"
                            value={selectedDescription || 'No Description provided'}
                            className="h-40 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 min-h-[100px] transition-all duration-200 shadow-sm hover:shadow-md resize-none outline-none border-none"
                            readOnly
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="group space-y-2">
                            <Label htmlFor="created" className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                                Date Created
                            </Label>
                            <Input
                                id="created"
                                value={selectedProjectCreatedDate ? new Date(selectedProjectCreatedDate).toLocaleDateString() : 'N/A'}
                                className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 text-purple-700 dark:text-gray-200 font-semibold transition-all duration-200 shadow-sm"
                                readOnly
                            />
                        </div>

                        <div className="group space-y-2">
                            <Label htmlFor="accessed" className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                                Last Accessed
                            </Label>
                            <Input
                                id="accessed"
                                value={selectedProjectUpdatedDate ? new Date(selectedProjectUpdatedDate).toLocaleDateString() : 'N/A'}
                                className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 dark:border-gray-800 text-blue-700 dark:text-gray-200 font-semibold transition-all duration-200 shadow-sm"
                                readOnly
                            />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default ProjectSettingsSheet;