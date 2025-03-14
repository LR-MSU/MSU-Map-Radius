import os
import htmlmin
import cssmin
import rjsmin
from bs4 import BeautifulSoup

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

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(content, 'html.parser')

    # Minify inline CSS
    for style in soup.find_all('style'):
        if style.string:
            style.string = minify_css(style.string)

    # Minify inline JS
    for script in soup.find_all('script'):
        if script.string:
            script.string = minify_js(script.string)

    # Minify the HTML
    minified_content = minify_html(str(soup))

    # Create the output file path
    base_name, ext = os.path.splitext(file_path)
    output_file_path = f"{base_name}.min{ext}"

    # Write the minified content to the new file
    with open(output_file_path, 'w', encoding='utf-8') as output_file:
        output_file.write(minified_content)

    print(f"Minified file saved as: {output_file_path}")

if __name__ == "__main__":
    # Ask for the relative file path
    file_path = input("Enter the relative path from the project root of the file to minify: ")
    file_path = "../" + file_path

    # Check if the file exists
    if not os.path.exists(file_path):
        print("File not found. Please check the path and try again.")
    else:
        minify_file(file_path)