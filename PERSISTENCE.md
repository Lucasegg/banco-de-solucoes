# Persistência — Storage Adapter e Repositories

## Objetivo

A camada de persistência desacopla hooks e UI do mecanismo físico de armazenamento. Nesta sprint, o mecanismo continua sendo `localStorage`, mas todo acesso passa por repositórios e pelo `StorageAdapter`, preparando a troca futura por Supabase sem alterar a experiência da aplicação.

## Fluxo de persistência

```text
UI
↓
Hooks
↓
Repositories
↓
Storage Adapter
↓
LocalStorage
```

- **UI e componentes** consomem hooks como antes.
- **Hooks** mantêm a mesma API pública, mas delegam leitura e escrita para repositórios ou para utilitários baseados no adapter.
- **Repositories** concentram chaves, validações, normalizações e operações de persistência de cada domínio.
- **Storage Adapter** define o contrato mínimo para persistir dados sem expor `localStorage` para as camadas superiores.
- **LocalStorageAdapter** é a implementação atual, com `try/catch`, validação, normalização, notificações locais e rollback transacional quando aplicável. Notificações de transações só são emitidas após o commit completo; rollbacks não disparam eventos intermediários.

## Storage Adapter

A interface `StorageAdapter` expõe as operações mínimas:

- `get`: lê e normaliza/valida um valor.
- `set`: grava um valor serializado.
- `remove`: remove uma chave.
- `list`: lê coleções com validação ou normalização item a item.
- `transaction`: aplica múltiplas operações com snapshot e rollback em caso de falha.
- `clear`: limpa chaves específicas ou todo o storage.
- `has`: verifica existência de uma chave.

## Repositories

Os repositórios ficam em `src/repositories` e encapsulam persistência por domínio:

- `comments`: comentários e reações de discussões.
- `contributions`: contribuições e rollback em ações compostas com moderação.
- `favorites`: favoritos de problemas e soluções.
- `moderation`: casos, ações e transações que também alteram comentários.
- `storageState`: ponte genérica para estados locais legados usados por hooks, mantendo o fluxo Hook → Repository → Adapter.
- `users`: usuários registrados, sessão e configurações com operações compostas de usuário/sessão transacionais.
- `problems`: catálogo mockado de problemas.
- `solutions`: catálogo mockado de soluções.

## Substituição futura por Supabase

A migração para Supabase deve preservar o contrato dos repositórios para evitar mudanças na UI e nos hooks. A estratégia recomendada é:

1. Criar um novo adapter ou implementações de repositório que chamem Supabase.
2. Manter os métodos públicos atuais dos repositórios.
3. Migrar cada domínio gradualmente, começando por dados menos acoplados.
4. Trocar validação/normalização local por validação combinada entre tipos TypeScript, políticas do banco e parsing de respostas.
5. Preservar transações em operações compostas usando recursos transacionais ou RPCs no backend quando necessário.

Supabase não foi integrado nesta sprint; o adapter atual continua usando `localStorage` internamente.
