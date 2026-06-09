#!/usr/bin/env python3
"""
Seed a FULL demo lesson into Prime Academy via the API.
Creates one lesson with every block type + every theory callout + a markdown table,
so you can visually check all styles in /lesson-view/<id>, the builder, and the class.

HOW TO RUN
----------
1) pip install requests
2) Get your admin token:
   - log in to the app in the browser
   - DevTools -> Application -> Local Storage -> copy the value of "token"
3) Put it below (TOKEN = "...") OR set env var:  export PA_TOKEN="..."
   Optionally set API base:                       export PA_API="http://localhost:8000"
4) python seed_full_lesson.py
"""

import os
import sys
import requests

API = os.environ.get("PA_API", "http://localhost:8000")
TOKEN = os.environ.get("PA_TOKEN", "").strip() or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiYXVkIjpbImZhc3RhcGktdXNlcnM6YXV0aCJdLCJleHAiOjE3ODEwNDYwNTR9.kEuRngwpyfl5t70Ed4QSrMnv3B8bt3-7Qr51ZilNEu8"

# Optional fallback login (adjust if your auth route differs)
EMAIL = os.environ.get("PA_EMAIL", "")
PASSWORD = os.environ.get("PA_PASSWORD", "")

# Public sample media (native <audio>/<video>)
AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4"


def login_if_needed():
    global TOKEN
    if TOKEN and TOKEN != "PASTE_YOUR_TOKEN_HERE":
        return
    if not (EMAIL and PASSWORD):
        sys.exit("No token. Set TOKEN in the file, or PA_TOKEN, or PA_EMAIL+PA_PASSWORD.")
    r = requests.post(
        f"{API}/auth/jwt/login",
        data={"username": EMAIL, "password": PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    r.raise_for_status()
    TOKEN = r.json()["access_token"]


def H():
    return {"Authorization": f"Bearer {TOKEN}"}


def post(path, payload):
    r = requests.post(f"{API}{path}", json=payload, headers=H())
    if r.status_code >= 300:
        sys.exit(f"POST {path} -> {r.status_code}: {r.text}")
    return r.json()


def make_section(lesson_id, title, order, kind="general"):
    return post("/sections/", {"lesson_id": lesson_id, "title": title, "kind": kind, "order": order})["id"]


def make_block(section_id, order, **kw):
    payload = {
        "section_id": section_id,
        "order": order,
        "block_type": kw.get("block_type", "task"),
        "content": kw.get("content"),
        "callout_style": kw.get("callout_style"),
        "task_type": kw.get("task_type"),
        "title": kw.get("title"),
        "description": kw.get("description"),
        "media_url": kw.get("media_url"),
        "word_list": kw.get("word_list"),
        "config": kw.get("config"),
        "questions": kw.get("questions", []),
    }
    return post("/blocks/", payload)


def main():
    login_if_needed()

    # 1) Lesson
    lesson = post("/lessons/lessons", {"title": "Past Simple — talking about the past", "level": "B1"})
    lid = lesson["id"]
    print(f"Lesson created: id={lid}")

    # ============ SECTION 1: Theory ============
    s1 = make_section(lid, "Intro & Theory", 0)

    make_block(
        s1, 0, block_type="theory", callout_style="note",
        content="## Past Simple\nFor most verbs add **-ed**.\n\n`worked`  ·  `played`  ·  `studied`",
    )
    make_block(
        s1, 1, block_type="theory", callout_style="none",
        content=(
            "### How it works\n"
            "Structure: **subject** + **verb + ed** + rest.\n\n"
            "- I `worked` late yesterday.\n"
            "- They `played` football on Sunday.\n\n"
            "Use it for finished actions in the past."
        ),
    )
    make_block(
        s1, 2, block_type="theory", callout_style="warning",
        content="**Watch out: irregular verbs.** Many common verbs don't take -ed: go → **went**, see → **saw**, have → **had**.",
    )
    make_block(
        s1, 3, block_type="theory", callout_style="none",
        content=(
            "### Forms\n\n"
            "| Positive | Negative | Question |\n"
            "|---|---|---|\n"
            "| I worked | I didn't work | Did you work? |\n"
            "| She went | She didn't go | Did she go? |\n"
        ),
    )
    make_block(
        s1, 4, block_type="theory", callout_style="example",
        content="**Example:** Last year I `travelled` to Spain and `visited` three cities.",
    )
    make_block(
        s1, 5, block_type="theory", callout_style="tip",
        content="**Tip:** add **-d** (not -ed) to verbs already ending in -e: live → `lived`, love → `loved`.",
    )

    # ============ SECTION 2: Practice ============
    s2 = make_section(lid, "Practice", 1)

    make_block(
        s2, 0, task_type="multiple_choice", title="Choose the correct form",
        questions=[{
            "question_text": "We ___ to the cinema last night.",
            "options": {"a": "goed", "b": "went", "c": "going"},
            "correct_answer": "b",
            "explanation": "‘go’ is irregular: go → went.",
            "order": 0,
        }],
    )
    make_block(
        s2, 1, task_type="true_false", title="True or False",
        questions=[{
            "question_text": "“He goed home early.” — this sentence is correct.",
            "options": None,
            "correct_answer": "False",
            "explanation": "The past of ‘go’ is ‘went’.",
            "order": 0,
        }],
    )
    make_block(
        s2, 2, task_type="gap_fill", title="Complete the sentence",
        questions=[{
            "question_text": "Last summer we ___ to Spain.",
            "options": {"a": "travelled", "b": "travel", "c": "travelling"},
            "correct_answer": "a",
            "explanation": "Past simple: travel → travelled.",
            "order": 0,
        }],
    )
    make_block(
        s2, 3, task_type="short_answer", title="Write the past form",
        questions=[{
            "question_text": "What is the Past Simple of the verb “see”?",
            "options": None,
            "correct_answer": "saw",
            "explanation": "see → saw.",
            "order": 0,
        }],
    )
    make_block(
        s2, 4, task_type="ordering", title="Put the words in order",
        config={"items": ["I", "watched", "a film", "yesterday"]},
    )
    make_block(
        s2, 5, task_type="matching", title="Match base form with past form",
        config={"pairs": [
            {"left": "go", "right": "went"},
            {"left": "have", "right": "had"},
            {"left": "see", "right": "saw"},
        ]},
    )

    # ============ SECTION 3: Listening / Video / Writing ============
    s3 = make_section(lid, "Listening, Video & Writing", 2)

    make_block(
        s3, 0, task_type="listening", title="Listen and answer", media_url=AUDIO_URL,
        questions=[{
            "question_text": "Where did the speaker go on Sunday?",
            "options": {"a": "the cinema", "b": "the park", "c": "the seaside"},
            "correct_answer": "b",
            "order": 0,
        }],
    )
    make_block(
        s3, 1, task_type="video", title="Watch the clip", media_url=VIDEO_URL,
        questions=[{
            "question_text": "What did the main character do first?",
            "options": {"a": "woke up", "b": "ate breakfast"},
            "correct_answer": "a",
            "order": 0,
        }],
    )
    make_block(
        s3, 2, task_type="writing", title="Your turn",
        description="Write 3 sentences about your last weekend using the Past Simple.",
    )

    # ============ SECTION 4: Homework ============
    s4 = make_section(lid, "Homework", 3, kind="homework")

    make_block(
        s4, 0, task_type="gap_fill", title="HW · Complete",
        questions=[{
            "question_text": "Yesterday she ___ (study) for the exam.",
            "options": None,
            "correct_answer": "studied",
            "order": 0,
        }],
    )
    make_block(
        s4, 1, task_type="writing", title="HW · Short essay",
        description="Write 5 sentences about a trip you took. Use at least 3 irregular verbs.",
    )

    print("\nDONE ✅")
    print(f"  Builder : {API.replace(':8000','')}/lesson-builder/{lid}")
    print(f"  Preview : {API.replace(':8000','')}/lesson-view/{lid}")
    print("  (use your frontend origin, e.g. http://localhost:5173/lesson-view/%d)" % lid)


if __name__ == "__main__":
    main()