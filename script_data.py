import argparse
import json
import os
import re
import time
from datetime import datetime

import requests
from requests.auth import HTTPBasicAuth


IXC_URL = "https://sistema.futuranet.net.br"
IXC_USER = "103"
IXC_PASS = "9a4ee574f3aa86a71e8e2142c2fb7dbd7cfb26e3436935a2d6aee20fbf9f4200"
ENDPOINT = "/webservice/v1/radpop_radio_cliente_fibra"
DATA_FILE = os.path.join("server", "data.json")
SYNC_URL = "http://localhost:3001/api/sync/onus"
DEFAULT_INTERVAL_SECONDS = 300


def parse_args():
    parser = argparse.ArgumentParser(
        description="Atualiza server/data.json a partir da IXC e mantem a base em tempo real."
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=DEFAULT_INTERVAL_SECONDS,
        help="Intervalo entre atualizacoes em segundos. Padrao: 300",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Executa uma unica atualizacao e encerra.",
    )
    return parser.parse_args()


def read_json(path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception:
        return fallback


def write_json(path, payload):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def norm_text(value):
    return str(value or "").strip()


def norm_upper(value):
    return norm_text(value).upper()


def parse_float(value):
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    raw = str(value).strip().replace(",", ".")
    match = re.search(r"-?\d+(?:\.\d+)?", raw)
    if not match:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def parse_int(value):
    if value in (None, ""):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    match = re.search(r"\d+", str(value))
    return int(match.group(0)) if match else None


def normalize_status(value):
    status = norm_text(value).lower()
    if not status:
      return "Sem status"
    if "desaut" in status or "pedindo" in status:
        return "Pedindo autenticacao"
    if "autor" in status:
        return "Autorizada"
    if "off" in status:
        return "Offline"
    return norm_text(value)


def normalize_signal(value):
    signal = parse_float(value)
    if signal is None:
        return 0
    return round(signal, 2)


def split_pon_parts(item, previous):
    candidates = [
        item.get("porta_pon"),
        item.get("pon"),
        item.get("slot_pon"),
        item.get("interface_pon"),
        previous.get("PON ID"),
    ]

    for candidate in candidates:
        text = norm_text(candidate)
        if not text:
            continue

        numbers = [int(n) for n in re.findall(r"\d+", text)]
        if len(numbers) >= 4:
            return numbers[-2], numbers[-1], f"1-1-{numbers[-2]}-{numbers[-1]}"
        if len(numbers) >= 2:
            return numbers[-2], numbers[-1], None

    return previous.get("Slot"), previous.get("PON"), previous.get("PON ID")


def build_lookup(rows):
    lookup = {}
    for row in rows:
        keys = {
            norm_upper(row.get("MAC/Serial")),
            norm_upper(row.get("Login")),
            str(row.get("ID ONU Fibra") or "").strip(),
        }
        for key in keys:
            if key:
                lookup[key] = row
    return lookup


def merge_onu(item, previous):
    slot, pon, pon_id = split_pon_parts(item, previous)
    olt = norm_text(item.get("olt")) or previous.get("OLT") or "OLT"
    status = normalize_status(item.get("status") or previous.get("Status ONU"))
    rx = normalize_signal(item.get("sinal"))
    tx = previous.get("Sinal TX", 0) or 0
    onu_number = parse_int(item.get("onu")) or previous.get("ONU Nº")

    if not pon_id and slot is not None and pon is not None:
        pon_id = f"1-1-{slot}-{pon}"

    pon_group = previous.get("PON Grupo")
    if slot is not None and pon is not None:
        pon_group = f"{olt} | Slot {slot} | PON {pon}"

    updated_at = (
        norm_text(item.get("ultima_conexao"))
        or norm_text(item.get("ultima_atualizacao"))
        or previous.get("Última atualização")
        or datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    )

    client_name = (
        norm_text(item.get("cliente"))
        or previous.get("Nome Cliente")
        or norm_text(item.get("login"))
        or norm_text(item.get("mac"))
    )

    return {
        "OLT": olt,
        "Slot": slot,
        "PON": pon,
        "PON ID": pon_id,
        "PON Grupo": pon_group,
        "ID ONU Fibra": parse_int(item.get("id")) or previous.get("ID ONU Fibra"),
        "Nome Cliente": client_name,
        "Login": norm_text(item.get("login")) or previous.get("Login"),
        "MAC/Serial": norm_text(item.get("mac")) or previous.get("MAC/Serial"),
        "Status ONU": status,
        "Sinal RX": rx,
        "Sinal TX": tx,
        "Última atualização": updated_at,
        "ONU Nº": onu_number,
        "ONU Tipo": previous.get("ONU Tipo") or item.get("modelo"),
        "Caixa FTTH/CTO": previous.get("Caixa FTTH/CTO"),
        "Porta FTTH": previous.get("Porta FTTH"),
        "POP": previous.get("POP") or "TAQUARITINGA",
        "VLAN": previous.get("VLAN"),
        "Causa última queda": previous.get("Causa última queda"),
        "Potência": previous.get("Potência") or "Indefinido",
        "IP": norm_text(item.get("ip")) or previous.get("IP"),
    }


def build_base_onus(records, previous_rows):
    previous_lookup = build_lookup(previous_rows)
    fresh_rows = []

    for item in records:
        keys = [
            norm_upper(item.get("mac")),
            norm_upper(item.get("login")),
            str(item.get("id") or "").strip(),
        ]
        previous = {}
        for key in keys:
            if key and key in previous_lookup:
                previous = previous_lookup[key]
                break

        merged = merge_onu(item, previous)
        if norm_text(merged.get("MAC/Serial")):
            fresh_rows.append(merged)

    fresh_rows.sort(
        key=lambda row: (
            norm_text(row.get("OLT")),
            row.get("Slot") or 0,
            row.get("PON") or 0,
            norm_text(row.get("Nome Cliente")),
        )
    )
    return fresh_rows


def build_resumo_pon(base_onus):
    grouped = {}

    for row in base_onus:
        pon_id = row.get("PON ID")
        if not pon_id:
            continue

        summary = grouped.setdefault(
            pon_id,
            {
                "OLT": row.get("OLT"),
                "Slot": row.get("Slot"),
                "PON": row.get("PON"),
                "PON ID": pon_id,
                "Total ONUs": 0,
                "Autorizadas": 0,
                "Desautorizadas": 0,
                "Sem status": 0,
                "Sinal RX médio": None,
                "Pior RX": None,
                "Sem leitura RX/zero": 0,
            },
        )

        summary["Total ONUs"] += 1
        status = normalize_status(row.get("Status ONU"))

        if status == "Autorizada":
            summary["Autorizadas"] += 1
        elif status == "Pedindo autenticacao":
            summary["Desautorizadas"] += 1
        elif status == "Sem status":
            summary["Sem status"] += 1

        rx = parse_float(row.get("Sinal RX"))
        if rx in (None, 0):
            summary["Sem leitura RX/zero"] += 1
            continue

        summary.setdefault("_rx_vals", []).append(rx)
        summary["Pior RX"] = rx if summary["Pior RX"] is None else min(summary["Pior RX"], rx)

    output = []
    for summary in grouped.values():
        rx_vals = summary.pop("_rx_vals", [])
        summary["Sinal RX médio"] = round(sum(rx_vals) / len(rx_vals), 2) if rx_vals else None
        output.append(summary)

    output.sort(key=lambda row: (norm_text(row.get("OLT")), row.get("Slot") or 0, row.get("PON") or 0))
    return output


def build_offline_list(base_onus):
    offline_rows = []
    for row in base_onus:
        status = normalize_status(row.get("Status ONU"))
        rx = parse_float(row.get("Sinal RX"))
        if status == "Offline" or (status != "Autorizada" and rx in (None, 0)):
            offline_rows.append(row)
    return offline_rows


def fetch_ixc_rows():
    url = f"{IXC_URL}{ENDPOINT}"
    payload = {
        "qtype": "radpop_radio_cliente_fibra.id",
        "query": "0",
        "oper": ">",
        "page": "1",
        "rp": "10000",
        "sortname": "radpop_radio_cliente_fibra.id",
        "sortorder": "asc",
    }
    headers = {
        "Content-Type": "application/json",
        "ixcsoft": "listar",
    }

    response = requests.get(
        url,
        headers=headers,
        auth=HTTPBasicAuth(IXC_USER, IXC_PASS),
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    return response


def reload_backend():
    try:
        requests.post(SYNC_URL, timeout=15)
        return True
    except requests.RequestException:
        return False


def run_cycle():
    previous_data = read_json(DATA_FILE, {"base_onus": [], "resumo_pon": [], "offline": []})
    previous_base = previous_data.get("base_onus") or []

    response = fetch_ixc_rows()
    payload = response.json()
    records = payload.get("registros") or []

    base_onus = build_base_onus(records, previous_base)
    resumo_pon = build_resumo_pon(base_onus)
    offline = build_offline_list(base_onus)

    new_data = {
        "updated_at": datetime.now().isoformat(),
        "source": "IXC radpop_radio_cliente_fibra",
        "base_onus": base_onus,
        "resumo_pon": resumo_pon,
        "offline": offline,
    }

    write_json(DATA_FILE, new_data)
    reloaded = reload_backend()

    print(
        f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] "
        f"Base atualizada | ONUs: {len(base_onus)} | PONs: {len(resumo_pon)} | Offline: {len(offline)}"
    )
    if reloaded:
        print("Backend sincronizado com sucesso.")
    else:
        print("data.json salvo, mas o backend nao respondeu no /api/sync/onus.")


def main():
    args = parse_args()

    print("=" * 60)
    print(" Atualizador de base de ONUs via IXC")
    print(f" Endpoint: {IXC_URL}{ENDPOINT}")
    print(f" Intervalo: {args.interval} segundos")
    print(" Modo: unico" if args.once else " Modo: continuo")
    print("=" * 60)

    while True:
        try:
            run_cycle()
        except requests.exceptions.HTTPError as exc:
            print(f"Erro HTTP ao consultar IXC: {exc}")
        except requests.exceptions.ConnectionError:
            print("Erro de conexao com a IXC.")
        except requests.exceptions.Timeout:
            print("Timeout na consulta da IXC.")
        except Exception as exc:
            print(f"Erro inesperado: {exc}")

        if args.once:
            break

        time.sleep(max(args.interval, 30))


if __name__ == "__main__":
    main()
