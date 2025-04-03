import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, X, Download, ListPlus, Upload, HelpCircle, Copy, ListFilter, Calendar, Clock } from 'lucide-react';
import { templates as templateApi } from '../services/api';
import type { Template, Activity, ActivityConflict } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  convertFromAmsterdamTime, 
  convertToAmsterdamTime, 
  processActivitiesForDisplay,
  prepareActivityForSaving
} from '../utils/timezone';
import { AppTour } from '../components/AppTour';
import { checkActivityConflicts } from '../utils/activityConflicts';

import {
  Card,
  CardHeader,
  CardFooter,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Textarea } from "../components/ui/textarea";
import { toast } from "../components/ui/use-toast";

// Add type definition back
type ActivityWithDisplay = Activity & { displayTime: string };
type TemplateWithDisplayTimes = Omit<Template, 'activities'> & { activities: ActivityWithDisplay[] };

export default function Setup() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithDisplayTimes[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithDisplayTimes | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    days: 1,
    tags: [] as string[]
  });
  const [activityForm, setActivityForm] = useState({
    name: '',
    startTime: '',
    duration: 30,
    description: '',
    day: 1
  });
  const [calculatedEndTime, setCalculatedEndTime] = useState<string>('');
  const [isDeleteActivityDialogOpen, setIsDeleteActivityDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithDisplay | null>(null);
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false);
  const [isEditActivityDialogOpen, setIsEditActivityDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [showTagSearchSuggestions, setShowTagSearchSuggestions] = useState(false);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isBulkActivityDialogOpen, setIsBulkActivityDialogOpen] = useState(false);
  const [bulkActivities, setBulkActivities] = useState('');
  const [showTour, setShowTour] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateWithDisplayTimes | null>(null);
  const [hasPreviewChanges, setHasPreviewChanges] = useState(false);
  const [activityConflicts, setActivityConflicts] = useState<ActivityConflict[]>([]);
  const [sortBy, setSortBy] = useState<string>('name-asc');

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null);
      const response = await templateApi.getAll();
      console.log('User timezone:', user?.timezone);
      console.log('Raw template data:', response.data);
      
      // Process templates with special handling for Curaçao
      const templatesWithAdjustedTimes = response.data.map((template: Template) => {
        console.log('Processing template:', template.name);
        return {
          ...template,
          activities: user?.timezone 
            ? processActivitiesForDisplay(template.activities, user.timezone)
            : template.activities.map((activity: Activity) => ({
                ...activity,
                displayTime: activity.startTime
              }))
        };
      });
      
      setTemplates(templatesWithAdjustedTimes);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching templates');
    }
  }, [user?.timezone]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const calculateEndTime = useCallback((startTime: string, durationMinutes: number) => {
    if (!startTime || !startTime.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      return '';
    }
    
    // Use the time as is since it's already in the user's timezone (displayTime)
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const endTime = calculateEndTime(activityForm.startTime, activityForm.duration);
    setCalculatedEndTime(endTime);
  }, [activityForm.startTime, activityForm.duration, calculateEndTime]);

  const handleDeleteTemplate = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (!selectedTemplate?._id) return;
      
      await templateApi.delete(selectedTemplate._id);
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setError(null);
      await templateApi.create(templateForm);
      setIsCreateDialogOpen(false);
      setTemplateForm({ name: '', days: 1, tags: [] });
      await fetchTemplates();
    } catch (err) {
      console.error('Error creating template:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating template');
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      setError(null);
      await templateApi.update(selectedTemplate._id, templateForm);
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      setTemplateForm({ name: '', days: 1, tags: [] });
      await fetchTemplates();
    } catch (err) {
      console.error('Error updating template:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating template');
    }
  };

  // Update handleAddActivity
  const handleAddActivity = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (!selectedTemplate?._id || !user?.timezone) return;

      // Determine if this is the first activity of the day
      const isFirstOfDay = selectedTemplate.activities
        .filter(a => a.day === activityForm.day)
        .length === 0;
      
      // Prepare activity for saving with special handling for Curaçao
      const preparedActivity = prepareActivityForSaving(
        activityForm,
        user.timezone,
        isFirstOfDay
      );
      
      await templateApi.addActivity(selectedTemplate._id, preparedActivity);
      setIsAddActivityDialogOpen(false);
      setActivityForm({
        name: '',
        startTime: '',
        duration: 30,
        description: '',
        day: 1
      });
      await fetchTemplates();
    } catch (err) {
      console.error('Error adding activity:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while adding activity');
    }
  };

  // Update handleEditActivity
  const handleEditActivity = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (!selectedTemplate?._id || !selectedActivity?._id || !user?.timezone) return;

      // Check if this is the first activity of the day
      const activitiesOfThisDay = selectedTemplate.activities
        .filter(a => a.day === activityForm.day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      const isFirstOfDay = activitiesOfThisDay.length > 0 && 
        activitiesOfThisDay[0]._id === selectedActivity._id;
      
      // Prepare activity for saving with special handling for Curaçao
      const preparedActivity = prepareActivityForSaving(
        activityForm,
        user.timezone,
        isFirstOfDay
      );
      
      await templateApi.updateActivity(
        selectedTemplate._id, 
        selectedActivity._id, 
        preparedActivity
      );
      
      setIsEditActivityDialogOpen(false);
      setSelectedActivity(null);
      setActivityForm({
        name: '',
        startTime: '',
        duration: 30,
        description: '',
        day: 1
      });
      await fetchTemplates();
    } catch (err) {
      console.error('Error updating activity:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating activity');
    }
  };

  const handleDeleteActivity = async () => {
    try {
      if (!selectedTemplate?._id || !selectedActivity?._id) return;
      
      // Create a new array without the activity to delete
      const updatedActivities = selectedTemplate.activities.filter(
        activity => activity._id !== selectedActivity._id
      );

      // Update the template with the filtered activities
      await templateApi.update(selectedTemplate._id, {
        ...selectedTemplate,
        activities: updatedActivities
      });

      // Update preview if open
      if (previewTemplate && selectedTemplate._id === previewTemplate._id) {
        const response = await templateApi.getAll();
        const updatedTemplate = response.data.find((t: Template) => t._id === selectedTemplate._id);
        if (updatedTemplate) {
          // Convert times for preview display
          const templateWithDisplayTimes: TemplateWithDisplayTimes = {
            ...updatedTemplate,
            activities: updatedTemplate.activities.map((activity: Activity) => ({
              ...activity,
              displayTime: user?.timezone ? convertFromAmsterdamTime(activity.startTime, user.timezone) : activity.startTime
            }))
          };
          setPreviewTemplate(templateWithDisplayTimes);
        }
      }

      // Close dialogs and reset states first
      setIsDeleteActivityDialogOpen(false);
      setSelectedActivity(null);
      
      // Then fetch fresh data
      await fetchTemplates();

      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });
    } catch (err) {
      console.error('Error deleting activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete activity');
    }
  };

  const handleActivityClick = (template: TemplateWithDisplayTimes, activity: ActivityWithDisplay, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedTemplate(template);
    setSelectedActivity(activity);
    // Use displayTime directly since it's already in user's timezone
    setActivityForm({
      name: activity.name,
      startTime: activity.displayTime,
      duration: activity.duration,
      description: activity.description || '',
      day: activity.day
    });
    setIsEditActivityDialogOpen(true);
  };

  const handleTagsChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = tagInput.trim();
      
      if (value && !templateForm.tags.includes(value) && templateForm.tags.length < 5) {
        setTemplateForm(prev => ({
          ...prev,
          tags: [...prev.tags, value]
        }));
        setTagInput('');
      }
      setShowTagSuggestions(false);
    } else if (e.key === 'Tab' && showTagSuggestions) {
      e.preventDefault();
      const suggestions = getAllUniqueTags().filter(tag => 
        tag.toLowerCase().includes(tagInput.toLowerCase()) &&
        !templateForm.tags.includes(tag)
      );
      if (suggestions.length > 0) {
        const [firstSuggestion] = suggestions;
        if (templateForm.tags.length < 5) {
          setTemplateForm(prev => ({
            ...prev,
            tags: [...prev.tags, firstSuggestion]
          }));
          setTagInput('');
          setShowTagSuggestions(false);
        }
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTemplateForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Function to get all unique tags from templates
  const getAllUniqueTags = () => {
    if (!templates || !Array.isArray(templates)) return [];
    
    // Get all tags from all templates, filter out undefined/null, and flatten
    const allTags = templates
      .map(template => template?.tags || [])
      .filter(tags => Array.isArray(tags))
      .flat()
      .filter(tag => typeof tag === 'string' && tag.trim() !== '');
    
    // Create a Set to get unique tags
    const uniqueTags = Array.from(new Set(allTags));
    
    // Sort the filtered tags, with additional type safety
    return uniqueTags.sort((a, b) => {
      if (!a || !b) return 0;
      return a.localeCompare(b);
    });
  };

  // Function to get consistent color for a tag
  const getTagColor = (tag: string) => {
    const colors = [
      'bg-pink-100 hover:bg-pink-200 border-pink-200 text-pink-800',
      'bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-800',
      'bg-green-100 hover:bg-green-200 border-green-200 text-green-800',
      'bg-purple-100 hover:bg-purple-200 border-purple-200 text-purple-800',
      'bg-yellow-100 hover:bg-yellow-200 border-yellow-200 text-yellow-800',
      'bg-indigo-100 hover:bg-indigo-200 border-indigo-200 text-indigo-800',
      'bg-red-100 hover:bg-red-200 border-red-200 text-red-800',
      'bg-teal-100 hover:bg-teal-200 border-teal-200 text-teal-800',
      'bg-orange-100 hover:bg-orange-200 border-orange-200 text-orange-800',
      'bg-cyan-100 hover:bg-cyan-200 border-cyan-200 text-cyan-800',
      'bg-lime-100 hover:bg-lime-200 border-lime-200 text-lime-800',
      'bg-violet-100 hover:bg-violet-200 border-violet-200 text-violet-800'
    ];

    // Get all unique tags in a consistent order
    const allTags = getAllUniqueTags();
    const tagIndex = allTags.indexOf(tag);
    
    // Use the tag's index to cycle through colors
    return colors[tagIndex % colors.length];
  };

  // Add this new function for tag filtering
  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFilterTags.includes(tag)) {
      setSelectedFilterTags([...selectedFilterTags, tag]);
    }
  };

  // Add this new function for removing tag filters
  const removeFilterTag = (tag: string) => {
    setSelectedFilterTags(selectedFilterTags.filter(t => t !== tag));
  };

  // Add sorting function
  const getSortedTemplates = (templatesToSort: TemplateWithDisplayTimes[]) => {
    return [...templatesToSort].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'days-asc':
          return a.days - b.days;
        case 'days-desc':
          return b.days - a.days;
        case 'activities-asc':
          return a.activities.length - b.activities.length;
        case 'activities-desc':
          return b.activities.length - a.activities.length;
        case 'created-asc':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'created-desc':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });
  };

  // Update the templates filtering logic to include sorting
  const filteredTemplates = getSortedTemplates(
    templates.filter((template: TemplateWithDisplayTimes) => 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedFilterTags.length === 0 || 
       selectedFilterTags.every(tag => template.tags?.includes(tag)))
    )
  );

  const handleCloneTemplate = async (template: TemplateWithDisplayTimes) => {
    try {
      setError(null);
      await templateApi.clone(template._id, {
        name: `${template.name} (Copy)`
      });
      await fetchTemplates();
      toast({
        title: "Success",
        description: "Template cloned successfully",
      });
    } catch (err) {
      console.error('Error cloning template:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while cloning template');
    }
  };

  const handleExportTemplate = async (template: TemplateWithDisplayTimes) => {
    try {
      setError(null);
      const response = await templateApi.export(template._id);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting template:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while exporting template');
    }
  };

  const handleImportTemplate = async () => {
    try {
      setError(null);
      if (!importFile) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result;
          if (typeof content !== 'string') return;
          
          const templateData = JSON.parse(content);
          await templateApi.import(templateData);
          setIsImportDialogOpen(false);
          setImportFile(null);
          await fetchTemplates();
          toast({
            title: "Success",
            description: "Template imported successfully",
          });
        } catch (err) {
          console.error('Error parsing import file:', err);
          setError(err instanceof Error ? err.message : 'Invalid template file format');
        }
      };
      reader.readAsText(importFile);
    } catch (err) {
      console.error('Error importing template:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while importing template');
    }
  };

  const handleBulkActivityAdd = async () => {
    if (!selectedTemplate || !user?.timezone) return;

    try {
      const activities = bulkActivities
        .split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
          const [name, startTime, duration, day, description = ''] = line.split(';').map(s => s.trim());
          
          // Validate required fields
          if (!name || !startTime || !duration || !day) {
            throw new Error(`Line ${index + 1}: All fields (name, startTime, duration, day) are required`);
          }

          // Validate time format
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(startTime)) {
            throw new Error(`Line ${index + 1}: Invalid time format for "${startTime}". Please use HH:MM format (e.g., 09:00)`);
          }

          // Validate duration is a number
          const parsedDuration = parseInt(duration);
          if (isNaN(parsedDuration) || parsedDuration <= 0) {
            throw new Error(`Line ${index + 1}: Duration must be a positive number`);
          }

          // Validate day is within range
          const parsedDay = parseInt(day);
          if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > selectedTemplate.days) {
            throw new Error(`Line ${index + 1}: Day must be between 1 and ${selectedTemplate.days}`);
          }

          // Convert time to Amsterdam time before saving
          const amsterdamTime = convertToAmsterdamTime(startTime, user.timezone);
          console.log('Processing bulk activity:', {
            name,
            userTime: startTime,
            amsterdamTime,
            userTimezone: user.timezone
          });

          return {
            name,
            startTime: amsterdamTime,
            duration: parsedDuration,
            day: parsedDay,
            description,
            actualStartTime: null,
            actualEndTime: null
          };
        });

      // Use the dedicated bulk activities endpoint
      await templateApi.addActivitiesBulk(selectedTemplate._id, { activities });

      setIsBulkActivityDialogOpen(false);
      setBulkActivities('');
      await fetchTemplates();

      toast({
        title: "Success",
        description: `Added ${activities.length} activities to the template.`,
      });
    } catch (err) {
      console.error('Error adding bulk activities:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add activities';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      setError(errorMessage);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImportFile(file);
  };

  const handleBulkActivitiesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBulkActivities(e.target.value);
  };

  // Update formatTimeInput function
  const formatTimeInput = (value: string): string => {
    // Remove any non-digit characters except colon
    const cleaned = value.replace(/[^\d:]/g, '');
    
    // If empty, return empty string
    if (!cleaned) return '';
    
    // If there's a colon in the input
    if (cleaned.includes(':')) {
      const [hours, minutes] = cleaned.split(':');
      
      // Only format if we have valid hours and minutes
      if (hours && minutes) {
        const validHours = Math.min(parseInt(hours), 23);
        const validMinutes = Math.min(parseInt(minutes), 59);
        return `${validHours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}`;
      }
      return cleaned;
    }
    
    // Only format if we have exactly 4 digits
    if (cleaned.length === 4) {
      const hours = Math.min(parseInt(cleaned.slice(0, 2)), 23);
      const minutes = Math.min(parseInt(cleaned.slice(2, 4)), 59);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Return cleaned input without formatting for partial inputs
    return cleaned;
  };

  // Add this function to determine activity background color
  const getActivityBackgroundColor = (activityName: string) => {
    const lowerName = activityName.toLowerCase();
    if (lowerName.includes('break')) {
      return 'bg-orange-50 hover:bg-orange-100';
    }
    if (lowerName.includes('lunch')) {
      return 'bg-green-50 hover:bg-green-100';
    }
    return 'bg-gray-50 hover:bg-gray-100';
  };

  const handlePreviewOpen = (template: TemplateWithDisplayTimes) => {
    setSelectedTemplate(template);
    setPreviewTemplate(JSON.parse(JSON.stringify(template))); // Deep copy
    setHasPreviewChanges(false);
    setIsPreviewDialogOpen(true);
  };

  const handlePreviewChange = async (updatedActivities: ActivityWithDisplay[]) => {
    if (!previewTemplate) return;
    
    setPreviewTemplate({
      ...previewTemplate,
      activities: updatedActivities
    });
    setHasPreviewChanges(true);
  };

  // Add this helper function near the top
  const generateTempId = () => {
    return `temp_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Update the handlePreviewSave function
  const handlePreviewSave = async () => {
    if (!previewTemplate || !hasPreviewChanges) {
      setIsPreviewDialogOpen(false);
      setPreviewTemplate(null);
      return;
    }

    try {
      // Clean up activities before saving
      const cleanedActivities = previewTemplate.activities.map(activity => {
        // Remove displayTime as it's not needed on the server
        const { displayTime, ...rest } = activity;
        
        // For new activities (with temp IDs or empty IDs), completely omit the _id field
        if (!rest._id || rest._id.startsWith('temp_')) {
          // Destructure all fields we want to keep, omitting _id
          const { 
            name, 
            startTime, 
            duration, 
            description, 
            day, 
            actualStartTime = null, 
            actualEndTime = null,
            status,
            isActive,
            completed
          } = rest;
          
          // Return only the fields we want to keep
          return {
            name,
            startTime,
            duration,
            description,
            day,
            actualStartTime,
            actualEndTime,
            ...(status && { status }),
            ...(isActive !== undefined && { isActive }),
            ...(completed !== undefined && { completed })
          };
        }
        
        // For existing activities, keep their IDs
        return rest;
      });

      // Create the update object with proper typing
      const templateToUpdate: Partial<Template> = {
        name: previewTemplate.name,
        days: previewTemplate.days,
        activities: cleanedActivities as Activity[],
        tags: previewTemplate.tags
      };

      await templateApi.update(previewTemplate._id, templateToUpdate);
      
      await fetchTemplates();
      setIsPreviewDialogOpen(false);
      setPreviewTemplate(null);
      setHasPreviewChanges(false);
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    } catch (err) {
      console.error('Error saving template changes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template changes';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Update the recalculateTimings function to maintain order
  const recalculateTimings = (activities: ActivityWithDisplay[], dayIndex: number): ActivityWithDisplay[] => {
    // First, get all activities that are not for this day
    const otherDaysActivities = activities.filter(a => a.day !== dayIndex + 1);
    
    // Get and sort activities for this day
    const dayActivities = activities
      .filter(a => a.day === dayIndex + 1)
      .sort((a, b) => {
        if (!a?.displayTime || !b?.displayTime) return 0;
        return a.displayTime.localeCompare(b.displayTime);
      });

    // Start with the first activity at 09:00 or its original time if it's the first activity of day 1
    let currentTime = dayActivities.length > 0 ? 
      (dayIndex === 0 && dayActivities[0].displayTime < "09:00" ? dayActivities[0].displayTime : "09:00") : 
      "09:00";

    // Update times for this day's activities while maintaining their order
    const updatedDayActivities = dayActivities.map(activity => {
      const updatedActivity = {
        ...activity,
        displayTime: currentTime,
        startTime: user?.timezone ? convertToAmsterdamTime(currentTime, user.timezone) : currentTime
      };
      currentTime = calculateEndTime(currentTime, activity.duration);
      return updatedActivity;
    });

    // Combine with other days' activities
    return [...otherDaysActivities, ...updatedDayActivities];
  };

  // Update the checkForConflicts function to properly handle activity IDs
  const checkForConflicts = useCallback((activity: Partial<Activity>) => {
    if (!selectedTemplate) return [];
    
    // When editing an activity, exclude it from the conflict check using its original ID
    const activitiesToCheck = selectedTemplate.activities.filter(a => {
      // If we're editing (have selectedActivity), exclude it from the check
      if (selectedActivity && a._id === selectedActivity._id) {
        return false;
      }
      return true;
    });

    const conflicts = checkActivityConflicts(
      activitiesToCheck,
      {
        _id: activity._id || '',
        name: activity.name || '',
        startTime: activity.startTime || '',
        duration: activity.duration || 0,
        day: activity.day || 1,
        description: activity.description || '',
        actualStartTime: null,
        actualEndTime: null
      }
    );
    setActivityConflicts(conflicts);
    return conflicts;
  }, [selectedTemplate, selectedActivity]);

  return (
    <>
      <div className="container mx-auto p-6">
        <AppTour page="setup" run={showTour} onClose={() => setShowTour(false)} />
        
        {/* Header Section */}
        <div className="setup-header flex justify-between items-center mb-8 bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Training Setup</h1>
            <p className="text-gray-600 mt-2">Manage your training templates and activities</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowTour(true)}
              className="w-10 h-10"
              title="Start Tour"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Import Template
            </Button>
            <Button
              onClick={() => {
                setSelectedTemplate(null);
                setIsCreateDialogOpen(true);
              }}
              className="create-training-button bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Training
            </Button>
          </div>
        </div>

        {/* Search Section */}
        <div className="search-section flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-[240px]">
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4" />
                <SelectValue placeholder="Sort templates by..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              {/* Name sorting */}
              <SelectItem value="name-asc">
                Name (A to Z)
              </SelectItem>
              <SelectItem value="name-desc">
                Name (Z to A)
              </SelectItem>

              <div className="h-px bg-gray-100 my-2" />

              {/* Days sorting */}
              <SelectItem value="days-asc">
                Days (Low to High)
              </SelectItem>
              <SelectItem value="days-desc">
                Days (High to Low)
              </SelectItem>

              <div className="h-px bg-gray-100 my-2" />

              {/* Activities sorting */}
              <SelectItem value="activities-asc">
                Activities (Least first)
              </SelectItem>
              <SelectItem value="activities-desc">
                Activities (Most first)
              </SelectItem>

              <div className="h-px bg-gray-100 my-2" />

              {/* Creation date sorting */}
              <SelectItem value="created-asc">
                Created (Oldest first)
              </SelectItem>
              <SelectItem value="created-desc">
                Created (Newest first)
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-72">
            <div className="relative">
              <Input
                placeholder="Filter by tags..."
                value={tagSearchQuery}
                onChange={(e) => {
                  setTagSearchQuery(e.target.value);
                  setShowTagSearchSuggestions(true);
                }}
                onFocus={() => setShowTagSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSearchSuggestions(false), 200)}
              />
              {showTagSearchSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {getAllUniqueTags()
                    .filter(tag => 
                      !selectedFilterTags.includes(tag) &&
                      (!tagSearchQuery || tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                    )
                    .sort((a, b) => a.localeCompare(b))
                    .map(tag => (
                      <div
                        key={tag}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSelectedFilterTags([...selectedFilterTags, tag]);
                          setTagSearchQuery('');
                          setShowTagSearchSuggestions(false);
                        }}
                      >
                        <Badge className={getTagColor(tag)}>
                          {tag}
                        </Badge>
                      </div>
                    ))}
                  {getAllUniqueTags()
                    .filter(tag => 
                      !selectedFilterTags.includes(tag) &&
                      (!tagSearchQuery || tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                    ).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">
                      No matching tags found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Active Filters Section */}
        {selectedFilterTags.length > 0 && (
          <div className="flex gap-2 mb-4 items-center">
            <span className="text-sm text-gray-500">Active filters:</span>
            {selectedFilterTags.map(tag => (
              <Badge 
                key={tag} 
                className={`cursor-pointer ${getTagColor(tag)}`}
                onClick={() => removeFilterTag(tag)}
              >
                {tag}
                <X className="h-3 w-3 ml-1 hover:text-red-500" />
              </Badge>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedFilterTags([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Templates Grid */}
        <div className="templates-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card 
              key={template._id} 
              className="hover:shadow-lg transition-shadow flex flex-col"
            >
              <CardHeader 
                className="bg-gray-50 border-b cursor-pointer"
                onClick={() => handlePreviewOpen(template)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">Created by {template.createdBy?.firstName} {template.createdBy?.lastName}</p>
                    </div>
                    <div className="flex -space-x-3 -mr-2" onClick={e => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloneTemplate(template);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Clone template</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportTemplate(template);
                              }}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Export template</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTemplate(template);
                                setTemplateForm({
                                  name: template.name,
                                  days: template.days,
                                  tags: template.tags || []
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit template</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {user?.role === 'admin' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTemplate(template);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete template</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col w-full" onClick={e => e.stopPropagation()}>
                    {template.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {template.tags.map((tag) => (
                          <Badge 
                            key={tag} 
                            className={`text-xs cursor-pointer ${getTagColor(tag)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTagClick(tag, e);
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="flex items-center">
                        <Calendar className="w-3 h-3 mr-2" />
                        {template.days} Days
                      </Badge>
                      <Badge variant="outline" className="flex items-center">
                        <Clock className="w-3 h-3 mr-2" />
                        {template.activities.length} Activities
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                <ScrollArea className="h-[200px]">
                  {Array.from({ length: template.days }, (_, i) => i + 1).map((day) => {
                    const dayActivities = template.activities.filter((a) => a.day === day);
                    return (
                      <div key={day} className="mb-4">
                        <h4 className="font-medium text-sm text-gray-600 mb-2">Day {day}</h4>
                        {dayActivities.length > 0 ? (
                          dayActivities.map((activity, activityIndex, dayActivities) => (
                            <div
                              key={activity._id}
                              className={`p-2 rounded-md mb-2 cursor-pointer ${getActivityBackgroundColor(activity.name)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActivityClick(template, activity, e);
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{activity.name}</span>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <span className="text-sm text-gray-500">
                                    {activity.displayTime}
                                  </span>
                                  <Badge variant="outline" className="ml-2">
                                    {activity.duration}m
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTemplate(template);
                                      setSelectedActivity(activity);
                                      setIsDeleteActivityDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">No activities scheduled</p>
                        )}
                      </div>
                    );
                  })}
                </ScrollArea>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t p-4 mt-auto">
                <div className="flex gap-2 w-full">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(template);
                      setActivityForm({
                        name: '',
                        startTime: '',
                        duration: 30,
                        day: 1,
                        description: ''
                      });
                      setIsAddActivityDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Activity
                  </Button>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(template);
                      setBulkActivities('');
                      setIsBulkActivityDialogOpen(true);
                    }}
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    Bulk Add
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Create/Edit Template Dialog */}
        <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedTemplate(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditDialogOpen ? 'Edit Training Template' : 'Create Training Template'}</DialogTitle>
              <DialogDescription>
                {isEditDialogOpen 
                  ? 'Update the training template details below.' 
                  : 'Fill in the details to create a new training template.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="Enter template name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Days</label>
                <Input
                  type="number"
                  min="1"
                  value={templateForm.days}
                  onChange={(e) => setTemplateForm({ ...templateForm, days: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags (optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {templateForm.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      className={`flex items-center gap-1 ${getTagColor(tag)}`}
                    >
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    placeholder="Add tags (press Enter or comma to add)"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(true);
                    }}
                    onKeyDown={handleTagsChange}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                    disabled={templateForm.tags.length >= 5}
                  />
                  {showTagSuggestions && tagInput && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                      {getAllUniqueTags()
                        .filter(tag => 
                          tag.toLowerCase().includes(tagInput.toLowerCase()) &&
                          !templateForm.tags.includes(tag)
                        )
                        .map(tag => (
                          <div
                            key={tag}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              if (templateForm.tags.length < 5) {
                                setTemplateForm(prev => ({
                                  ...prev,
                                  tags: [...prev.tags, tag]
                                }));
                                setTagInput('');
                                setShowTagSuggestions(false);
                              }
                            }}
                          >
                            <Badge className={getTagColor(tag)}>
                              {tag}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Add up to 5 tags to help organize your templates. Press Tab to autocomplete.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedTemplate(null);
              }}>
                Cancel
              </Button>
              <Button onClick={isEditDialogOpen ? handleEditTemplate : handleCreateTemplate}>
                {isEditDialogOpen ? 'Save Changes' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Activity Dialog */}
        <Dialog open={isAddActivityDialogOpen || isEditActivityDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddActivityDialogOpen(false);
            setIsEditActivityDialogOpen(false);
            setSelectedActivity(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditActivityDialogOpen ? 'Edit Activity' : 'Add Activity'}
              </DialogTitle>
              <DialogDescription>
                {isEditActivityDialogOpen 
                  ? 'Update the activity details below.' 
                  : 'Fill in the details to add a new activity.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {activityConflicts.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Time Conflict Detected:</p>
                      {activityConflicts.map((conflict, index) => {
                        const conflictingActivity = conflict.activity2;
                        const conflictEnd = calculateEndTime(conflictingActivity.startTime, conflictingActivity.duration);
                        return (
                          <div key={index} className="pl-4 border-l-2 border-red-500">
                            <p className="font-medium">{conflictingActivity.name}</p>
                            <p className="text-sm">
                              Time: {conflictingActivity.startTime} - {conflictEnd} ({conflictingActivity.duration} minutes)
                            </p>
                            {conflictingActivity.description && (
                              <p className="text-sm mt-1">{conflictingActivity.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Activity Name</label>
                <Input
                  value={activityForm.name}
                  onChange={(e) => {
                    setActivityForm({ ...activityForm, name: e.target.value });
                    if (activityForm.startTime && activityForm.duration) {
                      checkForConflicts({
                        ...activityForm,
                        name: e.target.value,
                        _id: '',
                        actualStartTime: null,
                        actualEndTime: null
                      });
                    }
                  }}
                  placeholder="Enter activity name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Day</label>
                  <Select
                    value={activityForm.day.toString()}
                    onValueChange={(value) => {
                      const newDay = parseInt(value);
                      setActivityForm({ ...activityForm, day: newDay });
                      if (activityForm.startTime && activityForm.duration) {
                        checkForConflicts({
                          ...activityForm,
                          day: newDay,
                          _id: '',
                          actualStartTime: null,
                          actualEndTime: null
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedTemplate && Array.from({ length: selectedTemplate.days }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Day {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input
                    type="number"
                    min="1"
                    value={activityForm.duration}
                    onChange={(e) => {
                      const newDuration = parseInt(e.target.value);
                      setActivityForm({ ...activityForm, duration: newDuration });
                      if (activityForm.startTime && !isNaN(newDuration)) {
                        checkForConflicts({
                          ...activityForm,
                          duration: newDuration,
                          _id: '',
                          actualStartTime: null,
                          actualEndTime: null
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <div className="flex gap-4 items-start">
                  <div className="relative flex-1">
                    <Input
                      value={activityForm.startTime}
                      onChange={(e) => {
                        const formatted = formatTimeInput(e.target.value);
                        setActivityForm({ ...activityForm, startTime: formatted });
                        if (formatted.length === 5 && activityForm.duration) {
                          checkForConflicts({
                            ...activityForm,
                            startTime: formatted,
                            _id: '',
                            actualStartTime: null,
                            actualEndTime: null
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                          const input = e.currentTarget;
                          const value = input.value;
                          const selectionStart = input.selectionStart || 0;
                          const selectionEnd = input.selectionEnd || 0;
                          
                          // If text is selected, let default behavior handle it
                          if (selectionStart !== selectionEnd) return;
                          
                          e.preventDefault();
                          
                          // Handle backspace
                          if (e.key === 'Backspace') {
                            // If cursor is after colon, delete the character before the colon
                            if (value[selectionStart - 1] === ':') {
                              const newValue = value.slice(0, selectionStart - 2) + value.slice(selectionStart);
                              setActivityForm({
                                ...activityForm,
                                startTime: newValue
                              });
                              // Set cursor position
                              setTimeout(() => {
                                input.setSelectionRange(selectionStart - 2, selectionStart - 2);
                              }, 0);
                            } else {
                              // Normal backspace behavior
                              const newValue = value.slice(0, selectionStart - 1) + value.slice(selectionStart);
                              setActivityForm({
                                ...activityForm,
                                startTime: newValue
                              });
                              // Set cursor position
                              setTimeout(() => {
                                input.setSelectionRange(selectionStart - 1, selectionStart - 1);
                              }, 0);
                            }
                          }
                          
                          // Handle delete
                          if (e.key === 'Delete') {
                            // If cursor is before colon, delete the character after the colon
                            if (value[selectionStart] === ':') {
                              const newValue = value.slice(0, selectionStart) + value.slice(selectionStart + 2);
                              setActivityForm({
                                ...activityForm,
                                startTime: newValue
                              });
                              // Keep cursor position
                              setTimeout(() => {
                                input.setSelectionRange(selectionStart, selectionStart);
                              }, 0);
                            } else {
                              // Normal delete behavior
                              const newValue = value.slice(0, selectionStart) + value.slice(selectionStart + 1);
                              setActivityForm({
                                ...activityForm,
                                startTime: newValue
                              });
                              // Keep cursor position
                              setTimeout(() => {
                                input.setSelectionRange(selectionStart, selectionStart);
                              }, 0);
                            }
                          }
                        }
                      }}
                      placeholder="Enter time (e.g., 17:45 or 1745)"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-sm text-gray-400">HH:MM</span>
                    </div>
                  </div>
                  {calculatedEndTime && (
                    <div className="w-48 bg-gray-100 rounded-md px-3 py-2 cursor-not-allowed select-none">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-medium">End Time</span>
                        <span className="text-sm text-gray-700">{calculatedEndTime}</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Enter time in 24-hour format (e.g., 09:00 or 0900 for 9 AM, 17:45 or 1745 for 5:45 PM)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Enter activity description"
                  className="min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddActivityDialogOpen(false);
                setIsEditActivityDialogOpen(false);
                setSelectedActivity(null);
                setActivityConflicts([]);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={isEditActivityDialogOpen ? handleEditActivity : handleAddActivity}
                disabled={activityConflicts.length > 0}
              >
                {isEditActivityDialogOpen ? 'Save Changes' : 'Add Activity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Template Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setSelectedTemplate(null);
          }
        }}>
          <DialogContent onClick={e => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Delete Template</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this template? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteDialogOpen(false);
                  setSelectedTemplate(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTemplate(e);
                }}
              >
                Delete Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Activity Confirmation Dialog */}
        <Dialog open={isDeleteActivityDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDeleteActivityDialogOpen(false);
            setSelectedActivity(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Activity</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this activity? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDeleteActivityDialogOpen(false);
                setSelectedActivity(null);
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteActivity}>
                Delete Activity
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog 
          open={isPreviewDialogOpen} 
          onOpenChange={(open) => {
            if (!open && hasPreviewChanges) {
              if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                setError(null);
                setIsPreviewDialogOpen(false);
                setPreviewTemplate(null);
                setHasPreviewChanges(false);
              }
            } else if (!open) {
              setError(null);
              setIsPreviewDialogOpen(false);
              setPreviewTemplate(null);
              setHasPreviewChanges(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-[1200px]">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogHeader>
              <DialogTitle>
                {previewTemplate?.name}
              </DialogTitle>
              <DialogDescription>
                Created by {previewTemplate?.createdBy ? 
                  `${previewTemplate.createdBy.firstName} ${previewTemplate.createdBy.lastName}` : 
                  'Unknown'
                }
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[calc(100vh-200px)] rounded-md border p-6">
              <div className="grid grid-cols-3 gap-8">
                {previewTemplate && Array.from({ length: previewTemplate.days }, (_, dayIndex) => (
                  <div key={dayIndex} className="rounded-lg border p-6">
                    <h3 className="mb-4 font-semibold text-lg">Day {dayIndex + 1}</h3>
                    <div className="space-y-2">
                      {previewTemplate.activities
                        .filter(activity => activity.day === dayIndex + 1)
                        .sort((a, b) => {
                          if (!a?.displayTime || !b?.displayTime) return 0;
                          return a.displayTime.localeCompare(b.displayTime);
                        })
                        .map((activity, activityIndex, dayActivities) => (
                          <div key={activity._id}>
                            {/* Drop zone above first activity */}
                            {activityIndex === 0 && (
                              <div
                                className="h-1 -mt-1 relative group"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.add('bg-primary', 'h-2');
                                }}
                                onDragLeave={(e) => {
                                  e.currentTarget.classList.remove('bg-primary', 'h-2');
                                }}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('bg-primary', 'h-2');
                                  
                                  const droppedActivity = JSON.parse(e.dataTransfer.getData('activity')) as ActivityWithDisplay;
                                  
                                  // First, get all activities except the dropped one
                                  const otherActivities = previewTemplate.activities.filter(a => a._id !== droppedActivity._id);
                                  
                                  // Get current day's activities
                                  const currentDayActivities = otherActivities
                                    .filter(a => a.day === dayIndex + 1)
                                    .sort((a, b) => {
                                      if (!a?.displayTime || !b?.displayTime) return 0;
                                      return a.displayTime.localeCompare(b.displayTime);
                                    });
                                  
                                  // Find the insertion index
                                  const insertIndex = currentDayActivities.findIndex(a => a._id === activity._id) + 1;
                                  
                                  // Insert the activity at the correct position
                                  const updatedDayActivities = [
                                    ...currentDayActivities.slice(0, insertIndex),
                                    {
                                      ...droppedActivity,
                                      _id: droppedActivity._id || generateTempId(),
                                      day: dayIndex + 1,
                                      displayTime: calculateEndTime(activity.displayTime, activity.duration) // Will be recalculated
                                    },
                                    ...currentDayActivities.slice(insertIndex)
                                  ];

                                  // Combine with other days' activities
                                  const updatedActivities = [
                                    ...otherActivities.filter(a => a.day !== dayIndex + 1),
                                    ...updatedDayActivities
                                  ];

                                  // Recalculate timings
                                  const finalActivities = recalculateTimings(updatedActivities, dayIndex);
                                  handlePreviewChange(finalActivities);
                                }}
                              />
                            )}
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('activity', JSON.stringify(activity));
                                e.currentTarget.classList.add('opacity-50');
                              }}
                              onDragEnd={(e) => {
                                e.currentTarget.classList.remove('opacity-50');
                              }}
                              className={`rounded-lg border p-3 group transition-colors cursor-pointer ${getActivityBackgroundColor(activity.name)}`}
                              onClick={(e) => handleActivityClick(previewTemplate, activity, e)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium">{activity.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {activity.displayTime} - {calculateEndTime(activity.displayTime, activity.duration)}
                                  </p>
                                  {activity.description && (
                                    <p className="text-sm text-gray-600 mt-2 break-words">
                                      {activity.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 ml-4 shrink-0" onClick={e => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleActivityClick(previewTemplate, activity, e);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedActivity(activity);
                                      setIsDeleteActivityDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {/* Drop zone below activity */}
                            <div
                              className="h-1 my-1 relative group"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('bg-primary', 'h-2');
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove('bg-primary', 'h-2');
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('bg-primary', 'h-2');
                                
                                const droppedActivity = JSON.parse(e.dataTransfer.getData('activity')) as ActivityWithDisplay;
                                
                                // Get all activities except the dropped one
                                const otherActivities = previewTemplate.activities.filter(a => a._id !== droppedActivity._id);
                                
                                // Get current day's activities
                                const currentDayActivities = otherActivities
                                  .filter(a => a.day === dayIndex + 1)
                                  .sort((a, b) => {
                                    if (!a?.displayTime || !b?.displayTime) return 0;
                                    return a.displayTime.localeCompare(b.displayTime);
                                  });
                                
                                // Find the insertion index
                                const insertIndex = currentDayActivities.findIndex(a => a._id === activity._id) + 1;
                                
                                // Insert the activity at the correct position
                                const updatedDayActivities = [
                                  ...currentDayActivities.slice(0, insertIndex),
                                  {
                                    ...droppedActivity,
                                    _id: droppedActivity._id || generateTempId(),
                                    day: dayIndex + 1,
                                    displayTime: calculateEndTime(activity.displayTime, activity.duration) // Will be recalculated
                                  },
                                  ...currentDayActivities.slice(insertIndex)
                                ];

                                // Combine with other days' activities
                                const updatedActivities = [
                                  ...otherActivities.filter(a => a.day !== dayIndex + 1),
                                  ...updatedDayActivities
                                ];

                                // Recalculate timings
                                const finalActivities = recalculateTimings(updatedActivities, dayIndex);
                                handlePreviewChange(finalActivities);
                              }}
                            />
                          </div>
                        ))}
                      <div
                        className="mt-4 border-2 border-dashed rounded-lg p-4"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-primary', 'bg-primary/5');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                          
                          const droppedActivity = JSON.parse(e.dataTransfer.getData('activity')) as ActivityWithDisplay;
                          
                          // Get all activities except the dropped one
                          const otherActivities = previewTemplate.activities.filter(a => a._id !== droppedActivity._id);
                          
                          // Add the activity to the end of this day's activities
                          const updatedActivities = [
                            ...otherActivities,
                            {
                              ...droppedActivity,
                              _id: droppedActivity._id || generateTempId(),
                              day: dayIndex + 1,
                              displayTime: "09:00" // Will be recalculated
                            }
                          ];

                          // Recalculate timings
                          const finalActivities = recalculateTimings(updatedActivities, dayIndex);
                          handlePreviewChange(finalActivities);
                        }}
                      >
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setSelectedTemplate(previewTemplate);
                            setActivityForm({
                              name: '',
                              startTime: '',
                              duration: 30,
                              day: dayIndex + 1,
                              description: ''
                            });
                            setIsAddActivityDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Activity
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsPreviewDialogOpen(false);
                    setPreviewTemplate(null);
                    setHasPreviewChanges(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedTemplate(previewTemplate);
                    setBulkActivities('');
                    setIsBulkActivityDialogOpen(true);
                  }}
                >
                  <ListPlus className="mr-2 h-4 w-4" />
                  Bulk Add
                </Button>
              </div>
              <Button 
                onClick={handlePreviewSave}
                disabled={!hasPreviewChanges}
              >
                {hasPreviewChanges ? 'Save Changes' : 'Close'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Template Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Training Template</DialogTitle>
              <DialogDescription>
                Select a JSON file containing a training template to import.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                type="file"
                accept=".json"
                onChange={handleImportFile}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImportTemplate} disabled={!importFile}>
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Activity Dialog */}
        <Dialog open={isBulkActivityDialogOpen} onOpenChange={setIsBulkActivityDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Multiple Activities</DialogTitle>
              <DialogDescription>
                Enter one activity per line in the format: name; startTime; duration; day; description (optional)
                <br />
                Example: Morning Standup; 09:00; 30; 1; Daily team sync
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                value={bulkActivities}
                onChange={handleBulkActivitiesChange}
                placeholder="Morning Standup; 09:00; 30; 1; Daily team sync
Code Review; 10:00; 60; 1; Team code review session
Lunch Break; 12:00; 60; 1"
                className="h-[200px] font-mono"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkActivityDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkActivityAdd} disabled={!bulkActivities.trim()}>
                Add Activities
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
} 