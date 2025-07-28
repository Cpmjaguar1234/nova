import re
import sys

def replace_discord_invites(file_path, new_invite_code):
    """Replaces Discord invite links in a file with a new invite code."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Regex to find https://discord.gg/ followed by any characters (the invite code)
        # and replace it with the new invite code
        # This regex is designed to be broad to catch various invite formats
        # It captures the base URL and replaces only the invite part
        updated_content = re.sub(r'https://discord\.gg/[a-zA-Z0-9-]+', f'https://discord.gg/{new_invite_code}', content)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"Successfully replaced Discord invite links in {file_path} with {new_invite_code}")

    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python replace_discord_invites.py <file_path> <new_invite_code>")
    else:
        file_to_modify = sys.argv[1]
        new_code = sys.argv[2]
        replace_discord_invites(file_to_modify, new_code)