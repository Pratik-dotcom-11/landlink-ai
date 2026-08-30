import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Force test settings before importing app
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEBUG"] = "true"
os.environ["ENVIRONMENT"] = "testing"

from app.database import Base, get_db, seed_db
from app.main import app

# Create in-memory test SQLite database
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Creates tables and seeds initial test data once per session.
    """
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_db(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """
    Yields an isolated database session per test.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """
    FastAPI TestClient with overridden get_db dependency.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


from app.core.security import create_access_token

@pytest.fixture
def admin_token():
    token = create_access_token(
        subject="33333333-3333-3333-3333-333333333301",
        claims={"role": "ADMIN", "email": "admin.rajesh@landrecords.gov.in"}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def verifier_token():
    token = create_access_token(
        subject="33333333-3333-3333-3333-333333333302",
        claims={"role": "VERIFIER", "email": "verifier.priya@landrecords.gov.in"}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def operator_token():
    token = create_access_token(
        subject="33333333-3333-3333-3333-333333333303",
        claims={"role": "DATA_OPERATOR", "email": "operator.amit@landrecords.gov.in"}
    )
    return {"Authorization": f"Bearer {token}"}

