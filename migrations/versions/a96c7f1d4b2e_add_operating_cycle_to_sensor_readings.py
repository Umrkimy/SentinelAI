"""add operating cycle to sensor readings

Revision ID: a96c7f1d4b2e
Revises: 6f4f80c3a91d
Create Date: 2026-09-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a96c7f1d4b2e"
down_revision: Union[str, Sequence[str], None] = "6f4f80c3a91d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Store the operating cycle when it is supplied with a reading."""
    op.add_column(
        "sensor_readings",
        sa.Column("operating_cycle", sa.Integer(), nullable=True),
    )
    op.add_column(
        "predictions",
        sa.Column("predicted_rul_cycles", sa.Float(), nullable=True),
    )
    op.add_column(
        "predictions",
        sa.Column("conservative_rul_cycles", sa.Float(), nullable=True),
    )
    op.add_column(
        "predictions",
        sa.Column("rul_model_name", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "predictions",
        sa.Column(
            "rul_training_data_note",
            sa.String(length=200),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove the optional operating-cycle column."""
    op.drop_column("predictions", "rul_training_data_note")
    op.drop_column("predictions", "rul_model_name")
    op.drop_column("predictions", "conservative_rul_cycles")
    op.drop_column("predictions", "predicted_rul_cycles")
    op.drop_column("sensor_readings", "operating_cycle")
