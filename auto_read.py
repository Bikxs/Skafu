#!/usr/bin/env python3

import argparse
import os
import random
import tempfile
import markdown
import re
import subprocess

def main():
    """
    This script reads a markdown file, converts it to plain text, and uses piper-tts to
    read it aloud using a randomly selected voice.
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

    selected_voice_name = random.choice(available_voices)
    print(f"Using voice: {selected_voice_name}")

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

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False, dir="./temp") as wav_file:
        piper_executable = ".venv/bin/piper"
        command = [
            piper_executable,
            "--model",
            voice_model_path,
            "--output_file",
            wav_file.name,
        ]

        print(f"Synthesizing speech to '{wav_file.name}'...")
        subprocess.run(command, input=text_content.encode("utf-8"))

        # Check if the file is empty
        if os.path.getsize(wav_file.name) == 0:
            print("Warning: The output audio file is empty. This may indicate an issue with the voice model or the input text.")
        else:
            print(f"Successfully saved audio to {wav_file.name}")


if __name__ == "__main__":
    main()
