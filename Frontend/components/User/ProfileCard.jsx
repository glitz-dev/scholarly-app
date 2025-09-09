'use client'
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import EditProfileModal from "./EditProfileModal";
import { User, GraduationCap, MapPin, Mail, Building, Briefcase, Code, Edit3 } from "lucide-react";

const ProfileCard = ({userProfileData}) => {
  // EditProfileModal only updates when userProfileData changes
  const memoizedEditProfileModal = useMemo(() => {
    return <EditProfileModal editProfileData={userProfileData} />
  }, [userProfileData]);

  return (
    <div className="w-full sm:max-w-4xl mx-auto px-0 md:px-8">
      <Card className="bg-white dark:bg-slate-900 shadow-xl border-0 sm:rounded-2xl overflow-hidden">
        {/* Profile Header - More Professional Design */}
        <CardHeader className="bg-slate-50 dark:bg-slate-800 border border-slate-200  dark:border-slate-500 rounded-lg px-4 sm:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="h-16 w-16 md:h-20 md:w-20 bg-slate-600 dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -bottom-1 md:-bottom-2 -right-1 md:-right-2 h-4 w-4 md:h-6 md:w-6 bg-emerald-500 rounded-full border-3 border-white dark:border-slate-800"></div>
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {userProfileData?.FirstName} {userProfileData?.LastName}
                </h1>
                <p className="text-sm md:text-lg text-slate-600 dark:text-slate-400 font-medium">
                  {userProfileData?.CurrentPosition || "Professional"}
                </p>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-500 mt-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {userProfileData?.CurrentLocation || "Location not specified"}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-lg">
                Active
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Personal Information Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Personal Information
                </h2>
              </div>
              
              <div className="space-y-4">
                <ProfessionalField 
                  icon={<User className="h-4 w-4 text-slate-600 dark:text-white" />}
                  label="First Name" 
                  value={userProfileData?.FirstName} 
                />
                <ProfessionalField 
                  icon={<User className="h-4 w-4 text-slate-600 dark:text-white" />}
                  label="Last Name" 
                  value={userProfileData?.LastName} 
                />
                <ProfessionalField 
                  icon={<Mail className="h-4 w-4 text-slate-600 dark:text-white" />}
                  label="Email Address" 
                  value={userProfileData?.EmailID} 
                  isEmail={true}
                />
                <ProfessionalField 
                  icon={<MapPin className="h-4 w-4 text-slate-600 dark:text-white" />}
                  label="Current Location" 
                  value={userProfileData?.CurrentLocation} 
                />
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Educational Information
                </h2>
              </div>
              
              <div className="space-y-4">
                <ProfessionalField 
                  icon={<Building className="h-4 w-4 text-slate-600 dark:text-white" />}
                  label="University" 
                  value={userProfileData?.University} 
                />
                <ProfessionalField 
                  icon={<Briefcase className="h-4 w-4 text-slate-600 dark:text-white" />}
                  label="Current Position" 
                  value={userProfileData?.CurrentPosition} 
                />
                <ProfessionalField 
                  icon={<Code className="h-4 w-4 text-slate-600 dark:text-white" />}
                  label="Area of Expertise" 
                  value="Computer Programming" 
                />
                <ProfessionalField 
                  icon={<GraduationCap className="h-4 w-4 text-slate-600 dark:text-white" />}
                  label="Education Level" 
                  value="Graduate" 
                />
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex justify-end mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                {memoizedEditProfileModal}
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ProfessionalField = React.memo(
  ({ icon, label, value, isEmail = false }) => (
    <div className="group">
      <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200">
        <div className="flex-shrink-0 p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 group-hover:shadow-md transition-shadow duration-200">
          {icon}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {label}
          </Label>
          <div className={`text-base font-medium text-slate-900 dark:text-slate-100 ${
            isEmail ? 'break-all' : ''
          }`}>
            {value || (
              <span className="text-slate-400 dark:text-slate-500 italic">
                Not specified
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
);

export default React.memo(ProfileCard);