'use client'
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import React, { useState } from "react";
import { AlertTriangle, AlertCircle, Info, CheckCircle, X } from "lucide-react";
import DialogButton from "./DialogButton";

const ConfirmDialog = ({
  triggerText,
  iconTrigger,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  ButtonStyle,
  variant = "default",
  size = "default"
}) => {
  const [openModal, setOpenModal] = useState(false);

  const handleConfirm = () => {
    setOpenModal(false);
    onConfirm && onConfirm();
  };

  const handleCancel = () => {
    setOpenModal(false);
    onCancel && onCancel();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          icon: <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />,
          iconBg: "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30",
          borderColor: "border-amber-200 dark:border-amber-800/50",
          titleColor: "text-amber-900 dark:text-amber-100",
          pulseColor: "animate-pulse"
        };
      case "danger":
        return {
          icon: <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />,
          iconBg: "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30",
          borderColor: "border-red-200 dark:border-red-800/50",
          titleColor: "text-red-900 dark:text-red-100",
          pulseColor: "animate-pulse"
        };
      case "success":
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />,
          iconBg: "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30",
          borderColor: "border-green-200 dark:border-green-800/50",
          titleColor: "text-green-900 dark:text-green-100",
          pulseColor: ""
        };
      case "info":
        return {
          icon: <Info className="h-8 w-8 text-blue-600 dark:text-blue-400" />,
          iconBg: "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30",
          borderColor: "border-blue-200 dark:border-blue-800/50",
          titleColor: "text-blue-900 dark:text-blue-100",
          pulseColor: ""
        };
      default:
        return {
          icon: <AlertTriangle className="h-8 w-8 text-slate-600 dark:text-slate-400" />,
          iconBg: "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/30 dark:to-slate-700/30",
          borderColor: "border-slate-200 dark:border-slate-700/50",
          titleColor: "text-slate-900 dark:text-slate-100",
          pulseColor: ""
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "max-w-sm";
      case "lg":
        return "max-w-2xl";
      default:
        return "max-w-lg";
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Dialog open={openModal} onOpenChange={setOpenModal}>
      <DialogTrigger asChild>
        {iconTrigger ? (
          <span className="cursor-pointer hover:opacity-80 transition-all duration-200 hover:scale-105 active:scale-95">
            {iconTrigger}
          </span>
        ) : (
          <Button 
            variant="outline" 
            className={`transition-all duration-200 hover:scale-105 active:scale-95 ${ButtonStyle}`}
          >
            {triggerText}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className={`
        ${sizeStyles} w-full mx-2 sm:w-full p-0 gap-0
        bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
        rounded-3xl shadow-2xl border-2 ${variantStyles.borderColor}
        max-h-[90vh] overflow-hidden
        transform transition-all duration-300 ease-out
        animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4
        border-4 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500 dark:bg-gray-900
      `}>

        {/* Content */}
        <div className="px-6 py-8 sm:px-10 sm:py-12 text-center">
          {/* Animated Icon Container */}
          <div className="relative mb-8">
            <div className={`
              ${variantStyles.iconBg} ${variantStyles.pulseColor}
              relative mx-auto w-20 h-20 rounded-2xl
              flex items-center justify-center
              shadow-lg transform transition-all duration-500
              hover:scale-110 hover:rotate-3
            `}>
              {/* Subtle glow effect */}
              <div className={`
                absolute inset-0 ${variantStyles.iconBg} rounded-2xl blur-md opacity-50 scale-110
              `}></div>
              <div className="relative z-10">
                {variantStyles.icon}
              </div>
            </div>
          </div>

          {/* Header */}
          <DialogHeader className="mb-8 space-y-4">
            <DialogTitle className={`
              flex text-center text-2xl sm:text-3xl font-semibold md:font-bold ${variantStyles.titleColor}
              tracking-tight leading-tight
              animate-in slide-in-from-top-2 duration-500 delay-200
            `}>
              {title}
            </DialogTitle>
            {description && (
              <div className="animate-in slide-in-from-top-2 duration-500 delay-300">
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
                  {description}
                </p>
              </div>
            )}
          </DialogHeader>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center animate-in slide-in-from-bottom-2 duration-500 delay-400">
            <DialogButton
              onClick={handleConfirm}
              variant={variant === "danger" ? "destructive" : variant === "warning" ? "destructive" : "default"}
              isConfirm={true}
              className="w-full sm:w-auto min-w-[120px] h-12 text-base font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              {confirmText}
            </DialogButton>
            <DialogButton
              onClick={handleCancel}
              variant="outline"
              isConfirm={false}
              className="w-full sm:w-auto min-w-[120px] h-12 text-base font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-2 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500"
            >
              {cancelText}
            </DialogButton>
          </div>
        </div>

        {/* Subtle bottom accent */}
        <div className={`h-1 w-full bg-gradient-to-r ${variantStyles.iconBg.replace('to-br', 'to-r')} opacity-60`}></div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;