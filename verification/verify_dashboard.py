from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 375, 'height': 812}) # Mobile viewport
    page = context.new_page()

    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

    # Increase default navigation timeout
    page.set_default_navigation_timeout(60000)

    # 1. Dashboard
    print("Navigating to Dashboard...")
    try:
        page.goto("http://localhost:9008")
        page.wait_for_load_state("networkidle")
        # Wait a bit for animations/rendering
        page.wait_for_timeout(3000)

        print(" taking screenshot of Dashboard...")
        page.screenshot(path="verification/dashboard.png")
    except Exception as e:
        print(f"Error loading dashboard: {e}")
        try:
            page.screenshot(path="verification/dashboard_error.png")
        except:
            pass

    # 2. Profile
    print("Navigating to Profile...")
    try:
        page.goto("http://localhost:9008/profile")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)

        print(" taking screenshot of Profile...")
        page.screenshot(path="verification/profile.png")
    except Exception as e:
        print(f"Error loading profile: {e}")
        try:
            page.screenshot(path="verification/profile_error.png")
        except:
            pass

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
