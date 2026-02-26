import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Profile } from "@/types";
import { Briefcase, Github, Globe, GraduationCap, Linkedin, MapPin, Target } from "lucide-react";
import Link from "next/link";
import React from "react";

interface ProfileDetailsCardProps {
  profile: Profile;
}

export function ProfileDetailsCard({ profile }: ProfileDetailsCardProps) {
  const hasValue = (value?: string | null) => !!value && value.trim() !== "";
  const normalizeUrl = (value: string) =>
    /^https?:\/\//i.test(value) ? value : `https://${value}`;

  const getSocialMeta = (url: string) => {
    const normalizedUrl = normalizeUrl(url.trim());

    try {
      const hostname = new URL(normalizedUrl).hostname.toLowerCase();
      if (hostname.includes("github.com")) {
        return { label: "GitHub", icon: <Github className="h-4 w-4" /> };
      }
      if (hostname.includes("linkedin.com")) {
        return { label: "LinkedIn", icon: <Linkedin className="h-4 w-4" /> };
      }
    } catch {
      // If parsing fails, fall back to generic website metadata.
    }

    return { label: "Website", icon: <Globe className="h-4 w-4" /> };
  };

  const details = [
    {
      id: "company",
      label: "Company",
      value: profile.company,
      icon: <Briefcase className="h-5 w-5 text-muted-foreground" />,
    },
    {
      id: "field",
      label: "Field / Domain",
      value: profile.field_domain,
      icon: <Target className="h-5 w-5 text-muted-foreground" />,
    },
    {
      id: "education",
      label: "Education / Program",
      value: profile.education,
      icon: <GraduationCap className="h-5 w-5 text-muted-foreground" />,
    },
    {
      id: "location",
      label: "Location",
      value: profile.location,
      icon: <MapPin className="h-5 w-5 text-muted-foreground" />,
    },
  ].filter((detail) => hasValue(detail.value));

  const socialLinks = [profile.github_url, profile.linkedin_url, profile.website_url]
    .filter(hasValue)
    .map((url) => {
      const normalizedUrl = normalizeUrl(url!.trim());
      const { label, icon } = getSocialMeta(url!);
      return { id: normalizedUrl, url: normalizedUrl, label, icon };
    });

  return (
    <Card className="surface-card">
      <CardHeader className="pb-2">
        <p className="section-kicker w-fit">Profile</p>
        <CardTitle className="mt-2">About</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {details.length === 0 && socialLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No extra details yet.</p>
        ) : (
          <>
            {details.map((detail, index) => (
              <React.Fragment key={detail.id}>
                <div className="flex items-center gap-3">
                  {detail.icon}
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none">{detail.label}</p>
                    <p className="text-sm text-muted-foreground">{detail.value}</p>
                  </div>
                </div>
                {index < details.length - 1 && <Separator />}
              </React.Fragment>
            ))}

            {socialLinks.length > 0 && details.length > 0 && <Separator />}

            {socialLinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium leading-none">Links</p>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map((link) => (
                    <Link
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/80 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.icon}
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
