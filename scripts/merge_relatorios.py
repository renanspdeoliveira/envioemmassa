#!/usr/bin/env python3
"""
Cruza relatorio de logins + relatorio de contratos e gera relatorio_clientes.json
Uso: python3 scripts/merge_relatorios.py <logins.csv> <contratos.csv>

Exemplo:
  python3 scripts/merge_relatorios.py relatorio__1_.csv relatorio.csv
"""
import sys, re, json, os

def clean(val):
    if isinstance(val, str):
        return re.sub(r'^="?|"?$', '', val.strip()).strip('"').strip()
    return val

def fmt_phone(raw):
    if not raw or str(raw).strip() in ('','nan'): return ''
    d = re.sub(r'\D', '', str(raw))
    if not d: return ''
    if len(d) >= 12 and d.startswith('55'): return d
    if len(d) in (10,11): return '55' + d
    return d

def parse_csv(filepath):
    with open(filepath, encoding='utf-8', errors='replace') as f:
        lines = [l.strip() for l in f if l.strip()]
    sep = ';' if lines[0].count(';') > lines[0].count(',') else ','
    headers = [re.sub(r'^["=]+|[" ]+$','',h).strip().lower() for h in lines[0].split(sep)]
    rows = []
    for line in lines[1:]:
        parts = [re.sub(r'^["=]+|"+$','',v).strip() for v in line.split(sep)]
        rows.append(dict(zip(headers, parts)))
    return rows

def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)

    logins_file    = sys.argv[1]
    contratos_file = sys.argv[2]
    out_file       = os.path.join(os.path.dirname(__file__), '..', 'server', 'relatorio_clientes.json')

    print(f'Lendo logins: {logins_file}')
    logins = parse_csv(logins_file)

    print(f'Lendo contratos: {contratos_file}')
    contratos = parse_csv(contratos_file)

    # Build byId from contratos
    byId = {}
    for r in contratos:
        cid   = re.sub(r'\D','',r.get('id',''))
        nome  = (r.get('cliente','') or '').upper().strip()
        phone = fmt_phone(r.get('telefone celular',''))
        bairro= (r.get('bairro','') or '').strip()
        if cid: byId[cid] = {'nome':nome,'whatsapp':phone,'bairro':bairro,'id_contrato':cid}

    # Build byLogin using logins CSV
    byLogin, byNome = {}, {}
    for r in logins:
        login = (r.get('login','') or '').lower().strip()
        cid   = re.sub(r'\D','',r.get('id contrato',''))
        nome  = (r.get('cliente','') or '').upper().strip()
        bairro= (r.get('bairro','') or '').strip()
        contr = byId.get(cid, {})
        entry = {
            'nome':        nome,
            'whatsapp':    contr.get('whatsapp',''),
            'bairro':      bairro or contr.get('bairro',''),
            'id_contrato': cid,
        }
        if login: byLogin[login] = entry
        if nome:  byNome[nome]   = entry

    out = {'by_login':byLogin,'by_id':byId,'by_nome':byNome}
    with open(out_file,'w',encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)

    com_tel = sum(1 for v in byLogin.values() if v['whatsapp'])
    print(f'\n✓ Logins:    {len(byLogin):,}')
    print(f'✓ Contratos: {len(byId):,}')
    print(f'✓ Com tel:   {com_tel:,}')
    print(f'✓ Salvo em:  {out_file}')

if __name__ == '__main__':
    main()
