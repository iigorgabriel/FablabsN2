interface CompactVagasDisplayProps {
  vagasDisponiveis: number;
  totalVagas: number;
  type: "disponiveis" | "ocupadas";
}

const CompactVagasDisplay = ({ vagasDisponiveis, totalVagas, type }: CompactVagasDisplayProps) => {
  const vagasOcupadas = totalVagas - vagasDisponiveis;
  const isLotado = vagasDisponiveis === 0;
  const isVazio = vagasOcupadas === 0;
  
  const displayValue = type === "disponiveis" ? vagasDisponiveis : vagasOcupadas;
  const percentual = type === "disponiveis" 
    ? (vagasDisponiveis / totalVagas) * 100 
    : (vagasOcupadas / totalVagas) * 100;

  return (
    <div className="relative w-full h-full">
      <div className="relative bg-card border-2 border-border rounded-xl p-6 overflow-hidden transition-all duration-300 hover:shadow-lg">
        {/* Efeito de grid no fundo */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          {/* Label */}
          <div className="text-center">
            <p className={`text-lg font-medium tracking-wider uppercase ${
              type === "disponiveis" ? "text-muted-foreground" : "text-full"
            }`}>
              {type === "disponiveis" ? "Vagas Disponíveis" : "Vagas Ocupadas"}
            </p>
          </div>

          {/* Número grande */}
          <div className="relative w-full flex justify-center">
            {isLotado && type === "disponiveis" ? (
              <div className="flex flex-col items-center justify-center gap-3 min-h-[120px]">
                <div className="text-6xl font-bold leading-none text-full">
                  {displayValue}
                </div>
                <div className="text-xl font-bold tracking-wider uppercase text-full px-4 py-1 rounded-md bg-full/10 border border-full/20">
                  LOTADO
                </div>
              </div>
            ) : (
              <div
                className={`text-6xl font-bold leading-none min-h-[120px] flex items-center justify-center ${
                  type === "disponiveis" 
                    ? (isLotado ? "text-full" : "text-available") 
                    : "text-full"
                }`}
              >
                {displayValue}
              </div>
            )}
          </div>

          {/* Barra de progresso */}
          <div className="w-full max-w-xs">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out ${
                  type === "disponiveis"
                    ? (isLotado ? "bg-full" : "bg-available")
                    : "bg-full"
                }`}
                style={{ width: `${percentual}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>0</span>
              <span className="font-medium">
                {displayValue} / {totalVagas}
              </span>
              <span>{totalVagas}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactVagasDisplay;

