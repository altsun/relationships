import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { ContactNote } from "@/types";

interface Props {
  contactId: string;
  notes: ContactNote[];
  onChange: (notes: ContactNote[]) => void;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ContactNotes({ contactId, notes, onChange }: Props) {
  const { getToken } = useAuth();
  const [adding, setAdding]         = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving]         = useState(false);

  const startAdd = () => { setAdding(true); setNewContent(""); };
  const cancelAdd = () => { setAdding(false); setNewContent(""); };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      const note  = await api.notes.create(contactId, newContent.trim(), token!) as ContactNote;
      onChange([note, ...notes]);
      setAdding(false);
      setNewContent("");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note: ContactNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => { setEditingId(null); setEditContent(""); };

  const handleEdit = async (noteId: string) => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      const token   = await getToken();
      const updated = await api.notes.update(contactId, noteId, editContent.trim(), token!) as ContactNote;
      onChange(notes.map((n) => (n.id === noteId ? updated : n)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Xoá ghi chú này?")) return;
    const token = await getToken();
    await api.notes.remove(contactId, noteId, token!);
    onChange(notes.filter((n) => n.id !== noteId));
  };

  return (
    <div className="space-y-3">
      {adding ? (
        <div className="space-y-2">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            placeholder="Nhập ghi chú..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelAdd();
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAdd();
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving || !newContent.trim()}>
              <Check size={14} /> Thêm
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelAdd} disabled={saving}>
              <X size={14} /> Huỷ
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={15} /> Thêm ghi chú
        </button>
      )}

      {notes.map((note) => (
        <div key={note.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          {editingId === note.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") cancelEdit();
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleEdit(note.id);
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEdit(note.id)} disabled={saving || !editContent.trim()}>
                  <Check size={14} /> Lưu
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                  <X size={14} /> Huỷ
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{formatDate(note.updatedAt ?? note.createdAt)}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(note)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Sửa"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Xoá"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
