const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'; // Use a URL do seu backend

export const recomendarPizza = async (clienteId?: number) => {
  const url = clienteId
    ? `${API_BASE_URL}/recomendar?cliente_id=${clienteId}`
    : `${API_BASE_URL}/recomendar`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
  return res.json();
};

// --- ATUALIZAÇÃO: Tipo para dados do cliente ---
interface ClienteInfo {
  nome_cliente: string;
  telefone_cliente: string;
}

// --- ATUALIZAÇÃO: Tipo para dados do pedido ---
interface PedidoData extends ClienteInfo {
  cliente_id: number;
  pizza: string;
  extras?: string[];
}

// --- ATUALIZAÇÃO: Tipo para resposta do pedido ---
interface PedidoResponse {
  sucesso: boolean;
  mensagem?: string;
  erro?: string;
}

// --- ATUALIZAÇÃO: Função salvarPedido ---
export const salvarPedido = async (pedido: PedidoData): Promise<PedidoResponse> => {
  const res = await fetch(`${API_BASE_URL}/pedido`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pedido), // Envia cliente_id, pizza, extras, nome_cliente, telefone_cliente
  });
  if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
  return res.json();
};

// --- NOVO: Função para buscar pedidos ---
// --- ATUALIZAÇÃO: Tipo para um pedido retornado pela API ---
interface PedidoRetornado {
  id: number;
  cliente_id: number;
  nome_cliente: string; // Esperado do backend
  telefone_cliente: string; // Esperado do backend
  data_hora: string; // Ex: "2025-11-22 19:30:00"
  pizza: string;
  ingredientes: string;
  valor: number;
}

// --- NOVA FUNÇÃO ---
export const getPedidos = async (): Promise<PedidoRetornado[]> => {
  const res = await fetch(`${API_BASE_URL}/pedidos`); // Nova rota no backend
  if (!res.ok) {
    throw new Error(`Erro na API ao buscar pedidos: ${res.status}`);
  }
  return res.json();
};

// --- NOVAS FUNÇÕES: Excluir e Atualizar Pedido ---

// --- Função para excluir um pedido ---
export const excluirPedido = async (id: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/pedido/${id}`, { // Supondo que a rota seja /api/pedido/{id}
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorDetails = await res.text(); // Pega detalhes do erro se houver
    throw new Error(`Erro na API ao excluir pedido: ${res.status} - ${errorDetails}`);
  }
  // DELETE geralmente não retorna conteúdo
};

// --- Função para atualizar um pedido ---
// Tipo para os dados que podem ser atualizados (opcional)
interface PedidoUpdateData {
  nome_cliente?: string;
  telefone_cliente?: string;
  pizza?: string;
  ingredientes?: string;
  valor?: number;
  // cliente_id normalmente não é alterado
}

export const atualizarPedido = async (id: number, dadosAtualizados: PedidoUpdateData): Promise<PedidoRetornado> => {
  const res = await fetch(`${API_BASE_URL}/pedido/${id}`, { // Supondo que a rota seja /api/pedido/{id}
    method: 'PUT', // ou PATCH, dependendo da implementação do backend
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dadosAtualizados),
  });
  if (!res.ok) {
    const errorDetails = await res.text();
    throw new Error(`Erro na API ao atualizar pedido: ${res.status} - ${errorDetails}`);
  }
  return res.json(); // Retorna o pedido atualizado
};

