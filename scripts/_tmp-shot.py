import base64
import json
import sys
import time
import websocket

ws = websocket.create_connection(sys.argv[1])
_id = 0


def send(method, params=None):
    global _id
    _id += 1
    ws.send(json.dumps({"id": _id, "method": method, "params": params or {}}))
    while True:
        msg = json.loads(ws.recv())
        if msg.get("id") == _id:
            return msg


send("Page.enable")
send("Runtime.enable")


def shot(url, w, h, path, selector=None):
    send(
        "Emulation.setDeviceMetricsOverride",
        {"width": w, "height": h, "deviceScaleFactor": 1, "mobile": w < 500},
    )
    send("Page.navigate", {"url": url})
    time.sleep(1.6)
    if selector:
        send(
            "Runtime.evaluate",
            {"expression": f'document.querySelector({json.dumps(selector)})?.scrollIntoView({{block:"center"}})'}
        )
        time.sleep(0.7)
    data = send("Page.captureScreenshot", {"format": "png"})["result"]["data"]
    with open(path, "wb") as f:
        f.write(base64.b64decode(data))
    print("wrote", path)


base = "http://127.0.0.1:8770/"
shot(base, 1440, 900, "scripts/_tmp-hero-desktop.png")
shot(base, 390, 844, "scripts/_tmp-hero-mobile.png")
shot(base, 1440, 900, "scripts/_tmp-burnout-desktop.png", "#teste-burnout")
shot(base, 390, 844, "scripts/_tmp-burnout-mobile.png", "#teste-burnout")
shot(base, 1440, 900, "scripts/_tmp-cta-desktop.png", ".lon-consult-cta")
shot(base, 390, 844, "scripts/_tmp-cta-mobile.png", ".lon-consult-cta")
ws.close()
