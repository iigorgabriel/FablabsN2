# Configuração de Variáveis de Ambiente

Este projeto requer variáveis de ambiente para se conectar ao Supabase.

## Variáveis Necessárias

1. **VITE_SUPABASE_URL**: URL do seu projeto Supabase
   - Formato: `https://xxxxxxxxxxxxx.supabase.co`
   - Onde encontrar: Dashboard do Supabase → Settings → API → Project URL

2. **VITE_SUPABASE_PUBLISHABLE_KEY**: Chave pública (anon key) do Supabase
   - Formato: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Onde encontrar: Dashboard do Supabase → Settings → API → Project API keys → `anon` `public`

## Como Configurar

### Desenvolvimento Local

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Abra o arquivo `.env` e preencha com suas credenciais:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-aqui
   ```

3. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### Deploy na Vercel

1. Acesse o projeto na Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione as seguintes variáveis:
   - `VITE_SUPABASE_URL` = URL do seu projeto Supabase
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Chave pública do Supabase
4. Selecione os ambientes (Production, Preview, Development)
5. Salve e faça um novo deploy

## Onde Encontrar as Credenciais

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** (ícone de engrenagem) → **API**
4. Você encontrará:
   - **Project URL** → Use para `VITE_SUPABASE_URL`
   - **Project API keys** → Use a chave `anon` `public` para `VITE_SUPABASE_PUBLISHABLE_KEY`

## Importante

⚠️ **NUNCA** commite o arquivo `.env` no Git! Ele já está no `.gitignore` por segurança.

✅ O arquivo `.env.example` pode ser commitado, pois não contém informações sensíveis.

