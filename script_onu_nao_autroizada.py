import base64
import json
import requests

IXC_URL = "https://sistema.futuranet.net.br/webservice/v1/fh_onu_nao_autorizadas"
IXC_TOKEN = "103"
IXC_API_KEY = "9a4ee574f3aa86a71e8e2142c2fb7dbd7cfb26e3436935a2d6aee20fbf9f4200"

auth_base64 = base64.b64encode(f"{IXC_TOKEN}:{IXC_API_KEY}".encode()).decode()

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Basic {auth_base64}",
    "ixcsoft": "listar",
}

session = requests.Session()
session.trust_env = False


def normalize_rows(payload):
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("registros", "rows", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
        return [payload]
    return []


def fetch_olt(id_olt):
    payload = {
        "qtype": "fh_onu_nao_autorizadas.id_olt",
        "query": str(id_olt),
        "oper": "=",
        "page": "1",
        "rp": "1000",
        "sortname": "id",
        "sortorder": "desc",
        "grid_param": json.dumps([{"TB": "id_olt", "P": str(id_olt)}]),
    }

    response = session.post(IXC_URL, headers=headers, json=payload, timeout=30, verify=False)
    response.raise_for_status()
    body = response.json()
    rows = normalize_rows(body)

    for row in rows:
        if isinstance(row, dict):
            row.setdefault("id_olt", str(id_olt))

    return rows


def main():
    merged = []
    for id_olt in ("1", "2"):
        merged.extend(fetch_olt(id_olt))
    print(json.dumps({"registros": merged}, ensure_ascii=False))


if __name__ == "__main__":
    main()
