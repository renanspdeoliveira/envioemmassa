import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime

import requests

# ==========================
# CONFIGURACOES DO ZABBIX
# ==========================

ZABBIX_URL = "https://zabbix.futuranet.net.br/api_jsonrpc.php"
ZABBIX_USER = "api-cliente"
ZABBIX_PASSWORD = "kbjh132@98dkKS!"

ITEM_KEY_SEARCH = "disconnectionCauseTime"

CAUSAS = {
    "400": "Link Loss",
    "402": "Dying Gasp",
    "403": "ONU Offline",
}


# ==========================
# FUNCOES AUXILIARES
# ==========================

def extrair_mac_ou_sn(nome_item):
    if not nome_item:
        return "Nao identificado"

    if " - " in nome_item:
        return nome_item.split(" - ")[-1].strip().upper()

    match = re.search(r"([A-Z0-9]{8,20})$", nome_item.strip().upper())
    if match:
        return match.group(1)

    return "Nao identificado"


def extrair_onu_pon(nome_item):
    if not nome_item:
        return "Nao identificado"

    match = re.search(r"ONU\s+([0-9]+/[0-9]+/[0-9]+)", nome_item)
    if match:
        return match.group(1)

    return "Nao identificado"


def extrair_horario_queda(nome_item):
    if not nome_item:
        return "Nao identificado"

    match = re.search(
        r"\[([0-9]{4}-[0-9]{2}-[0-9]{2}) - ([0-9]{2}:[0-9]{2}:[0-9]{2})\]",
        nome_item
    )

    if match:
        data = match.group(1)
        hora = match.group(2)

        if data == "0000-00-00":
            return "Nao identificado"

        return f"{data} {hora}"

    return "Nao identificado"


def converter_timestamp(timestamp):
    try:
        if not timestamp:
            return "Nao identificado"

        timestamp = int(timestamp)
        if timestamp <= 0:
            return "Nao identificado"

        return datetime.fromtimestamp(timestamp).strftime("%d/%m/%Y %H:%M:%S")
    except Exception:
        return "Nao identificado"


def gerar_resumo(onus):
    counts = Counter(onu["codigo"] for onu in onus)
    return {
        "total_itens_zabbix": len(onus),
        "total_monitorados": len(onus),
        "ignorados": 0,
        "link_loss": counts.get("400", 0),
        "dying_gasp": counts.get("402", 0),
        "onu_offline": counts.get("403", 0),
    }


def gerar_payload(onus):
    resumo = gerar_resumo(onus)
    causas = {
        codigo: {
            "descricao": descricao,
            "quantidade": resumo["link_loss"] if codigo == "400"
            else resumo["dying_gasp"] if codigo == "402"
            else resumo["onu_offline"],
        }
        for codigo, descricao in CAUSAS.items()
    }

    return {
        "ok": True,
        "gerado_em": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "ultima_atualizacao": max(
            (onu["ultima_atualizacao"] for onu in onus if onu["ultima_atualizacao"] != "Nao identificado"),
            default=None,
        ),
        "resumo": resumo,
        "causas": causas,
        "detalhes": [
            {
                "codigo": onu["codigo"],
                "causa": onu["causa"],
                "serial": onu["mac_ou_sn"],
                "mac_ou_sn": onu["mac_ou_sn"],
                "central": onu["central"],
                "posicao": onu["pon_onu"],
                "pon_onu": onu["pon_onu"],
                "data_desconexao": onu["horario_queda"],
                "horario_queda": onu["horario_queda"],
                "ultima_atualizacao": onu["ultima_atualizacao"],
                "item": onu["item"],
            }
            for onu in onus
        ],
    }


# ==========================
# API ZABBIX
# ==========================

def zabbix_request(method, params=None, auth=None):
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params or {},
        "id": 1,
    }

    if auth:
        payload["auth"] = auth

    response = requests.post(
        ZABBIX_URL,
        json=payload,
        timeout=30,
        headers={"Content-Type": "application/json"},
    )
    response.raise_for_status()

    data = response.json()
    if "error" in data:
        raise Exception(data["error"])

    return data["result"]


def zabbix_login():
    try:
        return zabbix_request("user.login", {
            "user": ZABBIX_USER,
            "password": ZABBIX_PASSWORD,
        })
    except Exception:
        return zabbix_request("user.login", {
            "username": ZABBIX_USER,
            "password": ZABBIX_PASSWORD,
        })


def buscar_itens_disconnection(auth):
    return zabbix_request("item.get", {
        "output": [
            "itemid",
            "name",
            "key_",
            "lastvalue",
            "lastclock",
        ],
        "selectHosts": [
            "hostid",
            "host",
            "name",
        ],
        "search": {
            "key_": ITEM_KEY_SEARCH,
        },
        "sortfield": "name",
    }, auth)


# ==========================
# LISTAR ONUS
# ==========================

def listar_onus():
    auth = zabbix_login()
    itens = buscar_itens_disconnection(auth)
    onus = []

    for item in itens:
        codigo = str(item.get("lastvalue", "")).strip()
        if codigo not in CAUSAS:
            continue

        nome_item = item.get("name", "")
        host_info = item.get("hosts", [{}])[0]
        central = host_info.get("name") or host_info.get("host") or "Sem host"

        onus.append({
            "codigo": codigo,
            "causa": CAUSAS.get(codigo),
            "mac_ou_sn": extrair_mac_ou_sn(nome_item),
            "central": central,
            "pon_onu": extrair_onu_pon(nome_item),
            "horario_queda": extrair_horario_queda(nome_item),
            "ultima_atualizacao": converter_timestamp(item.get("lastclock")),
            "item": nome_item,
        })

    return onus


# ==========================
# IMPRIMIR NO TERMINAL
# ==========================

def imprimir_resumo(onus):
    total_400 = len([onu for onu in onus if onu["codigo"] == "400"])
    total_402 = len([onu for onu in onus if onu["codigo"] == "402"])
    total_403 = len([onu for onu in onus if onu["codigo"] == "403"])

    print("=" * 100)
    print("RESUMO DAS ONUs")
    print("=" * 100)
    print(f"400 - Link Loss: {total_400}")
    print(f"402 - Dying Gasp: {total_402}")
    print(f"403 - ONU Offline: {total_403}")
    print(f"Total listado: {len(onus)}")
    print("=" * 100)
    print()


def imprimir_tabela(onus):
    if not onus:
        print("Nenhuma ONU encontrada com codigo 400, 402 ou 403.")
        return

    print(
        f"{'COD':<5} "
        f"{'CAUSA':<20} "
        f"{'MAC/SN':<18} "
        f"{'CENTRAL':<30} "
        f"{'PON/ONU':<12} "
        f"{'HORARIO QUEDA':<20}"
    )
    print("-" * 120)

    for onu in onus:
        print(
            f"{onu['codigo']:<5} "
            f"{onu['causa']:<20} "
            f"{onu['mac_ou_sn']:<18} "
            f"{onu['central']:<30} "
            f"{onu['pon_onu']:<12} "
            f"{onu['horario_queda']:<20}"
        )


def imprimir_detalhado_por_codigo(onus):
    for codigo in ["400", "402", "403"]:
        lista = [onu for onu in onus if onu["codigo"] == codigo]

        print()
        print("=" * 100)
        print(f"{codigo} - {CAUSAS[codigo]} | Quantidade: {len(lista)}")
        print("=" * 100)

        if not lista:
            print("Nenhuma ONU encontrada.")
            continue

        for onu in lista:
            print(f"Codigo: {onu['codigo']}")
            print(f"Causa: {onu['causa']}")
            print(f"MAC/SN: {onu['mac_ou_sn']}")
            print(f"Central: {onu['central']}")
            print(f"PON/ONU: {onu['pon_onu']}")
            print(f"Horario que caiu: {onu['horario_queda']}")
            print(f"Ultima atualizacao Zabbix: {onu['ultima_atualizacao']}")
            print(f"Item: {onu['item']}")
            print("-" * 100)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="Retorna a saida em JSON")
    args = parser.parse_args()

    try:
        onus = listar_onus()

        if args.json:
            print(json.dumps(gerar_payload(onus), ensure_ascii=False))
            return 0

        print("Conectando ao Zabbix...")
        print("Login realizado com sucesso.")
        print("Buscando itens das ONUs...\n")
        imprimir_resumo(onus)
        imprimir_tabela(onus)
        imprimir_detalhado_por_codigo(onus)
        return 0
    except Exception as e:
        if args.json:
            print(json.dumps({"ok": False, "erro": str(e)}, ensure_ascii=False))
            return 1

        print("Erro ao executar script:")
        print(e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
