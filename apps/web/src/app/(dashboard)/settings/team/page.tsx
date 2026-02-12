"use client";

import * as React from "react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@bites-rms/ui";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "default",
  MANAGER: "secondary",
  HOST: "outline",
  STAFF: "outline",
};

export default function TeamSettingsPage() {
  const utils = trpc.useUtils();
  const { data: restaurant } = trpc.settings.getRestaurant.useQuery();
  const { data: staffMembers, isLoading } = trpc.settings.getStaffMembers.useQuery();

  const inviteMutation = trpc.settings.inviteStaffMember.useMutation({
    onSuccess: () => {
      utils.settings.getStaffMembers.invalidate();
      toast.success("Staff member invited");
      setSheetOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("STAFF");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateRoleMutation = trpc.settings.updateStaffRole.useMutation({
    onSuccess: () => {
      utils.settings.getStaffMembers.invalidate();
      toast.success("Role updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActiveMutation = trpc.settings.toggleStaffActive.useMutation({
    onSuccess: () => {
      utils.settings.getStaffMembers.invalidate();
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [inviteName, setInviteName] = React.useState("");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"MANAGER" | "HOST" | "STAFF">("STAFF");

  // Detect user role — only OWNER can manage
  const userIsOwner = true; // determined by tRPC middleware; if the mutation fails, user sees error toast

  function handleInvite() {
    if (!inviteName || !inviteEmail) return;
    inviteMutation.mutate({ name: inviteName, email: inviteEmail, role: inviteRole });
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage staff accounts and permissions.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>Invite Staff</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff Members</CardTitle>
          <CardDescription>
            {staffMembers?.length ?? 0} member{(staffMembers?.length ?? 0) !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-sm">{member.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    {member.role === "OWNER" ? (
                      <Badge>Owner</Badge>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          updateRoleMutation.mutate({
                            userId: member.id,
                            role: v as "MANAGER" | "HOST" | "STAFF",
                          })
                        }
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="HOST">Host</SelectItem>
                          <SelectItem value="STAFF">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.isActive ? "secondary" : "destructive"}>
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(member.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    {member.role !== "OWNER" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            userId: member.id,
                            isActive: !member.isActive,
                          })
                        }
                      >
                        {member.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite Staff Member</SheetTitle>
            <SheetDescription>
              Send an invitation to add a new team member.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-name">Full Name</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="john@restaurant.com"
              />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "MANAGER" | "HOST" | "STAFF")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="HOST">Host</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <Button
              className="w-full"
              onClick={handleInvite}
              disabled={!inviteName || !inviteEmail || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Sending Invite..." : "Send Invitation"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
