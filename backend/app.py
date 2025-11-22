from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from core.pizza_recommender import init_db, bp as pizza_bp, bp_pedidos # Importa função de inicialização do DB e blueprints
from datetime import datetime # Import para obter data/hora atuais

# --- IMPORTAÇÃO DO MODELO DE IA ---
from core.modelo_avancado import inicializar_modelo_ia, modelo_ia # Importa a função e a instância do modelo
from core.clima import is_frio # Importa a função is_frio para usar na nova rota
from core.cardapio import CARDAPIO # Importa o cardápio do módulo core
# ---

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app) # Permite requisições de qualquer origem (ajuste em produção)

    # Inicializa o banco de dados
    init_db(app)

    # --- INICIALIZA O MODELO DE IA ---
    inicializar_modelo_ia(app)
    # ---

    # --- NOVA ROTA PARA O MODELO AVANÇADO ---
    @app.route('/api/recomendar_avancado', methods=['GET'])
    def recomendar_avancado():
        cliente_id = request.args.get('cliente_id', type=int)
        if not cliente_id:
            return jsonify({"erro": "cliente_id é obrigatório"}), 400

        # Obter contexto atual
        agora = datetime.now()
        horario = agora.hour
        dia_semana = agora.weekday()
        mes = agora.month
        esta_frio_valor = is_frio() # Chama a função real para obter o booleano

        # Fazer previsão com o modelo avançado
        pizza, motivo = modelo_ia.prever_pizza(cliente_id, horario, dia_semana, mes, esta_frio_valor)

        if pizza:
            ingredientes = CARDAPIO.get(pizza, CARDAPIO["Margherita"])["ingredientes"]
            return jsonify({
                "pizza_recomendada": pizza,
                "ingredientes": [ing.strip() for ing in ingredientes.split(",")],
                "motivo": motivo
            })
        else:
            # Fallback para o modelo antigo se o novo falhar
            # Chama a lógica antiga de `recomendar()` ou uma versão adaptada
            # return recomendar() # ou uma lógica de fallback
            return jsonify({"erro": "Falha na recomendação do modelo avançado", "detalhe": motivo}), 500
    # ---

    # Registra rotas
    app.register_blueprint(pizza_bp, url_prefix='/api')
    app.register_blueprint(bp_pedidos, url_prefix='/api') # Registra o blueprint de pedidos

    return app
app = create_app()

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=False) # Desative o debug em produção