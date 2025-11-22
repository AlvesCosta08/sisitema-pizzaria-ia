# Pizzaria IA

Sistema de atendimento e pedidos para pizzaria com IA integrada.

## Requisitos

- Docker
- Docker Compose

## Como Rodar Localmente

1. Clone o repositório.
2. Navegue até a pasta do projeto.
3. Execute: `docker-compose up --build`
4. Acesse o widget em: `http://localhost:3000`
5. A API estará disponível em: `http://localhost:5000/api`

## Como Hospedar na VPS

1. Instale Docker e Docker Compose na sua VPS.
2. Clone este repositório na VPS.
3. Configure o `docker-compose.yml` ou um proxy reverso (como nginx) para expor os serviços na porta 80/443.
4. Execute: `docker-compose up -d --build`
5. Configure seu domínio para apontar para o IP da VPS.
6. (Opcional) Configure HTTPS com Let's Encrypt.

## Estrutura

- `backend/`: API Flask com IA e banco de dados.
- `frontend/`: Widget React integrável.
- `data/`: Dados persistentes (SQLite).# sisitema-pizzaria-ia
