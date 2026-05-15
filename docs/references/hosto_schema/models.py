from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.schemas.common import AlertLevel, InputMethod, UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.STAFF, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # User-scoped UI preferences kept on the server so settings follow the
    # account across browsers/PCs. Currently used for hospital institution
    # defaults and EMR source-system label. Shape is open-ended JSON so we
    # don't need a migration for every new field.
    preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    patients: Mapped[list["Patient"]] = relationship(back_populates="created_by_user")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)
    residence_code: Mapped[str | None] = mapped_column(String(10))
    insurance_type: Mapped[str] = mapped_column(String(50), nullable=False)
    disability_grade: Mapped[str] = mapped_column(String(20), default="없음")
    veteran_type: Mapped[str] = mapped_column(String(50), default="없음")
    sanjeong_special: Mapped[str] = mapped_column(String(50), default="없음")
    is_pregnant: Mapped[bool] = mapped_column(Boolean, default=False)
    is_infant: Mapped[bool] = mapped_column(Boolean, default=False)
    kcd_codes: Mapped[list[str] | None] = mapped_column(JSON)
    treatment_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    created_by_user: Mapped["User"] = relationship(back_populates="patients")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="patient")
    encounters: Mapped[list["Encounter"]] = relationship(back_populates="patient")


class ImportSession(Base):
    __tablename__ = "import_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)
    source_system: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="parsed", nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    meta: Mapped[dict | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    created_by_user: Mapped["User"] = relationship()
    encounters: Mapped[list["Encounter"]] = relationship(back_populates="import_session")


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id"), nullable=False
    )
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    import_session_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("import_sessions.id")
    )
    input_method: Mapped[InputMethod] = mapped_column(
        Enum(InputMethod), default=InputMethod.MANUAL, nullable=False
    )
    external_id: Mapped[str | None] = mapped_column(String(100))
    source_system: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="analyzed", nullable=False)
    raw_input: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient: Mapped["Patient"] = relationship(back_populates="encounters")
    created_by_user: Mapped["User"] = relationship()
    import_session: Mapped["ImportSession"] = relationship(back_populates="encounters")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="encounter")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id"), nullable=False
    )
    encounter_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("encounters.id")
    )
    input_method: Mapped[InputMethod] = mapped_column(
        Enum(InputMethod), default=InputMethod.MANUAL
    )
    rule_result: Mapped[dict | None] = mapped_column(JSON)
    ai_result: Mapped[dict | None] = mapped_column(JSON)
    final_result: Mapped[dict] = mapped_column(JSON, nullable=False)
    alert_level: Mapped[AlertLevel] = mapped_column(
        Enum(AlertLevel), nullable=False
    )
    action_plan_pdf_url: Mapped[str | None] = mapped_column(String(500))
    total_original_amount: Mapped[int | None] = mapped_column(Integer)
    total_copayment_amount: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient: Mapped["Patient"] = relationship(back_populates="analyses")
    encounter: Mapped["Encounter"] = relationship(back_populates="analyses")
    billing_items: Mapped[list["BillingItem"]] = relationship(back_populates="analysis")


class BillingItem(Base):
    __tablename__ = "billing_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("analyses.id"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    original_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    coverage_type: Mapped[str] = mapped_column(String(20), default="급여")
    copayment_rate: Mapped[float] = mapped_column(Float, nullable=False)
    copayment_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_source: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(String(500))
    # HIRA 수가 코드 / 명칭 / 카탈로그 상태. Phase A의 fee_codes 테이블과
    # 연결될 키. EMR import / 수동 입력 / OCR 어느 경로로 들어와도 보존되어
    # 룰엔진 통합 후 코드별 정확한 단가 산정에 사용된다.
    fee_code: Mapped[str | None] = mapped_column(String(50))
    item_name: Mapped[str | None] = mapped_column(String(255))
    catalog_status: Mapped[str] = mapped_column(String(30), default="emr_verify_only")

    analysis: Mapped["Analysis"] = relationship(back_populates="billing_items")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    target_table: Mapped[str | None] = mapped_column(String(50))
    target_id: Mapped[int | None] = mapped_column(Integer)
    details: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="audit_logs")


class PolicyMetadata(Base):
    __tablename__ = "policy_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(1000))
    source_org: Mapped[str | None] = mapped_column(String(200))
    effective_date: Mapped[datetime | None] = mapped_column(DateTime)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime)
    region_code: Mapped[str | None] = mapped_column(String(10))
    target_conditions: Mapped[list[str] | None] = mapped_column(JSON)
    exclusions: Mapped[list[str] | None] = mapped_column(JSON)
    benefit_type: Mapped[str | None] = mapped_column(String(50))
    benefit_value: Mapped[str | None] = mapped_column(String(100))
    content: Mapped[str | None] = mapped_column(Text)
    last_crawled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    policy_rules: Mapped[list["PolicyRule"]] = relationship(back_populates="policy_metadata")


class PolicyRule(Base):
    """크롤링된 정책에서 추출한 구체적 적용 룰."""

    __tablename__ = "policy_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    policy_metadata_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("policy_metadata.id"), nullable=False
    )
    item_category: Mapped[str | None] = mapped_column(String(50))
    insurance_type: Mapped[str | None] = mapped_column(String(50))
    condition_type: Mapped[str] = mapped_column(String(50), nullable=False)
    condition_value: Mapped[str] = mapped_column(String(200), nullable=False)
    copayment_rate: Mapped[float | None] = mapped_column(Float)
    copayment_type: Mapped[str] = mapped_column(
        String(20), default="percentage"
    )  # percentage / flat / exempt
    effective_date: Mapped[datetime | None] = mapped_column(DateTime)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime)
    source_url: Mapped[str | None] = mapped_column(String(1000))
    verification_status: Mapped[str] = mapped_column(
        String(20), default="unverified"
    )  # unverified / verified / rejected
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    policy_metadata: Mapped["PolicyMetadata"] = relationship(back_populates="policy_rules")


class CrawlLog(Base):
    """크롤링 실행 로그."""

    __tablename__ = "crawl_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_name: Mapped[str] = mapped_column(String(50), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # success / error
    records_added: Mapped[int] = mapped_column(Integer, default=0)
    records_updated: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)


class CustomImportTemplate(Base):
    """사용자가 직접 등록한 EMR 임포트 템플릿 (별칭/반복 컬럼 맵)."""

    __tablename__ = "custom_import_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    aliases: Mapped[dict] = mapped_column(JSON, default=dict)
    column_order: Mapped[list[str] | None] = mapped_column(JSON)
    repeated_columns: Mapped[dict | None] = mapped_column(JSON)
    max_repeated: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    created_by_user: Mapped["User"] = relationship()


# ---------------------------------------------------------------------------
# Phase A — Official fee schedule (HIRA / NHIS) data model.
#
# These tables hold the *deterministic* reference data used by the calculator
# once Phase A is wired up. They are intentionally separate from the crawler
# tables (PolicyMetadata / PolicyRule) so curated official data never gets
# mixed with AI-verified-but-unofficial crawled rules.
# ---------------------------------------------------------------------------


class FeeScheduleVersion(Base):
    """수가 마스터 데이터 버전.

    HIRA가 발표하는 매년 1월 기본판 + 수시 일부개정 고시마다 한 행.
    fee_codes 와 conversion_factors 는 이 버전을 참조한다.
    """

    __tablename__ = "fee_schedule_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version_label: Mapped[str] = mapped_column(String(50), nullable=False)
    effective_from: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime)
    source_url: Mapped[str | None] = mapped_column(String(1000))
    source_hash: Mapped[str | None] = mapped_column(String(128))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ConversionFactor(Base):
    """종별 환산지수 (수가 = 상대가치점수 × 환산지수)."""

    __tablename__ = "conversion_factors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fee_schedule_version_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("fee_schedule_versions.id"), nullable=False
    )
    institution_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)


class FeeCode(Base):
    """HIRA 상대가치점수표 항목 (수가 마스터)."""

    __tablename__ = "fee_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fee_schedule_version_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("fee_schedule_versions.id"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name_ko: Mapped[str] = mapped_column(String(255), nullable=False)
    classification_code: Mapped[str | None] = mapped_column(String(50))
    relative_value: Mapped[float | None] = mapped_column(Float)
    coverage_type: Mapped[str] = mapped_column(String(20), default="급여")
    applicability_rules: Mapped[dict | None] = mapped_column(JSON)
    notes: Mapped[str | None] = mapped_column(Text)


class SanjeongCode(Base):
    """산정특례 V코드 / 특정기호 마스터."""

    __tablename__ = "sanjeong_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    target_disease: Mapped[str | None] = mapped_column(String(255))
    copayment_rate: Mapped[float] = mapped_column(Float, nullable=False)
    duration_days: Mapped[int | None] = mapped_column(Integer)
    annual_limit_days: Mapped[int | None] = mapped_column(Integer)
    requires_preapproval: Mapped[bool] = mapped_column(Boolean, default=False)
    excluded_coverage_types: Mapped[list[str] | None] = mapped_column(JSON)
    source_url: Mapped[str | None] = mapped_column(String(1000))
    effective_from: Mapped[datetime | None] = mapped_column(DateTime)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime)


class CopayCeilingBracket(Base):
    """본인부담상한제 소득분위별 연간 상한액."""

    __tablename__ = "copay_ceiling_brackets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    income_decile: Mapped[int] = mapped_column(Integer, nullable=False)
    annual_ceiling_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    long_term_care_ceiling_amount: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(1000))
