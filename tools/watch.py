import time
import os
import sys
import importlib
import build_site   

def get_watched_files():
    """
    Generates a fresh list of all files to watch based on the current
    configuration in build_site.py.
    """
    files = []

    # Watch the build script itself!
    # This allows us to detect changes to PAGES or COMPONENTS mappings.
    files.append(os.path.abspath(build_site.__file__))

    # Add Templates
    for template in build_site.PAGES.keys():
        path = os.path.join(build_site.TEMPLATES_DIR, template)
        # Use absolute paths to be safe
        files.append(os.path.abspath(path))

    # Add Components
    for component in build_site.COMPONENTS.values():
        path = os.path.join(build_site.COMPONENTS_DIR, component)
        files.append(os.path.abspath(path))
    
    # Remove duplicates just in case
    return list(set(files))

print("👀 Watcher started.")
print("   (Edit 'tools/build_site.py' to add new pages/components - I will auto-reload!)")
print("(Press Ctrl+C to stop)")

# Initial Load
watched_files = get_watched_files()
# Track the last modified time of files
last_mtimes = {}

# Initialize timestamps
for f in watched_files:
    if os.path.exists(f):
        last_mtimes[f] = os.path.getmtime(f)

while True:
    try:
        triggered = False
        reconfigure = False

        # Check files (Iterate over a copy so we can modify the list safely if needed)
        for file in list(watched_files):
            if os.path.exists(file):
                mtime = os.path.getmtime(file)
                if file not in last_mtimes:
                    last_mtimes[file] = mtime
                
                # If file changed
                if mtime > last_mtimes[file]:
                    last_mtimes[file] = mtime
                    filename = os.path.basename(file)
                    print(f"  > Change detected in {filename}")
                    triggered = True

                    # SPECIAL CASE: If the configuration file changed, we need to reload!
                    if file == os.path.abspath(build_site.__file__):
                        reconfigure = True
        
        # Handle Configuration Change (Hot Reload)
        if reconfigure:
            print("  ↻ Configuration changed. Reloading watch list...")
            try:
                # Force Python to re-read build_site.py
                importlib.reload(build_site)

                # Update the list of files we are watching
                watched_files = get_watched_files()

                # Initialize timestamps for any NEW files so they don't trigger immediately
                for f in watched_files:
                    if f not in last_mtimes and os.path.exists(f):
                        last_mtimes[f] = os.path.getmtime(f)
                        print(f"    + Now watching: {os.path.basename(f)}")
            except Exception as e:                
                print(f"  [!] Error reloading configuration: {e}")
                print("      Fix the error in build_site.py and save again.")
                triggered = False # Don't try to build if config is broken

        # Run Build if needed
        if triggered:
            print("⚡ Rebuilding site...")
            try:
                build_site.build_site()
            except Exception as e:
                print(f"  [!] Error during build: {e}")
                print("      Fix the error and save again.")
        
        time.sleep(1) # Check every second
        
    except KeyboardInterrupt:
        print("\nStopping watcher.")
        sys.exit(0)