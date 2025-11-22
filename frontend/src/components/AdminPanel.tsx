import React, { useState, useEffect } from 'react';
import { getPedidos, excluirPedido, atualizarPedido } from '../services/api';
import { FaWhatsapp, FaEdit, FaTrash, FaSpinner, FaExclamationTriangle, FaPizzaSlice, FaFilePdf } from 'react-icons/fa';

// --- Tipos para o Pedido ---
interface Pedido {
  id: number;
  cliente_id: number;
  data_hora: string;
  pizza: string;
  ingredientes: string;
  valor: number;
  nome_cliente: string;
  telefone_cliente: string;
}

// Componente wrapper para ícones
const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

const AdminPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [editandoPedido, setEditandoPedido] = useState<Pedido | null>(null);
  const [mostrarModalEdicao, setMostrarModalEdicao] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta se está em mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const data = await getPedidos();
        setPedidos(data);
      } catch (err) {
        setError('Erro ao carregar pedidos: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  // --- Função para gerar PDF ---
  const handleDownloadPDF = (pedido: Pedido) => {
    // Cria um conteúdo HTML com o modelo solicitado
    const conteudoPDF = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comanda - Pedido #${pedido.id}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            margin: 20px;
            font-size: 14px;
            line-height: 1.2;
            color: #000;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .titulo {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
          }
          .subtitulo {
            font-size: 12px;
            margin: 2px 0;
          }
          .barcode {
            text-align: center;
            font-family: 'Libre Barcode 128', cursive;
            font-size: 24px;
            margin: 10px 0;
          }
          .info-pedido {
            margin: 10px 0;
          }
          .linha {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .label {
            font-weight: bold;
          }
          .pizza {
            margin: 10px 0;
            padding: 5px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
          }
          .nome-pizza {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
          }
          .ingredientes {
            font-size: 11px;
            color: #555;
          }
          .observacoes {
            margin: 10px 0;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
          }
          .urgente {
            background: #ffeb3b;
            padding: 4px;
            text-align: center;
            font-weight: bold;
            margin: 5px 0;
            border: 1px dashed #000;
          }
          .timestamp {
            text-align: center;
            margin-top: 12px;
            font-size: 10px;
            color: #666;
          }
          .btn-imprimir {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
          }
          @media print {
            .no-print {
              display: none;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="titulo">PIZZARIA IA</h1>
          <p class="subtitulo">*** COMANDA COZINHA ***</p>
        </div>
        
        <div class="barcode">
          *${pedido.id.toString().padStart(6, '0')}*
        </div>
        
        <div class="info-pedido">
          <div class="linha">
            <span class="label">PEDIDO:</span>
            <span>#${pedido.id}</span>
          </div>
          <div class="linha">
            <span class="label">CLIENTE:</span>
            <span>${pedido.nome_cliente}</span>
          </div>
          <div class="linha">
            <span class="label">TELEFONE:</span>
            <span>${pedido.telefone_cliente}</span>
          </div>
          <div class="linha">
            <span class="label">DATA/HORA:</span>
            <span>${new Date(pedido.data_hora).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="pizza">
          <div class="nome-pizza">${pedido.pizza}</div>
          <div class="ingredientes">
            <strong>Ingredientes:</strong><br>
            ${pedido.ingredientes.split(',').map(ing => `• ${ing.trim()}`).join('<br>')}
          </div>
        </div>
        
        <div class="observacoes">
          <strong>OBSERVAÇÕES:</strong><br>
          • Preparar com cuidado<br>
          • Verificar qualidade<br>
          • Entregar no balcão
        </div>
        
        <div class="urgente">
          ⚡ PREPARAR PARA ENTREGA ⚡
        </div>
        
        <div class="timestamp">
          Impresso em: ${new Date().toLocaleString()}
        </div>
        
        <div class="botoes no-print" style="text-align: center; margin: 15px 0;">
          <button class="btn-imprimir" onclick="window.print()">
            🖨️ Imprimir Comanda
          </button>
          <p style="font-size: 10px; margin-top: 5px;">
            Se a impressão não iniciar automaticamente, clique no botão acima.
          </p>
        </div>
        
        <script>
          // Tenta imprimir automaticamente
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 500);
          };
          
          // Fecha a janela após impressão (em alguns navegadores)
          window.onafterprint = function() {
            setTimeout(() => {
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    // Abre o conteúdo em uma nova janela para permitir impressão como PDF
    const janelaPDF = window.open('', '_blank');
    if (!janelaPDF) {
      alert('Por favor, permita pop-ups para gerar o PDF.');
      return;
    }

    janelaPDF.document.write(conteudoPDF);
    janelaPDF.document.close();

    // Fecha a janela após a impressão (opcional)
    janelaPDF.onafterprint = () => {
      setTimeout(() => {
        janelaPDF.close();
      }, 1000);
    };
  };

  // --- Função para imprimir comanda ---
  const handleImprimirComanda = (pedido: Pedido) => {
    // Criar uma nova janela para impressão
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) {
      alert('Por favor, permita pop-ups para imprimir a comanda.');
      return;
    }

    // Conteúdo HTML para a comanda
    const conteudoComanda = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comanda - Pedido #${pedido.id}</title>
        <style>
          @media print {
            @page {
              margin: 0.5cm;
              size: 80mm 150mm;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              color: #000;
            }
          }
          body {
            margin: 0;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            color: #000;
            background: white;
          }
          .comanda {
            width: 100%;
            max-width: 300px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .titulo {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
          }
          .subtitulo {
            font-size: 12px;
            margin: 2px 0;
          }
          .info-pedido {
            margin: 8px 0;
          }
          .linha {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .label {
            font-weight: bold;
          }
          .pizza {
            margin: 8px 0;
            padding: 8px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
          }
          .nome-pizza {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 4px;
          }
          .ingredientes {
            font-size: 11px;
            color: #555;
          }
          .observacoes {
            margin: 8px 0;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
          }
          .timestamp {
            text-align: center;
            margin-top: 12px;
            font-size: 10px;
            color: #666;
          }
          .barcode {
            text-align: center;
            margin: 10px 0;
            font-family: 'Libre Barcode 128', cursive;
            font-size: 24px;
          }
          .urgente {
            background: #ffeb3b;
            padding: 4px;
            text-align: center;
            font-weight: bold;
            margin: 5px 0;
            border: 1px dashed #000;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
          .botoes {
            text-align: center;
            margin: 15px 0;
          }
          .btn-imprimir {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="comanda">
          <div class="header">
            <h1 class="titulo">PIZZARIA IA</h1>
            <p class="subtitulo">*** COMANDA COZINHA ***</p>
          </div>
          
          <div class="barcode">
            *${pedido.id.toString().padStart(6, '0')}*
          </div>
          
          <div class="info-pedido">
            <div class="linha">
              <span class="label">PEDIDO:</span>
              <span>#${pedido.id}</span>
            </div>
            <div class="linha">
              <span class="label">CLIENTE:</span>
              <span>${pedido.nome_cliente}</span>
            </div>
            <div class="linha">
              <span class="label">TELEFONE:</span>
              <span>${pedido.telefone_cliente}</span>
            </div>
            <div class="linha">
              <span class="label">DATA/HORA:</span>
              <span>${new Date(pedido.data_hora).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="pizza">
            <div class="nome-pizza">${pedido.pizza}</div>
            <div class="ingredientes">
              <strong>Ingredientes:</strong><br>
              ${pedido.ingredientes.split(',').map(ing => `• ${ing.trim()}`).join('<br>')}
            </div>
          </div>
          
          <div class="observacoes">
            <strong>OBSERVAÇÕES:</strong><br>
            • Preparar com cuidado<br>
            • Verificar qualidade<br>
            • Entregar no balcão
          </div>
          
          <div class="urgente">
            ⚡ PREPARAR PARA ENTREGA ⚡
          </div>
          
          <div class="timestamp">
            Impresso em: ${new Date().toLocaleString()}
          </div>
        </div>
        
        <div class="botoes no-print">
          <button class="btn-imprimir" onclick="window.print()">
            🖨️ Imprimir Comanda
          </button>
          <p style="font-size: 10px; margin-top: 5px;">
            Se a impressão não iniciar automaticamente, clique no botão acima.
          </p>
        </div>
        
        <script>
          // Tenta imprimir automaticamente
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 500);
          };
          
          // Fecha a janela após impressão (em alguns navegadores)
          window.onafterprint = function() {
            setTimeout(() => {
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    // Escrever o conteúdo na nova janela
    janelaImpressao.document.write(conteudoComanda);
    janelaImpressao.document.close();
  };

  // --- Função para lidar com o clique no botão de WhatsApp ---
  const handleCliqueWhatsApp = (numeroTelefone: string, nomeCliente: string, idPedido: number) => {
    const numeroLimpo = numeroTelefone.replace(/\D/g, '');
    let numeroFormatado = numeroLimpo;
    
    if (numeroLimpo.length === 10) {
      numeroFormatado = '55' + numeroLimpo.substring(0, 2) + '9' + numeroLimpo.substring(2);
    } else if (numeroLimpo.length === 11) {
      numeroFormatado = '55' + numeroLimpo;
    } else {
      console.error("Número de telefone inválido ou incompleto para formato internacional.", numeroLimpo);
      alert("Número de telefone inválido para envio via WhatsApp.");
      return;
    }
    
    const mensagem = `Olá ${encodeURIComponent(nomeCliente)}, sou da Pizzaria IA. Estou entrando em contato sobre seu pedido #${idPedido}.`;
    const mensagemCodificada = encodeURIComponent(mensagem);
    const link = `https://wa.me/${numeroFormatado}?text=${mensagemCodificada}`;
    window.open(link, '_blank');
  };

  // --- Função para lidar com o clique no botão de Excluir ---
  const handleExcluirPedido = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este pedido?")) {
      setProcessando(true);
      try {
        await excluirPedido(id);
        setPedidos(prev => prev.filter(p => p.id !== id));
        alert("Pedido excluído com sucesso!");
      } catch (err) {
        setError('Erro ao excluir pedido: ' + (err instanceof Error ? err.message : String(err)));
        alert("Erro ao excluir pedido. Consulte o console.");
      } finally {
        setProcessando(false);
      }
    }
  };

  // --- Função para lidar com o clique no botão de Editar ---
  const handleEditarPedido = (pedido: Pedido) => {
    setEditandoPedido(pedido);
    setMostrarModalEdicao(true);
  };

  // --- Função para lidar com o envio do formulário de edição ---
  const handleSubmitEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editandoPedido) return;

    setProcessando(true);
    try {
      await atualizarPedido(editandoPedido.id, editandoPedido);
      setPedidos(prev => prev.map(p => p.id === editandoPedido.id ? editandoPedido : p));
      setMostrarModalEdicao(false);
      setEditandoPedido(null);
      alert("Pedido atualizado com sucesso!");
    } catch (err) {
      setError('Erro ao atualizar pedido: ' + (err instanceof Error ? err.message : String(err)));
      alert("Erro ao atualizar pedido. Consulte o console.");
    } finally {
      setProcessando(false);
    }
  };

  // --- Função para lidar com mudanças no formulário de edição ---
  const handleChangeEdicao = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editandoPedido) return;
    const { name, value } = e.target;
    setEditandoPedido(prev => ({ ...prev!, [name]: value }));
  };

  // Componentes de estado
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <FaSpinner size={32} style={styles.spinner} />
        <p style={styles.loadingText}>Carregando pedidos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <FaExclamationTriangle size={48} style={styles.errorIcon} />
        <h3 style={styles.errorTitle}>Erro ao carregar pedidos</h3>
        <p style={styles.errorText}>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={styles.retryButton}
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Renderiza versão mobile ou desktop
  const renderPedidos = () => {
    if (isMobile) {
      return (
        <div style={styles.mobileContainer}>
          {pedidos.map((pedido) => (
            <div key={pedido.id} style={styles.mobileCard}>
              <div style={styles.mobileCardHeader}>
                <span style={styles.pedidoId}>#{pedido.id}</span>
                <div style={styles.mobileActions}>
                  <button
                    onClick={() => handleDownloadPDF(pedido)}
                    style={styles.pdfButton}
                    title={`Baixar PDF da comanda do pedido #${pedido.id}`}
                  >
                    <IconWrapper>
                      <FaFilePdf size={14} />
                    </IconWrapper>
                  </button>
                  
                  <button
                    onClick={() => handleCliqueWhatsApp(pedido.telefone_cliente, pedido.nome_cliente, pedido.id)}
                    style={styles.whatsappButton}
                    title={`Enviar mensagem para ${pedido.nome_cliente}`}
                  >
                    <IconWrapper>
                      <FaWhatsapp size={14} />
                    </IconWrapper>
                  </button>
                  
                  <button
                    onClick={() => handleEditarPedido(pedido)}
                    style={styles.editButton}
                    title={`Editar pedido #${pedido.id}`}
                  >
                    <IconWrapper>
                      <FaEdit size={14} />
                    </IconWrapper>
                  </button>
                  
                  <button
                    onClick={() => handleExcluirPedido(pedido.id)}
                    disabled={processando}
                    style={{
                      ...styles.deleteButton,
                      ...(processando ? styles.disabledButton : {})
                    }}
                    title={`Excluir pedido #${pedido.id}`}
                  >
                    <IconWrapper>
                      {processando ? <FaSpinner size={14} style={styles.spinner} /> : <FaTrash size={14} />}
                    </IconWrapper>
                  </button>
                </div>
              </div>
              
              <div style={styles.mobileCardBody}>
                <div style={styles.mobileRow}>
                  <strong style={styles.mobileLabel}>Cliente:</strong>
                  <span style={styles.mobileValue}>{pedido.nome_cliente}</span>
                </div>
                
                <div style={styles.mobileRow}>
                  <strong style={styles.mobileLabel}>Telefone:</strong>
                  <span style={styles.mobileValue}>{pedido.telefone_cliente}</span>
                </div>
                
                <div style={styles.mobileRow}>
                  <strong style={styles.mobileLabel}>Pizza:</strong>
                  <span style={styles.mobileValue}>{pedido.pizza}</span>
                </div>
                
                <div style={styles.mobileRow}>
                  <strong style={styles.mobileLabel}>Ingredientes:</strong>
                  <span style={styles.mobileValue}>{pedido.ingredientes}</span>
                </div>
                
                <div style={styles.mobileRow}>
                  <strong style={styles.mobileLabel}>Valor:</strong>
                  <span style={styles.mobileValue}>R$ {pedido.valor.toFixed(2)}</span>
                </div>
                
                <div style={styles.mobileRow}>
                  <strong style={styles.mobileLabel}>Data/Hora:</strong>
                  <span style={styles.mobileValue}>
                    {new Date(pedido.data_hora).toLocaleDateString()}<br />
                    <small style={styles.hora}>
                      {new Date(pedido.data_hora).toLocaleTimeString()}
                    </small>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div style={styles.tableContainer}>
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Telefone</th>
                  <th style={styles.th}>Pizza</th>
                  <th style={styles.th}>Valor</th>
                  <th style={styles.th}>Data/Hora</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr key={pedido.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <span style={styles.pedidoId}>#{pedido.id}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.clienteInfo}>
                        <strong style={styles.clienteNome}>{pedido.nome_cliente}</strong>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.telefone}>{pedido.telefone_cliente}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.pizzaInfo}>
                        <strong style={styles.pizzaNome}>{pedido.pizza}</strong>
                        <span style={styles.ingredientes}>{pedido.ingredientes}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.valor}>R$ {pedido.valor.toFixed(2)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.dataHora}>
                        {new Date(pedido.data_hora).toLocaleDateString()}
                        <br />
                        <small style={styles.hora}>
                          {new Date(pedido.data_hora).toLocaleTimeString()}
                        </small>
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          onClick={() => handleImprimirComanda(pedido)}
                          style={styles.printButton}
                          title={`Imprimir comanda do pedido #${pedido.id}`}
                        >
                          <IconWrapper>
                            <FaFilePdf size={14} />
                          </IconWrapper>
                        </button>
                        
                        <button
                          onClick={() => handleCliqueWhatsApp(pedido.telefone_cliente, pedido.nome_cliente, pedido.id)}
                          style={styles.whatsappButton}
                          title={`Enviar mensagem para ${pedido.nome_cliente}`}
                        >
                          <IconWrapper>
                            <FaWhatsapp size={14} />
                          </IconWrapper>
                        </button>
                        
                        <button
                          onClick={() => handleEditarPedido(pedido)}
                          style={styles.editButton}
                          title={`Editar pedido #${pedido.id}`}
                        >
                          <IconWrapper>
                            <FaEdit size={14} />
                          </IconWrapper>
                        </button>
                        
                        <button
                          onClick={() => handleExcluirPedido(pedido.id)}
                          disabled={processando}
                          style={{
                            ...styles.deleteButton,
                            ...(processando ? styles.disabledButton : {})
                          }}
                          title={`Excluir pedido #${pedido.id}`}
                        >
                          <IconWrapper>
                            {processando ? <FaSpinner size={14} style={styles.spinner} /> : <FaTrash size={14} />}
                          </IconWrapper>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <FaPizzaSlice size={32} style={styles.logo} />
            <div>
              <h1 style={styles.title}>Painel Administrativo</h1>
              <p style={styles.subtitle}>Gerenciamento de Pedidos</p>
            </div>
          </div>
          <div style={styles.stats}>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>{pedidos.length}</span>
              <span style={styles.statLabel}>Total de Pedidos</span>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {pedidos.length === 0 ? (
          <div style={styles.emptyState}>
            <FaPizzaSlice size={64} style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>Nenhum pedido encontrado</h3>
            <p style={styles.emptyText}>Não há pedidos registrados no momento.</p>
          </div>
        ) : (
          renderPedidos()
        )}
      </main>

      {/* Modal de Edição */}
      {mostrarModalEdicao && editandoPedido && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Editando Pedido #{editandoPedido.id}</h3>
              <button 
                onClick={() => setMostrarModalEdicao(false)} 
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmitEdicao} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nome Cliente
                    <input
                      type="text"
                      name="nome_cliente"
                      value={editandoPedido.nome_cliente}
                      onChange={handleChangeEdicao}
                      required
                      style={styles.input}
                    />
                  </label>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Telefone Cliente
                    <input
                      type="tel"
                      name="telefone_cliente"
                      value={editandoPedido.telefone_cliente}
                      onChange={handleChangeEdicao}
                      required
                      style={styles.input}
                    />
                  </label>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Pizza
                  <input
                    type="text"
                    name="pizza"
                    value={editandoPedido.pizza}
                    onChange={handleChangeEdicao}
                    required
                    style={styles.input}
                  />
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Ingredientes
                  <textarea
                    name="ingredientes"
                    value={editandoPedido.ingredientes}
                    onChange={handleChangeEdicao}
                    required
                    style={styles.textarea}
                    rows={3}
                  />
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Valor (R$)
                  <input
                    type="number"
                    name="valor"
                    value={editandoPedido.valor}
                    onChange={handleChangeEdicao}
                    required
                    min="0"
                    step="0.01"
                    style={styles.input}
                  />
                </label>
              </div>

              <div style={styles.modalButtons}>
                <button 
                  type="button" 
                  onClick={() => setMostrarModalEdicao(false)} 
                  style={styles.cancelButton}
                  disabled={processando}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={styles.saveButton}
                  disabled={processando}
                >
                  {processando ? (
                    <>
                      <FaSpinner size={14} style={styles.spinner} />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Estilos CSS em JS ---
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  
  header: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '1rem',
  },
  
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  
  logo: {
    color: '#dc2626',
  },
  
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a202c',
    margin: 0,
  },
  
  subtitle: {
    fontSize: '0.875rem',
    color: '#718096',
    margin: 0,
  },
  
  stats: {
    display: 'flex',
    gap: '1rem',
  },
  
  statCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '0.75rem 1rem',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  
  statNumber: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#2d3748',
  },
  
  statLabel: {
    fontSize: '0.75rem',
    color: '#718096',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  
  tableResponsive: {
    overflowX: 'auto' as const,
  },
  
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    minWidth: '800px',
  },
  
  tableHeader: {
    backgroundColor: '#f8fafc',
  },
  
  th: {
    padding: '1rem',
    textAlign: 'left' as const,
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
  },
  
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: '#f8fafc',
    },
  },
  
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#4a5568',
  },
  
  pedidoId: {
    fontWeight: '600',
    color: '#2d3748',
  },
  
  clienteInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  
  clienteNome: {
    color: '#2d3748',
    fontWeight: '600',
  },
  
  telefone: {
    fontFamily: 'monospace',
    color: '#718096',
  },
  
  pizzaInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  
  pizzaNome: {
    color: '#2d3748',
    fontWeight: '600',
    marginBottom: '0.25rem',
  },
  
  ingredientes: {
    fontSize: '0.75rem',
    color: '#718096',
    lineHeight: '1.2',
  },
  
  valor: {
    fontWeight: '600',
    color: '#059669',
  },
  
  dataHora: {
    fontSize: '0.75rem',
    color: '#718096',
  },
  
  hora: {
    color: '#a0aec0',
  },
  
  actions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-start',
  },
  
  // Estilos para versão mobile
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  
  mobileCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    padding: '1rem',
  },
  
  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '0.5rem',
  },
  
  mobileActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  
  mobileCardBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  
  mobileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    padding: '0.25rem 0',
  },
  
  mobileLabel: {
    fontWeight: '600',
    color: '#718096',
    fontSize: '0.875rem',
    minWidth: '100px',
    marginRight: '0.5rem',
  },
  
  mobileValue: {
    flex: 1,
    textAlign: 'right' as const,
    fontSize: '0.875rem',
    color: '#4a5568',
  },
  
  printButton: {
    padding: '0.5rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#4b5563',
      transform: 'translateY(-1px)',
    },
  },
  
  pdfButton: {
    padding: '0.5rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#b91c1c',
      transform: 'translateY(-1px)',
    },
  },
  
  whatsappButton: {
    padding: '0.5rem',
    backgroundColor: '#25D366',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#128C7E',
      transform: 'translateY(-1px)',
    },
  },
  
  editButton: {
    padding: '0.5rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#d97706',
      transform: 'translateY(-1px)',
    },
  },
  
  deleteButton: {
    padding: '0.5rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#b91c1c',
      transform: 'translateY(-1px)',
    },
  },
  
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
    ':hover': {
      transform: 'none',
    },
  },
  
  // Modal Styles
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
  },
  
  modalTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1a202c',
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#718096',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    ':hover': {
      backgroundColor: '#f7fafc',
    },
  },
  
  form: {
    padding: '1.5rem',
  },
  
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    '@media (max-width: 480px)': {
      gridTemplateColumns: '1fr',
    },
  },
  
  formGroup: {
    marginBottom: '1rem',
  },
  
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
    ':focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    },
  },
  
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    resize: 'vertical' as const,
    minHeight: '80px',
    transition: 'all 0.2s ease',
    ':focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    },
  },
  
  modalButtons: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
    '@media (max-width: 480px)': {
      justifyContent: 'center',
    },
  },
  
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#f9fafb',
    },
  },
  
  saveButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#1d4ed8',
    },
  },
  
  // Loading & Error States
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    color: '#6b7280',
  },
  
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  
  loadingText: {
    marginTop: '1rem',
    fontSize: '1rem',
  },
  
  errorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    padding: '2rem',
    textAlign: 'center' as const,
  },
  
  errorIcon: {
    color: '#dc2626',
    marginBottom: '1rem',
  },
  
  errorTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: '0.5rem',
  },
  
  errorText: {
    color: '#6b7280',
    marginBottom: '1.5rem',
  },
  
  retryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    ':hover': {
      backgroundColor: '#b91c1c',
    },
  },
  
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center' as const,
    color: '#6b7280',
  },
  
  emptyIcon: {
    color: '#d1d5db',
    marginBottom: '1rem',
  },
  
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#374151',
  },
  
  emptyText: {
    fontSize: '0.875rem',
  },
};

// Adicionar keyframes para a animação do spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default AdminPanel;