import pymysql
from django.conf import settings

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = pymysql.connect(
            host=settings.DATABASES['default']['HOST'],
            user=settings.DATABASES['default']['USER'],
            password=settings.DATABASES['default']['PASSWORD'],
            database=settings.DATABASES['default']['NAME'],
            cursorclass=pymysql.cursors.DictCursor,
            charset='utf8mb4',
            autocommit=False
        )
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        raise