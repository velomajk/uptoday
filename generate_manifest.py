import os
import json
import xml.etree.ElementTree as ET

FEEDS_DIR = 'feeds'
OUTPUT_FILE = 'feeds.json'

def find_feed_files(root_dir):
    feed_files = []
    for dirpath, _, filenames in os.walk(root_dir):
        if 'feed.xml' in filenames:
            feed_files.append(os.path.join(dirpath, 'feed.xml'))
    return feed_files

def extract_metadata(file_path):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        channel = root.find('channel')
        
        if channel is None:
            return None

        title = channel.find('title').text if channel.find('title') is not None else 'Untitled'
        description = channel.find('description').text if channel.find('description') is not None else ''
        
        # Namespace handling for itunes:image and itunes:owner
        namespaces = {'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'}
        image_tag = channel.find('itunes:image', namespaces)
        image = image_tag.attrib.get('href') if image_tag is not None else ''
        
        # Fallback to standard image tag
        if not image:
            img = channel.find('image')
            if img is not None:
                url = img.find('url')
                if url is not None:
                    image = url.text

        # Extract email
        email = ''
        owner = channel.find('itunes:owner', namespaces)
        if owner is not None:
            email_tag = owner.find('itunes:email', namespaces)
            if email_tag is not None:
                email = email_tag.text

        return {
            'title': title,
            'description': description,
            'image': image,
            'email': email
        }
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return None

def generate_manifest():
    print("Scanning for feed.xml files...")
    feed_files = find_feed_files(FEEDS_DIR)
    print(f"Found {len(feed_files)} feeds.")

    feeds = []
    for file_path in feed_files:
        metadata = extract_metadata(file_path)
        if metadata:
            relative_path = os.path.relpath(file_path, '.')
            folder = os.path.basename(os.path.dirname(file_path))
            
            feeds.append({
                'path': relative_path,
                'folder': folder,
                'title': metadata['title'],
                'description': metadata['description'],
                'image': metadata['image'],
                'email': metadata['email']
            })

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(feeds, f, indent=2)
    print(f"Manifest written to {OUTPUT_FILE}")

if __name__ == '__main__':
    generate_manifest()
