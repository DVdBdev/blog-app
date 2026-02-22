"use client";

import { useState, useEffect } from "react";
import { Profile } from "@/types";
import { updateProfile, UpdateProfileData } from "../profile.actions";
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
import { Loader2, Pencil } from "lucide-react";

interface EditProfileModalProps {
  profile: Profile;
}

export function EditProfileModal({ profile }: EditProfileModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<UpdateProfileData>({
    display_name: profile.display_name || "",
    bio: profile.bio || "",
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
      setError(null);
      setSuccess(false);
    }
  }, [open, profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateProfile(formData);
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
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
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
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
