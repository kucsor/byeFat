import re

config_path = 'tailwind.config.ts'

with open(config_path, 'r') as f:
    content = f.read()

# Define the new colors to inject
new_colors = """
        "background-light": "#f6f7f8",
        "background-dark": "#101922",
        "glass-border": "rgba(255, 255, 255, 0.5)",
        "glass-surface": "rgba(255, 255, 255, 0.65)",
        "glass-surface-dark": "rgba(30, 41, 59, 0.65)",
        "glass-light": "rgba(255, 255, 255, 0.7)",
        "glass-dark": "rgba(16, 25, 34, 0.7)",
        "glass-border-light": "rgba(255, 255, 255, 0.5)",
        "glass-border-dark": "rgba(255, 255, 255, 0.1)",
        "accent-green": "#00E096",
"""

# Find the end of the sidebar object inside colors
# We look for the closing brace of the sidebar object, then the closing brace of colors
# sidebar: { ... },
#       },

pattern = r"(sidebar:\s*\{[^}]+\}\s*,)(\s*\})"
match = re.search(pattern, content, re.DOTALL)

if match:
    # Insert new colors after sidebar object
    sidebar_end = match.group(1)
    closing_brace = match.group(2)
    new_content = content[:match.start()] + sidebar_end + new_colors + closing_brace + content[match.end():]

    with open(config_path, 'w') as f:
        f.write(new_content)
    print("Tailwind colors updated.")
else:
    print("Could not find sidebar object end.")
