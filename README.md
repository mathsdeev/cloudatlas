# Cloud Atlas Discord API

API multi-bot para autenticar usuarios com Discord OAuth2, salvar verificacoes no MongoDB por `botId`, adicionar usuarios em servidores com `guilds.join` e devolver dados de IP para os bots.

## Configuracao

1. Copie `.env.example` para `.env`.
2. Configure `PUBLIC_BASE_URL` com a URL publica da API.
3. No Discord Developer Portal, adicione este redirect em cada aplicacao: `PUBLIC_BASE_URL/auth/discord/callback`.
4. Gere `APP_ENCRYPTION_KEY` com 32 bytes em base64.

```bash
openssl rand -base64 32
```

## Rodando

```bash
npm install
npm run dev
```

## Registrar um bot

Em producao, envie `x-admin-api-key` igual ao `ADMIN_API_KEY`.

```http
POST /api/bots/register
Content-Type: application/json
x-admin-api-key: change-me

{
  "botId": "123456789012345678",
  "name": "Meu Bot",
  "clientId": "123456789012345678",
  "clientSecret": "DISCORD_CLIENT_SECRET",
  "botToken": "DISCORD_BOT_TOKEN"
}
```

A resposta retorna `apiKey`. Salve essa chave no bot; ela nao pode ser recuperada depois.

## Fluxo de verificacao

Envie o usuario para:

```text
GET /auth/discord/start?botId=BOT_ID&guildId=SERVER_ID
```

Escopos solicitados ao Discord:

```text
identify email guilds.join
```

Depois do callback, a API salva:

- `botId`, `guildId` e `userId`
- perfil e email do Discord
- IP e dados do IPInfo quando `IPINFO_TOKEN` estiver configurado
- resultado da tentativa de adicionar o usuario ao servidor

## Buscar usuarios verificados de um servidor

```http
GET /api/bots/BOT_ID/guilds/SERVER_ID/users?page=1&limit=100
x-bot-api-key: ca_xxx
```

## Buscar verificacoes de um usuario

```http
GET /api/bots/BOT_ID/users/USER_ID
x-bot-api-key: ca_xxx
```

## Observacoes importantes

O bot precisa estar no servidor e ter permissao para adicionar membros. A aplicacao do Discord precisa ter OAuth2 configurado corretamente e o usuario precisa consentir com `guilds.join`.

Como a API armazena email, IP e tokens OAuth criptografados, use HTTPS, mantenha `APP_ENCRYPTION_KEY` fora do codigo e informe isso claramente na politica de privacidade do seu servico.
