# Python Processing Patterns

Common Python patterns for processing video transcripts and metadata.

## VTT Subtitle Cleaning

```python
import re

def clean_vtt(vtt_path):
    """Extract clean text and timestamped entries from VTT file"""

    with open(vtt_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract all text lines (skip metadata)
    lines = []
    for line in content.split('\n'):
        line = line.strip()
        if (line and
            not line.startswith('WEBVTT') and
            not line.startswith('Kind:') and
            not line.startswith('Language:') and
            '-->' not in line and
            'align:' not in line):
            # Clean inline timestamps and tags
            line = re.sub(r'<\d{2}:\d{2}:\d{2}\.\d{3}>', '', line)
            line = re.sub(r'</?c>', '', line)
            line = line.strip()
            if line:
                lines.append(line)

    # Deduplicate consecutive identical lines
    clean_lines = []
    prev = ""
    for line in lines:
        if line != prev:
            clean_lines.append(line)
            prev = line

    return clean_lines

# Usage
lines = clean_vtt('video.en.vtt')
with open('transcript_clean.txt', 'w', encoding='utf-8') as f:
    f.write(' '.join(lines))
```

## Timestamped Extraction

```python
import re

def extract_timestamped(vtt_path):
    """Extract text with timestamps"""

    with open(vtt_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match timestamp lines
    pattern = r'(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})'

    entries = []
    lines = content.split('\n')
    i = 0

    while i < len(lines):
        match = re.match(pattern, lines[i])
        if match:
            start_time = match.group(1)
            # Collect text until next timestamp or empty line
            i += 1
            text_parts = []
            while i < len(lines) and not re.match(pattern, lines[i]) and lines[i].strip():
                text = lines[i].strip()
                # Clean inline tags
                text = re.sub(r'<[^>]+>', '', text)
                if text and not text.startswith('align:'):
                    text_parts.append(text)
                i += 1

            if text_parts:
                entries.append((start_time, ' '.join(text_parts)))
        else:
            i += 1

    # Deduplicate consecutive identical text
    clean_entries = []
    prev_text = ""
    for time, text in entries:
        if text != prev_text:
            clean_entries.append((time, text))
            prev_text = text

    return clean_entries

# Usage
entries = extract_timestamped('video.en.vtt')
with open('transcript_timestamped.txt', 'w', encoding='utf-8') as f:
    for time, text in entries:
        f.write(f"{time} | {text}\n")
```

## Keyword-Based Frame Selection

```python
import re

def find_key_moments(timestamped_file, keywords, max_frames=30):
    """Find timestamps matching keywords"""

    # Read timestamped transcript
    with open(timestamped_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    matches = []
    for line in lines:
        if '|' not in line:
            continue

        timestamp, text = line.split('|', 1)
        timestamp = timestamp.strip()
        text = text.strip().lower()

        # Check if any keyword appears
        if any(kw.lower() in text for kw in keywords):
            matches.append((timestamp, text))

    # Select evenly distributed subset if too many matches
    if len(matches) > max_frames:
        step = len(matches) // max_frames
        matches = matches[::step][:max_frames]

    return matches

# Usage
keywords = [
    'demo', 'example', 'show', 'interface', 'workflow',
    'tool', 'this is', 'here you can see', 'look at',
    'step', 'first', 'then', 'next', 'result'
]

moments = find_key_moments('transcript_timestamped.txt', keywords, max_frames=30)

# Save timestamps for ffmpeg
with open('key_timestamps.txt', 'w') as f:
    for timestamp, _ in moments:
        f.write(f"{timestamp}\n")
```

## Batch Frame Extraction

```python
import subprocess
from pathlib import Path

def extract_frames(video_path, timestamps_file, output_dir='frames'):
    """Extract frames using ffmpeg"""

    Path(output_dir).mkdir(exist_ok=True)

    with open(timestamps_file, 'r') as f:
        timestamps = [line.strip() for line in f.readlines()]

    for i, timestamp in enumerate(timestamps, 1):
        # Convert timestamp to filename-safe format
        safe_time = timestamp.replace(':', '_').replace('.', '_')
        output_file = f"{output_dir}/frame_{i:03d}_{safe_time}.png"

        cmd = [
            'ffmpeg',
            '-ss', timestamp,
            '-i', video_path,
            '-frames:v', '1',
            '-q:v', '2',
            output_file,
            '-y'  # Overwrite without asking
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0:
            print(f"✓ Extracted frame {i}/{len(timestamps)}: {timestamp}")
        else:
            print(f"✗ Failed frame {i}: {timestamp}")

# Usage
extract_frames('video.mp4', 'key_timestamps.txt')
```

## Content Analysis

```python
from collections import Counter
import re

def analyze_content(transcript_file):
    """Analyze video content for topics and structure"""

    with open(transcript_file, 'r', encoding='utf-8') as f:
        text = f.read().lower()

    # Extract common words (simple approach)
    words = re.findall(r'\b\w{4,}\b', text)  # Words 4+ chars

    # Filter out common words
    stopwords = {'this', 'that', 'with', 'from', 'have', 'will', 'your', 'they', 'been', 'were', 'said', 'each', 'about', 'would', 'there', 'their'}
    words = [w for w in words if w not in stopwords]

    # Count frequencies
    word_freq = Counter(words)

    # Identify likely topics (top 20 words)
    topics = word_freq.most_common(20)

    return {
        'word_count': len(words),
        'unique_words': len(set(words)),
        'top_topics': topics
    }

# Usage
analysis = analyze_content('transcript_clean.txt')
print(f"Word count: {analysis['word_count']}")
print(f"Top topics: {[word for word, count in analysis['top_topics'][:10]]}")
```

## Error Handling Best Practices

```python
import sys
from pathlib import Path

def safe_process_vtt(vtt_path):
    """Process VTT with proper error handling"""

    # Check file exists
    if not Path(vtt_path).exists():
        print(f"Error: File not found: {vtt_path}", file=sys.stderr)
        return None

    # Check file size (warn if too large)
    file_size = Path(vtt_path).stat().st_size
    if file_size > 10_000_000:  # 10MB
        print(f"Warning: Large file ({file_size / 1_000_000:.1f}MB), processing may be slow")

    try:
        with open(vtt_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        # Try alternative encoding
        try:
            with open(vtt_path, 'r', encoding='latin-1') as f:
                content = f.read()
        except Exception as e:
            print(f"Error: Cannot read file: {e}", file=sys.stderr)
            return None
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return None

    return content

# Usage
content = safe_process_vtt('video.en.vtt')
if content:
    # Process content...
    pass
```

## Tips

- Always use `encoding='utf-8'` when opening subtitle files
- Check file sizes before processing (use grep/sed for very large files)
- Deduplicate consecutive identical lines (VTT has overlapping repetition)
- Use regex for robust timestamp parsing
- Handle missing/malformed data gracefully
- Quote filenames with spaces when calling ffmpeg via subprocess
