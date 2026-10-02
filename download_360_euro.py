# download_360_euro.py
import requests
import json
from pathlib import Path

DATA_DIR = Path("./data/raw")
THREE_SIXTY_DIR = DATA_DIR / "three-sixty"
THREE_SIXTY_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"

def get_euro2024_match_ids():
    matches_path = DATA_DIR / "matches.json"
    if not matches_path.exists():
        print("❌ matches.json tidak ditemukan")
        return []
    
    with open(matches_path, 'r', encoding='utf-8') as f:
        matches = json.load(f)
    
    ids = [m['match_id'] for m in matches]
    print(f"✅ Total match Euro 2024: {len(ids)}")
    return ids

def download_360(match_id):
    url = f"{BASE_URL}/three-sixty/{match_id}.json"
    local_path = THREE_SIXTY_DIR / f"{match_id}.json"
    
    if local_path.exists():
        size_mb = local_path.stat().st_size / (1024 * 1024)
        print(f"   ⏭️ Skip {match_id} (sudah ada, {size_mb:.1f} MB)")
        return 'skip'
    
    try:
        print(f"   ⬇️ Download {match_id}...")
        res = requests.get(url, timeout=60)
        if res.status_code == 200:
            with open(local_path, 'w', encoding='utf-8') as f:
                f.write(res.text)
            size_mb = len(res.content) / (1024 * 1024)
            print(f"   ✅ {match_id} OK ({size_mb:.1f} MB)")
            return 'success'
        elif res.status_code == 404:
            print(f"   ⚠️ {match_id} tidak punya 360 data di StatsBomb")
            return 'not_found'
        else:
            print(f"   ❌ {match_id} HTTP {res.status_code}")
            return 'failed'
    except Exception as e:
        print(f"   ❌ {match_id} error: {e}")
        return 'failed'

if __name__ == "__main__":
    ids = get_euro2024_match_ids()
    if not ids:
        exit(1)
    
    print(f"\n📥 Download {len(ids)} file 360 (skip yang sudah ada)...")
    print("(Setiap file ~1-15 MB, total ~100-500 MB)")
    print("(Butuh 5-20 menit)\n")
    
    stats = {'success': 0, 'skip': 0, 'not_found': 0, 'failed': 0}
    failed_ids = []
    
    for i, mid in enumerate(ids, 1):
        print(f"[{i}/{len(ids)}] Match {mid}")
        result = download_360(mid)
        stats[result] += 1
        if result == 'failed':
            failed_ids.append(mid)
    
    print("\n🎉 SELESAI!")
    print(f"   ✅ Success: {stats['success']}")
    print(f"   ⏭️ Skip: {stats['skip']}")
    print(f"   ⚠️ Not found: {stats['not_found']}")
    print(f"   ❌ Failed: {stats['failed']}")
    
    if failed_ids:
        print(f"\n❌ Gagal: {failed_ids}")
        print("Jalankan ulang script untuk retry.")