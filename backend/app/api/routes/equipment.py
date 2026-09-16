from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models import Equipment
from backend.app.schemas.equipment import EquipmentCreate, EquipmentResponse


router = APIRouter(prefix="/equipment", tags=["equipment"])


@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    payload: EquipmentCreate,
    db: Session = Depends(get_db),
) -> Equipment:
    equipment = Equipment(**payload.model_dump())
    db.add(equipment)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Equipment asset_tag already exists.",
        )

    db.refresh(equipment)
    return equipment


@router.get("", response_model=list[EquipmentResponse])
def list_equipment(
    db: Session = Depends(get_db),
) -> list[Equipment]:
    return list(db.scalars(select(Equipment).order_by(Equipment.id)))
