#!/usr/bin/env python3

import argparse
import os
import markdown
import re
import subprocess
from datetime import datetime

def extract_title_from_markdown(md_content):
    """
    Extract the title from markdown content.
    Tries to find the first # header, otherwise uses the first non-empty line.
    """
    lines = md_content.strip().split('\n')
    
    # Look for the first # header
    for line in lines:
        if line.strip().startswith('# '):
            return line.strip()[2:].strip()
    
    # If no # header found, use the first non-empty line
    for line in lines:
        if line.strip():
            return line.strip()
    
    return "untitled"

def sanitize_filename(title, max_length=50):
    """
    Sanitize a title to be used as a filename.
    Removes special characters and limits length.
    """
    # Replace spaces with hyphens
    sanitized = title.lower().replace(' ', '-')
    
    # Remove special characters, keep only alphanumeric and hyphens
    sanitized = re.sub(r'[^a-z0-9\-]', '', sanitized)
    
    # Remove multiple consecutive hyphens
    sanitized = re.sub(r'-+', '-', sanitized)
    
    # Trim hyphens from start and end
    sanitized = sanitized.strip('-')
    
    # Limit length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length].rstrip('-')
    
    # Default to 'untitled' if empty
    return sanitized or 'untitled'

def main():
    """
    This script reads a markdown file, converts it to plain text, and uses piper-tts to
    read it aloud using a user-selected voice.
    
    The output filename is generated from the document title and timestamp.
    """

    # --- Argument Parsing ---
    parser = argparse.ArgumentParser(description="Reads a markdown file aloud using piper-tts.")
    parser.add_argument("markdown_file", help="Path to the markdown file to read.")
    args = parser.parse_args()

    # --- File Validation ---
    if not os.path.exists(args.markdown_file):
        print(f"Error: File not found at '{args.markdown_file}'")
        return

    # --- Markdown to Text ---
    with open(args.markdown_file, "r", encoding="utf-8") as f:
        md_content = f.read()
    
    # Extract title for filename
    title = extract_title_from_markdown(md_content)
    sanitized_title = sanitize_filename(title)
    
    html = markdown.markdown(md_content)
    text_content = re.sub(r'<[^>]+>', '', html)
    

    # --- Voice Selection ---
    voices_dir = os.path.expanduser("~/.piper/voices")
    if not os.path.exists(voices_dir):
        print(f"Error: Piper voices directory not found at '{voices_dir}'")
        print("Please make sure piper-tts is installed and voices are available.")
        return

    available_voices = [
        d for d in os.listdir(voices_dir) if os.path.isdir(os.path.join(voices_dir, d))
    ]

    if not available_voices:
        print(f"Error: No voices found in '{voices_dir}'")
        return

    # Display available voices and let user choose
    print(f"Found {len(available_voices)} available voices:")
    for i, voice in enumerate(available_voices, 1):
        print(f"{i}. {voice}")
    
    while True:
        try:
            choice = input(f"\nSelect a voice (1-{len(available_voices)}): ").strip()
            choice_num = int(choice)
            if 1 <= choice_num <= len(available_voices):
                selected_voice_name = available_voices[choice_num - 1]
                print(f"Selected voice: {selected_voice_name}")
                break
            else:
                print(f"Please enter a number between 1 and {len(available_voices)}")
        except ValueError:
            print("Please enter a valid number")
        except KeyboardInterrupt:
            print("\nOperation cancelled by user")
            return

    # --- Speech Synthesis ---
    voice_model_path = None
    for root, dirs, files in os.walk(os.path.join(voices_dir, selected_voice_name)):
        for file in files:
            if file.endswith(".onnx"):
                voice_model_path = os.path.join(root, file)
                break
        if voice_model_path:
            break

    if not voice_model_path:
        print(f"Error: No .onnx model found for voice '{selected_voice_name}'")
        return

    # Create filename with title and timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"{sanitized_title}_{timestamp}.wav"
    
    # Ensure temp directory exists
    temp_dir = "./temp"
    os.makedirs(temp_dir, exist_ok=True)
    
    output_path = os.path.join(temp_dir, filename)
    
    piper_executable = ".venv/bin/piper"
    command = [
        piper_executable,
        "--model",
        voice_model_path,
        "--output_file",
        output_path,
    ]

    print(f"Synthesizing speech to '{output_path}'...")
    subprocess.run(command, input=text_content.encode("utf-8"))

    # Check if the file is empty
    if os.path.getsize(output_path) == 0:
        print("Warning: The output audio file is empty. This may indicate an issue with the voice model or the input text.")
    else:
        print(f"Successfully saved audio to {output_path}")


if __name__ == "__main__":
    main()
