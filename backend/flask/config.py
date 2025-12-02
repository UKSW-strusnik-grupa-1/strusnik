class Config:
    SECRET_KEY = "JWTSecretKey"
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://strusnik:strusnik@mysql_db:3306/strusnik'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    TOKEN_MAX_AGE=7*24*60*60 #seconds