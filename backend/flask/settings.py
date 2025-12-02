from dotenv import load_dotenv
import os

from pathlib import Path

env_path = Path(__file__).parent.parent / '.env'

load_dotenv(dotenv_path=env_path)

MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DB = os.getenv("MYSQL_DB")
