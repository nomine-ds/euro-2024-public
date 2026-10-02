# app/data/loader.py
import json
import time
import pandas as pd
from statsbombpy import sb
from app.core.config import DATA_DIR, COMPETITION_ID, SEASON_ID

# FUNGSI BANTUAN: Nan -> None (biar JSON ga error)
def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    elif isinstance(obj, float):
        if obj != obj:  # NaN
            return None
        return obj
    elif pd.isna(obj):
        return None
    else:
        return obj

def fetch_matches():
    path = DATA_DIR / "matches.json"
    
    if path.exists():
        print("✅ Muat matches dari cache (local).")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return pd.DataFrame(data)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            print(f"⚠️ File matches.json corrupt atau encoding salah: {e}")
            print("🔄 Hapus file dan coba download ulang...")
            path.unlink()  # hapus file corrupt
            # Lanjut ke download ulang
    
    print("📡 Ambil matches dari API StatsBomb...")
    try:
        df = sb.matches(competition_id=COMPETITION_ID, season_id=SEASON_ID)
        clean_data = clean_nan(df.to_dict(orient='records'))
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(clean_data, f, indent=2, ensure_ascii=False)
        print(f"✅ {len(df)} matches tersimpan.")
        return df
    except Exception as e:
        print(f"❌ Gagal ambil matches: {e}")
        return pd.DataFrame()

def safe_fetch_events(match_id, retry=1):
    for attempt in range(retry + 1):
        try:
            time.sleep(0.5)
            df = sb.events(match_id=match_id)
            return df
        except Exception as e:
            if attempt < retry:
                print(f"  ⚠️ Match {match_id} error, coba ulang... ({e})")
                time.sleep(2)
            else:
                print(f"  ❌ Match {match_id} gagal total: {e}")
                return None

def fetch_all_events(force=False):
    all_path = DATA_DIR / "all_events.json"
    
    if all_path.exists() and not force:
        try:
            print("✅ Muat all_events dari cache.")
            return pd.read_json(all_path, orient="records")
        except Exception as e:
            print(f"⚠️ all_events.json corrupt, download ulang... ({e})")
            all_path.unlink()
    
    print("🚀 Tarik semua event dari API... (ini butuh beberapa menit)")
    
    matches_df = fetch_matches()
    if matches_df.empty:
        print("❌ Gagal dapat daftar match.")
        return pd.DataFrame()
    
    all_dfs = []
    total = len(matches_df)
    for i, row in matches_df.iterrows():
        mid = row['match_id']
        print(f"  [{(i+1)}/{total}] Ambil match {mid}...")
        df = safe_fetch_events(mid)
        
        if df is not None and not df.empty:
            df['match_id'] = mid
            all_dfs.append(df)
            
            # Simpan per-match (dengan encoding)
            per_match_path = DATA_DIR / f"match_{mid}.json"
            clean_data = clean_nan(df.to_dict(orient='records'))
            with open(per_match_path, 'w', encoding='utf-8') as f:
                json.dump(clean_data, f, indent=2, ensure_ascii=False)
    
    if not all_dfs:
        print("❌ Tidak ada data sama sekali!")
        return pd.DataFrame()
    
    final_df = pd.concat(all_dfs, ignore_index=True)
    clean_final = clean_nan(final_df.to_dict(orient='records'))
    with open(all_path, 'w', encoding='utf-8') as f:
        json.dump(clean_final, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Total {len(final_df)} events berhasil disimpan.")
    return final_df

def load_or_fetch_all():
    events_df = fetch_all_events(force=False)
    matches_df = fetch_matches()
    return events_df, matches_df


if __name__ == "__main__":
    print("🔥 Manual fetch: Memaksa refresh semua data...")
    fetch_all_events(force=True)