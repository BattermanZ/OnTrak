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
  Person as PersonIcon
} from '@mui/icons-material';
import { templates } from '../services/api';
import type { Template } from '../types';
import { useTemplateHistory } from '../hooks/useTemplateHistory';

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
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
      const response = await templates.create(newTemplate);
      addAction({
        type: 'CREATE',
        templateId: response.data._id,
        data: response.data
      });
      setOpenDialog(false);
      setNewTemplate({ name: '', days: 1, category: '', tags: [] });
      loadTemplates();
      setSnackbar({
        open: true,
        message: 'Template created successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating template:', error);
      setSnackbar({
        open: true,
        message: 'Error creating template',
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
                        {template.userId}
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