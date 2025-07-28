import sys

def remove_js_comments(file_path):
    """Removes single-line JavaScript comments (//) from a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        cleaned_lines = []
        for line in lines:
            # Check if the line starts with // after stripping leading whitespace
            if not line.strip().startswith('//'):
                cleaned_lines.append(line)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(cleaned_lines)
        print(f"Successfully removed single-line comments from {file_path}")

    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python remove_js_comments.py <file_path>")
    else:
        file_to_clean = sys.argv[1]
        remove_js_comments(file_to_clean)