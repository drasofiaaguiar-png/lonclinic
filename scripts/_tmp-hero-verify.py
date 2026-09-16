from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(r"C:\Users\User\Desktop\clinic\_tmp_home_shots")
out.mkdir(exist_ok=True)
url = "http://127.0.0.1:8772/?v=20260913y3"

with sync_playwright() as p:
    browser = None
    for channel in ("msedge", "chrome", "chrome-beta"):
        try:
            browser = p.chromium.launch(channel=channel)
            print("launched", channel)
            break
        except Exception as e:
            print("fail", channel, e)
    if browser is None:
        raise SystemExit("no system browser")

    page = browser.new_page(viewport={"width": 1440, "height": 980})
    page.goto(url, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(800)
    page.screenshot(path=str(out / "hero-fix-desktop.png"), full_page=False)
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.wait_for_timeout(400)
    page.screenshot(path=str(out / "hero-fix-desktop-1920.png"), full_page=False)
    page.set_viewport_size({"width": 1280, "height": 800})
    page.wait_for_timeout(400)
    page.screenshot(path=str(out / "hero-fix-desktop-1280.png"), full_page=False)
    page.set_viewport_size({"width": 1440, "height": 980})
    img = page.locator(".dr-hero-bg")
    content = page.locator(".dr-hero-content")
    print("DESKTOP object-position", img.evaluate("el => getComputedStyle(el).objectPosition"))
    print("DESKTOP transform", img.evaluate("el => getComputedStyle(el).transform"))
    print("DESKTOP origin", img.evaluate("el => getComputedStyle(el).transformOrigin"))
    print("DESKTOP left", img.evaluate("el => getComputedStyle(el).left"))
    print("DESKTOP size", img.evaluate("el => getComputedStyle(el).width + 'x' + getComputedStyle(el).height"))
    print("DESKTOP content maxWidth", content.evaluate("el => getComputedStyle(el).maxWidth"))
    print("DESKTOP content width", content.evaluate("el => el.getBoundingClientRect().width"))
    print("DESKTOP h1 maxWidth", page.locator(".dr-hero h1").evaluate("el => getComputedStyle(el).maxWidth"))
    print("DESKTOP hero", page.locator(".dr-hero").bounding_box())
    print("DESKTOP img box", img.bounding_box())

    page.close()
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto(url, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(800)
    img = page.locator(".dr-hero-bg")
    page.screenshot(path=str(out / "hero-fix-mobile.png"), full_page=False)
    print("MOBILE object-position", img.evaluate("el => getComputedStyle(el).objectPosition"))
    print("MOBILE transform", img.evaluate("el => getComputedStyle(el).transform"))
    print("MOBILE origin", img.evaluate("el => getComputedStyle(el).transformOrigin"))
    print("MOBILE content width", page.locator(".dr-hero-content").evaluate("el => el.getBoundingClientRect().width"))
    browser.close()

print("done")
