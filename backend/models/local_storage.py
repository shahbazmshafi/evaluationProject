# LocalStorage models
from sqlalchemy import Column, Integer, Text

from config.database import Base

class LocalStorageUsers(Base):
    __tablename__ = "localStorage_users"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Text)

class LocalStoragePasswords(Base):
    __tablename__ = "localStorage_passwords"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Text)

class LocalStorageKPIs(Base):
    __tablename__ = "localStorage_kpis"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Text)

class LocalStorageUserSessions(Base):
    __tablename__ = "localStorage_user_sessions"

    user_id = Column(Integer, primary_key=True, index=True)
    data = Column(Text)
