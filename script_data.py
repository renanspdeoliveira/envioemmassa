import argparse
import copy
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
BACKUP_FILE = os.path.join("server", "data.full.backup.json")
RAW_FILE = os.path.join("server", "ixc_radpop_raw.json")
SYNC_URL = "http://localhost:3001/api/sync/onus"
DEFAULT_INTERVAL_SECONDS = 300


def parse_args():
    parser = argparse.ArgumentParser(
        description="Atualiza a base de ONUs usando a IXC sem sobrescrever dados ricos com campos vazios."
    )
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS)
    parser.add_argument("--once", action="store_true")
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


def looks_like_customer_login(value):
    text = norm_text(value)
    if not text:
        return False
    if text.isdigit():
        return False
    return bool(re.search(r"[a-zA-Z]", text))


def normalize_status(value):
    status = norm_text(value).lower()
    if not status:
        return None
    if "desaut" in status or "pedindo" in status:
        return "Pedindo autenticacao"
    if "autor" in status:
        return "Autorizada"
    if "sem status" in status:
        return "Sem status"
    if "off" in status:
        return "Offline"
    return norm_text(value)


def has_optical_signal(item=None, previous=None):
    previous = previous or {}
    rx_source = get_first_present(item, "sinal", "rx", "sinal_rx") if item else previous.get("Sinal RX")
    tx_source = get_first_present(item, "tx", "sinal_tx") if item else previous.get("Sinal TX")
    rx = parse_float(rx_source)
    tx = parse_float(tx_source)
    return rx not in (None, 0) or tx not in (None, 0)


def split_pon_parts(item, previous):
    candidates = [
        item.get("porta_pon"),
        item.get("pon"),
        item.get("slot_pon"),
        item.get("interface_pon"),
        item.get("ponid"),
        f"{item.get('slotno', '')}-{item.get('ponno', '')}",
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
    slot = parse_int(item.get("slotno"))
    pon = parse_int(item.get("ponno"))
    if slot is not None and pon is not None:
        return slot, pon, item.get("ponid") or f"1-1-{slot}-{pon}"

    return previous.get("Slot"), previous.get("PON"), previous.get("PON ID")


def build_lookup(rows):
    lookup = {}
    for row in rows:
        keys = [
            norm_upper(row.get("MAC/Serial")),
            norm_upper(row.get("Login")),
            str(row.get("ID ONU Fibra") or "").strip(),
        ]
        for key in keys:
            if key:
                lookup[key] = row
    return lookup


def get_first_present(item, *keys):
    for key in keys:
        value = item.get(key)
        if norm_text(value):
            return value
    return None


def should_append_new_row(item):
    return bool(
        norm_text(item.get("mac"))
        and (
            norm_text(item.get("nome"))
            or norm_text(item.get("cliente"))
            or norm_text(item.get("login"))
            or norm_text(item.get("id_login"))
            or norm_text(item.get("olt"))
            or norm_text(item.get("porta_pon"))
            or parse_float(item.get("sinal")) is not None
            or parse_float(item.get("sinal_rx")) is not None
        )
    )


def merge_onu(item, previous):
    row = copy.deepcopy(previous)

    slot, pon, pon_id = split_pon_parts(item, row)
    olt = get_first_present(item, "olt") or row.get("OLT")
    login_candidate = get_first_present(item, "login", "usuario", "username", "login_pppoe", "login_onu_cliente")
    login = login_candidate if looks_like_customer_login(login_candidate) else row.get("Login")
    login_id = parse_int(get_first_present(item, "id_login", "id_cliente_login", "id_cliente")) or row.get("ID Login")
    mac = get_first_present(item, "mac") or row.get("MAC/Serial")
    client_name = get_first_present(item, "nome", "cliente", "nome_cliente") or row.get("Nome Cliente")
    status = normalize_status(get_first_present(item, "status", "status_onu", "status_cliente"))
    rx = parse_float(get_first_present(item, "sinal", "rx", "sinal_rx"))
    tx = parse_float(get_first_present(item, "tx", "sinal_tx"))
    id_onu = parse_int(get_first_present(item, "id", "id_onu_fibra")) or row.get("ID ONU Fibra")
    onu_number = parse_int(get_first_present(item, "onu", "numero_onu")) or row.get("ONU Nº")
    updated_at = (
        get_first_present(item, "data_sinal", "ultima_conexao", "ultima_atualizacao")
        or row.get("Última atualização")
        or datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    )

    row["OLT"] = olt
    row["Slot"] = slot
    row["PON"] = pon
    row["PON ID"] = pon_id or row.get("PON ID")
    if row.get("OLT") and row.get("Slot") is not None and row.get("PON") is not None:
        row["PON Grupo"] = f"{row['OLT']} | Slot {row['Slot']} | PON {row['PON']}"
    if not status:
        status = "Autorizada" if has_optical_signal(item, row) else row.get("Status ONU") or "Offline"

    row["ID ONU Fibra"] = id_onu
    row["ID Login"] = login_id
    row["Nome Cliente"] = client_name
    row["Login"] = login
    row["MAC/Serial"] = mac
    row["Status ONU"] = status or row.get("Status ONU") or "Offline"
    if rx is not None:
        row["Sinal RX"] = round(rx, 2)
    if tx is not None:
        row["Sinal TX"] = round(tx, 2)
    row["Última atualização"] = updated_at
    row["ONU Nº"] = onu_number
    row["ONU Tipo"] = get_first_present(item, "modelo", "tipo_onu", "onu_tipo") or row.get("ONU Tipo")
    row["IP"] = get_first_present(item, "ip", "ip_gerencia") or row.get("IP")
    row["Porta FTTH"] = parse_int(get_first_present(item, "porta_ftth")) or row.get("Porta FTTH")
    row["VLAN"] = parse_int(get_first_present(item, "vlan")) or row.get("VLAN")
    row["Causa ??ltima queda"] = get_first_present(item, "causa_ultima_queda") or row.get("Causa ??ltima queda")

    return row


def build_base_onus(records, previous_rows):
    previous_lookup = build_lookup(previous_rows)
    updated_rows = []
    seen_macs = set()

    for item in records:
        keys = [
            norm_upper(item.get("mac")),
            norm_upper(item.get("login")),
            str(item.get("id") or "").strip(),
        ]

        previous = None
        for key in keys:
            if key and key in previous_lookup:
                previous = previous_lookup[key]
                break

        if previous is None and not should_append_new_row(item):
            continue

        base = previous or {
            "OLT": None,
            "Slot": None,
            "PON": None,
            "PON ID": None,
            "PON Grupo": None,
            "ID ONU Fibra": None,
            "ID Login": None,
            "Nome Cliente": None,
            "Login": None,
            "MAC/Serial": None,
            "Status ONU": "Sem status",
            "Sinal RX": 0,
            "Sinal TX": 0,
            "Última atualização": None,
            "ONU Nº": None,
            "ONU Tipo": None,
            "Caixa FTTH/CTO": None,
            "Porta FTTH": None,
            "POP": "TAQUARITINGA",
            "VLAN": None,
            "Causa última queda": None,
            "Potência": "Indefinido",
            "IP": None,
        }

        merged = merge_onu(item, base)
        mac = norm_upper(merged.get("MAC/Serial"))
        if not mac:
            continue

        updated_rows.append(merged)
        seen_macs.add(mac)

    for row in previous_rows:
        mac = norm_upper(row.get("MAC/Serial"))
        if mac and mac not in seen_macs:
            updated_rows.append(row)

    updated_rows.sort(
        key=lambda row: (
            norm_text(row.get("OLT")),
            row.get("Slot") or 0,
            row.get("PON") or 0,
            norm_text(row.get("Nome Cliente")),
        )
    )
    return updated_rows


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
        status = normalize_status(row.get("Status ONU")) or "Sem status"
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
    offline = []
    for row in base_onus:
        status = normalize_status(row.get("Status ONU")) or "Sem status"
        rx = parse_float(row.get("Sinal RX"))
        if status == "Offline" or (status != "Autorizada" and rx in (None, 0)):
            offline.append(row)
    return offline


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


def load_full_base():
    current = read_json(DATA_FILE, None)
    if current and current.get("base_onus"):
        return current

    backup = read_json(BACKUP_FILE, None)
    if backup and backup.get("base_onus"):
        return backup

    raise RuntimeError(
        "Nao encontrei uma base rica com 'base_onus'. "
        "Restaure primeiro um data.json completo antes de rodar este sincronizador."
    )


def backup_full_base(data):
    write_json(BACKUP_FILE, data)


def run_cycle():
    full_data = load_full_base()
    previous_base = full_data.get("base_onus") or []

    response = fetch_ixc_rows()
    payload = response.json()
    write_json(RAW_FILE, payload)

    records = payload.get("registros") or []
    if not records:
        raise RuntimeError("A IXC retornou zero registros.")

    base_onus = build_base_onus(records, previous_base)
    resumo_pon = build_resumo_pon(base_onus)
    offline = build_offline_list(base_onus)

    new_data = {
        **full_data,
        "updated_at": datetime.now().isoformat(),
        "source": "IXC radpop_radio_cliente_fibra",
        "base_onus": base_onus,
        "resumo_pon": resumo_pon,
        "offline": offline,
    }

    backup_full_base(full_data)
    write_json(DATA_FILE, new_data)

    reloaded = reload_backend()
    print(
        f"[{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}] "
        f"Base atualizada | ONUs: {len(base_onus)} | PONs: {len(resumo_pon)} | Offline: {len(offline)}"
    )
    print("Backend sincronizado com sucesso." if reloaded else "data.json salvo, mas o backend nao respondeu no /api/sync/onus.")


def main():
    args = parse_args()

    print("=" * 60)
    print(" Atualizador seguro de base de ONUs via IXC")
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
