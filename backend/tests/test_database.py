import pytest
from sqlalchemy import text

from app.database import get_database_url, get_engine


def test_postgresql_connection() -> None:
    try:
        get_database_url()
    except RuntimeError as error:
        pytest.skip(str(error))

    engine = get_engine()
    assert engine.dialect.name == "postgresql"

    with engine.connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
