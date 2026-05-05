#!/usr/bin/env python3
"""
Monitor de ONUs desautorizadas — roda separado do servidor Node.js
Uso: python3 monitor.py
Verifica a cada 5 minutos e salva log em server/monitor_log.json
"""
import json, time, os, urllib.request, urllib.error
from datetime import datetime

LOG_FILE = os.path.join(os.path.dirname(__file__), 'server', 'monitor_log.json')
API_URL  = 'http://localhost:3001/api/alertas'
INTERVAL = 5 * 60  # 5 minutos

def load_log():
    try:
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_log(log):
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(log[:200], f, ensure_ascii=False, indent=2)

def check():
    ts = datetime.now().isoformat()
    try:
        with urllib.request.urlopen(API_URL, timeout=10) as r:
            data = json.loads(r.read())

        counts = data.get('counts', {})
        desaut = counts.get('desautorizadas', 0)
        sem_st = counts.get('semStatus', 0)
        offline = counts.get('offline', 0)

        entry = {
            'ts': ts,
            'desautorizadas': desaut,
            'semStatus': sem_st,
            'offline': offline,
            'alertas': [
                {'login': r.get('Login'), 'mac': r.get('MAC/Serial'),
                 'nome': r.get('nome_formatado'), 'pon': r.get('PON ID')}
                for r in data.get('desautorizadas', [])
            ]
        }

        log = load_log()
        log.insert(0, entry)
        save_log(log)

        if desaut > 0 or sem_st > 0 or offline > 0:
            print(f'[{ts}] ⚠  Desautorizadas: {desaut} | Sem status: {sem_st} | Offline: {offline}')
            for a in entry['alertas']:
                print(f'   → {a["nome"]} | Login: {a["login"]} | PON: {a["pon"]}')
        else:
            print(f'[{ts}] ✓  Rede OK — sem alertas')

    except urllib.error.URLError as e:
        print(f'[{ts}] ✗  Servidor offline ou inacessível: {e.reason}')
    except Exception as e:
        print(f'[{ts}] ✗  Erro: {e}')

if __name__ == '__main__':
    print('=' * 55)
    print(' Monitor ISP — ONUs desautorizadas')
    print(f' Verificando a cada {INTERVAL//60} minutos')
    print(f' API: {API_URL}')
    print('=' * 55)
    while True:
        check()
        time.sleep(INTERVAL)
