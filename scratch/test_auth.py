import urllib.request
import json

url = "http://localhost:8000/api/v1/auth/register"
data = json.dumps({
    "email": "newuser@resque.ai",
    "password": "mypassword123",
    "full_name": "New Resque User",
    "role": "ANALYST"
}).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req) as resp:
        res_json = json.loads(resp.read().decode())
        print("REGISTER SUCCESS:")
        print(json.dumps(res_json, indent=2))
        token = res_json.get("access_token")

        me_req = urllib.request.Request(
            "http://localhost:8000/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(me_req) as me_resp:
            print("\nGET /auth/me FOR REGISTERED USER SUCCESS:")
            print(me_resp.read().decode())
except Exception as e:
    print("ERROR:", e)
