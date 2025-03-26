import React, { useState } from 'react';
import { Trash2, RefreshCw, AlertCircle, RotateCcw, HelpCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import Navigation from '../components/Navigation';
import { AppTour } from '../components/AppTour';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from '../components/ui/use-toast';
import { backups } from '../services/api';
import { Badge } from '../components/ui/badge';

interface Backup {
  fileName: string;
  size: number;
  createdAt: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'manual';
  retentionDays: number;
}

export default function BackupManager() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showTour, setShowTour] = useState(false);
  const queryClient = useQueryClient();

  const { data: backupsList = [], isLoading, error } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const response = await backups.list();
      return response.data;
    }
  });

  const createBackupMutation = useMutation({
    mutationFn: backups.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast({
        title: "Success",
        description: "Backup created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create backup",
        variant: "destructive",
      });
    }
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (fileName: string) => backups.delete(fileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      setIsDeleteDialogOpen(false);
      setSelectedBackup(null);
      toast({
        title: "Success",
        description: "Backup deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete backup",
        variant: "destructive",
      });
    }
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (fileName: string) => backups.restore(fileName),
    onSuccess: () => {
      setIsRestoreDialogOpen(false);
      setSelectedBackup(null);
      toast({
        title: "Success",
        description: "Backup restored successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore backup",
        variant: "destructive",
      });
    }
  });

  const handleCreateBackup = () => {
    createBackupMutation.mutate();
  };

  const handleDeleteBackup = () => {
    if (selectedBackup) {
      deleteBackupMutation.mutate(selectedBackup.fileName);
    }
  };

  const handleRestoreBackup = () => {
    if (selectedBackup) {
      restoreBackupMutation.mutate(selectedBackup.fileName);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getBackupRetentionInfo = (backup: Backup) => {
    const daysLeft = backup.retentionDays - differenceInDays(new Date(), parseISO(backup.createdAt));
    
    if (backup.type === 'yearly') {
      return { label: 'Permanent', variant: 'default' as const };
    }

    if (backup.type === 'manual') {
      return { 
        label: 'Manual backup', 
        variant: backup.retentionDays <= 0 ? 'destructive' as const : 'default' as const 
      };
    }
    
    if (daysLeft <= 0) {
      return { label: 'Expiring soon', variant: 'destructive' as const };
    }
    
    const retentionText = {
      daily: '14 days',
      weekly: '12 weeks',
      monthly: '1 year',
      yearly: 'permanent',
      manual: 'Keep last 5'
    }[backup.type];

    return { 
      label: `${retentionText}${daysLeft ? ` (${daysLeft} days left)` : ''}`,
      variant: daysLeft < 7 ? 'destructive' as const : 'default' as const 
    };
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-6 min-h-screen bg-[#F9FAFB]">
        <AppTour 
          page="backups"
          run={showTour} 
          onClose={() => setShowTour(false)} 
          steps={[
            {
              target: '.backup-header',
              title: 'Backup Management',
              content: 'This page allows you to manage your database backups. The system automatically creates backups at different intervals with specific retention periods.',
              placement: 'bottom',
            },
            {
              target: '.retention-info',
              title: 'Backup Retention Rules',
              content: 'Backups are automatically managed with different retention periods:\n• Daily backups are kept for 14 days\n• Weekly backups are kept for 12 weeks\n• Monthly backups are kept for 1 year\n• Yearly backups are permanent\n• Manual backups: only the last 5 are kept',
              placement: 'bottom',
            },
            {
              target: '.create-backup-button',
              title: 'Create Manual Backup',
              content: 'Click here to create a manual backup of your database. Manual backups follow the "last 5" retention rule.',
              placement: 'left',
            },
            {
              target: '.backup-type-badge',
              title: 'Backup Types',
              content: 'Each backup is categorized by type (daily, weekly, monthly, yearly, or manual) which determines its retention period.',
              placement: 'right',
            },
            {
              target: '.retention-badge',
              title: 'Retention Status',
              content: 'This shows how long the backup will be kept. It will turn red when the backup is close to expiration or has expired.',
              placement: 'right',
            },
            {
              target: '.backup-actions',
              title: 'Backup Actions',
              content: 'Here you can:\n• Restore a backup to recover your database to a previous state\n• Delete a backup manually (use with caution)',
              placement: 'left',
            },
            {
              target: '.restore-button',
              title: 'Restore Backup',
              content: 'Click here to restore your database to the state of this backup. This will replace your current database data.',
              placement: 'left',
            },
            {
              target: '.delete-button',
              title: 'Delete Backup',
              content: 'Permanently remove this backup. This action cannot be undone.',
              placement: 'left',
            }
          ]}
        />
        
        {/* Header Section */}
        <div className="backup-header flex justify-between items-center mb-8 bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Database Backups</h1>
            <div className="retention-info">
              <p className="text-sm text-muted-foreground mt-2">
                Automatic backup retention: Daily (14 days) • Weekly (12 weeks) • Monthly (1 year) • Yearly (permanent)
              </p>
              <p className="text-sm text-muted-foreground">
                Manual backups: Keep last 5 backups
              </p>
            </div>
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
              onClick={handleCreateBackup} 
              disabled={createBackupMutation.isPending}
              className="create-backup-button bg-purple-600 hover:bg-purple-700 text-white"
            >
              {createBackupMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Create Manual Backup
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load backups</AlertDescription>
          </Alert>
        )}

        <div className="bg-card rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Retention</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : backupsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-gray-500">No backups available</div>
                  </TableCell>
                </TableRow>
              ) : (
                backupsList.map((backup: Backup) => {
                  const retentionInfo = getBackupRetentionInfo(backup);
                  return (
                    <TableRow key={backup.fileName} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{backup.fileName}</TableCell>
                      <TableCell>
                        {format(new Date(backup.createdAt), 'PPpp')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="backup-type-badge capitalize">
                          {backup.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={retentionInfo.variant} className="retention-badge">
                          {retentionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(backup.size)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 backup-actions">
                          <Button
                            variant="outline"
                            size="icon"
                            className="restore-button"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setIsRestoreDialogOpen(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="delete-button"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Backup</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this backup? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedBackup(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteBackup}
                disabled={deleteBackupMutation.isPending}
              >
                {deleteBackupMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Backup</DialogTitle>
              <DialogDescription>
                Are you sure you want to restore this backup? This will replace your current database with the backup data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRestoreDialogOpen(false);
                  setSelectedBackup(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestoreBackup}
                disabled={restoreBackupMutation.isPending}
              >
                {restoreBackupMutation.isPending ? "Restoring..." : "Restore"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
} 