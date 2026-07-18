import { Avatar } from "@/components/ui/avatar";

// A name's initials chip. Thin wrapper over the shared <Avatar> (no photo), kept
// as a named export for the many list rows that only ever show initials.
export function AvatarInitials({ name, className }: { name: string; className?: string }) {
  return <Avatar name={name} className={className} />;
}
