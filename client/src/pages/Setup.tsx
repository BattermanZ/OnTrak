import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, X, Copy, Download, ListPlus, Upload } from 'lucide-react';
import { templates as templateApi } from '../services/api';
import type { Template, Activity } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { convertFromAmsterdamTime, convertToAmsterdamTime } from '../utils/timezone';

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
import { Calendar, Clock } from "lucide-react";
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

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null);
      const response = await templateApi.getAll();
      console.log('User timezone:', user?.timezone);
      console.log('Raw template data:', response.data);
      const templatesWithLocalTime: TemplateWithDisplayTimes[] = response.data.map((template: Template) => {
        console.log('Processing template:', template.name);
        const processed = {
          ...template,
          activities: template.activities.map((activity: Activity) => {
            console.log('Processing activity:', activity.name);
            console.log('Original startTime:', activity.startTime);
            const displayTime = user?.timezone ? convertFromAmsterdamTime(activity.startTime, user.timezone) : activity.startTime;
            console.log('Converted displayTime:', displayTime);
            return {
              ...activity,
              displayTime
            };
          })
        };
        console.log('Processed template:', processed);
        return processed;
      });
      setTemplates(templatesWithLocalTime);
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

  const handleAddActivity = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (!selectedTemplate?._id || !user?.timezone) return;

      // Convert time to Amsterdam time before saving
      const amsterdamTime = convertToAmsterdamTime(activityForm.startTime, user.timezone);
      console.log('Adding activity with times:', {
        userTime: activityForm.startTime,
        amsterdamTime,
        userTimezone: user.timezone
      });

      await templateApi.update(selectedTemplate._id, {
        name: selectedTemplate.name,
        days: selectedTemplate.days,
        activities: [
          ...selectedTemplate.activities,
          {
            ...activityForm,
            startTime: amsterdamTime,
            displayTime: activityForm.startTime, // Keep display time in user's timezone
            _id: '', // This will be assigned by the server
            actualStartTime: null,
            actualEndTime: null
          }
        ]
      });

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

  const handleEditActivity = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (!selectedTemplate?._id || !selectedActivity?._id || !user?.timezone) return;
      
      // Convert time to Amsterdam time before saving
      const amsterdamTime = convertToAmsterdamTime(activityForm.startTime, user.timezone);
      console.log('Converting to Amsterdam time:', {
        userTime: activityForm.startTime,
        amsterdamTime,
        userTimezone: user.timezone
      });
      
      const updatedActivity: ActivityWithDisplay = {
        ...selectedActivity,
        ...activityForm,
        startTime: amsterdamTime,
        displayTime: activityForm.startTime // Keep display time in user's timezone
      };

      await templateApi.update(selectedTemplate._id, {
        name: selectedTemplate.name,
        days: selectedTemplate.days,
        activities: selectedTemplate.activities.map(a => 
          a._id === selectedActivity._id ? updatedActivity : a
        )
      });

      setIsEditActivityDialogOpen(false);
      setSelectedActivity(null);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit activity');
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

      // Close dialogs and reset states first
      setIsDeleteActivityDialogOpen(false);
      setSelectedActivity(null);
      
      // Then fetch fresh data
      const response = await templateApi.getAll();
      setTemplates(response.data);
      
      // Update selected template with fresh data
      const updatedTemplate = response.data.find((t: Template) => t._id === selectedTemplate._id);
      if (updatedTemplate) {
        setSelectedTemplate(updatedTemplate);
      }

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
    const tagSet = new Set<string>();
    // Sort templates by creation date to maintain consistent order
    const sortedTemplates = [...templates].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    // Add tags in order of template creation
    sortedTemplates.forEach(template => {
      template.tags?.forEach(tag => tagSet.add(tag));
    });
    
    // Convert to array and sort alphabetically for consistent ordering
    return Array.from(tagSet).sort();
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

  // Update the templates filtering logic
  const filteredTemplates = templates.filter((template: TemplateWithDisplayTimes) => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedFilterTags.length === 0 || 
     selectedFilterTags.every(tag => template.tags?.includes(tag)))
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
        .map(line => {
          const [name, startTime, duration, day, description = ''] = line.split(';').map(s => s.trim());
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
            displayTime: startTime, // Keep display time in user's timezone
            duration: parseInt(duration),
            day: parseInt(day),
            description,
            _id: '', // This will be assigned by the server
            actualStartTime: null,
            actualEndTime: null
          } as ActivityWithDisplay;
        });

      await templateApi.update(selectedTemplate._id, {
        name: selectedTemplate.name,
        days: selectedTemplate.days,
        activities: [
          ...selectedTemplate.activities,
          ...activities
        ]
      });

      setIsBulkActivityDialogOpen(false);
      setBulkActivities('');
      await fetchTemplates();

      toast({
        title: "Success",
        description: `Added ${activities.length} activities to the template.`,
      });
    } catch (err) {
      console.error('Error adding bulk activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to add activities');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImportFile(file);
  };

  const handleBulkActivitiesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBulkActivities(e.target.value);
  };

  // Add formatTimeInput function
  const formatTimeInput = (value: string): string => {
    // Remove any non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Handle empty input
    if (!digits) return '';
    
    // Handle hours
    if (digits.length <= 2) {
      const hours = parseInt(digits);
      if (hours > 23) return '23';
      return digits;
    }
    
    // Handle hours and minutes
    const hours = parseInt(digits.slice(0, 2));
    const minutes = parseInt(digits.slice(2));
    
    // Validate hours and minutes
    const validHours = hours > 23 ? '23' : digits.slice(0, 2).padStart(2, '0');
    const validMinutes = minutes > 59 ? '59' : digits.slice(2, 4).padStart(2, '0');
    
    return `${validHours}:${validMinutes}`;
  };

  return (
    <>
      <div className="container mx-auto p-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Training Setup</h1>
            <p className="text-gray-600 mt-2">Manage your training templates and activities</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Template
            </Button>
            <Button
              onClick={() => {
                setSelectedTemplate(null);
                setIsCreateDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Training
            </Button>
          </div>
        </div>

        {/* Search Section */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              className="pl-10"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative w-72">
            <div className="relative">
              <Input
                placeholder="Filter by tags..."
                value={tagSearchQuery}
                onChange={(e) => {
                  setTagSearchQuery(e.target.value);
                  setShowTagSearchSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowTagSearchSuggestions(false), 200)}
              />
              {showTagSearchSuggestions && tagSearchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                  {getAllUniqueTags()
                    .filter(tag => 
                      tag.toLowerCase().includes(tagSearchQuery.toLowerCase()) &&
                      !selectedFilterTags.includes(tag)
                    )
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card 
              key={template._id} 
              className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
                      onClick={() => {
                        setSelectedTemplate(template);
              setIsPreviewDialogOpen(true);
            }}
            >
              <CardHeader className="bg-gray-50 border-b">
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
                              <Download className="h-4 w-4" />
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
                          dayActivities.map((activity) => (
                            <div
                              key={activity._id}
                              className="p-2 bg-gray-50 rounded-md mb-2 hover:bg-gray-100 cursor-pointer"
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Activity Name</label>
                <Input
            value={activityForm.name}
            onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                  placeholder="Enter activity name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
            value={activityForm.startTime}
            onChange={(e) => {
                      const formatted = formatTimeInput(e.target.value);
                      setActivityForm({ ...activityForm, startTime: formatted });
                    }}
                    placeholder="HH:MM"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input
            type="number"
                    min="1"
            value={activityForm.duration}
                    onChange={(e) => setActivityForm({ ...activityForm, duration: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              {calculatedEndTime && (
                <div className="text-sm text-gray-500">
                  End Time: {calculatedEndTime}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Day</label>
                <Select
                  value={activityForm.day.toString()}
                  onValueChange={(value) => setActivityForm({ ...activityForm, day: parseInt(value) })}
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
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
            value={activityForm.description}
            onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Enter activity description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddActivityDialogOpen(false);
                setIsEditActivityDialogOpen(false);
                setSelectedActivity(null);
              }}>
                Cancel
              </Button>
              <Button onClick={isEditActivityDialogOpen ? handleEditActivity : handleAddActivity}>
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
        <Dialog open={isPreviewDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsPreviewDialogOpen(false);
            setSelectedTemplate(null);
          }
        }}>
          <DialogContent className="sm:max-w-[1200px]">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate?.name}
              </DialogTitle>
              <DialogDescription>
                Created by {selectedTemplate?.createdBy ? 
                  `${selectedTemplate.createdBy.firstName} ${selectedTemplate.createdBy.lastName}` : 
                  'Unknown'
                }
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[calc(100vh-200px)] rounded-md border p-6">
              <div className="grid grid-cols-3 gap-8">
                {selectedTemplate && Array.from({ length: selectedTemplate.days }, (_, dayIndex) => (
                  <div key={dayIndex} className="rounded-lg border p-6">
                    <h3 className="mb-4 font-semibold text-lg">Day {dayIndex + 1}</h3>
                    <div className="space-y-2">
                      {selectedTemplate.activities
                        .filter(activity => activity.day === dayIndex + 1)
                        .sort((a, b) => a.displayTime.localeCompare(b.displayTime))
                        .map(activity => (
                          <div
                            key={activity._id}
                            className="rounded-lg border p-3 group hover:border-primary transition-colors cursor-pointer"
                            onClick={(e) => handleActivityClick(selectedTemplate, activity, e)}
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
                                    handleActivityClick(selectedTemplate, activity, e);
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
                        ))}
                      {selectedTemplate.activities.filter(activity => activity.day === dayIndex + 1).length === 0 && (
                        <p className="text-sm text-muted-foreground">No activities scheduled for this day</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                Close
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