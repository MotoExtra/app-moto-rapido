import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, RefreshCw, Trash2, CheckCircle, XCircle, Calendar, Clock, MapPin, User, BarChart3, TrendingUp, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { format, parseISO, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

interface ArchivedOffer {
  id: string;
  original_offer_id: string;
  restaurant_name: string;
  offer_date: string | null;
  time_start: string;
  time_end: string;
  city: string | null;
  payment: string | null;
  was_accepted: boolean;
  accepted_by_name: string | null;
  created_by_name: string | null;
  offer_type: string | null;
  archived_at: string;
}

interface ActiveOffer {
  id: string;
  restaurant_name: string;
  offer_date: string | null;
  time_start: string;
  time_end: string;
  city: string | null;
  payment: string | null;
  is_accepted: boolean;
  accepted_by: string | null;
  created_by: string | null;
  offer_type: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [archivedOffers, setArchivedOffers] = useState<ArchivedOffer[]>([]);
  const [activeOffers, setActiveOffers] = useState<ActiveOffer[]>([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login/motoboy");
        return;
      }

      // Check if user is admin using RPC
      const { data: hasRole, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error || !hasRole) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch archived offers
      const { data: archived, error: archivedError } = await supabase
        .from('expired_offers_archive')
        .select('*')
        .order('archived_at', { ascending: false });

      if (archivedError) throw archivedError;
      setArchivedOffers(archived || []);

      // Fetch active offers
      const { data: active, error: activeError } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;
      setActiveOffers(active || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    }
  };

  const runCleanup = async () => {
    setCleanupLoading(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_offers');
      
      if (error) throw error;

      toast({
        title: "Limpeza concluída",
        description: `${data || 0} extras expirados foram arquivados e removidos.`
      });

      await fetchData();
    } catch (error) {
      console.error("Error running cleanup:", error);
      toast({
        title: "Erro",
        description: "Não foi possível executar a limpeza.",
        variant: "destructive"
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login/motoboy");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    return timeString?.slice(0, 5) || "-";
  };

  // All hooks must be called before any early returns
  const acceptedArchived = archivedOffers.filter(o => o.was_accepted);
  const notAcceptedArchived = archivedOffers.filter(o => !o.was_accepted);
  const acceptedActive = activeOffers.filter(o => o.is_accepted);
  const notAcceptedActive = activeOffers.filter(o => !o.is_accepted);

  // Chart data - last 7 days
  const chartData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const activeCreated = activeOffers.filter(o => {
        if (!o.created_at) return false;
        const createdDate = format(parseISO(o.created_at), 'yyyy-MM-dd');
        return createdDate === dayStr;
      }).length;

      const archivedCreated = archivedOffers.filter(o => {
        if (!o.offer_date) return false;
        return o.offer_date === dayStr;
      }).length;

      const totalCreated = activeCreated + archivedCreated;
      
      const acceptedCount = activeOffers.filter(o => {
        if (!o.created_at || !o.is_accepted) return false;
        const createdDate = format(parseISO(o.created_at), 'yyyy-MM-dd');
        return createdDate === dayStr;
      }).length + archivedOffers.filter(o => {
        if (!o.offer_date || !o.was_accepted) return false;
        return o.offer_date === dayStr;
      }).length;

      return {
        day: format(day, 'EEE', { locale: ptBR }),
        date: format(day, 'dd/MM'),
        criados: totalCreated,
        aceitos: acceptedCount
      };
    });
  }, [activeOffers, archivedOffers]);

  // Pie chart data - by type
  const pieData = useMemo(() => {
    const restaurantCount = activeOffers.filter(o => o.offer_type === 'restaurant').length + 
                           archivedOffers.filter(o => o.offer_type === 'restaurant').length;
    const motoboyCount = activeOffers.filter(o => o.offer_type === 'motoboy').length + 
                        archivedOffers.filter(o => o.offer_type === 'motoboy').length;
    
    return [
      { name: 'Restaurante', value: restaurantCount, fill: 'hsl(var(--primary))' },
      { name: 'Motoboy', value: motoboyCount, fill: 'hsl(var(--secondary))' }
    ];
  }, [activeOffers, archivedOffers]);

  // City distribution
  const cityData = useMemo(() => {
    const cityCounts: Record<string, number> = {};
    
    [...activeOffers, ...archivedOffers].forEach(o => {
      const city = ('city' in o ? o.city : null) || 'Não definida';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    return Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));
  }, [activeOffers, archivedOffers]);

  const chartConfig: ChartConfig = {
    criados: {
      label: "Criados",
      color: "hsl(var(--primary))",
    },
    aceitos: {
      label: "Aceitos",
      color: "hsl(142 76% 36%)",
    },
  };

  // Early returns AFTER all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja sair do painel administrativo?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                    Sair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin/cnh")} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Revisar CNH de Motoboys
            </Button>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Extras Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{activeOffers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aceitos (Ativos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{acceptedActive.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Extras Arquivados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{archivedOffers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Não Aceitos (Arquivados)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{notAcceptedArchived.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Extras por Dia (Últimos 7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={chartData} accessibilityLayer>
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="criados" fill="var(--color-criados)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aceitos" fill="var(--color-aceitos)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolução de Extras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={chartData} accessibilityLayer>
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="criados" 
                    stroke="var(--color-criados)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--color-criados)" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="aceitos" 
                    stroke="var(--color-aceitos)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--color-aceitos)" }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Extras por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top 5 Cidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer 
                config={{ count: { label: "Extras", color: "hsl(var(--primary))" } }} 
                className="h-[250px] w-full"
              >
                <BarChart data={cityData} layout="vertical" accessibilityLayer>
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis 
                    type="category" 
                    dataKey="city" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Cleanup Action */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Limpeza Manual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Arquiva e remove extras expirados há mais de 24 horas. A limpeza automática roda diariamente às 3h.
            </p>
            <Button
              onClick={runCleanup}
              disabled={cleanupLoading}
              variant="destructive"
            >
              {cleanupLoading ? "Executando..." : "Executar Limpeza Agora"}
            </Button>
          </CardContent>
        </Card>

        {/* Tabs for different views */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Extras Ativos ({activeOffers.length})</TabsTrigger>
            <TabsTrigger value="archived">Arquivados ({archivedOffers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Extras Aceitos ({acceptedActive.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Restaurante/Ofertante</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Aceito Por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {acceptedActive.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Nenhum extra aceito
                          </TableCell>
                        </TableRow>
                      ) : (
                        acceptedActive.map((offer) => (
                          <TableRow key={offer.id}>
                            <TableCell className="font-medium">{offer.restaurant_name}</TableCell>
                            <TableCell>{formatDate(offer.offer_date)}</TableCell>
                            <TableCell>{formatTime(offer.time_start)} - {formatTime(offer.time_end)}</TableCell>
                            <TableCell>{offer.city || "-"}</TableCell>
                            <TableCell>{offer.payment || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={offer.offer_type === 'restaurant' ? 'default' : 'secondary'}>
                                {offer.offer_type === 'restaurant' ? 'Restaurante' : 'Motoboy'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50">
                                <User className="h-3 w-3 mr-1" />
                                {offer.accepted_by?.slice(0, 8) || "-"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-orange-600" />
                  Extras Disponíveis ({notAcceptedActive.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Restaurante/Ofertante</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notAcceptedActive.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Nenhum extra disponível
                          </TableCell>
                        </TableRow>
                      ) : (
                        notAcceptedActive.map((offer) => (
                          <TableRow key={offer.id}>
                            <TableCell className="font-medium">{offer.restaurant_name}</TableCell>
                            <TableCell>{formatDate(offer.offer_date)}</TableCell>
                            <TableCell>{formatTime(offer.time_start)} - {formatTime(offer.time_end)}</TableCell>
                            <TableCell>{offer.city || "-"}</TableCell>
                            <TableCell>{offer.payment || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={offer.offer_type === 'restaurant' ? 'default' : 'secondary'}>
                                {offer.offer_type === 'restaurant' ? 'Restaurante' : 'Motoboy'}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(offer.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Extras Aceitos - Arquivados ({acceptedArchived.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Restaurante/Ofertante</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Criado Por</TableHead>
                        <TableHead>Aceito Por</TableHead>
                        <TableHead>Arquivado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {acceptedArchived.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            Nenhum extra arquivado
                          </TableCell>
                        </TableRow>
                      ) : (
                        acceptedArchived.map((offer) => (
                          <TableRow key={offer.id}>
                            <TableCell className="font-medium">{offer.restaurant_name}</TableCell>
                            <TableCell>{formatDate(offer.offer_date)}</TableCell>
                            <TableCell>{formatTime(offer.time_start)} - {formatTime(offer.time_end)}</TableCell>
                            <TableCell>{offer.city || "-"}</TableCell>
                            <TableCell>{offer.payment || "-"}</TableCell>
                            <TableCell>{offer.created_by_name || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50">
                                {offer.accepted_by_name || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(offer.archived_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Extras Não Aceitos - Arquivados ({notAcceptedArchived.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Restaurante/Ofertante</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Criado Por</TableHead>
                        <TableHead>Arquivado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notAcceptedArchived.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            Nenhum extra não aceito arquivado
                          </TableCell>
                        </TableRow>
                      ) : (
                        notAcceptedArchived.map((offer) => (
                          <TableRow key={offer.id}>
                            <TableCell className="font-medium">{offer.restaurant_name}</TableCell>
                            <TableCell>{formatDate(offer.offer_date)}</TableCell>
                            <TableCell>{formatTime(offer.time_start)} - {formatTime(offer.time_end)}</TableCell>
                            <TableCell>{offer.city || "-"}</TableCell>
                            <TableCell>{offer.payment || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={offer.offer_type === 'restaurant' ? 'default' : 'secondary'}>
                                {offer.offer_type === 'restaurant' ? 'Restaurante' : 'Motoboy'}
                              </Badge>
                            </TableCell>
                            <TableCell>{offer.created_by_name || "-"}</TableCell>
                            <TableCell>{formatDate(offer.archived_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
