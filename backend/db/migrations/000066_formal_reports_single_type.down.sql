ALTER TABLE formal_reports
DROP CONSTRAINT formal_reports_report_type_check;

ALTER TABLE formal_reports
ADD CONSTRAINT formal_reports_report_type_check CHECK (report_type IN (
    'annual_risk_profile',
    'semiannual_mr_implementation',
    'semiannual_mr_supervision',
    'tmpmr_report',
    'monitoring_evaluation_report'
)) NOT VALID;
