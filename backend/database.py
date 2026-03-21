import sqlite3
from dotenv import load_dotenv
import os
load_dotenv()

DATABASE_FILE = "railway.db"

def get_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def create_tables():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            emp_id      TEXT    UNIQUE NOT NULL,
            name        TEXT    NOT NULL,
            email       TEXT    UNIQUE NOT NULL,
            password    TEXT    NOT NULL,
            role        TEXT    NOT NULL DEFAULT 'Pending',
            division    TEXT    NOT NULL DEFAULT 'Southern Railway',
            phone       TEXT    DEFAULT '',
            status      TEXT    NOT NULL DEFAULT 'pending',
            created_at  TEXT    DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()
    print("✅ Database tables created!")
def seed_default_users():
    from auth import hash_password
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    if count == 0:
        default_users = [
    ("RC001", "Cheran ", "cheran@railways.gov.in",  os.getenv("DEFAULT_USER_PASS", "Rail@1234"),  "Section Controller", "Southern Railway", "approved"),
    
    ("RC003", "Admin User",   os.getenv("ADMIN_EMAIL", "admin@railways.gov.in"), os.getenv("ADMIN_PASSWORD"), "Divisional Manager", "Southern Railway", "approved"),
]
        for emp_id, name, email, password, role, division, status in default_users:
            hashed = hash_password(password)
            cursor.execute("""
                INSERT INTO users (emp_id, name, email, password, role, division, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (emp_id, name, email, hashed, role, division, status))
        conn.commit()
        print("✅ Default users created!")
    else:
        print(f"✅ Database already has {count} users.")
    conn.close()