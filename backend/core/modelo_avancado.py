# backend/core/modelo_avancado.py
import joblib
import pandas as pd
import numpy as np
import ast
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from .preparar_dados import carregar_dados_do_banco, preparar_features

# --- NOVO: Função para carregar CARDAPIO e EXTRAS de cardapio.py ---
def carregar_cardapio_do_arquivo():
    """Carrega as variáveis CARDAPIO e EXTRAS do arquivo cardapio.py."""
    dir_core = os.path.dirname(os.path.abspath(__file__))
    caminho_cardapio = os.path.join(dir_core, 'cardapio.py')
    print(f"Tentando ler cardapio.py de: {caminho_cardapio}")

    with open(caminho_cardapio, 'r', encoding='utf-8') as f:
        conteudo = f.read()

    tree = ast.parse(conteudo)
    variaveis = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    try:
                        variaveis[target.id] = eval(compile(ast.Expression(node.value), '<string>', 'eval'))
                    except:
                        pass  # ignora variáveis que não podem ser avaliadas

    cardapio = variaveis.get('CARDAPIO', {})
    extras = variaveis.get('EXTRAS', {})
    return cardapio, extras
# ---

CARDAPIO, EXTRAS = carregar_cardapio_do_arquivo()


class ModeloRecomendacaoAvancado:
    def __init__(self):
        self.modelo = RandomForestClassifier(n_estimators=100, random_state=42)
        self.vectorizer = None
        self.le_cliente = None
        self.le_pizza = None
        self.scaler = None
        self.colunas_features = None

    def carregar_e_treinar(self):
        """Carrega dados, prepara features e treina o modelo."""
        print("Carregando dados do banco...")
        df = carregar_dados_do_banco()
        if df.empty:
            print("Nenhum dado encontrado para treinar o modelo.")
            return

        # ✅ Verificação crítica: evitar treino com poucos dados
        if len(df) < 15:
            print(f"⚠️ Dados insuficientes para treinar modelo ({len(df)} registros). Pulando treinamento.")
            return

        print("Preparando features...")
        X, y, self.vectorizer, self.le_cliente, self.le_pizza, self.scaler = preparar_features(df, CARDAPIO)

        self.colunas_features = X.columns.tolist()

        print(f"Dividindo dados (X shape: {X.shape}, y shape: {y.shape})...")
        try:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        except ValueError as e:
            print(f"⚠️ Não foi possível fazer stratify por falta de amostras por classe: {e}")
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        print("Treinando modelo...")
        self.modelo.fit(X_train, y_train)

        print("Avaliando modelo...")
        y_pred = self.modelo.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        print(f"Acurácia: {acc:.4f}")

        # ✅ CORREÇÃO: usa `labels` e `zero_division` para evitar o erro
        try:
            print(classification_report(
                y_test,
                y_pred,
                labels=self.le_pizza.transform(self.le_pizza.classes_),
                target_names=self.le_pizza.classes_,
                zero_division=0
            ))
        except Exception as e:
            print(f"⚠️ Não foi possível gerar o classification_report: {e}")

        print("Salvando modelo treinado...")
        self.salvar_modelo()

    def salvar_modelo(self, caminho='modelo_recomendacao.pkl'):
        """Salva o modelo e os encoders."""
        modelo_salvo = {
            'modelo': self.modelo,
            'vectorizer': self.vectorizer,
            'le_cliente': self.le_cliente,
            'le_pizza': self.le_pizza,
            'scaler': self.scaler,
            'colunas_features': self.colunas_features
        }
        joblib.dump(modelo_salvo, caminho)
        print(f"Modelo salvo em {caminho}")

    def carregar_modelo(self, caminho='modelo_recomendacao.pkl'):
        """Carrega o modelo e os encoders."""
        try:
            modelo_salvo = joblib.load(caminho)
            self.modelo = modelo_salvo['modelo']
            self.vectorizer = modelo_salvo['vectorizer']
            self.le_cliente = modelo_salvo['le_cliente']
            self.le_pizza = modelo_salvo['le_pizza']
            self.scaler = modelo_salvo['scaler']
            self.colunas_features = modelo_salvo['colunas_features']
            print(f"Modelo carregado de {caminho}")
            return True
        except FileNotFoundError:
            print(f"Modelo {caminho} não encontrado. Treine primeiro.")
            return False

    def _processar_registro_para_pizza(self, cliente_id, horario, dia_semana, mes, esta_frio, pizza_nome, preco_pizza, ingredientes_pizza):
        """Processa um único registro (cliente, contexto, pizza) para gerar features."""
        try:
            tfidf_pizza = self.vectorizer.transform([ingredientes_pizza])
            tfidf_df = pd.DataFrame(tfidf_pizza.toarray(), columns=[f'ingrediente_{i}' for i in range(tfidf_pizza.shape[1])])

            cliente_encoded = self.le_cliente.transform([cliente_id])[0] if cliente_id in self.le_cliente.classes_ else -1

            features_numericas = pd.DataFrame({
                'horario_pedido': [horario],
                'dia_semana': [dia_semana],
                'mes': [mes],
                'preco_pizza': [preco_pizza],
                'eh_vegetariana': [1 if any(ing in ingredientes_pizza.lower() for ing in ['tomate', 'cebola', 'pimentão', 'ervilha', 'milho', 'berinjela', 'espinafre', 'brocolis', 'palmito']) else 0],
                'eh_picante': [1 if any(ing in ingredientes_pizza.lower() for ing in ['pepperoni', 'calabresa', 'pimenta', 'jalapeño', 'catupiry']) else 0],
                'eh_doce': [1 if any(ing in pizza_nome.lower() for ing in ['chocolate', 'doce de leite', 'banana']) else 0],
                'esta_frio': [1 if esta_frio else 0]
            })

            registro_df = pd.concat([pd.DataFrame({'cliente_id_encoded': [cliente_encoded]}), features_numericas, tfidf_df], axis=1)
            registro_df = registro_df.reindex(columns=self.colunas_features, fill_value=0)
            return registro_df

        except Exception as e:
            print(f"Erro ao processar registro para pizza {pizza_nome}: {e}")
            return None

    def prever_pizza(self, cliente_id, horario, dia_semana, mes, esta_frio):
        """Faz uma previsão para um cliente específico."""
        if not hasattr(self.modelo, 'estimators_'):
            print("Modelo não treinado ou carregado.")
            return None, "Modelo não disponível"

        try:
            cardapio_info = CARDAPIO
            probabilidades = {}
            for pizza_nome in cardapio_info.keys():
                ingredientes = cardapio_info[pizza_nome]['ingredientes']
                preco = cardapio_info[pizza_nome]['preco']

                X_novo_pizza = self._processar_registro_para_pizza(
                    cliente_id=cliente_id,
                    horario=horario,
                    dia_semana=dia_semana,
                    mes=mes,
                    esta_frio=esta_frio,
                    pizza_nome=pizza_nome,
                    preco_pizza=preco,
                    ingredientes_pizza=ingredientes
                )

                if X_novo_pizza is not None:
                    probas = self.modelo.predict_proba(X_novo_pizza)[0]
                    if pizza_nome in self.le_pizza.classes_:
                        idx_pizza_encoded = self.le_pizza.transform([pizza_nome])[0]
                        prob_pizza = probas[idx_pizza_encoded]
                    else:
                        prob_pizza = 0.0
                    probabilidades[pizza_nome] = prob_pizza
                else:
                    probabilidades[pizza_nome] = 0.0

            if not probabilidades:
                return None, "Nenhuma probabilidade calculada."

            pizza_recomendada = max(probabilidades, key=probabilidades.get)
            motivo = f"Baseado em um modelo avançado de IA (RF). Probabilidade: {probabilidades[pizza_recomendada]:.4f}"
            return pizza_recomendada, motivo

        except Exception as e:
            print(f"Erro na previsão: {e}")
            import traceback
            traceback.print_exc()
            return None, f"Erro na previsão: {str(e)}"


# --- Inicialização do modelo ---
modelo_ia = ModeloRecomendacaoAvancado()

def inicializar_modelo_ia(app):
    """Função para ser chamada no app.py para carregar ou treinar o modelo."""
    if modelo_ia.carregar_modelo():
        print("Modelo avançado carregado com sucesso.")
    else:
        print("Modelo avançado não encontrado. Treinando um novo modelo...")
        modelo_ia.carregar_e_treinar()
        print("Novo modelo treinado e salvo.")