"""add anomaly results to predictions

Revision ID: 6f4f80c3a91d
Revises: 0978ccba4e1c
Create Date: 2026-09-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6f4f80c3a91d"
down_revision: Union[str, Sequence[str], None] = "0978ccba4e1c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add nullable anomaly fields while preserving existing history."""
    op.add_column("predictions", sa.Column("anomaly_score", sa.Float(), nullable=True))
    op.add_column("predictions", sa.Column("is_anomaly", sa.Boolean(), nullable=True))
    op.add_column(
        "predictions",
        sa.Column("anomaly_model_name", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    """Remove anomaly result fields."""
    op.drop_column("predictions", "anomaly_model_name")
    op.drop_column("predictions", "is_anomaly")
    op.drop_column("predictions", "anomaly_score")
