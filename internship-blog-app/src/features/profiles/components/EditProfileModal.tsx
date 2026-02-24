"use client";

import { useState, useEffect, useRef } from "react";
import { Profile } from "@/types";
import { updateProfile, UpdateProfileData } from "../profile.actions";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Pencil, Upload, ImagePlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EditProfileModalProps {
  profile: Profile;
}

const PROFILE_PICTURES_BUCKET = "profile-pictures";

export function EditProfileModal({ profile }: EditProfileModalProps) {
  const supabase = createBrowserSupabaseClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const [formData, setFormData] = useState<UpdateProfileData>({
    display_name: profile.display_name || "",
    bio: profile.bio || "",
    avatar_url: profile.avatar_url || null,
    company: profile.company || "",
    field_domain: profile.field_domain || "",
    education: profile.education || "",
    location: profile.location || "",
    contact_email: profile.contact_email || "",
    phone: profile.phone || "",
    github_url: profile.github_url || "",
    linkedin_url: profile.linkedin_url || "",
    website_url: profile.website_url || "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || null,
        company: profile.company || "",
        field_domain: profile.field_domain || "",
        education: profile.education || "",
        location: profile.location || "",
        contact_email: profile.contact_email || "",
        phone: profile.phone || "",
        github_url: profile.github_url || "",
        linkedin_url: profile.linkedin_url || "",
        website_url: profile.website_url || "",
      });
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemoveAvatar(false);
      setError(null);
      setSuccess(false);
    }
  }, [open, profile]);

  useEffect(() => {
    const handleOpenFromCompletion = () => setOpen(true);
    window.addEventListener("open-edit-profile-modal", handleOpenFromCompletion);
    return () => {
      window.removeEventListener("open-edit-profile-modal", handleOpenFromCompletion);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getAvatarFallback = () => {
    if (profile.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    }
    return profile.username.substring(0, 2).toUpperCase();
  };

  const extractStoragePath = (avatarUrl: string) => {
    const marker = `/storage/v1/object/public/${PROFILE_PICTURES_BUCKET}/`;
    const index = avatarUrl.indexOf(marker);
    if (index === -1) {
      return null;
    }
    return decodeURIComponent(avatarUrl.substring(index + marker.length));
  };

  const getFriendlyStorageError = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes("bucket not found")) {
      return `Storage bucket "${PROFILE_PICTURES_BUCKET}" is missing. Run migration 005_create_profile_pictures_storage.sql in your Supabase project.`;
    }

    if (normalized.includes("row-level security policy")) {
      return `Upload blocked by Supabase Storage RLS policy. Ensure your "${PROFILE_PICTURES_BUCKET}" INSERT policy allows path "${profile.id}/..." for authenticated users.`;
    }

    return message;
  };

  const deleteExistingAvatarIfPresent = async (avatarUrl: string | null | undefined) => {
    if (!avatarUrl) {
      return;
    }

    const path = extractStoragePath(avatarUrl);
    if (!path) {
      return;
    }

    await supabase.storage.from(PROFILE_PICTURES_BUCKET).remove([path]);
  };

  const uploadAvatar = async (file: File) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error("You must be signed in to upload a profile picture.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const path = `${authData.user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .upload(path, file, { upsert: false });

    if (uploadError) {
      throw new Error(getFriendlyStorageError(uploadError.message));
    }

    const { data: publicData } = supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .getPublicUrl(path);

    return publicData.publicUrl;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const triggerAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const resetLocalAvatarSelection = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let nextAvatarUrl = formData.avatar_url ?? profile.avatar_url;

      if (avatarFile) {
        await deleteExistingAvatarIfPresent(profile.avatar_url);
        nextAvatarUrl = await uploadAvatar(avatarFile);
      } else if (removeAvatar) {
        await deleteExistingAvatarIfPresent(profile.avatar_url);
        nextAvatarUrl = null;
      }

      const payload: UpdateProfileData = {
        ...formData,
        avatar_url: nextAvatarUrl,
      };

      const result = await updateProfile(payload);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 w-full sm:w-auto">
          <Pencil className="h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-0.75rem)] sm:w-full sm:max-w-[600px] max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 py-1 sm:py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <AlertDescription>Profile updated successfully!</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profile.username}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              name="display_name"
              value={formData.display_name || ""}
              onChange={handleChange}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="avatar_upload">Profile Picture</Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-border/70 bg-card/80 p-3">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={removeAvatar ? undefined : avatarPreview || formData.avatar_url || undefined}
                  alt={profile.username}
                />
                <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={triggerAvatarPicker}
                    disabled={isLoading}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Upload className="h-4 w-4" />
                    {avatarFile ? "Replace file" : "Choose file"}
                  </Button>
                  {avatarFile ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      onClick={resetLocalAvatarSelection}
                      className="w-full sm:w-auto"
                    >
                      Clear selection
                    </Button>
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground break-words">
                  {avatarFile
                    ? `Selected: ${avatarFile.name}`
                    : removeAvatar
                      ? "Avatar will be removed when you save."
                      : formData.avatar_url
                        ? "Current avatar is shown. Choose a new file to replace it."
                        : "No file selected. PNG, JPG, WEBP, or GIF."}
                </p>
              </div>

              <Input
                ref={avatarInputRef}
                id="avatar_upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={handleAvatarChange}
                disabled={isLoading}
                className="hidden"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetLocalAvatarSelection();
                  setRemoveAvatar(true);
                }}
                disabled={isLoading || (!formData.avatar_url && !avatarPreview)}
                className="gap-2 w-full sm:w-auto"
              >
                <ImagePlus className="h-4 w-4" />
                Remove Photo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio || ""}
              onChange={handleChange}
              placeholder="Tell us a little bit about yourself"
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                value={formData.company || ""}
                onChange={handleChange}
                placeholder="Where do you work?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field_domain">Field / Domain</Label>
              <Input
                id="field_domain"
                name="field_domain"
                value={formData.field_domain || ""}
                onChange={handleChange}
                placeholder="e.g. Software Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education">Education</Label>
              <Input
                id="education"
                name="education"
                value={formData.education || ""}
                onChange={handleChange}
                placeholder="e.g. University of Tech"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location || ""}
                onChange={handleChange}
                placeholder="e.g. New York, NY"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium leading-none">Contact & Links</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email || ""}
                  onChange={handleChange}
                  placeholder="Public email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={handleChange}
                  placeholder="Public phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input
                  id="github_url"
                  name="github_url"
                  type="url"
                  value={formData.github_url || ""}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="url"
                  value={formData.linkedin_url || ""}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  name="website_url"
                  type="url"
                  value={formData.website_url || ""}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
