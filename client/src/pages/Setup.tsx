import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
  IconButton, 
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  AlertColor,
  Chip,
  Autocomplete,
  InputAdornment,
  Tooltip,
  Divider,
  Grid
} from '@mui/material';
import { 
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  ArrowBack as ArrowBackIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Person as PersonIcon,
  PlaylistAdd as PlaylistAddIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { templates } from '../services/api';
import type { Template } from '../types';
import { useTemplateHistory } from '../hooks/useTemplateHistory';

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ 
    name: '', 
    days: 1,
    category: '',
    tags: [] as string[]
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const { addAction, undo, redo, canUndo, canRedo } = useTemplateHistory();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [activityDialog, setActivityDialog] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    startTime: '',
    duration: 30,
    description: '',
    day: 1
  });
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const searchTemplates = useCallback(async () => {
    try {
      const response = await templates.search(searchQuery, {
        category: selectedCategory || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined
      });
      setTemplateList(response.data);
    } catch (error) {
      console.error('Error searching templates:', error);
    }
  }, [searchQuery, selectedCategory, selectedTags]);

  useEffect(() => {
    loadTemplates();
    loadCategoriesAndTags();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      searchTemplates();
    }, 500);
    return () => clearTimeout(delaySearch);
  }, [searchTemplates]);

  const loadCategoriesAndTags = async () => {
    try {
      const [categoriesResponse, tagsResponse] = await Promise.all([
        templates.getCategories(),
        templates.getTags()
      ]);
      setCategories(categoriesResponse.data);
      setTags(tagsResponse.data);
    } catch (error) {
      console.error('Error loading categories and tags:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await templates.getAll();
      setTemplateList(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
      setSnackbar({
        open: true,
        message: 'Error loading templates',
        severity: 'error'
      });
    }
  };

  const handleCreateTemplate = async () => {
    try {
      if (!newTemplate.name.trim()) {
        setSnackbar({
          open: true,
          message: 'Template name is required',
          severity: 'error'
        });
        return;
      }

      if (newTemplate.days < 1) {
        setSnackbar({
          open: true,
          message: 'Number of days must be at least 1',
          severity: 'error'
        });
        return;
      }

      const response = await templates.create(newTemplate);
      addAction({
        type: 'CREATE',
        templateId: response.data._id,
        data: response.data
      });
      setOpenDialog(false);
      setNewTemplate({ name: '', days: 1, category: '', tags: [] });
      await loadTemplates();
      setSnackbar({
        open: true,
        message: 'Template created successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error creating template:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Error creating template',
        severity: 'error'
      });
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const response = await templates.duplicate(template._id);
      addAction({
        type: 'CREATE',
        templateId: response.data._id,
        data: response.data
      });
      loadTemplates();
      setSnackbar({
        open: true,
        message: 'Template duplicated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
      setSnackbar({
        open: true,
        message: 'Error duplicating template',
        severity: 'error'
      });
    }
    handleCloseMenu();
  };

  const handleDeleteTemplate = async (template: Template) => {
    try {
      await templates.delete(template._id);
      addAction({
        type: 'DELETE',
        templateId: template._id,
        data: template
      });
      loadTemplates();
      setSnackbar({
        open: true,
        message: 'Template deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting template',
        severity: 'error'
      });
    }
    handleCloseMenu();
  };

  const handleExportPDF = async (template: Template) => {
    try {
      const response = await templates.exportPDF(template._id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSnackbar({
        open: true,
        message: 'PDF exported successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setSnackbar({
        open: true,
        message: 'Error exporting PDF',
        severity: 'error'
      });
    }
    handleCloseMenu();
  };

  const handleCheckConflicts = async (template: Template) => {
    try {
      const response = await templates.checkConflicts(template._id);
      if (response.data.length > 0) {
        setSnackbar({
          open: true,
          message: `Found ${response.data.length} conflicts in the template`,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'No conflicts found',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
      setSnackbar({
        open: true,
        message: 'Error checking conflicts',
        severity: 'error'
      });
    }
    handleCloseMenu();
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, template: Template) => {
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedTemplate(null);
  };

  const handleAddActivity = async () => {
    console.log('Adding activity:', { selectedTemplate, newActivity });  // Debug log
    
    if (!selectedTemplate) {
      console.error('No template selected');  // Debug log
      setSnackbar({
        open: true,
        message: 'No template selected',
        severity: 'error'
      });
      return;
    }

    // Validate required fields
    if (!newActivity.name || !newActivity.startTime) {
      console.error('Missing required fields:', { newActivity });  // Debug log
      setSnackbar({
        open: true,
        message: 'Name and start time are required',
        severity: 'error'
      });
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newActivity.startTime)) {
      console.error('Invalid time format:', { startTime: newActivity.startTime });  // Debug log
      setSnackbar({
        open: true,
        message: 'Invalid time format. Please use HH:MM format (e.g., 09:00)',
        severity: 'error'
      });
      return;
    }

    try {
      const templateId = selectedTemplate._id;
      console.log('Sending request to add activity:', { templateId, activity: newActivity });  // Debug log
      
      const response = await templates.addActivity(templateId, {
        ...newActivity,
        day: Math.min(Math.max(1, newActivity.day), selectedTemplate.days)
      });
      
      console.log('Activity added successfully:', response.data);  // Debug log
      
      addAction({
        type: 'ADD_ACTIVITY',
        templateId: templateId,
        data: response.data
      });
      
      // Reset form and close dialog
      setActivityDialog(false);
      setNewActivity({
        name: '',
        startTime: '',
        duration: 30,
        description: '',
        day: 1
      });
      
      // Reload templates to get the updated data
      await loadTemplates();
      
      setSnackbar({
        open: true,
        message: 'Activity added successfully',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error adding activity:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Error adding activity',
        severity: 'error'
      });
    }
  };

  const handleEditTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const response = await templates.update(editingTemplate._id, {
        name: editingTemplate.name,
        days: editingTemplate.days,
        category: editingTemplate.category,
        tags: editingTemplate.tags
      });
      addAction({
        type: 'UPDATE',
        templateId: response.data._id,
        data: response.data
      });
      setEditDialog(false);
      setEditingTemplate(null);
      loadTemplates();
      setSnackbar({
        open: true,
        message: 'Template updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating template:', error);
      setSnackbar({
        open: true,
        message: 'Error updating template',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          variant="outlined"
        >
          Back to Dashboard
        </Button>
        <Box>
          <Tooltip title={canUndo ? 'Undo last action' : 'No actions to undo'}>
            <span>
              <IconButton onClick={undo} disabled={!canUndo}>
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={canRedo ? 'Redo last action' : 'No actions to redo'}>
            <span>
              <IconButton onClick={redo} disabled={!canRedo}>
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            variant="contained"
            color="primary"
            sx={{ ml: 2 }}
          >
            Create Template
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Autocomplete
            value={selectedCategory}
            onChange={(_, newValue) => setSelectedCategory(newValue)}
            options={categories}
            renderInput={(params) => (
              <TextField {...params} label="Filter by Category" />
            )}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Autocomplete
            multiple
            value={selectedTags}
            onChange={(_, newValue) => setSelectedTags(newValue)}
            options={tags}
            renderInput={(params) => (
              <TextField {...params} label="Filter by Tags" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
          />
        </Grid>
      </Grid>

      <List>
        {templateList.map((template) => (
          <ListItem
            key={template._id}
            component={Card}
            sx={{ mb: 2 }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">{template.name}</Typography>
                  <Chip 
                    label={template.category || 'Uncategorized'} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                  <Tooltip title="Created by">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        {template.createdBy?.email || 'Unknown'}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              }
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {template.days} days - {template.activities.length} activities
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {template.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                onClick={(event) => handleOpenMenu(event, template)}
              >
                <MoreVertIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          if (selectedTemplate) {
            setActivityDialog(true);
            setSelectedTemplate(selectedTemplate);
          }
          handleCloseMenu();
        }}>
          <PlaylistAddIcon sx={{ mr: 1 }} /> Add Activity
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedTemplate) {
            setEditingTemplate(selectedTemplate);
            setEditDialog(true);
          }
          handleCloseMenu();
        }}>
          <EditIcon sx={{ mr: 1 }} /> Edit Template
        </MenuItem>
        <MenuItem onClick={() => selectedTemplate && handleDuplicateTemplate(selectedTemplate)}>
          <ContentCopyIcon sx={{ mr: 1 }} /> Duplicate
        </MenuItem>
        <MenuItem onClick={() => selectedTemplate && handleExportPDF(selectedTemplate)}>
          <PdfIcon sx={{ mr: 1 }} /> Export PDF
        </MenuItem>
        <MenuItem onClick={() => selectedTemplate && handleCheckConflicts(selectedTemplate)}>
          <WarningIcon sx={{ mr: 1 }} /> Check Conflicts
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => selectedTemplate && handleDeleteTemplate(selectedTemplate)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Number of Days"
            type="number"
            fullWidth
            value={newTemplate.days}
            onChange={(e) => setNewTemplate({ ...newTemplate, days: parseInt(e.target.value) || 1 })}
          />
          <Autocomplete
            value={newTemplate.category}
            onChange={(_, newValue) => setNewTemplate({ ...newTemplate, category: newValue || '' })}
            options={categories}
            freeSolo
            renderInput={(params) => (
              <TextField {...params} label="Category" margin="dense" />
            )}
          />
          <Autocomplete
            multiple
            value={newTemplate.tags}
            onChange={(_, newValue) => setNewTemplate({ ...newTemplate, tags: newValue })}
            options={tags}
            freeSolo
            renderInput={(params) => (
              <TextField {...params} label="Tags" margin="dense" />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={activityDialog} 
        onClose={() => {
          setActivityDialog(false);
          setNewActivity({
            name: '',
            startTime: '',
            duration: 30,
            description: '',
            day: 1
          });
          setSelectedTemplate(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Activity</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Activity Name"
            fullWidth
            value={newActivity.name}
            onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Start Time (HH:MM)"
            fullWidth
            value={newActivity.startTime}
            onChange={(e) => setNewActivity({ ...newActivity, startTime: e.target.value })}
            placeholder="09:00"
          />
          <TextField
            margin="dense"
            label="Duration (minutes)"
            type="number"
            fullWidth
            value={newActivity.duration}
            onChange={(e) => setNewActivity({ ...newActivity, duration: parseInt(e.target.value) || 30 })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newActivity.description}
            onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Day"
            type="number"
            fullWidth
            value={newActivity.day}
            onChange={(e) => setNewActivity({ ...newActivity, day: parseInt(e.target.value) || 1 })}
            inputProps={{ min: 1, max: selectedTemplate?.days || 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDialog(false)}>Cancel</Button>
          <Button onClick={handleAddActivity} variant="contained" color="primary">
            Add Activity
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={editDialog} 
        onClose={() => {
          setEditDialog(false);
          setEditingTemplate(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            value={editingTemplate?.name || ''}
            onChange={(e) => setEditingTemplate(prev => 
              prev ? { ...prev, name: e.target.value } : null
            )}
          />
          <TextField
            margin="dense"
            label="Number of Days"
            type="number"
            fullWidth
            value={editingTemplate?.days || 1}
            onChange={(e) => setEditingTemplate(prev => 
              prev ? { ...prev, days: parseInt(e.target.value) || 1 } : null
            )}
          />
          <Autocomplete
            value={editingTemplate?.category || ''}
            onChange={(_, newValue) => setEditingTemplate(prev => 
              prev ? { ...prev, category: newValue || '' } : null
            )}
            options={categories}
            freeSolo
            renderInput={(params) => (
              <TextField {...params} label="Category" margin="dense" />
            )}
          />
          <Autocomplete
            multiple
            value={editingTemplate?.tags || []}
            onChange={(_, newValue) => setEditingTemplate(prev => 
              prev ? { ...prev, tags: newValue } : null
            )}
            options={tags}
            freeSolo
            renderInput={(params) => (
              <TextField {...params} label="Tags" margin="dense" />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialog(false);
            setEditingTemplate(null);
          }}>Cancel</Button>
          <Button onClick={handleEditTemplate} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 