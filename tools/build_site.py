import os

# Configuration
COMPONENTS_DIR = "components"
TEMPLATES_DIR = "templates"
OUTPUT_DIR = '.' # Root directory

# Mapping of Placeholder Comments -> Component Filenames
# Ensure the HTML templates use the exact comment placeholders
COMPONENTS = {
    "<!-- HEAD TEMPLATE -->": "head.html",
    "<!-- HEADER TEMPLATE -->": "header.html",
    "<!-- FOOTER TEMPLATE -->": "footer.html",
    "<!-- SKILLS TEMPLATE -->": "skills-cloud.html",
}

# Mapping of Template -> Output File
PAGES = {
    "index_template.html": "index.html",
    "pages/contact_template.html": "pages/contact.html",
    "pages/privacy-policy_template.html": "pages/privacy-policy.html",
    "gallery_template.html": "gallery.html",
    "404_template.html": "404.html",
}

def load_component(component_name):
    filepath = os.path.join(COMPONENTS_DIR, component_name)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    else:
        print(f"Warning: Component file '{filepath}' not found.")
        return ""
    
def load_all_components():
    components_content = {}
    for placeholder, filename in COMPONENTS.items():
        components_content[placeholder] = load_component(filename)
    return components_content


def build_site():       
    # Pre-load all components into memory
    loaded_components = load_all_components()

    # Process each page
    for template_name, output_name in PAGES.items():
        template_path = os.path.join(TEMPLATES_DIR, template_name)
        output_path = os.path.join(OUTPUT_DIR, output_name)

        if not os.path.exists(template_path):
            print(f"Warning: Template file '{template_path}' not found. Skipping.")
            continue

        with open(template_path, 'r', encoding='utf-8') as f:
            page_html = f.read()

        for placeholder, component_content in loaded_components.items():
            if placeholder in page_html:
                # Detect indentation of the placeholder line
                indentation = ''
                for line in page_html.split('\n'):
                    if placeholder in line:
                        prefix = line[:line.find(placeholder)]
                        if not prefix.strip():
                            indentation = prefix
                            break
                
                # Apply indentation to component lines
                component_lines = component_content.splitlines()
                if component_lines:
                    indented_content = [component_lines[0]] # First line stays as-is (on the placeholder line)
                    for line in component_lines[1:]:
                        indented_content.append(indentation + line)
                    formatted_content = '\n'.join(indented_content)

                    # Perform the replacement
                    page_html = page_html.replace(placeholder, formatted_content)

                print(f"  [✓] Injected {COMPONENTS[placeholder]} into {output_name}")
                
        # Write the final HTML to output file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(page_html)
            
        print(f"  Generated {output_path}")

if __name__ == "__main__":
    print("Starting Build Process...")
    build_site()
    print("Build Complete.")