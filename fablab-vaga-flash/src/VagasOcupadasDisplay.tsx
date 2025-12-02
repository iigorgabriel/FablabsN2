interface VagasOcupadasDisplayProps {
  vagasOcupadas: number;
  totalVagas: number;
}

const VagasOcupadasDisplay = ({ vagasOcupadas, totalVagas }: VagasOcupadasDisplayProps) => {
  // Garantir que os valores sejam números válidos
  const vagasOcupadasValidas = Number.isNaN(vagasOcupadas) || vagasOcupadas < 0 ? 0 : vagasOcupadas;
  const totalVagasValidas = Number.isNaN(totalVagas) || totalVagas <= 0 ? 0 : totalVagas;
  const percentualOcupado = totalVagasValidas > 0 ? (vagasOcupadasValidas / totalVagasValidas) * 100 : 0;

  return (
    <div className="relative w-full">
      {/* Card principal com efeito de brilho vermelho */}
      <div className="relative bg-card border-2 border-border rounded-2xl p-8 md:p-12 lg:p-16 overflow-hidden transition-all duration-300 hover:border-full hover:border-2 hover:shadow-[0_0_30px_hsl(var(--full))] hover:shadow-lg hover:shadow-full/50">
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
            <p className="text-xl md:text-2xl lg:text-3xl font-medium tracking-widest uppercase text-full">
              Vagas Ocupadas
            </p>
          </div>

          {/* Número grande */}
          <div className="relative">
            <div className="text-8xl md:text-[12rem] lg:text-[16rem] font-bold leading-none text-full animate-pulse-glow-red">
              {vagasOcupadasValidas}
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="w-full max-w-md">
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-700 ease-out bg-full"
                style={{ width: `${percentualOcupado}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>0</span>
              <span className="font-medium text-full">
                {vagasOcupadasValidas} / {totalVagasValidas}
              </span>
              <span>{totalVagasValidas}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VagasOcupadasDisplay;

