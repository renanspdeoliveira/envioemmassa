import requests
from requests.auth import HTTPBasicAuth

url = "https://sistema.futuranet.net.br/webservice/v1/fh_onu_nao_autorizadas"

headers = {
    "ixcsoft": "listar",
    "Content-Type": "application/json"
}

payload = """
{
    "grid_param": "[{\\"TB\\":\\"2\\",\\"P\\":\\"2\\"}]"
}
"""

response = requests.request(
    method="GET",
    url=url,
    headers=headers,
    data=payload,
    auth=HTTPBasicAuth(
        "103",
        "9a4ee574f3aa86a71e8e2142c2fb7dbd7cfb26e3436935a2d6aee20fbf9f4200"
    ),
    timeout=30
)

print(response.status_code)
print(response.text)