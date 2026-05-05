#!/usr/bin/env python3
"""
Corrige o nome da ONU no IXC — Clientes Fibra
Uso: python3 corrigir_nome_onu.py
"""

import base64, json, ssl, urllib.request, urllib.parse, urllib.error, re

HOST  = 'https://sistema.futuranet.net.br'
TOKEN = '103:9a4ee574f3aa86a71e8e2142c2fb7dbd7cfb26e3436935a2d6aee20fbf9f4200'

# ─────────────────────────────────────────────────────────────────────────────

def headers(ixcsoft='listar'):
    enc = base64.b64encode(TOKEN.encode()).decode()
    return {
        'Authorization': f'Basic {enc}',
        'Content-Type':  'application/json',
        'ixcsoft':       ixcsoft,
    }

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode    = ssl.CERT_NONE

def get(endpoint, params):
    qs  = urllib.parse.urlencode(params)
    url = f"{HOST.rstrip('/')}/webservice/v1/{endpoint}?{qs}"
    req = urllib.request.Request(url, headers=headers())
    with urllib.request.urlopen(req, timeout=15, context=CTX) as r:
        return json.loads(r.read())

def put(endpoint, record_id, payload):
    url  = f"{HOST.rstrip('/')}/webservice/v1/{endpoint}/{record_id}"
    body = json.dumps(payload).encode()
    req  = urllib.request.Request(url, data=body, headers=headers('alterar'), method='PUT')
    with urllib.request.urlopen(req, timeout=15, context=CTX) as r:
        return json.loads(r.read())

def variantes_mac(mac):
    """
    Gera todas as variações do MAC para busca no IXC.
    Ex: FHTT062F9718 → ['FHTT062F9718', 'fhtt062f9718',
                        'FH:TT:06:2F:97:18', '06:2F:97:18', ...]
    """
    mac = mac.strip()
    variantes = [mac, mac.upper(), mac.lower()]

    # Extrai só os dígitos hex (ignora prefixo FHTT/ZTEG etc.)
    hex_only = re.sub(r'[^0-9A-Fa-f]', '', mac)

    if len(hex_only) >= 12:
        # Últimos 12 hex = MAC real
        mac_hex = hex_only[-12:].upper()
        # Com dois pontos: AA:BB:CC:DD:EE:FF
        com_pontos = ':'.join(mac_hex[i:i+2] for i in range(0,12,2))
        # Com hífen: AA-BB-CC-DD-EE-FF
        com_hifen  = '-'.join(mac_hex[i:i+2] for i in range(0,12,2))
        variantes += [
            mac_hex,
            mac_hex.lower(),
            com_pontos,
            com_pontos.lower(),
            com_hifen,
            com_hifen.lower(),
        ]

    # Remove duplicatas mantendo ordem
    seen = set()
    result = []
    for v in variantes:
        if v not in seen:
            seen.add(v)
            result.append(v)
    return result

def buscar_onu(mac):
    """Tenta buscar a ONU no IXC com todas as variações do MAC."""
    tentativas = variantes_mac(mac)
    print(f"  Tentando {len(tentativas)} variações do MAC...")

    for variante in tentativas:
        for oper in ('=', 'like'):
            try:
                data = get('fn_onu', {
                    'qtype': 'fn_onu.mac', 'query': variante,
                    'oper': oper, 'limit': '10',
                    'sortField': 'id', 'sortOrder': 'asc',
                })
                rows = data.get('registros') or (data if isinstance(data, list) else [])
                if rows:
                    print(f"  Encontrado com variante: '{variante}' (oper={oper})")
                    return rows
            except urllib.error.HTTPError as e:
                if e.code == 403:
                    raise RuntimeError(
                        "Acesso negado (403). O IP desta máquina não está "
                        "na lista de IPs permitidos na API do IXC.\n"
                        "  → Acesse no IXC: Configurações > Usuários > "
                        "edite o usuário da API > aba API > campo 'Redes permitidas'\n"
                        "  → Adicione o IP desta máquina e salve."
                    )
                raise
    return []

def corrigir(onu_id, nome_atual, nome_novo):
    if nome_atual == nome_novo:
        return 'ja_ok'
    result = put('fn_onu', onu_id, {'nome': nome_novo})
    if isinstance(result, dict) and result.get('type') == 'error':
        return f"erro IXC: {result.get('message')}"
    return 'ok'

# ─────────────────────────────────────────────────────────────────────────────

print('=' * 52)
print('  Correção de Nome — Clientes Fibra (IXC)')
print('  Digite CTRL+C para sair a qualquer momento')
print('=' * 52)

while True:
    print()

    # 1. MAC
    mac = input('MAC / Serial da ONU (ex: FHTT062F9718): ').strip()
    if not mac:
        continue

    print(f'  Buscando "{mac}" no IXC...')
    try:
        onus = buscar_onu(mac)
    except RuntimeError as e:
        print(f'\n  ✗ {e}')
        input('\n  Pressione ENTER para tentar novamente...')
        continue
    except Exception as e:
        print(f'  ✗ Erro ao consultar API: {e}')
        continue

    if not onus:
        print(f'  ✗ ONU não encontrada com nenhuma variação de "{mac}".')
        print(f'  Dica: verifique se o MAC está correto no sistema IXC.')
        continue

    # Mostrar o que encontrou
    print(f'  {len(onus)} ONU(s) encontrada(s):')
    for o in onus:
        print(f'    ID={o.get("id")} | MAC={o.get("mac")} | '
              f'Login={o.get("login")} | Nome atual="{o.get("nome")}"')

    # 2. Login (novo nome)
    login = input('  Novo nome / login correto: ').strip().lower()
    if not login:
        print('  ✗ Login não pode ser vazio. Pulando.')
        continue

    # 3. Confirmar
    print()
    for o in onus:
        nome_atual = o.get('nome') or ''
        print(f'  ONU ID={o.get("id")} | MAC={o.get("mac")}')
        print(f'    Nome atual : "{nome_atual}"')
        print(f'    Novo nome  : "{login}"')

    conf = input('  Confirmar alteração? (s/n): ').strip().lower()
    if conf != 's':
        print('  Cancelado.')
        continue

    # 4. Aplicar
    for o in onus:
        oid        = o.get('id')
        nome_atual = o.get('nome') or ''
        try:
            resultado = corrigir(oid, nome_atual, login)
            if resultado == 'ok':
                print(f'  ✓ ID={oid} atualizado: "{nome_atual}" → "{login}"')
            elif resultado == 'ja_ok':
                print(f'  ✓ ID={oid} já estava correto: "{login}"')
            else:
                print(f'  ✗ ID={oid} {resultado}')
        except RuntimeError as e:
            print(f'  ✗ {e}')
        except Exception as e:
            print(f'  ✗ ID={oid} Erro: {e}')

    print()
    outro = input('Corrigir outra ONU? (s/n): ').strip().lower()
    if outro != 's':
        print('Encerrando.')
        break