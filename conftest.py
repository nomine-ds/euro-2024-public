# conftest.py — pytest configuration
# Ensures `app` package is importable from any test location.
import sys
from pathlib import Path

# Add project root to sys.path
ROOT = Path(__file__).parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))