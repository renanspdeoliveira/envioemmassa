import requests
import time

# ==========================================
# CONFIGURAÇÕES
# ==========================================

BASE_URL = "https://atendimento.futuranet.net.br"

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyNGM1NWY0MDliMTg0MzI1YmQxMDc4ZCIsImlhdCI6MTY5NTEzMzUzMn0.glqRLKHU8a_dj2RT8Cinrx1ehJQnME80kxQrN70PVZg"

CANAL_ID = "6764696d31e35c7efbe79e88"

TEMPLATE_ID = "6765a7c94c09c0c26d9de7d1"

ETIQUETA_ID = "64f0eb354ee56f95563bcc8d"

NUMERO = "5516994342668"

NOME = "RENAN SCUDERO PALADINI DE OLIVEIRA"

# ==========================================
# HEADERS
# ==========================================

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# ==========================================
# 1. ENVIA TEMPLATE
# ==========================================

payload_template = {
    "contato": {
        "canalCliente": NUMERO
    },
    "template": {
        "_id": TEMPLATE_ID,
        "variaveis": [
            NOME
        ]
    },
    "canal": CANAL_ID
}

print("🚀 Enviando template...")

response = requests.post(
    f"{BASE_URL}/api/v1/template/send",
    json=payload_template,
    headers=headers,
    timeout=30
)

print("STATUS TEMPLATE:", response.status_code)
print(response.text)

if response.status_code != 200:
    raise Exception("Erro ao enviar template")

# ==========================================
# AGUARDA OPA CRIAR ATENDIMENTO
# ==========================================

time.sleep(3)

# ==========================================
# 2. BUSCA ATENDIMENTO
# ==========================================

payload_busca = {
    "filter": {
        "canal_cliente": f"{NUMERO}@c.us",
        "canal": "whatsapp"
    },
    "options": {
        "limit": 1
    }
}

print("\n🔎 Buscando atendimento...")

response = requests.post(
    f"{BASE_URL}/api/v1/atendimento",
    json=payload_busca,
    headers=headers,
    timeout=30
)

print("STATUS BUSCA:", response.status_code)
print(response.text)

data = response.json()

if not data.get("data"):
    raise Exception("Atendimento não encontrado")

atendimento = data["data"][0]

ATENDIMENTO_ID = atendimento["_id"]

print(f"\n✅ Atendimento encontrado: {ATENDIMENTO_ID}")

# ==========================================
# 3. ADICIONA ETIQUETA
# ==========================================

payload_etiqueta = {
    "etiqueta": ETIQUETA_ID
}

print("\n🏷️ Adicionando etiqueta...")

response = requests.post(
    f"{BASE_URL}/api/v1/atendimento/{ATENDIMENTO_ID}/etiqueta",
    json=payload_etiqueta,
    headers=headers,
    timeout=30
)

print("STATUS ETIQUETA:", response.status_code)
print(response.text)

# ==========================================
# 4. CRIA OBSERVAÇÃO
# ==========================================

payload_observacao = {
    "texto": "Template enviado automaticamente via automação Python."
}

print("\n📝 Criando observação...")

response = requests.post(
    f"{BASE_URL}/api/v1/atendimento/{ATENDIMENTO_ID}/observacao",
    json=payload_observacao,
    headers=headers,
    timeout=30
)

print("STATUS OBSERVAÇÃO:", response.status_code)
print(response.text)

print("\n🎉 Fluxo finalizado com sucesso!")