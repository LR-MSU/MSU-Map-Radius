import os
import htmlmin
import cssmin
import rjsmin

def minify_html(html_content):
    return htmlmin.minify(html_content, remove_comments=True, remove_empty_space=True)

def minify_css(css_content):
    return cssmin.cssmin(css_content)

def minify_js(js_content):
    return rjsmin.jsmin(js_content)

def minify_file(file_path):
    # Read the file content
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()

    # Minify HTML, CSS, and JS
    minified_content = minify_html(content)
    minified_content = minify_css(minified_content)
    minified_content = minify_js(minified_content)

    # Create the output file path
    base_name, ext = os.path.splitext(file_path)
    output_file_path = f"{base_name}.min{ext}"

    # Write the minified content to the new file
    with open(output_file_path, 'w', encoding='utf-8') as output_file:
        output_file.write(minified_content)

    print(f"Minified file saved as: {output_file_path}")

if __name__ == "__main__":
    # Ask for the relative file path
    file_path = input("Enter the relative path of the file to minify: ")

    # Check if the file exists
    if not os.path.exists(file_path):
        print("File not found. Please check the path and try again.")
    else:
        minify_file(file_path)