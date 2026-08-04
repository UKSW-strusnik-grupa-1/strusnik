import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "development-secret-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://strusnik:strusnik@mysql_db:3306/strusnik",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    TOKEN_MAX_AGE = 7 * 24 * 60 * 60
