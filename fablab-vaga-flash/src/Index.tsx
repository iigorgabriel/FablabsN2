import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import VagasDisplay from "./VagasDisplay";
import VagasOcupadasDisplay from "./VagasOcupadasDisplay";

interface ParkingData {
  id: string;
  vagas_disponiveis: number;
  total_vagas: number;
  ultima_atualizacao?: string;
}

const Index = () => {
  const [vagasDisponiveis, setVagasDisponiveis] = useState<number>(0);
  const [totalVagas, setTotalVagas] = useState<number>(4); // Total fixo de 4 vagas
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Calcular vagas ocupadas: totalVagas - vagasDisponiveis
  // Exemplo: 4 totais - 2 disponíveis = 2 ocupadas
  // Se tem 1 disponível, então 4 - 1 = 3 ocupadas
  const vagasOcupadas = totalVagas - vagasDisponiveis;

  // Buscar dados iniciais
  useEffect(() => {
    const fetchParkingData = async () => {
      try {
        const { data, error } = await supabase
          .from("parking_control")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Erro ao buscar dados:", error);
          setIsLoading(false);
          return;
        }

        if (data) {
          console.log("Dados recebidos do Supabase:", data);
          // O Supabase retorna apenas vagas_disponiveis
          // Total de vagas é sempre 4 (fixo)
          setVagasDisponiveis(data.vagas_disponiveis || 0);
          setTotalVagas(4); // Total fixo de 4 vagas
          setIsLoading(false);
        } else {
          // Se não houver dados, usar valores padrão
          setVagasDisponiveis(0);
          setTotalVagas(4);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setIsLoading(false);
      }
    };

    fetchParkingData();
  }, []);

  // Configurar realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("parking-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parking_control",
        },
        (payload) => {
          console.log("Atualização recebida via realtime:", payload);
          
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newData = payload.new as ParkingData;
            setVagasDisponiveis(newData.vagas_disponiveis || 0);
            // Total de vagas sempre é 4 (fixo)
            setTotalVagas(4);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-background flex items-center justify-center overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Gradiente radial no fundo */}
      <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent" />

      {/* Main content */}
      <main className="relative z-10 w-full py-8">
        <div className="flex flex-col items-center justify-center gap-8 w-full max-w-7xl mx-auto px-4">
          {/* Header - Título */}
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-wider uppercase mb-2">
              Parking Control
            </h1>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>

          {/* Cards lado a lado */}
          {isLoading ? (
            <div className="text-center text-muted-foreground">
              <p>Carregando dados...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <VagasDisplay vagasDisponiveis={vagasDisponiveis} totalVagas={totalVagas} />
              <VagasOcupadasDisplay vagasOcupadas={vagasOcupadas} totalVagas={totalVagas} />
            </div>
          )}

          {/* Footer - Info adicional */}
          <div className="text-center text-muted-foreground">
            <p className="text-sm md:text-base tracking-wide">
              Sistema de Monitoramento FabLab
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

