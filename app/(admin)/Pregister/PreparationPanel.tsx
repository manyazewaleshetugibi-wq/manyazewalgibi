"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Flame,
  Thermometer,
  Save,
  ChefHat,
  Package,
  Loader2,
  Timer,
  X,
  Maximize2,
  Minimize2,
  Hash,
} from "lucide-react";
import { motion } from "framer-motion";
import type { SelectedIngredient } from "@/types/preparation";

interface PreparationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: any;
  steps: any[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
  setSteps: (steps: any[]) => void;
  isEditMode: boolean;
  existingRecipe: any;
  loading: boolean;
  isPanelExpanded: boolean;
  setIsPanelExpanded: (expanded: boolean) => void;
  selectedItemId: string;
  ingredients: any[];
  selectedIngredientForStep: any;
  setSelectedIngredientForStep: (ingredient: any) => void;
  ingredientQuantity: number;
  setIngredientQuantity: (quantity: number) => void;
  showIngredientDialog: boolean;
  setShowIngredientDialog: (show: boolean) => void;
  handleAddIngredientToStep: () => void;
  handleRemoveIngredientFromStep: (index: number) => void;
  handleTimeChange: (text: string) => void;
  handleHeatChange: (text: string) => void;
  handleTempChange: (text: string) => void;
  handleAddStep: () => void;
  handleRemoveStep: (index: number) => void;
  handleStepChange: (field: string, value: any) => void;
  handleSubmit: () => void;
}

export default function PreparationPanel({
  isOpen,
  onClose,
  selectedItem,
  steps,
  currentStep,
  setCurrentStep,
  setSteps,
  isEditMode,
  existingRecipe,
  loading,
  isPanelExpanded,
  setIsPanelExpanded,
  selectedItemId,
  ingredients,
  selectedIngredientForStep,
  setSelectedIngredientForStep,
  ingredientQuantity,
  setIngredientQuantity,
  showIngredientDialog,
  setShowIngredientDialog,
  handleAddIngredientToStep,
  handleRemoveIngredientFromStep,
  handleTimeChange,
  handleHeatChange,
  handleTempChange,
  handleAddStep,
  handleRemoveStep,
  handleStepChange,
  handleSubmit,
}: PreparationPanelProps) {
  const panelContentRef = useRef<HTMLDivElement>(null);
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleStepNavigation = (newStep: number) => {
    setCurrentStep(newStep);
    if (panelContentRef.current) {
      panelContentRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black z-40"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{
          x: 0,
          opacity: 1,
          width: isPanelExpanded ? "min(750px, 50%)" : "min(480px, 40%)",
        }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className={`fixed right-0 top-0 h-screen z-50 bg-white shadow-2xl flex flex-col ${
          isPanelExpanded ? "w-[50%] max-w-[750px]" : "w-[40%] max-w-[480px]"
        }`}
      >
        {/* Panel Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50">
                <ChefHat className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {selectedItem?.name || "Selected Item"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                className="h-8 w-8 text-gray-500 hover:bg-gray-100"
              >
                {isPanelExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-5 pb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600">
                Completion Progress
              </span>
              <span className="text-xs font-medium text-purple-600">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-1.5 bg-gray-100" />
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          ref={panelContentRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ scrollBehavior: "smooth" }}
        >
          <div className="p-5 space-y-6">
            {/* Step Description */}
            <div className="space-y-2">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-gray-700">
                <Hash className="h-3.5 w-3.5 text-purple-500" />
                Step {currentStep + 1} Description <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Describe the cooking/preparation step in detail..."
                value={currentStepData.description}
                onChange={(e) => handleStepChange("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
              />
            </div>

            {/* Time, Heat, Temperature */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <Timer className="h-3.5 w-3.5 text-amber-500" />
                  Cooking Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={currentStepData.timeText}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  placeholder="e.g., cook for 5 minutes"
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                />
                {currentStepData.timeValue > 0 && (
                  <p className="text-[10px] text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-2.5 w-2.5" />
                    {currentStepData.timeValue} minutes
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  Heat Level
                </label>
                <input
                  type="text"
                  value={currentStepData.heatText}
                  onChange={(e) => handleHeatChange(e.target.value)}
                  placeholder="e.g., medium-high heat"
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <Thermometer className="h-3.5 w-3.5 text-red-500" />
                  Temperature
                </label>
                <input
                  type="text"
                  value={currentStepData.tempText}
                  onChange={(e) => handleTempChange(e.target.value)}
                  placeholder="e.g., 180°C"
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                />
                {currentStepData.tempValue && (
                  <p className="text-[10px] text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-2.5 w-2.5" />
                    {currentStepData.tempValue}°C
                  </p>
                )}
              </div>
            </div>

            {/* Ingredients Section */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                <Package className="h-3.5 w-3.5 text-blue-500" />
                Required Ingredients
              </label>

              {currentStepData.ingredients &&
                currentStepData.ingredients.length > 0 && (
                  <div className="space-y-2 bg-gray-50 p-3">
                    {currentStepData.ingredients.map(
                      (ingredient: SelectedIngredient, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3 text-blue-500" />
                            <span className="text-xs font-medium text-gray-700">
                              {ingredient.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 text-gray-500"
                            >
                              {ingredient.quantity} {ingredient.unit}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveIngredientFromStep(idx)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowIngredientDialog(true)}
                className="w-full text-xs h-8 border-dashed border-gray-300 text-gray-600 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Ingredient to Step {currentStep + 1}
              </Button>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                placeholder="Special instructions, tips, or warnings..."
                value={currentStepData.notes || ""}
                onChange={(e) => handleStepChange("notes", e.target.value || null)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer with Controls */}
        <div className="border-t border-gray-200 p-5 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStepNavigation(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="h-8 text-xs px-3 border-gray-300 hover:border-purple-400"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleStepNavigation(Math.min(steps.length - 1, currentStep + 1))
                }
                disabled={currentStep === steps.length - 1}
                className="h-8 text-xs px-3 border-gray-300 hover:border-purple-400"
              >
                Next
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveStep(currentStep)}
                className="h-8 text-xs px-3 bg-red-500 hover:bg-red-600"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
              <Button
                size="sm"
                onClick={handleAddStep}
                className="h-8 text-xs px-3 bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Step
              </Button>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex flex-wrap gap-2 mb-4">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleStepNavigation(idx)}
                className={`w-8 h-8 text-xs font-medium transition-all ${
                  idx === currentStep
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Save Button */}
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm text-sm h-10"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Recipe...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode
                  ? `Update Recipe (${steps.length} steps)`
                  : `Save Recipe (${steps.length} steps)`}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </>
  );
}