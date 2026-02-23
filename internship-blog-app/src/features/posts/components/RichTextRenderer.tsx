"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "./extensions/Image";

interface RichTextRendererProps {
  content: Record<string, unknown>;
}

export function RichTextRenderer({ content }: RichTextRendererProps) {
  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}
