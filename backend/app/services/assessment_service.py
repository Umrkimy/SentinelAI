from backend.app.schemas.assessment import AssessmentResponse, FailureModelInfoResponse
from backend.app.schemas.sensor_reading import SensorReadingInput
from backend.app.services.anomaly_detection_service import anomaly_detection_service
from backend.app.services.failure_prediction_service import failure_prediction_service
from backend.app.services.rul_prediction_service import rul_prediction_service


class AssessmentService:
    """Combines independent model outputs into one API assessment."""

    def get_model_info(self) -> FailureModelInfoResponse:
        return failure_prediction_service.get_model_info()

    def predict(self, reading: SensorReadingInput) -> AssessmentResponse:
        failure_result = failure_prediction_service.predict(reading)
        anomaly_result = anomaly_detection_service.predict(reading)
        rul_result = rul_prediction_service.predict(reading)

        return AssessmentResponse(
            failure_probability=failure_result.failure_probability,
            risk=failure_result.risk,
            threshold=failure_result.threshold,
            anomaly_score=anomaly_result.anomaly_score,
            is_anomaly=anomaly_result.is_anomaly,
            anomaly_model_name=anomaly_result.model_name,
            predicted_rul_cycles=(
                rul_result.predicted_rul_cycles
                if rul_result
                else None
            ),
            conservative_rul_cycles=(
                rul_result.conservative_rul_cycles
                if rul_result
                else None
            ),
            rul_model_name=(
                rul_result.model_name
                if rul_result
                else None
            ),
            rul_training_data_note=(
                rul_result.training_data_note
                if rul_result
                else None
            ),
        )


assessment_service = AssessmentService()
