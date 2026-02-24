import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Profile } from "@/types";
import Link from "next/link";
import { EditProfileModal } from "./EditProfileModal";

interface ProfileHeaderCardProps {
  profile: Profile;
}

export function ProfileHeaderCard({ profile }: ProfileHeaderCardProps) {
  const initials = profile.display_name
    ? profile.display_name.substring(0, 2).toUpperCase()
    : profile.username.substring(0, 2).toUpperCase();

  return (
    <Card className="surface-card">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            <p className="mt-2 text-sm max-w-2xl">
              {profile.bio || <span className="italic text-muted-foreground">Add a bio</span>}
            </p>
          </div>

          <div className="flex flex-col w-full sm:w-auto gap-2 mt-4 sm:mt-0">
            <EditProfileModal profile={profile} />
            <Button variant="secondary" asChild className="sm:min-w-[170px]">
              <Link href={`/u/${profile.username}`}>View public profile</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
