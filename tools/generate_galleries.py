import os
import json
import re
from PIL import Image

# Configuration
IMAGES_DIR = 'images'
DATA_DIR = 'data/galleries'
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
METADATA_FILE = 'metadata.json'

INDEX_TEMPLATE_FILE = "templates/index_template.html"
INDEX_OUTPUT_FILE = "index.html"

# Define the order you want categories to appear on the home page.
# Any category found that isn't in this list will be added at the end.
CATEGORY_ORDER = [
    "Healthcare",
    "Senior Living",
    "Education",
    "Business & Industry",
    "Government",
    "Concepts",
    "Residential",
    "Products"
]

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def format_alt_text(text):
    """
    Cleans up a filename string to be human-readable alt text.
    1. Removes version suffixes (v1, V01, _v55, etc).
    2. Inserts spaces into CamelCase (MyImage -> My Image).
    3. Replaces underscores/hyphens with spaces.
    """
    # Remove Leading Numbers (e.g., "01_Lobby" -> "Lobby") << NEW ADDITION
    text = re.sub(r'^\d+[_-]?', '', text)

    # 1. Remove Version Suffixes (e.g., v1, V02, _v55) from the end of the string
    # Regex explanation: [_-]? match optional separator, [vV] match v or V, \d+ match one or more numbers, $ match end of string
    text = re.sub(r'[_-]?[vV]\d+$', '', text)

    # 2. Split CamelCase (e.g., "CamelCase" -> "Camel Case")
    # Regex explanation: Look for a lowercase letter (?<=[a-z]) followed immediately by an uppercase letter (?=[A-Z])
    text = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', text)

    # 3. Replace underscores and hyphens with spaces
    text = text.replace('_', ' ').replace('-', ' ')

    # 4. Trim whitespace and capitalize first letter
    return text.strip()

def get_images_from_folder(base_folder, subfolder_path, prefix):
    """
    Scans a specific directory for images.
    Returns image objects with paths relative to base_folder
    """
    images_list = []

    # Full path to scan
    scan_path = os.path.join(base_folder, subfolder_path) if subfolder_path else base_folder

    # Relative path for the SRC (e.g. "NathanCox/")
    rel_path_prefix = f"{subfolder_path}/" if subfolder_path else ""

    if not os.path.exists(scan_path):
        print(f"    ! Warning: Folder not found {scan_path}")
        return []

    for filename in sorted(os.listdir(scan_path)):
        file_path = os.path.join(scan_path, filename)

        if os.path.isdir(file_path):
            continue  # Skip directories

        ext = os.path.splitext(filename)[1].lower()
        base_name = os.path.splitext(filename)[0]

        # Skip non-images and thumbnails
        if ext not in ALLOWED_EXTENSIONS or '_thumb' in base_name:
            continue

        try:
            # Get dimensions automatically
            with Image.open(file_path) as img:
                width, height = img.size

            # Check if a thumbnail exists
            thumb_name = filename.replace(ext, f"_thumb{ext}")
            has_thumb = os.path.exists(os.path.join(scan_path, thumb_name))

            # Determine final Src/Thumb paths (Relative to Gallery Root)
            final_src = f"{rel_path_prefix}{filename}"
            final_thumb = f"{rel_path_prefix}{thumb_name}" if has_thumb else final_src

            # Generate Alt Text (Strip prefix if present)
            if prefix and base_name.startswith(prefix):
                clean_name = base_name[len(prefix):]
            else:
                clean_name = base_name
            alt_text = format_alt_text(clean_name)

            images_list.append({
                "src": final_src,
                "thumb": final_thumb,
                "width": width,
                "height": height,
                "alt": alt_text,
                "filename": filename  # Keep original filename for cover matching
            })
        except Exception as e:
            print(f"    Error processing image {filename} in {subfolder_path}: {e}")

    return images_list

def build_gallery_data(folder_name):
    """
    Reads metadata and scans images for a SINGLE gallery folder.
    Returns the full gallery dictionary object (including internal metadata).
    """
    root_folder_path = os.path.join(IMAGES_DIR, folder_name)
    if not os.path.isdir(root_folder_path): return None

    print(f"Processing: {folder_name}...")

    # Default Gallery Data
    gallery_data = {
        "url": folder_name.lower(), # Default URL is the folder name in lowercase
        "title": folder_name.replace('_', ' '),
        "location": "",
        "category": "Uncategorized",
        "cover_image": None,
        "folder": folder_name,
        "video": None,
        "image_prefix": "", # Default empty prefix
        "subsections": {},
        "sections": []
    }

    # Look for a metadata.json override file (optional)
    metadata_path = os.path.join(root_folder_path, METADATA_FILE)
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                gallery_data.update(metadata)
        except Exception as e:
            print(f"  Error reading metadata for {folder_name}: {e}")

    # Get the specific prefix for this gallery
    prefix = gallery_data.get("image_prefix", "")
    subsection_map = gallery_data.get("subsections", {})

    # Track which subfolders we have processed so we don't duplicate them in auto-discovery
    processed_subfolders = set()

    # Check for Video in Root
    for filename in os.listdir(root_folder_path):
        if filename.lower().endswith('.mp4'):
            gallery_data['video'] = filename
            break

    # Process Root Images (Always the first section)
    root_images = get_images_from_folder(root_folder_path, '', prefix)
    if root_images:
        gallery_data['sections'].append({
            "title": "",
            "images": root_images
        })
        
    # Process Configured Subsections (from metadata)
    for section_title, folders in subsection_map.items():
        # Ensure folders is a list (even if it's a single string)
        if isinstance (folders, str):
            folders = [folders]

        section_images = []

        for subfolder in folders:
            imgs = get_images_from_folder(root_folder_path, subfolder, prefix)
            section_images.extend(imgs)
            processed_subfolders.add(subfolder) # Mark as done

        if section_images:
            gallery_data['sections'].append({
                "title": section_title,
                "images": section_images
            })

    # Auto-discover any remaining subfolders not in the config
    for sub_name in sorted(os.listdir(root_folder_path)):
        sub_path = os.path.join(root_folder_path, sub_name)

        # If it is a directory and we haven't processed it yet
        if os.path.isdir(sub_path) and sub_name not in processed_subfolders:
            sub_images = get_images_from_folder(root_folder_path, sub_name, prefix)

            if sub_images:
                gallery_data['sections'].append({
                    "title": format_alt_text(sub_name),
                    "images": sub_images
                })

    return gallery_data


def generate_site():
    # This dictionary will hold all gallery data to build the index later
    # Structure: { "Category Name": [ {title, link, thumb, alt}, ... ] }
    site_index_data = {}

    # --- MAIN LOOP ---
    for folder_name in os.listdir(IMAGES_DIR):
        # Get data for this gallery
        gallery_data = build_gallery_data(folder_name)

        if not gallery_data:
            continue  # Skip if no data returned

        # Extract info needed for Index Page (before we clean it up)
        category = gallery_data['category']
        cover_image = gallery_data['cover_image']
        title = gallery_data['title']
        location = gallery_data.get('location', '')

        # Determine output filename & clean data
        target_filename = gallery_data.get('url', folder_name.lower())

        # We use the folder name as the ID, formatted to be URL friendly
        if not target_filename.lower().endswith('.json'):
            target_filename += '.json'

        # Find Cover image Thumbnail path
        thumb_path = ""
        # Search all sections for the cover image
        for sec in gallery_data['sections']:
            for img in sec['images']:
                # Match either src or original filename
                if(cover_image and (cover_image in img['src'] or cover_image in img['filename'])) or (not cover_image and not thumb_path):
                    thumb_path = f"/images/{folder_name}/{img['thumb']}"
                    if cover_image: break # Found specified cover, stop searching                        
                if thumb_path and cover_image: break
        
        # Add to Site Index Data
        if thumb_path:
            if category not in site_index_data: site_index_data[category] = []
            gallery_id = target_filename.replace('.json', '')
            site_index_data[category].append({
                "title": title,
                "location": location,
                "url": f"/gallery-view.html?id={gallery_id}",
                "thumb": thumb_path,
            })
        
        # Clean and Save Individual Gallery JSON file
        # remove internal-only fields
        for field in ['image_prefix', 'subsections', 'url', 'category', 'cover_image']:
            if field in gallery_data:
                del gallery_data[field]

        # Remove 'filename' from images (was only used for cover matching)
        for section in gallery_data['sections']:
            for img in section['images']:
                if 'filename' in img:
                    del img['filename']

        with open(os.path.join(DATA_DIR, target_filename), 'w') as outfile:
            json.dump(gallery_data, outfile, indent=2)



        print(f"  Generated {target_filename} with {len(gallery_data.get('sections', []))} sections.")

    # --- BUILD INDEX PAGE DATA ---
    print("\nGenerating index.html...")
    portfolio_html = ""

    # Sort categories based on predefined order
    sorted_categories = [c for c in CATEGORY_ORDER if c in site_index_data]
    other_categories = sorted([c for c in site_index_data if c not in CATEGORY_ORDER])

    for category in sorted_categories + other_categories:
        items = site_index_data[category]
        portfolio_html += f'\n<h3 class="section__subtitle--gallery">{category}</h3>\n'
        portfolio_html += '<div class="portfolio">\n'

        for item in items:
            portfolio_html += f'''
            <a href="{item['url']}" class="portfolio__item">
                <img src="{item['thumb']}" alt="{item['title']}" class="portfolio__img"/>
                <p class="portfolio__item_alt">
                    {item['title']}
                    <br>
                    <span style="font-size: 0.8em; font-weight: normal;">{item['location']}</span>
                </p>
            </a>
            '''
        portfolio_html += '</div>\n'

    # Read the index template
    if os.path.exists(INDEX_TEMPLATE_FILE):
        with open(INDEX_TEMPLATE_FILE, 'r') as f:
            html_content = f.read()
        
        final_html = html_content.replace('<!-- PORTFOLIO -->', portfolio_html)

        with open(INDEX_OUTPUT_FILE, 'w') as f:
            f.write(final_html)
        
        print(f"Success! Generated {INDEX_OUTPUT_FILE}.")
    else:
        print(f"Error: Index template file '{INDEX_TEMPLATE_FILE}' not found.")

if __name__ == "__main__":
    generate_site()