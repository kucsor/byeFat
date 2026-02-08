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

# Define the box shadows to inject
new_shadows = """
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        "glow": "0 0 20px rgba(43, 140, 238, 0.3)",
        "inner-glow": "inset 0 0 20px rgba(43, 140, 238, 0.15)",
        "glow-green": "0 0 20px rgba(0, 224, 150, 0.6), 0 0 10px rgba(0, 224, 150, 0.4)",
        "glow-primary": "0 0 15px rgba(43, 140, 238, 0.4)",
        "glow-hover": "0 0 30px -5px rgba(43, 140, 238, 0.7)",
      },
"""

# Update Primary Color
# Find existing primary definition and replace it
# primary: 'hsl(var(--primary))', -> primary: '#2b8cee',
content = re.sub(r"primary:\s*{\s*DEFAULT:\s*'hsl\(var\(--primary\)\)',\s*foreground:\s*'hsl\(var\(--primary-foreground\)\)',\s*},", "primary: '#2b8cee',", content)

# Inject Colors
# Find the end of the colors object in extend
match = re.search(r"(colors:\s*\{[^}]*sidebar:[^}]*\}(?:\s*,)?\s*\})", content, re.DOTALL)
if match:
    # Insert new colors before the closing brace of colors object
    colors_block = match.group(1)
    updated_colors = colors_block[:-1] + "," + new_colors + "      }"
    content = content.replace(colors_block, updated_colors)

# Inject Box Shadows
# Find the end of the extend object
match_extend = re.search(r"(extend:\s*\{)", content)
if match_extend:
    # Insert new shadows at the beginning of extend (or end, doesn't matter much)
    content = content.replace("extend: {", "extend: {\n" + new_shadows)

with open(config_path, 'w') as f:
    f.write(content)

print("Tailwind config updated.")
