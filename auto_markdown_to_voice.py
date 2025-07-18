#!/usr/bin/env python3

import argparse
import os
import random
import markdown
import re
import subprocess
from datetime import datetime
from pathlib import Path
from tqdm import tqdm

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

def sanitize_filename(title, max_length=80):
    """
    Sanitize a title to be used as a filename.
    Preserves original case and spaces, only removes filesystem-problematic characters.
    """
    # Remove only filesystem-problematic characters
    # Keep: letters, numbers, spaces, hyphens, underscores, periods, parentheses
    sanitized = re.sub(r'[<>:"/\\|?*]', '', title)
    
    # Replace multiple consecutive spaces with single space
    sanitized = re.sub(r'\s+', ' ', sanitized)
    
    # Trim whitespace from start and end
    sanitized = sanitized.strip()
    
    # Limit length (keeping more characters since we preserve formatting)
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length].rstrip()
    
    # Default to 'untitled' if empty
    return sanitized or 'untitled'

def find_markdown_files(path):
    """
    Find all markdown files in the given path.
    If path is a file, return it as a list.
    If path is a directory, return all .md files in it.
    """
    path_obj = Path(path)
    
    if path_obj.is_file():
        if path_obj.suffix.lower() in ['.md', '.markdown']:
            return [path_obj]
        else:
            return []
    elif path_obj.is_dir():
        markdown_files = []
        for ext in ['*.md', '*.markdown']:
            markdown_files.extend(path_obj.glob(ext))
        return sorted(markdown_files)
    else:
        return []

def compact_voice_name_for_filename(voice_name):
    """
    Extract the distinctive part of a voice name for use in filenames.
    Removes language codes (en_US, en_GB, etc.) and quality indicators (high, medium, low).
    
    Examples:
    - en_US-lessac-high -> lessac
    - en_GB-vctk-medium -> vctk  
    - en_US-ljspeech-high -> ljspeech
    - en_GB-semaine-medium -> semaine
    """
    # Remove language codes (en_US, en_GB, etc.)
    name = re.sub(r'^[a-z]{2}_[A-Z]{2}-', '', voice_name)
    
    # Remove quality indicators (high, medium, low) from the end
    name = re.sub(r'-(high|medium|low)$', '', name)
    
    # Clean any remaining special characters for filename safety
    name = re.sub(r'[^a-zA-Z0-9\-_]', '-', name)
    
    # If nothing remains, use original voice name as fallback
    return name if name else voice_name

def get_voice_model_path(voices_dir, voice_name):
    """
    Get the path to the voice model file for a given voice name.
    Returns the model path if found, None otherwise.
    """
    for root, dirs, files in os.walk(os.path.join(voices_dir, voice_name)):
        for file in files:
            if file.endswith(".onnx"):
                return os.path.join(root, file)
    return None

def process_single_file(file_path, voice_name, voices_dir, piper_executable):
    """
    Process a single markdown file and convert it to audio.
    Returns (success, result, voice_used) tuple.
    """
    try:
        # Get voice model path
        voice_model_path = get_voice_model_path(voices_dir, voice_name)
        if not voice_model_path:
            return False, f"No .onnx model found for voice '{voice_name}'", voice_name
        
        # Read and process markdown content
        with open(file_path, "r", encoding="utf-8") as f:
            md_content = f.read()
        
        # Extract title for filename
        title = extract_title_from_markdown(md_content)
        sanitized_title = sanitize_filename(title)
        
        # Convert markdown to text
        html = markdown.markdown(md_content)
        text_content = re.sub(r'<[^>]+>', '', html)
        
        # Skip empty files
        if not text_content.strip():
            return False, f"File {file_path.name} is empty or contains no text content", voice_name
        
        # Create filename with title, voice name, and timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        # Clean and compact voice name for filename
        compact_voice_name = compact_voice_name_for_filename(voice_name)
        filename = f"{sanitized_title} [{compact_voice_name.upper()}] {timestamp}.wav"
        
        # Ensure temp directory exists
        temp_dir = "./temp"
        os.makedirs(temp_dir, exist_ok=True)
        
        output_path = os.path.join(temp_dir, filename)
        
        # Prepare piper command
        command = [
            piper_executable,
            "--model",
            voice_model_path,
            "--output_file",
            output_path,
        ]
        
        # Run piper TTS
        result = subprocess.run(command, input=text_content.encode("utf-8"), 
                              capture_output=True, text=False)
        
        # Check if synthesis was successful
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True, output_path, voice_name
        else:
            # Convert stderr bytes to string if needed
            stderr_msg = result.stderr.decode('utf-8') if isinstance(result.stderr, bytes) else result.stderr
            return False, f"Error processing {file_path.name}: {stderr_msg}", voice_name
            
    except Exception as e:
        return False, f"Error processing {file_path.name}: {str(e)}", voice_name

def main():
    """
    This script reads a markdown file or folder, converts it to plain text, and uses piper-tts to
    read it aloud using a randomly selected voice (or user-selected with --ask-voice).
    
    If a folder is provided, it processes all markdown files in that folder.
    The output filename is generated from the document title and timestamp.
    """

    # --- Argument Parsing ---
    parser = argparse.ArgumentParser(description="Reads markdown file(s) aloud using piper-tts.")
    parser.add_argument("path", help="Path to the markdown file or folder containing markdown files.")
    parser.add_argument("--ask-voice", action="store_true", 
                        help="Ask user to select voice instead of using random selection")
    args = parser.parse_args()

    # --- Path Validation ---
    if not os.path.exists(args.path):
        print(f"Error: Path not found at '{args.path}'")
        return

    # --- Find Markdown Files ---
    markdown_files = find_markdown_files(args.path)
    
    if not markdown_files:
        if os.path.isfile(args.path):
            print(f"Error: '{args.path}' is not a markdown file (.md or .markdown)")
        else:
            print(f"Error: No markdown files found in '{args.path}'")
        return

    print(f"Found {len(markdown_files)} markdown file(s) to process")

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

    # Voice selection based on --ask-voice flag and file count
    if args.ask_voice:
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
                    use_random_voices = False
                    break
                else:
                    print(f"Please enter a number between 1 and {len(available_voices)}")
            except ValueError:
                print("Please enter a valid number")
            except KeyboardInterrupt:
                print("\nOperation cancelled by user")
                return
    else:
        # For single file, use one random voice
        # For multiple files, use different random voices
        if len(markdown_files) == 1:
            selected_voice_name = random.choice(available_voices)
            print(f"Using random voice: {selected_voice_name}")
            use_random_voices = False
        else:
            print(f"Using random voices for {len(markdown_files)} files (different voice for each file)")
            use_random_voices = True
            selected_voice_name = None  # Will be selected per file

    # --- Process Files with Progress Bar ---
    piper_executable = ".venv/bin/piper"
    successful_files = []
    failed_files = []

    if use_random_voices:
        print(f"\nProcessing {len(markdown_files)} file(s) with randomized voices...")
    else:
        print(f"\nProcessing {len(markdown_files)} file(s) with voice '{selected_voice_name}'...")
    
    with tqdm(total=len(markdown_files), desc="Processing files", unit="file") as pbar:
        for file_path in markdown_files:
            # Select voice for this file
            if use_random_voices:
                current_voice = random.choice(available_voices)
            else:
                current_voice = selected_voice_name
            
            pbar.set_description(f"Processing {file_path.name} ({current_voice})")
            
            success, result, voice_used = process_single_file(file_path, current_voice, voices_dir, piper_executable)
            
            if success:
                successful_files.append((file_path.name, result, voice_used))
                pbar.set_postfix({"Status": "✓ Success", "Voice": voice_used})
            else:
                failed_files.append((file_path.name, result, voice_used))
                pbar.set_postfix({"Status": "✗ Failed", "Voice": voice_used})
            
            pbar.update(1)

    # --- Summary ---
    print(f"\n{'='*60}")
    print(f"PROCESSING SUMMARY")
    print(f"{'='*60}")
    print(f"Total files processed: {len(markdown_files)}")
    print(f"Successful: {len(successful_files)}")
    print(f"Failed: {len(failed_files)}")
    
    if successful_files:
        print(f"\n✅ Successfully processed files:")
        for filename, output_path, voice_used in successful_files:
            print(f"  • {filename} → {output_path} (Voice: {voice_used})")
    
    if failed_files:
        print(f"\n❌ Failed to process files:")
        for filename, error, voice_used in failed_files:
            print(f"  • {filename}: {error} (Voice: {voice_used})")
    
    if use_random_voices and successful_files:
        # Show voice usage statistics
        voice_usage = {}
        for _, _, voice_used in successful_files:
            voice_usage[voice_used] = voice_usage.get(voice_used, 0) + 1
        
        print(f"\n🎤 Voice usage statistics:")
        for voice, count in sorted(voice_usage.items()):
            print(f"  • {voice}: {count} file(s)")
    
    print(f"\nAll audio files saved in: ./temp/")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
