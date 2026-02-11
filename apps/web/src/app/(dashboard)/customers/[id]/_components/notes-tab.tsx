"use client";

import * as React from "react";
import { format } from "date-fns";
import { Send } from "lucide-react";
import { Button, Card, CardContent } from "@bites-rms/ui";
import { trpc } from "@/trpc/client";

interface Note {
  id: string;
  createdAt: Date | string;
  text: string;
  author: {
    id: string;
    name: string;
  };
}

interface Props {
  customerId: string;
  notes: Note[];
  onNoteAdded: () => void;
}

export function NotesTab({ customerId, notes, onNoteAdded }: Props) {
  const [text, setText] = React.useState("");

  const addNoteMutation = trpc.customer.addNote.useMutation({
    onSuccess: () => {
      setText("");
      onNoteAdded();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    addNoteMutation.mutate({ customerId, text: text.trim() });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add note form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note about this customer..."
          rows={2}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || addNoteMutation.isPending}
          className="self-end gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {addNoteMutation.isPending ? "Adding..." : "Add"}
        </Button>
      </form>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No notes yet. Add a note above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {note.author.name} &middot;{" "}
                  {format(new Date(note.createdAt), "MMM d, yyyy 'at' HH:mm")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
