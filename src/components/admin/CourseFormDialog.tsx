import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { QuizManager } from './QuizManager';
import { MarkdownEditor } from './MarkdownEditor';

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: string | null;
}

interface CourseForm {
  title: string;
  description: string;
  content_type: string;
  video_url: string;
  article_content: string;
  thumbnail_url: string;
  duration_minutes: string;
}

const emptyForm: CourseForm = {
  title: '',
  description: '',
  content_type: 'video',
  video_url: '',
  article_content: '',
  thumbnail_url: '',
  duration_minutes: '',
};

export function CourseFormDialog({ open, onClose, courseId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!courseId;
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Fetch course data for editing
  const courseQuery = useQuery({
    queryKey: ['admin-course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && open,
  });

  useEffect(() => {
    if (courseQuery.data) {
      const c = courseQuery.data;
      setForm({
        title: c.title ?? '',
        description: c.description ?? '',
        content_type: c.content_type ?? 'video',
        video_url: c.video_url ?? '',
        article_content: c.article_content ?? '',
        thumbnail_url: c.thumbnail_url ?? '',
        duration_minutes: c.duration_minutes?.toString() ?? '',
      });
    } else if (!courseId) {
      setForm(emptyForm);
    }
  }, [courseQuery.data, courseId]);

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setActiveTab('details');
    }
  }, [open]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        content_type: form.content_type,
        video_url: form.content_type === 'video' ? (form.video_url || null) : null,
        article_content: form.content_type === 'article' ? (form.article_content || null) : null,
        thumbnail_url: form.thumbnail_url || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      };

      if (isEdit) {
        const { error } = await supabase.from('courses').update(payload).eq('id', courseId);
        if (error) throw error;
        toast.success('Course berhasil diupdate');
      } else {
        const { error } = await supabase.from('courses').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast.success('Course berhasil dibuat');
      }

      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof CourseForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Course' : 'Create New Course'}</DialogTitle>
        </DialogHeader>

        {isEdit ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="quiz" className="flex-1">Manage Quiz</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <CourseFields form={form} setField={setField} saving={saving} onSave={handleSave} />
            </TabsContent>

            <TabsContent value="quiz">
              {courseId && <QuizManager courseId={courseId} />}
            </TabsContent>
          </Tabs>
        ) : (
          <CourseFields form={form} setField={setField} saving={saving} onSave={handleSave} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CourseFields({ form, setField, saving, onSave }: {
  form: CourseForm;
  setField: (key: keyof CourseForm, value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Judul course" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Deskripsi singkat" rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Content Type</Label>
        <Select value={form.content_type} onValueChange={(v) => setField('content_type', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="article">Article</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.content_type === 'video' && (
        <div className="space-y-2">
          <Label>Video URL</Label>
          <Input value={form.video_url} onChange={(e) => setField('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </div>
      )}

      {form.content_type === 'article' && (
        <div className="space-y-2">
          <Label>Article Content (Markdown)</Label>
          <MarkdownEditor
            value={form.article_content}
            onChange={(val) => setField('article_content', val)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Thumbnail URL</Label>
          <Input value={form.thumbnail_url} onChange={(e) => setField('thumbnail_url', e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <Input type="number" value={form.duration_minutes} onChange={(e) => setField('duration_minutes', e.target.value)} placeholder="30" />
        </div>
      </div>

      <Button onClick={onSave} disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {saving ? 'Saving...' : 'Save Course'}
      </Button>
    </div>
  );
}
