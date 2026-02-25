import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CalendarIcon, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
}

export function AssignCourseDialog({ open, onClose, courseId, courseTitle }: Props) {
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [initialEnrolled, setInitialEnrolled] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const profilesQuery = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, role')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['admin-enrollments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, user_id')
        .eq('course_id', courseId);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (enrollmentsQuery.data) {
      const enrolled = new Set(enrollmentsQuery.data.map(e => e.user_id));
      setSelectedUsers(new Set(enrolled));
      setInitialEnrolled(new Set(enrolled));
    }
  }, [enrollmentsQuery.data]);

  useEffect(() => {
    if (!open) {
      setSelectedUsers(new Set());
      setInitialEnrolled(new Set());
      setDueDate(undefined);
      setSearch('');
    }
  }, [open]);

  const learners = useMemo(() => {
    const all = profilesQuery.data ?? [];
    const filtered = all.filter(p => p.role !== 'admin');
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(p =>
      (p.full_name?.toLowerCase().includes(q)) ||
      (p.department?.toLowerCase().includes(q))
    );
  }, [profilesQuery.data, search]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Users to add (newly checked)
      const toAdd = [...selectedUsers].filter(id => !initialEnrolled.has(id));
      // Users to remove (unchecked)
      const toRemove = [...initialEnrolled].filter(id => !selectedUsers.has(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('enrollments')
          .delete()
          .eq('course_id', courseId)
          .in('user_id', toRemove);
        if (error) throw error;
      }

      if (toAdd.length > 0) {
        const rows = toAdd.map(userId => ({
          user_id: userId,
          course_id: courseId,
          status: 'assigned' as const,
          due_date: dueDate ? dueDate.toISOString() : null,
        }));
        const { error } = await supabase.from('enrollments').insert(rows);
        if (error) throw error;
      }

      toast.success(`Assignment disimpan. ${toAdd.length} ditambahkan, ${toRemove.length} dihapus.`);
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments', courseId] });
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isLoading = profilesQuery.isLoading || enrollmentsQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign: {courseTitle}</DialogTitle>
        </DialogHeader>

        {/* Due Date Picker */}
        <div className="space-y-2">
          <Label>Due Date (untuk user baru)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, 'PPP') : 'Pilih deadline...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                disabled={(date) => date < new Date()}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau departemen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 max-h-[40vh] border rounded-md">
            <div className="p-2 space-y-1">
              {learners.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada user ditemukan.</p>
              ) : (
                learners.map(p => {
                  const isChecked = selectedUsers.has(p.id);
                  const wasEnrolled = initialEnrolled.has(p.id);
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors hover:bg-accent",
                        isChecked && "bg-accent/50"
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleUser(p.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.full_name || 'Unnamed User'}</p>
                        {p.department && (
                          <p className="text-xs text-muted-foreground truncate">{p.department}</p>
                        )}
                      </div>
                      {wasEnrolled && (
                        <span className="text-xs text-muted-foreground shrink-0">Enrolled</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || isLoading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
