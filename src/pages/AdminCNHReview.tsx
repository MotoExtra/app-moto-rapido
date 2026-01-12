import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Ban,
  Search,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
  Unlock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MotoboyProfile {
  id: string;
  name: string;
  phone: string;
  city: string;
  cnh: string | null;
  cnh_status: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  created_at: string;
  vehicle_plate: string | null;
}

const AdminCNHReview = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [motoboys, setMotoboys] = useState<MotoboyProfile[]>([]);
  const [filteredMotoboys, setFilteredMotoboys] = useState<MotoboyProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [selectedMotoboy, setSelectedMotoboy] = useState<MotoboyProfile | null>(null);
  const [showCNHModal, setShowCNHModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // CNH signed URL (bucket privado)
  const [cnhSignedUrl, setCnhSignedUrl] = useState<string | null>(null);
  const [cnhSignedLoading, setCnhSignedLoading] = useState(false);
  const [cnhSignedError, setCnhSignedError] = useState<string | null>(null);
  const [cnhPreviewError, setCnhPreviewError] = useState<string | null>(null);
  const [cnhObjectUrl, setCnhObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  useEffect(() => {
    filterMotoboys();
  }, [motoboys, searchTerm, statusFilter]);

  const getExt = (value: string) => value.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const isImageExt = (ext: string) => ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const mimeFromExt = (ext: string) => {
    switch (ext) {
      case "pdf":
        return "application/pdf";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "webp":
        return "image/webp";
      case "gif":
        return "image/gif";
      default:
        return "";
    }
  };

  const getCnhStoragePath = (cnhValue: string) => {
    const raw = cnhValue.trim();
    if (!raw) return null;

    // Path salvo direto (ex: userId/cnh.pdf) ou com prefixo do bucket (ex: cnh-documents/userId/cnh.pdf)
    if (!raw.startsWith("http")) {
      const noQuery = raw.split("?")[0];
      const withoutBucket = noQuery.replace(/^cnh-documents\//, "");
      if (withoutBucket.includes("/") && /\.[a-z0-9]+$/i.test(withoutBucket)) return withoutBucket;
      return null;
    }

    // URL pública/assinada: extrair o path após /cnh-documents/
    const noQuery = raw.split("?")[0];
    const match = noQuery.match(/\/cnh-documents\/(.+)$/);
    return match?.[1] ?? null;
  };
  useEffect(() => {
    const loadSignedUrl = async () => {
      setCnhSignedError(null);
      setCnhPreviewError(null);
      setCnhObjectUrl(null);

      if (!showCNHModal || !selectedMotoboy?.cnh) {
        setCnhSignedUrl(null);
        setCnhSignedLoading(false);
        return;
      }
      const storagePath = getCnhStoragePath(selectedMotoboy.cnh);
      if (!storagePath) {
        setCnhSignedUrl(null);
        setCnhSignedLoading(false);
        setCnhSignedError(
          "Documento inválido ou não encontrado. Peça para o motoboy reenviar a CNH."
        );
        return;
      }

      setCnhSignedLoading(true);
      const { data, error } = await supabase.storage
        .from("cnh-documents")
        .createSignedUrl(storagePath, 60 * 10);

      if (error) {
        console.error("Erro ao gerar link assinado da CNH:", error);
        setCnhSignedUrl(null);
        setCnhSignedError("Não foi possível gerar o acesso ao documento agora.");
      } else if (data?.signedUrl) {
        setCnhSignedUrl(data.signedUrl);

        // Pré-visualização mais confiável: baixar o arquivo e usar blob URL.
        const ext = getExt(storagePath);
        const { data: blob, error: downloadError } = await supabase.storage
          .from("cnh-documents")
          .download(storagePath);

        if (!downloadError && blob) {
          const forcedType = blob.type || mimeFromExt(ext) || "application/octet-stream";
          const normalized = blob.type ? blob : new Blob([blob], { type: forcedType });
          setCnhObjectUrl(URL.createObjectURL(normalized));
        }
      }

      setCnhSignedLoading(false);
    };

    loadSignedUrl();
  }, [showCNHModal, selectedMotoboy]);

  useEffect(() => {
    return () => {
      if (cnhObjectUrl) URL.revokeObjectURL(cnhObjectUrl);
    };
  }, [cnhObjectUrl]);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login/motoboy");
        return;
      }

      const { data: hasRole } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin"
      });

      if (!hasRole) {
        toast.error("Acesso negado. Apenas administradores.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchMotoboys();
    } catch (error) {
      console.error("Error checking admin:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchMotoboys = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_type", "motoboy")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar motoboys");
      console.error(error);
      return;
    }

    // Cast to handle new columns not yet in types
    setMotoboys((data || []) as unknown as MotoboyProfile[]);
  };

  const filterMotoboys = () => {
    let filtered = [...motoboys];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(term) ||
        m.phone.includes(term) ||
        m.city.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "blocked") {
        filtered = filtered.filter(m => m.is_blocked);
      } else {
        filtered = filtered.filter(m => m.cnh_status === statusFilter && !m.is_blocked);
      }
    }

    setFilteredMotoboys(filtered);
  };

  const handleApproveCNH = async (motoboy: MotoboyProfile) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          cnh_status: "approved",
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null
        } as any)
        .eq("id", motoboy.id);

      if (error) throw error;

      toast.success(`CNH de ${motoboy.name} aprovada!`);
      await fetchMotoboys();
      setShowCNHModal(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao aprovar CNH");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAndBlock = async () => {
    if (!selectedMotoboy || !blockReason.trim()) {
      toast.error("Informe o motivo do bloqueio");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          cnh_status: "rejected",
          is_blocked: true,
          blocked_reason: blockReason,
          blocked_at: new Date().toISOString()
        } as any)
        .eq("id", selectedMotoboy.id);

      if (error) throw error;

      toast.success(`Conta de ${selectedMotoboy.name} bloqueada`);
      await fetchMotoboys();
      setShowBlockModal(false);
      setShowCNHModal(false);
      setBlockReason("");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao bloquear conta");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async (motoboy: MotoboyProfile) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null,
          cnh_status: "pending"
        } as any)
        .eq("id", motoboy.id);

      if (error) throw error;

      toast.success(`Conta de ${motoboy.name} desbloqueada`);
      await fetchMotoboys();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao desbloquear conta");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (motoboy: MotoboyProfile) => {
    if (motoboy.is_blocked) {
      return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Bloqueado</Badge>;
    }
    switch (motoboy.cnh_status) {
      case "approved":
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" /> Aprovado</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejeitado</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
    }
  };

  const stats = {
    total: motoboys.length,
    pending: motoboys.filter(m => m.cnh_status === "pending" && !m.is_blocked).length,
    approved: motoboys.filter(m => m.cnh_status === "approved" && !m.is_blocked).length,
    blocked: motoboys.filter(m => m.is_blocked).length
  };

  const selectedCnhStoragePath = selectedMotoboy?.cnh ? getCnhStoragePath(selectedMotoboy.cnh) : null;
  const selectedCnhExt = selectedCnhStoragePath ? getExt(selectedCnhStoragePath) : "";
  const cnhPreviewSrc = cnhObjectUrl ?? cnhSignedUrl;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Revisão de CNH</h1>
              <p className="text-sm text-muted-foreground">Aprovar ou rejeitar documentos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Motoboys</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
              <div className="text-xs text-muted-foreground">Aprovados</div>
            </CardContent>
          </Card>
          <Card className="border-destructive/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{stats.blocked}</div>
              <div className="text-xs text-muted-foreground">Bloqueados</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                  <SelectItem value="blocked">Bloqueados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Motoboys ({filteredMotoboys.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Status CNH</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMotoboys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum motoboy encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMotoboys.map((motoboy) => (
                      <TableRow key={motoboy.id} className={motoboy.is_blocked ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{motoboy.name}</TableCell>
                        <TableCell>{motoboy.city}</TableCell>
                        <TableCell>{motoboy.phone}</TableCell>
                        <TableCell>
                          {format(new Date(motoboy.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getStatusBadge(motoboy)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMotoboy(motoboy);
                                setShowCNHModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver CNH
                            </Button>
                            {motoboy.is_blocked && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnblock(motoboy)}
                                disabled={actionLoading}
                              >
                                <Unlock className="h-4 w-4 mr-1" />
                                Desbloquear
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CNH View Modal */}
      <Dialog open={showCNHModal} onOpenChange={setShowCNHModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documento CNH</DialogTitle>
            <DialogDescription>
              Revise os dados e o documento do motoboy
            </DialogDescription>
          </DialogHeader>

          {selectedMotoboy && (
            <div className="space-y-4">
              {/* Motoboy Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Nome</div>
                    <div className="font-medium">{selectedMotoboy.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Telefone</div>
                    <div className="font-medium">{selectedMotoboy.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Cidade</div>
                    <div className="font-medium">{selectedMotoboy.city}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Cadastro</div>
                    <div className="font-medium">
                      {format(new Date(selectedMotoboy.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
                {selectedMotoboy.vehicle_plate && (
                  <div className="flex items-center gap-2 col-span-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Placa</div>
                      <div className="font-medium">{selectedMotoboy.vehicle_plate}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status atual */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Status atual:</span>
                {getStatusBadge(selectedMotoboy)}
              </div>

              {/* Blocked reason if exists */}
              {selectedMotoboy.is_blocked && selectedMotoboy.blocked_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="text-sm font-medium text-destructive mb-1">Motivo do bloqueio:</div>
                  <div className="text-sm">{selectedMotoboy.blocked_reason}</div>
                  {selectedMotoboy.blocked_at && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Bloqueado em: {format(new Date(selectedMotoboy.blocked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  )}
                </div>
              )}

              {/* CNH Document */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Documento CNH:</div>

                {!selectedMotoboy.cnh ? (
                  <div className="p-8 text-center bg-muted rounded-lg">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum documento enviado</p>
                  </div>
                ) : cnhSignedLoading ? (
                  <div className="p-8 text-center bg-muted rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Carregando documento...</p>
                  </div>
                ) : cnhSignedError ? (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="text-sm font-medium text-destructive mb-1">
                      Não foi possível abrir o documento
                    </div>
                    <div className="text-sm text-muted-foreground">{cnhSignedError}</div>
                  </div>
                ) : cnhSignedUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground truncate">
                        {selectedCnhStoragePath ?? "documento"}
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <a href={cnhSignedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir
                        </a>
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden bg-muted">
                      {isImageExt(selectedCnhExt) ? (
                        cnhPreviewError ? (
                          <div className="p-6 text-center">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">{cnhPreviewError}</p>
                          </div>
                        ) : (
                          <img
                            src={cnhPreviewSrc ?? cnhSignedUrl}
                            alt="Documento CNH do motoboy"
                            className="w-full max-h-[60vh] object-contain"
                            loading="lazy"
                            onError={() =>
                              setCnhPreviewError(
                                "Não foi possível pré-visualizar aqui. Use o botão 'Abrir' para ver em nova aba."
                              )
                            }
                          />
                        )
                      ) : (
                        <iframe
                          src={cnhPreviewSrc ?? cnhSignedUrl}
                          title="Documento CNH do motoboy"
                          className="w-full h-[60vh] bg-muted"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                    Documento enviado, mas não foi possível gerar acesso agora.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedMotoboy && !selectedMotoboy.is_blocked && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowBlockModal(true)}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar e Bloquear
                </Button>
                <Button
                  onClick={() => handleApproveCNH(selectedMotoboy)}
                  disabled={actionLoading || selectedMotoboy.cnh_status === "approved"}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar CNH
                </Button>
              </>
            )}
            {selectedMotoboy?.is_blocked && (
              <Button
                variant="outline"
                onClick={() => handleUnblock(selectedMotoboy)}
                disabled={actionLoading}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Desbloquear Conta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Confirmation Modal */}
      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Bloquear Conta</DialogTitle>
            <DialogDescription>
              Esta ação irá rejeitar a CNH e bloquear temporariamente a conta do motoboy.
              O motoboy não conseguirá aceitar extras enquanto bloqueado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo do bloqueio *</label>
              <Textarea
                placeholder="Descreva o motivo do bloqueio (ex: documento ilegível, dados inconsistentes...)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectAndBlock}
              disabled={actionLoading || !blockReason.trim()}
            >
              <Ban className="h-4 w-4 mr-2" />
              Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCNHReview;
