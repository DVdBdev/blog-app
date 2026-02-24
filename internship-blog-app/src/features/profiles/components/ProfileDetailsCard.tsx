import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Profile } from "@/types";
import { Briefcase, GraduationCap, MapPin, Target } from "lucide-react";
import React from "react";

interface ProfileDetailsCardProps {
  profile: Profile;
}

export function ProfileDetailsCard({ profile }: ProfileDetailsCardProps) {
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
  ].filter((detail) => detail.value && detail.value.trim() !== "");

  return (
    <Card className="surface-card">
      <CardHeader className="pb-2">
        <p className="section-kicker w-fit">Profile</p>
        <CardTitle className="mt-2">About</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {details.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No extra details yet.</p>
        ) : (
          details.map((detail, index) => (
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
