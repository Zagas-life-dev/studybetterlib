"use client"

import React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CheckCircle, AlertCircle } from "lucide-react"

interface ConfirmationDialogProps {
  title: string
  description: string
  isOpen: boolean
  onClose: () => void
  variant?: "success" | "error" | "info"
}

export function ConfirmationDialog({
  title,
  description,
  isOpen,
  onClose,
  variant = "success",
}: ConfirmationDialogProps) {
  // Map variant to icon and color
  const variantMap = {
    success: {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      borderColor: "border-green-500",
    },
    error: {
      icon: <AlertCircle className="h-6 w-6 text-red-500" />,
      borderColor: "border-red-500",
    },
    info: {
      icon: <AlertCircle className="h-6 w-6 text-blue-500" />,
      borderColor: "border-blue-500",
    },
  }

  const { icon, borderColor } = variantMap[variant]

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className={`border-l-4 ${borderColor}`}>
        <AlertDialogHeader className="flex flex-row items-center gap-4">
          {icon}
          <div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Okay</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}