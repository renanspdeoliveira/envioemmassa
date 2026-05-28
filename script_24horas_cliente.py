import requests
from requests.auth import HTTPBasicAuth
from datetime import datetime, timedelta
from collections import Counter

IXC_URL = "https://sistema.futuranet.net.br"
IXC_TOKEN = "103"
IXC_API_KEY = "9a4ee574f3aa86a71e8e2142c2fb7dbd7cfb26e3436935a2d6aee20fbf9f4200"

agora = datetime.now()
limite_24h = agora - timedelta(hours=24)

inicio_semana = agora - timedelta(days=agora.weekday())
inicio_semana = inicio_semana.replace(hour=0, minute=0, second=0, microsecond=0)

inicio_mes = agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

url = f"{IXC_URL}/webservice/v1/radusuarios"

headers = {
    "ixcsoft": "listar",
    "Content-Type": "application/json"
}

payload = {
    "qtype": "radusuarios.online",
    "query": "N",
    "oper": "=",
    "page": "1",
    "rp": "5000",
    "sortname": "radusuarios.ultima_conexao_final",
    "sortorder": "desc"
}

try:
    response = requests.get(
        url,
        headers=headers,
        json=payload,
        auth=HTTPBasicAuth(IXC_TOKEN, IXC_API_KEY),
        timeout=60
    )

    response.raise_for_status()
    data = response.json()

    registros = data.get("registros", [])

    print("\n" + "=" * 100)
    print(f"TOTAL GERAL OFFLINE AGORA: {len(registros)}")
    
    print(f"CONTAGEM POR ATIVO: {Counter(c.get('ativo') for c in registros)}")
    print("=" * 100)

    offline_semana = []
    offline_mes = []

    for cliente in registros:
        ultima = cliente.get("ultima_conexao_final")

        if not ultima or ultima == "0000-00-00 00:00:00":
            continue

        try:
            ultima_desconexao = datetime.strptime(ultima, "%Y-%m-%d %H:%M:%S")

            if ultima_desconexao > limite_24h:
                continue

            horas_off = round((agora - ultima_desconexao).total_seconds() / 3600, 1)

            cliente_info = {
                "login": cliente.get("login"),
                "cliente": cliente.get("id_cliente"),
                "contrato": cliente.get("id_contrato"),
                "ativo": cliente.get("ativo"),
                "online": cliente.get("online"),
                "ultima_desconexao": ultima,
                "horas_offline": horas_off
            }

            if ultima_desconexao >= inicio_semana:
                offline_semana.append(cliente_info)

            if ultima_desconexao >= inicio_mes:
                offline_mes.append(cliente_info)

        except Exception:
            continue

    print("\n" + "=" * 140)
    print(f"CLIENTES OFFLINE +24H NA SEMANA ATUAL, ATIVO OU NÃO: {len(offline_semana)}")
    print("=" * 140)

    for c in offline_semana:
        print(
            f"LOGIN: {c['login']} | "
            f"CLIENTE: {c['cliente']} | "
            f"CONTRATO: {c['contrato']} | "
            f"ATIVO: {c['ativo']} | "
            f"ONLINE: {c['online']} | "
            f"HORAS OFFLINE: {c['horas_offline']}h | "
            f"ULTIMA DESCONEXAO: {c['ultima_desconexao']}"
        )

    print("\n" + "=" * 140)
    print(f"CLIENTES OFFLINE +24H NO MÊS ATUAL, ATIVO OU NÃO: {len(offline_mes)}")
    print("=" * 140)

    for c in offline_mes:
        print(
            f"LOGIN: {c['login']} | "
            f"CLIENTE: {c['cliente']} | "
            f"CONTRATO: {c['contrato']} | "
            f"ATIVO: {c['ativo']} | "
            f"ONLINE: {c['online']} | "
            f"HORAS OFFLINE: {c['horas_offline']}h | "
            f"ULTIMA DESCONEXAO: {c['ultima_desconexao']}"
        )

except requests.exceptions.HTTPError as e:
    print(f"\nErro HTTP: {e}")
    try:
        print(response.json())
    except Exception:
        print(response.text)

except Exception as e:
    print(f"\nErro geral: {e}")