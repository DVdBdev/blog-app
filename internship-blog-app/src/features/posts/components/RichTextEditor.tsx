"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  ImagePlus,
  Quote,
  Strikethrough,
  Redo2,
  Undo2,
  RemoveFormatting,
  Loader2,
} from "lucide-react";
import { Image } from "./extensions/Image";

interface RichTextEditorProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  onImageUploadStateChange?: (isUploading: boolean) => void;
  onEditorContentGetterChange?: (getter: () => Record<string, unknown>) => void;
}

export function RichTextEditor({
  content,
  onChange,
  onImageUploadStateChange,
  onEditorContentGetterChange,
}: RichTextEditorProps) {
  const supabase = createBrowserSupabaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const POST_IMAGES_BUCKET = "post-images";

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({
        placeholder: "Write your post...",
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4 border rounded-md mt-2",
      },
    },
  });

  useEffect(() => {
    if (!editor || !onEditorContentGetterChange) return;
    onEditorContentGetterChange(() => editor.getJSON());
  }, [editor, onEditorContentGetterChange]);

  if (!editor) {
    return null;
  }

  const getFriendlyStorageError = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes("bucket not found")) {
      return `Storage bucket "${POST_IMAGES_BUCKET}" is missing. Run migration 008_create_post_images_storage.sql.`;
    }

    if (normalized.includes("row-level security policy")) {
      return `Upload blocked by Supabase Storage policy. Ensure "${POST_IMAGES_BUCKET}" policies allow uploads to your own folder.`;
    }

    return message;
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    setUploadError(null);
    setIsUploadingImage(true);
    onImageUploadStateChange?.(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("You must be signed in to upload images.");
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
      const path = `${authData.user.id}/posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(POST_IMAGES_BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) {
        throw new Error(getFriendlyStorageError(uploadError.message));
      }

      // Prefer a long-lived signed URL so images still render even if bucket visibility
      // differs between environments.
      const { data: signedData, error: signedError } = await supabase.storage
        .from(POST_IMAGES_BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const { data: publicData } = supabase.storage
        .from(POST_IMAGES_BUCKET)
        .getPublicUrl(path);
      const imageSrc = !signedError && signedData?.signedUrl
        ? signedData.signedUrl
        : publicData.publicUrl;

      editor
        .chain()
        .focus()
        .insertContent({ type: "image", attrs: { src: imageSrc } })
        .run();

      // Wait one tick so ProseMirror transaction fully commits before we unlock save.
      await new Promise((resolve) => setTimeout(resolve, 0));
      onChange(editor.getJSON());
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
      onImageUploadStateChange?.(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {uploadError ? (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-1 p-1 border rounded-md bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-muted" : ""}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted" : ""}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "bg-muted" : ""}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
          title="Heading"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "bg-muted" : ""}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted" : ""}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-muted" : ""}
          title="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handlePickImage}
          title="Upload image from your computer"
          disabled={isUploadingImage}
        >
          {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
