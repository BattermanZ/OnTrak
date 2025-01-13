import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User, Search } from 'lucide-react';
import { templates as templateApi, type Template } from '../services/api';
import type { Activity } from '../types';

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

export default function Setup() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    days: 1
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
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false);
  const [isEditActivityDialogOpen, setIsEditActivityDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const formatTimeInput = (input: string) => {
    // Remove any non-digit characters
    const digits = input.replace(/\D/g, '');
    
    if (digits.length >= 4) {
      const hours = digits.slice(0, 2);
      const minutes = digits.slice(2, 4);
      return `${hours}:${minutes}`;
    }
    return digits;
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime || !startTime.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      return '';
    }

    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const endTime = calculateEndTime(activityForm.startTime, activityForm.duration);
    setCalculatedEndTime(endTime);
  }, [activityForm.startTime, activityForm.duration]);

  const fetchTemplates = async () => {
    try {
      setError(null);
      const response = await templateApi.getAll();
      setTemplates(response.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching templates');
    }
  };

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
      setTemplateForm({ name: '', days: 1 });
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
      setTemplateForm({ name: '', days: 1 });
      await fetchTemplates();
    } catch (err) {
      console.error('Error updating template:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating template');
    }
  };

  const handleAddActivity = async () => {
    if (!selectedTemplate) return;
    try {
      setError(null);
      await templateApi.addActivity(selectedTemplate._id, activityForm);
      setIsAddActivityDialogOpen(false);
      setSelectedTemplate(null);
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
      if (!selectedTemplate?._id || !selectedActivity?._id) return;
      
      const updatedActivity: Activity = {
        ...selectedActivity,
        ...activityForm,
        _id: selectedActivity._id
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
        name: selectedTemplate.name,
        days: selectedTemplate.days,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity');
    }
  };

  const handleActivityClick = (template: Template, activity: Activity, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedTemplate(template);
    setSelectedActivity(activity);
    setActivityForm({
      name: activity.name,
      startTime: activity.startTime,
      duration: activity.duration,
      day: activity.day,
      description: activity.description || ''
    });
    setIsEditActivityDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Setup</h1>
          <p className="text-gray-600 mt-2">Manage your training templates and activities</p>
        </div>
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

      {/* Search Section */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
        <Input
          className="pl-10"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates
          .filter(template => 
            template.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((template) => (
            <Card 
              key={template._id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedTemplate(template);
                setIsPreviewDialogOpen(true);
              }}
            >
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex justify-between items-start">
                  <div className="w-full">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-2">
                      Created by{' '}
                      <span className="font-medium">
                        {template.createdBy ? 
                          `${template.createdBy.firstName} ${template.createdBy.lastName}` : 
                          'Unknown'
                        }
                      </span>
                    </p>
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
                  <div className="flex gap-2 ml-4" onClick={e => e.stopPropagation()}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTemplate(template);
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
                            onClick={() => {
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
              </CardHeader>
              <CardContent className="p-4">
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
                              onClick={(e) => handleActivityClick(template, activity, e)}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{activity.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">{activity.startTime}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {activity.duration}m
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
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
              <CardFooter className="bg-gray-50 border-t p-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedTemplate(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
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
        <DialogContent className="sm:max-w-[600px]">
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
          
          <ScrollArea className="h-[calc(100vh-200px)] rounded-md border p-4">
            {selectedTemplate && Array.from({ length: selectedTemplate.days }, (_, dayIndex) => (
              <div key={dayIndex} className="mb-6 last:mb-0">
                <h3 className="mb-2 font-semibold">Day {dayIndex + 1}</h3>
                {selectedTemplate.activities
                  .filter(activity => activity.day === dayIndex + 1)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(activity => (
                    <div
                      key={activity._id}
                      className="mb-2 rounded-lg border p-3 last:mb-0 group hover:border-primary transition-colors cursor-pointer"
                      onClick={(e) => handleActivityClick(selectedTemplate, activity, e)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{activity.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.startTime} - {calculateEndTime(activity.startTime, activity.duration)} ({activity.duration} min)
                          </p>
                        </div>
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
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
            ))}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 