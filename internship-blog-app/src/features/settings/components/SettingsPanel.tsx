"use client";

import { useState } from "react";
import Link from "next/link";
import { Profile, JourneyVisibility, PostStatus } from "@/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { EditProfileModal } from "@/features/profiles/components/EditProfileModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyThemePreference,
  getDefaultJourneyVisibility,
  getDefaultPostStatus,
  getThemePreference,
  setDefaultJourneyVisibility,
  setDefaultPostStatus,
  ThemePreference,
} from "@/lib/user-preferences";

interface SettingsPanelProps {
  profile: Profile;
}

export function SettingsPanel({ profile }: SettingsPanelProps) {
  const [theme, setTheme] = useState<ThemePreference>(() => getThemePreference());
  const [journeyVisibility, setJourneyVisibility] = useState<JourneyVisibility>(() =>
    getDefaultJourneyVisibility()
  );
  const [postStatus, setPostStatus] = useState<PostStatus>(() => getDefaultPostStatus());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    applyThemePreference(theme);
    setDefaultJourneyVisibility(journeyVisibility);
    setDefaultPostStatus(postStatus);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {saved && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <AlertDescription>Settings saved.</AlertDescription>
        </Alert>
      )}

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how the interface looks on this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 border rounded-lg p-3">
            <div>
              <p className="text-sm font-medium">Quick toggle</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark instantly.</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme-preference">Theme preference</Label>
            <Select value={theme} onValueChange={(value: ThemePreference) => setTheme(value)}>
              <SelectTrigger id="theme-preference">
                <SelectValue placeholder="Select theme preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Content Defaults</CardTitle>
          <CardDescription>
            Applied automatically when creating new journeys and posts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="default-journey-visibility">Default journey visibility</Label>
            <Select
              value={journeyVisibility}
              onValueChange={(value: JourneyVisibility) => setJourneyVisibility(value)}
            >
              <SelectTrigger id="default-journey-visibility">
                <SelectValue placeholder="Select default visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="unlisted">Unlisted</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-post-status">Default post status</Label>
            <Select value={postStatus} onValueChange={(value: PostStatus) => setPostStatus(value)}>
              <SelectTrigger id="default-post-status">
                <SelectValue placeholder="Select default post status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your profile and security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{profile.email}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <EditProfileModal profile={profile} />
            <Button variant="outline" asChild>
              <Link href="/reset-password">Change password</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/u/${profile.username}`}>View public profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
}
