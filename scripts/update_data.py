#!/usr/bin/env python3
"""
Atualiza server/data.json a partir de um novo arquivo Excel.
Uso: python3 scripts/update_data.py caminho/para/arquivo.xlsx
"""
import sys
import json
import os

def main():
    if len(sys.argv) < 2:
        print("Uso: python3 update_data.py <arquivo.xlsx>")
        sys.exit(1)

    try:
        import pandas as pd
    except ImportError:
        print("Instale as dependências: pip install pandas openpyxl")
        sys.exit(1)

    xlsx_path = sys.argv[1]
    if not os.path.exists(xlsx_path):
        print(f"Arquivo não encontrado: {xlsx_path}")
        sys.exit(1)

    print(f"Lendo {xlsx_path}...")
    xl = pd.read_excel(xlsx_path, sheet_name=None)

    base = xl.get('Base_ONUs', xl.get(list(xl.keys())[0]))
    resumo_pon = xl.get('Resumo_PON')
    offline = xl.get('Offline_Atenção', xl.get('Offline_Atencao'))

    def clean(df):
        if df is None:
            return []
        return df.where(pd.notnull(df), None).to_dict(orient='records')

    data = {
        'base_onus': clean(base),
        'resumo_pon': clean(resumo_pon),
        'offline': clean(offline),
    }

    out_path = os.path.join(os.path.dirname(__file__), '..', 'server', 'data.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, default=str, ensure_ascii=False)

    print(f"✅ Dados atualizados em server/data.json")
    print(f"   ONUs: {len(data['base_onus'])}")
    print(f"   PONs: {len(data['resumo_pon'])}")
    print(f"   Offline: {len(data['offline'])}")
    print("\nReinicie o servidor para aplicar: npm run dev:server")

if __name__ == '__main__':
    main()
