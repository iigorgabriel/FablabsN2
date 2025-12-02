interface VagasDisplayProps {
  vagasDisponiveis: number;
  totalVagas: number;
}

const VagasDisplay = ({ vagasDisponiveis, totalVagas }: VagasDisplayProps) => {
  const isLotado = vagasDisponiveis === 0;
  const percentualDisponivel = (vagasDisponiveis / totalVagas) * 100;

  return (
    <div className="relative w-full">
        {/* Card principal com efeito de brilho */}
        <div className="relative bg-card border-2 border-border rounded-2xl p-8 md:p-12 lg:p-16 overflow-hidden transition-all duration-300 hover:border-available hover:border-2 hover:shadow-[0_0_30px_hsl(var(--available))] hover:shadow-lg hover:shadow-available/50">
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
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Label */}
            <div className="text-center">
              <p className="text-xl md:text-2xl lg:text-3xl font-medium tracking-widest uppercase text-muted-foreground">
                Vagas Disponíveis
              </p>
            </div>

            {/* Número grande */}
            <div className="relative">
              {isLotado ? (
                <div className="flex flex-col items-center gap-4">
                  <div
                    className={`text-8xl md:text-[12rem] lg:text-[16rem] font-bold leading-none ${
                      isLotado ? "text-full animate-pulse-glow-red" : "text-available animate-pulse-glow"
                    }`}
                  >
                    {vagasDisponiveis}
                  </div>
                  <div className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-wider uppercase text-full animate-blink">
                    LOTADO
                  </div>
                </div>
              ) : (
                <div
                  className={`text-8xl md:text-[12rem] lg:text-[16rem] font-bold leading-none ${
                    isLotado ? "text-full animate-pulse-glow-red" : "text-available animate-pulse-glow"
                  }`}
                >
                  {vagasDisponiveis}
                </div>
              )}
            </div>

            {/* Barra de progresso */}
            <div className="w-full max-w-md">
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ease-out ${
                    isLotado ? "bg-full" : "bg-available"
                  }`}
                  style={{ width: `${percentualDisponivel}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>0</span>
                <span className="font-medium">
                  {vagasDisponiveis} / {totalVagas}
                </span>
                <span>{totalVagas}</span>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default VagasDisplay;

