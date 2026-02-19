import { useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Italic, Heading2, List, Link, ImagePlus, FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';


interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const insertAtCursor = useCallback((before: string, after = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end);
    const newText = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newText);
    setTimeout(() => {
      ta.focus();
      const pos = start + before.length + selected.length + after.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  }, [value, onChange]);

  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end) || 'text';
    const newText = value.substring(0, start) + prefix + selected + suffix + value.substring(end);
    onChange(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }, [value, onChange]);

  const handleBold = () => wrapSelection('**', '**');
  const handleItalic = () => wrapSelection('_', '_');
  const handleHeading = () => insertAtCursor('\n## ');
  const handleList = () => insertAtCursor('\n- ');
  const handleLink = () => wrapSelection('[', '](url)');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File terlalu besar (maks 10MB)');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('course_materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course_materials')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        insertAtCursor(`\n![${file.name}](${publicUrl})\n`);
      } else {
        insertAtCursor(`\n[Download ${file.name}](${publicUrl})\n`);
      }

      toast.success('File berhasil diupload');
    } catch (err: any) {
      toast.error('Upload gagal: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toolbarButtons = [
    { icon: Bold, label: 'Bold', onClick: handleBold },
    { icon: Italic, label: 'Italic', onClick: handleItalic },
    { icon: Heading2, label: 'Heading', onClick: handleHeading },
    { icon: List, label: 'List', onClick: handleList },
    { icon: Link, label: 'Link', onClick: handleLink },
  ];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-input bg-muted/50 p-1">
        {toolbarButtons.map(({ icon: Icon, label, onClick }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClick}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}

        <div className="mx-1 h-5 w-px bg-border" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload Image/File"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tulis artikel dalam format Markdown..."
        rows={14}
        className="rounded-t-none border-t-0 font-mono text-xs"
      />
    </div>
  );
}
