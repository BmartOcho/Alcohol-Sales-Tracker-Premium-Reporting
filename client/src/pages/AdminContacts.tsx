import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type ContactMessage } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Mail, Trash2, MessageSquare, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminContacts() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [responseNotes, setResponseNotes] = useState("");

  const { data: messages = [], isLoading } = useQuery<ContactMessage[]>({
    queryKey: ['/api/admin/contact-messages'],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, responseNotes }: { id: string; status?: string; responseNotes?: string }) => {
      return apiRequest('PATCH', `/api/admin/contact-messages/${id}`, { status, responseNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages'] });
      toast({
        title: "Message updated",
        description: "Contact message has been updated successfully.",
      });
      setSelectedMessage(null);
      setResponseNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update message",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/contact-messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages'] });
      toast({
        title: "Message deleted",
        description: "Contact message has been deleted successfully.",
      });
      setSelectedMessage(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete message",
        variant: "destructive",
      });
    },
  });

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = searchQuery === "" || 
      msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default" className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />New</Badge>;
      case 'read':
        return <Badge variant="secondary"><Mail className="h-3 w-3 mr-1" />Read</Badge>;
      case 'responded':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Responded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleMarkAsRead = (id: string) => {
    updateMutation.mutate({ id, status: 'read' });
  };

  const handleMarkAsResponded = () => {
    if (selectedMessage) {
      updateMutation.mutate({
        id: selectedMessage.id,
        status: 'responded',
        responseNotes: responseNotes || undefined,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const stats = {
    total: messages.length,
    new: messages.filter(m => m.status === 'new').length,
    read: messages.filter(m => m.status === 'read').length,
    responded: messages.filter(m => m.status === 'responded').length,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contact Messages</h1>
          <p className="text-muted-foreground mt-2">
            Manage and respond to user inquiries
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">New</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.new}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Read</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.read}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Responded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.responded}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div>
                <CardTitle>Messages</CardTitle>
                <CardDescription>View and manage contact form submissions</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="input-search-messages"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter" className="w-full sm:w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map((message) => (
                  <Card 
                    key={message.id}
                    className="hover-elevate cursor-pointer transition-all"
                    onClick={() => {
                      setSelectedMessage(message);
                      setResponseNotes(message.responseNotes || "");
                      if (message.status === 'new') {
                        handleMarkAsRead(message.id);
                      }
                    }}
                    data-testid={`card-message-${message.id}`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold truncate" data-testid={`text-message-name-${message.id}`}>
                              {message.name}
                            </h3>
                            {getStatusBadge(message.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            <Mail className="inline h-3 w-3 mr-1" />
                            {message.email}
                          </p>
                          <p className="font-medium mb-2">{message.subject}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.message}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(message.createdAt!), 'MMM dd, yyyy h:mm a')}
                            </span>
                            {message.respondedAt && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Responded {format(new Date(message.respondedAt), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedMessage && (
            <>
              <DialogHeader>
                <DialogTitle>Contact Message Details</DialogTitle>
                <DialogDescription>
                  Received on {format(new Date(selectedMessage.createdAt!), 'MMMM dd, yyyy at h:mm a')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">From</label>
                  <p className="mt-1 font-medium">{selectedMessage.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedMessage.email}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <p className="mt-1 font-medium">{selectedMessage.subject}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message</label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Response Notes (Optional)
                  </label>
                  <Textarea
                    data-testid="input-response-notes"
                    placeholder="Add notes about your response or actions taken..."
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                {selectedMessage.responseNotes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Previous Response Notes</label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="whitespace-pre-wrap text-sm">{selectedMessage.responseNotes}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                  <Button
                    data-testid="button-mark-responded"
                    onClick={handleMarkAsResponded}
                    disabled={updateMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Responded
                  </Button>
                  <Button
                    data-testid="button-delete-message"
                    variant="destructive"
                    onClick={() => handleDelete(selectedMessage.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
