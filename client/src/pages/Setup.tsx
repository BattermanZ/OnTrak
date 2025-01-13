import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { templates as templateApi, type Template, type Activity } from '../services/api';

import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
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
  DialogTrigger,
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

export default function Setup() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    days: 1
  });
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    name: '',
    startTime: '',
    duration: 30,
    description: '',
    day: 1
  });
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [calculatedEndTime, setCalculatedEndTime] = useState<string>('');
  const [isDeleteActivityDialogOpen, setIsDeleteActivityDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await templateApi.getAll();
      setTemplates(response.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await templateApi.delete(templateId);
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting template');
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

  const openEditDialog = (template: Template) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      days: template.days
    });
    setIsEditDialogOpen(true);
  };

  const handleAddActivity = async () => {
    if (!selectedTemplate) return;
    try {
      setError(null);
      await templateApi.addActivity(selectedTemplate._id, activityForm);
      setIsActivityDialogOpen(false);
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

  const openActivityDialog = (template: Template) => {
    setSelectedTemplate(template);
    setActivityForm({
      name: '',
      startTime: '',
      duration: 30,
      description: '',
      day: 1
    });
    setIsActivityDialogOpen(true);
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleEditActivity = (activity: Activity) => {
    setActivityForm({
      name: activity.name,
      startTime: activity.startTime,
      duration: activity.duration,
      description: activity.description || '',
      day: activity.day
    });
    setSelectedActivity(activity);
    setIsActivityDialogOpen(true);
    setIsPreviewDialogOpen(false);
  };

  const templateDialog = (template: Template | null) => (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          {template ? `Preview: ${template.name}` : 'Create Training Template'}
        </DialogTitle>
        <DialogDescription>
          {template ? `View activities for ${template.name}` : 'Create a new training template'}
        </DialogDescription>
      </DialogHeader>
      
      {template && (
        <ScrollArea className="h-[calc(100vh-200px)] rounded-md border p-4">
          {Array.from({ length: template.days }, (_, dayIndex) => (
            <div key={dayIndex} className="mb-6 last:mb-0">
              <h3 className="mb-2 font-semibold">Day {dayIndex + 1}</h3>
              {template.activities
                .filter(activity => activity.day === dayIndex + 1)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map(activity => (
                  <div
                    key={activity._id}
                    className="mb-2 rounded-lg border p-3 last:mb-0 group hover:border-primary transition-colors"
                    onClick={() => handleEditActivity(activity)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.startTime} ({activity.duration} min)
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActivity(activity);
                          setIsDeleteActivityDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              {template.activities.filter(activity => activity.day === dayIndex + 1).length === 0 && (
                <p className="text-sm text-muted-foreground">No activities scheduled for this day</p>
              )}
            </div>
          ))}
        </ScrollArea>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Training Setup</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your training templates
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Training
            </Button>
          </DialogTrigger>
          {templateDialog(null)}
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              No templates found
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <Card 
                key={template._id} 
                className="group hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedTemplate(template);
                  setIsPreviewDialogOpen(true);
                }}
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {template.name}
                    <Badge variant="secondary">
                      {template.activities.length} exercises
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Days: {template.days}</p>
                    <p>Created by: {template.createdBy.email}</p>
                    <p>Created: {new Date(template.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
                <CardFooter className="justify-end space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => openActivityDialog(template)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add activity</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => openEditDialog(template)}
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
                          variant="destructive" 
                          size="icon"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete template</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        {templateDialog(selectedTemplate)}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedTemplate(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedTemplate && handleDeleteTemplate(selectedTemplate._id)}
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        {templateDialog(selectedTemplate)}
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Add a new activity to "{selectedTemplate?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="activity-name" className="text-sm font-medium">
                Activity Name
              </label>
              <Input
                id="activity-name"
                value={activityForm.name}
                onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                placeholder="Enter activity name"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="start-time" className="text-sm font-medium">
                Start Time
              </label>
              <div className="flex gap-4 items-center">
                <Input
                  id="start-time"
                  value={activityForm.startTime}
                  onChange={(e) => {
                    const formattedTime = formatTimeInput(e.target.value);
                    setActivityForm({ ...activityForm, startTime: formattedTime });
                  }}
                  placeholder="0930"
                  className="flex-grow"
                />
                {calculatedEndTime && (
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    End: {calculatedEndTime}
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="duration" className="text-sm font-medium">
                Duration (minutes)
              </label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={activityForm.duration}
                onChange={(e) => setActivityForm({ ...activityForm, duration: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="day" className="text-sm font-medium">
                Day
              </label>
              <Select
                value={activityForm.day.toString()}
                onValueChange={(value: string) => setActivityForm({ ...activityForm, day: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTemplate && [...Array(selectedTemplate.days)].map((_, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      Day {index + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="description"
                value={activityForm.description}
                onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                placeholder="Enter activity description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsActivityDialogOpen(false);
              setSelectedTemplate(null);
              setActivityForm({
                name: '',
                startTime: '',
                duration: 30,
                description: '',
                day: 1
              });
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddActivity}>
              Add Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Activity Confirmation Dialog */}
      <Dialog open={isDeleteActivityDialogOpen} onOpenChange={setIsDeleteActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedActivity?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteActivityDialogOpen(false);
              setSelectedActivity(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteActivity}
            >
              Delete Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 