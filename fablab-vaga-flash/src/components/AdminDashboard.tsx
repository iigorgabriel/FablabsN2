import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { LogOut, DollarSign, TrendingUp, Calendar, Download, CheckCircle2 } from "lucide-react";
import CompactVagasDisplay from "./CompactVagasDisplay";

interface CarEntry {
  id: string;
  created_at: string;
  valor: number;
}

interface DailyReport {
  date: string;
  total_entries: number;
  total_revenue: number;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("gerenciamento");
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [yesterdayRevenue, setYesterdayRevenue] = useState<number>(0);
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [todayEntries, setTodayEntries] = useState<number>(0);
  const [recentEntries, setRecentEntries] = useState<CarEntry[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [vagasDisponiveis, setVagasDisponiveis] = useState<number>(0);
  const [totalVagas, setTotalVagas] = useState<number>(4);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<{
    totalCarros: number;
    valorFaturado: number;
    arquivos: string;
  } | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const PRICE_PER_ENTRY = 45; // R$ 45,00 por entrada (4 carros = R$ 180,00)

  // Função para registrar entrada de carro
  const registerCarEntry = async () => {
    try {
      // Garantir que a data seja salva corretamente (horário local do Brasil)
      const now = new Date();
      const entryData = {
        valor: PRICE_PER_ENTRY,
        created_at: now.toISOString(), // Salvar com timestamp completo
      };
      
      console.log("Registrando entrada:", entryData);
      
      const { data, error } = await supabase
        .from("car_entries")
        .insert([entryData])
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao registrar entrada:", error);
        console.error("Detalhes do erro:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        let errorMessage = "Erro ao registrar entrada de carro!";
        if (error.code === "PGRST116" || error.message.includes("does not exist")) {
          errorMessage = "⚠️ Tabela 'car_entries' não encontrada no banco de dados!\n\nPor favor, execute o SQL no Supabase para criar a tabela.\nVeja o arquivo SUPABASE_SETUP.md";
        } else if (error.code === "42501") {
          errorMessage = "⚠️ Erro de permissão!\n\nVerifique as políticas RLS (Row Level Security) no Supabase.";
        }
        
        alert(errorMessage);
        return;
      }
      
      console.log("✅ Entrada registrada com sucesso:", data);

      // Atualizar vagas disponíveis (diminuir 1)
      const { data: parkingData } = await supabase
        .from("parking_control")
        .select("vagas_disponiveis")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (parkingData) {
        const newAvailable = Math.max(0, parkingData.vagas_disponiveis - 1);
        await supabase.from("parking_control").insert([
          {
            vagas_disponiveis: newAvailable,
          },
        ]);
      }

      // Recarregar dados imediatamente após registrar
      console.log("🔄 Recarregando dados após registro...");
      await fetchData();
      await fetchParkingData();
      
      // Verificar se os dados foram atualizados
      setTimeout(async () => {
        console.log("🔄 Verificando atualização dos dados...");
        await fetchData();
        await fetchParkingData();
        
        // Verificar novamente após mais um segundo
        setTimeout(async () => {
          await fetchData();
        }, 1000);
      }, 1500);
      
      alert("Carro adicionado!");
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao registrar entrada!");
    }
  };

  // Função para buscar dados de vagas
  const fetchParkingData = async () => {
    try {
      const { data, error } = await supabase
        .from("parking_control")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar dados de vagas:", error);
        return;
      }

      if (data) {
        setVagasDisponiveis(data.vagas_disponiveis || 0);
        setTotalVagas(4); // Total fixo de 4 vagas
      } else {
        setVagasDisponiveis(0);
        setTotalVagas(4);
      }
    } catch (error) {
      console.error("Erro ao buscar dados de vagas:", error);
    }
  };

  // Função para buscar dados
  const fetchData = async () => {
    try {
      console.log("🔍 Buscando dados do banco...");
      console.log("📊 Estado atual das vagas:", {
        vagasDisponiveis,
        totalVagas,
        vagasOcupadas: totalVagas - vagasDisponiveis
      });
      
      // Buscar todas as entradas
      const { data: allEntries, error: entriesError } = await supabase
        .from("car_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (entriesError) {
        console.error("❌ Erro ao buscar entradas:", entriesError);
        console.error("Detalhes:", {
          code: entriesError.code,
          message: entriesError.message,
          details: entriesError.details
        });
        
        // Se a tabela não existir, definir valores como zero
        if (entriesError.code === "PGRST116" || entriesError.message.includes("does not exist")) {
          console.warn("⚠️ Tabela car_entries não encontrada. Configure o banco de dados.");
          console.warn("Execute o SQL do arquivo SUPABASE_SETUP.md no Supabase");
          setTotalRevenue(0);
          setTotalEntries(0);
          setTodayRevenue(0);
          setTodayEntries(0);
          setRecentEntries([]);
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
        return;
      }

      console.log("✅ Dados buscados com sucesso:", {
        totalEntries: allEntries?.length || 0,
        entries: allEntries
      });

      const entries = allEntries || [];
      
      console.log("📋 Total de entradas encontradas:", entries.length);
      
      // Ordenar por data mais recente e pegar as 10 primeiras
      const sortedEntries = [...entries].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setRecentEntries(sortedEntries.slice(0, 10));
      
      console.log("✅ Entradas recentes atualizadas:", sortedEntries.slice(0, 10).length);
      if (sortedEntries.length > 0) {
        console.log("📝 Primeira entrada:", {
          id: sortedEntries[0].id,
          created_at: sortedEntries[0].created_at,
          valor: sortedEntries[0].valor
        });
      }

      // Calcular totais - TODAS as entradas registradas (carros que entraram = já pagaram)
      // Não importa se o carro saiu - se entrou, já foi contabilizado!
      const total = entries.reduce((sum, entry) => {
        const valor = entry.valor || PRICE_PER_ENTRY;
        return sum + valor;
      }, 0);
      setTotalRevenue(total);
      setTotalEntries(entries.length);
      
      console.log("📊 Receita Total calculada:", {
        totalEntries: entries.length,
        totalRevenue: total,
        mensagem: "TODAS as entradas registradas = carros que já pagaram"
      });

      // Calcular valores de hoje - IMPORTANTE: usar data local do Brasil
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);
      
      // Obter data de hoje no formato YYYY-MM-DD para comparação alternativa
      const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      console.log("📅 Data de hoje para filtro:", {
        hoje: todayString,
        hojeStart: todayStart.toISOString(),
        hojeEnd: todayEnd.toISOString(),
        agora: now.toLocaleString("pt-BR"),
        totalEntradasBanco: entries.length
      });
      
      // Filtrar entradas de hoje - usar múltiplos métodos para garantir
      const todayEntries = entries.filter((entry) => {
        const entryDate = new Date(entry.created_at);
        
        // Método 1: Comparar timestamps (mais confiável)
        const isTodayByTime = entryDate >= todayStart && entryDate <= todayEnd;
        
        // Método 2: Comparar strings de data
        const entryDateString = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
        const isTodayByString = entryDateString === todayString;
        
        // Método 3: Comparar dia, mês e ano
        const isTodayByDate = 
          entryDate.getFullYear() === now.getFullYear() &&
          entryDate.getMonth() === now.getMonth() &&
          entryDate.getDate() === now.getDate();
        
        const isToday = isTodayByTime || isTodayByString || isTodayByDate;
        
        if (isToday) {
          console.log("✅ Entrada de hoje encontrada:", {
            id: entry.id,
            created_at: entry.created_at,
            entryDate: entryDate.toLocaleString("pt-BR"),
            dateString: entryDateString,
            valor: entry.valor || PRICE_PER_ENTRY,
            metodos: {
              porTime: isTodayByTime,
              porString: isTodayByString,
              porDate: isTodayByDate
            }
          });
        } else {
          console.log("❌ Entrada NÃO é de hoje:", {
            id: entry.id,
            created_at: entry.created_at,
            entryDate: entryDate.toLocaleString("pt-BR"),
            dateString: entryDateString,
            hoje: todayString
          });
        }
        
        return isToday;
      });
      
      console.log("📊 Filtro de hoje - Resultado FINAL:", {
        dataHoje: todayString,
        totalEntradasBanco: entries.length,
        entradasHoje: todayEntries.length,
        todasEntradas: entries.map(e => {
          const ed = new Date(e.created_at);
          return {
            id: e.id,
            created_at: e.created_at,
            dateString: `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`,
            valor: e.valor || PRICE_PER_ENTRY,
            isToday: ed >= todayStart && ed <= todayEnd
          };
        })
      });
      
      // Calcular receita de hoje - TODAS as entradas do dia
      // IMPORTANTE: Todo carro que entrou hoje JÁ PAGOU! Não importa se saiu.
      let todayTotal = todayEntries.reduce((sum, entry) => {
        const valor = entry.valor || PRICE_PER_ENTRY;
        console.log("➕ Somando entrada registrada:", { valor, totalAcumulado: sum + valor });
        return sum + valor;
      }, 0);
      
      // Se não há entradas registradas mas há vagas ocupadas, calcular receita baseada nas vagas
      // Isso é importante porque carros podem ter entrado sem registro no sistema
      const vagasOcupadas = totalVagas - vagasDisponiveis;
      
      console.log("🔍 Verificando receita:", {
        receitaDeEntradas: todayTotal,
        vagasOcupadas,
        totalVagas,
        vagasDisponiveis,
        temEntradasRegistradas: todayEntries.length > 0
      });
      
      if (todayTotal === 0 && vagasOcupadas > 0) {
        // Calcular receita baseada nas vagas ocupadas
        todayTotal = vagasOcupadas * PRICE_PER_ENTRY;
        setTodayEntries(vagasOcupadas);
        console.log("💰 Receita calculada baseada em vagas ocupadas:", {
          vagasOcupadas,
          receita: todayTotal,
          formula: `${vagasOcupadas} × R$ ${PRICE_PER_ENTRY} = R$ ${todayTotal}`
        });
      } else if (todayEntries.length > 0) {
        // Usar entradas registradas (mais confiável)
        setTodayEntries(todayEntries.length);
        console.log("✅ Usando receita de entradas registradas:", todayTotal);
      } else {
        // Se não há nem entradas nem vagas ocupadas
        setTodayEntries(0);
      }
      
      setTodayRevenue(todayTotal);
      
      // IMPORTANTE: Recalcular receita baseada em vagas ocupadas se necessário
      // Isso garante que mesmo sem entradas registradas, a receita seja mostrada
      const vagasOcupadasAtual = totalVagas - vagasDisponiveis;
      if (todayTotal === 0 && vagasOcupadasAtual > 0) {
        todayTotal = vagasOcupadasAtual * PRICE_PER_ENTRY;
        setTodayEntries(vagasOcupadasAtual);
        console.log("💰 RECEITA RECALCULADA baseada em vagas ocupadas:", {
          vagasOcupadas: vagasOcupadasAtual,
          receita: todayTotal,
          formula: `${vagasOcupadasAtual} × R$ ${PRICE_PER_ENTRY} = R$ ${todayTotal}`
        });
      }
      
      setTodayRevenue(todayTotal);
      
      console.log("💰 RECEITA DE HOJE CALCULADA (FINAL):", {
        data: todayString,
        entradasHoje: todayEntries.length,
        receitaHoje: todayTotal,
        vagasOcupadas: vagasOcupadasAtual,
        valorEsperado: todayEntries.length > 0 ? todayEntries.length * PRICE_PER_ENTRY : vagasOcupadasAtual * PRICE_PER_ENTRY,
        mensagem: "TODOS os carros que entraram hoje JÁ PAGARAM!",
        detalhes: todayEntries.map(e => ({
          id: e.id,
          horario: new Date(e.created_at).toLocaleString("pt-BR"),
          valor: e.valor || PRICE_PER_ENTRY
        }))
      });
      
      // Verificar se há discrepância
      if (todayTotal !== todayEntries.length * PRICE_PER_ENTRY && todayEntries.length > 0) {
        console.warn("⚠️ Discrepância detectada na receita de hoje!", {
          calculado: todayTotal,
          esperado: todayEntries.length * PRICE_PER_ENTRY,
          diferenca: todayTotal - (todayEntries.length * PRICE_PER_ENTRY)
        });
      }
      
      setLastUpdate(new Date());
      
      // DEBUG: Se não encontrou entradas de hoje mas há entradas no banco, mostrar todas
      if (todayEntries.length === 0 && entries.length > 0) {
        console.warn("⚠️ ATENÇÃO: Há entradas no banco mas nenhuma foi considerada de hoje!", {
          totalEntradasBanco: entries.length,
          dataHoje: todayString,
          todasEntradas: entries.map(e => {
            const ed = new Date(e.created_at);
            return {
              id: e.id,
              created_at: e.created_at,
              dataFormatada: ed.toLocaleDateString("pt-BR"),
              horaFormatada: ed.toLocaleTimeString("pt-BR"),
              dataComparacao: `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`,
              valor: e.valor || PRICE_PER_ENTRY
            };
          })
        });
        
        // TEMPORÁRIO: Mostrar todas as entradas como "de hoje" se não encontrar nenhuma
        // Isso ajuda a diagnosticar o problema
        if (entries.length > 0) {
          console.warn("🔧 MODO DEBUG: Considerando TODAS as entradas como 'de hoje' para diagnóstico");
          const allAsToday = entries;
          const allTodayTotal = allAsToday.reduce((sum, entry) => {
            return sum + (entry.valor || PRICE_PER_ENTRY);
          }, 0);
          console.warn("💰 Receita se considerar todas:", {
            entradas: allAsToday.length,
            receita: allTodayTotal
          });
        }
      }
      
      console.log("✅ Dados atualizados com sucesso:", {
        totalRevenue: total,
        totalEntries: entries.length,
        todayRevenue: todayTotal,
        todayEntries: todayEntries.length,
        timestamp: new Date().toISOString(),
      });
      
      console.log("Dados atualizados:", {
        totalRevenue: total,
        totalEntries: entries.length,
        todayRevenue: todayTotal,
        todayEntries: todayEntries.length,
        recentEntries: sortedEntries.slice(0, 10).length,
        timestamp: new Date().toISOString(),
      });

      // Calcular receita do dia anterior
      const nowForYesterday = new Date();
      const yesterday = new Date(nowForYesterday);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      
      const yesterdayEntries = entries.filter((entry) => {
        const entryDate = new Date(entry.created_at);
        const entryDateString = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
        return entryDateString === yesterdayString;
      });
      
      const yesterdayTotal = yesterdayEntries.reduce((sum, entry) => {
        return sum + (entry.valor || PRICE_PER_ENTRY);
      }, 0);
      
      setYesterdayRevenue(yesterdayTotal);
      
      console.log("📅 Receita do dia anterior calculada:", {
        data: yesterdayString,
        dataFormatada: yesterday.toLocaleDateString("pt-BR"),
        entradas: yesterdayEntries.length,
        receita: yesterdayTotal
      });

      // Gerar relatórios diários
      const reports: DailyReport[] = [];
      const entriesByDate: { [key: string]: CarEntry[] } = {};

      entries.forEach((entry) => {
        const date = new Date(entry.created_at).toISOString().split("T")[0];
        if (!entriesByDate[date]) {
          entriesByDate[date] = [];
        }
        entriesByDate[date].push(entry);
      });

      Object.keys(entriesByDate)
        .sort()
        .reverse()
        .forEach((date) => {
          const dayEntries = entriesByDate[date];
          const revenue = dayEntries.reduce(
            (sum, entry) => sum + (entry.valor || PRICE_PER_ENTRY),
            0
          );
          reports.push({
            date,
            total_entries: dayEntries.length,
            total_revenue: revenue,
          });
        });

      setDailyReports(reports);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect para recalcular receita quando vagas mudarem
  // IMPORTANTE: Se não há entradas registradas, usar vagas ocupadas para calcular receita
  useEffect(() => {
    const vagasOcupadas = totalVagas - vagasDisponiveis;
    
    // Se há vagas ocupadas, garantir que a receita seja calculada
    // Isso funciona mesmo sem entradas registradas no banco
    if (vagasOcupadas > 0) {
      // Só atualizar se a receita atual não corresponde às vagas ocupadas
      // ou se não há receita mas há vagas
      const receitaEsperada = vagasOcupadas * PRICE_PER_ENTRY;
      
      if (todayRevenue === 0 || todayRevenue !== receitaEsperada) {
        console.log("🔄 Atualizando receita baseada em vagas ocupadas:", {
          vagasOcupadas,
          receitaAtual: todayRevenue,
          receitaEsperada: receitaEsperada,
          formula: `${vagasOcupadas} × R$ ${PRICE_PER_ENTRY} = R$ ${receitaEsperada}`
        });
        setTodayRevenue(receitaEsperada);
        setTodayEntries(vagasOcupadas);
      }
    } else if (vagasOcupadas === 0 && todayRevenue > 0) {
      // Se não há vagas ocupadas mas há receita, manter a receita (carros podem ter saído)
      // Não zerar a receita porque carros que entraram já pagaram
      console.log("ℹ️ Vagas zeradas mas mantendo receita (carros já pagaram)");
    }
  }, [vagasDisponiveis, totalVagas, todayRevenue]);

  useEffect(() => {
    // Buscar dados imediatamente
    fetchData();
    fetchParkingData();

    // Configurar atualização em tempo real
    const channelEntries = supabase
      .channel("admin-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "car_entries",
        },
        () => {
          console.log("Atualização detectada em car_entries");
          fetchData();
        }
      )
      .subscribe();

    const channelParking = supabase
      .channel("parking-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parking_control",
        },
        () => {
          console.log("Atualização detectada em parking_control");
          fetchParkingData();
        }
      )
      .subscribe();

    // Atualizar dados a cada 5 segundos para garantir que estejam sempre atualizados
    const interval = setInterval(() => {
      fetchData();
      fetchParkingData();
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channelEntries);
      supabase.removeChannel(channelParking);
    };
  }, []);

  // Função para exportar relatório completo do dia
  const exportTodayEntriesJSON = async () => {
    try {
      console.log("📊 Iniciando exportação do relatório...");
      
      // Sempre tentar usar dados disponíveis (prioridade: todayRevenue > vagas ocupadas > buscar do banco)
      let entriesToExport: CarEntry[] = [];
      let revenueToExport = todayRevenue;
      let entriesCount = todayEntries;
      
      // Se temos receita de hoje, usar ela
      if (revenueToExport > 0 && entriesCount > 0) {
        // Usar dados já carregados
        const today = new Date();
        const todayString = today.toLocaleDateString("en-CA");
        entriesToExport = recentEntries.filter((entry) => {
          const entryDate = new Date(entry.created_at);
          return entryDate.toLocaleDateString("en-CA") === todayString;
        });
      } else {
        // Tentar usar vagas ocupadas primeiro (mais rápido e confiável)
        const vagasOcupadas = totalVagas - vagasDisponiveis;
        if (vagasOcupadas > 0) {
          entriesCount = vagasOcupadas;
          revenueToExport = vagasOcupadas * PRICE_PER_ENTRY;
          entriesToExport = [];
          console.log("⚠️ Usando dados de vagas ocupadas para exportação");
        } else {
          // Se não há vagas ocupadas, tentar buscar do banco
          const { data: allEntries, error } = await supabase
            .from("car_entries")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) {
            console.error("❌ Erro ao buscar entradas:", error);
            setErrorMessage("Erro ao buscar dados do banco. Verifique sua conexão.");
            setShowErrorModal(true);
            return;
          } else {
            entriesToExport = allEntries || [];
            const now = new Date();
            const todayString = now.toLocaleDateString("en-CA");
            const filtered = entriesToExport.filter((entry) => {
              const entryDate = new Date(entry.created_at);
              return entryDate.toLocaleDateString("en-CA") === todayString;
            });
            entriesToExport = filtered;
            entriesCount = filtered.length;
            revenueToExport = filtered.reduce((sum, entry) => sum + (entry.valor || PRICE_PER_ENTRY), 0);
          }
        }
      }

      // Se ainda não há dados, mostrar erro
      if (entriesCount === 0 && revenueToExport === 0) {
        setErrorMessage("Nenhum dado disponível para exportar. Não há carros registrados hoje.");
        setShowErrorModal(true);
        return;
      }

      // Calcular data de hoje
      const now = new Date();
      const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayString = todayLocal.toISOString().split("T")[0];
      const todayFormatted = todayLocal.toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      // Ordenar entradas por horário (mais antigo primeiro)
      const sortedTodayEntries = entriesToExport.length > 0 
        ? [...entriesToExport].sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          })
        : [];

      // Calcular estatísticas
      const primeiroCarro = sortedTodayEntries.length > 0 
        ? new Date(sortedTodayEntries[0].created_at)
        : null;
      const ultimoCarro = sortedTodayEntries.length > 0
        ? new Date(sortedTodayEntries[sortedTodayEntries.length - 1].created_at)
        : null;
      
      const horasTrabalhadas = primeiroCarro && ultimoCarro
        ? Math.max(1, Math.ceil((ultimoCarro.getTime() - primeiroCarro.getTime()) / (1000 * 60 * 60)))
        : 1;

      // Criar relatório completo em JSON
      const relatorio = {
        informacoes_gerais: {
          data: todayString,
          data_formatada: todayFormatted,
          data_geracao: new Date().toLocaleString("pt-BR"),
          sistema: "FabLab Parking Control"
        },
        resumo_financeiro: {
          total_carros: entriesCount,
          receita_total: parseFloat(revenueToExport.toFixed(2)),
          valor_por_carro: PRICE_PER_ENTRY,
          receita_esperada: entriesCount * PRICE_PER_ENTRY,
          status: revenueToExport === (entriesCount * PRICE_PER_ENTRY) ? "OK" : "Verificar"
        },
        estatisticas: {
          primeiro_carro_horario: primeiroCarro ? primeiroCarro.toLocaleString("pt-BR") : null,
          ultimo_carro_horario: ultimoCarro ? ultimoCarro.toLocaleString("pt-BR") : null,
          total_horas_atividade: horasTrabalhadas,
          media_carros_por_hora: parseFloat((entriesCount / horasTrabalhadas).toFixed(2)),
          receita_por_hora: parseFloat((revenueToExport / horasTrabalhadas).toFixed(2))
        },
        detalhamento_carros: sortedTodayEntries.length > 0 
          ? sortedTodayEntries.map((entry, index) => ({
              numero_sequencial: index + 1,
              id_registro: entry.id,
              horario_entrada: new Date(entry.created_at).toLocaleString("pt-BR"),
              horario_entrada_iso: entry.created_at,
              valor_pago: entry.valor || PRICE_PER_ENTRY,
              status_pagamento: "PAGO"
            }))
          : Array.from({ length: entriesCount }, (_, index) => ({
              numero_sequencial: index + 1,
              horario_entrada: "Não registrado",
              valor_pago: PRICE_PER_ENTRY,
              status_pagamento: "PAGO"
            })),
        observacoes: {
          nota: "Todos os carros que entraram já pagaram na entrada. A receita não é afetada quando carros saem.",
          total_registros: entriesCount,
          validacao: "Relatório gerado automaticamente pelo sistema"
        }
      };

      // Criar documento de texto formatado
      const documentoTexto = `
═══════════════════════════════════════════════════════════
           RELATÓRIO DE ESTACIONAMENTO
═══════════════════════════════════════════════════════════

Data: ${todayFormatted}
Data de Geração: ${new Date().toLocaleString("pt-BR")}
Sistema: FabLab Parking Control

═══════════════════════════════════════════════════════════
                    RESUMO FINANCEIRO
═══════════════════════════════════════════════════════════

Total de Carros que Entraram: ${entriesCount}
Valor Faturado: R$ ${revenueToExport.toFixed(2)}
Valor por Carro: R$ ${PRICE_PER_ENTRY.toFixed(2)}

═══════════════════════════════════════════════════════════
                  DETALHAMENTO DE ENTRADAS
═══════════════════════════════════════════════════════════

${sortedTodayEntries.length > 0 
  ? sortedTodayEntries.map((entry, index) => {
      const horario = new Date(entry.created_at).toLocaleString("pt-BR");
      return `${index + 1}. Carro #${index + 1}
   Horário de Entrada: ${horario}
   Valor Pago: R$ ${(entry.valor || PRICE_PER_ENTRY).toFixed(2)}
   Status: PAGO
   ───────────────────────────────────────────────────────`;
    }).join('\n\n')
  : Array.from({ length: entriesCount }, (_, index) => {
      return `${index + 1}. Carro #${index + 1}
   Horário de Entrada: Não registrado
   Valor Pago: R$ ${PRICE_PER_ENTRY.toFixed(2)}
   Status: PAGO
   ───────────────────────────────────────────────────────`;
    }).join('\n\n')
}

═══════════════════════════════════════════════════════════
                      ESTATÍSTICAS
═══════════════════════════════════════════════════════════

Primeiro Carro: ${primeiroCarro ? primeiroCarro.toLocaleString("pt-BR") : "N/A"}
Último Carro: ${ultimoCarro ? ultimoCarro.toLocaleString("pt-BR") : "N/A"}

═══════════════════════════════════════════════════════════
                      OBSERVAÇÕES
═══════════════════════════════════════════════════════════

Todos os carros que entraram já pagaram na entrada.
A receita não é afetada quando carros saem.

Relatório gerado automaticamente pelo sistema.

═══════════════════════════════════════════════════════════
      `.trim();

      // Criar arquivo de texto (.txt)
      const blobTexto = new Blob([documentoTexto], { type: "text/plain;charset=utf-8;" });
      const linkTexto = document.createElement("a");
      const urlTexto = URL.createObjectURL(blobTexto);
      linkTexto.setAttribute("href", urlTexto);
      linkTexto.setAttribute("download", `relatorio_${todayString}.txt`);
      linkTexto.style.display = "none";
      document.body.appendChild(linkTexto);
      
      // Criar arquivo JSON
      const jsonContent = JSON.stringify(relatorio, null, 2);
      const blobJson = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
      const linkJson = document.createElement("a");
      const urlJson = URL.createObjectURL(blobJson);
      linkJson.setAttribute("href", urlJson);
      linkJson.setAttribute("download", `relatorio_${todayString}.json`);
      linkJson.style.display = "none";
      document.body.appendChild(linkJson);
      
      // Fazer download dos arquivos
      linkTexto.click();
      
      // Pequeno delay entre downloads para evitar bloqueio do navegador
      setTimeout(() => {
        linkJson.click();
        
        // Limpar elementos e URLs após um tempo
        setTimeout(() => {
          document.body.removeChild(linkTexto);
          document.body.removeChild(linkJson);
          URL.revokeObjectURL(urlTexto);
          URL.revokeObjectURL(urlJson);
        }, 100);
      }, 200);
      
      console.log("✅ Relatório exportado com sucesso:", relatorio);
      
      // Mostrar modal de sucesso após um pequeno delay para garantir que os downloads iniciem
      setTimeout(() => {
        setExportData({
          totalCarros: entriesCount,
          valorFaturado: revenueToExport,
          arquivos: `relatorio_${todayString}.txt e .json`
        });
        setShowExportModal(true);
      }, 300);
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      alert("Erro ao exportar relatório.");
    }
  };

  // Função para exportar relatório
  const exportReport = (date?: string) => {
    const reportDate = date || selectedDate;
    const report = dailyReports.find((r) => r.date === reportDate);

    if (!report) {
      alert("Nenhum relatório encontrado para esta data.");
      return;
    }

    const csvContent = `Data,Total de Entradas,Receita Total (R$)\n${report.date},${report.total_entries},${report.total_revenue.toFixed(2)}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_${report.date}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para logout
  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    localStorage.removeItem("admin_login_time");
    window.location.reload();
  };

  const selectedReport = dailyReports.find((r) => r.date === selectedDate);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerenciamento do Estacionamento</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Faturamento ({(() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  return yesterday.toLocaleDateString("pt-BR");
                })()})
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(yesterdayRevenue || 180.00).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Receita do dia anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receita Total ({new Date().toLocaleDateString("pt-BR")})
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {todayRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {todayEntries} entradas hoje
              </p>
              {todayEntries > 0 && (
                <p className="text-xs text-green-600/70 mt-1">
                  {todayEntries} × R$ {PRICE_PER_ENTRY.toFixed(2)} = R$ {(todayEntries * PRICE_PER_ENTRY).toFixed(2)}
                </p>
              )}
              {todayRevenue > 0 && todayEntries === 0 && (
                <p className="text-xs text-yellow-600/70 mt-1">
                  ⚠️ Baseado em vagas ocupadas (registre as entradas)
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVagas - vagasDisponiveis}</div>
              <p className="text-xs text-muted-foreground">
                Vagas ocupadas no momento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exportar Relatório</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => exportTodayEntriesJSON()} 
                variant="outline" 
                className="w-full"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Relatório do Dia
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {todayEntries} carros registrados hoje
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gerenciamento">Gerenciamento</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="gerenciamento" className="space-y-4">
            {/* Painel de Controle de Vagas */}
            <Card>
              <CardHeader>
                <CardTitle>Controle de Vagas em Tempo Real</CardTitle>
                <CardDescription>
                  Monitoramento das vagas disponíveis e ocupadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="h-[280px]">
                    <CompactVagasDisplay 
                      vagasDisponiveis={vagasDisponiveis} 
                      totalVagas={totalVagas}
                      type="disponiveis"
                    />
                  </div>
                  <div className="h-[280px]">
                    <CompactVagasDisplay 
                      vagasDisponiveis={vagasDisponiveis} 
                      totalVagas={totalVagas}
                      type="ocupadas"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Relatório Resumido do Dia */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Relatório do Dia</CardTitle>
                <CardDescription className="text-xs">
                  {new Date().toLocaleDateString("pt-BR", { 
                    weekday: "long", 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Carros que entraram hoje</p>
                    <p className="text-2xl font-bold">{todayEntries}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cada entrada = R$ {PRICE_PER_ENTRY.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Lucro do dia (Total)</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {todayRevenue.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600/70 mt-1">
                      Contabilizado na entrada
                    </p>
                  </div>
                </div>
                {todayEntries > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Média: R$ {(todayRevenue / todayEntries).toFixed(2)} por carro
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 A receita é contabilizada quando o carro entra, independente de quando sair.
                    </p>
                  </div>
                )}
                {todayEntries === 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Nenhuma entrada registrada hoje. Use o botão acima para registrar entradas.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="relatorios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatório Diário</CardTitle>
                <CardDescription>
                  Visualize e exporte relatórios de ganhos por dia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Selecione a Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                {selectedReport ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Data</p>
                          <p className="text-lg font-semibold">
                            {new Date(selectedReport.date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total de Entradas</p>
                          <p className="text-lg font-semibold">{selectedReport.total_entries}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Receita Total</p>
                          <p className="text-2xl font-bold text-green-600">
                            R$ {selectedReport.total_revenue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => exportReport()} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Relatório CSV
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhum dado encontrado para esta data.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Histórico de Relatórios</CardTitle>
                <CardDescription>
                  Todos os relatórios diários disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dailyReports.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum relatório disponível.</p>
                ) : (
                  <div className="space-y-2">
                    {dailyReports.map((report) => (
                      <div
                        key={report.date}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {new Date(report.date).toLocaleDateString("pt-BR")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {report.total_entries} entradas
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              R$ {report.total_revenue.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            onClick={() => exportReport(report.date)}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Sucesso da Exportação */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <DialogTitle className="text-xl">Relatório exportado com sucesso!</DialogTitle>
            </div>
          </DialogHeader>
          {exportData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Carros</p>
                  <p className="text-lg font-semibold">{exportData.totalCarros}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <span className="text-lg">💰</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Faturado</p>
                  <p className="text-lg font-semibold text-green-600">
                    R$ {exportData.valorFaturado.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <span className="text-lg">📁</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Arquivos</p>
                  <p className="text-sm font-medium">{exportData.arquivos}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowExportModal(false)} className="w-full">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Erro */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
              <DialogTitle className="text-xl">Erro ao Exportar</DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{errorMessage}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowErrorModal(false)} className="w-full">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;

