import React, { useState, useEffect, useRef } from 'react';
import { recomendarPizza, salvarPedido } from '../services/api';
import { CARDAPIO, EXTRAS } from '../cardapio-data';

// --- Tipos ---
type MessageType = 'user' | 'bot' | 'system' | 'cardapio' | 'action';

interface Message {
  id: number;
  text?: string;
  type: MessageType;
  timestamp: Date;
  pizza?: { nome: string; ingredientes: string; preco: number };
  options?: { text: string; action: string }[];
}

interface CarrinhoItem {
  id: number;
  nome: string;
  precoBase: number;
  extras: string[];
  precoTotal: number;
  quantidade: number;
}

interface ClienteInfo {
  id: number | null;
  nome: string;
  telefone: string;
  endereco: string;
}

const NUMERO_ATENDIMENTO = '5585988978980';

const PizzaRecommender: React.FC = () => {
  // --- Estados ---
  const [clienteInfo, setClienteInfo] = useState<ClienteInfo>({
    id: null,
    nome: '',
    telefone: '',
    endereco: ''
  });
  const [showClienteForm, setShowClienteForm] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [pizzaToAdd, setPizzaToAdd] = useState<{ nome: string; preco: number } | null>(null);
  const [extrasSelecionados, setExtrasSelecionados] = useState<string[]>([]);
  const [quantidade, setQuantidade] = useState(1);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // --- Efeitos e Utilitários ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const totalCarrinho = carrinho.reduce((sum, item) => sum + (item.precoTotal * item.quantidade), 0);
  const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  useEffect(() => {
    setMessages([{
      id: 1,
      text: "Olá! Bem-vindo à Pizzaria IA! 🍕\n\nSou seu assistente virtual. Vamos começar com seu cadastro para uma experiência personalizada.",
      type: 'bot',
      timestamp: new Date()
    }]);
    
    const carrinhoSalvo = localStorage.getItem('pizzaria-carrinho');
    if (carrinhoSalvo) {
      try {
        setCarrinho(JSON.parse(carrinhoSalvo));
      } catch (e) {
        console.error('Erro ao carregar carrinho:', e);
        localStorage.removeItem('pizzaria-carrinho');
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('pizzaria-carrinho', JSON.stringify(carrinho));
    } catch (e) {
      console.error('Erro ao salvar carrinho:', e);
    }
  }, [carrinho]);

  // --- Funções de Manipulação ---
  const handleClienteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clienteInfo.nome && clienteInfo.telefone && clienteInfo.endereco) {
      const novoClienteId = Date.now() % 10000;
      setClienteInfo(prev => ({ ...prev, id: novoClienteId }));
      setShowClienteForm(false);
      addMessage({
        id: Date.now(),
        text: `✅ **Cadastro Concluído!**\n\nObrigado, ${clienteInfo.nome}! Agora, como posso te ajudar? 😊`,
        type: 'bot',
        timestamp: new Date()
      });
      addMessage({
        id: Date.now() + 1,
        type: 'action',
        options: [
          { text: "📋 Ver Cardápio", action: 'ver_cardapio' },
          { text: "🎯 Receber Recomendação", action: 'recomendar' },
          { text: "❓ Ajuda", action: 'ajuda' }
        ],
        timestamp: new Date()
      });
    }
  };

  // --- Função principal de finalização ---
  const handleFinalizarPedido = async () => {
    if (carrinho.length === 0) {
      addMessage({ id: Date.now(), text: "Seu carrinho está vazio.", type: 'bot', timestamp: new Date() });
      return;
    }
    if (clienteInfo.id === null) {
      addMessage({ id: Date.now(), text: "Erro: ID do cliente inválido.", type: 'bot', timestamp: new Date() });
      return;
    }

    setLoading(true);
    addMessage({ id: Date.now(), text: "Processando seu pedido... 🍕", type: 'bot', timestamp: new Date() });

    try {
      const promises = carrinho.flatMap(item =>
        Array(item.quantidade).fill(null).map(() =>
          salvarPedido({
            cliente_id: clienteInfo.id!,
            nome_cliente: clienteInfo.nome,
            telefone_cliente: clienteInfo.telefone,
            pizza: item.nome,
            extras: item.extras
          })
        )
      );

      const resultados = await Promise.allSettled(promises);
      const todasBemSucedidas = resultados.every(r => r.status === 'fulfilled');

      if (todasBemSucedidas) {
        addMessage({
          id: Date.now() + 1,
          text: `✅ **Pedido Confirmado!**\n\n${totalItens} itens • Total: R$ ${totalCarrinho.toFixed(2)}\n\nSeu pedido já está no nosso sistema!`,
          type: 'bot',
          timestamp: new Date()
        });
        setCarrinho([]);
        setShowCarrinho(false);
        localStorage.removeItem('pizzaria-carrinho');
      } else {
        const erros = resultados.filter(r => r.status === 'rejected').map(r => (r as any).reason.message || 'Erro');
        console.error('Erros ao salvar:', erros);
        addMessage({ id: Date.now() + 1, text: `⚠️ Erro ao salvar: ${erros[0]}`, type: 'bot', timestamp: new Date() });
      }
    } catch (e: any) {
      console.error('Erro geral:', e);
      addMessage({ id: Date.now() + 1, text: `❌ Erro: ${e.message || 'Erro desconhecido'}`, type: 'bot', timestamp: new Date() });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    const numeroLimpo = NUMERO_ATENDIMENTO.replace(/\D/g, '');
    let mensagem = `Olá! Gostaria de confirmar meu pedido:\n\n`;
    carrinho.forEach(item => {
      mensagem += `• ${item.quantidade}x ${item.nome}`;
      if (item.extras.length > 0) {
        mensagem += ` (Extras: ${item.extras.join(', ')})`;
      }
      mensagem += ` - R$ ${(item.precoTotal * item.quantidade).toFixed(2)}\n`;
    });
    mensagem += `\n💰 **Total: R$ ${totalCarrinho.toFixed(2)}**\n`;
    mensagem += `👤 **Cliente:** ${clienteInfo.nome}\n`;
    mensagem += `📞 **Telefone:** ${clienteInfo.telefone}\n`;
    mensagem += `📍 **Endereço:** ${clienteInfo.endereco}\n\n`;
    mensagem += `Pedido realizado via Pizzaria IA 🍕`;
    window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  // --- Funções do Chat ---
  const handleOptionClick = async (action: string) => {
    setLoading(true);
    addMessage({ id: Date.now(), text: action.replace(/_/g, ' '), type: 'user', timestamp: new Date() });

    if (action === 'ver_cardapio') {
      addMessage({ id: Date.now() + 1, text: "Aqui está nosso cardápio completo...", type: 'bot', timestamp: new Date() });
      // Tipar corretamente as mensagens do cardápio
      const cardapioMessages: Message[] = Object.entries(CARDAPIO).map(([nome, info], i) => ({
        id: Date.now() + i + 100,
        type: 'cardapio', // Agora é um tipo válido
        timestamp: new Date(),
        pizza: { nome, ingredientes: info.ingredientes, preco: info.preco },
        options: [{ text: "Adicionar", action: `adicionar_${nome}` }]
      }));
      setMessages(prev => [...prev, ...cardapioMessages]);
    } 
    else if (action === 'recomendar') {
      try {
        const resp = await recomendarPizza(clienteInfo.id || 1);
        if (!resp.erro) {
          addMessage({ id: Date.now() + 1, text: `🎯 **Recomendação Especial!**\n\n**${resp.pizza_recomendada}**\n${resp.motivo}\n\nIngredientes: ${resp.ingredientes.join(', ')}`, type: 'bot', timestamp: new Date() });
          addMessage({ id: Date.now() + 2, type: 'action', options: [{ text: "Adicionar Recomendação", action: `adicionar_${resp.pizza_recomendada}` }, { text: "Ver Cardápio", action: 'ver_cardapio' }], timestamp: new Date() });
        } else {
          addMessage({ id: Date.now() + 1, text: `Erro: ${resp.detalhe}`, type: 'bot', timestamp: new Date() });
        }
      } catch (e) {
        addMessage({ id: Date.now() + 1, text: "Erro ao conectar com o sistema.", type: 'bot', timestamp: new Date() });
      }
    } 
    else if (action.startsWith('adicionar_')) {
      const nomePizza = action.replace('adicionar_', '');
      const infoPizza = CARDAPIO[nomePizza as keyof typeof CARDAPIO];
      if (infoPizza) {
        setPizzaToAdd({ nome: nomePizza, preco: infoPizza.preco });
        setExtrasSelecionados([]);
        setQuantidade(1);
      }
    } 
    else if (action === 'ver_carrinho') {
      setShowCarrinho(true);
    } 
    else if (action === 'finalizar_pedido') {
      handleFinalizarPedido(); // Chama a função principal
    } 
    else if (action === 'limpar_carrinho') {
      setCarrinho([]);
      setShowCarrinho(false);
      localStorage.removeItem('pizzaria-carrinho');
      addMessage({ id: Date.now() + 1, text: "Carrinho limpo!", type: 'bot', timestamp: new Date() });
    } 
    else if (action === 'continuar_comprando') {
      setShowCarrinho(false);
    } 
    else if (action === 'ajuda') {
      addMessage({ id: Date.now() + 1, text: "**Como posso ajudar?**\n\n• **Ver Cardápio**\n• **Recomendação**\n• **Carrinho**\n• **Digite**", type: 'bot', timestamp: new Date() });
    }
    
    setLoading(false);
  };

  const handleAdicionarAoCarrinho = () => {
    if (!pizzaToAdd) return;
    const precoExtras = extrasSelecionados.reduce((sum, e) => sum + (EXTRAS[e as keyof typeof EXTRAS] || 0), 0);
    const precoTotal = pizzaToAdd.preco + precoExtras;

    const itemExistenteIndex = carrinho.findIndex(
      item => item.nome === pizzaToAdd.nome && JSON.stringify(item.extras) === JSON.stringify(extrasSelecionados)
    );

    if (itemExistenteIndex > -1) {
      const novoCarrinho = [...carrinho];
      novoCarrinho[itemExistenteIndex].quantidade += quantidade;
      setCarrinho(novoCarrinho);
    } else {
      const novoItem: CarrinhoItem = {
        id: Date.now(),
        nome: pizzaToAdd.nome,
        precoBase: pizzaToAdd.preco,
        extras: [...extrasSelecionados],
        precoTotal: precoTotal,
        quantidade: quantidade
      };
      setCarrinho(prev => [...prev, novoItem]);
    }

    setPizzaToAdd(null);
    setExtrasSelecionados([]);
    setQuantidade(1);
    addMessage({ id: Date.now(), text: `✅ ${quantidade}x ${pizzaToAdd.nome} adicionada ao carrinho!`, type: 'system', timestamp: new Date() });
  };

  const handleRemoverDoCarrinho = (id: number) => setCarrinho(prev => prev.filter(item => item.id !== id));
  const handleAtualizarQuantidade = (id: number, novaQuantidade: number) => {
    if (novaQuantidade < 1) return handleRemoverDoCarrinho(id);
    setCarrinho(prev => prev.map(item => item.id === id ? { ...item, quantidade: novaQuantidade } : item));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;
    const userMessage: Message = { id: Date.now(), text: inputText, type: 'user', timestamp: new Date() };
    addMessage(userMessage);
    setInputText('');
    setLoading(true);

    const lowerText = inputText.toLowerCase();
    const respostas = {
      saudacao: () => [
        { id: Date.now() + 1, text: `Olá ${clienteInfo.nome}! 😊 Como posso te ajudar?`, type: 'bot', timestamp: new Date() } as Message,
        { id: Date.now() + 2, type: 'action', options: [{ text: "📋 Cardápio", action: 'ver_cardapio' }, { text: "🎯 Recomendação", action: 'recomendar' }, { text: `🛒 Carrinho (${totalItens})`, action: 'ver_carrinho' }], timestamp: new Date() } as Message
      ],
      cardapio: () => handleOptionClick('ver_cardapio'),
      recomendar: () => handleOptionClick('recomendar'),
      carrinho: () => handleOptionClick('ver_carrinho'),
      obrigado: () => addMessage({ id: Date.now() + 1, text: `De nada, ${clienteInfo.nome}! 😊`, type: 'bot', timestamp: new Date() }),
      preco: () => addMessage({ id: Date.now() + 1, text: "Temos pizzas a partir de R$ 25,00!", type: 'bot', timestamp: new Date() }),
      ajuda: () => addMessage({ id: Date.now() + 1, text: "Desculpe, não entendi. Aqui estão as opções:", type: 'bot', timestamp: new Date() })
    };

    if (showClienteForm) {
      addMessage({ id: Date.now() + 1, text: "Por favor, complete seu cadastro primeiro! 😊", type: 'bot', timestamp: new Date() });
    } else if (/(olá|oi|ola|bom dia|boa tarde|boa noite)/i.test(lowerText)) {
      // Tipar corretamente o array retornado
      const msgs = respostas.saudacao();
      msgs.forEach(addMessage); // Agora o forEach é seguro
    } else if (/(cardápio|cardapio|menu|opções|o que tem|pizzas)/i.test(lowerText)) {
      respostas.cardapio();
    } else if (/(recomendar|sugerir|sugira|qual pizza|não sei|indica)/i.test(lowerText)) {
      respostas.recomendar();
    } else if (/(carrinho|pedido|meu pedido|itens)/i.test(lowerText)) {
      respostas.carrinho();
    } else if (/(obrigado|obrigada|valeu)/i.test(lowerText)) {
      respostas.obrigado();
    } else if (/(preço|preco|quanto custa|valor)/i.test(lowerText)) {
      respostas.preco();
    } else {
      respostas.ajuda();
      addMessage({ id: Date.now() + 2, type: 'action', options: [{ text: "📋 Ver Cardápio", action: 'ver_cardapio' }, { text: "🎯 Recomendação", action: 'recomendar' }, { text: `🛒 Carrinho (${totalItens})`, action: 'ver_carrinho' }, { text: "❓ Ajuda", action: 'ajuda' }], timestamp: new Date() } as Message);
    }
    setLoading(false);
  };

  // --- Renderização ---
  return (
    <div style={styles.container}>
      {/* O cabeçalho é renderizado uma única vez, fora da condição */}
      <div style={styles.whatsappHeader}>

      </div>

      {/* Conteúdo condicional: Formulário ou Chat */}
      {showClienteForm ? (
        <form onSubmit={handleClienteSubmit} style={styles.clienteForm}>
          <div style={styles.formContainer}>
            <h4 style={styles.formTitle}>Cadastro do Cliente</h4>
            <input type="text" placeholder="Nome completo" value={clienteInfo.nome} onChange={(e) => setClienteInfo({ ...clienteInfo, nome: e.target.value })} style={styles.input} required />
            <input type="tel" placeholder="Telefone (ex: 11 99999-9999)" value={clienteInfo.telefone} onChange={(e) => setClienteInfo({ ...clienteInfo, telefone: e.target.value })} style={styles.input} required />
            <textarea placeholder="Endereço completo para entrega" value={clienteInfo.endereco} onChange={(e) => setClienteInfo({ ...clienteInfo, endereco: e.target.value })} style={{ ...styles.input, minHeight: '80px', resize: 'none' }} required />
            <button type="submit" style={styles.confirmButton}>Começar a Pedir</button>
          </div>
        </form>
      ) : (
        <>
          {/* Chat */}
          <div style={styles.chatArea}>
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} onOptionClick={handleOptionClick} />)}
            {loading && (
              <div style={styles.loading}>
                <div style={styles.typingIndicator}>
                  <div style={styles.typingDot}></div>
                  <div style={styles.typingDot}></div>
                  <div style={styles.typingDot}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Carrinho */}
          {showCarrinho && (
            <div style={styles.carrinhoArea}>
              <div style={styles.carrinhoHeader}>
                <button onClick={() => setShowCarrinho(false)} style={styles.backButton}>←</button>
                <h4 style={styles.carrinhoTitulo}>Seu Carrinho</h4>
              </div>
              
              {carrinho.length === 0 ? (
                <div style={styles.carrinhoVazio}>
                  <p style={styles.carrinhoVazioText}>Seu carrinho está vazio</p>
                  <button onClick={() => setShowCarrinho(false)} style={styles.continuarButton}>Ver Cardápio</button>
                </div>
              ) : (
                <>
                  <div style={styles.carrinhoItens}>
                    {carrinho.map(item => (
                      <div key={item.id} style={styles.itemCarrinho}>
                        <div style={styles.itemInfo}>
                          <strong style={styles.itemNome}>{item.nome}</strong>
                          <div style={styles.itemDetails}>
                            <span>R$ {item.precoBase.toFixed(2)}</span>
                            {item.extras.length > 0 && <span style={styles.itemExtras}>+ {item.extras.join(', ')}</span>}
                          </div>
                          <div style={styles.quantidadeContainer}>
                            <button onClick={() => handleAtualizarQuantidade(item.id, item.quantidade - 1)} style={styles.quantidadeButton}>-</button>
                            <span style={styles.quantidadeText}>{item.quantidade}</span>
                            <button onClick={() => handleAtualizarQuantidade(item.id, item.quantidade + 1)} style={styles.quantidadeButton}>+</button>
                          </div>
                          <strong style={styles.itemTotal}>R$ ${(item.precoTotal * item.quantidade).toFixed(2)}</strong>
                        </div>
                        <button onClick={() => handleRemoverDoCarrinho(item.id)} style={styles.removerButton}>🗑️</button>
                      </div>
                    ))}
                  </div>
                  <div style={styles.totalCarrinho}><strong>Total: R$ {totalCarrinho.toFixed(2)}</strong></div>
                  <div style={styles.carrinhoBotoes}>
                    <button onClick={handleFinalizarPedido} style={{ ...styles.whatsappButton, backgroundColor: loading ? '#ccc' : '#25d366' }} disabled={loading}>
                      {loading ? 'Salvando...' : '✅ Confirmar Pedido'}
                    </button>
                   
                    <button onClick={() => handleOptionClick('limpar_carrinho')} style={styles.limparButton}>Limpar Carrinho</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Botão flutuante do carrinho */}
          {!showCarrinho && carrinho.length > 0 && (
            <button onClick={() => setShowCarrinho(true)} style={styles.floatingCarrinhoButton}>
              🛒 {totalItens} itens • R$ {totalCarrinho.toFixed(2)}
            </button>
          )}

          {/* Modal de Extras */}
          {pizzaToAdd && (
            <div style={styles.modalOverlay}>
              <div style={styles.modalContent}>
                <h4 style={styles.modalTitulo}>{pizzaToAdd.nome}</h4>
                <p style={styles.modalPreco}>R$ {pizzaToAdd.preco.toFixed(2)}</p>
                <div style={styles.quantidadeSection}>
                  <label style={styles.quantidadeLabel}>Quantidade:</label>
                  <div style={styles.quantidadeContainer}>
                    <button onClick={() => setQuantidade(Math.max(1, quantidade - 1))} style={styles.quantidadeButton}>-</button>
                    <span style={styles.quantidadeText}>{quantidade}</span>
                    <button onClick={() => setQuantidade(quantidade + 1)} style={styles.quantidadeButton}>+</button>
                  </div>
                </div>
                <div style={styles.extrasSection}>
                  <h5 style={styles.extrasTitulo}>Extras:</h5>
                  {Object.entries(EXTRAS).map(([extra, preco]) => (
                    <label key={extra} style={styles.extraLabel}>
                      <input type="checkbox" checked={extrasSelecionados.includes(extra)} onChange={(e) => {
                        if (e.target.checked) setExtrasSelecionados(prev => [...prev, extra]);
                        else setExtrasSelecionados(prev => prev.filter(e => e !== extra));
                      }} style={styles.checkbox} /> 
                      {extra} (+R$ {preco.toFixed(2)})
                    </label>
                  ))}
                </div>
                <div style={styles.modalTotal}>
                  Total: R$ {((pizzaToAdd.preco + extrasSelecionados.reduce((sum, e) => sum + (EXTRAS[e as keyof typeof EXTRAS] || 0), 0)) * quantidade).toFixed(2)}
                </div>
                <div style={styles.modalButtons}>
                  <button onClick={() => setPizzaToAdd(null)} style={styles.cancelarButton}>Cancelar</button>
                  <button onClick={handleAdicionarAoCarrinho} style={styles.adicionarButton}>Adicionar</button>
                </div>
              </div>
            </div>
          )}

          {/* Input de Mensagem */}
          {!showCarrinho && (
            <div style={styles.inputArea}>
              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Digite uma mensagem..." style={styles.input} disabled={loading} />
              <button onClick={handleSendMessage} style={{ ...styles.sendButton, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }} disabled={loading}>
                {loading ? '⏳' : '↑'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- Componente de Mensagem ---
const ChatMessage: React.FC<{ message: Message; onOptionClick: (action: string) => void; }> = ({ message, onOptionClick }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  const isCardapio = message.type === 'cardapio';
  const isAction = message.type === 'action';

  if (isCardapio && message.pizza) {
    return (
      <div style={styles.cardapioMessage}>
        <div style={styles.cardapioContent}>
          <strong style={styles.pizzaNome}>{message.pizza.nome}</strong>
          <div style={styles.pizzaIngredientes}>{message.pizza.ingredientes}</div>
          <div style={styles.cardapioFooter}>
            <strong style={styles.pizzaPreco}>R$ {message.pizza.preco.toFixed(2)}</strong>
            {message.options && <button onClick={() => onOptionClick(message.options![0].action)} style={styles.cardapioButton}>Adicionar</button>}
          </div>
        </div>
      </div>
    );
  }

  if (isAction && message.options) {
    return (
      <div style={styles.actionMessage}>
        {message.options.map((opt, i) => <button key={i} onClick={() => onOptionClick(opt.action)} style={styles.actionButton}>{opt.text}</button>)}
      </div>
    );
  }

  if (isSystem) {
    return <div style={styles.systemMessage}><div style={styles.systemBubble}>{message.text}</div></div>;
  }

  return (
    <div style={{ ...styles.messageContainer, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ ...styles.messageBubble, ...(isUser ? styles.userBubble : styles.botBubble) }}>
        {message.text?.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
      </div>
    </div>
  );
};

// --- Estilos CSS em JS - Estilo WhatsApp ---
const styles = {
  container: {
    fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
    padding: '0',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#e5ddd5',
    backgroundImage: 'url("image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
    position: 'relative' as const,
  },
  
  whatsappHeader: {
    backgroundColor: '#075e54',
    padding: '16px',
    color: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#25d366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  
  headerText: {
    flex: 1,
  },
  
  headerTitle: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
  },
  
  headerStatus: {
    fontSize: '12px',
    opacity: 0.8,
  },
  
  clienteForm: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    padding: '20px',
  },
  
  formContainer: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  
  formTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: 'bold' as const,
    color: '#075e54',
    textAlign: 'center' as const,
  },
  
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box' as const,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  
  confirmButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    transition: 'background-color 0.2s',
  },
  
  chatArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  
  messageContainer: {
    display: 'flex',
    marginBottom: '8px',
  },
  
  messageBubble: {
    maxWidth: '70%',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.4',
    wordWrap: 'break-word' as const,
  },
  
  userBubble: {
    backgroundColor: '#dcf8c6',
    borderTopRightRadius: '2px',
  },
  
  botBubble: {
    backgroundColor: 'white',
    borderTopLeftRadius: '2px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  
  systemMessage: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  
  systemBubble: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    color: '#666',
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    maxWidth: '80%',
    textAlign: 'center' as const,
  },
  
  cardapioMessage: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '8px',
  },
  
  cardapioContent: {
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    maxWidth: '80%',
  },
  
  pizzaNome: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  
  pizzaIngredientes: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
  },
  
  pizzaPreco: {
    color: '#25d366',
    fontSize: '14px',
  },
  
  cardapioFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  cardapioButton: {
    padding: '6px 12px',
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  
  actionMessage: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap' as const,
  },
  
  actionButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    color: '#075e54',
    border: '1px solid #075e54',
    borderRadius: '18px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  loading: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '8px',
  },
  
  typingIndicator: {
    backgroundColor: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  
  typingDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#999',
    borderRadius: '50%',
    animation: 'typing 1.4s infinite ease-in-out',
  },
  
  carrinhoArea: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  
  carrinhoHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#075e54',
    color: 'white',
    gap: '12px',
  },
  
  backButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
  },
  
  carrinhoTitulo: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold' as const,
  },
  
  carrinhoItens: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px',
  },
  
  itemCarrinho: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
    gap: '12px',
  },
  
  itemInfo: {
    flex: 1,
  },
  
  itemNome: {
    display: 'block',
    fontSize: '14px',
    marginBottom: '4px',
  },
  
  itemDetails: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
  },
  
  itemExtras: {
    fontSize: '11px',
    color: '#25d366',
  },
  
  itemTotal: {
    color: '#075e54',
    fontSize: '14px',
  },
  
  quantidadeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '8px 0',
  },
  
  quantidadeButton: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid #075e54',
    backgroundColor: 'white',
    color: '#075e54',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
  },
  
  quantidadeText: {
    padding: '0 8px',
    fontWeight: 'bold' as const,
    minWidth: '20px',
    textAlign: 'center' as const,
  },
  
  removerButton: {
    padding: '6px',
    backgroundColor: 'transparent',
    color: '#ff4444',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  
  carrinhoVazio: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  
  carrinhoVazioText: {
    color: '#666',
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  
  continuarButton: {
    padding: '12px 24px',
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
  },
  
  totalCarrinho: {
    padding: '16px',
    borderTop: '2px solid #f0f0f0',
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
    fontSize: '16px',
    color: '#075e54',
  },
  
  carrinhoBotoes: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  
  whatsappButton: {
    padding: '14px',
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    fontSize: '14px',
  },
  
  limparButton: {
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#ff4444',
    border: '1px solid #ff4444',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  
  floatingCarrinhoButton: {
    position: 'absolute' as const,
    bottom: '80px',
    right: '16px',
    padding: '12px 16px',
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: 5,
    fontSize: '14px',
  },
  
  modalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    padding: '16px',
  },
  
  modalContent: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '400px',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  
  modalTitulo: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#075e54',
    textAlign: 'center' as const,
  },
  
  modalPreco: {
    textAlign: 'center' as const,
    fontSize: '16px',
    color: '#25d366',
    fontWeight: 'bold' as const,
    marginBottom: '16px',
  },
  
  quantidadeSection: {
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  
  quantidadeLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold' as const,
    color: '#333',
  },
  
  extrasSection: {
    marginBottom: '16px',
  },
  
  extrasTitulo: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#333',
  },
  
  extraLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: '#f8f9fa',
    cursor: 'pointer',
    fontSize: '14px',
  },
  
  checkbox: {
    margin: 0,
  },
  
  modalTotal: {
    textAlign: 'center' as const,
    padding: '12px 0',
    borderTop: '1px solid #e0e0e0',
    marginTop: '12px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#075e54',
  },
  
  modalButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  
  cancelarButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  
  adicionarButton: {
    flex: 2,
    padding: '12px',
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold' as const,
  },
  
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f0f0f0',
    borderTop: '1px solid #ddd',
  },
  
  sendButton: {
    padding: '12px 16px',
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    minWidth: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
};

// Adicionar animação de typing
const style = document.createElement('style');
style.textContent = `
  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .typing-dot:nth-child(1) { animation-delay: 0s; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
`;
document.head.appendChild(style);

export default PizzaRecommender;