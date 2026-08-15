--
-- PostgreSQL database dump
--

-- Dumped from database version 16.13
-- Dumped by pg_dump version 17.6 (Homebrew)

-- Started on 2026-07-15 21:03:46 WIB

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 4406 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 892 (class 1247 OID 16418)
-- Name: working_paper_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.working_paper_status AS ENUM (
    'draft',
    'signing',
    'completed',
    'cancelled'
);


ALTER TYPE public.working_paper_status OWNER TO postgres;

--
-- TOC entry 266 (class 1255 OID 16427)
-- Name: get_cycle_current_risk(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_cycle_current_risk(p_version_group_id uuid, p_assessment_cycle text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN (
    SELECT id FROM risks
    WHERE version_group_id = p_version_group_id
      AND assessment_cycle = p_assessment_cycle
      AND is_cycle_current = TRUE
    LIMIT 1
  );
END;
$$;


ALTER FUNCTION public.get_cycle_current_risk(p_version_group_id uuid, p_assessment_cycle text) OWNER TO postgres;

--
-- TOC entry 267 (class 1255 OID 16428)
-- Name: update_system_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_system_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_system_settings_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 215 (class 1259 OID 24900)
-- Name: approval_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_histories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    approval_request_id uuid NOT NULL,
    action character varying(20) NOT NULL,
    actor_id uuid NOT NULL,
    actor_name character varying(255) NOT NULL,
    actor_role character varying(50) NOT NULL,
    comments text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.approval_histories OWNER TO postgres;

--
-- TOC entry 4408 (class 0 OID 0)
-- Dependencies: 215
-- Name: TABLE approval_histories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.approval_histories IS 'Audit trail for approval workflow';


--
-- TOC entry 216 (class 1259 OID 24907)
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    current_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    current_approver_role character varying(50) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    current_approver_user_id uuid
);


ALTER TABLE public.approval_requests OWNER TO postgres;

--
-- TOC entry 4409 (class 0 OID 0)
-- Dependencies: 216
-- Name: TABLE approval_requests; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.approval_requests IS 'Stores approval requests for risks and incidents';


--
-- TOC entry 4410 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN approval_requests.request_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.request_type IS 'Type of entity being approved: risk or incident';


--
-- TOC entry 4411 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN approval_requests.current_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.current_status IS 'Current approval status: pending, approved, rejected';


--
-- TOC entry 4412 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN approval_requests.current_approver_role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_requests.current_approver_role IS 'Role that needs to approve: reviewer or pimpinan';


--
-- TOC entry 217 (class 1259 OID 24917)
-- Name: approval_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    approval_request_id uuid NOT NULL,
    sequence_no integer NOT NULL,
    approver_user_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    acted_at timestamp without time zone,
    comments text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    step_type character varying(20) DEFAULT 'approval'::character varying NOT NULL
);


ALTER TABLE public.approval_steps OWNER TO postgres;

--
-- TOC entry 4413 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN approval_steps.step_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.approval_steps.step_type IS 'Type of approval step: review (for reviewer stage) or approval (for pimpinan approval stage)';


--
-- TOC entry 218 (class 1259 OID 24927)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    source text DEFAULT 'web'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 4414 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN audit_logs.source; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_logs.source IS 'Origin of the action: web | chat | api | system';


--
-- TOC entry 4415 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN audit_logs.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_logs.metadata IS 'Free-form context (conversation_id, idempotency_key, tool_call_id, ...)';


--
-- TOC entry 219 (class 1259 OID 24936)
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    tool_state jsonb DEFAULT '{}'::jsonb,
    version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE public.chat_conversations OWNER TO postgres;

--
-- TOC entry 4416 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN chat_conversations.tool_state; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_conversations.tool_state IS 'Persists draft_risk state across tool calls';


--
-- TOC entry 4417 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN chat_conversations.version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_conversations.version IS 'Optimistic lock for concurrent write detection';


--
-- TOC entry 4418 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN chat_conversations.deleted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_conversations.deleted_at IS 'Soft delete timestamp';


--
-- TOC entry 220 (class 1259 OID 24946)
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text,
    tool_calls jsonb,
    tool_call_id text,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['system'::text, 'user'::text, 'assistant'::text, 'tool'::text])))
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- TOC entry 4419 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN chat_messages.tool_calls; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_messages.tool_calls IS 'OpenAI tool calls JSON array';


--
-- TOC entry 4420 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN chat_messages.tool_call_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_messages.tool_call_id IS 'Reference to specific tool_call in tool_calls array';


--
-- TOC entry 4421 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN chat_messages.idempotency_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_messages.idempotency_key IS 'Client-provided key for idempotent submit operations';


--
-- TOC entry 221 (class 1259 OID 24954)
-- Name: communication_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communication_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_id uuid NOT NULL,
    date date NOT NULL,
    method text NOT NULL,
    stakeholder text NOT NULL,
    notes text DEFAULT ''::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.communication_logs OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 24962)
-- Name: control_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.control_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    control_id uuid NOT NULL,
    test_date date NOT NULL,
    tester text NOT NULL,
    result text NOT NULL,
    deficiency text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT control_tests_result_check CHECK ((result = ANY (ARRAY['efektif'::text, 'tidak_efektif'::text])))
);


ALTER TABLE public.control_tests OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 24971)
-- Name: controls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    owner text DEFAULT ''::text,
    owner_user_id uuid,
    frequency text DEFAULT 'harian'::text,
    control_type text DEFAULT 'preventif'::text,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT controls_control_type_check CHECK ((control_type = ANY (ARRAY['preventif'::text, 'detektif'::text, 'korektif'::text])))
);


ALTER TABLE public.controls OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 26402)
-- Name: evaluation_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    template_item_id uuid,
    item_key text NOT NULL,
    item_no text NOT NULL,
    label text NOT NULL,
    answer text DEFAULT 'unset'::text NOT NULL,
    condition text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    analysis text DEFAULT ''::text NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evaluation_items_answer_check CHECK ((answer = ANY (ARRAY['unset'::text, 'yes'::text, 'no'::text])))
);


ALTER TABLE public.evaluation_items OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 26378)
-- Name: evaluation_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evaluation_id uuid NOT NULL,
    template_section_id uuid,
    section_key text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    conclusion text DEFAULT ''::text NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.evaluation_sections OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 26316)
-- Name: evaluation_template_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_template_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    item_key text NOT NULL,
    item_no text NOT NULL,
    label text NOT NULL,
    default_condition text DEFAULT ''::text NOT NULL,
    default_description text DEFAULT ''::text NOT NULL,
    default_analysis text DEFAULT ''::text NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.evaluation_template_items OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 26298)
-- Name: evaluation_template_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_template_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    section_key text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.evaluation_template_sections OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 26284)
-- Name: evaluation_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_key text NOT NULL,
    name text NOT NULL,
    version integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evaluation_templates_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);


ALTER TABLE public.evaluation_templates OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 26336)
-- Name: evaluations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    period text NOT NULL,
    template_id uuid NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    report_number text DEFAULT ''::text NOT NULL,
    report_date date,
    assignment_letter_number text DEFAULT ''::text NOT NULL,
    assignment_letter_date date,
    monitoring_date_range text DEFAULT ''::text NOT NULL,
    unit_code text DEFAULT ''::text NOT NULL,
    unit_location text DEFAULT ''::text NOT NULL,
    unit_address text DEFAULT ''::text NOT NULL,
    unit_eselon_i text DEFAULT ''::text NOT NULL,
    unit_leader_name text DEFAULT ''::text NOT NULL,
    team_coordinator text DEFAULT ''::text NOT NULL,
    team_lead text DEFAULT ''::text NOT NULL,
    team_members text DEFAULT ''::text NOT NULL,
    problems text DEFAULT ''::text NOT NULL,
    recommendations text DEFAULT ''::text NOT NULL,
    created_by uuid,
    finalized_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sequence_no integer NOT NULL,
    code text NOT NULL,
    CONSTRAINT evaluations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'final'::text])))
);


ALTER TABLE public.evaluations OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 24983)
-- Name: external_pics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_pics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.external_pics OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 25023)
-- Name: formal_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formal_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    period text NOT NULL,
    report_type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    generated_file_url text DEFAULT ''::text NOT NULL,
    generated_by uuid,
    generated_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT formal_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'generated'::text, 'submitted'::text, 'approved'::text])))
);


ALTER TABLE public.formal_reports OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 25048)
-- Name: impact_criteria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.impact_criteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    upr_level text NOT NULL,
    impact_level integer NOT NULL,
    impact_label text NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT impact_criteria_category_check CHECK ((category = ANY (ARRAY['kebijakan'::text, 'reputasi'::text, 'fraud_korupsi'::text, 'legal'::text, 'kepatuhan'::text, 'operasional'::text]))),
    CONSTRAINT impact_criteria_impact_level_check CHECK (((impact_level >= 1) AND (impact_level <= 5))),
    CONSTRAINT impact_criteria_upr_level_check CHECK ((upr_level = ANY (ARRAY['kementerian'::text, 'upr_t1'::text, 'upr_t2'::text])))
);


ALTER TABLE public.impact_criteria OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 25080)
-- Name: kri_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kri_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kri_id uuid NOT NULL,
    period_label text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    due_date date NOT NULL,
    value numeric(15,2),
    notes text DEFAULT ''::text,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_by uuid,
    submitted_at timestamp with time zone,
    generated_by text DEFAULT 'cron'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_note text DEFAULT ''::text,
    skip_reason text DEFAULT ''::text,
    evidence_url text,
    CONSTRAINT kri_reports_generated_by_check CHECK ((generated_by = ANY (ARRAY['cron'::text, 'manual'::text]))),
    CONSTRAINT kri_reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'submitted'::text, 'accepted'::text, 'revision_requested'::text, 'skipped'::text])))
);


ALTER TABLE public.kri_reports OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 25095)
-- Name: kris; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kris (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_id uuid NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    metric text DEFAULT ''::text,
    threshold_min numeric(15,2) DEFAULT 0,
    threshold_max numeric(15,2) DEFAULT 100,
    current_value numeric(15,2) DEFAULT 0,
    direction text DEFAULT 'higher_worse'::text,
    frequency text DEFAULT 'bulanan'::text,
    organization_id uuid,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    amber_threshold_min numeric(15,2),
    amber_threshold_max numeric(15,2),
    is_archived boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    archived_reason text DEFAULT ''::text,
    CONSTRAINT kris_direction_check CHECK ((direction = ANY (ARRAY['higher_worse'::text, 'lower_worse'::text])))
);


ALTER TABLE public.kris OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 25113)
-- Name: lessons_learned; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons_learned (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    source_type text DEFAULT 'risiko'::text,
    source_ref text DEFAULT ''::text,
    success_factors text DEFAULT ''::text,
    failure_factors text DEFAULT ''::text,
    recommendations text DEFAULT ''::text,
    tags text[] DEFAULT '{}'::text[],
    author_id uuid,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lessons_learned_source_type_check CHECK ((source_type = ANY (ARRAY['risiko'::text, 'insiden'::text])))
);


ALTER TABLE public.lessons_learned OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 25128)
-- Name: likelihood_assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.likelihood_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_id uuid NOT NULL,
    method text NOT NULL,
    frequency_type text NOT NULL,
    observation_period_months integer NOT NULL,
    event_count integer,
    population_count integer,
    calculated_probability numeric(8,4),
    selected_probability_level integer NOT NULL,
    justification text DEFAULT ''::text NOT NULL,
    data_source text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT likelihood_assessments_event_count_check CHECK ((event_count >= 0)),
    CONSTRAINT likelihood_assessments_frequency_type_check CHECK ((frequency_type = ANY (ARRAY['low_frequency'::text, 'non_low_frequency'::text]))),
    CONSTRAINT likelihood_assessments_method_check CHECK ((method = ANY (ARRAY['frequency'::text, 'probability'::text, 'expert_judgement'::text, 'benchmarking'::text, 'consensus'::text]))),
    CONSTRAINT likelihood_assessments_observation_period_months_check CHECK ((observation_period_months > 0)),
    CONSTRAINT likelihood_assessments_population_count_check CHECK (((population_count IS NULL) OR (population_count > 0))),
    CONSTRAINT likelihood_assessments_selected_probability_level_check CHECK (((selected_probability_level >= 1) AND (selected_probability_level <= 5)))
);


ALTER TABLE public.likelihood_assessments OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 25144)
-- Name: meeting_minutes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meeting_minutes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    date date NOT NULL,
    participants text[] DEFAULT '{}'::text[],
    agenda text[] DEFAULT '{}'::text[],
    summary text DEFAULT ''::text,
    key_points text[] DEFAULT '{}'::text[],
    decisions text[] DEFAULT '{}'::text[],
    open_issues text[] DEFAULT '{}'::text[],
    action_items jsonb DEFAULT '[]'::jsonb,
    next_check_in date,
    transcript text DEFAULT ''::text,
    organization_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.meeting_minutes OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 25160)
-- Name: meeting_minutes_risks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meeting_minutes_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid NOT NULL,
    risk_id uuid NOT NULL,
    linked_by uuid,
    linked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.meeting_minutes_risks OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 25165)
-- Name: mitigation_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mitigation_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mitigation_id uuid NOT NULL,
    risk_id uuid NOT NULL,
    period_label text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    due_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    evidence_url text DEFAULT ''::text,
    notes text DEFAULT ''::text,
    reported_by uuid,
    reported_at timestamp with time zone,
    generated_by text DEFAULT 'cron'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    monitoring_id uuid,
    report_output text DEFAULT ''::text NOT NULL,
    report_obstacle text DEFAULT ''::text NOT NULL,
    CONSTRAINT mitigation_tasks_generated_by_check CHECK ((generated_by = ANY (ARRAY['cron'::text, 'manual'::text]))),
    CONSTRAINT mitigation_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'done'::text, 'overdue'::text, 'skipped'::text])))
);


ALTER TABLE public.mitigation_tasks OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 25182)
-- Name: mitigations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mitigations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_id uuid NOT NULL,
    action text NOT NULL,
    owner text DEFAULT ''::text,
    owner_user_id uuid,
    due_date date,
    frequency text DEFAULT 'insidental'::text,
    recurring_interval text,
    target_cost numeric(15,2) DEFAULT 0,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    report_day integer,
    report_date integer,
    execution_schedule_text text DEFAULT ''::text,
    mitigation_type text DEFAULT 'reduce_probability'::text NOT NULL,
    activity_stage text DEFAULT ''::text NOT NULL,
    expected_output text DEFAULT ''::text NOT NULL,
    quantitative_target text DEFAULT ''::text NOT NULL,
    supporting_unit text DEFAULT ''::text NOT NULL,
    resources_required text DEFAULT ''::text NOT NULL,
    contingency_plan text DEFAULT ''::text NOT NULL,
    potential_obstacle text DEFAULT ''::text NOT NULL,
    cost_benefit_note text DEFAULT ''::text NOT NULL,
    is_breakthrough_activity boolean DEFAULT false NOT NULL,
    is_existing_control boolean DEFAULT false NOT NULL,
    CONSTRAINT mitigations_frequency_check CHECK ((frequency = ANY (ARRAY['insidental'::text, 'rutin'::text]))),
    CONSTRAINT mitigations_mitigation_type_check CHECK ((mitigation_type = ANY (ARRAY['reduce_probability'::text, 'reduce_impact'::text, 'reduce_both'::text]))),
    CONSTRAINT mitigations_recurring_interval_check CHECK ((recurring_interval = ANY (ARRAY[NULL::text, 'harian'::text, 'mingguan'::text, 'bulanan'::text, 'triwulan'::text])))
);


ALTER TABLE public.mitigations OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 26507)
-- Name: organization_group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization_group_members (
    group_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organization_group_members OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 26484)
-- Name: organization_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_organization_id uuid NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organization_groups OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 25208)
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    context text,
    upr_level text,
    location text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    CONSTRAINT organizations_upr_level_check CHECK ((upr_level = ANY (ARRAY['kementerian'::text, 'upr_t1'::text, 'upr_t2'::text])))
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 26232)
-- Name: planning; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planning (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    period text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT planning_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);


ALTER TABLE public.planning OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 26160)
-- Name: planning_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planning_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    title text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.planning_activities OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 26094)
-- Name: planning_goals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planning_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    period text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    planning_id uuid,
    CONSTRAINT planning_goals_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);


ALTER TABLE public.planning_goals OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 26127)
-- Name: planning_ikus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planning_ikus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    title text NOT NULL,
    target text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.planning_ikus OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 26111)
-- Name: planning_objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planning_objectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    title text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.planning_objectives OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 26144)
-- Name: planning_programs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planning_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    iku_id uuid NOT NULL,
    title text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.planning_programs OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 26194)
-- Name: planning_ro_scopes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planning_ro_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ro_id uuid NOT NULL,
    organization_id uuid,
    organization_category text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.planning_ro_scopes OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 26176)
-- Name: planning_ros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planning_ros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id uuid NOT NULL,
    period text NOT NULL,
    title text NOT NULL,
    scope_mode text NOT NULL,
    freeze_status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT planning_ros_freeze_status_check CHECK ((freeze_status = ANY (ARRAY['draft'::text, 'active'::text, 'frozen'::text, 'archived'::text]))),
    CONSTRAINT planning_ros_scope_mode_check CHECK ((scope_mode = ANY (ARRAY['all_satker'::text, 'satker_group'::text, 'explicit_satker_list'::text])))
);


ALTER TABLE public.planning_ros OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 25216)
-- Name: risk_cascades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_cascades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_risk_id uuid NOT NULL,
    target_risk_id uuid,
    source_org_id uuid NOT NULL,
    target_org_id uuid NOT NULL,
    cascade_type text NOT NULL,
    adoption_type text,
    status text DEFAULT 'proposed'::text NOT NULL,
    analysis_note text DEFAULT ''::text NOT NULL,
    decision_note text DEFAULT ''::text NOT NULL,
    proposed_by uuid,
    decided_by uuid,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_cascades_adoption_type_check CHECK (((adoption_type IS NULL) OR (adoption_type = ''::text) OR (adoption_type = ANY (ARRAY['full'::text, 'partial'::text])))),
    CONSTRAINT risk_cascades_cascade_type_check CHECK ((cascade_type = ANY (ARRAY['mandatory_top_down'::text, 'recommended_top_down'::text, 'bottom_up_escalation'::text]))),
    CONSTRAINT risk_cascades_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'analyzed'::text, 'accepted'::text, 'rejected'::text, 'implemented'::text])))
);


ALTER TABLE public.risk_cascades OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 25229)
-- Name: risk_charters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_charters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    upr_level text NOT NULL,
    period text NOT NULL,
    risk_owner_name text NOT NULL,
    risk_owner_user_id uuid,
    risk_team_name text DEFAULT ''::text NOT NULL,
    scope text DEFAULT ''::text NOT NULL,
    legal_basis text DEFAULT ''::text NOT NULL,
    internal_context text DEFAULT ''::text NOT NULL,
    external_context text DEFAULT ''::text NOT NULL,
    stakeholder_summary text DEFAULT ''::text NOT NULL,
    upr_structure jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_charters_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_review'::text, 'approved'::text, 'archived'::text]))),
    CONSTRAINT risk_charters_upr_level_check CHECK ((upr_level = ANY (ARRAY['eksekutif'::text, 'upr_t1'::text, 'upr_t2'::text])))
);


ALTER TABLE public.risk_charters OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 32795)
-- Name: risk_monitorings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_monitorings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_risk_id uuid NOT NULL,
    result_risk_id uuid,
    assessment_cycle text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    mode text DEFAULT 'score_only'::text NOT NULL,
    source_probability integer NOT NULL,
    source_impact integer NOT NULL,
    source_weight numeric(10,4) DEFAULT 1 NOT NULL,
    source_nilai numeric(10,0) DEFAULT 0 NOT NULL,
    source_level text DEFAULT ''::text NOT NULL,
    source_version_number integer DEFAULT 1 NOT NULL,
    observed_probability integer,
    observed_impact integer,
    observed_weight numeric(10,4),
    observed_nilai numeric(10,0),
    observed_level text DEFAULT ''::text NOT NULL,
    condition_summary text DEFAULT ''::text NOT NULL,
    event_summary text DEFAULT ''::text NOT NULL,
    trend text DEFAULT 'stable'::text NOT NULL,
    effectiveness_conclusion text DEFAULT ''::text NOT NULL,
    follow_up_note text DEFAULT ''::text NOT NULL,
    conclusion text DEFAULT ''::text NOT NULL,
    mitigation_progress_summary text DEFAULT ''::text NOT NULL,
    mitigation_completion_percent integer DEFAULT 0 NOT NULL,
    mitigation_obstacles text DEFAULT ''::text NOT NULL,
    mitigation_follow_up text DEFAULT ''::text NOT NULL,
    profile_change_summary jsonb DEFAULT '[]'::jsonb NOT NULL,
    change_reason text DEFAULT ''::text NOT NULL,
    started_by uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finalized_by uuid,
    finalized_at timestamp with time zone,
    voided_by uuid,
    voided_at timestamp with time zone,
    void_reason text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    draft_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    version_group_id uuid NOT NULL,
    CONSTRAINT risk_monitorings_assessment_cycle_check CHECK ((assessment_cycle ~ '^[0-9]{4}-H[12]$'::text)),
    CONSTRAINT risk_monitorings_mitigation_completion_percent_check CHECK (((mitigation_completion_percent >= 0) AND (mitigation_completion_percent <= 100))),
    CONSTRAINT risk_monitorings_mode_check CHECK ((mode = ANY (ARRAY['score_only'::text, 'with_profile_revision'::text]))),
    CONSTRAINT risk_monitorings_source_impact_check CHECK (((source_impact >= 1) AND (source_impact <= 5))),
    CONSTRAINT risk_monitorings_source_probability_check CHECK (((source_probability >= 1) AND (source_probability <= 5))),
    CONSTRAINT risk_monitorings_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'finalized'::text, 'void'::text]))),
    CONSTRAINT risk_monitorings_trend_check CHECK ((trend = ANY (ARRAY['up'::text, 'down'::text, 'stable'::text])))
);


ALTER TABLE public.risk_monitorings OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 25247)
-- Name: risk_objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_objectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    charter_id uuid,
    period text NOT NULL,
    tujuan text NOT NULL,
    sasaran text NOT NULL,
    indikator_kinerja_utama text NOT NULL,
    target text DEFAULT ''::text NOT NULL,
    program text DEFAULT ''::text NOT NULL,
    kegiatan text DEFAULT ''::text NOT NULL,
    process_business text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_objectives_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_review'::text, 'approved'::text, 'archived'::text])))
);


ALTER TABLE public.risk_objectives OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 25261)
-- Name: risks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    organization_id uuid,
    created_by uuid,
    risk_owner_id uuid,
    control_owner_id uuid,
    cause text[] DEFAULT '{}'::text[],
    risk_source text DEFAULT ''::text,
    controllability text DEFAULT 'C'::text,
    impact_description text[] DEFAULT '{}'::text[],
    fishbone_data jsonb,
    existing_control text DEFAULT ''::text,
    control_effectiveness text DEFAULT ''::text,
    probability integer DEFAULT 3,
    impact integer DEFAULT 3,
    weight numeric(4,2) DEFAULT 1.0,
    risk_priority integer DEFAULT 0,
    risk_appetite text DEFAULT ''::text,
    treatment_option text DEFAULT ''::text,
    target_probability integer DEFAULT 1,
    target_impact integer DEFAULT 1,
    target_weight numeric(4,2) DEFAULT 1.0,
    next_review_date text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version_group_id uuid NOT NULL,
    previous_risk_id uuid,
    is_current boolean DEFAULT true NOT NULL,
    archived_at timestamp with time zone,
    archived_reason text DEFAULT ''::text NOT NULL,
    assessment_cycle text,
    review_type text DEFAULT 'periodic'::text,
    change_reason text DEFAULT ''::text NOT NULL,
    review_summary text DEFAULT ''::text NOT NULL,
    review_started_at timestamp with time zone,
    review_submitted_at timestamp with time zone,
    review_approved_at timestamp with time zone,
    draft_approval_line jsonb DEFAULT '[]'::jsonb NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    nilai numeric(10,4) DEFAULT 0,
    target_nilai numeric(10,4) DEFAULT 0,
    inherent_score integer,
    target_score integer,
    is_cycle_current boolean DEFAULT false NOT NULL,
    version_number integer DEFAULT 1 NOT NULL,
    review_schedule_text text,
    objective_id uuid,
    likelihood_assessment_id uuid,
    impact_criteria_id uuid,
    impact_justification text DEFAULT ''::text NOT NULL,
    residual_acceptance_reason text DEFAULT ''::text NOT NULL,
    ro_id uuid,
    CONSTRAINT risks_assessment_cycle_semester_check CHECK (((assessment_cycle IS NULL) OR (assessment_cycle = ''::text) OR (assessment_cycle ~ '^[0-9]{4}-H[12]$'::text)))
);


ALTER TABLE public.risks OWNER TO postgres;

--
-- TOC entry 4422 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN risks.is_cycle_current; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.risks.is_cycle_current IS 'Marks this risk version as the current/active one for its assessment_cycle.
   Only one version per (version_group_id, assessment_cycle) can have this set to TRUE.
   Used for semester-based reporting while allowing multiple reassessments within a semester.';


--
-- TOC entry 240 (class 1259 OID 25299)
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    dirty boolean NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 25302)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description text,
    category character varying(50) DEFAULT 'general'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 25310)
-- Name: tmpmr_assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tmpmr_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    period text NOT NULL,
    assessor_id uuid,
    reviewer_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    score numeric(6,2) DEFAULT 0 NOT NULL,
    maturity_level text DEFAULT 'Awal'::text NOT NULL,
    review_note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tmpmr_assessments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'reviewed'::text, 'approved'::text])))
);


ALTER TABLE public.tmpmr_assessments OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 25323)
-- Name: tmpmr_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tmpmr_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    dimension text NOT NULL,
    question text NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    evidence_url text DEFAULT ''::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tmpmr_items_dimension_check CHECK ((dimension = ANY (ARRAY['governance'::text, 'context_criteria'::text, 'risk_assessment'::text, 'risk_treatment'::text, 'monitoring_review'::text, 'recording_reporting'::text]))),
    CONSTRAINT tmpmr_items_score_check CHECK (((score >= 0) AND (score <= 5)))
);


ALTER TABLE public.tmpmr_items OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 25336)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    organization_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nip text DEFAULT ''::text NOT NULL,
    jabatan text DEFAULT ''::text NOT NULL,
    pangkat text DEFAULT ''::text NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    phone_number text DEFAULT ''::text NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'unit'::text, 'reviewer'::text, 'pimpinan'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['pending_activation'::text, 'active'::text, 'inactive'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 32918)
-- Name: working_paper_risk_exclusions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.working_paper_risk_exclusions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    working_paper_id uuid NOT NULL,
    version_group_id uuid NOT NULL,
    assessment_cycle character varying(7) NOT NULL,
    reason text NOT NULL,
    excluded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT working_paper_risk_exclusions_cycle_semester_check CHECK (((assessment_cycle)::text ~ '^[0-9]{4}-H[12]$'::text)),
    CONSTRAINT working_paper_risk_exclusions_reason_check CHECK ((TRIM(BOTH ' '::text FROM reason) <> ''::text))
);


ALTER TABLE public.working_paper_risk_exclusions OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 25352)
-- Name: working_paper_risks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.working_paper_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    working_paper_id uuid NOT NULL,
    risk_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    source_mode character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    version_group_id uuid,
    source_risk_id uuid,
    monitoring_id uuid,
    result_risk_id uuid
);


ALTER TABLE public.working_paper_risks OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 25358)
-- Name: working_paper_signatories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.working_paper_signatories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    working_paper_id uuid NOT NULL,
    user_id uuid NOT NULL,
    sequence_no integer NOT NULL,
    signer_name character varying(300) NOT NULL,
    signer_nip character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    signed_at timestamp with time zone,
    qr_code_png text,
    qr_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    signer_pangkat character varying(300) DEFAULT ''::character varying,
    signer_jabatan character varying(300) DEFAULT ''::character varying
);


ALTER TABLE public.working_paper_signatories OWNER TO postgres;

--
-- TOC entry 4423 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE working_paper_signatories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.working_paper_signatories IS 'Tracks signatories in sequential signing workflow for working papers';


--
-- TOC entry 247 (class 1259 OID 25368)
-- Name: working_papers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.working_papers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(500) NOT NULL,
    org_id uuid NOT NULL,
    status public.working_paper_status DEFAULT 'draft'::public.working_paper_status NOT NULL,
    assessment_cycle character varying(100),
    risk_snapshots jsonb DEFAULT '[]'::jsonb NOT NULL,
    document_hash character varying(64),
    current_signatory_sequence integer DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    tte_skipped boolean DEFAULT false NOT NULL,
    sequence_no integer NOT NULL,
    code text NOT NULL,
    CONSTRAINT working_papers_assessment_cycle_semester_check CHECK (((assessment_cycle IS NULL) OR ((assessment_cycle)::text = ''::text) OR ((assessment_cycle)::text ~ '^[0-9]{4}-H[12]$'::text)))
);


ALTER TABLE public.working_papers OWNER TO postgres;

--
-- TOC entry 4424 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE working_papers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.working_papers IS 'Stores working paper (kertas kerja) records with status tracking';


--
-- TOC entry 4425 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN working_papers.risk_snapshots; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.working_papers.risk_snapshots IS 'Array of snapshotted risk data at working paper creation time';


--
-- TOC entry 4426 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN working_papers.document_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.working_papers.document_hash IS 'SHA-256 hash of document for integrity verification';


--
-- TOC entry 4427 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN working_papers.current_signatory_sequence; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.working_papers.current_signatory_sequence IS 'Tracks which signatory is next in the signing sequence';

--
-- TOC entry 3851 (class 2606 OID 25383)
-- Name: approval_histories approval_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_histories
    ADD CONSTRAINT approval_histories_pkey PRIMARY KEY (id);


--
-- TOC entry 3854 (class 2606 OID 25385)
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 3861 (class 2606 OID 25387)
-- Name: approval_steps approval_steps_approval_request_id_sequence_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_approval_request_id_sequence_no_key UNIQUE (approval_request_id, sequence_no);


--
-- TOC entry 3863 (class 2606 OID 25389)
-- Name: approval_steps approval_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_pkey PRIMARY KEY (id);


--
-- TOC entry 3867 (class 2606 OID 25391)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3872 (class 2606 OID 25393)
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 3875 (class 2606 OID 25395)
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 3879 (class 2606 OID 25397)
-- Name: communication_logs communication_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication_logs
    ADD CONSTRAINT communication_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3882 (class 2606 OID 25399)
-- Name: control_tests control_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_tests
    ADD CONSTRAINT control_tests_pkey PRIMARY KEY (id);


--
-- TOC entry 3885 (class 2606 OID 25401)
-- Name: controls controls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_pkey PRIMARY KEY (id);


--
-- TOC entry 4078 (class 2606 OID 26416)
-- Name: evaluation_items evaluation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_items
    ADD CONSTRAINT evaluation_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4080 (class 2606 OID 26418)
-- Name: evaluation_items evaluation_items_section_id_item_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_items
    ADD CONSTRAINT evaluation_items_section_id_item_key_key UNIQUE (section_id, item_key);


--
-- TOC entry 4073 (class 2606 OID 26391)
-- Name: evaluation_sections evaluation_sections_evaluation_id_section_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_sections
    ADD CONSTRAINT evaluation_sections_evaluation_id_section_key_key UNIQUE (evaluation_id, section_key);


--
-- TOC entry 4075 (class 2606 OID 26389)
-- Name: evaluation_sections evaluation_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_sections
    ADD CONSTRAINT evaluation_sections_pkey PRIMARY KEY (id);


--
-- TOC entry 4060 (class 2606 OID 26328)
-- Name: evaluation_template_items evaluation_template_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_template_items
    ADD CONSTRAINT evaluation_template_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4062 (class 2606 OID 26330)
-- Name: evaluation_template_items evaluation_template_items_section_id_item_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_template_items
    ADD CONSTRAINT evaluation_template_items_section_id_item_key_key UNIQUE (section_id, item_key);


--
-- TOC entry 4056 (class 2606 OID 26308)
-- Name: evaluation_template_sections evaluation_template_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_template_sections
    ADD CONSTRAINT evaluation_template_sections_pkey PRIMARY KEY (id);


--
-- TOC entry 4058 (class 2606 OID 26310)
-- Name: evaluation_template_sections evaluation_template_sections_template_id_section_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_template_sections
    ADD CONSTRAINT evaluation_template_sections_template_id_section_key_key UNIQUE (template_id, section_key);


--
-- TOC entry 4052 (class 2606 OID 26295)
-- Name: evaluation_templates evaluation_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_templates
    ADD CONSTRAINT evaluation_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 4054 (class 2606 OID 26297)
-- Name: evaluation_templates evaluation_templates_template_key_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_templates
    ADD CONSTRAINT evaluation_templates_template_key_version_key UNIQUE (template_key, version);


--
-- TOC entry 4064 (class 2606 OID 26362)
-- Name: evaluations evaluations_organization_id_period_template_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_organization_id_period_template_id_key UNIQUE (organization_id, period, template_id);


--
-- TOC entry 4066 (class 2606 OID 26439)
-- Name: evaluations evaluations_organization_sequence_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_organization_sequence_no_key UNIQUE (organization_id, sequence_no);


--
-- TOC entry 4068 (class 2606 OID 26360)
-- Name: evaluations evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (id);


--
-- TOC entry 3887 (class 2606 OID 25403)
-- Name: external_pics external_pics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_pics
    ADD CONSTRAINT external_pics_pkey PRIMARY KEY (id);


--
-- TOC entry 3891 (class 2606 OID 25417)
-- Name: formal_reports formal_reports_organization_id_period_report_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formal_reports
    ADD CONSTRAINT formal_reports_organization_id_period_report_type_key UNIQUE (organization_id, period, report_type);


--
-- TOC entry 3893 (class 2606 OID 25419)
-- Name: formal_reports formal_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formal_reports
    ADD CONSTRAINT formal_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3800 (class 2606 OID 26283)
-- Name: formal_reports formal_reports_report_type_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.formal_reports
    ADD CONSTRAINT formal_reports_report_type_check CHECK ((report_type = 'monitoring_evaluation_report'::text)) NOT VALID;


--
-- TOC entry 3898 (class 2606 OID 25423)
-- Name: impact_criteria impact_criteria_category_upr_level_impact_level_description_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.impact_criteria
    ADD CONSTRAINT impact_criteria_category_upr_level_impact_level_description_key UNIQUE (category, upr_level, impact_level, description);


--
-- TOC entry 3900 (class 2606 OID 25425)
-- Name: impact_criteria impact_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.impact_criteria
    ADD CONSTRAINT impact_criteria_pkey PRIMARY KEY (id);


--
-- TOC entry 3907 (class 2606 OID 25431)
-- Name: kri_reports kri_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kri_reports
    ADD CONSTRAINT kri_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3911 (class 2606 OID 25433)
-- Name: kris kris_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kris
    ADD CONSTRAINT kris_pkey PRIMARY KEY (id);


--
-- TOC entry 3913 (class 2606 OID 25435)
-- Name: lessons_learned lessons_learned_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons_learned
    ADD CONSTRAINT lessons_learned_pkey PRIMARY KEY (id);


--
-- TOC entry 3916 (class 2606 OID 25437)
-- Name: likelihood_assessments likelihood_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likelihood_assessments
    ADD CONSTRAINT likelihood_assessments_pkey PRIMARY KEY (id);


--
-- TOC entry 3923 (class 2606 OID 25439)
-- Name: meeting_minutes meeting_minutes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_minutes
    ADD CONSTRAINT meeting_minutes_pkey PRIMARY KEY (id);


--
-- TOC entry 3927 (class 2606 OID 25441)
-- Name: meeting_minutes_risks meeting_minutes_risks_meeting_id_risk_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_minutes_risks
    ADD CONSTRAINT meeting_minutes_risks_meeting_id_risk_id_key UNIQUE (meeting_id, risk_id);


--
-- TOC entry 3929 (class 2606 OID 25443)
-- Name: meeting_minutes_risks meeting_minutes_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_minutes_risks
    ADD CONSTRAINT meeting_minutes_risks_pkey PRIMARY KEY (id);


--
-- TOC entry 3938 (class 2606 OID 25445)
-- Name: mitigation_tasks mitigation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitigation_tasks
    ADD CONSTRAINT mitigation_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3941 (class 2606 OID 25447)
-- Name: mitigations mitigations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitigations
    ADD CONSTRAINT mitigations_pkey PRIMARY KEY (id);


--
-- TOC entry 4088 (class 2606 OID 26512)
-- Name: organization_group_members organization_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_group_members
    ADD CONSTRAINT organization_group_members_pkey PRIMARY KEY (group_id, organization_id);


--
-- TOC entry 4085 (class 2606 OID 26494)
-- Name: organization_groups organization_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_groups
    ADD CONSTRAINT organization_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3944 (class 2606 OID 25449)
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- TOC entry 4040 (class 2606 OID 26170)
-- Name: planning_activities planning_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_activities
    ADD CONSTRAINT planning_activities_pkey PRIMARY KEY (id);


--
-- TOC entry 4028 (class 2606 OID 26105)
-- Name: planning_goals planning_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_goals
    ADD CONSTRAINT planning_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 4034 (class 2606 OID 26138)
-- Name: planning_ikus planning_ikus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_ikus
    ADD CONSTRAINT planning_ikus_pkey PRIMARY KEY (id);


--
-- TOC entry 4031 (class 2606 OID 26121)
-- Name: planning_objectives planning_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_objectives
    ADD CONSTRAINT planning_objectives_pkey PRIMARY KEY (id);


--
-- TOC entry 4050 (class 2606 OID 26243)
-- Name: planning planning_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning
    ADD CONSTRAINT planning_pkey PRIMARY KEY (id);


--
-- TOC entry 4037 (class 2606 OID 26154)
-- Name: planning_programs planning_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_programs
    ADD CONSTRAINT planning_programs_pkey PRIMARY KEY (id);


--
-- TOC entry 4048 (class 2606 OID 26204)
-- Name: planning_ro_scopes planning_ro_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_ro_scopes
    ADD CONSTRAINT planning_ro_scopes_pkey PRIMARY KEY (id);


--
-- TOC entry 4043 (class 2606 OID 26188)
-- Name: planning_ros planning_ros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_ros
    ADD CONSTRAINT planning_ros_pkey PRIMARY KEY (id);


--
-- TOC entry 3949 (class 2606 OID 25451)
-- Name: risk_cascades risk_cascades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_cascades
    ADD CONSTRAINT risk_cascades_pkey PRIMARY KEY (id);


--
-- TOC entry 3953 (class 2606 OID 25453)
-- Name: risk_charters risk_charters_organization_id_period_upr_level_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_charters
    ADD CONSTRAINT risk_charters_organization_id_period_upr_level_key UNIQUE (organization_id, period, upr_level);


--
-- TOC entry 3955 (class 2606 OID 25455)
-- Name: risk_charters risk_charters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_charters
    ADD CONSTRAINT risk_charters_pkey PRIMARY KEY (id);


--
-- TOC entry 4096 (class 2606 OID 32841)
-- Name: risk_monitorings risk_monitorings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_monitorings
    ADD CONSTRAINT risk_monitorings_pkey PRIMARY KEY (id);


--
-- TOC entry 3959 (class 2606 OID 25457)
-- Name: risk_objectives risk_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_objectives
    ADD CONSTRAINT risk_objectives_pkey PRIMARY KEY (id);


--
-- TOC entry 3980 (class 2606 OID 25459)
-- Name: risks risks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);


--
-- TOC entry 3982 (class 2606 OID 25461)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 3985 (class 2606 OID 25463)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- TOC entry 3988 (class 2606 OID 25465)
-- Name: tmpmr_assessments tmpmr_assessments_organization_id_period_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tmpmr_assessments
    ADD CONSTRAINT tmpmr_assessments_organization_id_period_key UNIQUE (organization_id, period);


--
-- TOC entry 3990 (class 2606 OID 25467)
-- Name: tmpmr_assessments tmpmr_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tmpmr_assessments
    ADD CONSTRAINT tmpmr_assessments_pkey PRIMARY KEY (id);


--
-- TOC entry 3993 (class 2606 OID 25469)
-- Name: tmpmr_items tmpmr_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tmpmr_items
    ADD CONSTRAINT tmpmr_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3918 (class 2606 OID 25471)
-- Name: likelihood_assessments uq_likelihood_assessments_risk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likelihood_assessments
    ADD CONSTRAINT uq_likelihood_assessments_risk UNIQUE (risk_id);


--
-- TOC entry 3995 (class 2606 OID 25473)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3997 (class 2606 OID 25475)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3999 (class 2606 OID 25477)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4100 (class 2606 OID 32927)
-- Name: working_paper_risk_exclusions working_paper_risk_exclusions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risk_exclusions
    ADD CONSTRAINT working_paper_risk_exclusions_pkey PRIMARY KEY (id);


--
-- TOC entry 4102 (class 2606 OID 32929)
-- Name: working_paper_risk_exclusions working_paper_risk_exclusions_working_paper_id_version_grou_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risk_exclusions
    ADD CONSTRAINT working_paper_risk_exclusions_working_paper_id_version_grou_key UNIQUE (working_paper_id, version_group_id);


--
-- TOC entry 4006 (class 2606 OID 25479)
-- Name: working_paper_risks working_paper_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risks
    ADD CONSTRAINT working_paper_risks_pkey PRIMARY KEY (id);


--
-- TOC entry 4008 (class 2606 OID 25481)
-- Name: working_paper_risks working_paper_risks_working_paper_id_risk_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risks
    ADD CONSTRAINT working_paper_risks_working_paper_id_risk_id_key UNIQUE (working_paper_id, risk_id);


--
-- TOC entry 4012 (class 2606 OID 25483)
-- Name: working_paper_signatories working_paper_signatories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_signatories
    ADD CONSTRAINT working_paper_signatories_pkey PRIMARY KEY (id);


--
-- TOC entry 4014 (class 2606 OID 25485)
-- Name: working_paper_signatories working_paper_signatories_working_paper_id_sequence_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_signatories
    ADD CONSTRAINT working_paper_signatories_working_paper_id_sequence_no_key UNIQUE (working_paper_id, sequence_no);


--
-- TOC entry 4021 (class 2606 OID 26442)
-- Name: working_papers working_papers_org_sequence_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_papers
    ADD CONSTRAINT working_papers_org_sequence_no_key UNIQUE (org_id, sequence_no);


--
-- TOC entry 4023 (class 2606 OID 25487)
-- Name: working_papers working_papers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_papers
    ADD CONSTRAINT working_papers_pkey PRIMARY KEY (id);


--
-- TOC entry 3852 (class 1259 OID 25488)
-- Name: idx_approval_histories_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_histories_request ON public.approval_histories USING btree (approval_request_id);


--
-- TOC entry 3855 (class 1259 OID 25489)
-- Name: idx_approval_requests_approver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_approver ON public.approval_requests USING btree (current_approver_role);


--
-- TOC entry 3856 (class 1259 OID 25490)
-- Name: idx_approval_requests_current_approver_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_current_approver_user ON public.approval_requests USING btree (current_approver_user_id);


--
-- TOC entry 3857 (class 1259 OID 25491)
-- Name: idx_approval_requests_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_entity ON public.approval_requests USING btree (entity_id);


--
-- TOC entry 3858 (class 1259 OID 25492)
-- Name: idx_approval_requests_requested_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_requested_by ON public.approval_requests USING btree (requested_by);


--
-- TOC entry 3859 (class 1259 OID 25493)
-- Name: idx_approval_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_status ON public.approval_requests USING btree (current_status);


--
-- TOC entry 3864 (class 1259 OID 25494)
-- Name: idx_approval_steps_approver_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_steps_approver_user ON public.approval_steps USING btree (approver_user_id);


--
-- TOC entry 3865 (class 1259 OID 25495)
-- Name: idx_approval_steps_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_steps_request ON public.approval_steps USING btree (approval_request_id);


--
-- TOC entry 3868 (class 1259 OID 25496)
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_actor ON public.audit_logs USING btree (actor_user_id, created_at DESC);


--
-- TOC entry 3869 (class 1259 OID 25497)
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id, created_at DESC);


--
-- TOC entry 3870 (class 1259 OID 25498)
-- Name: idx_audit_logs_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_source ON public.audit_logs USING btree (source, created_at DESC);


--
-- TOC entry 3873 (class 1259 OID 25499)
-- Name: idx_chat_conversations_user_updated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_conversations_user_updated ON public.chat_conversations USING btree (user_id, updated_at DESC) WHERE (deleted_at IS NULL);


--
-- TOC entry 3876 (class 1259 OID 25500)
-- Name: idx_chat_messages_conversation_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_conversation_created ON public.chat_messages USING btree (conversation_id, created_at);


--
-- TOC entry 3877 (class 1259 OID 25501)
-- Name: idx_chat_messages_idempotency_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_chat_messages_idempotency_key ON public.chat_messages USING btree (conversation_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- TOC entry 3880 (class 1259 OID 25502)
-- Name: idx_comm_logs_risk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comm_logs_risk ON public.communication_logs USING btree (risk_id);


--
-- TOC entry 3883 (class 1259 OID 25503)
-- Name: idx_control_tests_control; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_tests_control ON public.control_tests USING btree (control_id);


--
-- TOC entry 4081 (class 1259 OID 26432)
-- Name: idx_evaluation_items_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_items_section ON public.evaluation_items USING btree (section_id);


--
-- TOC entry 4076 (class 1259 OID 26431)
-- Name: idx_evaluation_sections_evaluation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_sections_evaluation ON public.evaluation_sections USING btree (evaluation_id);


--
-- TOC entry 4069 (class 1259 OID 26440)
-- Name: idx_evaluations_org_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluations_org_code ON public.evaluations USING btree (organization_id, code);


--
-- TOC entry 4070 (class 1259 OID 26429)
-- Name: idx_evaluations_org_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluations_org_period ON public.evaluations USING btree (organization_id, period);


--
-- TOC entry 4071 (class 1259 OID 26430)
-- Name: idx_evaluations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluations_status ON public.evaluations USING btree (status);


--
-- TOC entry 3888 (class 1259 OID 25504)
-- Name: idx_external_pics_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_pics_name ON public.external_pics USING btree (name);


--
-- TOC entry 3889 (class 1259 OID 25505)
-- Name: idx_external_pics_unique_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_external_pics_unique_name ON public.external_pics USING btree (lower(name));


--
-- TOC entry 3894 (class 1259 OID 25513)
-- Name: idx_formal_reports_org_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_formal_reports_org_period ON public.formal_reports USING btree (organization_id, period);


--
-- TOC entry 3895 (class 1259 OID 25514)
-- Name: idx_formal_reports_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_formal_reports_type ON public.formal_reports USING btree (report_type);


--
-- TOC entry 3896 (class 1259 OID 25515)
-- Name: idx_impact_criteria_category_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_impact_criteria_category_level ON public.impact_criteria USING btree (category, upr_level);


--
-- TOC entry 3901 (class 1259 OID 25518)
-- Name: idx_kri_reports_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kri_reports_due_date ON public.kri_reports USING btree (due_date);


--
-- TOC entry 3902 (class 1259 OID 25519)
-- Name: idx_kri_reports_kri; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kri_reports_kri ON public.kri_reports USING btree (kri_id);


--
-- TOC entry 3903 (class 1259 OID 25520)
-- Name: idx_kri_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kri_reports_status ON public.kri_reports USING btree (status);


--
-- TOC entry 3904 (class 1259 OID 25521)
-- Name: idx_kri_reports_submitted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kri_reports_submitted_by ON public.kri_reports USING btree (submitted_by);


--
-- TOC entry 3905 (class 1259 OID 25522)
-- Name: idx_kri_reports_unique_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_kri_reports_unique_period ON public.kri_reports USING btree (kri_id, period_start, period_end);


--
-- TOC entry 3908 (class 1259 OID 25523)
-- Name: idx_kris_is_archived; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kris_is_archived ON public.kris USING btree (is_archived);


--
-- TOC entry 3909 (class 1259 OID 25524)
-- Name: idx_kris_risk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kris_risk ON public.kris USING btree (risk_id);


--
-- TOC entry 3914 (class 1259 OID 25525)
-- Name: idx_likelihood_assessments_risk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_likelihood_assessments_risk ON public.likelihood_assessments USING btree (risk_id);


--
-- TOC entry 3919 (class 1259 OID 25526)
-- Name: idx_meeting_minutes_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meeting_minutes_created_by ON public.meeting_minutes USING btree (created_by);


--
-- TOC entry 3920 (class 1259 OID 25527)
-- Name: idx_meeting_minutes_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meeting_minutes_date ON public.meeting_minutes USING btree (date DESC);


--
-- TOC entry 3921 (class 1259 OID 25528)
-- Name: idx_meeting_minutes_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meeting_minutes_org ON public.meeting_minutes USING btree (organization_id);


--
-- TOC entry 3930 (class 1259 OID 25529)
-- Name: idx_mitigation_tasks_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitigation_tasks_due_date ON public.mitigation_tasks USING btree (due_date);


--
-- TOC entry 3931 (class 1259 OID 25530)
-- Name: idx_mitigation_tasks_mitigation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitigation_tasks_mitigation ON public.mitigation_tasks USING btree (mitigation_id);


--
-- TOC entry 3932 (class 1259 OID 32897)
-- Name: idx_mitigation_tasks_monitoring_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitigation_tasks_monitoring_id ON public.mitigation_tasks USING btree (monitoring_id) WHERE (monitoring_id IS NOT NULL);


--
-- TOC entry 3933 (class 1259 OID 25531)
-- Name: idx_mitigation_tasks_reported_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitigation_tasks_reported_by ON public.mitigation_tasks USING btree (reported_by);


--
-- TOC entry 3934 (class 1259 OID 25532)
-- Name: idx_mitigation_tasks_risk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitigation_tasks_risk ON public.mitigation_tasks USING btree (risk_id);


--
-- TOC entry 3935 (class 1259 OID 25533)
-- Name: idx_mitigation_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitigation_tasks_status ON public.mitigation_tasks USING btree (status);


--
-- TOC entry 3936 (class 1259 OID 33100)
-- Name: idx_mitigation_tasks_unique_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_mitigation_tasks_unique_period ON public.mitigation_tasks USING btree (mitigation_id, period_start, period_end);


--
-- TOC entry 3939 (class 1259 OID 25535)
-- Name: idx_mitigations_risk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitigations_risk ON public.mitigations USING btree (risk_id);


--
-- TOC entry 3924 (class 1259 OID 25536)
-- Name: idx_mm_risks_meeting; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mm_risks_meeting ON public.meeting_minutes_risks USING btree (meeting_id);


--
-- TOC entry 3925 (class 1259 OID 25537)
-- Name: idx_mm_risks_risk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mm_risks_risk ON public.meeting_minutes_risks USING btree (risk_id);


--
-- TOC entry 4086 (class 1259 OID 26523)
-- Name: idx_organization_group_members_organization; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organization_group_members_organization ON public.organization_group_members USING btree (organization_id);


--
-- TOC entry 4082 (class 1259 OID 26506)
-- Name: idx_organization_groups_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organization_groups_owner ON public.organization_groups USING btree (owner_organization_id);


--
-- TOC entry 4083 (class 1259 OID 26505)
-- Name: idx_organization_groups_owner_name_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_organization_groups_owner_name_unique ON public.organization_groups USING btree (owner_organization_id, lower(name));


--
-- TOC entry 3942 (class 1259 OID 25538)
-- Name: idx_organizations_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organizations_parent_id ON public.organizations USING btree (parent_id);


--
-- TOC entry 4038 (class 1259 OID 26222)
-- Name: idx_planning_activities_program; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planning_activities_program ON public.planning_activities USING btree (program_id);


--
-- TOC entry 4024 (class 1259 OID 26218)
-- Name: idx_planning_goals_organization; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planning_goals_organization ON public.planning_goals USING btree (organization_id);


--
-- TOC entry 4025 (class 1259 OID 26217)
-- Name: idx_planning_goals_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planning_goals_period ON public.planning_goals USING btree (period);


--
-- TOC entry 4026 (class 1259 OID 26254)
-- Name: idx_planning_goals_planning_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planning_goals_planning_id ON public.planning_goals USING btree (planning_id);


--
-- TOC entry 4032 (class 1259 OID 26220)
-- Name: idx_planning_ikus_objective; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planning_ikus_objective ON public.planning_ikus USING btree (objective_id);


--
-- TOC entry 4029 (class 1259 OID 26219)
-- Name: idx_planning_objectives_goal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planning_objectives_goal ON public.planning_objectives USING btree (goal_id);


--
-- TOC entry 4035 (class 1259 OID 26221)
-- Name: idx_planning_programs_iku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planning_programs_iku ON public.planning_programs USING btree (iku_id);


--
-- TOC entry 4044 (class 1259 OID 26224)
-- Name: idx_planning_ro_scopes_ro_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planning_ro_scopes_ro_id ON public.planning_ro_scopes USING btree (ro_id);


--
-- TOC entry 4045 (class 1259 OID 26216)
-- Name: idx_planning_ro_scopes_unique_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_planning_ro_scopes_unique_category ON public.planning_ro_scopes USING btree (ro_id, organization_category) WHERE (organization_category <> ''::text);


--
-- TOC entry 4046 (class 1259 OID 26215)
-- Name: idx_planning_ro_scopes_unique_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_planning_ro_scopes_unique_org ON public.planning_ro_scopes USING btree (ro_id, organization_id) WHERE (organization_id IS NOT NULL);


--
-- TOC entry 4041 (class 1259 OID 26223)
-- Name: idx_planning_ros_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planning_ros_period ON public.planning_ros USING btree (period);


--
-- TOC entry 3945 (class 1259 OID 25539)
-- Name: idx_risk_cascades_source_org_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_cascades_source_org_status ON public.risk_cascades USING btree (source_org_id, status);


--
-- TOC entry 3946 (class 1259 OID 25540)
-- Name: idx_risk_cascades_source_risk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_cascades_source_risk ON public.risk_cascades USING btree (source_risk_id);


--
-- TOC entry 3947 (class 1259 OID 25541)
-- Name: idx_risk_cascades_target_org_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_cascades_target_org_status ON public.risk_cascades USING btree (target_org_id, status);


--
-- TOC entry 3950 (class 1259 OID 25542)
-- Name: idx_risk_charters_org_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_charters_org_period ON public.risk_charters USING btree (organization_id, period);


--
-- TOC entry 3951 (class 1259 OID 25543)
-- Name: idx_risk_charters_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_charters_status ON public.risk_charters USING btree (status);


--
-- TOC entry 4089 (class 1259 OID 33096)
-- Name: idx_risk_monitorings_active_draft; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_risk_monitorings_active_draft ON public.risk_monitorings USING btree (source_risk_id, assessment_cycle) WHERE (status = 'draft'::text);


--
-- TOC entry 4090 (class 1259 OID 32871)
-- Name: idx_risk_monitorings_cycle_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_monitorings_cycle_status ON public.risk_monitorings USING btree (assessment_cycle, status);


--
-- TOC entry 4091 (class 1259 OID 33097)
-- Name: idx_risk_monitorings_finalized_source_cycle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_risk_monitorings_finalized_source_cycle ON public.risk_monitorings USING btree (source_risk_id, assessment_cycle) WHERE (status = 'finalized'::text);


--
-- TOC entry 4092 (class 1259 OID 32870)
-- Name: idx_risk_monitorings_result; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_monitorings_result ON public.risk_monitorings USING btree (result_risk_id);


--
-- TOC entry 4093 (class 1259 OID 32869)
-- Name: idx_risk_monitorings_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_monitorings_source ON public.risk_monitorings USING btree (source_risk_id);


--
-- TOC entry 4094 (class 1259 OID 32898)
-- Name: idx_risk_monitorings_version_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_monitorings_version_group ON public.risk_monitorings USING btree (version_group_id);


--
-- TOC entry 3956 (class 1259 OID 25544)
-- Name: idx_risk_objectives_charter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_objectives_charter ON public.risk_objectives USING btree (charter_id);


--
-- TOC entry 3957 (class 1259 OID 25545)
-- Name: idx_risk_objectives_org_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_objectives_org_period ON public.risk_objectives USING btree (organization_id, period);


--
-- TOC entry 3960 (class 1259 OID 25546)
-- Name: idx_risks_assessment_cycle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_assessment_cycle ON public.risks USING btree (assessment_cycle);


--
-- TOC entry 3961 (class 1259 OID 25547)
-- Name: idx_risks_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_category ON public.risks USING btree (category);


--
-- TOC entry 3962 (class 1259 OID 25548)
-- Name: idx_risks_code_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_risks_code_unique ON public.risks USING btree (code) WHERE ((code IS NOT NULL) AND (is_current = true));


--
-- TOC entry 3963 (class 1259 OID 25549)
-- Name: idx_risks_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_created_by ON public.risks USING btree (created_by);


--
-- TOC entry 3964 (class 1259 OID 25550)
-- Name: idx_risks_current_group_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_risks_current_group_unique ON public.risks USING btree (version_group_id) WHERE (is_current = true);


--
-- TOC entry 3965 (class 1259 OID 33099)
-- Name: idx_risks_cycle_current_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_risks_cycle_current_unique ON public.risks USING btree (version_group_id, assessment_cycle) WHERE (is_cycle_current = true);


--
-- TOC entry 3966 (class 1259 OID 25552)
-- Name: idx_risks_impact_criteria_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_impact_criteria_id ON public.risks USING btree (impact_criteria_id);


--
-- TOC entry 3967 (class 1259 OID 25553)
-- Name: idx_risks_is_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_is_current ON public.risks USING btree (is_current);


--
-- TOC entry 3968 (class 1259 OID 25554)
-- Name: idx_risks_likelihood_assessment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_likelihood_assessment_id ON public.risks USING btree (likelihood_assessment_id);


--
-- TOC entry 3969 (class 1259 OID 25555)
-- Name: idx_risks_objective_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_objective_id ON public.risks USING btree (objective_id);


--
-- TOC entry 3970 (class 1259 OID 25556)
-- Name: idx_risks_ongoing_draft; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_ongoing_draft ON public.risks USING btree (code, created_at DESC) WHERE ((status = ANY (ARRAY['assessment_draft'::text, 'assessment_in_review'::text])) AND (archived_at IS NULL));


--
-- TOC entry 3971 (class 1259 OID 25557)
-- Name: idx_risks_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_org ON public.risks USING btree (organization_id);


--
-- TOC entry 3972 (class 1259 OID 25558)
-- Name: idx_risks_review_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_review_type ON public.risks USING btree (review_type);


--
-- TOC entry 3973 (class 1259 OID 26230)
-- Name: idx_risks_ro_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_ro_id ON public.risks USING btree (ro_id);


--
-- TOC entry 3974 (class 1259 OID 25559)
-- Name: idx_risks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_status ON public.risks USING btree (status);


--
-- TOC entry 3975 (class 1259 OID 25560)
-- Name: idx_risks_version_cycle_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_version_cycle_status ON public.risks USING btree (version_group_id, assessment_cycle, status);


--
-- TOC entry 3976 (class 1259 OID 25561)
-- Name: idx_risks_version_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_version_group ON public.risks USING btree (version_group_id);


--
-- TOC entry 3977 (class 1259 OID 25562)
-- Name: idx_risks_version_group_cycle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_version_group_cycle ON public.risks USING btree (version_group_id, assessment_cycle);


--
-- TOC entry 3978 (class 1259 OID 25563)
-- Name: idx_risks_version_group_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_version_group_version ON public.risks USING btree (version_group_id, version_number DESC);


--
-- TOC entry 3983 (class 1259 OID 25564)
-- Name: idx_system_settings_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_settings_category ON public.system_settings USING btree (category);


--
-- TOC entry 3986 (class 1259 OID 25565)
-- Name: idx_tmpmr_assessments_org_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tmpmr_assessments_org_period ON public.tmpmr_assessments USING btree (organization_id, period);


--
-- TOC entry 3991 (class 1259 OID 25566)
-- Name: idx_tmpmr_items_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tmpmr_items_assessment ON public.tmpmr_items USING btree (assessment_id);


--
-- TOC entry 4098 (class 1259 OID 32940)
-- Name: idx_working_paper_risk_exclusions_working_paper; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_paper_risk_exclusions_working_paper ON public.working_paper_risk_exclusions USING btree (working_paper_id);


--
-- TOC entry 4000 (class 1259 OID 32916)
-- Name: idx_working_paper_risks_monitoring; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_paper_risks_monitoring ON public.working_paper_risks USING btree (monitoring_id);


--
-- TOC entry 4001 (class 1259 OID 25567)
-- Name: idx_working_paper_risks_risk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_paper_risks_risk_id ON public.working_paper_risks USING btree (risk_id);


--
-- TOC entry 4002 (class 1259 OID 32915)
-- Name: idx_working_paper_risks_source_risk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_paper_risks_source_risk ON public.working_paper_risks USING btree (source_risk_id);


--
-- TOC entry 4003 (class 1259 OID 25568)
-- Name: idx_working_paper_risks_working_paper_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_paper_risks_working_paper_id ON public.working_paper_risks USING btree (working_paper_id);


--
-- TOC entry 4009 (class 1259 OID 25569)
-- Name: idx_working_paper_signatories_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_paper_signatories_user_id ON public.working_paper_signatories USING btree (user_id);


--
-- TOC entry 4010 (class 1259 OID 25570)
-- Name: idx_working_paper_signatories_working_paper_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_paper_signatories_working_paper_id ON public.working_paper_signatories USING btree (working_paper_id);


--
-- TOC entry 4015 (class 1259 OID 25571)
-- Name: idx_working_papers_assessment_cycle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_papers_assessment_cycle ON public.working_papers USING btree (assessment_cycle);


--
-- TOC entry 4016 (class 1259 OID 25572)
-- Name: idx_working_papers_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_papers_created_by ON public.working_papers USING btree (created_by);


--
-- TOC entry 4017 (class 1259 OID 26443)
-- Name: idx_working_papers_org_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_papers_org_code ON public.working_papers USING btree (org_id, code);


--
-- TOC entry 4018 (class 1259 OID 25573)
-- Name: idx_working_papers_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_papers_org_id ON public.working_papers USING btree (org_id);


--
-- TOC entry 4019 (class 1259 OID 25574)
-- Name: idx_working_papers_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_working_papers_status ON public.working_papers USING btree (status);


--
-- TOC entry 4097 (class 1259 OID 33098)
-- Name: uq_risk_monitorings_group_cycle_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_risk_monitorings_group_cycle_active ON public.risk_monitorings USING btree (version_group_id, assessment_cycle) WHERE (status = ANY (ARRAY['draft'::text, 'finalized'::text]));


--
-- TOC entry 4004 (class 1259 OID 32917)
-- Name: uq_working_paper_risks_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_working_paper_risks_group ON public.working_paper_risks USING btree (working_paper_id, version_group_id) WHERE (version_group_id IS NOT NULL);


--
-- TOC entry 4206 (class 2620 OID 25575)
-- Name: system_settings trigger_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_system_settings_updated_at();


--
-- TOC entry 4103 (class 2606 OID 25576)
-- Name: approval_histories approval_histories_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_histories
    ADD CONSTRAINT approval_histories_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- TOC entry 4104 (class 2606 OID 25581)
-- Name: approval_histories approval_histories_approval_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_histories
    ADD CONSTRAINT approval_histories_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests(id) ON DELETE CASCADE;


--
-- TOC entry 4105 (class 2606 OID 25586)
-- Name: approval_requests approval_requests_current_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_current_approver_user_id_fkey FOREIGN KEY (current_approver_user_id) REFERENCES public.users(id);


--
-- TOC entry 4106 (class 2606 OID 25591)
-- Name: approval_requests approval_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- TOC entry 4107 (class 2606 OID 25596)
-- Name: approval_steps approval_steps_approval_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests(id) ON DELETE CASCADE;


--
-- TOC entry 4108 (class 2606 OID 25601)
-- Name: approval_steps approval_steps_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_approver_user_id_fkey FOREIGN KEY (approver_user_id) REFERENCES public.users(id);


--
-- TOC entry 4109 (class 2606 OID 25606)
-- Name: audit_logs audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4110 (class 2606 OID 25611)
-- Name: chat_conversations chat_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4111 (class 2606 OID 25616)
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- TOC entry 4112 (class 2606 OID 25621)
-- Name: communication_logs communication_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication_logs
    ADD CONSTRAINT communication_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4113 (class 2606 OID 25626)
-- Name: communication_logs communication_logs_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication_logs
    ADD CONSTRAINT communication_logs_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- TOC entry 4114 (class 2606 OID 25631)
-- Name: control_tests control_tests_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_tests
    ADD CONSTRAINT control_tests_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.controls(id) ON DELETE CASCADE;


--
-- TOC entry 4115 (class 2606 OID 25636)
-- Name: controls controls_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4116 (class 2606 OID 25641)
-- Name: controls controls_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- TOC entry 4193 (class 2606 OID 26419)
-- Name: evaluation_items evaluation_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_items
    ADD CONSTRAINT evaluation_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.evaluation_sections(id) ON DELETE CASCADE;


--
-- TOC entry 4194 (class 2606 OID 26424)
-- Name: evaluation_items evaluation_items_template_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_items
    ADD CONSTRAINT evaluation_items_template_item_id_fkey FOREIGN KEY (template_item_id) REFERENCES public.evaluation_template_items(id);


--
-- TOC entry 4191 (class 2606 OID 26392)
-- Name: evaluation_sections evaluation_sections_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_sections
    ADD CONSTRAINT evaluation_sections_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.evaluations(id) ON DELETE CASCADE;


--
-- TOC entry 4192 (class 2606 OID 26397)
-- Name: evaluation_sections evaluation_sections_template_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_sections
    ADD CONSTRAINT evaluation_sections_template_section_id_fkey FOREIGN KEY (template_section_id) REFERENCES public.evaluation_template_sections(id);


--
-- TOC entry 4187 (class 2606 OID 26331)
-- Name: evaluation_template_items evaluation_template_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_template_items
    ADD CONSTRAINT evaluation_template_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.evaluation_template_sections(id) ON DELETE CASCADE;


--
-- TOC entry 4186 (class 2606 OID 26311)
-- Name: evaluation_template_sections evaluation_template_sections_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_template_sections
    ADD CONSTRAINT evaluation_template_sections_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.evaluation_templates(id) ON DELETE CASCADE;


--
-- TOC entry 4188 (class 2606 OID 26373)
-- Name: evaluations evaluations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4189 (class 2606 OID 26363)
-- Name: evaluations evaluations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4190 (class 2606 OID 26368)
-- Name: evaluations evaluations_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.evaluation_templates(id);


--
-- TOC entry 4117 (class 2606 OID 25686)
-- Name: formal_reports formal_reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formal_reports
    ADD CONSTRAINT formal_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id);


--
-- TOC entry 4118 (class 2606 OID 25691)
-- Name: formal_reports formal_reports_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formal_reports
    ADD CONSTRAINT formal_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4119 (class 2606 OID 25726)
-- Name: kri_reports kri_reports_kri_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kri_reports
    ADD CONSTRAINT kri_reports_kri_id_fkey FOREIGN KEY (kri_id) REFERENCES public.kris(id) ON DELETE CASCADE;


--
-- TOC entry 4120 (class 2606 OID 25731)
-- Name: kri_reports kri_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kri_reports
    ADD CONSTRAINT kri_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- TOC entry 4121 (class 2606 OID 25736)
-- Name: kri_reports kri_reports_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kri_reports
    ADD CONSTRAINT kri_reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- TOC entry 4122 (class 2606 OID 25741)
-- Name: kris kris_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kris
    ADD CONSTRAINT kris_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4123 (class 2606 OID 25746)
-- Name: kris kris_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kris
    ADD CONSTRAINT kris_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- TOC entry 4124 (class 2606 OID 25751)
-- Name: lessons_learned lessons_learned_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons_learned
    ADD CONSTRAINT lessons_learned_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- TOC entry 4125 (class 2606 OID 25756)
-- Name: lessons_learned lessons_learned_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons_learned
    ADD CONSTRAINT lessons_learned_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4126 (class 2606 OID 25761)
-- Name: likelihood_assessments likelihood_assessments_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.likelihood_assessments
    ADD CONSTRAINT likelihood_assessments_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- TOC entry 4127 (class 2606 OID 25766)
-- Name: meeting_minutes meeting_minutes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_minutes
    ADD CONSTRAINT meeting_minutes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4128 (class 2606 OID 25771)
-- Name: meeting_minutes meeting_minutes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_minutes
    ADD CONSTRAINT meeting_minutes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4129 (class 2606 OID 25776)
-- Name: meeting_minutes_risks meeting_minutes_risks_linked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_minutes_risks
    ADD CONSTRAINT meeting_minutes_risks_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES public.users(id);


--
-- TOC entry 4130 (class 2606 OID 25781)
-- Name: meeting_minutes_risks meeting_minutes_risks_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_minutes_risks
    ADD CONSTRAINT meeting_minutes_risks_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meeting_minutes(id) ON DELETE CASCADE;


--
-- TOC entry 4131 (class 2606 OID 25786)
-- Name: meeting_minutes_risks meeting_minutes_risks_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_minutes_risks
    ADD CONSTRAINT meeting_minutes_risks_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- TOC entry 4132 (class 2606 OID 25791)
-- Name: mitigation_tasks mitigation_tasks_mitigation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitigation_tasks
    ADD CONSTRAINT mitigation_tasks_mitigation_id_fkey FOREIGN KEY (mitigation_id) REFERENCES public.mitigations(id) ON DELETE CASCADE;


--
-- TOC entry 4133 (class 2606 OID 32892)
-- Name: mitigation_tasks mitigation_tasks_monitoring_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitigation_tasks
    ADD CONSTRAINT mitigation_tasks_monitoring_id_fkey FOREIGN KEY (monitoring_id) REFERENCES public.risk_monitorings(id) ON DELETE SET NULL;


--
-- TOC entry 4134 (class 2606 OID 25796)
-- Name: mitigation_tasks mitigation_tasks_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitigation_tasks
    ADD CONSTRAINT mitigation_tasks_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id);


--
-- TOC entry 4135 (class 2606 OID 25801)
-- Name: mitigation_tasks mitigation_tasks_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitigation_tasks
    ADD CONSTRAINT mitigation_tasks_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- TOC entry 4136 (class 2606 OID 25806)
-- Name: mitigations mitigations_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitigations
    ADD CONSTRAINT mitigations_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- TOC entry 4137 (class 2606 OID 25811)
-- Name: mitigations mitigations_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitigations
    ADD CONSTRAINT mitigations_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- TOC entry 4197 (class 2606 OID 26513)
-- Name: organization_group_members organization_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_group_members
    ADD CONSTRAINT organization_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.organization_groups(id) ON DELETE CASCADE;


--
-- TOC entry 4198 (class 2606 OID 26518)
-- Name: organization_group_members organization_group_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_group_members
    ADD CONSTRAINT organization_group_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 4195 (class 2606 OID 26500)
-- Name: organization_groups organization_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_groups
    ADD CONSTRAINT organization_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4196 (class 2606 OID 26495)
-- Name: organization_groups organization_groups_owner_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_groups
    ADD CONSTRAINT organization_groups_owner_organization_id_fkey FOREIGN KEY (owner_organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 4138 (class 2606 OID 25816)
-- Name: organizations organizations_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.organizations(id);


--
-- TOC entry 4181 (class 2606 OID 26171)
-- Name: planning_activities planning_activities_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_activities
    ADD CONSTRAINT planning_activities_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.planning_programs(id) ON DELETE CASCADE;


--
-- TOC entry 4176 (class 2606 OID 26106)
-- Name: planning_goals planning_goals_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_goals
    ADD CONSTRAINT planning_goals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 4177 (class 2606 OID 26249)
-- Name: planning_goals planning_goals_planning_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_goals
    ADD CONSTRAINT planning_goals_planning_id_fkey FOREIGN KEY (planning_id) REFERENCES public.planning(id) ON DELETE CASCADE;


--
-- TOC entry 4179 (class 2606 OID 26139)
-- Name: planning_ikus planning_ikus_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_ikus
    ADD CONSTRAINT planning_ikus_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.planning_objectives(id) ON DELETE CASCADE;


--
-- TOC entry 4178 (class 2606 OID 26122)
-- Name: planning_objectives planning_objectives_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_objectives
    ADD CONSTRAINT planning_objectives_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.planning_goals(id) ON DELETE CASCADE;


--
-- TOC entry 4185 (class 2606 OID 26244)
-- Name: planning planning_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning
    ADD CONSTRAINT planning_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 4180 (class 2606 OID 26155)
-- Name: planning_programs planning_programs_iku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_programs
    ADD CONSTRAINT planning_programs_iku_id_fkey FOREIGN KEY (iku_id) REFERENCES public.planning_ikus(id) ON DELETE CASCADE;


--
-- TOC entry 4183 (class 2606 OID 26210)
-- Name: planning_ro_scopes planning_ro_scopes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_ro_scopes
    ADD CONSTRAINT planning_ro_scopes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 4184 (class 2606 OID 26205)
-- Name: planning_ro_scopes planning_ro_scopes_ro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_ro_scopes
    ADD CONSTRAINT planning_ro_scopes_ro_id_fkey FOREIGN KEY (ro_id) REFERENCES public.planning_ros(id) ON DELETE CASCADE;


--
-- TOC entry 4182 (class 2606 OID 26189)
-- Name: planning_ros planning_ros_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planning_ros
    ADD CONSTRAINT planning_ros_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.planning_activities(id) ON DELETE CASCADE;


--
-- TOC entry 4139 (class 2606 OID 25821)
-- Name: risk_cascades risk_cascades_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_cascades
    ADD CONSTRAINT risk_cascades_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- TOC entry 4140 (class 2606 OID 25826)
-- Name: risk_cascades risk_cascades_proposed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_cascades
    ADD CONSTRAINT risk_cascades_proposed_by_fkey FOREIGN KEY (proposed_by) REFERENCES public.users(id);


--
-- TOC entry 4141 (class 2606 OID 25831)
-- Name: risk_cascades risk_cascades_source_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_cascades
    ADD CONSTRAINT risk_cascades_source_org_id_fkey FOREIGN KEY (source_org_id) REFERENCES public.organizations(id);


--
-- TOC entry 4142 (class 2606 OID 25836)
-- Name: risk_cascades risk_cascades_source_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_cascades
    ADD CONSTRAINT risk_cascades_source_risk_id_fkey FOREIGN KEY (source_risk_id) REFERENCES public.risks(id) ON DELETE CASCADE;


--
-- TOC entry 4143 (class 2606 OID 25841)
-- Name: risk_cascades risk_cascades_target_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_cascades
    ADD CONSTRAINT risk_cascades_target_org_id_fkey FOREIGN KEY (target_org_id) REFERENCES public.organizations(id);


--
-- TOC entry 4144 (class 2606 OID 25846)
-- Name: risk_cascades risk_cascades_target_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_cascades
    ADD CONSTRAINT risk_cascades_target_risk_id_fkey FOREIGN KEY (target_risk_id) REFERENCES public.risks(id) ON DELETE SET NULL;


--
-- TOC entry 4145 (class 2606 OID 25851)
-- Name: risk_charters risk_charters_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_charters
    ADD CONSTRAINT risk_charters_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 4146 (class 2606 OID 25856)
-- Name: risk_charters risk_charters_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_charters
    ADD CONSTRAINT risk_charters_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4147 (class 2606 OID 25861)
-- Name: risk_charters risk_charters_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_charters
    ADD CONSTRAINT risk_charters_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4148 (class 2606 OID 25866)
-- Name: risk_charters risk_charters_risk_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_charters
    ADD CONSTRAINT risk_charters_risk_owner_user_id_fkey FOREIGN KEY (risk_owner_user_id) REFERENCES public.users(id);


--
-- TOC entry 4199 (class 2606 OID 32857)
-- Name: risk_monitorings risk_monitorings_finalized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_monitorings
    ADD CONSTRAINT risk_monitorings_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES public.users(id);


--
-- TOC entry 4200 (class 2606 OID 32847)
-- Name: risk_monitorings risk_monitorings_result_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_monitorings
    ADD CONSTRAINT risk_monitorings_result_risk_id_fkey FOREIGN KEY (result_risk_id) REFERENCES public.risks(id) ON DELETE SET NULL;


--
-- TOC entry 4201 (class 2606 OID 32842)
-- Name: risk_monitorings risk_monitorings_source_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_monitorings
    ADD CONSTRAINT risk_monitorings_source_risk_id_fkey FOREIGN KEY (source_risk_id) REFERENCES public.risks(id) ON DELETE RESTRICT;


--
-- TOC entry 4202 (class 2606 OID 32852)
-- Name: risk_monitorings risk_monitorings_started_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_monitorings
    ADD CONSTRAINT risk_monitorings_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.users(id);


--
-- TOC entry 4203 (class 2606 OID 32862)
-- Name: risk_monitorings risk_monitorings_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_monitorings
    ADD CONSTRAINT risk_monitorings_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id);


--
-- TOC entry 4149 (class 2606 OID 25871)
-- Name: risk_objectives risk_objectives_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_objectives
    ADD CONSTRAINT risk_objectives_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 4150 (class 2606 OID 25876)
-- Name: risk_objectives risk_objectives_charter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_objectives
    ADD CONSTRAINT risk_objectives_charter_id_fkey FOREIGN KEY (charter_id) REFERENCES public.risk_charters(id);


--
-- TOC entry 4151 (class 2606 OID 25881)
-- Name: risk_objectives risk_objectives_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_objectives
    ADD CONSTRAINT risk_objectives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4152 (class 2606 OID 25886)
-- Name: risk_objectives risk_objectives_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_objectives
    ADD CONSTRAINT risk_objectives_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4153 (class 2606 OID 25891)
-- Name: risks risks_control_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_control_owner_id_fkey FOREIGN KEY (control_owner_id) REFERENCES public.users(id);


--
-- TOC entry 4154 (class 2606 OID 25896)
-- Name: risks risks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4155 (class 2606 OID 25901)
-- Name: risks risks_impact_criteria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_impact_criteria_id_fkey FOREIGN KEY (impact_criteria_id) REFERENCES public.impact_criteria(id);


--
-- TOC entry 4156 (class 2606 OID 25906)
-- Name: risks risks_likelihood_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_likelihood_assessment_id_fkey FOREIGN KEY (likelihood_assessment_id) REFERENCES public.likelihood_assessments(id);


--
-- TOC entry 4157 (class 2606 OID 25911)
-- Name: risks risks_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.risk_objectives(id);


--
-- TOC entry 4158 (class 2606 OID 25916)
-- Name: risks risks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4159 (class 2606 OID 25921)
-- Name: risks risks_previous_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_previous_risk_id_fkey FOREIGN KEY (previous_risk_id) REFERENCES public.risks(id);


--
-- TOC entry 4160 (class 2606 OID 25926)
-- Name: risks risks_risk_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_risk_owner_id_fkey FOREIGN KEY (risk_owner_id) REFERENCES public.users(id);


--
-- TOC entry 4161 (class 2606 OID 26225)
-- Name: risks risks_ro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_ro_id_fkey FOREIGN KEY (ro_id) REFERENCES public.planning_ros(id);


--
-- TOC entry 4162 (class 2606 OID 25931)
-- Name: tmpmr_assessments tmpmr_assessments_assessor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tmpmr_assessments
    ADD CONSTRAINT tmpmr_assessments_assessor_id_fkey FOREIGN KEY (assessor_id) REFERENCES public.users(id);


--
-- TOC entry 4163 (class 2606 OID 25936)
-- Name: tmpmr_assessments tmpmr_assessments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tmpmr_assessments
    ADD CONSTRAINT tmpmr_assessments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4164 (class 2606 OID 25941)
-- Name: tmpmr_assessments tmpmr_assessments_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tmpmr_assessments
    ADD CONSTRAINT tmpmr_assessments_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- TOC entry 4165 (class 2606 OID 25946)
-- Name: tmpmr_items tmpmr_items_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tmpmr_items
    ADD CONSTRAINT tmpmr_items_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.tmpmr_assessments(id) ON DELETE CASCADE;


--
-- TOC entry 4166 (class 2606 OID 25951)
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- TOC entry 4204 (class 2606 OID 32935)
-- Name: working_paper_risk_exclusions working_paper_risk_exclusions_excluded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risk_exclusions
    ADD CONSTRAINT working_paper_risk_exclusions_excluded_by_fkey FOREIGN KEY (excluded_by) REFERENCES public.users(id);


--
-- TOC entry 4205 (class 2606 OID 32930)
-- Name: working_paper_risk_exclusions working_paper_risk_exclusions_working_paper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risk_exclusions
    ADD CONSTRAINT working_paper_risk_exclusions_working_paper_id_fkey FOREIGN KEY (working_paper_id) REFERENCES public.working_papers(id) ON DELETE CASCADE;


--
-- TOC entry 4167 (class 2606 OID 32905)
-- Name: working_paper_risks working_paper_risks_monitoring_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risks
    ADD CONSTRAINT working_paper_risks_monitoring_id_fkey FOREIGN KEY (monitoring_id) REFERENCES public.risk_monitorings(id);


--
-- TOC entry 4168 (class 2606 OID 32910)
-- Name: working_paper_risks working_paper_risks_result_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risks
    ADD CONSTRAINT working_paper_risks_result_risk_id_fkey FOREIGN KEY (result_risk_id) REFERENCES public.risks(id);


--
-- TOC entry 4169 (class 2606 OID 25956)
-- Name: working_paper_risks working_paper_risks_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risks
    ADD CONSTRAINT working_paper_risks_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id);


--
-- TOC entry 4170 (class 2606 OID 32900)
-- Name: working_paper_risks working_paper_risks_source_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risks
    ADD CONSTRAINT working_paper_risks_source_risk_id_fkey FOREIGN KEY (source_risk_id) REFERENCES public.risks(id);


--
-- TOC entry 4171 (class 2606 OID 25961)
-- Name: working_paper_risks working_paper_risks_working_paper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_risks
    ADD CONSTRAINT working_paper_risks_working_paper_id_fkey FOREIGN KEY (working_paper_id) REFERENCES public.working_papers(id) ON DELETE CASCADE;


--
-- TOC entry 4172 (class 2606 OID 25966)
-- Name: working_paper_signatories working_paper_signatories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_signatories
    ADD CONSTRAINT working_paper_signatories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4173 (class 2606 OID 25971)
-- Name: working_paper_signatories working_paper_signatories_working_paper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_paper_signatories
    ADD CONSTRAINT working_paper_signatories_working_paper_id_fkey FOREIGN KEY (working_paper_id) REFERENCES public.working_papers(id) ON DELETE CASCADE;


--
-- TOC entry 4174 (class 2606 OID 25976)
-- Name: working_papers working_papers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_papers
    ADD CONSTRAINT working_papers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4175 (class 2606 OID 25981)
-- Name: working_papers working_papers_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.working_papers
    ADD CONSTRAINT working_papers_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- TOC entry 4407 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;

-- pg_dump leaves search_path empty. Restore the application default so the
-- following migrations can use their normal unqualified table references.
SET search_path = public;


-- Completed on 2026-07-15 21:03:50 WIB

--
-- PostgreSQL database dump complete
--
