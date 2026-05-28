import requests
from requests.auth import HTTPBasicAuth

# ==========================================
# CONFIGURAÇÃO
# ==========================================

IXC_URL = "https://sistema.futuranet.net.br/webservice/v1/cliente"

USUARIO = "103"
SENHA = "9a4ee574f3aa86a71e8e2142c2fb7dbd7cfb26e3436935a2d6aee20fbf9f4200"

# ==========================================
# PAYLOAD
# ==========================================

payload = {
    "qtype": "cliente.id",
    "query": "0",
    "oper": ">=",
    "page": "1",
    "rp": "50",
    "sortname": "cliente.id",
    "sortorder": "asc"
}

headers = {
    "Content-Type": "application/json",
    "ixcsoft": "listar"
}

# ==========================================
# REQUISIÇÃO
# ==========================================

try:
    response = requests.get(
        IXC_URL,
        json=payload,
        headers=headers,
        auth=HTTPBasicAuth(USUARIO, SENHA),
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    registros = data.get("registros", [])

    print("\nCLIENTES ENCONTRADOS:\n")

    for cliente in registros:
        cliente_id = cliente.get("id")
        nome = cliente.get("razao")

        print(f"ID: {cliente_id} | Nome: {nome}")

except requests.exceptions.HTTPError as e:
    print(f"Erro HTTP: {e}")
    print(response.text)

except requests.exceptions.Timeout:
    print("Timeout na conexão com IXC")

except Exception as e:
    print(f"Erro geral: {e}")