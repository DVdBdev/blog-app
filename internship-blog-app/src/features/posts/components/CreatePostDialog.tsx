"use client";

import { useEffect, useRef, useState } from "react";
import { createPost, CreatePostData } from "../posts.actions";
import { PostStatus } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { getDefaultPostStatus } from "@/lib/user-preferences";

interface CreatePostDialogProps {
  journeyId: string;
}

function normalizeContent(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function countImageNodes(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const typed = node as { type?: string; content?: unknown[] };
  const selfCount = typed.type === "image" ? 1 : 0;
  const children = Array.isArray(typed.content) ? typed.content : [];
  return selfCount + children.reduce((sum, child) => sum + countImageNodes(child), 0);
}

export function CreatePostDialog({ journeyId }: CreatePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [editorMountKey, setEditorMountKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<CreatePostData>({
    journey_id: journeyId,
    title: "",
    content: {},
    status: "draft",
  });
  const latestContentRef = useRef<Record<string, unknown>>({});
  const editorContentGetterRef = useRef<(() => Record<string, unknown>) | null>(null);

  useEffect(() => {
    const storedDefaultStatus = getDefaultPostStatus();
    setFormData((prev) => ({ ...prev, status: storedDefaultStatus }));
    latestContentRef.current = {};
  }, []);

  useEffect(() => {
    if (open) {
      setEditorMountKey((prev) => prev + 1);
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: CreatePostData) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: PostStatus) => {
    setFormData((prev: CreatePostData) => ({ ...prev, status: value }));
  };

  const handleContentChange = (content: Record<string, unknown>) => {
    latestContentRef.current = content;
    setFormData((prev: CreatePostData) => ({ ...prev, content }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const liveContentNow = editorContentGetterRef.current
        ? editorContentGetterRef.current()
        : latestContentRef.current;
      await new Promise((resolve) => setTimeout(resolve, 80));
      const liveContentAfterDelay = editorContentGetterRef.current
        ? editorContentGetterRef.current()
        : latestContentRef.current;
      const contentToSave =
        countImageNodes(liveContentAfterDelay) >= countImageNodes(liveContentNow)
          ? liveContentAfterDelay
          : liveContentNow;

      const payload: CreatePostData = {
        ...formData,
        content: contentToSave,
      };

      const result = await createPost(payload);
      if (result.error) {
        setError(result.error);
      } else {
        const savedContent = normalizeContent(result.post?.content);
        if (savedContent) {
          latestContentRef.current = savedContent;
          setFormData((prev) => ({ ...prev, content: savedContent }));
          setEditorMountKey((prev) => prev + 1);
        }

        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          const storedDefaultStatus = getDefaultPostStatus();
          setFormData({
            journey_id: journeyId,
            title: "",
            content: {},
            status: storedDefaultStatus,
          });
          latestContentRef.current = {};
        }, 1500);
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Post</DialogTitle>
          <DialogDescription>
            Write a new post for your journey.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <AlertDescription>Post created successfully!</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Post title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <RichTextEditor
              key={editorMountKey}
              content={formData.content}
              onChange={handleContentChange}
              onImageUploadStateChange={setIsUploadingImage}
              onEditorContentGetterChange={(getter) => {
                editorContentGetterRef.current = getter;
              }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploadingImage || !formData.title.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploadingImage ? "Uploading image..." : "Save Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
