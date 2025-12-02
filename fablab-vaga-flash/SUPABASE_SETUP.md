# Configuração do Banco de Dados Supabase

Para que o sistema de administração funcione corretamente, você precisa criar a tabela `car_entries` no Supabase.

## SQL para criar a tabela

Execute o seguinte SQL no SQL Editor do Supabase:

```sql
-- Criar tabela para registrar entradas de carros
CREATE TABLE IF NOT EXISTS car_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valor DECIMAL(10, 2) NOT NULL DEFAULT 45.00
);

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_car_entries_created_at ON car_entries(created_at DESC);

-- Habilitar Row Level Security (RLS) se necessário
ALTER TABLE car_entries ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura e escrita (ajuste conforme sua necessidade de segurança)
CREATE POLICY "Permitir todas as operações" ON car_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## Estrutura da Tabela

- `id`: UUID único para cada entrada
- `created_at`: Timestamp automático da criação do registro
- `valor`: Valor cobrado (padrão: R$ 45,00)

## Notas

- O sistema automaticamente registra R$ 45,00 por cada entrada de carro (4 carros = R$ 180,00)
- A tabela `parking_control` já deve existir (usada para controlar vagas disponíveis)
- Quando uma entrada é registrada, o sistema automaticamente diminui o número de vagas disponíveis

