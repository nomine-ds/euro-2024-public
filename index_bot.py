# index_bot.py
"""
Smart indexing: prioritas Shot + sample proporsional per match.
NaN-proof + debug missing match_ids.
Sample rate: 300 events/match (bukan 30).
"""
import sys
import pandas as pd
import math

print("=" * 60)
print("🤖 SMART INDEXING - Hudl Bot")
print("=" * 60)


# ===================================================================
# HELPER FUNCTIONS (NaN-proof)
# ===================================================================
def fix_encoding(text):
    if not isinstance(text, str):
        return text
    try:
        return text.encode('latin-1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError, AttributeError):
        return text


def safe_str(val, default="Unknown"):
    if val is None:
        return default
    if isinstance(val, float) and math.isnan(val):
        return default
    if isinstance(val, dict):
        name = val.get("name")
        if name is None or (isinstance(name, float) and math.isnan(name)):
            return default
        return fix_encoding(str(name))
    if isinstance(val, str):
        return fix_encoding(val)
    return str(val)


def safe_int(val, default=0):
    if val is None:
        return default
    if isinstance(val, float) and math.isnan(val):
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def safe_float(val, default=0.0):
    if val is None:
        return default
    if isinstance(val, float) and math.isnan(val):
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def get_event_type(typ):
    if isinstance(typ, dict):
        return typ.get("name", "Unknown")
    if isinstance(typ, str):
        return typ
    return "Unknown"


# ===================================================================
# Step 1: Load events
# ===================================================================
print("\n📚 Step 1: Load events...")
try:
    from app.data.loader import load_or_fetch_all
    EVENTS_DF, MATCHES_DF = load_or_fetch_all()
    if EVENTS_DF is None or EVENTS_DF.empty:
        print("❌ EVENTS_DF kosong.")
        sys.exit(1)
    print(f"✅ Loaded {len(EVENTS_DF)} events.")
except Exception:
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ===================================================================
# Step 2: Build match lookup
# ===================================================================
print("\n📋 Step 2: Build match lookup...")
match_lookup = {}
if MATCHES_DF is not None and not MATCHES_DF.empty:
    for _, m in MATCHES_DF.iterrows():
        try:
            mid = int(m.get('match_id') or 0)
        except (ValueError, TypeError):
            continue

        home = m.get('home_team')
        away = m.get('away_team')
        stage = m.get('competition_stage')

        home_name = "Unknown"
        if isinstance(home, dict):
            home_name = home.get('home_team_name') or home.get('name') or "Unknown"
        elif isinstance(home, str):
            home_name = home
        home_name = fix_encoding(home_name)

        away_name = "Unknown"
        if isinstance(away, dict):
            away_name = away.get('away_team_name') or away.get('name') or "Unknown"
        elif isinstance(away, str):
            away_name = away
        away_name = fix_encoding(away_name)

        if isinstance(stage, dict):
            stage_name = stage.get('name', 'Unknown')
        else:
            stage_name = safe_str(stage, 'Unknown')

        match_lookup[mid] = {
            'home': home_name,
            'away': away_name,
            'stage': stage_name,
            'score': f"{m.get('home_score', 0)}-{m.get('away_score', 0)}",
        }

print(f"✅ Loaded {len(match_lookup)} match info.")

event_mids = set()
for v in EVENTS_DF['match_id'].dropna().unique():
    try:
        event_mids.add(int(v))
    except (ValueError, TypeError):
        pass

lookup_mids = set(match_lookup.keys())
missing = event_mids - lookup_mids

# ===================================================================
# Step 3: Filter event penting
# ===================================================================
print("\n🔨 Step 3: Filter event penting...")

IMPORTANT_TYPES = {
    "Shot", "Own Goal Against", "Own Goal For",
    "Dribble", "Dribbled Past",
    "Foul Committed", "Foul Won",
    "Substitution", "Bad Behaviour",
    "Interception", "Block", "Clearance",
    "Goalkeeper", "Error", "Miscontrol",
    "Ball Recovery", "Duel", "50/50",
}

df = EVENTS_DF.copy()
df['event_type_str'] = df['type'].apply(get_event_type)
df = df[df['event_type_str'].isin(IMPORTANT_TYPES)]
df = df[df['player'].notna()]
df = df[df['minute'].notna()]
print(f"✅ Setelah filter: {len(df)} event penting.")

# ===================================================================
# Step 4: Strategi prioritas Shot + Sample Proporsional
# ===================================================================
print("\n🎯 Step 4: Strategi prioritas Shot + sample per match...")

SAMPLE_PER_MATCH = 300  # 🔥 UBAH DARI 30 KE 300

shots = df[df['event_type_str'].isin(['Shot', 'Own Goal Against', 'Own Goal For'])].copy()
print(f"   📌 Shot: {len(shots)} events")


def has_card(row):
    foul = row.get('foul_committed')
    return isinstance(foul, dict) and isinstance(foul.get('card'), dict)


card_fouls = df[df.apply(has_card, axis=1)].copy()
print(f"   📌 Foul dengan Kartu: {len(card_fouls)} events")

subs = df[df['event_type_str'] == 'Substitution'].copy()
print(f"   📌 Substitution: {len(subs)} events")

exclude_ids = set(shots.index) | set(card_fouls.index) | set(subs.index)
other = df[~df.index.isin(exclude_ids)]
other_sampled = (
    other.groupby('match_id', group_keys=False)
    .apply(lambda x: x.sample(n=min(SAMPLE_PER_MATCH, len(x)), random_state=42))
    .reset_index(drop=True)
)
print(f"   📌 Sample lain ({SAMPLE_PER_MATCH}/match): {len(other_sampled)} events")

sample = pd.concat([shots, card_fouls, subs, other_sampled], ignore_index=True)
sample = sample.drop_duplicates(subset=['id']).reset_index(drop=True)
print(f"\n   ✅ Total events untuk indexing: {len(sample)}")

# ===================================================================
# Step 5: Load embedding model
# ===================================================================
print("\n🔍 Step 5: Load embedding model...")
try:
    from fastembed import TextEmbedding
    EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embedder = TextEmbedding(model_name=EMBED_MODEL)
    print(f"✅ Embedding model loaded: {EMBED_MODEL}")
except Exception:
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ===================================================================
# Step 6: Init ChromaDB (fresh)
# ===================================================================
print("\n💾 Step 6: Init ChromaDB...")
try:
    import chromadb
    client = chromadb.PersistentClient(path="./data/chroma_db")
    try:
        client.delete_collection("euro2024_events")
        print("🗑️ Collection lama dihapus.")
    except Exception:
        print("ℹ️ Tidak ada collection lama.")
    collection = client.get_or_create_collection(name="euro2024_events")
    print("✅ ChromaDB ready (fresh).")
except Exception:
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ===================================================================
# Step 7: Build dokumen (NaN-PROOF)
# ===================================================================
print("\n🔨 Step 7: Build documents...")


def build_text(row):
    try:
        event_type = safe_str(row.get("event_type_str"), "Unknown")
        player = safe_str(row.get("player"), "Unknown Player")
        team = safe_str(row.get("team"), "Unknown Team")
        minute = safe_int(row.get("minute"), 0)
        second = safe_int(row.get("second"), 0)

        try:
            mid = int(row.get("match_id") or 0)
        except (ValueError, TypeError):
            mid = 0

        match = match_lookup.get(mid, {})
        home = match.get('home', '?')
        away = match.get('away', '?')
        stage = match.get('stage', '?')
        score = match.get('score', '?')

        text = f"[{stage}] {home} vs {away} ({score}) - Menit {minute}:{second:02d} - {player} ({team}) {event_type}"

        if event_type in ("Shot", "Own Goal Against", "Own Goal For"):
            shot = row.get("shot")
            if isinstance(shot, dict):
                outcome = safe_str(shot.get("outcome"), "Unknown")
                xg = safe_float(shot.get("statsbomb_xg"), 0.0)
                body = safe_str(shot.get("body_part"), "-")
                text += f" | Hasil: {outcome}, xG: {xg:.2f}, Bagian: {body}"
        elif event_type == "Substitution":
            sub = row.get("substitution")
            if isinstance(sub, dict):
                replacement = safe_str(sub.get("replacement"), "Unknown")
                outcome = safe_str(sub.get("outcome"), "Unknown")
                text += f" | Diganti: {replacement} ({outcome})"
        elif event_type == "Dribble":
            dribble = row.get("dribble")
            if isinstance(dribble, dict):
                outcome = safe_str(dribble.get("outcome"), "Unknown")
                text += f" | Hasil: {outcome}"
        elif event_type == "Foul Committed":
            foul = row.get("foul_committed")
            if isinstance(foul, dict):
                card = foul.get("card")
                if isinstance(card, dict):
                    text += f" | Kartu: {card.get('name', 'Unknown')}"

        return text
    except Exception as e:
        print(f"   ⚠️ build_text ERROR: {type(e).__name__}: {e}")
        return ""


ids, documents, metadatas = [], [], []
skipped = 0

for idx, row in sample.iterrows():
    row_dict = row.to_dict()
    text = build_text(row_dict)
    if not text:
        skipped += 1
        continue

    ev_id = str(row_dict.get("id") or f"ev_{idx}")

    try:
        mid = int(row_dict.get("match_id") or 0)
    except (ValueError, TypeError):
        mid = 0

    match_info = match_lookup.get(mid, {})

    ids.append(ev_id)
    documents.append(text)
    metadatas.append({
        "event_id": ev_id,
        "match_id": mid,
        "event_type": safe_str(row_dict.get("event_type_str"), "Unknown"),
        "player": safe_str(row_dict.get("player"), "Unknown"),
        "team": safe_str(row_dict.get("team"), "Unknown"),
        "minute": safe_int(row_dict.get("minute"), 0),
        "stage": match_info.get("stage", "Unknown"),
        "home_team": match_info.get("home", "Unknown"),
        "away_team": match_info.get("away", "Unknown"),
        "score": match_info.get("score", "?-?"),
    })

print(f"   📊 Sample awal: {len(sample)}")
print(f"   🗑️ Skip (empty text): {skipped}")
print(f"   ✅ Siap di-index: {len(ids)}")

if len(ids) == 0:
    print("❌ Tidak ada event valid.")
    sys.exit(1)

# ===================================================================
# Step 8: Generate embeddings & upload
# ===================================================================
print(f"\n🧠 Step 8: Generating embeddings untuk {len(ids)} events...")
print("   (5-15 menit untuk 17k events, JANGAN Ctrl+C)")
try:
    batch_size = 100
    total_batches = (len(ids) - 1) // batch_size + 1
    uploaded = 0

    for i in range(0, len(ids), batch_size):
        batch_texts = documents[i:i+batch_size]
        batch_ids = ids[i:i+batch_size]
        batch_meta = metadatas[i:i+batch_size]

        embeddings = [e.tolist() for e in embedder.embed(batch_texts)]

        collection.add(
            ids=batch_ids,
            documents=batch_texts,
            embeddings=embeddings,
            metadatas=batch_meta,
        )
        uploaded += len(batch_ids)
        if (i // batch_size + 1) % 10 == 0 or uploaded == len(ids):
            print(f"   ✅ Batch {i // batch_size + 1}/{total_batches} ({uploaded}/{len(ids)})")

    actual_count = collection.count()
    print(f"\n🎉 SELESAI! Prepared {len(ids)}, ChromaDB count: {actual_count}")

    if actual_count != len(ids):
        print(f"⚠️ MISMATCH! Prepared {len(ids)} tapi ChromaDB {actual_count}")
    else:
        print("   ✅ Jumlah sesuai!")

except Exception:
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ===================================================================
# Step 9: Test search
# ===================================================================
print("\n🔎 Step 9: Test search...")
queries = [
    "Siapa yang mencetak gol di final Euro 2024?",
    "Gol kemenangan di final",
    "Kartu merah",
    "Gol Spanyol",
    "Penalti",
]
for q in queries:
    try:
        qv = [e.tolist() for e in embedder.embed([q])][0]
        results = collection.query(query_embeddings=[qv], n_results=3)
        print(f"\n📝 Query: '{q}'")
        for i, doc in enumerate(results["documents"][0]):
            print(f"   {i+1}. {doc[:150]}")
    except Exception as e:
        print(f"   ⚠️ Error: {e}")

print("\n" + "=" * 60)
print("✅ DONE.")
print("=" * 60)