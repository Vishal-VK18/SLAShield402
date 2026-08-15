import base64
import requests
from algosdk import encoding

def inspect_app_global_state(app_id: int = 769236555):
    url = f"https://testnet-idx.algonode.cloud/v2/applications/{app_id}"
    r = requests.get(url)
    app = r.json().get("application", {})
    params = app.get("params", {})
    gs = params.get("global-state", [])

    print("==================================================================")
    print(f"ALGORAND TESTNET APPLICATION #{app_id} GLOBAL STATE")
    print("==================================================================")
    print(f"Total Global State Entries: {len(gs)}\n")

    for kv in gs:
        raw_key_b64 = kv.get("key", "")
        raw_key_bytes = base64.b64decode(raw_key_b64)

        if raw_key_bytes.startswith(b"bond_"):
            addr_bytes = raw_key_bytes[5:]
            try:
                addr = encoding.encode_address(addr_bytes)
                key_label = f"bond_{addr[:8]}...{addr[-6:]}"
            except Exception:
                key_label = f"bond_{addr_bytes.hex()[:10]}..."
        else:
            try:
                key_label = raw_key_bytes.decode("utf-8")
            except Exception:
                key_label = raw_key_bytes.hex()

        val_data = kv.get("value", {})
        val_type = val_data.get("type")

        if val_type == 2:
            val_display = f"uint64 = {val_data.get('uint', 0):,}"
        elif val_type == 1:
            raw_bytes = base64.b64decode(val_data.get("bytes", ""))
            if len(raw_bytes) == 32:
                try:
                    val_display = f"address = {encoding.encode_address(raw_bytes)}"
                except Exception:
                    val_display = f"hex = {raw_bytes.hex()}"
            else:
                try:
                    val_display = f"string = '{raw_bytes.decode('utf-8')}'"
                except Exception:
                    val_display = f"hex = {raw_bytes.hex()}"
        else:
            val_display = str(val_data)

        print(f"  * {key_label:32} | {val_display}")

    print("\n==================================================================")

if __name__ == "__main__":
    inspect_app_global_state()
