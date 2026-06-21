# Start Project — Gestão Financeira Paróquia

> Brief inicial. Especificação completa refinada via SDD: [`docs/spec/SPEC.md`](./spec/SPEC.md)  
> Setup Firebase: [`docs/spec/firebase-setup.md`](./spec/firebase-setup.md)

## Objetivo

Site de gestão financeira para a **Quase-Paróquia Sant'Ana e São Joaquim**, com admin matriz e gestores por igreja.

## Autenticação

- **Admin:** Firebase Auth + `isAdmin: true` no Firestore (credenciais em `.env.local`, nunca no repositório)
- **Gestores:** e-mail + senha via Firebase Auth (contas criadas pelo admin)

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React, Vite, TypeScript, Tailwind, shadcn/ui |
| Backend | Firebase Auth, Firestore (sem Storage) |
| Estado | TanStack Query, Zustand |
| Tabelas | TanStack Table |
| Gráficos | Apache ECharts |
| Formulários | React Hook Form + Zod |
| Animações | Motion |

## Funcionalidades principais

- CRUD de gestores e igrejas (admin)
- Gestor com múltiplas igrejas (seletor de igreja ativa)
- Dízimos: grade mensal Jan–Dez por dizimista
- Despesas: contabilidade completa, recorrentes, referência de comprovante (sem upload)
- Dashboard com KPIs, gráficos, filtros e busca
- Alertas in-app (dízimo ausente, aniversários, tarefas)
- Tarefas pessoais do gestor
- Perfil com avatar (iniciais/cor/URL opcional), nome, senha, data de nascimento
- Soft delete → hard delete (confirmação dupla) para igrejas

## UI/UX

Cores católicas (bege, dourado, branco, vermelho, azuis), glassmorphism, menus modernos, modais arrastáveis, avatar no canto superior direito. Responsivo (notebook e celular).

## Deploy

- Local: `npm run dev`
- Produção: deploy manual Vercel
- Firebase: plano gratuito Spark (sem Storage, sem Cloud Functions)

## Status

Aguardando aprovação da spec antes da implementação.
